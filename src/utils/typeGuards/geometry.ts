import type * as GeoJSON from "geojson";
import type { Coordinate, BoundingBox } from "@/types/geometry";

export function isCoordinate(value: unknown): value is Coordinate {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number" &&
    !Number.isNaN(value[0]) &&
    !Number.isNaN(value[1])
  );
}

export function isCoordinateWithElevation(value: unknown): value is [number, number, number] {
  if (!Array.isArray(value) || value.length < 3) return false;
  return (
    typeof value[0] === "number" &&
    typeof value[1] === "number" &&
    typeof value[2] === "number" &&
    !Number.isNaN(value[0]) &&
    !Number.isNaN(value[1]) &&
    !Number.isNaN(value[2])
  );
}

export function isBoundingBox(value: unknown): value is BoundingBox {
  return Array.isArray(value) && value.length === 4 && value.every((v) => typeof v === "number" && !Number.isNaN(v));
}

export function isGeometry(value: unknown): value is GeoJSON.Geometry {
  if (!value || typeof value !== "object") return false;
  const geo = value as Record<string, unknown>;
  return (
    typeof geo.type === "string" &&
    ["Point", "LineString", "Polygon", "MultiPoint", "MultiLineString", "MultiPolygon", "GeometryCollection"].includes(
      geo.type,
    )
  );
}

export function isPoint(value: unknown): value is GeoJSON.Point {
  if (!isGeometry(value) || value.type !== "Point") return false;
  return isCoordinate(value.coordinates);
}

export function isLineString(value: unknown): value is GeoJSON.LineString {
  if (!isGeometry(value) || value.type !== "LineString") return false;
  return Array.isArray(value.coordinates) && value.coordinates.length >= 2 && value.coordinates.every(isCoordinate);
}

export function isPolygonRing(value: unknown): value is Coordinate[] {
  if (!Array.isArray(value) || value.length < 4) return false;
  if (!value.every(isCoordinate)) return false;

  const first = value[0];
  const last = value.at(-1);
  return first[0] === last?.[0] && first[1] === last?.[1];
}

export function isPolygon(value: unknown): value is GeoJSON.Polygon {
  if (!isGeometry(value) || value.type !== "Polygon") return false;
  return Array.isArray(value.coordinates) && value.coordinates.length >= 1 && value.coordinates.every(isPolygonRing);
}

export function isMultiPoint(value: unknown): value is GeoJSON.MultiPoint {
  if (!isGeometry(value) || value.type !== "MultiPoint") return false;
  return Array.isArray(value.coordinates) && value.coordinates.every(isCoordinate);
}

export function isMultiLineString(value: unknown): value is GeoJSON.MultiLineString {
  if (!isGeometry(value) || value.type !== "MultiLineString") return false;
  return (
    Array.isArray(value.coordinates) &&
    value.coordinates.every((line) => Array.isArray(line) && line.length >= 2 && line.every(isCoordinate))
  );
}

export function isMultiPolygon(value: unknown): value is GeoJSON.MultiPolygon {
  if (!isGeometry(value) || value.type !== "MultiPolygon") return false;
  return (
    Array.isArray(value.coordinates) &&
    value.coordinates.every((poly) => Array.isArray(poly) && poly.length >= 1 && poly.every(isPolygonRing))
  );
}

export function isGeometryCollection(value: unknown): value is GeoJSON.GeometryCollection {
  if (!isGeometry(value) || value.type !== "GeometryCollection") return false;
  const collection = value as GeoJSON.GeometryCollection;
  return Array.isArray(collection.geometries) && collection.geometries.every(isGeometry);
}

export function isPolygonOrMultiPolygon(value: unknown): value is GeoJSON.Polygon | GeoJSON.MultiPolygon {
  return isPolygon(value) || isMultiPolygon(value);
}

export function extractGeometry(value: unknown): GeoJSON.Geometry | null {
  if (!value || typeof value !== "object") return null;

  if (isGeometry(value)) return value;

  const obj = value as Record<string, unknown>;
  if (obj.type === "Feature" && isGeometry(obj.geometry)) {
    return obj.geometry;
  }

  return null;
}

export function extractPolygon(value: unknown): GeoJSON.Polygon | null {
  const geometry = extractGeometry(value);
  if (!geometry) return null;

  if (isPolygon(geometry)) return geometry;

  if (isMultiPolygon(geometry) && geometry.coordinates.length > 0) {
    const firstPolygonCoords = geometry.coordinates[0];
    if (firstPolygonCoords) {
      return {
        type: "Polygon",
        coordinates: firstPolygonCoords,
      };
    }
  }

  return null;
}

export function ensureMultiPolygon(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon): GeoJSON.MultiPolygon {
  if (isMultiPolygon(geometry)) return geometry;
  return {
    type: "MultiPolygon",
    coordinates: [geometry.coordinates],
  };
}

export function assertGeometry(value: unknown, context?: string): asserts value is GeoJSON.Geometry {
  if (!isGeometry(value)) {
    const contextStr = context ? ` in ${context}` : "";
    throw new TypeError(`Expected GeoJSON geometry${contextStr}, got ${typeof value}`);
  }
}

export function assertPolygonOrMultiPolygon(
  value: unknown,
  context?: string,
): asserts value is GeoJSON.Polygon | GeoJSON.MultiPolygon {
  if (!isPolygonOrMultiPolygon(value)) {
    const contextStr = context ? ` in ${context}` : "";
    const typeStr = isGeometry(value) ? value.type : typeof value;
    throw new TypeError(`Expected Polygon or MultiPolygon${contextStr}, got ${typeStr}`);
  }
}
