import type {
  PatternEligibilityResult,
  VariantMatch,
} from "@/apps/patternBook/types/patternBook";
import type { ShortlistPatternAnalysisResult } from "@/apps/patternBook/types/shortlistAnalysis";

export type OptimisationObjective = "dwellings" | "gfa";

/**
 * Predicate for filtering variants the optimiser may pick from. The
 * panel passes a predicate that runs `findBlockForVariant` against the
 * project bootstrap's block catalogue — this ensures the optimiser only
 * picks (pattern, variant) pairs that actually have an authored Giraffe
 * block to place. Without this, the optimiser happily picks
 * metric-maximising variants that the batch placement service then has
 * to reject at the block-matching step.
 */
export type IsVariantPlaceable = (
  patternId: string,
  variant: VariantMatch,
) => boolean;

export interface OptimisedPatternSelection {
  featureId: string;
  address: string;
  patternId: string;
  patternName: string;
  architect: string;
  variant: VariantMatch;
  projectedDwellings: number;
  projectedGfa: number;
}

export interface OptimisationSummary {
  selections: OptimisedPatternSelection[];
  totalProjectedDwellings: number;
  totalProjectedGfa: number;
  placeableSiteCount: number;
  skippedSiteCount: number;
}

export interface OptimisePatternSelectionOptions {
  isVariantPlaceable?: IsVariantPlaceable;
}

function metricFor(
  variant: VariantMatch,
  objective: OptimisationObjective,
): number {
  return objective === "dwellings" ? variant.dwellingYield.total : variant.gfa;
}

interface WinnerCandidate {
  pattern: PatternEligibilityResult;
  variant: VariantMatch;
  metric: number;
}

function findBestVariantForPattern(
  pattern: PatternEligibilityResult,
  objective: OptimisationObjective,
  isVariantPlaceable?: IsVariantPlaceable,
): WinnerCandidate | null {
  let best: WinnerCandidate | null = null;
  for (const variant of pattern.matchingVariants) {
    if (
      isVariantPlaceable &&
      !isVariantPlaceable(pattern.patternId, variant)
    ) {
      continue;
    }
    const metric = metricFor(variant, objective);
    if (best === null || metric > best.metric) {
      best = { pattern, variant, metric };
    }
  }
  return best;
}

function findBestPatternForProperty(
  eligiblePatterns: PatternEligibilityResult[],
  objective: OptimisationObjective,
  isVariantPlaceable?: IsVariantPlaceable,
): WinnerCandidate | null {
  let best: WinnerCandidate | null = null;
  for (const pattern of eligiblePatterns) {
    if (pattern.matchingVariants.length === 0) continue;
    const candidate = findBestVariantForPattern(
      pattern,
      objective,
      isVariantPlaceable,
    );
    if (candidate === null) continue;
    if (best === null || candidate.metric > best.metric) {
      best = candidate;
    }
  }
  return best;
}

/**
 * Picks the best (pattern, variant) per eligible site in the shortlist,
 * optimising for either total dwellings or total GFA. Metric comes from
 * `VariantMatch.dwellingYield.total` / `VariantMatch.gfa` — i.e. the
 * pre-placement variant spec, not a real flow-DAG run. Callers should
 * feed the resulting selections into `usePatternPlacementBatch` to
 * materialise them on the map via the Giraffe flow DAG.
 */
export function optimisePatternSelection(
  analysisResult: ShortlistPatternAnalysisResult,
  objective: OptimisationObjective,
  options: OptimisePatternSelectionOptions = {},
): OptimisationSummary {
  const { isVariantPlaceable } = options;
  const selections: OptimisedPatternSelection[] = [];
  let skippedSiteCount = 0;

  for (const property of Object.values(analysisResult.propertyResults)) {
    const winner = findBestPatternForProperty(
      property.eligiblePatterns,
      objective,
      isVariantPlaceable,
    );
    if (winner === null) {
      skippedSiteCount += 1;
      continue;
    }
    selections.push({
      featureId: property.featureId,
      address: property.address,
      patternId: winner.pattern.patternId,
      patternName: winner.pattern.patternName,
      architect: winner.pattern.architect,
      variant: winner.variant,
      projectedDwellings: winner.variant.dwellingYield.total,
      projectedGfa: winner.variant.gfa,
    });
  }

  const totalProjectedDwellings = selections.reduce(
    (acc, selection) => acc + selection.projectedDwellings,
    0,
  );
  const totalProjectedGfa = selections.reduce(
    (acc, selection) => acc + selection.projectedGfa,
    0,
  );

  return {
    selections,
    totalProjectedDwellings,
    totalProjectedGfa,
    placeableSiteCount: selections.length,
    skippedSiteCount,
  };
}
