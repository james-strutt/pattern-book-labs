import { LANDIQ_THEME } from "@/components/ui/landiq/theme";
import type { PatternEligibilityChecks } from "@/apps/patternBook/types/patternBook";

export interface CheckItem {
  key: keyof PatternEligibilityChecks;
  label: string;
  tooltip?: string;
}

export type CheckValue = number | string | boolean | null;

export const ELIGIBILITY_CHECKS: CheckItem[] = [
  {
    key: "siteType",
    label: "Site Type",
    tooltip:
      "Detects battle-axe lots (narrow access handle leading to a wider rear portion). Uses width sampling across the lot boundary and requires a persistent narrow section plus a handle+body width distribution.",
  },
  {
    key: "residentialZone",
    label: "Zone",
    tooltip:
      "The site must be in an eligible residential zone (R1, R2, R3, or R4). All Pattern Book housing types, including low-rise patterns, are permitted in R1–R4 under the Housing SEPP.",
  },
  {
    key: "minArea",
    label: "Minimum Area",
    tooltip: "The site must meet the minimum area requirement for the selected pattern.",
  },
  {
    key: "minWidth",
    label: "Minimum Width",
    tooltip: "The site must meet the minimum width requirement for the selected pattern.",
  },
  {
    key: "minLength",
    label: "Minimum Length",
    tooltip: "The site must meet the minimum length/depth requirement for the selected pattern.",
  },
  {
    key: "bushfire",
    label: "Bushfire",
    tooltip: "Sites mapped as bushfire-prone land are not eligible for Pattern Book housing.",
  },
  {
    key: "flood",
    label: "Flood",
    tooltip: "Sites mapped as flood-prone land are not eligible for Pattern Book housing.",
  },
  {
    key: "contamination",
    label: "Contamination",
    tooltip:
      "Sites with any contamination on the NSW EPA Contaminated Land Register are not eligible for Pattern Book housing.",
  },
  {
    key: "heritage",
    label: "Heritage",
    tooltip:
      "Heritage-listed sites may have restrictions. State heritage items and heritage conservation areas are typically excluded.",
  },
  {
    key: "aircraftNoise",
    label: "Aircraft Noise",
    tooltip: "Mid-rise housing is not permitted in areas with ANEF 25 or greater aircraft noise exposure.",
  },
  {
    key: "slope",
    label: "Slope",
    tooltip: "Sites must meet the maximum crossfall (elevation change) requirement for the selected pattern.",
  },
  {
    key: "fsrCompliance",
    label: "FSR Compliance",
    tooltip: "The pattern's floor space ratio must comply with the applicable planning controls (LMR, TOD, or LEP).",
  },
  {
    key: "hobCompliance",
    label: "HOB Compliance",
    tooltip: "The pattern's building height must comply with the applicable planning controls (LMR, TOD, or LEP).",
  },
  {
    key: "policyArea",
    label: "Policy Area",
    tooltip: "The site must be within a Low and Mid-Rise Housing (LMR) or Transport Oriented Development (TOD) area.",
  },
];

const HAZARD_BOOLEAN_KEYS = new Set<keyof PatternEligibilityChecks>(["bushfire", "flood", "contamination", "heritage"]);

const STRING_PASSTHROUGH_KEYS = new Set<keyof PatternEligibilityChecks>([
  "fsrCompliance",
  "hobCompliance",
  "residentialZone",
  "aircraftNoise",
]);

function stripSlopeRequirementLabel(required: CheckValue): string {
  return String(required).replace("<= ", "").replace("m", "");
}

function formatDimensionValue(value: number | string | null, unit: string): string {
  if (value === null || value === undefined) return "N/A";
  if (typeof value === "string") {
    if (value.includes(">=")) return value.replace(">=", "≥");
    return value;
  }
  if (unit === "m²") {
    return `${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}${unit}`;
  }
  return `${typeof value === "number" ? value.toFixed(1) : value}${unit}`;
}

function parseRequiredNumber(required: CheckValue): number | null {
  if (typeof required === "number") return required;
  if (typeof required === "string" && required.includes(">=")) {
    const parsed = Number.parseFloat(required.replace(/>=\s*/, ""));
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function formatAreaCheck(actual: CheckValue, required: CheckValue): string {
  const actualStr = formatDimensionValue(actual as number | null, "m²");
  const reqNum = parseRequiredNumber(required);
  if (reqNum !== null) {
    return `${actualStr} (≥${reqNum.toLocaleString()}m²)`;
  }
  return actualStr;
}

function formatDimensionCheck(actual: CheckValue, required: CheckValue): string {
  const actualStr = formatDimensionValue(actual as number | null, "m");
  const reqNum = parseRequiredNumber(required);
  if (reqNum !== null) {
    return `${actualStr} (≥${reqNum}m)`;
  }
  return actualStr;
}

function formatSlopeCheck(actual: CheckValue, required: CheckValue): string {
  if (actual === null || actual === undefined) {
    if (required) {
      return `N/A (≤${stripSlopeRequirementLabel(required)}m)`;
    }
    return "No constraint";
  }
  const actualStr = typeof actual === "number" ? `${actual.toFixed(1)}m` : String(actual);
  if (required && typeof required === "string" && required.includes("<=")) {
    return `${actualStr} (≤${stripSlopeRequirementLabel(required)}m)`;
  }
  if (required === null) {
    return `${actualStr} (no limit)`;
  }
  return actualStr;
}

function formatBooleanCheck(actual: boolean, checkKey: keyof PatternEligibilityChecks): string | null {
  if (!HAZARD_BOOLEAN_KEYS.has(checkKey)) {
    return null;
  }
  return actual ? "Yes" : "No";
}

function formatStringCheck(actual: string, checkKey: keyof PatternEligibilityChecks): string | null {
  if (actual === "Not available" || actual === "No policy") {
    return actual;
  }
  if (checkKey === "siteType") {
    const formatted = actual.replaceAll("_", " ").replaceAll("-", " ");
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }
  if (STRING_PASSTHROUGH_KEYS.has(checkKey) || (checkKey === "policyArea" && actual !== "None")) {
    return actual;
  }
  return null;
}

export function formatCheckValue(
  actual: CheckValue,
  required: CheckValue,
  checkKey: keyof PatternEligibilityChecks,
): string | null {
  switch (checkKey) {
    case "minArea":
      return formatAreaCheck(actual, required);
    case "minWidth":
    case "minLength":
      return formatDimensionCheck(actual, required);
    case "slope":
      return formatSlopeCheck(actual, required);
    default:
      break;
  }

  if (actual === null || actual === undefined) return null;

  if (typeof actual === "boolean") {
    return formatBooleanCheck(actual, checkKey);
  }

  if (typeof actual === "string") {
    return formatStringCheck(actual, checkKey);
  }

  return null;
}

const CARD_BASE_STYLE = {
  boxShadow: "none" as const,
  background: LANDIQ_THEME.colors.greys.white,
  opacity: 1,
};

export function getCardStyling(isEligible: boolean): {
  border: string;
  boxShadow: string;
  background: string;
  opacity: number;
} {
  return {
    ...CARD_BASE_STYLE,
    border: `1px solid ${isEligible ? LANDIQ_THEME.colors.status.success : LANDIQ_THEME.colors.greys.grey03}`,
  };
}
