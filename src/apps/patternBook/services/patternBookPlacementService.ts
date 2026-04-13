import { rpc } from "@gi-nx/iframe-sdk";
import type { FeatureCollection } from "geojson";
import { PLACEMENT_LAYER_NAMES } from "@/apps/patternBook/constants/placementLayers";
import logger from "@/lib/logger";
import type { PlaceVariantArgs, PlacementResult, PlacementStats } from "@/apps/patternBook/types/placement";
import { placeVariantsOnShortlist } from "@/apps/patternBook/services/patternBookPlacementShortlist";
import { resetPlacementLayerInitState } from "@/apps/patternBook/services/patternBookPlacementSupport";

const SERVICE_NAME = "PatternBookPlacement";

export type { AlignResult } from "@/apps/patternBook/services/patternBookPlacementAlign";

export type {
  ShortlistPlacementSelection,
  ShortlistPlacementProgress,
  PlaceShortlistArgs,
  ShortlistPlacementOutcome,
  PlaceShortlistResult,
} from "@/apps/patternBook/services/patternBookPlacementShortlist";

export { placeVariantsOnShortlist } from "@/apps/patternBook/services/patternBookPlacementShortlist";

export interface PlaceVariantOptions {
  writeToLayers?: boolean;
  preloadedRoadFeatures?: FeatureCollection;
}

export async function placeVariantOnProperty(
  args: PlaceVariantArgs,
  _options: PlaceVariantOptions = {},
): Promise<PlacementResult> {
  const result = await placeVariantsOnShortlist({
    selections: [
      {
        property: args.property,
        pattern: args.pattern,
        variant: args.variant,
      },
    ],
    setbacks: args.setbacks,
    bootstrap: args.bootstrap,
    instantPointId: args.instantPointId,
  });

  const outcome = result.outcomes[0];
  if (!outcome) {
    throw new Error("placeVariantsOnShortlist returned no outcomes");
  }
  if (!outcome.success) {
    throw new Error(outcome.error ?? "Placement failed");
  }
  if (!outcome.projectedSiteFeature) {
    throw new Error("Placement succeeded but projectedSiteFeature is missing — internal error");
  }

  const stats: PlacementStats = {
    dwellings: outcome.dwellings,
    netArea: outcome.netArea,
    fsr: outcome.fsr,
    footprintArea: outcome.footprintArea,
  };

  return {
    placedFeatures: outcome.placedFeatures,
    setbackFeatures: outcome.projectedSetbackFeatures,
    svgFeatures: [
      outcome.projectedSiteFeature,
      ...outcome.projectedSetbackFeatures,
      ...outcome.projectedStackedFeatures,
    ],
    featureCollection: {
      type: "FeatureCollection",
      features: outcome.placedFeatures,
    },
    stats,
    blockId: outcome.blockId,
    siteFeature: outcome.projectedSiteFeature,
  };
}

export async function clearPlacementLayers(): Promise<void> {
  try {
    await Promise.all([
      rpc.invoke("removeTempLayer", [PLACEMENT_LAYER_NAMES.PATTERN]),
      rpc.invoke("removeTempLayer", [PLACEMENT_LAYER_NAMES.SITE_SETBACK]),
      rpc.invoke("removeTempLayer", [PLACEMENT_LAYER_NAMES.SELECTED_SITES]),
      rpc.invoke("removeTempLayer", [PLACEMENT_LAYER_NAMES.SELECTED_SITE]),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("not registered") && !message.includes("Layer not found")) {
      logger.warn("Failed to clear placement temp layers", { error: message }, SERVICE_NAME);
    }
  } finally {
    resetPlacementLayerInitState();
  }
}

export async function writeAggregatePlacementLayers(placements: readonly PlacementResult[]): Promise<void> {
  const allFeatures = placements.flatMap((placement) => placement.placedFeatures);

  try {
    await rpc.invoke("updateTempLayerGeoJSON", [
      PLACEMENT_LAYER_NAMES.PATTERN,
      { type: "FeatureCollection", features: allFeatures },
      true,
    ]);
    await rpc.invoke("updateTempLayerGeoJSON", [
      PLACEMENT_LAYER_NAMES.SITE_SETBACK,
      { type: "FeatureCollection", features: [] },
      true,
    ]);
    logger.info(
      "Aggregate placement layers written",
      {
        siteCount: placements.length,
        totalFeatures: allFeatures.length,
      },
      SERVICE_NAME,
    );
  } catch (error) {
    logger.warn(
      "Failed to write aggregate placement layers",
      { error: error instanceof Error ? error.message : String(error) },
      SERVICE_NAME,
    );
    throw error;
  }
}
