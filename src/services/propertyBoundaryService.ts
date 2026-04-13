import type { Feature, Polygon, MultiPolygon } from "geojson";
import { addTempLayer, removeTempLayer } from "@/services/iframeSDK";
import type { TempLayerDefinition } from "@/types/external/iframe-sdk";
import logger from "@/lib/logger";
import {
  getProp,
  FEATURE_PROP,
  type FeatureWithProperties,
} from "@/constants/featureProps";

const BOUNDARY_COLOURS = {
  selected: "#ff0000",
} as const;

const PROPERTY_SELECTED_BOUNDARY_LAYER_ID = "property-selector-boundary";

interface LayerDefinition {
  id: string;
  type: "line";
  source: {
    type: "geojson";
    data: {
      type: "FeatureCollection";
      features: Array<{
        type: "Feature";
        properties: {
          id: string;
          name: string;
        };
        geometry: Polygon | MultiPolygon;
      }>;
    };
  };
  paint: {
    "line-color": string;
    "line-width": number;
    "line-opacity": number;
  };
  layout: {
    "line-join": string;
    "line-cap": string;
  };
}

interface ValidPropertyFeature extends FeatureWithProperties {
  geometry: Polygon | MultiPolygon;
}

function isValidPolygonGeometry(geometry: unknown): geometry is Polygon {
  if (!geometry || typeof geometry !== "object") return false;
  const geom = geometry as { type?: string; coordinates?: unknown };
  if (geom.type !== "Polygon") return false;
  if (!Array.isArray(geom.coordinates) || geom.coordinates.length === 0)
    return false;
  const ring = geom.coordinates[0];
  return Array.isArray(ring) && ring.length >= 4;
}

function isValidMultiPolygonGeometry(
  geometry: unknown
): geometry is MultiPolygon {
  if (!geometry || typeof geometry !== "object") return false;
  const geom = geometry as { type?: string; coordinates?: unknown };
  if (geom.type !== "MultiPolygon") return false;
  if (!Array.isArray(geom.coordinates) || geom.coordinates.length === 0)
    return false;
  return geom.coordinates.some((polygon: unknown) => {
    if (!Array.isArray(polygon) || polygon.length === 0) return false;
    const ring = polygon[0];
    return Array.isArray(ring) && ring.length >= 4;
  });
}

function hasValidGeometry(feature: Feature): boolean {
  if (!feature.geometry) return false;
  return (
    isValidPolygonGeometry(feature.geometry) ||
    isValidMultiPolygonGeometry(feature.geometry)
  );
}

function toValidPropertyFeature(feature: Feature): ValidPropertyFeature {
  return {
    ...feature,
    geometry: feature.geometry as Polygon | MultiPolygon,
    properties: feature.properties ?? {},
  } as ValidPropertyFeature;
}

export const removePropertyBoundaryLayer = async (): Promise<void> => {
  try {
    await removeTempLayer(PROPERTY_SELECTED_BOUNDARY_LAYER_ID);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.debug(
      "Property boundary layer removal failed",
      { error: errorMessage },
      "propertyBoundaryService"
    );
  }
};

export const showPropertyBoundaryLayer = async (
  features: Feature | Feature[] | null | undefined
): Promise<void> => {
  if (!features) return;

  const featureArray = Array.isArray(features) ? features : [features];

  const validFeatures = featureArray
    .filter(hasValidGeometry)
    .map(toValidPropertyFeature);

  if (validFeatures.length === 0) return;

  await removePropertyBoundaryLayer();

  const geojson = {
    type: "FeatureCollection" as const,
    features: validFeatures.map((feature, index) => {
      const address =
        getProp<string>(feature, FEATURE_PROP.PROPERTY.ADDRESS) ??
        `Selected Property ${index + 1}`;
      return {
        type: "Feature" as const,
        properties: {
          id: `property-selected-boundary-${index}`,
          name: address,
        },
        geometry: feature.geometry,
      };
    }),
  };

  const layerDef: LayerDefinition = {
    id: PROPERTY_SELECTED_BOUNDARY_LAYER_ID,
    type: "line",
    source: {
      type: "geojson",
      data: geojson,
    },
    paint: {
      "line-color": BOUNDARY_COLOURS.selected,
      "line-width": 3,
      "line-opacity": 1,
    },
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
  };

  await addTempLayer(
    PROPERTY_SELECTED_BOUNDARY_LAYER_ID,
    layerDef as unknown as TempLayerDefinition,
    null,
    true,
    1
  );
};
