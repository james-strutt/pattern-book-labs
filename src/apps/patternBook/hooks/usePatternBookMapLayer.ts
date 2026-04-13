import { useEffect, useCallback, useRef, useState } from "react";
import { rpc } from "@gi-nx/iframe-sdk";
import type { Polygon, MultiPolygon } from "geojson";
import type { ShortlistPatternAnalysisResult, PropertyFeature } from "@/apps/patternBook/types/shortlistAnalysis";
import { LAYER_IDS, MAP_OPACITY } from "@/apps/patternBook/constants/patternBookMapStyles";
import logger from "@/lib/logger";
import {
  buildEligibilityViewLayers,
  buildPatternFilterLayers,
  createMapFeatureProperties,
  isBenignMapLayerClearError,
  isMapRpcUnavailableMessage,
  type PatternFilteredProperties,
} from "@/apps/patternBook/hooks/patternBookMapLayerShared";

const HOOK_NAME = "usePatternBookMapLayer";

export interface UsePatternBookMapLayerReturn {
  isLayerActive: boolean;
  selectedFeatureId: string | null;
  hoveredFeatureId: string | null;
  selectedPatternId: string | null;
  setMapData: (features: PropertyFeature[], results: ShortlistPatternAnalysisResult | null) => void;
  updateMapLayer: (features: PropertyFeature[], results: ShortlistPatternAnalysisResult | null) => Promise<void>;
  clearMapLayer: () => Promise<void>;
  highlightPattern: (patternId: string | null) => void;
  selectFeature: (featureId: string | null) => void;
  hoverFeature: (featureId: string | null) => void;
  zoomToFeature: (featureId: string) => Promise<void>;
  filterByPattern: (patternId: string | null) => Promise<void>;
  eligibilityCounts: {
    eligible: number;
    partial: number;
    ineligible: number;
  };
}

export function usePatternBookMapLayer(): UsePatternBookMapLayerReturn {
  const [isLayerActive, setIsLayerActive] = useState(false);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [hoveredFeatureId, setHoveredFeatureId] = useState<string | null>(null);
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);
  const [eligibilityCounts, setEligibilityCounts] = useState({
    eligible: 0,
    partial: 0,
    ineligible: 0,
  });

  const featuresRef = useRef<PropertyFeature[]>([]);
  const resultsRef = useRef<ShortlistPatternAnalysisResult | null>(null);
  const highlightedPatternRef = useRef<string | null>(null);
  const layerMutationGenerationRef = useRef(0);

  const setMapData = useCallback(
    (features: PropertyFeature[], results: ShortlistPatternAnalysisResult | null): void => {
      featuresRef.current = features;
      resultsRef.current = results;
      logger.debug("Map data stored in refs", { featureCount: features.length }, HOOK_NAME);
    },
    [],
  );

  const clearMapLayer = useCallback(async (): Promise<void> => {
    layerMutationGenerationRef.current += 1;
    try {
      await rpc.invoke("removeTempLayer", [LAYER_IDS.SHORTLIST_FILL]);
      await rpc.invoke("removeTempLayer", [LAYER_IDS.SHORTLIST_OUTLINE]);
      logger.info("Map layer cleared", {}, HOOK_NAME);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (!isBenignMapLayerClearError(errorMessage)) {
        logger.error("Failed to clear map layer", { error: err }, HOOK_NAME);
      }
    } finally {
      setIsLayerActive(false);
      setEligibilityCounts({ eligible: 0, partial: 0, ineligible: 0 });
      setSelectedPatternId(null);
    }
  }, []);

  const updateMapLayer = useCallback(
    async (features: PropertyFeature[], results: ShortlistPatternAnalysisResult | null): Promise<void> => {
      featuresRef.current = features;
      resultsRef.current = results;

      if (features.length === 0) {
        await clearMapLayer();
        return;
      }

      const totalPatterns = results?.patternCount ?? 0;

      const counts = { eligible: 0, partial: 0, ineligible: 0 };
      const mapFeatures = features.map((feature) => {
        const props = createMapFeatureProperties(feature, results, totalPatterns);

        if (props.eligibilityCategory === "eligible") counts.eligible++;
        else if (props.eligibilityCategory === "partial") counts.partial++;
        else counts.ineligible++;

        return {
          type: "Feature" as const,
          geometry: feature.geometry,
          properties: props,
        };
      });

      setEligibilityCounts(counts);

      const featureCollection = {
        type: "FeatureCollection" as const,
        features: mapFeatures,
      };

      const mutationId = (layerMutationGenerationRef.current += 1);

      try {
        await rpc.invoke("removeTempLayer", [LAYER_IDS.SHORTLIST_FILL]);
        await rpc.invoke("removeTempLayer", [LAYER_IDS.SHORTLIST_OUTLINE]);
      } catch {
        /* layers may not exist */
      }

      const { fillLayerDef, outlineLayerDef } = buildEligibilityViewLayers(featureCollection);

      try {
        await rpc.invoke("addTempLayer", [LAYER_IDS.SHORTLIST_FILL, fillLayerDef, null, false, MAP_OPACITY.FILL]);
        await rpc.invoke("addTempLayer", [
          LAYER_IDS.SHORTLIST_OUTLINE,
          outlineLayerDef,
          null,
          false,
          MAP_OPACITY.OUTLINE,
        ]);

        if (layerMutationGenerationRef.current !== mutationId) {
          return;
        }
        setIsLayerActive(true);
        logger.info("Map layer updated", { featureCount: features.length }, HOOK_NAME);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (isMapRpcUnavailableMessage(errorMessage)) {
          logger.debug("Map layer RPC not available (running outside Giraffe)", {}, HOOK_NAME);
        } else {
          logger.error("Failed to update map layer", { error: err }, HOOK_NAME);
        }
      }
    },
    [clearMapLayer],
  );

  const highlightPattern = useCallback((patternId: string | null) => {
    highlightedPatternRef.current = patternId;
    logger.debug("Pattern highlight requested", { patternId }, HOOK_NAME);
  }, []);

  const selectFeature = useCallback((featureId: string | null) => {
    setSelectedFeatureId(featureId);
    logger.debug("Feature selection changed", { featureId }, HOOK_NAME);
  }, []);

  const hoverFeature = useCallback((featureId: string | null) => {
    setHoveredFeatureId(featureId);
    logger.debug("Feature hover changed", { featureId }, HOOK_NAME);
  }, []);

  const zoomToFeature = useCallback(async (featureId: string) => {
    const feature = featuresRef.current.find((f) => f.id === featureId);
    if (!feature) return;

    try {
      await rpc.invoke("zoomToGeometry", [feature.geometry]);
      logger.debug("Zoomed to feature", { featureId }, HOOK_NAME);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (isMapRpcUnavailableMessage(errorMessage)) {
        /* expected when RPC not available */
      } else {
        logger.error("Failed to zoom to feature", { error: err, featureId }, HOOK_NAME);
      }
    }
  }, []);

  const filterByPattern = useCallback(
    async (patternId: string | null) => {
      logger.info("filterByPattern called", { patternId, featuresCount: featuresRef.current.length }, HOOK_NAME);
      setSelectedPatternId(patternId);

      if (featuresRef.current.length === 0) {
        logger.warn("No features in ref, cannot filter", {}, HOOK_NAME);
        return;
      }

      const features = featuresRef.current;
      const results = resultsRef.current;

      if (!results) {
        logger.warn("No results in ref, cannot filter", {}, HOOK_NAME);
        return;
      }

      try {
        await rpc.invoke("removeTempLayer", [LAYER_IDS.SHORTLIST_FILL]);
        await rpc.invoke("removeTempLayer", [LAYER_IDS.SHORTLIST_OUTLINE]);
        logger.debug("Removed existing temp layers", {}, HOOK_NAME);
      } catch {
        logger.debug("No existing layers to remove", {}, HOOK_NAME);
      }

      if (patternId === null) {
        logger.info("patternId is null, restoring default map layer", {}, HOOK_NAME);
        await updateMapLayer(features, results);
        return;
      }

      const patternResult = results.patternResults[patternId];
      if (!patternResult) {
        logger.warn(
          "Pattern not found in results",
          {
            patternId,
            availablePatterns: Object.keys(results.patternResults),
          },
          HOOK_NAME,
        );
        return;
      }

      const mutationId = (layerMutationGenerationRef.current += 1);

      const eligibleFeatureIds = new Set(patternResult.eligibleProperties.map((p) => p.featureId));

      logger.info(
        "Building filtered layer",
        {
          patternId,
          eligibleCount: eligibleFeatureIds.size,
          totalFeatures: features.length,
        },
        HOOK_NAME,
      );

      const totalPatterns = results.patternCount;
      const mapFeatures: Array<{
        type: "Feature";
        geometry: Polygon | MultiPolygon;
        properties: PatternFilteredProperties;
      }> = features.map((feature) => {
        const baseProps = createMapFeatureProperties(feature, results, totalPatterns);
        const isEligibleForPattern = eligibleFeatureIds.has(feature.id);

        return {
          type: "Feature",
          geometry: feature.geometry,
          properties: {
            ...baseProps,
            isEligibleForPattern,
          },
        };
      });

      let eligibleCount = 0;
      for (const f of mapFeatures) {
        if (f.properties.isEligibleForPattern) eligibleCount += 1;
      }
      const ineligibleCount = mapFeatures.length - eligibleCount;
      setEligibilityCounts({
        eligible: eligibleCount,
        partial: 0,
        ineligible: ineligibleCount,
      });

      const featureCollection = {
        type: "FeatureCollection" as const,
        features: mapFeatures,
      };

      logger.debug(
        "Created feature collection",
        {
          featureCount: featureCollection.features.length,
          eligibleCount,
          ineligibleCount,
        },
        HOOK_NAME,
      );

      const { fillLayerDef, outlineLayerDef } = buildPatternFilterLayers(featureCollection);

      try {
        await rpc.invoke("addTempLayer", [LAYER_IDS.SHORTLIST_FILL, fillLayerDef, null, false, MAP_OPACITY.FILL]);
        await rpc.invoke("addTempLayer", [
          LAYER_IDS.SHORTLIST_OUTLINE,
          outlineLayerDef,
          null,
          false,
          MAP_OPACITY.OUTLINE,
        ]);

        if (layerMutationGenerationRef.current !== mutationId) {
          return;
        }
        setIsLayerActive(true);
        logger.info(
          "Map layer filtered by pattern successfully",
          { patternId, featureCount: mapFeatures.length },
          HOOK_NAME,
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logger.error("Failed to filter map layer by pattern", { error: errorMessage, patternId }, HOOK_NAME);
      }
    },
    [updateMapLayer],
  );

  useEffect(() => {
    return (): void => {
      layerMutationGenerationRef.current += 1;
      logger.info("Cleaning up pattern book map layers on unmount", {}, HOOK_NAME);
      rpc.invoke("removeTempLayer", [LAYER_IDS.SHORTLIST_FILL]).catch(() => {});
      rpc.invoke("removeTempLayer", [LAYER_IDS.SHORTLIST_OUTLINE]).catch(() => {});
    };
  }, []);

  return {
    isLayerActive,
    selectedFeatureId,
    hoveredFeatureId,
    selectedPatternId,
    setMapData,
    updateMapLayer,
    clearMapLayer,
    highlightPattern,
    selectFeature,
    hoverFeature,
    zoomToFeature,
    filterByPattern,
    eligibilityCounts,
  };
}
