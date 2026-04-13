import { rpc } from "@gi-nx/iframe-sdk";
import type * as GeoJSON from "geojson";

import { BOUNDARY_LINE_STYLE } from "@/constants/mapStyles";
import type { MapboxLineLayerStyle } from "@/constants/mapStyles";
import logger from "@/lib/logger";
import { isPolygonOrMultiPolygon } from "@/utils/typeGuards";
import type { FeatureWithProperties } from "@/constants/featureProps";

const MIN_ADD_TEMP_LAYER_INTERVAL = 500;
const ADD_LAYER_DELAY_MS = 10;

type LayerDefinition = MapboxLineLayerStyle & {
  id: string;
  source: { type: "geojson"; data: GeoJSON.FeatureCollection };
};

export interface BoundaryLayerConfig {
  layerId: string;
  style?: MapboxLineLayerStyle;
}

export interface BoundaryLayerService {
  showSelectedBoundaryLayer: (
    featureOrFeatures:
      | FeatureWithProperties
      | FeatureWithProperties[]
      | null
      | undefined
  ) => Promise<void>;
  removeSelectedBoundaryLayer: () => Promise<void>;
  cleanupSelectedBoundaryLayer: () => void;
}

function isSuppressibleError(message: string): boolean {
  return (
    message.includes("Too many invocations") ||
    message.includes("not registered")
  );
}

export function createBoundaryLayerService(
  config: BoundaryLayerConfig
): BoundaryLayerService {
  const { layerId, style = BOUNDARY_LINE_STYLE } = config;
  const serviceName = `selectedBoundaryLayer/${layerId}`;

  let lastAddTempLayerTime = 0;
  let pendingUpdate: ReturnType<typeof setTimeout> | null = null;
  let pendingLayerDef: LayerDefinition | null = null;

  const removeSelectedBoundaryLayer = async (): Promise<void> => {
    try {
      await rpc.invoke("removeTempLayer", [layerId]);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (!isSuppressibleError(errorMessage)) {
        logger.error(
          "Failed to remove selected boundary layer",
          { error: errorMessage },
          serviceName
        );
      }
    }
  };

  const cleanupSelectedBoundaryLayer = (): void => {
    if (pendingUpdate) {
      clearTimeout(pendingUpdate);
      pendingUpdate = null;
    }
    pendingLayerDef = null;
  };

  const addLayerWithRetry = async (
    layerDef: LayerDefinition
  ): Promise<void> => {
    try {
      await removeSelectedBoundaryLayer();
      await new Promise<void>((resolve) =>
        setTimeout(resolve, ADD_LAYER_DELAY_MS)
      );
      await rpc.invoke("addTempLayer", [layerId, layerDef, null, true, 1]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (!isSuppressibleError(errorMessage)) {
        logger.error(
          "Failed to add selected boundary layer",
          { error: errorMessage },
          serviceName
        );
      }
    }
  };

  const showSelectedBoundaryLayer = async (
    featureOrFeatures:
      | FeatureWithProperties
      | FeatureWithProperties[]
      | null
      | undefined
  ): Promise<void> => {
    if (!featureOrFeatures) return;

    const featuresArray = Array.isArray(featureOrFeatures)
      ? featureOrFeatures
      : [featureOrFeatures];

    const validFeatures = featuresArray.filter(
      (f): f is FeatureWithProperties =>
        f?.geometry !== undefined && isPolygonOrMultiPolygon(f.geometry)
    );

    if (validFeatures.length === 0) return;

    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: validFeatures.map((f) => ({
        type: "Feature",
        properties: {},
        geometry: f.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon,
      })),
    };

    const layerDef: LayerDefinition = {
      id: layerId,
      ...style,
      source: {
        type: "geojson" as const,
        data: geojson,
      },
    };

    const now = Date.now();
    const timeSinceLastAdd = now - lastAddTempLayerTime;

    pendingLayerDef = layerDef;

    if (
      timeSinceLastAdd < MIN_ADD_TEMP_LAYER_INTERVAL &&
      lastAddTempLayerTime > 0
    ) {
      if (pendingUpdate) {
        clearTimeout(pendingUpdate);
      }

      pendingUpdate = setTimeout(async () => {
        pendingUpdate = null;
        lastAddTempLayerTime = Date.now();
        if (pendingLayerDef) {
          await addLayerWithRetry(pendingLayerDef);
          pendingLayerDef = null;
        }
      }, MIN_ADD_TEMP_LAYER_INTERVAL - timeSinceLastAdd);

      return;
    }

    lastAddTempLayerTime = now;
    await addLayerWithRetry(layerDef);
    pendingLayerDef = null;
  };

  return {
    showSelectedBoundaryLayer,
    removeSelectedBoundaryLayer,
    cleanupSelectedBoundaryLayer,
  };
}
