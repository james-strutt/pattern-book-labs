/**
 * Utility functions for extracting and calculating metrics from pattern variants
 */

import type {
  DwellingYield,
  VariantMatch,
} from "@/apps/patternBook/types/patternBook";


/**
 * Calculate total number of dwellings from a dwelling yield breakdown
 */
export function calculateTotalDwellings(dwellingYield: DwellingYield): number {
  // Use the total if provided, otherwise sum individual types
  if (dwellingYield.total > 0) {
    return dwellingYield.total;
  }

  return (
    (dwellingYield.studio ?? 0) +
    (dwellingYield.oneBed ?? 0) +
    (dwellingYield.twoBed ?? 0) +
    (dwellingYield.threeBed ?? 0) +
    (dwellingYield.fourBed ?? 0)
  );
}

/**
 * Dwelling mix percentages by type
 */
export interface DwellingMixPercentages {
  studio: number;
  oneBed: number;
  twoBed: number;
  threeBed: number;
  fourBed: number;
}

/**
 * Calculate dwelling mix as percentages
 */
export function calculateDwellingMix(
  dwellingYield: DwellingYield,
): DwellingMixPercentages {
  const total = calculateTotalDwellings(dwellingYield);

  if (total === 0) {
    return {
      studio: 0,
      oneBed: 0,
      twoBed: 0,
      threeBed: 0,
      fourBed: 0,
    };
  }

  return {
    studio: ((dwellingYield.studio ?? 0) / total) * 100,
    oneBed: ((dwellingYield.oneBed ?? 0) / total) * 100,
    twoBed: ((dwellingYield.twoBed ?? 0) / total) * 100,
    threeBed: ((dwellingYield.threeBed ?? 0) / total) * 100,
    fourBed: ((dwellingYield.fourBed ?? 0) / total) * 100,
  };
}

/**
 * Calculate average dwelling size from GFA and total dwellings
 */
export function calculateAverageDwellingSize(
  gfa: number,
  totalDwellings: number,
): number {
  if (totalDwellings <= 0 || gfa <= 0) {
    return 0;
  }

  return gfa / totalDwellings;
}


/**
 * Get the best variant by GFA for a pattern
 */
export function getBestVariantByGfa(
  variants: VariantMatch[],
): VariantMatch | null {
  if (variants.length === 0) return null;

  return variants.reduce((best, current) =>
    current.gfa > best.gfa ? current : best,
  );
}

/**
 * Get the best variant by dwelling yield for a pattern
 */
export function getBestVariantByDwellings(
  variants: VariantMatch[],
): VariantMatch | null {
  if (variants.length === 0) return null;

  return variants.reduce((best, current) => {
    const currentTotal = calculateTotalDwellings(current.dwellingYield);
    const bestTotal = calculateTotalDwellings(best.dwellingYield);
    return currentTotal > bestTotal ? current : best;
  });
}

/**
 * Get the best variant by fit score for a pattern
 */
export function getBestVariantByFitScore(
  variants: VariantMatch[],
): VariantMatch | null {
  if (variants.length === 0) return null;

  return variants.reduce((best, current) =>
    current.fitScore > best.fitScore ? current : best,
  );
}

/**
 * Calculate weighted average dwelling size based on mix and typical sizes
 */
export function calculateWeightedDwellingSize(
  dwellingYield: DwellingYield,
): number {
  // Typical apartment sizes by type (m2)
  const typicalSizes = {
    studio: 35,
    oneBed: 50,
    twoBed: 70,
    threeBed: 95,
    fourBed: 120,
  };

  const total = calculateTotalDwellings(dwellingYield);

  if (total === 0) {
    return 75; // Default average
  }

  const weightedSum =
    (dwellingYield.studio ?? 0) * typicalSizes.studio +
    (dwellingYield.oneBed ?? 0) * typicalSizes.oneBed +
    (dwellingYield.twoBed ?? 0) * typicalSizes.twoBed +
    (dwellingYield.threeBed ?? 0) * typicalSizes.threeBed +
    (dwellingYield.fourBed ?? 0) * typicalSizes.fourBed;

  return weightedSum / total;
}

/**
 * Estimate NSA from GFA using typical efficiency ratio
 */
export function estimateNsaFromGfa(gfa: number, efficiencyRatio = 0.85): number {
  return gfa * efficiencyRatio;
}

