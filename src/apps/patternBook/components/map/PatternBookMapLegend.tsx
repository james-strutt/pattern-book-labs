import React from 'react';
import { LANDIQ_THEME } from '@/components/ui/landiq/theme';
import { MAP_COLOURS } from '@/apps/patternBook/constants/patternBookMapStyles';

interface PatternBookMapLegendProps {
  eligibilityCounts: {
    eligible: number;
    partial: number;
    ineligible: number;
  };
  isVisible?: boolean;
  isPatternFiltered?: boolean;
}

type EligibilityCountKey = keyof PatternBookMapLegendProps['eligibilityCounts'];

interface LegendRow {
  countKey: EligibilityCountKey;
  color: string;
  label: string;
}

const LEGEND_ROWS_FILTERED: readonly LegendRow[] = [
  { countKey: 'eligible', color: MAP_COLOURS.ELIGIBLE_FILL, label: 'Eligible' },
  { countKey: 'ineligible', color: MAP_COLOURS.INELIGIBLE_FILL, label: 'Ineligible' },
];

const LEGEND_ROWS_FULL: readonly LegendRow[] = [
  { countKey: 'eligible', color: MAP_COLOURS.ELIGIBLE_FILL, label: 'Fully Eligible' },
  { countKey: 'partial', color: MAP_COLOURS.PARTIAL_FILL, label: 'Partially Eligible' },
  { countKey: 'ineligible', color: MAP_COLOURS.INELIGIBLE_FILL, label: 'Ineligible' },
];

const styles = {
  container: {
    backgroundColor: LANDIQ_THEME.colors.greys.white,
    borderRadius: LANDIQ_THEME.border.radius.md,
    padding: '12px',
    boxShadow: LANDIQ_THEME.shadows.dropdown,
    minWidth: '160px',
  },
  title: {
    fontSize: LANDIQ_THEME.typography.fontSize.xs,
    fontWeight: LANDIQ_THEME.typography.fontWeight.semibold,
    color: LANDIQ_THEME.colors.text.dark,
    marginBottom: '10px',
  },
  legendItems: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: LANDIQ_THEME.spacing.sm,
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: LANDIQ_THEME.spacing.sm,
  },
  colorBox: (color: string): React.CSSProperties => ({
    width: '16px',
    height: '16px',
    borderRadius: LANDIQ_THEME.border.radius.sm,
    backgroundColor: color,
    border: `1px solid ${LANDIQ_THEME.colors.greys.light}`,
    flexShrink: 0,
  }),
  label: {
    fontSize: '11px',
    color: LANDIQ_THEME.colors.text.muted,
    flex: 1,
  },
  count: {
    fontSize: '11px',
    fontWeight: LANDIQ_THEME.typography.fontWeight.semibold,
    color: LANDIQ_THEME.colors.text.dark,
    minWidth: '20px',
    textAlign: 'right' as const,
  },
  divider: {
    height: '1px',
    backgroundColor: LANDIQ_THEME.colors.greys.light,
    margin: `${LANDIQ_THEME.spacing.sm} 0`,
  },
  totalRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: '11px',
    fontWeight: LANDIQ_THEME.typography.fontWeight.semibold,
    color: LANDIQ_THEME.colors.text.dark,
  },
  totalCount: {
    fontSize: LANDIQ_THEME.typography.fontSize.xs,
    fontWeight: LANDIQ_THEME.typography.fontWeight.bold,
    color: LANDIQ_THEME.colors.brand.supplementary,
  },
};

export const PatternBookMapLegend: React.FC<PatternBookMapLegendProps> = ({
  eligibilityCounts,
  isVisible = true,
  isPatternFiltered = false,
}) => {
  if (!isVisible) return null;

  const total =
    eligibilityCounts.eligible + eligibilityCounts.partial + eligibilityCounts.ineligible;
  const rows = isPatternFiltered ? LEGEND_ROWS_FILTERED : LEGEND_ROWS_FULL;

  return (
    <div style={styles.container}>
      <div style={styles.title}>Pattern Eligibility</div>
      <div style={styles.legendItems}>
        {rows.map((row) => (
          <div key={row.countKey} style={styles.legendItem}>
            <div style={styles.colorBox(row.color)} />
            <span style={styles.label}>{row.label}</span>
            <span style={styles.count}>{eligibilityCounts[row.countKey]}</span>
          </div>
        ))}
      </div>
      <div style={styles.divider} />
      <div style={styles.totalRow}>
        <span style={styles.totalLabel}>Total Properties</span>
        <span style={styles.totalCount}>{total}</span>
      </div>
    </div>
  );
};
