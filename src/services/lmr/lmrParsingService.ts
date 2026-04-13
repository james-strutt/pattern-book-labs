import { FEATURE_PROP, getProp, type FeatureWithProperties } from "@/constants/featureProps";
import logger from "@/lib/logger";
import type {
  CatchmentEntry,
  LmrCatchmentResult,
  LmrCatchmentCoverage,
  LmrCatchmentDistance,
} from "@/types/domain/lmr";

const SERVICE_NAME = "LmrParsingService";

const MAX_LMR_JSON_STRING_LENGTH = 262_144;

const MAX_CATCHMENT_ENTRIES = 64;

function finiteOrZero(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normaliseCatchmentEntry(raw: unknown): CatchmentEntry | null {
  if (raw === null || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const value = o.value;
  const display_value = o.display_value;
  if (typeof value !== "string" || typeof display_value !== "string") {
    return null;
  }
  const coverage_percentage = Number(o.coverage_percentage);
  const coverage_squaremetres = Number(o.coverage_squaremetres);
  if (!Number.isFinite(coverage_percentage) || !Number.isFinite(coverage_squaremetres)) {
    return null;
  }
  return {
    value,
    display_value,
    coverage_percentage,
    coverage_squaremetres,
  };
}

function normaliseCatchmentEntries(raw: unknown[]): CatchmentEntry[] {
  const slice = raw.slice(0, MAX_CATCHMENT_ENTRIES);
  return slice.map((item) => normaliseCatchmentEntry(item)).filter((e): e is CatchmentEntry => e !== null);
}

export function parseLmrCatchment(value: unknown): LmrCatchmentResult {
  if (value === null || value === undefined || value === "") {
    return { isInCatchment: false, catchmentDistance: null };
  }

  const parseEntries = (entries: CatchmentEntry[]): LmrCatchmentResult => {
    const validEntries = entries.filter((e) => e.coverage_percentage > 0);
    if (validEntries.length === 0) {
      return { isInCatchment: false, catchmentDistance: null };
    }

    const distances = new Set(
      validEntries
        .map((e) => {
          const dist = typeof e.value === "string" ? Number.parseInt(e.value, 10) : null;
          return dist;
        })
        .filter((d): d is number => d !== null && (d === 400 || d === 800)),
    );

    if (distances.has(400)) {
      return { isInCatchment: true, catchmentDistance: 400 };
    }
    if (distances.has(800)) {
      return { isInCatchment: true, catchmentDistance: 800 };
    }
    return { isInCatchment: true, catchmentDistance: null };
  };

  if (typeof value === "string") {
    if (value.length > MAX_LMR_JSON_STRING_LENGTH) {
      return { isInCatchment: false, catchmentDistance: null };
    }
    if (value === "No" || value === "Outside Catchment" || value === "Outside") {
      return { isInCatchment: false, catchmentDistance: null };
    }
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parseEntries(normaliseCatchmentEntries(parsed));
      }
    } catch {
      return { isInCatchment: value !== "", catchmentDistance: null };
    }
  }

  if (Array.isArray(value)) {
    return parseEntries(normaliseCatchmentEntries(value));
  }

  return { isInCatchment: false, catchmentDistance: null };
}

export function parseWalkingCatchmentsData(walkingCatchmentsData: unknown): CatchmentEntry[] {
  try {
    if (typeof walkingCatchmentsData === "string") {
      if (walkingCatchmentsData.length > MAX_LMR_JSON_STRING_LENGTH) {
        return [];
      }
      const parsed: unknown = JSON.parse(walkingCatchmentsData);
      if (Array.isArray(parsed)) {
        return normaliseCatchmentEntries(parsed);
      }
      return [];
    }
    if (Array.isArray(walkingCatchmentsData)) {
      return normaliseCatchmentEntries(walkingCatchmentsData);
    }
  } catch (error) {
    logger.warn(
      "Failed to parse walking catchments data",
      {
        error: error instanceof Error ? error.message : String(error),
        dataType: typeof walkingCatchmentsData,
        isArray: Array.isArray(walkingCatchmentsData),
      },
      SERVICE_NAME,
    );
  }
  return [];
}

export function extractLmrFromFeature(feature: FeatureWithProperties): LmrCatchmentResult {
  const lmrValue = getProp(feature, FEATURE_PROP.PROPERTY.WALKING_CATCHMENTS_LOW_AND_MID_RISE_HOUSING, null);
  return parseLmrCatchment(lmrValue);
}

export function isInLmrCatchment(feature: FeatureWithProperties): boolean {
  return extractLmrFromFeature(feature).isInCatchment;
}

export function getLmrCatchmentDistance(feature: FeatureWithProperties): LmrCatchmentDistance {
  return extractLmrFromFeature(feature).catchmentDistance;
}

export function getLmrCoverage(feature: FeatureWithProperties): LmrCatchmentCoverage {
  const raw = getProp(feature, FEATURE_PROP.PROPERTY.WALKING_CATCHMENTS_LOW_AND_MID_RISE_HOUSING, null);
  const entries = parseWalkingCatchmentsData(raw);

  const catchment400m = entries.find((c) => Number(c.value) === 400);
  const catchment800m = entries.find((c) => Number(c.value) === 800);

  const result: LmrCatchmentCoverage = {};

  if (catchment400m) {
    const coverage = finiteOrZero(catchment400m.coverage_percentage);
    if (coverage > 0) {
      result.catchment400m = {
        coverage,
        area: finiteOrZero(catchment400m.coverage_squaremetres),
      };
    }
  }

  if (catchment800m) {
    const coverage = finiteOrZero(catchment800m.coverage_percentage);
    if (coverage > 0) {
      result.catchment800m = {
        coverage,
        area: finiteOrZero(catchment800m.coverage_squaremetres),
      };
    }
  }

  return result;
}

export function hasLmrFeaturePropData(props: Record<string, unknown>): boolean {
  const key = FEATURE_PROP.PROPERTY.WALKING_CATCHMENTS_LOW_AND_MID_RISE_HOUSING;
  const v = props[key];
  if (v === null || v === undefined || v === "") {
    return false;
  }
  if (typeof v === "string" && v.length > MAX_LMR_JSON_STRING_LENGTH) {
    return false;
  }
  return true;
}
