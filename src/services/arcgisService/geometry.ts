import type { ArcGISFeature, ArcGISGeometry } from "@/types/api/arcgis";
import type * as GeoJSON from "geojson";

export const hasInvalidCoordinates = (coords: number[][]): boolean => {
  return coords.some((coord) => coord[0] == null || coord[1] == null);
};

export const convertRingsToPolygon = (
  rings: number[][][]
): GeoJSON.Polygon | null => {
  if (hasInvalidCoordinates(rings.flat())) {
    return null;
  }
  return {
    type: "Polygon",
    coordinates: rings.map((ring) =>
      ring.map((coord) => [coord[0], coord[1]] as [number, number])
    ),
  };
};

export const convertPointsToMultiPoint = (
  points: number[][]
): GeoJSON.MultiPoint | null => {
  if (hasInvalidCoordinates(points)) {
    return null;
  }
  return {
    type: "MultiPoint",
    coordinates: points.map(
      (point) => [point[0], point[1]] as [number, number]
    ),
  };
};

export const convertPathsToLineString = (
  paths: number[][][]
): GeoJSON.LineString | GeoJSON.MultiLineString | null => {
  if (paths.length === 1) {
    const firstPath = paths[0];
    if (!firstPath || hasInvalidCoordinates(firstPath)) {
      return null;
    }
    return {
      type: "LineString",
      coordinates: firstPath.map(
        (coord) => [coord[0], coord[1]] as [number, number]
      ),
    };
  }

  if (hasInvalidCoordinates(paths.flat())) {
    return null;
  }
  return {
    type: "MultiLineString",
    coordinates: paths.map((path) =>
      path.map((coord) => [coord[0], coord[1]] as [number, number])
    ),
  };
};

export const convertPointGeometry = (
  x: number | null | undefined,
  y: number | null | undefined
): GeoJSON.Point | null => {
  if (x == null || y == null) {
    return null;
  }
  return {
    type: "Point",
    coordinates: [x, y],
  };
};

export const convertEsriToGeoJSON = (
  esriGeometry: ArcGISGeometry | null | undefined
): GeoJSON.Geometry | null => {
  if (!esriGeometry) return null;

  if (esriGeometry.rings) {
    return convertRingsToPolygon(esriGeometry.rings);
  }

  if (esriGeometry.points) {
    return convertPointsToMultiPoint(esriGeometry.points);
  }

  if (esriGeometry.paths) {
    return convertPathsToLineString(esriGeometry.paths);
  }

  if (esriGeometry.x != null && esriGeometry.y != null) {
    return convertPointGeometry(esriGeometry.x, esriGeometry.y);
  }

  return null;
};

export const convertEsriFeatureToGeoJSON = (
  esriFeature: ArcGISFeature | null | undefined
): GeoJSON.Feature | null => {
  if (!esriFeature?.geometry) {
    return null;
  }

  const { geometry, attributes } = esriFeature;
  const geoJSONGeometry = convertEsriToGeoJSON(geometry);

  if (!geoJSONGeometry) {
    return null;
  }

  return {
    type: "Feature",
    geometry: geoJSONGeometry,
    properties: attributes ?? {},
  };
};
