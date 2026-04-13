import type * as GeoJSON from "geojson";
import { queryArcGISLayerByGeometry } from "@/services/arcgisService/utils";
import { proxyRequest } from "@/utils/services/proxyService";
import { getProp, type FeatureWithProperties } from "@/constants/featureProps";
import * as turf from "@turf/turf";
import logger from "@/lib/logger";
import { BATCH_ANALYSIS_SERVICE_NAME } from "@/apps/patternBook/services/batchAnalysisConstants";
import type { AnalysisProgress } from "@/apps/patternBook/types/shortlistAnalysis";

import {
  CONTOUR_URL,
  AIRCRAFT_NOISE_RANDWICK_ENDPOINT,
  AIRCRAFT_NOISE_NSW_ENDPOINT,
} from "@/apps/patternBook/constants/endpoints";

export interface ContourFeature {
  elevation: number;
  geometry: GeoJSON.Feature;
}

export interface AircraftNoiseFeature {
  anefValue: number;
  geometry: GeoJSON.Feature;
  source: "randwick" | "nsw";
}

export interface BulkSpatialData {
  contours: ContourFeature[];
  aircraftNoise: AircraftNoiseFeature[];
}

function parseAnefCodeRange(anefCode: string): number | null {
  if (!anefCode || typeof anefCode !== "string") return null;
  const cleaned = anefCode.trim();
  if (cleaned.includes("-")) {
    const parts = cleaned.split("-").map((p) => p.trim());
    const numbers = parts.map((p) => Number.parseInt(p, 10)).filter((n) => !Number.isNaN(n));
    if (numbers.length > 0) return Math.max(...numbers);
  }
  const singleNumber = Number.parseInt(cleaned, 10);
  return Number.isNaN(singleNumber) ? null : singleNumber;
}

interface ArcGISContourFeatureInput {
  attributes?: { elevation?: number | string | null };
  geometry: { paths?: number[][][] };
}

function contourFromEsriFeature(feature: ArcGISContourFeatureInput): ContourFeature | null {
  const elevation = feature.attributes?.elevation;
  if (elevation === null || elevation === undefined || Number.isNaN(Number(elevation))) {
    return null;
  }
  const paths = feature.geometry?.paths;
  if (!paths?.length) {
    return null;
  }
  const geojsonGeometry: GeoJSON.LineString | GeoJSON.MultiLineString =
    paths.length === 1
      ? {
          type: "LineString",
          coordinates: paths[0] as GeoJSON.Position[],
        }
      : {
          type: "MultiLineString",
          coordinates: paths as GeoJSON.Position[][],
        };

  return {
    elevation: Number.parseFloat(String(elevation)),
    geometry: turf.feature(geojsonGeometry),
  };
}

export async function fetchBulkContours(
  bboxPolygon: GeoJSON.Polygon,
  abortSignal?: AbortSignal,
): Promise<ContourFeature[]> {
  try {
    const bbox = turf.bbox(bboxPolygon);
    const bboxString = `${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]}`;

    const params = new URLSearchParams({
      where: "1=1",
      geometry: bboxString,
      geometryType: "esriGeometryEnvelope",
      inSR: "4326",
      outSR: "4326",
      spatialRel: "esriSpatialRelIntersects",
      outFields: "*",
      returnGeometry: "true",
      f: "json",
    });

    interface ArcGISContourResponse {
      features?: ArcGISContourFeatureInput[];
    }

    const data = await proxyRequest<ArcGISContourResponse>(`${CONTOUR_URL}?${params.toString()}`, {
      signal: abortSignal,
    });

    if (!data || typeof data === "string" || !data.features?.length) {
      return [];
    }

    const contours: ContourFeature[] = [];
    for (const feature of data.features) {
      const mapped = contourFromEsriFeature(feature);
      if (mapped) {
        contours.push(mapped);
      }
    }

    logger.info("Bulk contours fetched", { count: contours.length }, BATCH_ANALYSIS_SERVICE_NAME);
    return contours;
  } catch (error: unknown) {
    if (abortSignal?.aborted) {
      throw error;
    }
    logger.warn("Failed to fetch bulk contours", { error }, BATCH_ANALYSIS_SERVICE_NAME);
    return [];
  }
}

function pushRandwickNoiseFeatures(features: GeoJSON.Feature[], noiseFeatures: AircraftNoiseFeature[]): void {
  for (const feature of features) {
    const featureWithProps = feature as unknown as FeatureWithProperties;
    const anef = getProp<number>(featureWithProps, "anef", null);
    if (typeof anef === "number" && !Number.isNaN(anef) && feature.geometry) {
      noiseFeatures.push({
        anefValue: anef,
        geometry: feature,
        source: "randwick",
      });
    }
  }
}

function pushNswNoiseFeatures(features: GeoJSON.Feature[], noiseFeatures: AircraftNoiseFeature[]): void {
  for (const feature of features) {
    const featureWithProps = feature as unknown as FeatureWithProperties;
    const anefCode = getProp<string>(featureWithProps, "ANEF_CODE", null);
    if (typeof anefCode !== "string" || !feature.geometry) {
      continue;
    }
    const parsedValue = parseAnefCodeRange(anefCode);
    if (parsedValue === null) {
      continue;
    }
    noiseFeatures.push({
      anefValue: parsedValue,
      geometry: feature,
      source: "nsw",
    });
  }
}

async function loadRandwickAircraftNoiseLayer(
  bboxPolygon: GeoJSON.Polygon,
  abortSignal: AbortSignal | undefined,
  noiseFeatures: AircraftNoiseFeature[],
): Promise<void> {
  try {
    const randwickFeatures = await queryArcGISLayerByGeometry(AIRCRAFT_NOISE_RANDWICK_ENDPOINT, bboxPolygon, {
      signal: abortSignal,
    });
    pushRandwickNoiseFeatures(randwickFeatures, noiseFeatures);
  } catch (error: unknown) {
    if (abortSignal?.aborted) {
      throw error;
    }
    logger.debug("Randwick bulk aircraft noise query failed", { error }, BATCH_ANALYSIS_SERVICE_NAME);
  }
}

async function loadNswAircraftNoiseLayer(
  bboxPolygon: GeoJSON.Polygon,
  abortSignal: AbortSignal | undefined,
  noiseFeatures: AircraftNoiseFeature[],
): Promise<void> {
  try {
    const nswFeatures = await queryArcGISLayerByGeometry(AIRCRAFT_NOISE_NSW_ENDPOINT, bboxPolygon, {
      signal: abortSignal,
    });
    pushNswNoiseFeatures(nswFeatures, noiseFeatures);
  } catch (error: unknown) {
    if (abortSignal?.aborted) {
      throw error;
    }
    logger.debug("NSW bulk aircraft noise query failed", { error }, BATCH_ANALYSIS_SERVICE_NAME);
  }
}

export async function fetchBulkAircraftNoise(
  bboxPolygon: GeoJSON.Polygon,
  abortSignal?: AbortSignal,
): Promise<AircraftNoiseFeature[]> {
  const noiseFeatures: AircraftNoiseFeature[] = [];
  await loadRandwickAircraftNoiseLayer(bboxPolygon, abortSignal, noiseFeatures);
  await loadNswAircraftNoiseLayer(bboxPolygon, abortSignal, noiseFeatures);
  logger.info("Bulk aircraft noise fetched", { count: noiseFeatures.length }, BATCH_ANALYSIS_SERVICE_NAME);
  return noiseFeatures;
}

export async function fetchBulkSpatialData(
  bboxPolygon: GeoJSON.Polygon,
  onProgress?: (progress: AnalysisProgress) => void,
  abortSignal?: AbortSignal,
): Promise<BulkSpatialData> {
  let bulkData: BulkSpatialData = { contours: [], aircraftNoise: [] };

  if (onProgress) {
    onProgress({
      current: 0,
      total: 0,
      currentPropertyAddress: "Fetching elevation contours...",
      phase: "loading",
      loadingStep: "contours",
      loadingProgress: 0,
    });
  }

  try {
    const contours = await fetchBulkContours(bboxPolygon, abortSignal);

    if (abortSignal?.aborted) {
      throw new Error("Analysis aborted");
    }

    if (onProgress) {
      onProgress({
        current: 0,
        total: 0,
        currentPropertyAddress: "Fetching aircraft noise data...",
        phase: "loading",
        loadingStep: "aircraft_noise",
        loadingProgress: 50,
      });
    }

    const aircraftNoise = await fetchBulkAircraftNoise(bboxPolygon, abortSignal);

    if (abortSignal?.aborted) {
      throw new Error("Analysis aborted");
    }

    bulkData = { contours, aircraftNoise };

    if (onProgress) {
      onProgress({
        current: 0,
        total: 0,
        currentPropertyAddress: "Processing spatial data...",
        phase: "loading",
        loadingStep: "processing",
        loadingProgress: 100,
      });
    }

    logger.info(
      "Bulk spatial data fetched",
      {
        contourCount: contours.length,
        aircraftNoiseCount: aircraftNoise.length,
      },
      BATCH_ANALYSIS_SERVICE_NAME,
    );
  } catch (err: unknown) {
    if (abortSignal?.aborted) {
      throw err;
    }
    logger.warn("Failed to fetch bulk spatial data", { error: err }, BATCH_ANALYSIS_SERVICE_NAME);
  }

  return bulkData;
}
