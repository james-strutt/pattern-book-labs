import type { FeatureCollection, Polygon, MultiPolygon } from "geojson";
import type {
  ShortlistPatternAnalysisResult,
  PatternBookMapFeatureProperties,
  PropertyFeature,
} from "@/apps/patternBook/types/shortlistAnalysis";
import {
  MAP_COLOURS,
  getEligibilityCategory,
  ELIGIBILITY_THRESHOLDS,
  LAYER_IDS,
  MAP_OPACITY,
  MAP_LINE_WIDTH,
} from "@/apps/patternBook/constants/patternBookMapStyles";
import { getProp, FEATURE_PROP } from "@/constants/featureProps";

export interface PatternFilteredProperties extends PatternBookMapFeatureProperties {
  isEligibleForPattern: boolean;
}

export function createMapFeatureProperties(
  feature: PropertyFeature,
  results: ShortlistPatternAnalysisResult | null,
  totalPatterns: number,
): PatternBookMapFeatureProperties {
  const propertyResult = results?.propertyResults[feature.id];

  const eligiblePatternCount = propertyResult?.eligiblePatterns.length ?? 0;
  const category = getEligibilityCategory(eligiblePatternCount);

  let address = getProp<string>(feature, FEATURE_PROP.PROPERTY.ADDRESS, null);
  if (!address) {
    const lotRef = getProp<string>(feature, FEATURE_PROP.LOT.LOT_REFERENCE, null);
    if (lotRef) {
      address = `Lot ${lotRef}`;
    } else {
      const lotNumber = getProp(feature, FEATURE_PROP.LOT.LOT_NUMBER, null);
      const planLabel = getProp(feature, FEATURE_PROP.LOT.PLAN_LABEL, null);
      address = lotNumber && planLabel ? `Lot ${lotNumber} ${planLabel}` : `Property ${feature.id}`;
    }
  }

  return {
    featureId: feature.id,
    address,
    eligiblePatternCount,
    totalPatternCount: totalPatterns,
    isFullyEligible: eligiblePatternCount >= ELIGIBILITY_THRESHOLDS.FULL,
    isPartiallyEligible:
      eligiblePatternCount >= ELIGIBILITY_THRESHOLDS.PARTIAL && eligiblePatternCount < ELIGIBILITY_THRESHOLDS.FULL,
    maxDwellings: propertyResult?.maxDwellings ?? 0,
    maxGfa: propertyResult?.maxGfa ?? 0,
    bestPattern: propertyResult?.bestVariant ? (propertyResult.eligiblePatterns[0]?.patternName ?? null) : null,
    eligibilityCategory: category,
    isSelected: 0,
    isHovered: 0,
  };
}

type EligibilityGeoJson = FeatureCollection<Polygon | MultiPolygon, PatternBookMapFeatureProperties>;

type PatternFilterGeoJson = FeatureCollection<Polygon | MultiPolygon, PatternFilteredProperties>;

export function buildEligibilityViewLayers(data: EligibilityGeoJson): {
  fillLayerDef: Record<string, unknown>;
  outlineLayerDef: Record<string, unknown>;
} {
  return {
    fillLayerDef: {
      id: LAYER_IDS.SHORTLIST_FILL,
      type: "fill",
      source: { type: "geojson", data },
      paint: {
        "fill-color": [
          "case",
          ["==", ["get", "eligibilityCategory"], "eligible"],
          MAP_COLOURS.ELIGIBLE_FILL,
          ["==", ["get", "eligibilityCategory"], "partial"],
          MAP_COLOURS.PARTIAL_FILL,
          MAP_COLOURS.INELIGIBLE_FILL,
        ],
        "fill-opacity": MAP_OPACITY.FILL,
      },
    },
    outlineLayerDef: {
      id: LAYER_IDS.SHORTLIST_OUTLINE,
      type: "line",
      source: { type: "geojson", data },
      paint: {
        "line-color": [
          "case",
          ["==", ["get", "eligibilityCategory"], "eligible"],
          MAP_COLOURS.ELIGIBLE_OUTLINE,
          ["==", ["get", "eligibilityCategory"], "partial"],
          MAP_COLOURS.PARTIAL_OUTLINE,
          MAP_COLOURS.INELIGIBLE_OUTLINE,
        ],
        "line-width": MAP_LINE_WIDTH.OUTLINE,
      },
    },
  };
}

export function buildPatternFilterLayers(data: PatternFilterGeoJson): {
  fillLayerDef: Record<string, unknown>;
  outlineLayerDef: Record<string, unknown>;
} {
  return {
    fillLayerDef: {
      id: LAYER_IDS.SHORTLIST_FILL,
      type: "fill",
      source: { type: "geojson", data },
      paint: {
        "fill-color": [
          "case",
          ["==", ["get", "isEligibleForPattern"], true],
          MAP_COLOURS.ELIGIBLE_FILL,
          MAP_COLOURS.INELIGIBLE_FILL,
        ],
        "fill-opacity": MAP_OPACITY.FILL,
      },
    },
    outlineLayerDef: {
      id: LAYER_IDS.SHORTLIST_OUTLINE,
      type: "line",
      source: { type: "geojson", data },
      paint: {
        "line-color": [
          "case",
          ["==", ["get", "isEligibleForPattern"], true],
          MAP_COLOURS.ELIGIBLE_OUTLINE,
          MAP_COLOURS.INELIGIBLE_OUTLINE,
        ],
        "line-width": MAP_LINE_WIDTH.OUTLINE,
      },
    },
  };
}

export function isBenignMapLayerClearError(message: string): boolean {
  return message.includes("not registered") || message.includes("Layer not found");
}

export function isMapRpcUnavailableMessage(message: string): boolean {
  return message.includes("not registered");
}
