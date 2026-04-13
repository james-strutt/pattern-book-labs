import type {
  PatternBookSchema,
  SiteEligibilityData,
  VariantMatch,
  PatternEligibilityResult,
} from "@/apps/patternBook/types/patternBook";
import type {
  ShortlistPatternAnalysisResult,
  PropertyPatternAnalysis,
  PatternPropertyAnalysis,
  EligibilityMatrix,
  EligibilityCell,
  PropertySummary,
  AnalysisProgress,
  PropertyFeature,
} from "@/apps/patternBook/types/shortlistAnalysis";
import { evaluateAllPatterns } from "@/apps/patternBook/utils/patternBookEligibility";
import { getAllProps, FEATURE_PROP } from "@/constants/featureProps";
import { queryAddressCountForGeometry } from "@/utils/geometry";
import * as turf from "@turf/turf";
import logger from "@/lib/logger";
import { BATCH_ANALYSIS_SERVICE_NAME } from "@/apps/patternBook/services/batchAnalysisConstants";
import { fetchBulkSpatialData } from "@/apps/patternBook/services/batchAnalysisBulkSpatial";
import type { BulkSpatialData } from "@/apps/patternBook/services/batchAnalysisBulkSpatial";
import { extractSiteDataFromFeature, getPropertyAddress } from "@/apps/patternBook/services/batchAnalysisSiteParsers";
import {
  calculateAnefFromNoiseFeatures,
  calculateCrossfallFromContours,
} from "@/apps/patternBook/services/batchAnalysisSpatialMetrics";
import { calculateSummary } from "@/apps/patternBook/services/batchAnalysisSummary";

export interface BatchAnalysisOptions {
  onProgress?: (progress: AnalysisProgress) => void;
  abortSignal?: AbortSignal;
}

function findBestVariant(eligiblePatterns: PatternEligibilityResult[]): {
  bestVariant: VariantMatch | null;
  maxDwellings: number;
  maxGfa: number;
} {
  let bestVariant: VariantMatch | null = null;
  let maxDwellings = 0;
  let maxGfa = 0;

  for (const result of eligiblePatterns) {
    for (const variant of result.matchingVariants) {
      if (variant.dwellingYield.total > maxDwellings) {
        maxDwellings = variant.dwellingYield.total;
        bestVariant = variant;
      }
      if (variant.gfa > maxGfa) {
        maxGfa = variant.gfa;
      }
    }
  }

  return { bestVariant, maxDwellings, maxGfa };
}

function buildEligibilityMatrixRow(
  results: PatternEligibilityResult[],
  featureId: string,
  address: string,
  siteArea: number,
  patternResults: Record<string, PatternPropertyAnalysis>,
): Record<string, EligibilityCell> {
  const propertyMatrixRow: Record<string, EligibilityCell> = {};

  for (const result of results) {
    const cell: EligibilityCell = {
      isEligible: result.isEligible,
      variantCount: result.matchingVariants.length,
      bestGfa: result.matchingVariants[0]?.gfa ?? null,
      bestDwellings: result.matchingVariants[0]?.dwellingYield?.total ?? null,
      ineligibleReasons: result.ineligibleReasons,
    };
    propertyMatrixRow[result.patternId] = cell;

    const patternAnalysis = patternResults[result.patternId];
    if (patternAnalysis) {
      const firstVariant = result.matchingVariants[0] ?? null;
      const propertySummary: PropertySummary = {
        featureId,
        address,
        siteArea,
        bestVariant: firstVariant,
        maxDwellings: firstVariant?.dwellingYield.total ?? 0,
      };

      if (result.isEligible) {
        patternAnalysis.eligibleProperties.push(propertySummary);
        patternAnalysis.totalPotentialDwellings += propertySummary.maxDwellings;
      } else {
        patternAnalysis.ineligibleProperties.push(propertySummary);
      }
    }
  }

  return propertyMatrixRow;
}

async function processProperty(
  feature: PropertyFeature,
  patterns: PatternBookSchema[],
  bulkData: BulkSpatialData,
  patternResults: Record<string, PatternPropertyAnalysis>,
): Promise<{
  propertyAnalysis: PropertyPatternAnalysis;
  matrixRow: Record<string, EligibilityCell>;
} | null> {
  const siteData = extractSiteDataFromFeature(feature);
  if (!siteData) {
    logger.warn("Could not extract site data", { featureId: feature.id }, BATCH_ANALYSIS_SERVICE_NAME);
    return null;
  }

  logger.debug(
    "Site eligibility data extracted",
    {
      featureId: feature.id,
      siteArea: siteData.siteArea,
      siteWidth: siteData.siteWidth,
      siteLength: siteData.siteLength,
      zoneCode: siteData.zoneCode,
      isInLMRArea: siteData.isInLMRArea,
      lmrCatchmentDistance: siteData.lmrCatchmentDistance,
      isInTODArea: siteData.isInTODArea,
      isBushfireProne: siteData.isBushfireProne,
      isFloodProne: siteData.isFloodProne,
      hasContamination: siteData.hasContamination,
      hasHeritageSignificance: siteData.hasHeritageSignificance,
      siteFsr: siteData.siteFsr,
      siteHob: siteData.siteHob,
    },
    BATCH_ANALYSIS_SERVICE_NAME,
  );

  siteData.crossfallMetres = calculateCrossfallFromContours(siteData.geometry, bulkData.contours);
  siteData.anefValue = calculateAnefFromNoiseFeatures(siteData.geometry, bulkData.aircraftNoise);

  const results = evaluateAllPatterns(patterns, siteData as SiteEligibilityData);

  const eligiblePatterns = results.filter((r) => r.isEligible);
  const ineligiblePatterns = results.filter((r) => !r.isEligible);

  const { bestVariant, maxDwellings, maxGfa } = findBestVariant(eligiblePatterns);

  const currentDwellings = await queryAddressCountForGeometry(siteData.geometry);
  const dwellingUplift = maxDwellings > 0 ? Math.max(0, maxDwellings - currentDwellings) : 0;

  const address = getPropertyAddress(feature);
  const propertyMatrixRow = buildEligibilityMatrixRow(results, feature.id, address, siteData.siteArea, patternResults);

  const propertyAnalysis: PropertyPatternAnalysis = {
    featureId: feature.id,
    address,
    siteArea: siteData.siteArea,
    siteWidth: siteData.siteWidth,
    siteLength: siteData.siteLength,
    zoneCode: siteData.zoneCode,
    eligiblePatterns,
    ineligiblePatterns,
    bestVariant,
    currentDwellings,
    maxDwellings,
    dwellingUplift,
    maxGfa,
  };

  return { propertyAnalysis, matrixRow: propertyMatrixRow };
}

function initialisePatternResults(patterns: PatternBookSchema[]): Record<string, PatternPropertyAnalysis> {
  const patternResults: Record<string, PatternPropertyAnalysis> = {};
  for (const pattern of patterns) {
    patternResults[pattern.metadata.id] = {
      patternId: pattern.metadata.id,
      patternName: pattern.metadata.name,
      architect: pattern.metadata.architect,
      eligibleProperties: [],
      ineligibleProperties: [],
      coveragePercentage: 0,
      totalPotentialDwellings: 0,
    };
  }
  return patternResults;
}

function calculatePatternCoverage(patternResults: Record<string, PatternPropertyAnalysis>): void {
  for (const patternAnalysis of Object.values(patternResults)) {
    const totalProperties = patternAnalysis.eligibleProperties.length + patternAnalysis.ineligibleProperties.length;
    patternAnalysis.coveragePercentage =
      totalProperties > 0 ? (patternAnalysis.eligibleProperties.length / totalProperties) * 100 : 0;
  }
}

export async function runBatchAnalysis(
  features: PropertyFeature[],
  patterns: PatternBookSchema[],
  options: BatchAnalysisOptions = {},
): Promise<ShortlistPatternAnalysisResult> {
  const { onProgress, abortSignal } = options;
  const analysisId = `analysis-${Date.now()}`;
  const timestamp = new Date();

  logger.info(
    "Starting batch analysis",
    {
      propertyCount: features.length,
      patternCount: patterns.length,
    },
    BATCH_ANALYSIS_SERVICE_NAME,
  );

  const featureCollection = turf.featureCollection(features);
  const bbox = turf.bbox(featureCollection);
  const bboxPolygon = turf.bboxPolygon(bbox).geometry;

  logger.info("Fetching bulk spatial data for bbox", { bbox }, BATCH_ANALYSIS_SERVICE_NAME);

  const bulkData = await fetchBulkSpatialData(bboxPolygon, onProgress, abortSignal);

  const propertyResults: Record<string, PropertyPatternAnalysis> = {};
  const patternResults = initialisePatternResults(patterns);
  const eligibilityMatrix: EligibilityMatrix = {
    propertyIds: [],
    patternIds: patterns.map((p) => p.metadata.id),
    data: {},
  };

  for (let i = 0; i < features.length; i++) {
    if (abortSignal?.aborted) {
      throw new Error("Analysis aborted");
    }

    const feature = features[i];
    if (!feature) continue;

    const address = getPropertyAddress(feature);

    if (onProgress) {
      onProgress({
        current: i + 1,
        total: features.length,
        currentPropertyAddress: address,
        phase: "analysing",
      });
    }

    const processed = await processProperty(feature, patterns, bulkData, patternResults);

    if (!processed) continue;

    propertyResults[feature.id] = processed.propertyAnalysis;
    eligibilityMatrix.propertyIds.push(feature.id);
    eligibilityMatrix.data[feature.id] = processed.matrixRow;
  }

  calculatePatternCoverage(patternResults);

  const summary = calculateSummary(propertyResults, patternResults, features.length, patterns.length);

  if (onProgress) {
    onProgress({
      current: features.length,
      total: features.length,
      currentPropertyAddress: "",
      phase: "complete",
    });
  }

  const isLotBased = features.every((feature) => {
    const props = getAllProps(feature);
    const lotCount = props[FEATURE_PROP.PROPERTY.VALNET_LOT_COUNT];
    return lotCount === undefined || lotCount === null;
  });

  logger.info(
    "Batch analysis complete",
    {
      eligibleProperties: summary.eligiblePropertyCount,
      ineligibleProperties: summary.ineligiblePropertyCount,
      totalDwellings: summary.totalPotentialDwellings,
      isLotBased,
    },
    BATCH_ANALYSIS_SERVICE_NAME,
  );

  return {
    analysisId,
    timestamp,
    propertyCount: features.length,
    patternCount: patterns.length,
    summary,
    propertyResults,
    patternResults,
    eligibilityMatrix,
    isLotBased,
  };
}
