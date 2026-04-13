import type { BoundingBoxResult } from "@/types/utils/geometry";
import * as turf from "@turf/turf";
import type * as GeoJSON from "geojson";

const hasCoordinates = (
  geometry: GeoJSON.Geometry,
): geometry is Exclude<GeoJSON.Geometry, GeoJSON.GeometryCollection> => {
  return geometry.type !== "GeometryCollection";
};

export const getBoundingBox = (
  geometry: GeoJSON.Geometry | null | undefined,
): BoundingBoxResult => {
  try {
    if (!geometry || !hasCoordinates(geometry)) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    const bbox = turf.bbox({ type: "Feature", geometry, properties: {} });

    return { minX: bbox[0], minY: bbox[1], maxX: bbox[2], maxY: bbox[3] };
  } catch {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
};

interface MutableBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function stretchBoundsWithCoord(bounds: MutableBounds, coord: number[]): void {
  const x = coord[0];
  const y = coord[1];
  if (x === undefined || y === undefined) return;
  if (x < bounds.minX) bounds.minX = x;
  if (x > bounds.maxX) bounds.maxX = x;
  if (y < bounds.minY) bounds.minY = y;
  if (y > bounds.maxY) bounds.maxY = y;
}

function computeRawBounds(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon | GeoJSON.Point,
): MutableBounds | null {
  const bounds: MutableBounds = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  };

  if (geometry.type === "Point") {
    const [x, y] = geometry.coordinates;
    if (x === undefined || y === undefined) return null;
    return { minX: x, minY: y, maxX: x, maxY: y };
  }

  const outerRings =
    geometry.type === "Polygon"
      ? [geometry.coordinates[0]]
      : geometry.coordinates.map((p) => p[0]);

  for (const ring of outerRings) {
    if (!ring) return null;
    for (const coord of ring) {
      stretchBoundsWithCoord(bounds, coord);
    }
  }

  if (bounds.minX === Infinity) return null;
  return bounds;
}

export function getBufferedBBox(
  featureOrGeometry: GeoJSON.Feature | GeoJSON.Geometry | null | undefined,
  buffer: number = 0.001,
): string | null {
  const geometry =
    featureOrGeometry && "geometry" in featureOrGeometry
      ? featureOrGeometry.geometry
      : featureOrGeometry;

  if (!geometry?.type) return null;

  if (
    geometry.type !== "Polygon" &&
    geometry.type !== "MultiPolygon" &&
    geometry.type !== "Point"
  ) {
    return null;
  }

  const bounds = computeRawBounds(geometry);
  if (!bounds) return null;

  return `${bounds.minX - buffer},${bounds.minY - buffer},${bounds.maxX + buffer},${bounds.maxY + buffer}`;
}
