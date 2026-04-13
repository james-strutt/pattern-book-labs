import { giraffeState, rpc } from "@gi-nx/iframe-sdk";

import logger from "@/lib/logger";
import { FEATURE_PROP, getProp } from "@/constants/featureProps";
import type { FeatureWithProperties } from "@/constants/featureProps";
import type { GiraffeRawSections } from "@/types/external/iframe-sdk";
import type { ProjectLayer, ShortlistLayer, ShortlistContents } from "@/types/domain/shortlist";

const isGiraffeStateReady = (): boolean => {
  try {
    return typeof giraffeState?.get === "function";
  } catch {
    return false;
  }
};

interface PendingSave {
  layerName: string;
  featureCollection: ShortlistContents;
  retryCount: number;
  timestamp: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const MAX_PENDING_PER_LAYER = 2;
const pendingSaves = new Map<string, PendingSave>();

const evictOldPendingSaves = (layerName: string): void => {
  const layerEntries = Array.from(pendingSaves.entries()).filter(([, save]) => save.layerName === layerName);
  if (layerEntries.length < MAX_PENDING_PER_LAYER) return;

  const sortedEntries = [...layerEntries].sort((a, b) => a[1].timestamp - b[1].timestamp);
  const evictCount = layerEntries.length - MAX_PENDING_PER_LAYER + 1;
  sortedEntries.slice(0, evictCount).forEach(([key]) => pendingSaves.delete(key));
};

const processPendingSave = async (key: string): Promise<void> => {
  const pending = pendingSaves.get(key);
  if (!pending) return;

  try {
    await rpc.invoke("updateGeoJSONLayerContents", [pending.layerName, pending.featureCollection]);
    pendingSaves.delete(key);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (pending.retryCount < MAX_RETRIES) {
      pending.retryCount++;
      logger.warn(
        "Background save failed, retrying",
        {
          error: errorMessage,
          layerName: pending.layerName,
          retryCount: pending.retryCount,
        },
        "shortlistService",
      );

      setTimeout(() => {
        void processPendingSave(key);
      }, RETRY_DELAY_MS * pending.retryCount);
    } else {
      logger.error(
        "Background save failed after max retries",
        { error: errorMessage, layerName: pending.layerName },
        "shortlistService",
      );
      pendingSaves.delete(key);
    }
  }
};

export const fetchShortlists = async (): Promise<ShortlistLayer[]> => {
  try {
    if (!isGiraffeStateReady()) {
      logger.warn("Giraffe state not ready, returning empty shortlists", {}, "shortlistService");
      return [];
    }

    const projectLayers = giraffeState.get("projectLayers") as ProjectLayer[] | undefined;

    let shortlistLayers: ShortlistLayer[] = [];

    if (projectLayers && projectLayers.length > 0) {
      shortlistLayers = projectLayers
        .filter(
          (layer) =>
            (layer?.layer_full?.name?.includes("Shortlist") ?? false) || (layer?.name?.includes("Shortlist") ?? false),
        )
        .map((layer) => ({
          id: String(layer.id),
          projectLayer: layer,
          name: layer.layer_full?.name ?? layer.name ?? "Unnamed Shortlist",
          description: layer.layer_full?.description,
        }));
    } else {
      const rawSections = giraffeState.get("rawSections") as GiraffeRawSections | undefined;
      if (rawSections?.features) {
        shortlistLayers = rawSections.features
          .filter((feature) => {
            const name = getProp<string>(feature, "name");
            const layerId = getProp<string>(feature, "layerId");
            const nameMatches = name?.startsWith("Shortlist") ?? false;
            const layerIdMatches = layerId?.startsWith("Shortlist") ?? false;
            return nameMatches || layerIdMatches;
          })
          .map((feature) => ({
            id: String(feature.id ?? getProp<string | number>(feature, "id") ?? crypto.randomUUID()),
            rawFeature: feature,
            name: getProp<string>(feature, "name") ?? getProp<string>(feature, "layerId") ?? "Unnamed Shortlist",
            description: getProp<string>(feature, "description") ?? undefined,
          }));
      } else {
        logger.warn("No layers found, returning empty shortlists", {}, "shortlistService");
        return [];
      }
    }

    shortlistLayers.sort((a, b) => a.name.localeCompare(b.name));
    return shortlistLayers;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Failed to fetch shortlists", { error: errorMessage }, "shortlistService");
    throw error;
  }
};

export const fetchShortlistContents = async (shortlistName: string): Promise<ShortlistContents> => {
  try {
    const layerContents = (await rpc.invoke("getLayerContents", [shortlistName])) as ShortlistContents;

    if (layerContents?.features) {
      layerContents.features = layerContents.features.map((feature) => {
        const props = feature.properties ?? {};
        const lotRef = getProp<string>(feature, FEATURE_PROP.LOT.LOT_REFERENCE);
        const relatedLotRefs = getProp<string>(feature, FEATURE_PROP.PROPERTY.RELATED_LOT_REFERENCES);
        if (!lotRef && relatedLotRefs) {
          props[FEATURE_PROP.LOT.LOT_REFERENCE] = relatedLotRefs;
        }

        return {
          ...feature,
          id: feature.id ?? getProp<string | number>(feature, "id") ?? crypto.randomUUID(),
          properties: props,
          type: "Feature" as const,
        };
      });
    }

    return layerContents;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Failed to fetch shortlist contents", { error: errorMessage, shortlistName }, "shortlistService");
    throw error;
  }
};

export const updateShortlistContents = async (
  layerName: string,
  featureCollection: ShortlistContents,
): Promise<unknown> => {
  if (!layerName) {
    throw new Error("Layer name is required for updating");
  }

  try {
    return await rpc.invoke("updateGeoJSONLayerContents", [layerName, featureCollection]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Failed to update shortlist contents", { error: errorMessage, layerName }, "shortlistService");
    throw error;
  }
};

export const removeFeatureFromShortlist = async (layerName: string, featureId: string): Promise<ShortlistContents> => {
  if (!layerName) {
    throw new Error("Layer name is required for removing a feature");
  }

  const contents = (await rpc.invoke("getLayerContents", [layerName])) as ShortlistContents;

  const updatedFeatures = (contents?.features ?? []).filter((f) => String(f.id) !== featureId);

  const updatedContents: ShortlistContents = {
    type: "FeatureCollection",
    features: updatedFeatures,
  };

  await rpc.invoke("updateGeoJSONLayerContents", [layerName, updatedContents]);

  return updatedContents;
};

export const patchFeatureProperties = async (
  layerName: string,
  shortlistContents: ShortlistContents,
  featureIds: string | number | Array<string | number>,
  propertyUpdates: Record<string, unknown> | ((feature: FeatureWithProperties) => Record<string, unknown>),
): Promise<ShortlistContents> => {
  if (!layerName) {
    throw new Error("Layer name is required for updating");
  }

  if (!shortlistContents?.features) {
    throw new Error("Valid shortlist contents required for patching");
  }

  const targetIds = Array.isArray(featureIds) ? featureIds : [featureIds];
  const targetIdSet = new Set(targetIds.map(String));

  let hasChanges = false;
  const updatedFeatures = shortlistContents.features.map((feature) => {
    if (!feature || !targetIdSet.has(String(feature.id))) {
      return feature;
    }
    hasChanges = true;
    return {
      ...feature,
      type: "Feature" as const,
      properties: {
        ...feature.properties,
        ...(typeof propertyUpdates === "function" ? propertyUpdates(feature) : propertyUpdates),
      },
    };
  });

  if (!hasChanges) {
    return shortlistContents;
  }

  const updatedContents: ShortlistContents = {
    type: "FeatureCollection",
    features: updatedFeatures,
  };

  evictOldPendingSaves(layerName);
  const saveKey = `${layerName}-${Date.now()}`;
  pendingSaves.set(saveKey, {
    layerName,
    featureCollection: updatedContents,
    retryCount: 0,
    timestamp: Date.now(),
  });

  void processPendingSave(saveKey);

  return updatedContents;
};
