import type * as GeoJSON from 'geojson';

interface EsriSpatialReference {
  wkid: number;
}

export interface EsriPolygonGeometry {
  rings: number[][][];
  spatialReference: EsriSpatialReference;
}

export function geojsonPolygonToEsri(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
): EsriPolygonGeometry {
  if (geometry.type === 'Polygon') {
    return {
      rings: geometry.coordinates,
      spatialReference: { wkid: 4326 },
    };
  }

  if (geometry.type === 'MultiPolygon') {
    return {
      rings: geometry.coordinates.flat(),
      spatialReference: { wkid: 4326 },
    };
  }

  throw new Error(
    `Unsupported geometry type: ${(geometry as { type: string }).type}. Only Polygon and MultiPolygon are supported.`,
  );
}
