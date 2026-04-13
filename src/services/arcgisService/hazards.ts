import logger from "@/lib/logger";
import { logError } from "@/services/errorLoggingService";
import type { ArcGISErrorResponse, HeritageQueryResponse } from "@/types/api/arcgis";
import { geojsonPolygonToEsri } from "@/utils/geometry";
import { getNSWPortalToken } from "@/utils/nswPortalTokenManager";
import { proxyRequest } from "@/utils/services/proxyService";
import type * as GeoJSON from "geojson";
import * as turf from "@turf/turf";
import {
  ARCGIS_AIRCRAFT_NOISE_NSW_ENDPOINT,
  ARCGIS_AIRCRAFT_NOISE_RANDWICK_ENDPOINT,
  ARCGIS_BIODIVERSITY_ENDPOINT,
  ARCGIS_BUSHFIRE_ENDPOINT,
  ARCGIS_CONTAMINATION_ENDPOINT,
  ARCGIS_FLOOD_ENDPOINT,
  ARCGIS_HERITAGE_ENDPOINT,
} from "./constants";
import { queryArcGISLayerByGeometry } from "./utils";

function filterIntersectingFeatures(
  features: GeoJSON.Feature[],
  propertyGeometry: GeoJSON.Geometry,
): GeoJSON.Feature[] {
  if (features.length === 0) {
    return [];
  }

  try {
    const propertyFeature = turf.feature(propertyGeometry);

    const intersecting = features.filter((feature) => {
      if (!feature.geometry) return false;

      try {
        return turf.booleanIntersects(propertyFeature, feature);
      } catch (intersectError) {
        logger.debug(
          "Failed to check intersection for feature",
          {
            featureType: feature.geometry?.type,
            error: intersectError instanceof Error ? intersectError.message : String(intersectError),
          },
          "hazards",
        );
        return false;
      }
    });

    logger.debug(
      "Filtered hazard features by intersection",
      {
        bboxCount: features.length,
        intersectingCount: intersecting.length,
        propertyGeomType: propertyGeometry.type,
      },
      "hazards",
    );

    return intersecting;
  } catch (error) {
    logger.warn(
      "Failed to filter intersecting features, returning all bbox results",
      { error: error instanceof Error ? error.message : String(error) },
      "hazards",
    );
    return features;
  }
}

export const queryFloodRisk = async (geometry: GeoJSON.Geometry | null | undefined): Promise<GeoJSON.Feature[]> => {
  if (!geometry) {
    logger.debug("queryFloodRisk called with null/undefined geometry", {}, "hazards");
    return [];
  }

  logger.debug("queryFloodRisk starting", { geometryType: geometry.type }, "hazards");

  const token = await getNSWPortalToken(ARCGIS_FLOOD_ENDPOINT);
  logger.debug("queryFloodRisk token status", { hasToken: !!token }, "hazards");

  const bboxFeatures = await queryArcGISLayerByGeometry(ARCGIS_FLOOD_ENDPOINT, geometry, { token });

  logger.debug("queryFloodRisk bbox query returned", { featureCount: bboxFeatures.length }, "hazards");

  return filterIntersectingFeatures(bboxFeatures, geometry);
};

export const queryBushfireRisk = async (geometry: GeoJSON.Geometry | null | undefined): Promise<GeoJSON.Feature[]> => {
  if (!geometry) {
    return [];
  }

  const bboxFeatures = await queryArcGISLayerByGeometry(ARCGIS_BUSHFIRE_ENDPOINT, geometry);
  return filterIntersectingFeatures(bboxFeatures, geometry);
};

export const queryBiodiversityRisk = async (
  geometry: GeoJSON.Geometry | null | undefined,
  signal?: AbortSignal,
): Promise<GeoJSON.Feature[]> => {
  if (!geometry) {
    return [];
  }

  const bboxFeatures = await queryArcGISLayerByGeometry(ARCGIS_BIODIVERSITY_ENDPOINT, geometry, { signal });
  return filterIntersectingFeatures(bboxFeatures, geometry);
};

export const queryContamination = async (
  geometry: GeoJSON.Geometry | null | undefined,
  signal?: AbortSignal,
): Promise<GeoJSON.Feature[]> => {
  if (!geometry) {
    return [];
  }

  const bboxFeatures = await queryArcGISLayerByGeometry(ARCGIS_CONTAMINATION_ENDPOINT, geometry, { signal });
  return filterIntersectingFeatures(bboxFeatures, geometry);
};

export const queryHeritageSignificance = async (
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon | null | undefined,
  suppressToasts = false,
  signal?: AbortSignal,
): Promise<string[]> => {
  if (!geometry || !["Polygon", "MultiPolygon"].includes(geometry.type)) {
    if (!suppressToasts) {
      logError(new Error("Invalid geometry provided for Heritage query"), {
        geometryType: geometry?.type,
      });
    }
    return [];
  }

  let arcgisGeometry;
  try {
    arcgisGeometry = geojsonPolygonToEsri(geometry);
  } catch (error) {
    if (!suppressToasts) {
      logError(new Error("Failed to convert geometry for Heritage query"), {
        error,
        geometryType: geometry.type,
      });
    }
    return [];
  }

  const params = new URLSearchParams({
    geometry: JSON.stringify(arcgisGeometry),
    geometryType: "esriGeometryPolygon",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "SIG,LAY_CLASS,H_NAME,SHR_NUM",
    returnGeometry: "false",
    outSR: "4326",
    f: "json",
  });

  try {
    const queryUrl = `${ARCGIS_HERITAGE_ENDPOINT}?${params.toString()}`;

    const data = await proxyRequest<HeritageQueryResponse | ArcGISErrorResponse>(queryUrl, { signal });

    if (data && typeof data === "object" && "error" in data && data.error) {
      if (!suppressToasts) {
        logError(new Error("ArcGIS Server error fetching heritage significance"), { error: data.error });
      }
      throw new Error(`ArcGIS Server Error: ${data.error.message ?? JSON.stringify(data.error)}`);
    }

    if (data && typeof data === "object" && "features" in data && data.features && data.features.length > 0) {
      const sigValues: string[] = data.features
        .map((feature) => feature.attributes?.SIG)
        .filter((sig): sig is string => sig !== undefined && typeof sig === "string" && sig.trim() !== "");

      return [...new Set(sigValues)];
    }
    return [];
  } catch (error) {
    logger.error("Error querying heritage significance", { error }, "hazards");
    return [];
  }
};

export interface AircraftNoiseResult {
  anefValue: number | null;
  source: "randwick" | "nsw" | null;
}

function parseAnefCodeRange(anefCode: string): number | null {
  if (!anefCode || typeof anefCode !== "string") {
    return null;
  }

  const cleaned = anefCode.trim();

  if (cleaned.includes("-")) {
    const parts = cleaned.split("-").map((p) => p.trim());
    const numbers = parts.map((p) => Number.parseInt(p, 10)).filter((n) => !Number.isNaN(n));
    if (numbers.length > 0) {
      return Math.max(...numbers);
    }
  }

  const singleNumber = Number.parseInt(cleaned, 10);
  if (!Number.isNaN(singleNumber)) {
    return singleNumber;
  }

  return null;
}

async function queryRandwickAircraftNoise(
  geometry: GeoJSON.Geometry,
): Promise<{ anefValue: number | null; source: "randwick" | null }> {
  try {
    const randwickFeatures = await queryArcGISLayerByGeometry(ARCGIS_AIRCRAFT_NOISE_RANDWICK_ENDPOINT, geometry);
    const intersectingRandwick = filterIntersectingFeatures(randwickFeatures, geometry);

    if (intersectingRandwick.length > 0) {
      const anefValues = intersectingRandwick
        .map((f) => f.properties?.anef as number | undefined)
        .filter((v): v is number => typeof v === "number" && !Number.isNaN(v));

      if (anefValues.length > 0) {
        const anefValue = Math.max(...anefValues);
        logger.debug("Aircraft noise from Randwick", { anefValue }, "hazards");
        return { anefValue, source: "randwick" };
      }
    }
  } catch (error) {
    logger.warn(
      "Randwick aircraft noise query failed",
      { error: error instanceof Error ? error.message : String(error) },
      "hazards",
    );
  }

  return { anefValue: null, source: null };
}

async function queryNswAircraftNoise(
  geometry: GeoJSON.Geometry,
): Promise<{ anefValue: number | null; source: "nsw" | null }> {
  try {
    const nswFeatures = await queryArcGISLayerByGeometry(ARCGIS_AIRCRAFT_NOISE_NSW_ENDPOINT, geometry);
    const intersectingNsw = filterIntersectingFeatures(nswFeatures, geometry);

    if (intersectingNsw.length > 0) {
      const anefCodes = intersectingNsw
        .map((f) => f.properties?.ANEF_CODE as string | undefined)
        .filter((v): v is string => typeof v === "string" && v.trim() !== "");

      const parsedValues = anefCodes.map(parseAnefCodeRange).filter((v): v is number => v !== null);

      if (parsedValues.length > 0) {
        const anefValue = Math.max(...parsedValues);
        logger.debug("Aircraft noise from NSW", { maxNswValue: anefValue, parsedValues }, "hazards");
        return { anefValue, source: "nsw" };
      }
    }
  } catch (error) {
    logger.warn(
      "NSW aircraft noise query failed",
      { error: error instanceof Error ? error.message : String(error) },
      "hazards",
    );
  }

  return { anefValue: null, source: null };
}

export const queryAircraftNoise = async (
  geometry: GeoJSON.Geometry | null | undefined,
): Promise<AircraftNoiseResult> => {
  const result: AircraftNoiseResult = {
    anefValue: null,
    source: null,
  };

  if (!geometry) {
    logger.debug("queryAircraftNoise called with null/undefined geometry", {}, "hazards");
    return result;
  }

  logger.debug("queryAircraftNoise starting", { geometryType: geometry.type }, "hazards");

  const [randwickResult, nswResult] = await Promise.all([
    queryRandwickAircraftNoise(geometry),
    queryNswAircraftNoise(geometry),
  ]);

  if (randwickResult.anefValue !== null) {
    result.anefValue = randwickResult.anefValue;
    result.source = randwickResult.source;
  }

  if (nswResult.anefValue !== null && (result.anefValue === null || nswResult.anefValue > result.anefValue)) {
    result.anefValue = nswResult.anefValue;
    result.source = nswResult.source;
  }

  logger.info("Aircraft noise query complete", { result }, "hazards");
  return result;
};
