import * as turf from "@turf/turf";
import type * as GeoJSON from "geojson";
import type {
  SiteType,
  SiteTypeDiagnostics,
  SiteTypeWidthAnalysisDiagnostics,
} from "@/apps/patternBook/types/patternBook";
import logger from "@/lib/logger";

const UTILITY_NAME = "SiteTypeClassifier";

const BATTLE_AXE_HANDLE_MAX_WIDTH = 8;
const BATTLE_AXE_WIDTH_RATIO_THRESHOLD = 0.4;
const BATTLE_AXE_MAX_AREA = 5000; // Battle axe lots are typically small residential lots (< 5000m²)
const GRID_SAMPLE_COUNT = 8;
const BATTLE_AXE_BODY_WIDTH_MIN = 10; // Avoid classifying uniformly narrow lots as battle-axe
const BATTLE_AXE_NARROW_SAMPLE_MIN = 4; // Require persistence (avoid single-notch false positives)
const BATTLE_AXE_NARROW_FRACTION_MIN = 0.05; // Handle occupies meaningful but limited portion of samples
const BATTLE_AXE_NARROW_FRACTION_MAX = 0.4;
const BATTLE_AXE_CANDIDATE_P10_MAX = 10; // If p10 is wider than this, skip expensive refinement pass

interface BoundingBoxDimensions {
  width: number;
  length: number;
  aspectRatio: number;
}

interface WidthAnalysis {
  minWidth: number;
  maxWidth: number;
  avgWidth: number;
  widthRatio: number;
  sampleWidths: number[];
  p10Width: number;
  p60Width: number;
  narrowCount: number;
  narrowFraction: number;
}

function calculateBoundingBoxDimensions(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
): BoundingBoxDimensions {
  const feature = turf.feature(geometry);
  const bbox = turf.bbox(feature);

  const westPoint = turf.point([bbox[0], (bbox[1] + bbox[3]) / 2]);
  const eastPoint = turf.point([bbox[2], (bbox[1] + bbox[3]) / 2]);
  const bboxWidth = turf.distance(westPoint, eastPoint, { units: "meters" });

  const southPoint = turf.point([(bbox[0] + bbox[2]) / 2, bbox[1]]);
  const northPoint = turf.point([(bbox[0] + bbox[2]) / 2, bbox[3]]);
  const bboxLength = turf.distance(southPoint, northPoint, { units: "meters" });

  const width = Math.min(bboxWidth, bboxLength);
  const length = Math.max(bboxWidth, bboxLength);
  const aspectRatio = length > 0 ? width / length : 1;

  return { width, length, aspectRatio };
}

function calculateMaxDistanceBetweenPoints(
  intersectionPoints: number[][]
): number {
  let maxDist = 0;
  for (let i = 0; i < intersectionPoints.length; i++) {
    for (let j = i + 1; j < intersectionPoints.length; j++) {
      const p1 = intersectionPoints[i];
      const p2 = intersectionPoints[j];
      if (p1 && p2) {
        const dist = turf.distance(turf.point(p1), turf.point(p2), {
          units: "meters",
        });
        if (dist > maxDist) maxDist = dist;
      }
    }
  }
  return maxDist;
}

function measureWidthAtPoint(
  polygon: GeoJSON.Feature<GeoJSON.Polygon>,
  point: GeoJSON.Feature<GeoJSON.Point>,
  bearing: number
): number | null {
  try {
    const lineLength = 0.5;
    const perpBearing1 = (bearing + 90) % 360;
    const perpBearing2 = (bearing + 270) % 360;

    const endPoint1 = turf.destination(point, lineLength, perpBearing1, {
      units: "kilometers",
    });
    const endPoint2 = turf.destination(point, lineLength, perpBearing2, {
      units: "kilometers",
    });

    const transectLine = turf.lineString([
      endPoint1.geometry.coordinates,
      endPoint2.geometry.coordinates,
    ]);

    const clipped = turf.lineIntersect(transectLine, polygon);

    if (clipped.features.length >= 2) {
      const intersectionPoints = clipped.features.map(
        (f) => f.geometry.coordinates
      );
      const maxDist = calculateMaxDistanceBetweenPoints(intersectionPoints);
      return maxDist > 0 ? maxDist : null;
    }

    return null;
  } catch {
    logger.debug("Failed to measure width at point", {}, UTILITY_NAME);
    return null;
  }
}

function normalizePolygon(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
): GeoJSON.Feature<GeoJSON.Polygon> {
  if (geometry.type === "MultiPolygon") {
    if (geometry.coordinates.length === 0) {
      throw new Error("MultiPolygon has no coordinates");
    }
    const firstCoord = geometry.coordinates[0];
    if (!firstCoord) {
      throw new Error("MultiPolygon has no coordinates");
    }
    const largest = geometry.coordinates.reduce((max, current) => {
      const maxArea = turf.area(turf.polygon(max));
      const currentArea = turf.area(turf.polygon(current));
      return currentArea > maxArea ? current : max;
    }, firstCoord);
    return turf.polygon(largest);
  }
  if (!geometry.coordinates) {
    throw new Error("Polygon has no coordinates");
  }
  return turf.polygon(geometry.coordinates);
}

function processSamplePoint(
  polygon: GeoJSON.Feature<GeoJSON.Polygon>,
  samplePoint: GeoJSON.Feature<GeoJSON.Point>,
  bearings: number[]
): number[] {
  const widths: number[] = [];

  for (const bearing of bearings) {
    const measured = measureWidthAtPoint(polygon, samplePoint, bearing);
    if (measured !== null && measured > 0.5) {
      widths.push(measured);
    }
  }

  return widths;
}

function collectWidthSamples(
  polygon: GeoJSON.Feature<GeoJSON.Polygon>,
  bbox: [number, number, number, number],
  bearings: number[]
): number[] {
  const allWidths: number[] = [];

  // Create a grid of sample points across the entire bounding box
  // This ensures we catch narrow handles regardless of their position
  for (let i = 0; i <= GRID_SAMPLE_COUNT; i++) {
    for (let j = 0; j <= GRID_SAMPLE_COUNT; j++) {
      const x = bbox[0] + (i / GRID_SAMPLE_COUNT) * (bbox[2] - bbox[0]);
      const y = bbox[1] + (j / GRID_SAMPLE_COUNT) * (bbox[3] - bbox[1]);
      const samplePoint = turf.point([x, y]);

      if (turf.booleanPointInPolygon(samplePoint, polygon)) {
        const widths = processSamplePoint(polygon, samplePoint, bearings);
        allWidths.push(...widths);
      }
    }
  }

  return allWidths;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const clamped = Math.min(1, Math.max(0, p));
  const idx = (sorted.length - 1) * clamped;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const loVal = sorted[lo] ?? 0;
  const hiVal = sorted[hi] ?? loVal;
  const t = idx - lo;
  return loVal + (hiVal - loVal) * t;
}

function calculateWidthMetrics(allWidths: number[]): WidthAnalysis {
  const minWidth = Math.min(...allWidths);
  const maxWidth = Math.max(...allWidths);

  // Calculate average excluding the narrowest 25% of samples (potential handle)
  // to get a better representation of the main lot body width
  const sortedWidths = [...allWidths].sort((a, b) => a - b);
  const bodyWidths = sortedWidths.slice(Math.floor(sortedWidths.length * 0.25));
  const avgBodyWidth =
    bodyWidths.length > 0
      ? bodyWidths.reduce((a, b) => a + b, 0) / bodyWidths.length
      : maxWidth;

  const p10Width = percentile(sortedWidths, 0.1);
  const p60Width = percentile(sortedWidths, 0.6);

  const widthRatio = avgBodyWidth > 0 ? minWidth / avgBodyWidth : 1;

  const narrowCount = sortedWidths.filter(
    (w) => w < BATTLE_AXE_HANDLE_MAX_WIDTH
  ).length;
  const narrowFraction =
    sortedWidths.length > 0 ? narrowCount / sortedWidths.length : 0;

  return {
    minWidth,
    maxWidth,
    avgWidth: avgBodyWidth,
    widthRatio,
    sampleWidths: allWidths,
    p10Width,
    p60Width,
    narrowCount,
    narrowFraction,
  };
}

function analyseWidthVariation(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
): WidthAnalysis | null {
  try {
    const polygon = normalizePolygon(geometry);
    const bbox = turf.bbox(polygon);
    const bbox2D: [number, number, number, number] = [
      bbox[0],
      bbox[1],
      bbox[2],
      bbox[3],
    ];
    const primaryBearings = [0, 90];
    const allWidths = collectWidthSamples(polygon, bbox2D, primaryBearings);

    if (allWidths.length < 3) {
      return null;
    }

    const primaryMetrics = calculateWidthMetrics(allWidths);
    const isCandidate =
      primaryMetrics.p10Width > 0 &&
      primaryMetrics.p10Width < BATTLE_AXE_CANDIDATE_P10_MAX &&
      primaryMetrics.widthRatio < BATTLE_AXE_WIDTH_RATIO_THRESHOLD + 0.2;

    if (!isCandidate) {
      return primaryMetrics;
    }

    // Refinement pass (diagonal bearings) only for candidates, to reduce
    // false positives on rotated lots without making shortlist mode too slow.
    const refineBearings = [45, 135];
    const refinedWidths = collectWidthSamples(polygon, bbox2D, refineBearings);
    if (refinedWidths.length === 0) {
      return primaryMetrics;
    }

    return calculateWidthMetrics([...allWidths, ...refinedWidths]);
  } catch {
    logger.debug("Failed to analyse width variation", {}, UTILITY_NAME);
    return null;
  }
}

function isBattleAxe(widthAnalysis: WidthAnalysis): boolean {
  const hasPersistentNarrowSection =
    widthAnalysis.narrowCount >= BATTLE_AXE_NARROW_SAMPLE_MIN &&
    widthAnalysis.narrowFraction >= BATTLE_AXE_NARROW_FRACTION_MIN &&
    widthAnalysis.narrowFraction <= BATTLE_AXE_NARROW_FRACTION_MAX;

  const hasHandleLikeConstriction =
    widthAnalysis.p10Width < BATTLE_AXE_HANDLE_MAX_WIDTH &&
    widthAnalysis.p60Width >= BATTLE_AXE_BODY_WIDTH_MIN &&
    widthAnalysis.p10Width / widthAnalysis.p60Width <
      BATTLE_AXE_WIDTH_RATIO_THRESHOLD;

  return hasPersistentNarrowSection && hasHandleLikeConstriction;
}

function toDiagnostics(
  siteArea: number,
  widthAnalysis: WidthAnalysis | null,
  isBattleAxeResult: boolean,
  skippedBecauseLarge: boolean
): SiteTypeDiagnostics {
  const handleBodyRatio =
    widthAnalysis && widthAnalysis.p60Width > 0
      ? widthAnalysis.p10Width / widthAnalysis.p60Width
      : null;

  const widthDiagnostics: SiteTypeWidthAnalysisDiagnostics | null =
    widthAnalysis
      ? {
          minWidth: widthAnalysis.minWidth,
          maxWidth: widthAnalysis.maxWidth,
          avgWidth: widthAnalysis.avgWidth,
          widthRatio: widthAnalysis.widthRatio,
          p10Width: widthAnalysis.p10Width,
          p60Width: widthAnalysis.p60Width,
          narrowCount: widthAnalysis.narrowCount,
          narrowFraction: widthAnalysis.narrowFraction,
          handleBodyRatio,
        }
      : null;

  return {
    siteArea,
    skippedBecauseLarge,
    isBattleAxe: isBattleAxeResult,
    widthAnalysis: widthDiagnostics,
    thresholds: {
      handleMaxWidthMetres: BATTLE_AXE_HANDLE_MAX_WIDTH,
      bodyMinWidthMetres: BATTLE_AXE_BODY_WIDTH_MIN,
      handleBodyRatioThreshold: BATTLE_AXE_WIDTH_RATIO_THRESHOLD,
      narrowSampleMin: BATTLE_AXE_NARROW_SAMPLE_MIN,
      narrowFractionMin: BATTLE_AXE_NARROW_FRACTION_MIN,
      narrowFractionMax: BATTLE_AXE_NARROW_FRACTION_MAX,
    },
  };
}

export function classifySiteTypeWithDiagnostics(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
): { siteType: SiteType; diagnostics: SiteTypeDiagnostics } {
  try {
    const siteArea = turf.area(turf.feature(geometry));

    if (siteArea > BATTLE_AXE_MAX_AREA) {
      return {
        siteType: "mid_block",
        diagnostics: toDiagnostics(siteArea, null, false, true),
      };
    }

    const widthAnalysis = analyseWidthVariation(geometry);
    const isBattleAxeResult = widthAnalysis
      ? isBattleAxe(widthAnalysis)
      : false;
    const siteType: SiteType = isBattleAxeResult ? "battle_axe" : "mid_block";

    if (isBattleAxeResult && widthAnalysis) {
      logger.debug(
        "Classified battle-axe site",
        {
          minWidth: widthAnalysis.minWidth,
          p10Width: widthAnalysis.p10Width,
          p60Width: widthAnalysis.p60Width,
          narrowCount: widthAnalysis.narrowCount,
          narrowFraction: widthAnalysis.narrowFraction,
        },
        UTILITY_NAME
      );
    }

    return {
      siteType,
      diagnostics: toDiagnostics(
        siteArea,
        widthAnalysis,
        isBattleAxeResult,
        false
      ),
    };
  } catch (error) {
    logger.debug(
      "Error classifying site type, defaulting to mid_block",
      {
        error: error instanceof Error ? error.message : "Unknown",
      },
      UTILITY_NAME
    );

    const siteArea = ((): number => {
      try {
        return turf.area(turf.feature(geometry));
      } catch {
        return 0;
      }
    })();

    return {
      siteType: "mid_block",
      diagnostics: toDiagnostics(siteArea, null, false, false),
    };
  }
}

export function classifySiteType(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
): SiteType {
  return classifySiteTypeWithDiagnostics(geometry).siteType;
}

export function estimateSiteLength(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
  siteWidth: number | null,
  siteArea: number
): number | null {
  if (!siteWidth || siteWidth <= 0) {
    return null;
  }

  try {
    const dimensions = calculateBoundingBoxDimensions(geometry);
    const estimatedFromArea = siteArea / siteWidth;
    const estimatedFromBbox = dimensions.length;
    const avgEstimate = (estimatedFromArea + estimatedFromBbox) / 2;

    return Math.round(avgEstimate * 10) / 10;
  } catch (error) {
    logger.debug(
      "Error estimating site length, using area/width",
      {
        error: error instanceof Error ? error.message : "Unknown",
      },
      UTILITY_NAME
    );
    return Math.round((siteArea / siteWidth) * 10) / 10;
  }
}

export function getSiteTypeDisplayName(siteType: SiteType): string {
  const displayNames: Record<SiteType, string> = {
    mid_block: "Mid Block",
    mid_block_laneway: "Mid Block (Laneway)",
    corner: "Corner",
    battle_axe: "Battle Axe",
    unknown: "Unknown",
  };
  return displayNames[siteType] ?? "Unknown";
}
