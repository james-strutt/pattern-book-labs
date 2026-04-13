import * as turf from "@turf/turf";
import type * as GeoJSON from "geojson";
import { FEATURE_PROP, getProp, type FeatureWithProperties } from "@/constants/featureProps";
import { classifySiteTypeWithDiagnostics, estimateSiteLength } from "@/apps/patternBook/utils/siteTypeClassifier";
import { isNonNullObject } from "@/utils/typeGuards";
import { parseLmrCatchment } from "@/services/lmr";
import type { CatchmentEntry } from "@/types/domain/lmr";
import logger from "@/lib/logger";
import type { PropertyFeature } from "@/types/geometry";
import type {
  PatternEligibilityResult,
  SiteEligibilityData,
  SiteTypeDiagnostics,
  ZoneCoverageItem,
} from "@/apps/patternBook/types/patternBook";

const LOG_CONTEXT = "usePatternBookEligibility";

/** Bounds JSON.parse on feature-property strings to avoid main-thread stalls from pathological payloads. */
const MAX_FEATURE_PROPERTY_JSON_CHARS = 512_000;

export interface PatternBookDevelopableArea {
  features?: Array<{
    geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  }>;
}

function parseJsonValueIfSafe<T>(raw: string): T | null {
  if (raw.length > MAX_FEATURE_PROPERTY_JSON_CHARS) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function parseNumericValue(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseFloat(value);
  return 0;
}

function parseNumericOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
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

interface ZoneEntry {
  value?: string;
  display_value?: string;
  SYM_CODE?: string;
  zone?: string;
  name?: string;
  coverage_percentage?: number;
}

function extractZoneCode(zoneValue: unknown): string | null {
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

function extractZoneCoverage(landzoneValue: unknown): ZoneCoverageItem[] {
  if (!landzoneValue) return [];

  let entries: ZoneEntry[] = [];
  if (typeof landzoneValue === "string") {
    const parsed = parseJsonValueIfSafe<ZoneEntry[]>(landzoneValue);
    if (parsed && Array.isArray(parsed)) entries = parsed;
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

function parseTodCatchment(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;

  if (typeof value === "string") {
    if (value === "No" || value === "Outside" || value === "Outside Catchment") return false;
    const parsed = parseJsonValueIfSafe<unknown>(value);
    if (parsed !== null && Array.isArray(parsed)) {
      if (parsed.length > 0) {
        return (parsed as CatchmentEntry[]).some((entry) => entry.coverage_percentage > 0);
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

interface HeritageEntry {
  value: string;
  display_value: string;
  coverage_percentage: number;
}

function parseHeritageEntry(entry: HeritageEntry): {
  hasHeritage: boolean;
  heritageClass: string | null;
} {
  if (entry.coverage_percentage > 0) {
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

  const parsedJson = parseJsonValueIfSafe<unknown>(value);
  if (parsedJson !== null) {
    if (Array.isArray(parsedJson)) {
      if (parsedJson.length > 0) {
        const firstEntry = parsedJson[0] as HeritageEntry;
        if (firstEntry) {
          return parseHeritageEntry(firstEntry);
        }
      }
      return { hasHeritage: false, heritageClass: null };
    }
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

function parseContaminationData(value: unknown): boolean {
  if (value === null || value === undefined || value === "") {
    return false;
  }

  if (typeof value === "string") {
    if (value === "[]" || value === "null" || value.toLowerCase() === "none") {
      return false;
    }
    const parsed = parseJsonValueIfSafe<unknown[]>(value);
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

function calculateSiteWidth(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon): number | null {
  try {
    const feature = turf.feature(geometry);
    const bbox = turf.bbox(feature);

    const westPoint = turf.point([bbox[0], (bbox[1] + bbox[3]) / 2]);
    const eastPoint = turf.point([bbox[2], (bbox[1] + bbox[3]) / 2]);
    const width = turf.distance(westPoint, eastPoint, { units: "meters" });

    const southPoint = turf.point([(bbox[0] + bbox[2]) / 2, bbox[1]]);
    const northPoint = turf.point([(bbox[0] + bbox[2]) / 2, bbox[3]]);
    const height = turf.distance(southPoint, northPoint, { units: "meters" });

    return Math.min(width, height);
  } catch {
    return null;
  }
}

export function extractSiteEligibilityData(
  feature: PropertyFeature,
  developableArea: number | PatternBookDevelopableArea | null,
): {
  siteData: SiteEligibilityData;
  siteTypeDiagnostics: SiteTypeDiagnostics;
} | null {
  const featureWithProps = feature as unknown as FeatureWithProperties;
  const geometry = feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon | null;

  if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) {
    logger.warn("Invalid geometry for pattern book eligibility", {}, LOG_CONTEXT);
    return null;
  }

  let siteArea: number;
  let siteGeometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;

  if (developableArea && typeof developableArea === "object" && "features" in developableArea) {
    if (developableArea.features && developableArea.features.length > 0) {
      siteArea = developableArea.features.reduce((total, f) => {
        return total + turf.area(f.geometry);
      }, 0);
      siteGeometry = developableArea.features[0]?.geometry ?? geometry;
    } else {
      siteArea = turf.area(geometry);
      siteGeometry = geometry;
    }
  } else {
    const areaValue = getProp(featureWithProps, FEATURE_PROP.PROPERTY.AREA, 0);
    const parsedArea = parseNumericValue(areaValue);
    siteArea = parsedArea > 0 ? parsedArea : turf.area(geometry);
    siteGeometry = geometry;
  }

  const widthValue = getProp(featureWithProps, FEATURE_PROP.PROPERTY.SITE_WIDTH, null);
  const siteWidth = parseNumericOrNull(widthValue) ?? calculateSiteWidth(siteGeometry);
  const siteLength = estimateSiteLength(siteGeometry, siteWidth, siteArea);
  const siteTypeResult = classifySiteTypeWithDiagnostics(siteGeometry);
  const siteType = siteTypeResult.siteType;

  const bushfireValue = getProp(featureWithProps, FEATURE_PROP.PROPERTY.BUSHFIRE_PRONE, false);
  const floodValue = getProp(featureWithProps, FEATURE_PROP.PROPERTY.FLOOD_PRONE, false);
  const contaminationValue = getProp(featureWithProps, FEATURE_PROP.PROPERTY.CONTAMINATION_FEATURES, null);
  const heritageValue = getProp(featureWithProps, FEATURE_PROP.PROPERTY.HERITAGE_SIGNIFICANCE, null);
  const heritageData = parseHeritageData(heritageValue);

  const zoneValue =
    getProp(featureWithProps, FEATURE_PROP.PROPERTY.PRINCIPAL_ZONE_IDENTIFIER, null) ??
    getProp(featureWithProps, FEATURE_PROP.PROPERTY.ZONE, null) ??
    getProp(featureWithProps, FEATURE_PROP.PROPERTY.LANDZONE, null);
  const zoneCode = extractZoneCode(zoneValue);

  const landzoneRaw = getProp(featureWithProps, FEATURE_PROP.PROPERTY.LANDZONE, null);
  const zoneCoverage = extractZoneCoverage(landzoneRaw);

  const lmrValue = getProp(featureWithProps, FEATURE_PROP.PROPERTY.WALKING_CATCHMENTS_LOW_AND_MID_RISE_HOUSING, null);
  const lmrResult = parseLmrCatchment(lmrValue);

  const todValue =
    getProp(featureWithProps, FEATURE_PROP.PROPERTY.TRANSPORT_ORIENTED_DEVELOPMENT, null) ??
    getProp(featureWithProps, FEATURE_PROP.PROPERTY.TRANSPORT_ORIENTED_DEVELOPMENT_PRECINCTS, null) ??
    getProp(featureWithProps, FEATURE_PROP.PROPERTY.TRANSPORT_ORIENTED_DEVELOPMENT_REZONING_SITES, null);
  const isInTODArea = parseTodCatchment(todValue);

  const fsrValue = getProp(featureWithProps, FEATURE_PROP.PROPERTY.FLOORSPACE_RATIO, null);
  const hobValue = getProp(featureWithProps, FEATURE_PROP.PROPERTY.HEIGHT_OF_BUILDING, null);

  const siteData: SiteEligibilityData = {
    geometry: siteGeometry,
    siteType,
    siteArea,
    siteWidth,
    siteLength,
    zoneCode,
    zoneCoverage,
    isBushfireProne: parseBooleanValue(bushfireValue),
    isFloodProne: parseBooleanValue(floodValue),
    hasContamination: parseContaminationData(contaminationValue),
    hasHeritageSignificance: heritageData.hasHeritage,
    heritageClass: heritageData.heritageClass,
    anefValue: null,
    isInLMRArea: lmrResult.isInCatchment,
    lmrCatchmentDistance: lmrResult.catchmentDistance,
    isInTODArea,
    crossfallMetres: null,
    siteFsr: parseNumericOrNull(fsrValue),
    siteHob: parseNumericOrNull(hobValue),
  };

  return { siteData, siteTypeDiagnostics: siteTypeResult.diagnostics };
}

export function arePatternEligibilityResultsEqual(
  prev: PatternEligibilityResult[] | null,
  current: PatternEligibilityResult[],
): boolean {
  if (!prev) return false;
  if (prev.length !== current.length) return false;

  return prev.every((p, i) => {
    const c = current[i];
    if (!p || !c) return false;
    return (
      p.patternId === c.patternId &&
      p.isEligible === c.isEligible &&
      p.matchingVariants.length === c.matchingVariants.length
    );
  });
}
