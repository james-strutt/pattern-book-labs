import { rpc, giraffeState } from "@gi-nx/iframe-sdk";
const uniq = <T>(arr: T[]): T[] => [...new Set(arr)];
import type { Feature, FeatureCollection } from "geojson";
import { createLocalProjection } from "@/utils/geometry/localProjection";
import {
  projectFeatureIntoList,
  calculateFeatureCoordinatesByProjected,
} from "@/apps/patternBook/utils/projectFeatures";
import { copyProjectedOntoBlockFeatures } from "@/apps/patternBook/services/patternBookProjectBundleService";
import { PLACEMENT_LAYER_NAMES, FLOW_DAG_SITE_TYPE } from "@/apps/patternBook/constants/placementLayers";
import { getProp, FEATURE_PROP } from "@/constants/featureProps";
import { classifySiteType } from "@/apps/patternBook/utils/siteTypeClassifier";
import logger from "@/lib/logger";
import type { PropertyFeature } from "@/types/geometry";
import type { ProjectedFeature, ProjectedPolygon } from "@/apps/patternBook/types/projectedGeometry";

const SERVICE_NAME = "PatternBookPlacement";

let placementLayersInitialised = false;

interface UsageCategory {
  join?: { color?: string; noFacade?: boolean };
}

async function ensurePlacementLayersInitialised(projectAppsByAppID: Record<number, unknown>): Promise<void> {
  if (placementLayersInitialised) return;

  const projectAppEntry = projectAppsByAppID[1] as
    | { featureCategories?: { usage?: Record<string, UsageCategory> } }
    | undefined;
  const usages: Record<string, UsageCategory> = projectAppEntry?.featureCategories?.usage ?? {};
  const usageColours = uniq(
    Object.values(usages)
      .map((usage) => usage.join?.color)
      .filter((colour): colour is string => Boolean(colour)),
  );
  const paletteMap = usageColours.map((colour) => ({
    value: colour,
    color: colour,
  }));

  try {
    await rpc.invoke("removeTempLayer", [PLACEMENT_LAYER_NAMES.PATTERN]);
    await rpc.invoke("addTempLayerGeoJSON", [
      PLACEMENT_LAYER_NAMES.PATTERN,
      { type: "FeatureCollection", features: [] },
      { type: "fill-extrusion" },
      {
        showLines: true,
        mainLayer: "fill-extrusion",
        mainColor: {
          propertyKey: "color",
          scaleFunc: "scaleOrdinal",
          paletteId: "css",
          paletteMap,
          fallbackColor: "lightgrey",
        },
      },
    ]);

    await rpc.invoke("removeTempLayer", [PLACEMENT_LAYER_NAMES.SITE_SETBACK]);
    await rpc.invoke("addTempLayerGeoJSON", [
      PLACEMENT_LAYER_NAMES.SITE_SETBACK,
      { type: "FeatureCollection", features: [] },
      null,
      {
        mainLayer: "fill",
        showLines: true,
        mainColor: { fixedValue: "#3CB371" },
        fillOpacity: 0.2,
      },
    ]);

    placementLayersInitialised = true;
    logger.info(
      "Placement temp layers initialised",
      {
        usageColourCount: usageColours.length,
        paletteSize: paletteMap.length,
      },
      SERVICE_NAME,
    );
  } catch (error) {
    logger.warn(
      "Failed to initialise placement temp layers",
      { error: error instanceof Error ? error.message : String(error) },
      SERVICE_NAME,
    );
  }
}

export function resetPlacementLayerInitState(): void {
  placementLayersInitialised = false;
}

export { ensurePlacementLayersInitialised };

const FRONTAGE_ROAD_LAYER_IDS = ["road-street", "road-secondary-tertiary"] as const;

export async function fetchRoadFeatures(): Promise<FeatureCollection> {
  try {
    const style = (await rpc.invoke("getMapStyle")) as {
      layers?: Array<{ id: string; type: string }>;
    } | null;
    const availableIds = new Set((style?.layers ?? []).map((layer) => layer.id));
    const roadLayerIds = FRONTAGE_ROAD_LAYER_IDS.filter((id) => availableIds.has(id));
    if (!roadLayerIds.length) {
      logger.warn(
        "None of the expected frontage road layers are present in the Mapbox style. Frontage detection will fall back to longest-edge.",
        { expected: FRONTAGE_ROAD_LAYER_IDS },
        SERVICE_NAME,
      );
      return { type: "FeatureCollection", features: [] };
    }
    const features = (await rpc.invoke("queryRenderedFeatures", [undefined, { layers: roadLayerIds }])) as
      | Feature[]
      | null;
    logger.info(
      "Fetched frontage road features",
      {
        usedLayerIds: roadLayerIds,
        featureCount: features?.length ?? 0,
      },
      SERVICE_NAME,
    );
    return { type: "FeatureCollection", features: features ?? [] };
  } catch (error) {
    logger.warn(
      "Failed to fetch road features for frontage detection",
      { error: error instanceof Error ? error.message : String(error) },
      SERVICE_NAME,
    );
    return { type: "FeatureCollection", features: [] };
  }
}

export async function ensureBlockRegistered(
  blockId: string,
  bundleBlocks: Record<string, { id: string; features: Array<Record<string, unknown>> }> | undefined,
): Promise<boolean> {
  const currentBlocks = ((giraffeState as { get: (key: string) => unknown }).get("blocks") ?? {}) as Record<
    string,
    unknown
  >;

  const inState = Boolean(currentBlocks[blockId]);

  logger.info(
    "Block registry check",
    {
      blockId,
      inGiraffeState: inState,
      totalRegisteredBlocks: Object.keys(currentBlocks).length,
      bundleBlocksAvailable: bundleBlocks !== undefined,
      bundleHasBlock: bundleBlocks ? Boolean(bundleBlocks[blockId]) : false,
    },
    SERVICE_NAME,
  );

  if (inState) return true;

  if (!bundleBlocks) {
    logger.warn(
      "bootstrap.bundleBlocks is undefined — stale bootstrap cache. " +
        "Cannot re-register block. Proceeding to evaluateFeatures anyway " +
        "in case Giraffe has the block from a previous session. Do a hard " +
        "reload (Ctrl+Shift+R) to force a fresh bootstrap if this fails.",
      { blockId },
      SERVICE_NAME,
    );
    return true;
  }

  const bundleBlock = bundleBlocks[blockId];
  if (!bundleBlock) {
    logger.warn("Block missing from registry and bundle — cannot place", { blockId }, SERVICE_NAME);
    return false;
  }

  try {
    const cloned = structuredClone(bundleBlock) as {
      id: string;
      features: Array<{
        properties: Record<string, unknown> & { _projected?: unknown };
        _projected?: unknown;
      }>;
    };
    copyProjectedOntoBlockFeatures(cloned.features);
    await rpc.invoke("createBlock", [cloned]);
    logger.info(
      "Block re-registered at placement time",
      { blockId, featureCount: cloned.features.length },
      SERVICE_NAME,
    );
    return true;
  } catch (error) {
    logger.error(
      "Failed to re-register block at placement time",
      {
        blockId,
        error: error instanceof Error ? error.message : String(error),
      },
      SERVICE_NAME,
    );
    return false;
  }
}

export function normaliseProjectReference(raw: unknown): [number, number] {
  if (!Array.isArray(raw) || raw.length < 2) return [0, 0];
  const lng = Number(raw[0]);
  const lat = Number(raw[1]);
  if (Number.isFinite(lng) && Number.isFinite(lat) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
    return [lng, lat];
  }
  return [0, 0];
}

export function projectPropertyAsSiteFeature(
  property: PropertyFeature,
  geoProject: ReturnType<typeof createLocalProjection>,
): ProjectedPolygon {
  const projected: ProjectedFeature[] = [];
  projectFeatureIntoList(property as unknown as Feature, geoProject, 0, projected);
  const first = projected[0];
  if (first?.geometry.type !== "Polygon") {
    throw new Error("Property geometry is not a polygon");
  }
  return first as ProjectedPolygon;
}

export function writeSiteBaseProperties(siteFeature: ProjectedPolygon, property: PropertyFeature): void {
  const address = getProp<string>(property, FEATURE_PROP.PROPERTY.ADDRESS, null);
  const area = getProp<number>(property, FEATURE_PROP.PROPERTY.AREA, 0);
  const heightOfBuilding = getProp<number>(property, FEATURE_PROP.PROPERTY.HEIGHT_OF_BUILDING, null);

  const rawIdFromFeature = property.id ?? property.properties?.id;
  const rawId =
    typeof rawIdFromFeature === "string" || typeof rawIdFromFeature === "number"
      ? String(rawIdFromFeature)
      : `site_${Date.now()}`;

  (siteFeature.properties as Record<string, unknown>) = {
    id: String(rawId),
    address,
    Area: area ?? null,
    "Height Of Building": heightOfBuilding ?? null,
    siteType:
      classifySiteType(property.geometry) === "battle_axe"
        ? FLOW_DAG_SITE_TYPE.BATTLE_AXE
        : FLOW_DAG_SITE_TYPE.MID_BLOCK,
  };
}

export function convertProjectedToWgs84(
  features: ProjectedFeature[],
  geoProject: ReturnType<typeof createLocalProjection>,
): Feature[] {
  const output: Feature[] = [];
  for (const feature of features) {
    try {
      calculateFeatureCoordinatesByProjected(feature, geoProject);
      output.push(feature as unknown as Feature);
    } catch (error) {
      logger.warn(
        "Failed to convert projected feature to WGS84",
        { error: error instanceof Error ? error.message : String(error) },
        SERVICE_NAME,
      );
    }
  }
  return output;
}
