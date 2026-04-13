const isEqual = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a) === JSON.stringify(b);
const sum = (arr: number[]): number => arr.reduce((a, b) => a + b, 0);
import type { Feature } from "geojson";
import { DEFAULT_SLAB_THICKNESS, MIN_GEOMETRY_DISTANCE } from "@/apps/patternBook/constants/envelopeSetbacks";
import logger from "@/lib/logger";
import type { ProjectedFeature } from "@/apps/patternBook/types/projectedGeometry";
import type { PlacementStats } from "@/apps/patternBook/types/placement";

const SERVICE_NAME = "PatternBookPlacement";

interface ExpandedFeature extends Feature {
  properties: Record<string, unknown>;
}

interface EvaluatedFeatureProps {
  _baseHeight?: number;
  _height?: number;
  usage?: string;
  levels?: number;
  floorToFloor?: number;
  slabThickness?: number;
  pattern?: {
    id?: string;
    siteId?: string;
    area?: number;
    netArea?: number;
    dwellings?: number;
  };
  netArea?: number;
  dwellingCount?: Array<{ value?: number }>;
}

interface UsageConfig {
  join?: { noFacade?: boolean };
}

export function expandEvaluatedFeatures(
  features: ProjectedFeature[],
  projectAppsByAppID: Record<number, unknown>,
): ExpandedFeature[] {
  const usages =
    (projectAppsByAppID[1] as { featureCategories?: { usage?: Record<string, UsageConfig> } } | undefined)
      ?.featureCategories?.usage ?? {};

  const expanded: ExpandedFeature[] = [];
  const expansionTrace: Array<{
    usageKey: string | undefined;
    usageMatched: boolean;
    noFacade: boolean | undefined;
    levels: number | undefined;
    floorToFloor: number | undefined;
    slabThickness: number | undefined;
    baseHeightIn: number | undefined;
    heightIn: number | undefined;
    emittedCount: number;
  }> = [];

  features
    .filter((feature) => feature.geometry.type !== "Point")
    .forEach((feature) => {
      const geom = feature.geometry as { coordinates: unknown };
      const coordinates = geom.coordinates;
      const props = feature.properties as EvaluatedFeatureProps & {
        slabThickness?: number;
        levels?: number;
        floorToFloor?: number;
        usage?: string;
      };
      let baseHeight = props._baseHeight ?? 0;
      const height = props._height ?? 0;
      const usageKey = props.usage;
      const usage = usageKey ? usages[usageKey] : undefined;
      const noFacade = usage?.join?.noFacade;

      let emittedCount = 0;

      if (noFacade) {
        const slabThickness = props.slabThickness ?? DEFAULT_SLAB_THICKNESS;
        const levels = props.levels ?? 1;
        for (let i = 0; i < levels; i++) {
          const tweaked = structuredClone(coordinates);
          if (feature.geometry.type === "Polygon") {
            const ring = (tweaked as number[][][])[0];
            if (ring?.[1]) {
              ring[1][0]! += MIN_GEOMETRY_DISTANCE * baseHeight;
            }
          } else if ((tweaked as number[][])[1]) {
            (tweaked as number[][])[1]![0]! += MIN_GEOMETRY_DISTANCE * baseHeight;
          }
          expanded.push({
            ...(feature as unknown as Feature),
            geometry: {
              ...feature.geometry,
              coordinates: tweaked,
            } as Feature["geometry"],
            properties: {
              ...(feature.properties as Record<string, unknown>),
              base_height: baseHeight,
              height: baseHeight + slabThickness,
              _strokeOpacity: 1,
            },
          });
          emittedCount++;
          baseHeight += props.floorToFloor ?? 0;
        }
        expansionTrace.push({
          usageKey,
          usageMatched: usage !== undefined,
          noFacade,
          levels,
          floorToFloor: props.floorToFloor,
          slabThickness,
          baseHeightIn: props._baseHeight,
          heightIn: props._height,
          emittedCount,
        });
        return;
      }

      const alreadyPresent = expanded.some((existing) =>
        isEqual((existing.geometry as { coordinates: unknown }).coordinates, coordinates),
      );

      if (alreadyPresent) {
        const tweaked = structuredClone(coordinates);
        if (feature.geometry.type === "Polygon") {
          const ring = (tweaked as number[][][])[0];
          if (ring?.[1]) {
            ring[1][0]! += MIN_GEOMETRY_DISTANCE * baseHeight;
          }
        } else if ((tweaked as number[][])[1]) {
          (tweaked as number[][])[1]![0]! += MIN_GEOMETRY_DISTANCE * baseHeight;
        }
        expanded.push({
          ...(feature as unknown as Feature),
          geometry: {
            ...feature.geometry,
            coordinates: tweaked,
          } as Feature["geometry"],
          properties: {
            ...(feature.properties as Record<string, unknown>),
            base_height: baseHeight,
            height,
            _strokeOpacity: 1,
          },
        });
        emittedCount++;
      } else {
        expanded.push({
          ...(feature as unknown as Feature),
          properties: {
            ...(feature.properties as Record<string, unknown>),
            base_height: baseHeight,
            height,
            _strokeOpacity: 1,
          },
        });
        emittedCount++;
      }

      expansionTrace.push({
        usageKey,
        usageMatched: usage !== undefined,
        noFacade,
        levels: props.levels,
        floorToFloor: props.floorToFloor,
        slabThickness: props.slabThickness,
        baseHeightIn: props._baseHeight,
        heightIn: props._height,
        emittedCount,
      });
    });

  logger.info(
    "expandEvaluatedFeatures trace",
    {
      usageKeysAvailable: Object.keys(usages).length,
      noFacadeUsageKeys: Object.entries(usages)
        .filter(([, u]) => u?.join?.noFacade)
        .map(([k]) => k),
      inputCount: features.length,
      outputCount: expanded.length,
      perFeature: expansionTrace,
    },
    SERVICE_NAME,
  );

  return expanded;
}

// netArea is the total net area of the pattern; dwellingCount is per level — multiply by levels for dwellings.

export function computePlacementStats(patternFeatures: ProjectedFeature[], siteArea: number): PlacementStats {
  let totalNetArea = 0;
  let totalDwellings = 0;
  let footprintArea = 0;

  for (const feature of patternFeatures) {
    const props = feature.properties as EvaluatedFeatureProps;
    const dwellingCountSum = Array.isArray(props.dwellingCount)
      ? sum(props.dwellingCount.map((entry) => entry.value ?? 0))
      : 0;
    const levels = typeof props.levels === "number" ? props.levels : 1;

    if (typeof props.netArea === "number") totalNetArea += props.netArea;
    totalDwellings += dwellingCountSum * levels;

    if (props.pattern?.area && !footprintArea) {
      footprintArea = props.pattern.area;
    }
  }

  return {
    dwellings: totalDwellings,
    netArea: totalNetArea,
    fsr: siteArea > 0 ? totalNetArea / siteArea : 0,
    footprintArea,
  };
}
