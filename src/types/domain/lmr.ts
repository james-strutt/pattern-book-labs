/**
 * Shared LMR (Low & Mid-Rise Housing) type definitions.
 *
 * Used across suitability, feasibility, patternBook, assess, haystack,
 * powerpoint and compare apps for consistent LMR status
 * resolution from both feature properties and MapServer image verification.
 */

export type LmrCatchmentDistance = 400 | 800 | null;

export type LmrSource = "featureProp" | "mapServer";

export interface CatchmentEntry {
  value: string;
  display_value: string;
  coverage_percentage: number;
  coverage_squaremetres: number;
}

export interface LmrCatchmentResult {
  isInCatchment: boolean;
  catchmentDistance: LmrCatchmentDistance;
}

export interface LmrCatchmentCoverage {
  catchment400m?: {
    coverage: number;
    area: number;
  };
  catchment800m?: {
    coverage: number;
    area: number;
  };
}

export interface LmrPixelAnalysis {
  orangeInProperty: number;
  totalPropertyPixels: number;
  coveragePercent: number;
  orangeOutsideProperty: number;
}

export interface LmrVerificationResult {
  isInLmrArea: boolean;
  source: LmrSource;
  coveragePercent: number;
  pixelAnalysis?: LmrPixelAnalysis;
  confidence: "confirmed" | "unavailable";
}

export interface LmrStatus {
  featurePropResult: LmrCatchmentResult;
  mapServerResult: LmrVerificationResult | null;
  resolved: {
    isInLmr: boolean;
    catchmentDistance: LmrCatchmentDistance;
    source: LmrSource;
    coveragePercent: number;
  };
}
