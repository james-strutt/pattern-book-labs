export const LAYER_IDS = {
  SHORTLIST_FILL: "pattern-book-shortlist-fill",
  SHORTLIST_OUTLINE: "pattern-book-shortlist-outline",
  SELECTED_HIGHLIGHT: "pattern-book-selected-highlight",
  HOVER_HIGHLIGHT: "pattern-book-hover-highlight",
} as const;

export const MAP_COLOURS = {
  ELIGIBLE_FILL: "#10B981",
  ELIGIBLE_OUTLINE: "#059669",
  INELIGIBLE_FILL: "#EF4444",
  INELIGIBLE_OUTLINE: "#DC2626",
  PARTIAL_FILL: "#F59E0B",
  PARTIAL_OUTLINE: "#D97706",
  SELECTED_OUTLINE: "#FBBF24",
  HOVER_OUTLINE: "#3B82F6",
  DEFAULT_FILL: "#9CA3AF",
  DEFAULT_OUTLINE: "#6B7280",
} as const;

export const MAP_OPACITY = {
  FILL: 0.4,
  FILL_HOVER: 0.7,
  OUTLINE: 1,
} as const;

export const MAP_LINE_WIDTH = {
  OUTLINE: 1,
  SELECTED: 2,
  HOVER: 1,
} as const;

// Properties with >= FULL eligible patterns show as fully eligible; >= PARTIAL as partially eligible
export const ELIGIBILITY_THRESHOLDS = {
  FULL: 5,
  PARTIAL: 1,
} as const;

export type EligibilityCategory = "eligible" | "partial" | "ineligible";

export function getEligibilityCategory(
  eligiblePatternCount: number,
): EligibilityCategory {
  if (eligiblePatternCount >= ELIGIBILITY_THRESHOLDS.FULL) {
    return "eligible";
  }
  if (eligiblePatternCount >= ELIGIBILITY_THRESHOLDS.PARTIAL) {
    return "partial";
  }
  return "ineligible";
}

export function getEligibilityFillColour(
  category: EligibilityCategory,
): string {
  switch (category) {
    case "eligible":
      return MAP_COLOURS.ELIGIBLE_FILL;
    case "partial":
      return MAP_COLOURS.PARTIAL_FILL;
    case "ineligible":
      return MAP_COLOURS.INELIGIBLE_FILL;
  }
}

export function getEligibilityOutlineColour(
  category: EligibilityCategory,
): string {
  switch (category) {
    case "eligible":
      return MAP_COLOURS.ELIGIBLE_OUTLINE;
    case "partial":
      return MAP_COLOURS.PARTIAL_OUTLINE;
    case "ineligible":
      return MAP_COLOURS.INELIGIBLE_OUTLINE;
  }
}

