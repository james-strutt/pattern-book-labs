import type { PatternEligibilityResult, VariantMatch } from "./patternBook";
import type { Polygon, MultiPolygon } from "geojson";
import type { FeatureWithProperties } from "@/constants/featureProps";

export type SelectionMode = "single" | "shortlist";

export type ResultsViewMode =
  | "summary"
  | "by-pattern"
  | "by-property"
  | "matrix";

export interface PropertyFeature extends FeatureWithProperties {
  id: string;
  geometry: Polygon | MultiPolygon;
}

export interface AnalysisProgress {
  current: number;
  total: number;
  currentPropertyAddress: string;
  phase: "loading" | "analysing" | "complete" | "error";
  loadingStep?: "contours" | "aircraft_noise" | "processing";
  loadingProgress?: number;
}

export interface PatternRanking {
  patternId: string;
  patternName: string;
  architect: string;
  eligiblePropertyCount: number;
  totalPotentialDwellings: number;
  totalPotentialGfa: number;
}

export interface ReasonCount {
  reason: string;
  count: number;
  percentage: number;
}

export interface ZoneDwellingStats {
  zone: string;
  currentDwellings: number;
  potentialDwellings: number;
  uplift: number;
  propertyCount: number;
}

export interface ShortlistSummary {
  eligiblePropertyCount: number;
  ineligiblePropertyCount: number;
  partiallyEligibleCount: number;
  totalCurrentDwellings: number;
  totalPotentialDwellings: number;
  totalDwellingUplift: number;
  totalPotentialGfa: number;
  dwellingsByZone: ZoneDwellingStats[];
  topPatterns: PatternRanking[];
  commonIneligibilityReasons: ReasonCount[];
}

export interface PropertyPatternAnalysis {
  featureId: string;
  address: string;
  siteArea: number;
  siteWidth: number | null;
  siteLength: number | null;
  zoneCode: string | null;
  eligiblePatterns: PatternEligibilityResult[];
  ineligiblePatterns: PatternEligibilityResult[];
  bestVariant: VariantMatch | null;
  currentDwellings: number;
  maxDwellings: number;
  dwellingUplift: number;
  maxGfa: number;
}

export interface PropertySummary {
  featureId: string;
  address: string;
  siteArea: number;
  bestVariant: VariantMatch | null;
  maxDwellings: number;
}

export interface PatternPropertyAnalysis {
  patternId: string;
  patternName: string;
  architect: string;
  eligibleProperties: PropertySummary[];
  ineligibleProperties: PropertySummary[];
  coveragePercentage: number;
  totalPotentialDwellings: number;
}

export interface EligibilityCell {
  isEligible: boolean;
  variantCount: number;
  bestGfa: number | null;
  bestDwellings: number | null;
  ineligibleReasons: string[];
}

export interface EligibilityMatrix {
  propertyIds: string[];
  patternIds: string[];
  data: Record<string, Record<string, EligibilityCell>>;
}

export interface ShortlistPatternAnalysisResult {
  analysisId: string;
  timestamp: Date;
  propertyCount: number;
  patternCount: number;
  summary: ShortlistSummary;
  propertyResults: Record<string, PropertyPatternAnalysis>;
  patternResults: Record<string, PatternPropertyAnalysis>;
  eligibilityMatrix: EligibilityMatrix;
  /** True if features are lot-based (no dwelling data available) */
  isLotBased: boolean;
}

export interface PatternBookMapFeatureProperties {
  featureId: string;
  address: string;
  eligiblePatternCount: number;
  totalPatternCount: number;
  isFullyEligible: boolean;
  isPartiallyEligible: boolean;
  maxDwellings: number;
  maxGfa: number;
  bestPattern: string | null;
  eligibilityCategory: "eligible" | "partial" | "ineligible";
  isSelected: number;
  isHovered: number;
}

export type SortField = "address" | "area" | "eligibleCount" | "maxDwellings";
export type SortDirection = "asc" | "desc";

export interface ShortlistSortConfig {
  field: SortField;
  direction: SortDirection;
}

export interface ShortlistFilterConfig {
  minEligiblePatterns: number;
  showOnlyEligible: boolean;
  patternFilter: string | null;
}
