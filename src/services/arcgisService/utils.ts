import logger from "@/lib/logger";
import type {
  ArcGISQueryResponse,
  ArcGISErrorResponse,
  ArcGISGeometryType,
  ArcGISSpatialRelationship,
  ArcGISFeature,
} from "@/types/api/arcgis";
import { getBoundingBox } from "@/utils/geometry/boundingBox";
import { proxyRequest } from "@/utils/services/proxyService";
import type * as GeoJSON from "geojson";
import type { BoundingBoxResult } from "@/types/utils/geometry";
import { convertPathsToLineString, convertEsriFeatureToGeoJSON } from "./geometry";

export type PropidInput = number | string | null | undefined;

export const sanitiseNumericPropid = (propid: PropidInput): number | null => {
  const numericPropid = Number.parseInt(String(propid), 10);
  if (!Number.isSafeInteger(numericPropid) || numericPropid < 0) {
    return null;
  }
  return numericPropid;
};

const ALLOWED_ARCGIS_PARAMS = new Set([
  "outSR",
  "outSpatialReference",
  "geometryPrecision",
  "maxRecordCount",
  "resultOffset",
  "returnDistinctValues",
  "returnIdsOnly",
  "returnCountOnly",
  "returnExtentOnly",
  "returnZ",
  "returnM",
  "returnTrueCurves",
  "returnExceededLimitFeatures",
  "returnCentroid",
  "sqlFormat",
  "gdbVersion",
  "datumTransformation",
  "quantizationParameters",
  "multipatchOption",
  "resultType",
  "historicMoment",
]);

const EXCLUDED_SPATIAL_PARAMS = new Set(["where", "outFields", "spatialRel", "returnDistinctValues", "returnGeometry"]);

const EXCLUDED_WHERE_PARAMS = new Set(["outFields", "returnGeometry", "orderByFields", "resultRecordCount"]);

const EXCLUDED_SPATIAL_WITH_GEOMETRY_PARAMS = new Set([
  "where",
  "geometry",
  "geometryType",
  "outFields",
  "spatialRel",
  "returnGeometry",
  "inSR",
  "outSR",
]);

const ENDPOINT_LOG_SNIPPET_CHARS = 20;

function encodeOptionalArcGISQueryParamValue(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }
  return null;
}

export const isExpectedArcGISError = (error: unknown): boolean => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return (
    errorMessage.includes("Proxy request failed") ||
    errorMessage.includes("400") ||
    errorMessage.includes("Bad Request") ||
    errorMessage.includes("404") ||
    errorMessage.includes("403") ||
    errorMessage.includes("Output format not supported")
  );
};

export function isValidBoundingBox(bbox: BoundingBoxResult | null): boolean {
  if (!bbox) return false;
  return !(bbox.minX === 0 && bbox.minY === 0 && bbox.maxX === 0 && bbox.maxY === 0);
}

function handleArcGISError<T>(error: unknown, endpoint: string, fallback: T): T {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const expected = isExpectedArcGISError(error);
  const logFn = expected ? logger.debug : logger.warn;
  const logMessage = expected ? "ArcGIS endpoint query failed (expected)" : "Error querying ArcGIS endpoint";
  logFn(logMessage, { endpoint, error: errorMessage });
  return fallback;
}

export {
  hasInvalidCoordinates,
  convertRingsToPolygon as convertPolygonGeometry,
  convertPointsToMultiPoint as convertMultiPointGeometry,
  convertPointGeometry,
  convertEsriFeatureToGeoJSON,
} from "./geometry";

export const convertLineStringGeometry = (path: number[][]): GeoJSON.LineString | null => {
  const result = convertPathsToLineString([path]);
  if (result?.type === "LineString") {
    return result;
  }
  return null;
};

export const convertMultiLineStringGeometry = (paths: number[][][]): GeoJSON.MultiLineString | null => {
  if (!paths || paths.length === 0) {
    return null;
  }
  const validPaths = paths.filter(
    (path) =>
      Array.isArray(path) &&
      path.length >= 2 &&
      path.every(
        (coord) =>
          Array.isArray(coord) &&
          coord.length >= 2 &&
          typeof coord[0] === "number" &&
          typeof coord[1] === "number" &&
          Number.isFinite(coord[0]) &&
          Number.isFinite(coord[1]),
      ),
  );
  if (validPaths.length === 0) {
    return null;
  }
  return {
    type: "MultiLineString",
    coordinates: validPaths,
  };
};

export interface ArcGISLayerQueryOptions {
  token?: string | null;
  signal?: AbortSignal;
}

function hasArcGISError<T extends { error?: unknown }>(data: unknown): data is T & { error: unknown } {
  return data !== null && typeof data === "object" && "error" in data && !!data.error;
}

function hasValidFeatures<T extends { features?: unknown[] }>(data: unknown): data is T & { features: unknown[] } {
  return data !== null && typeof data === "object" && "features" in data && Array.isArray(data.features);
}

function getShortEndpoint(endpoint: string): string {
  const lastSlash = endpoint.lastIndexOf("/");
  return endpoint.substring(lastSlash - ENDPOINT_LOG_SNIPPET_CHARS);
}

function coerceArcGISQueryResponse(data: unknown, endpoint: string): ArcGISQueryResponse | null {
  if (data && typeof data === "object" && "error" in data && data.error) {
    logger.warn(`ArcGIS Server error from ${endpoint}`, {
      error: (data as { error: unknown }).error,
      endpoint,
    });
    return null;
  }
  if (
    !data ||
    typeof data !== "object" ||
    !("features" in data) ||
    !Array.isArray((data as { features?: unknown }).features)
  ) {
    return null;
  }
  return data as ArcGISQueryResponse;
}

function buildQueryParams(bboxString: string, outputFormat: string, token?: string | null): URLSearchParams {
  const params = new URLSearchParams({
    where: "1=1",
    geometry: bboxString,
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "*",
    returnGeometry: "true",
    outSR: "4326",
    f: outputFormat,
  });

  if (token) {
    params.set("token", token);
  }

  return params;
}

async function handleFeatureServerResponse(
  queryUrl: string,
  endpoint: string,
  signal?: AbortSignal,
): Promise<GeoJSON.Feature[]> {
  const data = await proxyRequest<{
    error?: unknown;
    type?: string;
    features?: GeoJSON.Feature[];
  }>(queryUrl, { signal });

  if (hasArcGISError(data)) {
    logger.warn(`ArcGIS Server error from ${endpoint}`, {
      error: data.error,
      endpoint,
    });
    return [];
  }

  if (!hasValidFeatures(data)) {
    logger.debug("queryArcGISLayerByGeometry: no features in response", {
      endpoint: getShortEndpoint(endpoint),
      hasData: !!data,
      dataType: typeof data,
    });
    return [];
  }

  logger.debug("queryArcGISLayerByGeometry: GeoJSON features returned", {
    endpoint: getShortEndpoint(endpoint),
    featureCount: data.features.length,
  });

  return data.features.filter(
    (feature): feature is GeoJSON.Feature =>
      feature !== null &&
      feature !== undefined &&
      typeof feature === "object" &&
      "geometry" in feature &&
      feature.geometry !== null,
  );
}

async function handleMapServerResponse(
  queryUrl: string,
  endpoint: string,
  signal?: AbortSignal,
): Promise<GeoJSON.Feature[]> {
  const data = await proxyRequest<{
    error?: unknown;
    features?: ArcGISFeature[];
  }>(queryUrl, { signal });

  if (hasArcGISError(data)) {
    logger.warn(`ArcGIS Server error from ${endpoint}`, {
      error: data.error,
      endpoint,
    });
    return [];
  }

  if (!hasValidFeatures(data)) {
    logger.debug("queryArcGISLayerByGeometry: no features in response", {
      endpoint: getShortEndpoint(endpoint),
      hasData: !!data,
      dataType: typeof data,
    });
    return [];
  }

  logger.debug("queryArcGISLayerByGeometry: raw ESRI features returned", {
    endpoint: getShortEndpoint(endpoint),
    featureCount: data.features.length,
  });

  const geoJSONFeatures: GeoJSON.Feature[] = (data.features as ArcGISFeature[])
    .map(convertEsriFeatureToGeoJSON)
    .filter((feature: GeoJSON.Feature | null): feature is GeoJSON.Feature => feature !== null);

  logger.debug("queryArcGISLayerByGeometry: converted to GeoJSON", {
    endpoint: getShortEndpoint(endpoint),
    convertedCount: geoJSONFeatures.length,
    failedConversions: data.features.length - geoJSONFeatures.length,
  });

  return geoJSONFeatures;
}

export const queryArcGISLayerByGeometry = async (
  endpoint: string,
  geometry: GeoJSON.Geometry | null | undefined,
  options: ArcGISLayerQueryOptions = {},
): Promise<GeoJSON.Feature[]> => {
  if (!geometry) {
    logger.debug("queryArcGISLayerByGeometry: no geometry provided", {
      endpoint,
    });
    return [];
  }

  try {
    const geometryBbox = getBoundingBox(geometry);

    if (!isValidBoundingBox(geometryBbox)) {
      logger.error("Failed to calculate bounds for geometry", {
        geometry,
        geometryBbox,
      });
      return [];
    }

    const bboxString = `${geometryBbox.minX},${geometryBbox.minY},${geometryBbox.maxX},${geometryBbox.maxY}`;

    const isFeatureServer = endpoint.includes("FeatureServer");
    const outputFormat = isFeatureServer ? "geojson" : "json";

    logger.debug("queryArcGISLayerByGeometry: querying with bbox", {
      endpoint: getShortEndpoint(endpoint),
      bboxString,
      hasToken: !!options.token,
      outputFormat,
    });

    const params = buildQueryParams(bboxString, outputFormat, options.token);
    const normalizedEndpoint = endpoint.replace(/\/query\/?$/, "");
    const queryUrl = `${normalizedEndpoint}/query?${params.toString()}`;

    if (isFeatureServer) {
      return handleFeatureServerResponse(queryUrl, endpoint, options.signal);
    }

    return handleMapServerResponse(queryUrl, endpoint, options.signal);
  } catch (error) {
    return handleArcGISError(error, endpoint, []);
  }
};

export const querySpatial = async (
  endpoint: string,
  geometry: GeoJSON.Geometry,
  options: {
    where?: string;
    outFields?: string | string[];
    spatialRel?: string;
    returnDistinctValues?: boolean;
    returnGeometry?: boolean;
    [key: string]: unknown;
  } = {},
): Promise<ArcGISQueryResponse | null> => {
  try {
    const geometryBbox = getBoundingBox(geometry);

    if (!isValidBoundingBox(geometryBbox)) {
      logger.error("Failed to calculate bounds for geometry", { geometry });
      return null;
    }

    const bboxString = `${geometryBbox.minX},${geometryBbox.minY},${geometryBbox.maxX},${geometryBbox.maxY}`;

    const params = new URLSearchParams({
      where: options.where ?? "1=1",
      geometry: bboxString,
      geometryType: "esriGeometryEnvelope",
      inSR: "4326",
      spatialRel: options.spatialRel ?? "esriSpatialRelIntersects",
      outFields: Array.isArray(options.outFields) ? options.outFields.join(",") : (options.outFields ?? "*"),
      returnGeometry: String(options.returnGeometry !== false),
      f: "json",
    });

    if (options.returnDistinctValues) {
      params.set("returnDistinctValues", "true");
    }

    Object.keys(options).forEach((key) => {
      if (!EXCLUDED_SPATIAL_PARAMS.has(key) && ALLOWED_ARCGIS_PARAMS.has(key)) {
        const value = options[key];
        if (value !== undefined && value !== null) {
          const encoded = encodeOptionalArcGISQueryParamValue(value);
          if (encoded !== null) {
            params.set(key, encoded);
          }
        }
      }
    });

    const normalizedEndpoint = endpoint.replace(/\/query\/?$/, "");
    const queryUrl = `${normalizedEndpoint}/query?${params.toString()}`;

    const data = await proxyRequest<ArcGISQueryResponse | ArcGISErrorResponse>(queryUrl);

    return coerceArcGISQueryResponse(data, endpoint);
  } catch (error) {
    return handleArcGISError(error, endpoint, null);
  }
};

export const queryWhere = async (
  endpoint: string,
  where: string,
  options: {
    outFields?: string | string[];
    returnGeometry?: boolean;
    orderByFields?: string;
    resultRecordCount?: number;
    [key: string]: unknown;
  } = {},
): Promise<ArcGISQueryResponse | null> => {
  try {
    const params = new URLSearchParams({
      where,
      outFields: Array.isArray(options.outFields) ? options.outFields.join(",") : (options.outFields ?? "*"),
      returnGeometry: String(options.returnGeometry !== false),
      f: "json",
    });

    if (options.orderByFields) {
      params.set("orderByFields", options.orderByFields);
    }

    if (options.resultRecordCount) {
      params.set("resultRecordCount", String(options.resultRecordCount));
    }

    Object.keys(options).forEach((key) => {
      if (!EXCLUDED_WHERE_PARAMS.has(key) && ALLOWED_ARCGIS_PARAMS.has(key)) {
        const value = options[key];
        if (value !== undefined && value !== null) {
          const encoded = encodeOptionalArcGISQueryParamValue(value);
          if (encoded !== null) {
            params.set(key, encoded);
          }
        }
      }
    });

    const normalizedEndpoint = endpoint.replace(/\/query\/?$/, "");
    const queryUrl = `${normalizedEndpoint}/query?${params.toString()}`;

    const data = await proxyRequest<ArcGISQueryResponse | ArcGISErrorResponse>(queryUrl);

    return coerceArcGISQueryResponse(data, endpoint);
  } catch (error) {
    return handleArcGISError(error, endpoint, null);
  }
};

export const querySpatialWithGeometry = async (
  endpoint: string,
  geometry: string,
  geometryType: ArcGISGeometryType,
  options: {
    where?: string;
    outFields?: string | string[];
    spatialRel?: ArcGISSpatialRelationship;
    returnGeometry?: boolean;
    inSR?: string;
    outSR?: string;
    [key: string]: unknown;
  } = {},
): Promise<ArcGISQueryResponse | null> => {
  try {
    const params: Record<string, string> = {
      where: options.where ?? "1=1",
      geometry,
      geometryType,
      spatialRel: options.spatialRel ?? "esriSpatialRelIntersects",
      outFields: Array.isArray(options.outFields) ? options.outFields.join(",") : (options.outFields ?? "*"),
      inSR: options.inSR ?? "4326",
      outSR: options.outSR ?? "4326",
      returnGeometry: String(options.returnGeometry !== false),
      f: "json",
    };

    Object.keys(options).forEach((key) => {
      if (!EXCLUDED_SPATIAL_WITH_GEOMETRY_PARAMS.has(key) && ALLOWED_ARCGIS_PARAMS.has(key)) {
        const value = options[key];
        if (value !== undefined && value !== null) {
          const encoded = encodeOptionalArcGISQueryParamValue(value);
          if (encoded !== null) {
            params[key] = encoded;
          }
        }
      }
    });

    const normalizedEndpoint = endpoint.replace(/\/query\/?$/, "");
    const queryUrl = `${normalizedEndpoint}/query`;

    const data = await proxyRequest<ArcGISQueryResponse | ArcGISErrorResponse>(queryUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(params).toString(),
    });

    return coerceArcGISQueryResponse(data, endpoint);
  } catch (error) {
    return handleArcGISError(error, endpoint, null);
  }
};
