import type { CSSProperties } from 'react';
import { LANDIQ_THEME } from '@/components/ui/landiq/theme';
import type { ResultsViewMode } from '@/apps/patternBook/types/shortlistAnalysis';

interface ViewModeToggleProps {
  mode: ResultsViewMode;
  onChange: (mode: ResultsViewMode) => void;
  disabled?: boolean;
}

const VIEW_OPTIONS: { value: ResultsViewMode; label: string }[] = [
  { value: 'summary', label: 'Summary' },
  { value: 'by-pattern', label: 'By Pattern' },
  { value: 'by-property', label: 'By Property' },
  { value: 'matrix', label: 'Matrix' },
];

const styles = {
  container: {
    display: 'flex',
    borderRadius: LANDIQ_THEME.borders.buttonRadius,
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
  button: (isActive: boolean, disabled: boolean, isLast: boolean): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${LANDIQ_THEME.spacing.xs} ${LANDIQ_THEME.spacing.sm}`,
    border: 'none',
    borderRight: isLast ? 'none' : `1px solid ${LANDIQ_THEME.colors.greys.light}`,
    fontFamily: LANDIQ_THEME.typography.fontFamily,
    fontSize: LANDIQ_THEME.typography.fontSize.xs,
    fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    backgroundColor: isActive ? LANDIQ_THEME.colors.brand.dark : LANDIQ_THEME.colors.greys.white,
    color: isActive ? LANDIQ_THEME.colors.text.light : LANDIQ_THEME.colors.text.muted,
    opacity: disabled ? 0.6 : 1,
    transition: 'all 0.15s ease',
  }),
};

export function ViewModeToggle({
  mode,
  onChange,
  disabled = false,
}: Readonly<ViewModeToggleProps>): JSX.Element {
  return (
    <fieldset style={styles.container}>
      <legend style={styles.legend}>View mode</legend>
      {VIEW_OPTIONS.map((option, index) => (
        <button
          key={option.value}
          type="button"
          style={styles.button(mode === option.value, disabled, index === VIEW_OPTIONS.length - 1)}
          onClick={() => onChange(option.value)}
          disabled={disabled}
          title={option.label}
          aria-pressed={mode === option.value}
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  );
}
