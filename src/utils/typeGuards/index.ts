// Validation type guard
export function isNonNullObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

// Geometry type guards
export {
  isCoordinate,
  isCoordinateWithElevation,
  isBoundingBox,
  isGeometry,
  isPoint,
  isLineString,
  isPolygon,
  isMultiPoint,
  isMultiLineString,
  isMultiPolygon,
  isGeometryCollection,
  isPolygonOrMultiPolygon,
  isPolygonRing,
  extractGeometry,
  extractPolygon,
  ensureMultiPolygon,
  assertGeometry,
  assertPolygonOrMultiPolygon,
} from './geometry';

// Feature type guards
export {
  isFeature,
  isFeatureWithGeometry,
  isFeatureCollection,
  validateFeatureCollection,
  isPropertyFeature,
  isPropertyFeatureCollection,
  hasPropertyFeatureProperties,
  hasLotFeatureProperties,
  hasNonNullProperties,
  ensureProperties,
  isFeatureOrCollection,
  extractFeatures,
  getFirstFeature,
  featureHasProperty,
  getFeatureProperty,
  getStringProperty,
  getNumberProperty,
  getBooleanProperty,
  assertFeature,
  assertFeatureCollection,
  assertPropertyFeature,
} from './features';
