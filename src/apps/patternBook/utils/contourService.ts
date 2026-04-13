import * as turf from '@turf/turf';
import type * as GeoJSON from 'geojson';
import logger from '@/lib/logger';
import { proxyRequest } from '@/utils/services/proxyService';
import { getBufferedBBox } from '@/utils/geometry';
import { isPolygonOrMultiPolygon } from '@/utils/typeGuards';

const UTILITY_NAME = 'PatternBookContourService';

const CONTOUR_URL =
  'https://spatial.industry.nsw.gov.au/arcgis/rest/services/PUBLIC/Contours/MapServer/0/query';

interface ArcGISGeometry {
  paths?: number[][][];
  rings?: number[][][];
  coordinates?: GeoJSON.LineString['coordinates'] | GeoJSON.MultiLineString['coordinates'];
  type?: string;
}

interface ArcGISContourFeature {
  attributes?: {
    elevation?: number | string | null;
  };
  geometry: ArcGISGeometry;
}

interface ArcGISContourResponse {
  features?: ArcGISContourFeature[];
}

interface ContourFeature {
  elevation: number;
  geometry: GeoJSON.LineString | GeoJSON.MultiLineString | ArcGISGeometry;
}

export interface CrossfallResult {
  crossfallMetres: number | null;
  minElevation: number | null;
  maxElevation: number | null;
  contourCount: number;
  error: string | null;
}

function toGeoJsonLine(
  geometry: ArcGISGeometry | GeoJSON.LineString | GeoJSON.MultiLineString
): GeoJSON.Feature<GeoJSON.LineString | GeoJSON.MultiLineString> | null {
  if ('paths' in geometry && geometry.paths && geometry.paths.length > 0) {
    if (geometry.paths.length === 1) {
      const coordinates = geometry.paths[0];
      if (!coordinates) {
        return null;
      }
      return {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates },
        properties: {}
      };
    } else {
      return {
        type: 'Feature',
        geometry: { type: 'MultiLineString', coordinates: geometry.paths },
        properties: {}
      };
    }
  }
  if ('coordinates' in geometry && Array.isArray(geometry.coordinates)) {
    return {
      type: 'Feature',
      geometry: geometry as GeoJSON.LineString | GeoJSON.MultiLineString,
      properties: {}
    };
  }
  return null;
}

function toGeoJsonPolygon(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon | ArcGISGeometry
): GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null {
  if ('type' in geometry && isPolygonOrMultiPolygon(geometry as GeoJSON.Geometry)) {
    return {
      type: 'Feature',
      geometry: geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon,
      properties: {}
    };
  }
  if ('rings' in geometry && geometry.rings) {
    return {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: geometry.rings },
      properties: {}
    };
  }
  return null;
}

function bboxesOverlap(bbox1: number[], bbox2: number[]): boolean {
  if (
    bbox1.length < 4 ||
    bbox2.length < 4 ||
    bbox1[0] === undefined ||
    bbox1[1] === undefined ||
    bbox1[2] === undefined ||
    bbox1[3] === undefined ||
    bbox2[0] === undefined ||
    bbox2[1] === undefined ||
    bbox2[2] === undefined ||
    bbox2[3] === undefined
  ) {
    return false;
  }
  return (
    bbox1[0] <= bbox2[2] &&
    bbox1[2] >= bbox2[0] &&
    bbox1[1] <= bbox2[3] &&
    bbox1[3] >= bbox2[1]
  );
}

export async function fetchCrossfallForGeometry(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
): Promise<CrossfallResult> {
  try {
    const bounds = getBufferedBBox(geometry);
    if (!bounds) {
      return {
        crossfallMetres: null,
        minElevation: null,
        maxElevation: null,
        contourCount: 0,
        error: 'Invalid geometry bounds'
      };
    }

    const params = new URLSearchParams({
      where: '1=1',
      geometry: bounds,
      geometryType: 'esriGeometryEnvelope',
      inSR: '4326',
      outSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: '*',
      returnGeometry: 'true',
      f: 'json'
    });

    const data = (await proxyRequest(
      `${CONTOUR_URL}?${params.toString()}`
    )) as ArcGISContourResponse;

    if (!data.features?.length) {
      return {
        crossfallMetres: 0,
        minElevation: null,
        maxElevation: null,
        contourCount: 0,
        error: null
      };
    }

    const processedContours: ContourFeature[] = data.features
      .map((feature): ContourFeature | null => {
        const elevation = feature.attributes?.elevation;
        if (
          elevation !== null &&
          elevation !== undefined &&
          !Number.isNaN(Number(elevation))
        ) {
          return {
            elevation: Number.parseFloat(String(elevation)),
            geometry: feature.geometry
          };
        }
        return null;
      })
      .filter((contour): contour is ContourFeature => contour !== null);

    if (processedContours.length === 0) {
      return {
        crossfallMetres: 0,
        minElevation: null,
        maxElevation: null,
        contourCount: 0,
        error: null
      };
    }

    const propertyGeoJSON = toGeoJsonPolygon(geometry);
    if (!propertyGeoJSON) {
      return {
        crossfallMetres: null,
        minElevation: null,
        maxElevation: null,
        contourCount: 0,
        error: 'Failed to convert property geometry'
      };
    }

    const propertyBBox = turf.bbox(propertyGeoJSON);

    const intersectingContours = processedContours.filter((contour) => {
      try {
        const contourGeoJSON = toGeoJsonLine(contour.geometry);
        if (!contourGeoJSON) {
          return false;
        }

        const contourBBox = turf.bbox(contourGeoJSON);
        if (!bboxesOverlap(contourBBox, propertyBBox)) {
          return false;
        }

        return turf.booleanIntersects(contourGeoJSON, propertyGeoJSON);
      } catch {
        return false;
      }
    });

    if (intersectingContours.length <= 1) {
      return {
        crossfallMetres: 0,
        minElevation: intersectingContours[0]?.elevation ?? null,
        maxElevation: intersectingContours[0]?.elevation ?? null,
        contourCount: intersectingContours.length,
        error: null
      };
    }

    const elevations = intersectingContours
      .map((c) => c.elevation)
      .filter((e): e is number => e !== null && !Number.isNaN(e) && Number.isFinite(e))
      .sort((a, b) => a - b);

    if (elevations.length < 2) {
      return {
        crossfallMetres: 0,
        minElevation: elevations[0] ?? null,
        maxElevation: elevations[0] ?? null,
        contourCount: intersectingContours.length,
        error: null
      };
    }

    const minElevation = elevations[0] ?? 0;
    const maxElevation = elevations[elevations.length - 1] ?? 0;
    let crossfallMetres = maxElevation - minElevation;

    if (crossfallMetres > 20 && elevations.length > 4) {
      const p10Index = Math.floor(elevations.length * 0.1);
      const p90Index = Math.floor(elevations.length * 0.9);
      const filteredMin = elevations[p10Index] ?? minElevation;
      const filteredMax = elevations[p90Index] ?? maxElevation;
      crossfallMetres = filteredMax - filteredMin;
    }

    logger.debug('Crossfall calculated', {
      contourCount: intersectingContours.length,
      minElevation,
      maxElevation,
      crossfallMetres
    }, UTILITY_NAME);

    return {
      crossfallMetres,
      minElevation,
      maxElevation,
      contourCount: intersectingContours.length,
      error: null
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to fetch contour data', { error: errorMessage }, UTILITY_NAME);
    return {
      crossfallMetres: null,
      minElevation: null,
      maxElevation: null,
      contourCount: 0,
      error: `Failed to fetch contour data: ${errorMessage}`
    };
  }
}
