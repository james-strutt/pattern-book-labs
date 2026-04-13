import { rpc, giraffeState } from "@gi-nx/iframe-sdk";
import { ensureClipperLoaded } from "@/utils/geometry/clipperLoader";
import { getSideIndices, longestEdgeAsFrontage } from "@/apps/patternBook/utils/frontageDetection";
import { projectGeoJsonCollection } from "@/apps/patternBook/utils/projectFeatures";
import { setFlowPropertyOfFeature, getEnvelopeNodeId } from "@/apps/patternBook/services/flowDagAdapter";
import {
  getValidPatternsForSitePlacement,
  formatPrefilterFailure,
} from "@/apps/patternBook/utils/validPatternsForSitePlacement";
import { findBlockForVariant } from "@/apps/patternBook/utils/blockCatalogue";
import { PLACEMENT_LAYER_NAMES } from "@/apps/patternBook/constants/placementLayers";
import { FEATURE_PROP, getOptionalProp } from "@/constants/featureProps";
import logger from "@/lib/logger";
import type { PropertyFeature } from "@/types/geometry";
import type { PlaceablePropertyFeature } from "@/apps/patternBook/types/placement";
import type { BootstrapResult } from "@/apps/patternBook/services/patternBookProjectBundleService";
import type {
  ProjectedFeature,
  ProjectedPolygon,
  EnvelopeSideIndices,
} from "@/apps/patternBook/types/projectedGeometry";
import { createLocalProjection } from "@/utils/geometry/localProjection";
import {
  ensurePlacementLayersInitialised,
  ensureBlockRegistered,
  fetchRoadFeatures,
  normaliseProjectReference,
  projectPropertyAsSiteFeature,
  writeSiteBaseProperties,
} from "@/apps/patternBook/services/patternBookPlacementSupport";
import { executeShortlistGroupedEvaluation } from "@/apps/patternBook/services/patternBookPlacementShortlistBatches";
import type {
  PlaceShortlistArgs,
  ShortlistPlacementOutcome,
  PlaceShortlistResult,
  PreparedSite,
  ShortlistPlacementSelection,
} from "@/apps/patternBook/services/patternBookPlacementShortlistTypes";

export type {
  ShortlistPlacementSelection,
  ShortlistPlacementProgress,
  PlaceShortlistArgs,
  ShortlistPlacementOutcome,
  PlaceShortlistResult,
} from "@/apps/patternBook/services/patternBookPlacementShortlistTypes";

const SERVICE_NAME = "PatternBookPlacement";

function coerceUnknownToString(value: unknown, whenNotPrimitive: string): string {
  if (value === null || value === undefined) return whenNotPrimitive;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (typeof value === "boolean") return String(value);
  return whenNotPrimitive;
}

function resolvePropertyAddress(property: PlaceablePropertyFeature): string {
  const address = getOptionalProp<string>(property, FEATURE_PROP.PROPERTY.ADDRESS);
  if (typeof address === "string" && address.length > 0) return address;
  const id = (property as { id?: unknown }).id;
  return coerceUnknownToString(id, "unknown");
}

function buildInitialOutcomes(selections: readonly ShortlistPlacementSelection[]): ShortlistPlacementOutcome[] {
  return selections.map((selection) => ({
    featureId: coerceUnknownToString((selection.property as { id?: unknown }).id, ""),
    address: resolvePropertyAddress(selection.property),
    patternId: selection.pattern.metadata.id,
    variantId: selection.variant.variantId,
    blockId: "",
    success: false,
    dwellings: 0,
    netArea: 0,
    fsr: 0,
    footprintArea: 0,
    placedFeatures: [],
    projectedSetbackFeatures: [],
    projectedStackedFeatures: [],
    projectedSiteFeature: null,
    error: null,
  }));
}

function edgeRoleForIndex(edgeIndex: number, indices: EnvelopeSideIndices): "front" | "side" | "rear" | "none" {
  if (indices.front.includes(edgeIndex)) return "front";
  if (indices.side.includes(edgeIndex)) return "side";
  if (indices.rear.includes(edgeIndex)) return "rear";
  return "none";
}

function buildSharedRotations(bootstrap: BootstrapResult): Record<string, number> {
  const rotationsMap = bootstrap.blockRotationsByBlockId;
  const result: Record<string, number> = {};
  if (rotationsMap instanceof Map) {
    for (const [bid, authored] of rotationsMap.entries()) {
      result[bid] = authored;
    }
  }
  return result;
}

async function prepareSitesForShortlistPlacement(params: {
  selections: readonly ShortlistPlacementSelection[];
  outcomes: ShortlistPlacementOutcome[];
  bootstrap: BootstrapResult;
  geoProject: ReturnType<typeof createLocalProjection>;
  abortSignal: AbortSignal | undefined;
}): Promise<PreparedSite[]> {
  const { selections, outcomes, bootstrap, geoProject, abortSignal } = params;
  const prepared: PreparedSite[] = [];
  for (let i = 0; i < selections.length; i += 1) {
    if (abortSignal?.aborted) break;
    const selection = selections[i];
    const outcome = outcomes[i];
    if (!selection || !outcome) continue;

    try {
      const matchedBlock = findBlockForVariant(
        bootstrap.blockCatalogue,
        selection.variant,
        selection.pattern.metadata.id,
      );
      if (!matchedBlock) {
        throw new Error(
          `No Giraffe block in project 70951 fits variant "${selection.variant.variantId}" ` +
            `(${selection.pattern.metadata.id}, ${selection.variant.lotWidth}m × ${selection.variant.lotLength}m, ` +
            `${selection.variant.storeys} storeys).`,
        );
      }
      const blockId = matchedBlock.id;

      const blockReady = await ensureBlockRegistered(
        blockId,
        bootstrap.bundleBlocks as unknown as Record<string, { id: string; features: Array<Record<string, unknown>> }>,
      );
      if (!blockReady) {
        throw new Error(
          `Giraffe block ${blockId} (${matchedBlock.name}) is not registered ` +
            "and could not be re-registered from the bundle.",
        );
      }

      const siteFeature = projectPropertyAsSiteFeature(selection.property as unknown as PropertyFeature, geoProject);
      writeSiteBaseProperties(siteFeature, selection.property as unknown as PropertyFeature);

      outcome.blockId = blockId;
      outcome.projectedSiteFeature = siteFeature;

      prepared.push({
        outcomeIndex: i,
        selection,
        siteFeature,
        blockId,
        blockName: matchedBlock.name,
        frontageBearingRad: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      outcome.error = message;
      logger.warn(
        "placeVariantsOnShortlist: Phase 1 site rejected",
        {
          featureId: outcome.featureId,
          address: outcome.address,
          patternId: selection.pattern.metadata.id,
          variantId: selection.variant.variantId,
          error: message,
        },
        SERVICE_NAME,
      );
    }
  }
  return prepared;
}

function logEnvelopeClassificationForPreparedSites(params: {
  prepared: PreparedSite[];
  outcomes: ShortlistPlacementOutcome[];
  allSiteFeatures: ProjectedPolygon[];
  roadFeatures: ProjectedFeature[];
  setbacks: PlaceShortlistArgs["setbacks"];
  instantPointId: string;
  sharedRotations: Record<string, number>;
}): void {
  const { prepared, outcomes, allSiteFeatures, roadFeatures, setbacks, instantPointId, sharedRotations } = params;
  for (let j = 0; j < prepared.length; j += 1) {
    const p = prepared[j];
    if (!p) continue;
    let indices: EnvelopeSideIndices = getSideIndices(
      allSiteFeatures as unknown as ProjectedFeature[],
      roadFeatures,
      j,
    );
    if (!indices.front.length) {
      indices = longestEdgeAsFrontage(p.siteFeature);
    }
    setFlowPropertyOfFeature(
      p.siteFeature as unknown as ProjectedFeature,
      setbacks,
      indices,
      [p.blockId],
      instantPointId,
      sharedRotations,
      p.outcomeIndex,
    );
    const ring = p.siteFeature._projected[0] ?? [];
    const edgeDetails: Array<{
      i: number;
      len: number;
      bearingDeg: number;
      role: "front" | "side" | "rear" | "none";
    }> = [];
    for (let e = 0; e < ring.length - 1; e += 1) {
      const a = ring[e];
      const b = ring[e + 1];
      if (!a || !b) continue;
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      edgeDetails.push({
        i: e,
        len: Number(Math.hypot(dx, dy).toFixed(1)),
        bearingDeg: Number(((Math.atan2(dy, dx) * 180) / Math.PI).toFixed(1)),
        role: edgeRoleForIndex(e, indices),
      });
    }
    logger.info(
      "placeVariantsOnShortlist: Phase 2 site classified",
      {
        featureId: outcomes[p.outcomeIndex]?.featureId,
        address: outcomes[p.outcomeIndex]?.address,
        frontEdges: indices.front,
        sideEdges: indices.side,
        rearEdges: indices.rear,
        edgeCount: ring.length - 1,
        edges: edgeDetails,
      },
      SERVICE_NAME,
    );
  }
}

function readRefinedSideIndicesFromFlow(
  properties: Record<string, unknown>,
  envelopeNodeId: string,
): { front?: number[]; side?: number[]; rear?: number[] } {
  const flow = properties.flow as { inputs?: Record<string, { parameters?: { sideIndices?: unknown } }> } | undefined;
  const raw = flow?.inputs?.[envelopeNodeId]?.parameters?.sideIndices;
  return (raw as { front?: number[]; side?: number[]; rear?: number[] } | undefined) ?? {};
}

function computeLongestFrontEdgeMetrics(
  siteRing: number[][],
  refinedFront: number[],
): { longestFrontLen: number; frontEdgeBearingRad: number | null } {
  let longestFrontLen = -Infinity;
  let frontEdgeBearingRad: number | null = null;
  for (const edgeIdx of refinedFront) {
    const a = siteRing[edgeIdx];
    const b = siteRing[edgeIdx + 1];
    if (!a || !b) continue;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len > longestFrontLen) {
      longestFrontLen = len;
      frontEdgeBearingRad = Math.atan2(dy, dx);
    }
  }
  return { longestFrontLen, frontEdgeBearingRad };
}

function collectPrefilteredPreparedSites(
  prepared: PreparedSite[],
  outcomes: ShortlistPlacementOutcome[],
): PreparedSite[] {
  const passedPrepared: PreparedSite[] = [];
  for (const p of prepared) {
    const idStr = coerceUnknownToString((p.siteFeature.properties as { id?: unknown }).id, "");
    const addressStr = coerceUnknownToString((p.siteFeature.properties as { address?: unknown }).address, "");
    const { passedFeatures, reports } = getValidPatternsForSitePlacement(
      [{ value: idStr, label: addressStr }],
      [p.siteFeature],
      p.selection.variant,
    );
    if (passedFeatures.length === 0) {
      const siteReport = reports[0];
      const outcome = outcomes[p.outcomeIndex];
      if (outcome) {
        outcome.error = siteReport
          ? formatPrefilterFailure(siteReport, `${p.selection.pattern.metadata.id} ${p.selection.variant.variantId}`)
          : "Prefilter rejected variant";
      }
      continue;
    }
    passedPrepared.push(p);

    const envelopeNodeId = getEnvelopeNodeId();
    const props = p.siteFeature.properties as Record<string, unknown>;
    const refinedSideIndices = readRefinedSideIndicesFromFlow(props, envelopeNodeId);
    const siteRing = p.siteFeature._projected[0] ?? [];
    const refinedFront = refinedSideIndices.front ?? [];
    const { longestFrontLen, frontEdgeBearingRad } = computeLongestFrontEdgeMetrics(siteRing, refinedFront);
    p.frontageBearingRad = frontEdgeBearingRad;

    logger.info(
      "placeVariantsOnShortlist: Phase 3 site refined",
      {
        featureId: outcomes[p.outcomeIndex]?.featureId,
        address: outcomes[p.outcomeIndex]?.address,
        refinedFrontEdges: refinedSideIndices.front,
        refinedSideEdges: refinedSideIndices.side,
        refinedRearEdges: refinedSideIndices.rear,
        frontageBearingDeg: frontEdgeBearingRad === null ? null : (frontEdgeBearingRad * 180) / Math.PI,
        frontageLengthM: longestFrontLen > 0 ? Number(longestFrontLen.toFixed(1)) : null,
      },
      SERVICE_NAME,
    );
  }
  return passedPrepared;
}

export async function placeVariantsOnShortlist(args: PlaceShortlistArgs): Promise<PlaceShortlistResult> {
  const { selections, setbacks, bootstrap, instantPointId, onProgress, abortSignal } = args;

  const outcomes = buildInitialOutcomes(selections);

  if (selections.length === 0) {
    return {
      outcomes,
      totals: {
        totalDwellings: 0,
        totalNetArea: 0,
        successCount: 0,
        failureCount: 0,
      },
    };
  }

  await ensureClipperLoaded();
  await ensurePlacementLayersInitialised(bootstrap.projectAppsByAppID);

  const rawOrigin = (giraffeState as { get: (key: string) => unknown }).get("projectOrigin");
  const projectOrigin = normaliseProjectReference(rawOrigin);
  const geoProject = createLocalProjection(projectOrigin);

  const roadCollection = await fetchRoadFeatures();
  const roadFeatures = projectGeoJsonCollection(
    roadCollection,
    geoProject,
    (feature) => feature.geometry.type === "LineString" || feature.geometry.type === "MultiLineString",
  );

  const prepared = await prepareSitesForShortlistPlacement({
    selections,
    outcomes,
    bootstrap,
    geoProject,
    abortSignal,
  });

  logger.info(
    "placeVariantsOnShortlist: projection + block matching complete",
    {
      totalSelections: selections.length,
      preparedCount: prepared.length,
      failedCount: selections.length - prepared.length,
    },
    SERVICE_NAME,
  );

  const sharedRotations = buildSharedRotations(bootstrap);
  const allSiteFeatures: ProjectedPolygon[] = prepared.map((p) => p.siteFeature);
  logEnvelopeClassificationForPreparedSites({
    prepared,
    outcomes,
    allSiteFeatures,
    roadFeatures,
    setbacks,
    instantPointId,
    sharedRotations,
  });

  const passedPrepared = collectPrefilteredPreparedSites(prepared, outcomes);

  const { allPlacedWgs84, allSetbackWgs84 } = await executeShortlistGroupedEvaluation({
    passedPrepared,
    outcomes,
    bootstrap,
    geoProject,
    abortSignal,
    onProgress,
  });

  try {
    await rpc.invoke("updateTempLayerGeoJSON", [
      PLACEMENT_LAYER_NAMES.PATTERN,
      { type: "FeatureCollection", features: allPlacedWgs84 },
      true,
    ]);
    await rpc.invoke("updateTempLayerGeoJSON", [
      PLACEMENT_LAYER_NAMES.SITE_SETBACK,
      { type: "FeatureCollection", features: allSetbackWgs84 },
      true,
    ]);
  } catch (err) {
    logger.warn(
      "placeVariantsOnShortlist: failed to write placement layers",
      { error: err instanceof Error ? err.message : String(err) },
      SERVICE_NAME,
    );
  }

  const successCount = outcomes.filter((o) => o.success).length;
  const failureCount = outcomes.length - successCount;
  const totalDwellings = outcomes.reduce((acc, o) => acc + o.dwellings, 0);
  const totalNetArea = outcomes.reduce((acc, o) => acc + o.netArea, 0);

  logger.info(
    "placeVariantsOnShortlist complete",
    {
      total: outcomes.length,
      successCount,
      failureCount,
      totalDwellings,
      totalNetArea,
      placedFeatureCount: allPlacedWgs84.length,
    },
    SERVICE_NAME,
  );

  return {
    outcomes,
    totals: {
      totalDwellings,
      totalNetArea,
      successCount,
      failureCount,
    },
  };
}
