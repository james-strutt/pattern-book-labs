import type { SiteEligibilityData, ZoneCoverageItem } from "@/apps/patternBook/types/patternBook";
import type { PropertyFeature } from "@/apps/patternBook/types/shortlistAnalysis";
import { classifySiteType } from "@/apps/patternBook/utils/siteTypeClassifier";
import { getProp, FEATURE_PROP, type FeatureWithProperties } from "@/constants/featureProps";
import { extractLmrFromFeature } from "@/services/lmr";
import type { CatchmentEntry } from "@/types/domain/lmr";
import { isNonNullObject } from "@/utils/typeGuards";
import * as turf from "@turf/turf";
import {
  parseJsonArrayFromFeatureString,
  parseJsonValueFromFeatureString,
} from "@/apps/patternBook/services/batchAnalysisJson";
import { calculateSiteDimensions } from "@/apps/patternBook/services/batchAnalysisSiteGeometry";

interface ZoneEntry {
  value?: string;
  display_value?: string;
  SYM_CODE?: string;
  zone?: string;
  name?: string;
  coverage_percentage?: number;
}

export interface ExtractedSiteData extends Omit<SiteEligibilityData, "crossfallMetres"> {
  crossfallMetres: number | null;
}

interface HeritageEntry {
  value: string;
  display_value: string;
  coverage_percentage: number;
}

export function extractZoneCode(zoneValue: unknown): string | null {
  if (!zoneValue) return null;

  let rawZone: string | null = null;

  if (typeof zoneValue === "string") {
    rawZone = zoneValue.trim();
  } else if (Array.isArray(zoneValue) && zoneValue.length > 0) {
    const sorted = [...zoneValue].sort((a, b) => {
      const aPerc = (a as ZoneEntry).coverage_percentage ?? 0;
      const bPerc = (b as ZoneEntry).coverage_percentage ?? 0;
      return bPerc - aPerc;
    });
    const entry = sorted[0] as ZoneEntry;
    rawZone = entry?.display_value ?? entry?.value ?? entry?.SYM_CODE ?? entry?.zone ?? entry?.name ?? null;
  } else if (isNonNullObject(zoneValue)) {
    const entry = zoneValue as ZoneEntry;
    rawZone = entry.display_value ?? entry.value ?? entry.SYM_CODE ?? entry.zone ?? entry.name ?? null;
  }

  if (!rawZone) return null;

  const zoneCode = rawZone.split("-")[0]?.split(" ")[0]?.trim() ?? null;
  return zoneCode ?? null;
}

export function extractZoneCoverageEntries(landzoneValue: unknown): ZoneCoverageItem[] {
  if (!landzoneValue) return [];

  let entries: ZoneEntry[] = [];
  if (typeof landzoneValue === "string") {
    const parsed = parseJsonArrayFromFeatureString<ZoneEntry>(landzoneValue);
    if (parsed) entries = parsed;
    else return [];
  } else if (Array.isArray(landzoneValue)) {
    entries = landzoneValue as ZoneEntry[];
  }

  return entries
    .filter((e) => (e.coverage_percentage ?? 0) > 0)
    .map((e) => {
      const rawZone = e.display_value ?? e.value ?? e.SYM_CODE ?? "";
      const zoneCode = rawZone.split("-")[0]?.split(" ")[0]?.trim() ?? "";
      return {
        zoneCode,
        coveragePercent: e.coverage_percentage ?? 0,
      };
    })
    .filter((z) => z.zoneCode.length > 0);
}

function extractNumericProperty(
  feature: PropertyFeature,
  propKey: string,
  fallback: number | null = null,
): number | null {
  const value = getProp<number | string>(feature, propKey, null);
  if (value === null) return fallback;
  if (typeof value === "number") return value;
  const parsed = Number.parseFloat(String(value));
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parseBooleanValue(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    return lower === "true" || lower === "yes" || lower === "1";
  }
  if (typeof value === "number") return value !== 0;
  return false;
}

function extractLMRData(feature: PropertyFeature): {
  isInLMRArea: boolean;
  lmrCatchmentDistance: 400 | 800 | null;
} {
  const result = extractLmrFromFeature(feature as unknown as FeatureWithProperties);
  return {
    isInLMRArea: result.isInCatchment,
    lmrCatchmentDistance: result.catchmentDistance,
  };
}

function parseTodCatchment(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;

  if (typeof value === "string") {
    if (value === "No" || value === "Outside" || value === "Outside Catchment") return false;
    const parsed = parseJsonArrayFromFeatureString<CatchmentEntry>(value);
    if (parsed !== null) {
      if (parsed.length > 0) {
        return parsed.some((entry) => entry.coverage_percentage > 0);
      }
      return false;
    }
    return value !== "";
  }

  if (Array.isArray(value) && value.length > 0) {
    return (value as CatchmentEntry[]).some((entry) => entry.coverage_percentage > 0);
  }

  if (typeof value === "boolean") return value;

  return false;
}

function extractTODData(feature: PropertyFeature): boolean {
  const todValue =
    getProp(feature, FEATURE_PROP.PROPERTY.TRANSPORT_ORIENTED_DEVELOPMENT, null) ??
    getProp(feature, FEATURE_PROP.PROPERTY.TRANSPORT_ORIENTED_DEVELOPMENT_PRECINCTS, null) ??
    getProp(feature, FEATURE_PROP.PROPERTY.TRANSPORT_ORIENTED_DEVELOPMENT_REZONING_SITES, null);
  return parseTodCatchment(todValue);
}

function parseHeritageEntry(entry: HeritageEntry): {
  hasHeritage: boolean;
  heritageClass: string | null;
} {
  if (entry && entry.coverage_percentage > 0) {
    return {
      hasHeritage: true,
      heritageClass: entry.value ?? entry.display_value,
    };
  }
  return { hasHeritage: false, heritageClass: null };
}

function parseHeritageFromString(value: string): {
  hasHeritage: boolean;
  heritageClass: string | null;
} {
  const lowerValue = value.toLowerCase().trim();
  if (
    lowerValue === "" ||
    lowerValue === "none" ||
    lowerValue === "no" ||
    lowerValue === "null" ||
    lowerValue === "n/a" ||
    lowerValue === "[]"
  ) {
    return { hasHeritage: false, heritageClass: null };
  }

  const parsed = parseJsonArrayFromFeatureString<HeritageEntry>(value);
  if (parsed) {
    if (parsed.length > 0) {
      const firstEntry = parsed[0];
      if (firstEntry) {
        return parseHeritageEntry(firstEntry);
      }
    }
    return { hasHeritage: false, heritageClass: null };
  }

  if (
    lowerValue.includes("no heritage") ||
    lowerValue.includes("not heritage") ||
    lowerValue.includes("no significance")
  ) {
    return { hasHeritage: false, heritageClass: null };
  }
  if (
    lowerValue.includes("state") ||
    lowerValue.includes("local") ||
    lowerValue.includes("conservation") ||
    lowerValue.includes("heritage")
  ) {
    return {
      hasHeritage: true,
      heritageClass: value,
    };
  }
  return { hasHeritage: false, heritageClass: null };
}

function parseHeritageData(value: unknown): {
  hasHeritage: boolean;
  heritageClass: string | null;
} {
  if (value === null || value === undefined || value === "" || value === "None") {
    return { hasHeritage: false, heritageClass: null };
  }

  if (typeof value === "string") {
    return parseHeritageFromString(value);
  }

  if (Array.isArray(value) && value.length > 0) {
    return parseHeritageEntry(value[0] as HeritageEntry);
  }

  return { hasHeritage: false, heritageClass: null };
}

function extractHeritageData(feature: PropertyFeature): {
  hasHeritageSignificance: boolean;
  heritageClass: string | null;
} {
  const heritageValue = getProp(feature, FEATURE_PROP.PROPERTY.HERITAGE_SIGNIFICANCE, null);
  const result = parseHeritageData(heritageValue);
  return {
    hasHeritageSignificance: result.hasHeritage,
    heritageClass: result.heritageClass,
  };
}

function parseContaminationData(value: unknown): boolean {
  if (value === null || value === undefined || value === "") {
    return false;
  }

  if (typeof value === "string") {
    if (value === "[]" || value === "null" || value.toLowerCase() === "none") {
      return false;
    }
    const parsed = parseJsonValueFromFeatureString(value);
    if (parsed === null) {
      return false;
    }
    return Array.isArray(parsed) && parsed.length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (isNonNullObject(value)) {
    const objValue = value as { features?: unknown[] };
    if (objValue.features && Array.isArray(objValue.features)) {
      return objValue.features.length > 0;
    }
  }

  return false;
}

function extractContaminationData(feature: PropertyFeature): boolean {
  const contaminationValue = getProp(feature, FEATURE_PROP.PROPERTY.CONTAMINATION_FEATURES, null);
  return parseContaminationData(contaminationValue);
}

export function extractSiteDataFromFeature(feature: PropertyFeature): ExtractedSiteData | null {
  const geometry = feature.geometry;
  if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) {
    return null;
  }

  const areaValue = getProp<number | string>(feature, FEATURE_PROP.PROPERTY.AREA, 0);
  const siteArea =
    typeof areaValue === "number" ? areaValue : Number.parseFloat(String(areaValue)) || turf.area(geometry);

  const siteWidth = extractNumericProperty(feature, FEATURE_PROP.PROPERTY.SITE_WIDTH, null);

  const zoneValue =
    getProp(feature, FEATURE_PROP.PROPERTY.PRINCIPAL_ZONE_IDENTIFIER, null) ??
    getProp(feature, FEATURE_PROP.PROPERTY.ZONE, null) ??
    getProp(feature, FEATURE_PROP.PROPERTY.LANDZONE, null);
  const zoneCode = extractZoneCode(zoneValue);

  const landzoneRaw = getProp(feature, FEATURE_PROP.PROPERTY.LANDZONE, null);
  const zoneCoverage = extractZoneCoverageEntries(landzoneRaw);

  const { isInLMRArea, lmrCatchmentDistance } = extractLMRData(feature);
  const isInTODArea = extractTODData(feature);
  const bushfireValue = getProp(feature, FEATURE_PROP.PROPERTY.BUSHFIRE_PRONE, false);
  const isBushfireProne = parseBooleanValue(bushfireValue);
  const floodValue = getProp(feature, FEATURE_PROP.PROPERTY.FLOOD_PRONE, false);
  const isFloodProne = parseBooleanValue(floodValue);
  const hasContamination = extractContaminationData(feature);
  const { hasHeritageSignificance, heritageClass } = extractHeritageData(feature);

  const siteFsr = extractNumericProperty(feature, FEATURE_PROP.PROPERTY.FLOORSPACE_RATIO, null);
  const siteHob = extractNumericProperty(feature, FEATURE_PROP.PROPERTY.HEIGHT_OF_BUILDING, null);

  const { siteWidth: estimatedWidth, siteLength } = calculateSiteDimensions(geometry, siteArea, siteWidth);

  return {
    geometry,
    siteType: classifySiteType(geometry),
    siteArea,
    siteWidth: estimatedWidth,
    siteLength,
    zoneCode,
    zoneCoverage,
    isBushfireProne,
    isFloodProne,
    hasContamination,
    hasHeritageSignificance,
    heritageClass,
    anefValue: null,
    isInLMRArea,
    lmrCatchmentDistance,
    isInTODArea,
    crossfallMetres: null,
    siteFsr: Number.isNaN(siteFsr ?? Number.NaN) ? null : siteFsr,
    siteHob: Number.isNaN(siteHob ?? Number.NaN) ? null : siteHob,
  };
}

export function getPropertyAddress(feature: PropertyFeature): string {
  const address = getProp<string>(feature, FEATURE_PROP.PROPERTY.ADDRESS, null);
  if (address !== null && typeof address === "string" && address.trim()) return address;

  const lotRef = getProp<string>(feature, FEATURE_PROP.LOT.LOT_REFERENCE, null);
  if (lotRef !== null && typeof lotRef === "string" && lotRef.trim()) return `Lot ${lotRef}`;

  const lotNumber = getProp(feature, FEATURE_PROP.LOT.LOT_NUMBER, null);
  const planLabel = getProp(feature, FEATURE_PROP.LOT.PLAN_LABEL, null);
  if (lotNumber && planLabel) return `Lot ${lotNumber} ${planLabel}`;

  return `Property ${feature.id}`;
}
