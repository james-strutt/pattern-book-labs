export const BATCH_ANALYSIS_SERVICE_NAME = "BatchAnalysisService";

/** Reject oversized JSON blobs from feature attributes before `JSON.parse` (DoS hardening). */
export const MAX_FEATURE_JSON_STRING_LENGTH = 500_000;

/** Use p10–p90 elevation spread when raw range exceeds this (metres). */
export const CROSSFALL_ROBUST_THRESHOLD_METRES = 20;

/** Minimum contour intersections before applying percentile-based crossfall. */
export const CROSSFALL_MIN_CONTOURS_FOR_PERCENTILE = 4;

export const CROSSFALL_LOW_PERCENTILE = 0.1;
export const CROSSFALL_HIGH_PERCENTILE = 0.9;

/** Summary lists: top patterns and common ineligibility reasons. */
export const RANKED_LIST_LIMIT = 5;

/** Fraction of patterns that must be eligible for a property to count as “fully” eligible. */
export const ELIGIBLE_MAJORITY_FRACTION = 0.5;

export const RESIDENTIAL_ZONES_FOR_DWELLING_STATS = ["R1", "R2", "R3", "R4"] as const;
