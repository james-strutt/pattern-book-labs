import type * as GeoJSON from "geojson";
import type {
  PropertyFeature,
  PropertyFeatureCollection,
} from "@/types/geometry";
import type {
  PropertyFeatureProperties,
  LotFeatureProperties,
} from "@/types/domain/property";
import { isGeometry, isPolygonOrMultiPolygon } from "./geometry";
import { FEATURE_PROP, getProp } from "@/constants/featureProps";
import type { FeatureWithProperties } from "@/constants/featureProps";

export function isFeature(value: unknown): value is GeoJSON.Feature {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    obj.type === "Feature" &&
    (obj.geometry === null || isGeometry(obj.geometry)) &&
    (obj.properties === null ||
      obj.properties === undefined ||
      typeof obj.properties === "object")
  );
}

export function isFeatureWithGeometry<G extends GeoJSON.Geometry>(
  value: unknown,
  geometryGuard: (g: unknown) => g is G
): value is GeoJSON.Feature<G> {
  return (
    isFeature(value) && value.geometry !== null && geometryGuard(value.geometry)
  );
}

export function isFeatureCollection(
  value: unknown
): value is GeoJSON.FeatureCollection {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return obj.type === "FeatureCollection" && Array.isArray(obj.features);
}

export function validateFeatureCollection(
  value: unknown
): value is GeoJSON.FeatureCollection {
  if (!isFeatureCollection(value)) return false;
  return value.features.every(isFeature);
}

export function isPropertyFeature(value: unknown): value is PropertyFeature {
  if (!isFeature(value)) return false;
  return value.geometry !== null && isPolygonOrMultiPolygon(value.geometry);
}

export function isPropertyFeatureCollection(
  value: unknown
): value is PropertyFeatureCollection {
  if (!isFeatureCollection(value)) return false;
  return value.features.every(isPropertyFeature);
}

export function hasPropertyFeatureProperties(
  properties: unknown
): properties is PropertyFeatureProperties {
  if (!properties || typeof properties !== "object") return false;
  const props = properties as Record<string, unknown>;

  return (
    FEATURE_PROP.PROPERTY.ADDRESS in props ||
    FEATURE_PROP.PROPERTY.AREA in props ||
    FEATURE_PROP.PROPERTY.SITE_NAME in props ||
    FEATURE_PROP.PROPERTY.SITE_ID in props
  );
}

export function hasLotFeatureProperties(
  properties: unknown
): properties is LotFeatureProperties {
  if (!properties || typeof properties !== "object") return false;
  const props = properties as Record<string, unknown>;

  return (
    FEATURE_PROP.LOT.LOT_REFERENCE in props ||
    FEATURE_PROP.LOT.LOT_NUMBER in props ||
    FEATURE_PROP.LOT.PLAN_NUMBER in props ||
    FEATURE_PROP.LOT.CAD_ID in props
  );
}

export function hasNonNullProperties<P extends Record<string, unknown>>(
  feature: GeoJSON.Feature
): feature is GeoJSON.Feature<GeoJSON.Geometry, P> & {
  properties: P;
} {
  return feature.properties !== null && feature.properties !== undefined;
}

export function ensureProperties<P extends Record<string, unknown>>(
  feature: GeoJSON.Feature
): GeoJSON.Feature<GeoJSON.Geometry, P> {
  if (feature.properties === null || feature.properties === undefined) {
    return { ...feature, properties: {} as P };
  }
  return feature as GeoJSON.Feature<GeoJSON.Geometry, P>;
}

export function isFeatureOrCollection(
  value: unknown
): value is GeoJSON.Feature | GeoJSON.FeatureCollection {
  return isFeature(value) || isFeatureCollection(value);
}

export function extractFeatures(value: unknown): GeoJSON.Feature[] {
  if (isFeatureCollection(value)) {
    return value.features;
  }
  if (isFeature(value)) {
    return [value];
  }
  return [];
}

export function getFirstFeature(value: unknown): GeoJSON.Feature | null {
  if (isFeature(value)) return value;
  if (isFeatureCollection(value) && value.features.length > 0) {
    return value.features[0] ?? null;
  }
  return null;
}

export function featureHasProperty<K extends string>(
  feature: GeoJSON.Feature,
  key: K
): feature is GeoJSON.Feature & {
  properties: Record<K, unknown>;
} {
  return (
    feature.properties !== null &&
    feature.properties !== undefined &&
    key in feature.properties
  );
}

export function getFeatureProperty<T>(
  feature: GeoJSON.Feature,
  key: string,
  defaultValue: T
): T {
  const featureWithProps = feature as FeatureWithProperties;
  const value = getProp<T>(featureWithProps, key, defaultValue);
  if (value === null || value === undefined) return defaultValue;
  return value;
}

export function getStringProperty(
  feature: GeoJSON.Feature,
  key: string,
  defaultValue = ""
): string {
  const value = getFeatureProperty(feature, key, defaultValue);
  return typeof value === "string" ? value : String(value);
}

export function getNumberProperty(
  feature: GeoJSON.Feature,
  key: string,
  defaultValue = 0
): number {
  const value = getFeatureProperty(feature, key, defaultValue);
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

export function getBooleanProperty(
  feature: GeoJSON.Feature,
  key: string,
  defaultValue = false
): boolean {
  const value = getFeatureProperty<unknown>(feature, key, defaultValue);
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value.toLowerCase() === "true" || value === "1";
  }
  if (typeof value === "number") return value !== 0;
  return defaultValue;
}

export function assertFeature(
  value: unknown,
  context?: string
): asserts value is GeoJSON.Feature {
  if (!isFeature(value)) {
    const contextPart = context ? ` in ${context}` : "";
    throw new TypeError(
      `Expected GeoJSON Feature${contextPart}, got ${typeof value}`
    );
  }
}

export function assertFeatureCollection(
  value: unknown,
  context?: string
): asserts value is GeoJSON.FeatureCollection {
  if (!isFeatureCollection(value)) {
    const contextPart = context ? ` in ${context}` : "";
    throw new TypeError(
      `Expected GeoJSON FeatureCollection${contextPart}, got ${typeof value}`
    );
  }
}

export function assertPropertyFeature(
  value: unknown,
  context?: string
): asserts value is PropertyFeature {
  if (!isPropertyFeature(value)) {
    const contextPart = context ? ` in ${context}` : "";
    const geometryType = isFeature(value)
      ? value.geometry?.type ?? "null"
      : null;
    const typeDescription = geometryType
      ? `Feature with ${geometryType} geometry`
      : typeof value;
    throw new TypeError(
      `Expected PropertyFeature${contextPart}, got ${typeDescription}`
    );
  }
}
