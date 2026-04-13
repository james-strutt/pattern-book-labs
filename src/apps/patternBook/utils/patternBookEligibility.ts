/**
 * Pattern Book Eligibility Engine
 *
 * Evaluates whether a site is eligible for each NSW Pattern Book housing design.
 *
 * How it works:
 *   1. For each pattern (e.g. "Terraces-01", "Manor-Homes-01"), run 15 independent
 *      checks against the site's attributes (zone, dimensions, hazards, heritage, etc.).
 *   2. A pattern is "eligible" only if every check passes.
 *   3. For eligible patterns, find which lot-size or policy-area variants physically
 *      fit on the site and rank them by fit score.
 *
 * Key domain concepts:
 *   - LMR (Low and Mid-Rise): a policy area within walking catchments of transport/centres.
 *   - TOD (Transport Oriented Development): a separate overlay for apartment buildings
 *     near major transport nodes.
 *   - FSR (Floor Space Ratio) and HOB (Height of Building): the two primary density
 *     controls that vary by zone and policy area.
 *   - Pattern schemas live in /pattern-book/schema/*.json and define each
 *     design's lot requirements, excluded land types, and variant adaptations.
 *
 * Public API (only these are imported elsewhere):
 *   - evaluateAllPatterns()  — run all patterns against a site
 *   - getPolicyFsrHob()      — resolve FSR/HOB limits for a zone + policy area
 */

import type {
  PatternBookSchema,
  SiteEligibilityData,
  PatternEligibilityResult,
  PatternEligibilityChecks,
  EligibilityCheckResult,
  VariantMatch,
  LmrCatchmentDistance,
  LotDimensionConstraints,
  LotDimensionBounds,
  LotSizeVariant,
  PolicyAreaVariant,
  ZoneCoverageItem,
} from "@/apps/patternBook/types/patternBook";
import {
  isPolicyAreaLotDimensions,
  isPolicyAreaHeight,
} from "@/apps/patternBook/types/patternBook";
import logger from "@/lib/logger";

// LMR and TOD zoning control constants

const LMR_CONTROLS = {
  R1_R2: { FSR: 0.8, HOB: 9.5 },
  R3_R4_400M: { FSR: 2.2, HOB: 22 },
  R3_R4_800M: { FSR: 1.5, HOB: 17.5 },
} as const;

const TOD_CONTROLS = {
  MIN_WIDTH: 21,
  FSR: 2.5,
  HOB_RESIDENTIAL: 22,
  HOB_E1: 24,
} as const;

// ── Policy limit resolution ──────────────────────────────────────────
//
// Before checking individual eligibility criteria we need to know what
// FSR and HOB the planning rules actually permit on this site. The answer
// depends on the zone code (R1-R4, E1) and which policy overlay applies.

interface PolicyLimits {
  fsr: number;
  hob: number;
  policyName: string;
}

/**
 * R1/R2 zones get a single LMR control set. Everything else (R3/R4 and
 * any other zone that happens to be in an LMR catchment) uses the
 * catchment-distance-based controls — 400m or 800m from the station/centre.
 */
function lmrPolicyForZone(
  zoneCode: string | null,
  catchmentDistance: LmrCatchmentDistance
): PolicyLimits | null {
  if (zoneCode === "R1" || zoneCode === "R2") {
    return {
      fsr: LMR_CONTROLS.R1_R2.FSR,
      hob: LMR_CONTROLS.R1_R2.HOB,
      policyName: "LMR (R1/R2)",
    };
  }

  let controls: { FSR: number; HOB: number } | null = null;
  if (catchmentDistance === 400) {
    controls = LMR_CONTROLS.R3_R4_400M;
  } else if (catchmentDistance === 800) {
    controls = LMR_CONTROLS.R3_R4_800M;
  }

  if (!controls) return null;
  return {
    fsr: controls.FSR,
    hob: controls.HOB,
    policyName: `LMR (${catchmentDistance}m)`,
  };
}

/**
 * Resolve the FSR and HOB policy limits that apply to a site.
 * TOD apartments get their own controls; LMR sites use zone-based controls;
 * sites outside both policy areas have no overriding limits (returns null).
 */
export function getPolicyFsrHob(
  zoneCode: string | null,
  isInLMRArea: boolean,
  lmrCatchmentDistance: LmrCatchmentDistance,
  isInTODArea: boolean,
  developmentType?: string
): PolicyLimits | null {
  if (isInTODArea && developmentType === "residential_flat_building") {
    const hob =
      zoneCode === "E1" ? TOD_CONTROLS.HOB_E1 : TOD_CONTROLS.HOB_RESIDENTIAL;
    return { fsr: TOD_CONTROLS.FSR, hob, policyName: "TOD" };
  }
  return isInLMRArea
    ? lmrPolicyForZone(zoneCode, lmrCatchmentDistance)
    : null;
}

// ── Individual eligibility checks ────────────────────────────────────
//
// Each function tests one criterion and returns an EligibilityCheckResult
// with { met, actual, required, reason? }. The "actual" and "required"
// values are shown in the UI matrix.

// Check a numeric site dimension (area, width, or length) against min/max bounds. 

function checkDimension(
  actual: number | null,
  min: number | null,
  max: number | null,
  label: string
): EligibilityCheckResult {
  const fmt = (v: number): string => {
    const unit = label.toLowerCase().includes("area") ? "m²" : "m";
    return `${Math.round(v).toLocaleString()}${unit}`;
  };
  let required: string | null = null;
  if (min !== null) {
    required = `>= ${min}`;
  } else if (max !== null) {
    required = `<= ${max}`;
  }

  if (actual === null) {
    return { met: false, actual: null, required, reason: `${label} data not available` };
  }
  if (min !== null && actual < min) {
    return {
      met: false,
      actual,
      required: min,
      reason: `${label} (${fmt(actual)}) is below minimum (${fmt(min)})`,
    };
  }
  if (max !== null && actual > max) {
    return {
      met: false,
      actual,
      required: max,
      reason: `${label} (${fmt(actual)}) exceeds maximum (${fmt(max)})`,
    };
  }
  return { met: true, actual, required: required ?? "Any" };
}

/** Simple boolean exclusion check — bushfire, flood, or contamination. */
function checkExclusion(
  present: boolean,
  constraint: string
): EligibilityCheckResult {
  return present
    ? { met: false, actual: true, required: false, reason: `Site has ${constraint} constraints` }
    : { met: true, actual: false, required: false };
}

/**
 * Check whether a pattern's required FSR or HOB fits within the applicable
 * policy limits. When no policy overlay applies, falls back to the site's
 * own FSR/HOB from the planning instrument (LEP).
 */
function checkPolicyCompliance(
  patternValue: number,
  policy: PolicyLimits | null,
  controlType: "fsr" | "hob",
  siteValue: number | null = null
): EligibilityCheckResult {
  const label = controlType === "fsr" ? "FSR" : "HOB";
  const unit = controlType === "fsr" ? ":1" : "m";

  // No policy overlay — fall back to site-specific controls from the LEP
  if (!policy) {
    if (siteValue !== null) {
      return patternValue <= siteValue
        ? { met: true, actual: siteValue, required: patternValue }
        : {
            met: false,
            actual: siteValue,
            required: patternValue,
            reason: `Pattern ${label} (${patternValue}) exceeds site ${label} (${siteValue})`,
          };
    }
    return { met: true, actual: "No policy limit", required: patternValue };
  }

  const limit = controlType === "fsr" ? policy.fsr : policy.hob;
  if (patternValue <= limit) {
    return {
      met: true,
      actual: `${limit}${unit} (${policy.policyName})`,
      required: patternValue,
    };
  }
  return {
    met: false,
    actual: limit,
    required: patternValue,
    reason: `Pattern requires ${label} ${patternValue}${unit}, ${policy.policyName} policy allows ${limit}${unit}`,
  };
}

// ── Zone and policy area checks ──────────────────────────────────────

const RESIDENTIAL_ZONES = ["R1", "R2", "R3", "R4"];
const LOW_RISE_TYPES = new Set([
  "multi_dwelling_housing_terraces",
  "multi_dwelling_housing_semi_detached",
  "dual_occupancy",
  "semi_detached_dwelling",
  "multi_dwelling_housing_row",
  "multi_dwelling_housing_manor",
  "multi_dwelling_housing",
  "manor_house",
]);

/**
 * When the site's primary zone code isn't residential, check whether any
 * zone in the coverage array qualifies. This handles split-zoned lots.
 */
function bestResidentialZone(
  coverage: ZoneCoverageItem[] | undefined,
  allowed: string[]
): string | null {
  if (!coverage?.length) return null;
  const match = coverage
    .filter((z) => allowed.includes(z.zoneCode) && z.coveragePercent > 0)
    .sort((a, b) => b.coveragePercent - a.coveragePercent)[0];
  return match?.zoneCode ?? null;
}

function checkResidentialZone(
  zoneCode: string | null,
  _developmentType?: string,
  zoneCoverage?: ZoneCoverageItem[]
): EligibilityCheckResult {
  const zonesLabel = "R1, R2, R3, or R4";
  const effective = zoneCode ?? bestResidentialZone(zoneCoverage, RESIDENTIAL_ZONES);

  if (!effective) {
    return { met: false, actual: "Unknown", required: zonesLabel, reason: "Zone information not available" };
  }

  if (RESIDENTIAL_ZONES.includes(effective)) {
    return { met: true, actual: effective, required: zonesLabel };
  }

  const fallback = bestResidentialZone(zoneCoverage, RESIDENTIAL_ZONES);
  if (fallback) {
    const pct = Math.round(
      zoneCoverage?.find((z) => z.zoneCode === fallback)?.coveragePercent ?? 0
    );
    return { met: true, actual: `${fallback} (${pct}% coverage)`, required: zonesLabel };
  }

  return {
    met: false,
    actual: effective,
    required: zonesLabel,
    reason: `Site is zoned ${effective}, Pattern Book requires residential zone (${zonesLabel})`,
  };
}

/**
 * Low-rise patterns are valid in both LMR and non-LMR areas (the variants differ).
 * Apartment patterns require either LMR or TOD overlay.
 */
function checkPolicyArea(
  isInLMRArea: boolean,
  isInTODArea: boolean,
  developmentType?: string
): EligibilityCheckResult {
  const isLowRise = developmentType ? LOW_RISE_TYPES.has(developmentType) : false;

  if (isLowRise) {
    return { met: true, actual: isInLMRArea ? "LMR" : "Non-LMR", required: "LMR or Non-LMR area" };
  }

  if (!isInLMRArea && !isInTODArea) {
    return {
      met: false,
      actual: "None",
      required: "LMR or TOD area",
      reason: "Site is not within a Low Mid-Rise Housing or Transport Oriented Development area",
    };
  }

  const areas = [isInLMRArea && "LMR", isInTODArea && "TOD"]
    .filter(Boolean)
    .join(", ");
  return { met: true, actual: areas, required: "LMR or TOD area" };
}

// ── Site constraint checks ───────────────────────────────────────────

function checkSiteType(siteType: string): EligibilityCheckResult {
  if (siteType === "battle_axe") {
    return {
      met: false,
      actual: "battle-axe",
      required: "Not battle-axe",
      reason: "Battle-axe sites are not eligible for Pattern Book housing",
    };
  }
  return { met: true, actual: siteType.replaceAll("_", " "), required: "Not battle-axe" };
}

function checkSlope(
  crossfall: number | null,
  maxCrossfall: number | undefined
): EligibilityCheckResult {
  if (maxCrossfall === undefined) {
    return { met: true, actual: crossfall, required: null, reason: "No slope constraint for this pattern" };
  }
  if (crossfall === null) {
    return { met: true, actual: "Not available", required: `<= ${maxCrossfall}m`, reason: "Slope data not available - assumed compliant" };
  }
  if (crossfall <= maxCrossfall) {
    return { met: true, actual: `${crossfall.toFixed(1)}m`, required: `<= ${maxCrossfall}m` };
  }
  // Extra decimal precision on failures so "4.0m exceeds 4m" doesn't confuse user
  return {
    met: false,
    actual: `${crossfall.toFixed(2)}m`,
    required: `<= ${maxCrossfall}m`,
    reason: `Site crossfall (${crossfall.toFixed(2)}m) exceeds maximum allowed (${maxCrossfall}m)`,
  };
}

/**
 * Heritage check is the most complex exclusion because the pattern schema
 * can exclude specific heritage tiers (state items, local items, HCAs)
 * independently. If the heritage class string doesn't match any known tier
 * but the pattern excludes heritage, we err on the side of exclusion.
 */
function checkHeritage(
  hasSignificance: boolean,
  heritageClass: string | null,
  excludedLand: Array<{ type: string; description: string }>
): EligibilityCheckResult {
  if (!hasSignificance) {
    return { met: true, actual: false, required: false };
  }

  const exclusions = excludedLand.filter((e) => e.type.includes("heritage"));
  if (exclusions.length === 0) {
    return { met: true, actual: heritageClass ?? "Yes", required: false, reason: "Heritage site but no heritage exclusions for this pattern" };
  }

  // Classify the site's heritage tier
  const cls = heritageClass?.toLowerCase() ?? "";
  const isState = cls.includes("state");
  const isLocal = cls.includes("local") && !isState;
  const isHCA = cls.includes("conservation");

  // Check whether the pattern excludes this tier
  const stateExcluded = exclusions.some((e) => e.type === "state_heritage_item");
  const localExcluded = exclusions.some((e) => e.type === "local_heritage_item");
  const hcaExcluded = exclusions.some((e) => e.type === "heritage_conservation_area");

  if ((isState && stateExcluded) || (isLocal && localExcluded) || (isHCA && hcaExcluded)) {
    return {
      met: false,
      actual: heritageClass ?? "Yes",
      required: false,
      reason: `${heritageClass ?? "Heritage"} sites are excluded for this pattern`,
    };
  }

  // Tier unrecognised but the pattern has heritage exclusions — reject conservatively
  if (!isState && !isLocal && !isHCA && (stateExcluded || localExcluded || hcaExcluded)) {
    return {
      met: false,
      actual: heritageClass ?? "Yes",
      required: false,
      reason: "Heritage sites are excluded for this pattern",
    };
  }

  return { met: true, actual: heritageClass ?? "Yes", required: false };
}

// Australian Noise Exposure Forecast (ANEF) noise contour checks for mid-rise housing (RFBs)

const ANEF_THRESHOLD = 25;

function checkAircraftNoise(
  anef: number | null,
  isMidRise: boolean
): EligibilityCheckResult {
  if (!isMidRise) {
    return { met: true, actual: anef === null ? "N/A" : `ANEF ${anef}`, required: "N/A (not mid-rise)" };
  }
  if (anef === null) {
    return { met: true, actual: "Not in noise contour", required: `< ANEF ${ANEF_THRESHOLD}` };
  }
  if (anef >= ANEF_THRESHOLD) {
    return {
      met: false,
      actual: `ANEF ${anef}`,
      required: `< ANEF ${ANEF_THRESHOLD}`,
      reason: `Site is in ANEF ${anef} contour (>= ${ANEF_THRESHOLD} not permitted for mid-rise housing)`,
    };
  }
  return { met: true, actual: `ANEF ${anef}`, required: `< ANEF ${ANEF_THRESHOLD}` };
}

// ── Variant matching ─────────────────────────────────────────────────
//
// Once a pattern passes all eligibility checks, we determine which of its
// pre-designed variants actually fit on the site's lot dimensions. Each
// variant specifies a minimum lot width and length. The "fit score" (0-100)
// measures how closely the variant uses the available frontage and depth —
// a tighter fit means less wasted land.

function fitScore(
  variantWidth: number,
  variantLength: number,
  siteWidth: number,
  siteLength: number
): number {
  if (siteWidth < variantWidth || siteLength < variantLength) return 0;
  const widthRatio = Math.min(variantWidth / siteWidth, 1);
  const lengthRatio = Math.min(variantLength / siteLength, 1);
  return Math.round(widthRatio * 50 + lengthRatio * 50);
}

function lotSizeToMatch(v: LotSizeVariant, score: number): VariantMatch {
  return {
    variantId: v.id,
    category: v.category,
    lotWidth: v.lotWidth,
    lotLength: v.lotLength,
    siteArea: v.siteArea,
    sideSetback: v.sideSetback,
    storeys: v.storeys,
    gfa: v.gfa,
    fsr: v.fsr,
    dwellingYield: v.dwellingYield,
    parking: v.parking,
    fitScore: score,
    isBasePattern: v.isBasePattern,
  };
}

function policyAreaToMatch(v: PolicyAreaVariant, score: number): VariantMatch {
  return {
    variantId: v.id,
    category: v.policyArea as string,
    lotWidth: v.lotWidth,
    lotLength: v.lotLength,
    siteArea: v.siteArea ?? v.lotWidth * v.lotLength,
    sideSetback: 0,
    storeys: v.storeys,
    gfa: v.gfa ?? 0,
    fsr: v.maxFsr ?? 0,
    dwellingYield: {
      studio: 0,
      oneBed: 0,
      twoBed: v.dwellingYield?.twoBed ?? 0,
      threeBed: v.dwellingYield?.threeBed ?? 0,
      fourBed: v.dwellingYield?.fourBed ?? 0,
      total: v.dwellingYield?.total ?? 0,
    },
    parking: { type: "not_specified", cars: 0, bikes: 0 },
    fitScore: score,
    isBasePattern: v.isBasePattern,
  };
}

/**
 * Find all variants that physically fit and rank them by fit score (then GFA).
 * Patterns use either lot-size variants or policy-area variants, never both.
 */
function findMatchingVariants(
  pattern: PatternBookSchema,
  siteWidth: number | null,
  siteLength: number | null
): VariantMatch[] {
  if (siteWidth === null || siteLength === null) return [];

  const { lotSizeVariants, policyAreaVariants } = pattern.adaptations;
  const fits = (v: { lotWidth: number; lotLength: number }): boolean =>
    siteWidth >= v.lotWidth && siteLength >= v.lotLength;
  const byFitThenGfa = (a: VariantMatch, b: VariantMatch): number =>
    b.fitScore - a.fitScore || b.gfa - a.gfa;

  if (lotSizeVariants?.length) {
    return lotSizeVariants
      .filter(fits)
      .map((v) => lotSizeToMatch(v, fitScore(v.lotWidth, v.lotLength, siteWidth, siteLength)))
      .sort(byFitThenGfa);
  }
  if (policyAreaVariants?.length) {
    return policyAreaVariants
      .filter(fits)
      .map((v) => policyAreaToMatch(v, fitScore(v.lotWidth, v.lotLength, siteWidth, siteLength)))
      .sort(byFitThenGfa);
  }
  return [];
}

// ── Pattern-level max values ─────────────────────────────────────────
//
// To check FSR/HOB compliance we need the maximum FSR or height that a
// pattern could produce. If the pattern has lot-size variants the max FSR
// comes from those; otherwise it comes from the development standards with
// a policy-area fallback chain (preferred area → other area → 0).

function getMaxPatternFsr(pattern: PatternBookSchema, isLMR: boolean): number {
  const { lotSizeVariants } = pattern.adaptations;
  if (lotSizeVariants?.length) {
    return Math.max(...lotSizeVariants.map((v) => v.fsr));
  }
  const fsr = pattern.developmentStandards.fsr;
  if (!fsr) return 0;
  return (isLMR ? fsr.lmr?.max : fsr.nonLmr?.max) ?? fsr.lmr?.max ?? fsr.nonLmr?.max ?? 0;
}

function getMaxPatternHeight(pattern: PatternBookSchema, isLMR: boolean): number {
  const height = pattern.developmentStandards.height;
  if (!isPolicyAreaHeight(height)) return height.maxMetres;
  return (isLMR ? height.lmr?.maxMetres : height.nonLmr?.maxMetres)
    ?? height.lmr?.maxMetres ?? height.nonLmr?.maxMetres ?? 0;
}

// ── Main evaluation ──────────────────────────────────────────────────

function getLotDimensionBounds(
  constraints: LotDimensionConstraints,
  isLMR: boolean
): LotDimensionBounds | null {
  if (isPolicyAreaLotDimensions(constraints)) {
    return (isLMR ? constraints.lmr : constraints.nonLmr) ?? null;
  }
  return constraints;
}

/** Assemble all eligibility checks for one pattern against one site. */
function buildChecks(
  pattern: PatternBookSchema,
  site: SiteEligibilityData,
  bounds: LotDimensionBounds | null,
  policy: PolicyLimits | null
): PatternEligibilityChecks {
  const { siteEligibility, metadata } = pattern;
  const isApartment = metadata.developmentType === "residential_flat_building";

  // When bounds is null the pattern has no configuration for this policy area
  const noBounds = bounds === null;
  const patternMinWidth = bounds?.absoluteMinimums.width ?? 0;
  const minWidth =
    site.isInTODArea && isApartment
      ? Math.max(patternMinWidth, TOD_CONTROLS.MIN_WIDTH)
      : patternMinWidth;

  const dimCheck = (actual: number | null, min: number, label: string): EligibilityCheckResult =>
    noBounds
      ? { met: false, actual, required: null, reason: "Pattern not available for this policy area" }
      : checkDimension(actual, min, null, label);

  return {
    siteType: checkSiteType(site.siteType),
    residentialZone: checkResidentialZone(site.zoneCode, metadata.developmentType, site.zoneCoverage),
    minArea: dimCheck(site.siteArea, bounds?.absoluteMinimums.area ?? 0, "Site area"),
    maxArea: { met: true, actual: site.siteArea, required: null },
    minWidth: dimCheck(site.siteWidth, minWidth, "Site width"),
    minLength: dimCheck(site.siteLength, bounds?.absoluteMinimums.length ?? 0, "Site length"),
    bushfire: checkExclusion(site.isBushfireProne, "bushfire-prone land"),
    flood: checkExclusion(site.isFloodProne, "flood-prone land"),
    contamination: checkExclusion(site.hasContamination, "contaminated land"),
    heritage: checkHeritage(site.hasHeritageSignificance, site.heritageClass, siteEligibility.excludedLand),
    aircraftNoise: checkAircraftNoise(site.anefValue, isApartment),
    fsrCompliance: checkPolicyCompliance(getMaxPatternFsr(pattern, site.isInLMRArea), policy, "fsr", site.siteFsr),
    hobCompliance: checkPolicyCompliance(getMaxPatternHeight(pattern, site.isInLMRArea), policy, "hob", site.siteHob),
    policyArea: checkPolicyArea(site.isInLMRArea, site.isInTODArea, metadata.developmentType),
    slope: checkSlope(site.crossfallMetres, siteEligibility.slopeConstraints?.maxCrossfallMetres),
  };
}

/** Evaluate a single pattern against a site. */
function checkPatternEligibility(
  pattern: PatternBookSchema,
  site: SiteEligibilityData
): PatternEligibilityResult {
  const bounds = getLotDimensionBounds(pattern.siteEligibility.lotDimensions, site.isInLMRArea);
  const policy = getPolicyFsrHob(
    site.zoneCode, site.isInLMRArea, site.lmrCatchmentDistance,
    site.isInTODArea, pattern.metadata.developmentType
  );
  const checks = buildChecks(pattern, site, bounds, policy);

  const isEligible = Object.values(checks).every((c) => c.met);
  const ineligibleReasons: string[] = [];
  for (const check of Object.values(checks)) {
    if (!check.met && check.reason) ineligibleReasons.push(check.reason);
  }

  const matchingVariants = isEligible
    ? findMatchingVariants(pattern, site.siteWidth, site.siteLength)
    : [];

  logger.debug("Pattern eligibility checked", {
    patternId: pattern.metadata.id,
    isEligible,
    matchingVariantsCount: matchingVariants.length,
    failedChecks: ineligibleReasons.length,
  }, "PatternBookEligibility");

  return {
    patternId: pattern.metadata.id,
    patternName: pattern.metadata.name,
    architect: pattern.metadata.architect,
    isEligible,
    checks,
    matchingVariants,
    ineligibleReasons,
  };
}

/** Run every loaded pattern against a site and return the full results array. */
export function evaluateAllPatterns(
  patterns: PatternBookSchema[],
  site: SiteEligibilityData
): PatternEligibilityResult[] {
  const results = patterns.map((p) => checkPatternEligibility(p, site));

  logger.info("All patterns evaluated", {
    totalPatterns: patterns.length,
    eligiblePatterns: results.filter((r) => r.isEligible).length,
    totalMatchingVariants: results.reduce((sum, r) => sum + r.matchingVariants.length, 0),
  }, "PatternBookEligibility");

  return results;
}
