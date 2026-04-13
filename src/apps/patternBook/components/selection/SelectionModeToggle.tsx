import { Fragment, type CSSProperties, type FC } from 'react';
import { LANDIQ_THEME } from '@/components/ui/landiq/theme';
import type { SelectionMode } from '@/apps/patternBook/types/shortlistAnalysis';

interface SelectionModeToggleProps {
  mode: SelectionMode;
  onChange: (mode: SelectionMode) => void;
  propertyCount: number;
  disabled?: boolean;
}

const MODE_SEGMENTS: readonly { mode: SelectionMode; label: string; title: string }[] = [
  { mode: 'single', label: 'Single', title: 'Analyse one property at a time' },
  { mode: 'shortlist', label: 'Shortlist', title: 'Analyse multiple properties from your shortlist' },
];

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: LANDIQ_THEME.spacing.sm,
    padding: `${LANDIQ_THEME.spacing.sm} 0`,
  },
  label: {
    fontSize: '13px',
    fontWeight: LANDIQ_THEME.typography.fontWeight.medium,
    color: LANDIQ_THEME.colors.text.light,
    marginRight: LANDIQ_THEME.spacing.sm,
  },
  toggleGroup: {
    display: 'flex',
    borderRadius: LANDIQ_THEME.border.radius.md,
    overflow: 'hidden',
    border: `1px solid ${LANDIQ_THEME.colors.greys.light}`,
    margin: 0,
    padding: 0,
  },
  legend: {
    position: 'absolute' as const,
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden' as const,
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap' as const,
    borderWidth: 0,
  },
  button: (isActive: boolean, disabled: boolean): CSSProperties => ({
    padding: '6px 12px',
    fontSize: LANDIQ_THEME.typography.fontSize.xs,
    fontWeight: LANDIQ_THEME.typography.fontWeight.medium,
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    backgroundColor: isActive
      ? LANDIQ_THEME.colors.brand.dark
      : LANDIQ_THEME.colors.greys.white,
    color: isActive
      ? LANDIQ_THEME.colors.text.light
      : LANDIQ_THEME.colors.text.muted,
    opacity: disabled ? 0.6 : 1,
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    gap: LANDIQ_THEME.spacing.xs,
  }),
  badge: {
    backgroundColor: `color-mix(in srgb, ${LANDIQ_THEME.colors.text.light} 20%, transparent)`,
    borderRadius: LANDIQ_THEME.border.radius.lg,
    padding: `1px ${LANDIQ_THEME.spacing.sm}`,
    fontSize: '11px',
    fontWeight: LANDIQ_THEME.typography.fontWeight.semibold,
  },
  divider: {
    width: '1px',
    backgroundColor: LANDIQ_THEME.colors.greys.light,
  },
};

export const SelectionModeToggle: FC<SelectionModeToggleProps> = ({
  mode,
  onChange,
  propertyCount,
  disabled = false,
}) => (
  <div style={styles.container}>
    <span style={styles.label}>Mode:</span>
    <fieldset style={styles.toggleGroup}>
      <legend style={styles.legend}>Selection mode</legend>
      {MODE_SEGMENTS.map((segment, index) => (
        <Fragment key={segment.mode}>
          {index > 0 ? <div style={styles.divider} /> : null}
          <button
            type="button"
            style={styles.button(mode === segment.mode, disabled)}
            onClick={() => onChange(segment.mode)}
            disabled={disabled}
            title={segment.title}
            aria-pressed={mode === segment.mode}
          >
            {segment.label}
            {segment.mode === 'shortlist' &&
              mode === 'shortlist' &&
              propertyCount > 0 && (
                <span style={styles.badge}>{propertyCount}</span>
              )}
          </button>
        </Fragment>
      ))}
    </fieldset>
  </div>
);
