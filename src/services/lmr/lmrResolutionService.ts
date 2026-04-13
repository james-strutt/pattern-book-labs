import type * as GeoJSON from "geojson";
import type { FeatureWithProperties } from "@/constants/featureProps";
import { extractLmrFromFeature } from "@/services/lmr/lmrParsingService";
import { checkLmrViaImageExport } from "@/services/lmr/lmrVerificationService";
import logger from "@/lib/logger";
import type { LmrStatus, LmrCatchmentResult } from "@/types/domain/lmr";

const SERVICE_NAME = "LmrResolutionService";

export async function resolveLmrStatus(
  feature: FeatureWithProperties,
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
  options?: { skipMapServer?: boolean },
): Promise<LmrStatus> {
  const featurePropResult = extractLmrFromFeature(feature);

  if (featurePropResult.isInCatchment) {
    return {
      featurePropResult,
      mapServerResult: null,
      resolved: {
        isInLmr: true,
        catchmentDistance: featurePropResult.catchmentDistance,
        source: "featureProp",
        coveragePercent: 100,
      },
    };
  }

  if (options?.skipMapServer) {
    return {
      featurePropResult,
      mapServerResult: null,
      resolved: {
        isInLmr: false,
        catchmentDistance: null,
        source: "featureProp",
        coveragePercent: 0,
      },
    };
  }

  const mapServerResult = await checkLmrViaImageExport(geometry);

  if (mapServerResult.isInLmrArea && mapServerResult.confidence === "confirmed") {
    const px = mapServerResult.pixelAnalysis;
    logger.info(
      "MapServer fallback detected LMR coverage missed by featureProp",
      {
        coveragePercent: mapServerResult.coveragePercent,
        pixelSummary: px
          ? {
              totalPropertyPixels: px.totalPropertyPixels,
              orangeInProperty: px.orangeInProperty,
              orangeOutsideProperty: px.orangeOutsideProperty,
            }
          : undefined,
      },
      SERVICE_NAME,
    );

    return {
      featurePropResult,
      mapServerResult,
      resolved: {
        isInLmr: true,
        catchmentDistance: 800,
        source: "mapServer",
        coveragePercent: mapServerResult.coveragePercent,
      },
    };
  }

  return {
    featurePropResult,
    mapServerResult,
    resolved: {
      isInLmr: false,
      catchmentDistance: null,
      source: mapServerResult.confidence === "confirmed" ? "mapServer" : "featureProp",
      coveragePercent: 0,
    },
  };
}

export function resolveLmrStatusSync(feature: FeatureWithProperties): LmrCatchmentResult {
  return extractLmrFromFeature(feature);
}
