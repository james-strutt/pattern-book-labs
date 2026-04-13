import { useState, useCallback, useEffect, useRef } from "react";
import * as turf from "@turf/turf";
import { giraffeState } from "@gi-nx/iframe-sdk";
import type { PropertyFeature } from "@/apps/patternBook/types/shortlistAnalysis";
import { fetchShortlists, fetchShortlistContents } from "@/services/shortlistService";
import type { ShortlistLayer } from "@/types/domain/shortlist";
import { getProp, FEATURE_PROP } from "@/constants/featureProps";
import { fitBounds } from "@/services/iframeSDK";
import logger from "@/lib/logger";

const HOOK_NAME = "useShortlistSelection";

const FIT_BOUNDS_PADDING_PX = 50;

const SHORTLIST_NAME_MAX_LENGTH = 512;

function filterToValidPropertyFeatures(features: unknown[]): PropertyFeature[] {
  return features.filter(
    (f): f is PropertyFeature =>
      f !== null &&
      typeof f === "object" &&
      "geometry" in f &&
      f.geometry !== null &&
      typeof f.geometry === "object" &&
      "type" in f.geometry &&
      (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon"),
  );
}

function isValidShortlistName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= SHORTLIST_NAME_MAX_LENGTH;
}

async function flyMapToPropertyFeatures(
  features: PropertyFeature[],
  requestId: number,
  getCurrentRequestId: () => number,
): Promise<void> {
  if (requestId !== getCurrentRequestId()) {
    return;
  }
  try {
    const featureCollection = turf.featureCollection(features);
    const bbox = turf.bbox(featureCollection);
    if (bbox.every((coord) => Number.isFinite(coord))) {
      await fitBounds(
        [
          [bbox[0], bbox[1]],
          [bbox[2], bbox[3]],
        ],
        { padding: FIT_BOUNDS_PADDING_PX },
      );
      if (requestId === getCurrentRequestId()) {
        logger.debug("Flew to shortlist bounds", { bbox }, HOOK_NAME);
      }
    }
  } catch (flyError) {
    logger.debug("Failed to fly to shortlist bounds", { error: flyError }, HOOK_NAME);
  }
}

export interface UseShortlistSelectionReturn {
  selectedFeatures: PropertyFeature[];
  selectedCount: number;
  isLoading: boolean;
  isLoadingShortlists: boolean;
  error: string | null;
  availableShortlists: ShortlistLayer[];
  selectedShortlist: ShortlistLayer | null;
  addProperty: (feature: PropertyFeature) => void;
  removeProperty: (featureId: string) => void;
  clearSelection: () => void;
  loadShortlists: () => Promise<void>;
  selectShortlist: (shortlist: ShortlistLayer) => Promise<void>;
  hasSelection: boolean;
  getPropertyAddress: (feature: PropertyFeature) => string;
}

export function useShortlistSelection(): UseShortlistSelectionReturn {
  const [selectedFeatures, setSelectedFeatures] = useState<PropertyFeature[]>([]);
  const [availableShortlists, setAvailableShortlists] = useState<ShortlistLayer[]>([]);
  const [selectedShortlist, setSelectedShortlist] = useState<ShortlistLayer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingShortlists, setIsLoadingShortlists] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectShortlistRequestRef = useRef(0);

  const addProperty = useCallback((feature: PropertyFeature) => {
    setSelectedFeatures((prev) => {
      if (prev.some((f) => f.id === feature.id)) {
        logger.debug("Property already in selection", { featureId: feature.id }, HOOK_NAME);
        return prev;
      }
      logger.info("Property added to selection", { featureId: feature.id }, HOOK_NAME);
      return [...prev, feature];
    });
  }, []);

  const removeProperty = useCallback((featureId: string) => {
    setSelectedFeatures((prev) => {
      const filtered = prev.filter((f) => f.id !== featureId);
      if (filtered.length !== prev.length) {
        logger.info("Property removed from selection", { featureId }, HOOK_NAME);
      }
      return filtered;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedFeatures([]);
    setSelectedShortlist(null);
    setError(null);
    logger.info("Selection cleared", {}, HOOK_NAME);
  }, []);

  const loadShortlists = useCallback(async () => {
    setIsLoadingShortlists(true);
    setError(null);

    try {
      const shortlists = await fetchShortlists();
      setAvailableShortlists(shortlists);
      logger.info("Loaded available shortlists", { count: shortlists.length }, HOOK_NAME);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load shortlists";
      setError(errorMessage);
      logger.error("Failed to load shortlists", { error: errorMessage }, HOOK_NAME);
    } finally {
      setIsLoadingShortlists(false);
    }
  }, []);

  const selectShortlist = useCallback(async (shortlist: ShortlistLayer) => {
    if (!isValidShortlistName(shortlist.name)) {
      setError("Invalid shortlist name.");
      logger.warn("Rejected shortlist selection: invalid name", { length: shortlist.name.length }, HOOK_NAME);
      return;
    }

    const trimmedShortlist: ShortlistLayer = {
      ...shortlist,
      name: shortlist.name.trim(),
    };

    const requestId = ++selectShortlistRequestRef.current;
    setIsLoading(true);
    setError(null);
    setSelectedShortlist(trimmedShortlist);

    try {
      const contents = await fetchShortlistContents(trimmedShortlist.name);

      if (requestId !== selectShortlistRequestRef.current) {
        return;
      }

      if (!contents?.features?.length) {
        setError("No properties in selected shortlist.");
        logger.warn("No features in shortlist", { shortlistName: trimmedShortlist.name }, HOOK_NAME);
        setSelectedFeatures([]);
        return;
      }

      const validFeatures = filterToValidPropertyFeatures(contents.features);

      if (validFeatures.length === 0) {
        setError("No valid property geometries found in shortlist.");
        setSelectedFeatures([]);
        return;
      }

      setSelectedFeatures(validFeatures);
      logger.info(
        "Loaded shortlist features",
        {
          shortlistName: trimmedShortlist.name,
          count: validFeatures.length,
        },
        HOOK_NAME,
      );

      await flyMapToPropertyFeatures(validFeatures, requestId, () => selectShortlistRequestRef.current);
    } catch (err) {
      if (requestId !== selectShortlistRequestRef.current) {
        return;
      }

      const errorMessage = err instanceof Error ? err.message : "Failed to load shortlist contents";
      setError(errorMessage);
      logger.error(
        "Failed to load shortlist contents",
        {
          error: errorMessage,
          shortlistName: trimmedShortlist.name,
        },
        HOOK_NAME,
      );
    } finally {
      if (requestId === selectShortlistRequestRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const getPropertyAddress = useCallback((feature: PropertyFeature): string => {
    const address = getProp<string>(feature, FEATURE_PROP.PROPERTY.ADDRESS, null);
    if (address?.trim()) return address;

    const lotRef = getProp<string>(feature, FEATURE_PROP.LOT.LOT_REFERENCE, null);
    if (lotRef?.trim()) return `Lot ${lotRef}`;

    const lotNumber = getProp(feature, FEATURE_PROP.LOT.LOT_NUMBER, null);
    const planLabel = getProp(feature, FEATURE_PROP.LOT.PLAN_LABEL, null);
    if (lotNumber && planLabel) return `Lot ${lotNumber} ${planLabel}`;

    return `Property ${feature.id}`;
  }, []);

  useEffect(() => {
    void loadShortlists();

    const listenerKey = giraffeState.addListener(["projectLayers"], () => {
      logger.debug("projectLayers changed — re-fetching shortlists", {}, HOOK_NAME);
      void loadShortlists();
    });

    return (): void => {
      logger.debug("Shortlist selection hook cleanup", {}, HOOK_NAME);
      try {
        giraffeState.removeListener(listenerKey);
      } catch (err) {
        logger.debug("Shortlist listener removal skipped", { err }, HOOK_NAME);
      }
    };
  }, [loadShortlists]);

  return {
    selectedFeatures,
    selectedCount: selectedFeatures.length,
    isLoading,
    isLoadingShortlists,
    error,
    availableShortlists,
    selectedShortlist,
    addProperty,
    removeProperty,
    clearSelection,
    loadShortlists,
    selectShortlist,
    hasSelection: selectedFeatures.length > 0,
    getPropertyAddress,
  };
}
