import type { CSSProperties, FC } from 'react';
import { Loader2 } from 'lucide-react';
import { LANDIQ_THEME } from '@/components/ui/landiq/theme';
import { Button } from '@/components/ui/landiq';
import { ShortlistSelector } from '@/components/shared/ShortlistSelector';
import type { AnalysisProgress } from '@/apps/patternBook/types/shortlistAnalysis';
import type { ShortlistLayer } from '@/types/domain/shortlist';

interface SelectionSummaryProps {
  propertyCount: number;
  isLoading: boolean;
  isLoadingShortlists: boolean;
  isAnalysing: boolean;
  progress: AnalysisProgress | null;
  availableShortlists: ShortlistLayer[];
  selectedShortlist: ShortlistLayer | null;
  onSelectShortlist: (shortlist: ShortlistLayer) => void;
  onClearSelection: () => void;
  onCancelAnalysis: () => void;
  error?: string | null;
}

const styles = {
  container: {
    padding: '12px',
    backgroundColor: LANDIQ_THEME.colors.greys.offWhite,
    borderRadius: '8px',
    marginBottom: '12px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    marginBottom: '8px',
  },
  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: LANDIQ_THEME.colors.text.dark,
  },
  statValue: {
    fontWeight: 600,
  },
  buttonGroup: {
    display: 'flex',
    gap: '8px',
  },
  shortlistSelectorContainer: {
    marginBottom: '12px',
  },
  shortlistLabel: {
    fontSize: '12px',
    fontWeight: 500,
    color: LANDIQ_THEME.colors.text.dark,
    marginBottom: '6px',
  },
  progressContainer: {
    marginTop: '8px',
  },
  progressHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  progressBar: {
    height: '4px',
    backgroundColor: LANDIQ_THEME.colors.greys.light,
    borderRadius: LANDIQ_THEME.border.radius.xs,
    overflow: 'hidden',
    marginBottom: '6px',
  },
  progressFill: (percentage: number): CSSProperties => ({
    height: '100%',
    width: `${percentage}%`,
    backgroundColor: LANDIQ_THEME.colors.brand.supplementary,
    transition: 'width 0.3s ease',
  }),
  progressText: {
    fontSize: '11px',
    color: LANDIQ_THEME.colors.text.muted,
  },
  progressFooterRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '4px',
  },
  error: {
    padding: '8px 12px',
    backgroundColor: LANDIQ_THEME.colors.error.light,
    color: LANDIQ_THEME.colors.status.error,
    borderRadius: LANDIQ_THEME.border.radius.md,
    fontSize: '12px',
    marginTop: '8px',
  },
};

export const SelectionSummary: FC<SelectionSummaryProps> = ({
  propertyCount,
  isLoading,
  isLoadingShortlists,
  isAnalysing,
  progress,
  availableShortlists,
  selectedShortlist,
  onSelectShortlist,
  onClearSelection,
  onCancelAnalysis,
  error,
}) => {
  const progressPercentage =
    progress != null && progress.total > 0
      ? (progress.current / progress.total) * 100
      : 0;

  return (
    <div style={styles.container}>
      <div style={styles.shortlistSelectorContainer}>
        <div style={styles.shortlistLabel}>Select Shortlist</div>
        <ShortlistSelector
          shortlists={availableShortlists}
          selectedShortlist={selectedShortlist}
          onSelect={onSelectShortlist}
          loading={isLoadingShortlists || isLoading}
          placeholder="Choose a shortlist..."
          emptyMessage="No shortlists found in project"
        />
      </div>

      <div style={styles.row}>
        <div style={styles.stat}>
          <span>Selected Properties:</span>
          <span style={styles.statValue}>{propertyCount}</span>
        </div>
        <div style={styles.buttonGroup}>
          {propertyCount > 0 && !isAnalysing && (
            <Button variant="text" size="small" onClick={onClearSelection}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {isAnalysing && (
        <div style={styles.buttonGroup}>
          <Button variant="outline" size="small" onClick={onCancelAnalysis}>
            Cancel
          </Button>
        </div>
      )}

      {isAnalysing && progress && (
        <div style={styles.progressContainer}>
          <div style={styles.progressHeaderRow}>
            <Loader2
              size={16}
              className="animate-spin"
              color={LANDIQ_THEME.colors.brand.supplementary}
            />
            <div style={styles.progressText}>
              {progress.phase === 'loading' ? (
                progress.currentPropertyAddress
              ) : (
                <>
                  Analysing {progress.current} of {progress.total}
                  {progress.currentPropertyAddress && ` - ${progress.currentPropertyAddress}`}
                </>
              )}
            </div>
          </div>
          <div style={styles.progressBar}>
            <div
              style={styles.progressFill(
                progress.phase === 'loading'
                  ? (progress.loadingProgress ?? 0)
                  : progressPercentage
              )}
            />
          </div>
          <div style={styles.progressFooterRow}>
            <span style={styles.progressText}>
              {progress.phase === 'loading' ? 'Loading spatial data' : 'Analysing properties'}
            </span>
            <span style={styles.progressText}>
              {progress.phase === 'loading'
                ? `${progress.loadingProgress ?? 0}%`
                : `${Math.round(progressPercentage)}%`}
            </span>
          </div>
        </div>
      )}

      {error && <div style={styles.error}>{error}</div>}
    </div>
  );
};
