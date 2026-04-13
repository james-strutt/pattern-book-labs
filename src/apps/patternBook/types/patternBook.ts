import type * as GeoJSON from "geojson";
import type { LmrCatchmentDistance } from "@/types/domain/lmr";

export type { LmrCatchmentDistance } from "@/types/domain/lmr";

export type SiteType = "mid_block" | "mid_block_laneway" | "corner" | "battle_axe" | "unknown";

export interface EligibilityCheckResult {
  met: boolean;
  actual: number | string | boolean | null;
  required: number | string | boolean | null;
  reason?: string;
}

export interface SiteTypeWidthAnalysisDiagnostics {
  minWidth: number;
  maxWidth: number;
  avgWidth: number;
  widthRatio: number;
  p10Width: number;
  p60Width: number;
  narrowCount: number;
  narrowFraction: number;
  handleBodyRatio: number | null;
}

export interface SiteTypeDiagnostics {
  siteArea: number;
  skippedBecauseLarge: boolean;
  isBattleAxe: boolean;
  widthAnalysis: SiteTypeWidthAnalysisDiagnostics | null;
  thresholds: {
    handleMaxWidthMetres: number;
    bodyMinWidthMetres: number;
    handleBodyRatioThreshold: number;
    narrowSampleMin: number;
    narrowFractionMin: number;
    narrowFractionMax: number;
  };
}

export interface DwellingYield {
  studio: number;
  oneBed: number;
  twoBed: number;
  threeBed: number;
  fourBed: number;
  total: number;
}

export interface ParkingConfig {
  type: string;
  cars: number;
  accessible?: number;
  bikes: number;
}

export interface VariantMatch {
  variantId: string;
  category: string;
  lotWidth: number;
  lotLength: number;
  siteArea: number;
  sideSetback: number;
  storeys: number;
  gfa: number;
  fsr: number;
  dwellingYield: DwellingYield;
  parking: ParkingConfig;
  fitScore: number;
  isBasePattern?: boolean;
}

export interface PatternEligibilityChecks {
  siteType: EligibilityCheckResult;
  residentialZone: EligibilityCheckResult;
  minArea: EligibilityCheckResult;
  maxArea: EligibilityCheckResult;
  minWidth: EligibilityCheckResult;
  minLength: EligibilityCheckResult;
  bushfire: EligibilityCheckResult;
  flood: EligibilityCheckResult;
  contamination: EligibilityCheckResult;
  heritage: EligibilityCheckResult;
  aircraftNoise: EligibilityCheckResult;
  fsrCompliance: EligibilityCheckResult;
  hobCompliance: EligibilityCheckResult;
  policyArea: EligibilityCheckResult;
  slope: EligibilityCheckResult;
}

export interface PatternEligibilityResult {
  patternId: string;
  patternName: string;
  architect: string;
  isEligible: boolean;
  checks: PatternEligibilityChecks;
  matchingVariants: VariantMatch[];
  ineligibleReasons: string[];
}

export interface ZoneCoverageItem {
  zoneCode: string;
  coveragePercent: number;
}

export interface SiteEligibilityData {
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  siteType: SiteType;
  siteArea: number;
  siteWidth: number | null;
  siteLength: number | null;
  zoneCode: string | null;
  zoneCoverage?: ZoneCoverageItem[];
  isBushfireProne: boolean;
  isFloodProne: boolean;
  hasContamination: boolean;
  hasHeritageSignificance: boolean;
  heritageClass: string | null;
  anefValue: number | null;
  isInLMRArea: boolean;
  lmrCatchmentDistance: LmrCatchmentDistance;
  isInTODArea: boolean;
  crossfallMetres: number | null;
  siteFsr: number | null;
  siteHob: number | null;
}

export interface PatternBookEntry {
  id: string;
  name: string;
  architect: string;
  schemaPath: string;
  imagePath?: string;
  enabled: boolean;
  developmentType: string;
  policyAreas: string[];
}

export interface PatternBookRegistry {
  version: string;
  patterns: PatternBookEntry[];
}

export interface LotDimensionBounds {
  absoluteMinimums: {
    width: number;
    length: number;
    area: number;
  };
  absoluteMaximums?: {
    width: number | null;
    length: number | null;
    area: number | null;
  };
  notes?: string;
}

export interface PolicyAreaLotDimensions {
  lmr?: LotDimensionBounds;
  lmrPlus?: LotDimensionBounds;
  nonLmr?: LotDimensionBounds;
}

export type LotDimensionConstraints = LotDimensionBounds | PolicyAreaLotDimensions;

export function isPolicyAreaLotDimensions(
  lotDimensions: LotDimensionConstraints,
): lotDimensions is PolicyAreaLotDimensions {
  return "lmr" in lotDimensions || "nonLmr" in lotDimensions || "lmrPlus" in lotDimensions;
}

export interface ExcludedLandType {
  type: string;
  description: string;
}

export interface SiteEligibilityConfig {
  siteTypes: {
    allowed: SiteType[];
    excluded: SiteType[];
  };
  lotDimensions: LotDimensionConstraints;
  excludedLand: ExcludedLandType[];
  slopeConstraints?: {
    maxCrossfallMetres: number;
    allowedDirections: string[];
    notes?: string;
  };
  solarOrientation?: {
    allOrientationsSupported: boolean;
    orientationGuidance: Array<{
      frontageDirection: string;
      mirroring: string;
      parkingAccessOptions: string[];
      notes?: string;
    }>;
  };
}

export type HeightConfig =
  | {
      maxMetres: number;
      maxStoreys: number;
      minStoreys?: number;
      exclusionsFromMaxHeight?: string[];
      additionalHeightForExclusions?: number;
      notes?: string;
    }
  | {
      lmr?: {
        maxMetres: number;
        maxStoreys: number;
        minStoreys?: number;
        notes?: string;
      };
      nonLmr?: {
        maxMetres: number;
        maxStoreys: number;
        minStoreys?: number;
        notes?: string;
      };
    };

export function isPolicyAreaHeight(height: HeightConfig): height is {
  lmr?: {
    maxMetres: number;
    maxStoreys: number;
    minStoreys?: number;
    notes?: string;
  };
  nonLmr?: {
    maxMetres: number;
    maxStoreys: number;
    minStoreys?: number;
    notes?: string;
  };
} {
  return "lmr" in height || "nonLmr" in height;
}

export interface DevelopmentStandards {
  height: HeightConfig;
  setbacks: {
    front: {
      primary: {
        min: number;
        notes?: string;
      };
    };
    rear: {
      standard: { min: number };
      parallelStreetOrLaneway?: { min: number };
    };
    side: {
      rules: Array<{
        id: string;
        conditions: {
          lotWidthMin: number;
          lotWidthMax: number | null;
          wallType?: string;
        };
        setback: number;
        windowedPortionSetback?: number;
        maxStoreys: number;
        notes?: string;
      }>;
      allowableEncroachments?: string[];
    };
  };
  dwellings: {
    max: number;
    min: number;
    maxSingleTypePercentage?: number;
    mixRequirement?: string;
  };
  floorToCeiling?: {
    habitable: { min: number; unit: string };
    nonHabitable: { min: number; unit: string };
  };
  deepSoil?: {
    rules: Array<{
      siteAreaMin?: number;
      siteAreaMax?: number;
      percentage: number;
    }>;
    unit: string;
  };
  communalOpenSpace?: {
    minPercentageOfSiteArea: number;
    locations?: string[];
    features?: string[];
  };
  solarAccess?: {
    minPercentageOfDwellingsCompliant: number;
    minDirectSunlightHours: number;
    timeWindow?: { start: string; end: string };
    targetArea?: string;
    notes?: string;
  };
  overshadowing?: {
    neighbouringProperties?: {
      minSunlightHours: number;
      minPrivateOpenSpacePercentage: number;
      timeWindow?: { start: string; end: string };
      referenceDate?: string;
    };
    evidenceRequired?: string;
    notes?: string;
  };
  crossVentilation?: {
    required: boolean;
    standard?: string;
    notes?: string;
  };
  landscapeRequirements?: {
    guideReference?: string;
    treeCanopyRequired?: boolean;
    significantTreesNote?: string;
  };
  privacyRequirements?: {
    addressedInPattern: boolean;
    solutions?: string[];
  };
  fsr?: {
    lmr?: { max: number; notes?: string };
    nonLmr?: { max: number; notes?: string };
  };
}

export interface LotSizeVariant {
  id: string;
  category: string;
  lotWidth: number;
  lotLength: number;
  siteArea: number;
  sideSetback: number;
  storeys: number;
  gfa: number;
  fsr: number;
  dwellingYield: DwellingYield;
  parking: ParkingConfig;
  isBasePattern?: boolean;
}

export interface ParkingVariant {
  id: string;
  name: string;
  description: string;
  preferred: boolean;
  specifications: {
    carSpaces: number;
    accessibleSpaces?: number;
    bikeSpaces: number;
    evChargingStations?: number;
  };
  rampSpecifications?: {
    grades: Array<{ section: string; length: number; grade: string }>;
    width: string;
  };
  dwellingYieldImpact: number;
  applicableStoreys?: number[];
  notes?: string;
}

export interface MaterialPalette {
  id: string;
  name: string;
  characterContext?: string;
  materials: Record<string, unknown>;
}

export interface FacadeVariant {
  id: string;
  name: string;
  description: string;
  characterDetails?: string;
  applicableMaterialPalettes?: string[];
}

export interface PolicyAreaVariant {
  id: string;
  policyArea: "lmr" | "non_lmr" | "lmr_plus";
  lotWidth: number;
  lotLength: number;
  siteArea?: number;
  storeys: number;
  maxHeight?: number;
  maxFsr?: number;
  gfa?: number;
  dwellingYield?: {
    oneBed?: number;
    twoBed?: number;
    threeBed?: number;
    fourBed?: number;
    total: number;
  };
  isBasePattern?: boolean;
}

export interface PatternBookAdaptations {
  lotSizeVariants?: LotSizeVariant[];
  policyAreaVariants?: PolicyAreaVariant[];
  parkingVariants?: ParkingVariant[];
  facadeVariants?: FacadeVariant[];
  materialPalettes?: MaterialPalette[];
  orientationVariants?: Array<{
    id: string;
    frontageDirection: string;
    mirroring: string;
    parkingRestriction?: string[];
    solarCompliance?: Record<string, { compliantUnits: number; totalUnits: number; percentage: number }>;
  }>;
  additionalFeatures?: Record<string, unknown>;
}

export interface ApplicablePolicy {
  name: string;
  description?: string;
  reference?: string;
}

export interface PatternBookMetadata {
  id: string;
  name: string;
  architect: string;
  version: string;
  releaseDate?: string;
  developmentType: string;
  description?: string;
  designConcepts?: string[];
  ownershipTypes?: string[];
  applicablePolicies?: ApplicablePolicy[];
}

export interface ApartmentType {
  id: string;
  category: string;
  name: string;
  setbackCategory?: string;
  areas: {
    internal: number;
    balcony?: number;
    terrace?: number;
  };
  storage?: {
    internalVolume: number;
    externalVolume?: number;
  };
  rooms: {
    bedrooms: number;
    bathrooms: number;
    hasStudy?: boolean;
  };
  features?: string[];
  accessibility?: {
    abcbLivableHousingStandard?: string;
    as4299Adaptable?: boolean;
    adaptableVariant?: string;
  };
  kitchenType?: string;
  typicalLocations?: string[];
  adaptedVersion?: {
    id: string;
    name: string;
    areas: { internal: number; balcony?: number };
    storage?: { internalVolume: number; externalVolume?: number };
    rooms?: { bedrooms: number; bathrooms: number; hasStudy?: boolean };
    adaptations?: string[];
  };
}

export interface DesignFeature {
  id: string;
  category: string;
  name: string;
  description: string;
  reason?: string;
  options?: string[];
  constraints?: string[];
}

export interface PatternBookSchema {
  $schema?: string;
  metadata: PatternBookMetadata;
  siteEligibility: SiteEligibilityConfig;
  developmentStandards: DevelopmentStandards;
  adaptations: PatternBookAdaptations;
  apartmentTypes?: ApartmentType[];
  designFeatures?: {
    fixed?: DesignFeature[];
    flexible?: DesignFeature[];
  };
  services?: {
    waste?: Record<string, unknown>;
    parking?: Record<string, unknown>;
    electrical?: Record<string, unknown>;
    hydraulic?: Record<string, unknown>;
  };
}

export interface UsePatternBookEligibilityReturn {
  isLoading: boolean;
  error: string | null;
  eligibilityResults: PatternEligibilityResult[];
  patterns: PatternBookSchema[];
  hasEligiblePatterns: boolean;
  totalMatchingVariants: number;
  siteWidth: number | null;
  siteLength: number | null;
  siteType: SiteType | null;
  siteTypeDiagnostics: SiteTypeDiagnostics | null;
}

export type SortField = "fitScore" | "gfa" | "fsr" | "dwellings" | "storeys" | "lotWidth";
export type SortDirection = "asc" | "desc";

export interface FilterOptions {
  minDwellings: number | null;
  maxDwellings: number | null;
  minGfa: number | null;
  maxGfa: number | null;
  minStoreys: number | null;
  maxStoreys: number | null;
  setbackCategories: string[];
}
