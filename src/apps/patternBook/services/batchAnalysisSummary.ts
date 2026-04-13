import type {
  ShortlistSummary,
  PatternPropertyAnalysis,
  PropertyPatternAnalysis,
  PatternRanking,
  ReasonCount,
  ZoneDwellingStats,
} from "@/apps/patternBook/types/shortlistAnalysis";
import {
  ELIGIBLE_MAJORITY_FRACTION,
  RANKED_LIST_LIMIT,
  RESIDENTIAL_ZONES_FOR_DWELLING_STATS,
} from "@/apps/patternBook/services/batchAnalysisConstants";

export function calculateSummary(
  propertyResults: Record<string, PropertyPatternAnalysis>,
  patternResults: Record<string, PatternPropertyAnalysis>,
  totalProperties: number,
  totalPatterns: number,
): ShortlistSummary {
  let eligiblePropertyCount = 0;
  let ineligiblePropertyCount = 0;
  let partiallyEligibleCount = 0;
  let totalCurrentDwellings = 0;
  let totalPotentialDwellings = 0;
  let totalPotentialGfa = 0;

  const reasonCounts: Record<string, number> = {};
  const zoneStats: Record<string, { current: number; potential: number; count: number }> = {};

  for (const analysis of Object.values(propertyResults)) {
    const eligibleCount = analysis.eligiblePatterns.length;

    if (eligibleCount === 0) {
      ineligiblePropertyCount++;
      const propertyReasons = new Set<string>();
      for (const ineligible of analysis.ineligiblePatterns) {
        for (const reason of ineligible.ineligibleReasons) {
          propertyReasons.add(reason);
        }
      }
      for (const reason of propertyReasons) {
        reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
      }
    } else if (eligibleCount >= totalPatterns * ELIGIBLE_MAJORITY_FRACTION) {
      eligiblePropertyCount++;
    } else {
      partiallyEligibleCount++;
    }

    const effectivePotential = Math.max(analysis.currentDwellings, analysis.maxDwellings);

    totalCurrentDwellings += analysis.currentDwellings;
    totalPotentialDwellings += effectivePotential;
    totalPotentialGfa += analysis.maxGfa;

    const zone = analysis.zoneCode ?? "Unknown";
    const existing = zoneStats[zone] ?? {
      current: 0,
      potential: 0,
      count: 0,
    };
    zoneStats[zone] = {
      current: existing.current + analysis.currentDwellings,
      potential: existing.potential + effectivePotential,
      count: existing.count + 1,
    };
  }

  const totalDwellingUplift = Math.max(0, totalPotentialDwellings - totalCurrentDwellings);

  const dwellingsByZone: ZoneDwellingStats[] = RESIDENTIAL_ZONES_FOR_DWELLING_STATS.filter(
    (zone) => zone in zoneStats,
  ).map((zone) => {
    const stats = zoneStats[zone];
    if (!stats) {
      throw new Error(`Zone stats not found for zone: ${zone}`);
    }
    return {
      zone,
      currentDwellings: stats.current,
      potentialDwellings: stats.potential,
      uplift: Math.max(0, stats.potential - stats.current),
      propertyCount: stats.count,
    };
  });

  const topPatterns: PatternRanking[] = Object.values(patternResults)
    .sort((a, b) => b.eligibleProperties.length - a.eligibleProperties.length)
    .slice(0, RANKED_LIST_LIMIT)
    .map((p) => ({
      patternId: p.patternId,
      patternName: p.patternName,
      architect: p.architect,
      eligiblePropertyCount: p.eligibleProperties.length,
      totalPotentialDwellings: p.totalPotentialDwellings,
      totalPotentialGfa: p.eligibleProperties.reduce((sum, prop) => sum + (prop.bestVariant?.gfa ?? 0), 0),
    }));

  const commonIneligibilityReasons: ReasonCount[] = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, RANKED_LIST_LIMIT)
    .map(([reason, count]) => ({
      reason,
      count,
      percentage: (count / totalProperties) * 100,
    }));

  return {
    eligiblePropertyCount,
    ineligiblePropertyCount,
    partiallyEligibleCount,
    totalCurrentDwellings,
    totalPotentialDwellings,
    totalDwellingUplift,
    totalPotentialGfa,
    dwellingsByZone,
    topPatterns,
    commonIneligibilityReasons,
  };
}
