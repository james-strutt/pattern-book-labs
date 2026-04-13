import React, { useState, useMemo } from 'react';
import { LANDIQ_THEME } from '@/components/ui/landiq/theme';
import type { PatternPropertyAnalysis } from '@/apps/patternBook/types/shortlistAnalysis';
import { PatternCentricCard } from './PatternCentricCard';

interface PatternCentricViewProps {
  patternResults: Record<string, PatternPropertyAnalysis>;
  selectedPatternId?: string | null;
  onPropertyClick?: (featureId: string) => void;
  onPatternSelect?: (patternId: string | null) => void;
  isLotBased?: boolean;
}

const styles = {
  container: {
    padding: `${LANDIQ_THEME.spacing.sm} 0`,
  },
  filterBar: {
    display: 'flex',
    alignItems: 'center',
    gap: LANDIQ_THEME.spacing.sm,
    marginBottom: LANDIQ_THEME.spacing.sm,
    padding: `${LANDIQ_THEME.spacing.xs} ${LANDIQ_THEME.spacing.sm}`,
    backgroundColor: LANDIQ_THEME.colors.greys.offWhite,
    borderRadius: LANDIQ_THEME.borders.buttonRadius,
  },
  filterLabel: {
    fontFamily: LANDIQ_THEME.typography.fontFamily,
    fontSize: LANDIQ_THEME.typography.fontSize.xs,
    color: LANDIQ_THEME.colors.text.muted,
  },
  filterSelect: {
    fontFamily: LANDIQ_THEME.typography.fontFamily,
    padding: `${LANDIQ_THEME.spacing.xs} ${LANDIQ_THEME.spacing.sm}`,
    fontSize: LANDIQ_THEME.typography.fontSize.xs,
    border: `1px solid ${LANDIQ_THEME.colors.greys.light}`,
    borderRadius: LANDIQ_THEME.border.radius.sm,
    backgroundColor: LANDIQ_THEME.colors.greys.white,
  },
  patternList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: LANDIQ_THEME.spacing.sm,
  },
  emptyState: {
    padding: LANDIQ_THEME.spacing.lg,
    textAlign: 'center' as const,
    fontFamily: LANDIQ_THEME.typography.fontFamily,
    color: LANDIQ_THEME.colors.text.muted,
    fontSize: LANDIQ_THEME.typography.fontSize.sm,
  },
  clearMapFilterButton: {
    marginLeft: 'auto',
    padding: `${LANDIQ_THEME.spacing.xs} ${LANDIQ_THEME.spacing.sm}`,
    fontSize: LANDIQ_THEME.typography.fontSize.xs,
    backgroundColor: LANDIQ_THEME.colors.greys.white,
    border: `1px solid ${LANDIQ_THEME.colors.greys.light}`,
    borderRadius: LANDIQ_THEME.border.radius.sm,
    cursor: 'pointer',
  },
};

export const PatternCentricView: React.FC<PatternCentricViewProps> = ({
  patternResults,
  selectedPatternId,
  onPropertyClick,
  onPatternSelect,
  isLotBased = false,
}) => {
  const [minProperties, setMinProperties] = useState(0);
  const [sortBy, setSortBy] = useState<'coverage' | 'dwellings' | 'name'>('coverage');

  const effectiveSortBy = useMemo(() => {
    if (isLotBased && sortBy === 'dwellings') {
      return 'coverage';
    }
    return sortBy;
  }, [isLotBased, sortBy]);

  const sortedPatterns = useMemo(() => {
    const patterns = Object.values(patternResults)
      .filter(p => p.eligibleProperties.length >= minProperties);

    switch (effectiveSortBy) {
      case 'coverage':
        return patterns.sort((a, b) => b.coveragePercentage - a.coveragePercentage);
      case 'dwellings':
        return patterns.sort((a, b) => b.totalPotentialDwellings - a.totalPotentialDwellings);
      case 'name':
        return patterns.sort((a, b) => a.patternName.localeCompare(b.patternName));
      default:
        return patterns;
    }
  }, [patternResults, minProperties, effectiveSortBy]);

  const handlePatternSelect = (patternId: string): void => {
    const newSelection = selectedPatternId === patternId ? null : patternId;
    onPatternSelect?.(newSelection);
  };

  return (
    <div style={styles.container}>
      <div style={styles.filterBar}>
        <span style={styles.filterLabel}>Min. properties:</span>
        <select
          style={styles.filterSelect}
          value={minProperties}
          onChange={(e) => setMinProperties(Number(e.target.value))}
        >
          <option value={0}>All patterns</option>
          <option value={1}>1+ properties</option>
          <option value={3}>3+ properties</option>
          <option value={5}>5+ properties</option>
        </select>

        <span style={styles.filterLabel}>Sort by:</span>
        <select
          style={styles.filterSelect}
          value={effectiveSortBy}
          onChange={(e) => setSortBy(e.target.value as 'coverage' | 'dwellings' | 'name')}
        >
          <option value="coverage">Coverage</option>
          {!isLotBased && <option value="dwellings">Dwellings</option>}
          <option value="name">Name</option>
        </select>

        {selectedPatternId && (
          <button
            type="button"
            onClick={() => onPatternSelect?.(null)}
            style={styles.clearMapFilterButton}
          >
            Clear map filter
          </button>
        )}
      </div>

      <div style={styles.patternList}>
        {sortedPatterns.map(pattern => (
          <PatternCentricCard
            key={pattern.patternId}
            pattern={pattern}
            isSelected={selectedPatternId === pattern.patternId}
            onPropertyClick={onPropertyClick}
            onSelect={() => handlePatternSelect(pattern.patternId)}
            isLotBased={isLotBased}
          />
        ))}
      </div>

      {sortedPatterns.length === 0 && (
        <div style={styles.emptyState}>
          No patterns match the current filter criteria
        </div>
      )}
    </div>
  );
};
