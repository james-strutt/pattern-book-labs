import { useMemo, type CSSProperties, type FC } from 'react';
import { Button } from '@/components/ui/landiq';
import { LANDIQ_THEME } from '@/components/ui/landiq/theme';
import { cn } from '@/lib/utils';
import type {
  ShortlistPatternAnalysisResult,
  EligibilityCell,
} from '@/apps/patternBook/types/shortlistAnalysis';

interface EligibilityMatrixViewProps {
  results: ShortlistPatternAnalysisResult;
  onCellClick?: (patternId: string, propertyId: string) => void;
  onExport?: () => void;
}

const styles = {
  container: {
    padding: `${LANDIQ_THEME.spacing.sm} 0`,
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: LANDIQ_THEME.spacing.md,
    padding: `${LANDIQ_THEME.spacing.sm} ${LANDIQ_THEME.spacing.md}`,
    backgroundColor: LANDIQ_THEME.colors.greys.offWhite,
    borderRadius: LANDIQ_THEME.border.radius.md,
  },
  toolbarInfo: {
    fontSize: LANDIQ_THEME.typography.fontSize.xs,
    color: LANDIQ_THEME.colors.text.muted,
  },
  tableWrapper: {
    minWidth: 0,
    overflowX: 'auto' as const,
    border: `1px solid ${LANDIQ_THEME.colors.greys.light}`,
    borderRadius: LANDIQ_THEME.border.radius.md,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '11px',
  },
  headerCell: {
    padding: '10px 8px',
    backgroundColor: LANDIQ_THEME.colors.greys.offWhite,
    borderBottom: `2px solid ${LANDIQ_THEME.colors.greys.light}`,
    fontWeight: LANDIQ_THEME.typography.fontWeight.semibold,
    color: LANDIQ_THEME.colors.text.dark,
    textAlign: 'left' as const,
    position: 'sticky' as const,
    top: 0,
    zIndex: 1,
  },
  patternHeader: {
    maxWidth: '120px',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    writingMode: 'vertical-rl' as const,
    transform: 'rotate(180deg)',
    height: '100px',
    padding: `${LANDIQ_THEME.spacing.sm} ${LANDIQ_THEME.spacing.xs}`,
    textAlign: 'center' as const,
  },
  propertyCell: {
    padding: LANDIQ_THEME.spacing.sm,
    borderBottom: `1px solid ${LANDIQ_THEME.colors.greys.light}`,
    maxWidth: '200px',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    position: 'sticky' as const,
    left: 0,
    backgroundColor: LANDIQ_THEME.colors.greys.white,
    zIndex: 1,
  },
  matrixCell: (isEligible: boolean, isClickable: boolean): CSSProperties => ({
    padding: '6px',
    borderBottom: `1px solid ${LANDIQ_THEME.colors.greys.light}`,
    borderLeft: `1px solid ${LANDIQ_THEME.colors.greys.light}`,
    textAlign: 'center' as const,
    backgroundColor: isEligible
      ? LANDIQ_THEME.colors.success.light
      : LANDIQ_THEME.colors.greys.offWhite,
    cursor: isClickable ? 'pointer' : 'default',
    outline: 'none',
  }),
  eligibilityIndicator: (isEligible: boolean): CSSProperties => ({
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isEligible
      ? LANDIQ_THEME.colors.status.success
      : LANDIQ_THEME.colors.greys.mid,
    color: LANDIQ_THEME.colors.greys.white,
    fontSize: '10px',
    fontWeight: LANDIQ_THEME.typography.fontWeight.semibold,
  }),
  summaryRow: {
    backgroundColor: LANDIQ_THEME.colors.greys.offWhite,
    fontWeight: LANDIQ_THEME.typography.fontWeight.semibold,
  },
  summaryCell: {
    padding: LANDIQ_THEME.spacing.sm,
    borderTop: `2px solid ${LANDIQ_THEME.colors.greys.light}`,
    textAlign: 'center' as const,
  },
  legend: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: LANDIQ_THEME.spacing.md,
    marginTop: LANDIQ_THEME.spacing.md,
    padding: `${LANDIQ_THEME.spacing.sm} ${LANDIQ_THEME.spacing.md}`,
    backgroundColor: LANDIQ_THEME.colors.greys.offWhite,
    borderRadius: LANDIQ_THEME.border.radius.md,
    fontSize: '11px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  legendDot: (color: string): CSSProperties => ({
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: color,
  }),
  emptyState: {
    padding: `${LANDIQ_THEME.spacing.lg} ${LANDIQ_THEME.spacing.md}`,
    textAlign: 'center' as const,
    color: LANDIQ_THEME.colors.text.muted,
    fontSize: LANDIQ_THEME.typography.fontSize.sm,
  },
};

interface PatternInfo {
  id: string;
  name: string;
}

interface PropertyInfo {
  id: string;
  address: string;
  siteArea: number;
}

function computeEligibilityTotals(
  patterns: PatternInfo[],
  properties: PropertyInfo[],
  eligibilityMatrix: ShortlistPatternAnalysisResult['eligibilityMatrix']
): { patternTotals: Record<string, number>; propertyTotals: Record<string, number> } {
  const patternTotals = Object.fromEntries(patterns.map((p) => [p.id, 0])) as Record<string, number>;
  const propertyTotals = Object.fromEntries(properties.map((p) => [p.id, 0])) as Record<string, number>;

  for (const property of properties) {
    const row = eligibilityMatrix.data[property.id];
    if (!row) continue;
    for (const pattern of patterns) {
      if (row[pattern.id]?.isEligible) {
        patternTotals[pattern.id]++;
        propertyTotals[property.id]++;
      }
    }
  }
  return { patternTotals, propertyTotals };
}

export const EligibilityMatrixView: FC<EligibilityMatrixViewProps> = ({
  results,
  onCellClick,
  onExport,
}) => {
  const { patterns, properties, patternTotals, propertyTotals, matrixData } = useMemo(() => {
    const patternList: PatternInfo[] = Object.values(results.patternResults).map((p) => ({
      id: p.patternId,
      name: p.patternName,
    }));

    const propertyList: PropertyInfo[] = Object.values(results.propertyResults).map((p) => ({
      id: p.featureId,
      address: p.address,
      siteArea: p.siteArea,
    }));

    const { patternTotals: pt, propertyTotals: vt } = computeEligibilityTotals(
      patternList,
      propertyList,
      results.eligibilityMatrix
    );

    return {
      patterns: patternList,
      properties: propertyList,
      patternTotals: pt,
      propertyTotals: vt,
      matrixData: results.eligibilityMatrix.data,
    };
  }, [results]);

  if (properties.length === 0 || patterns.length === 0) {
    return <div style={styles.emptyState}>No data available for matrix view</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.toolbar}>
        <span style={styles.toolbarInfo}>
          {properties.length} properties × {patterns.length} patterns
        </span>
        {onExport && (
          <Button type="button" variant="primary" size="small" onClick={onExport}>
            Export CSV
          </Button>
        )}
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.headerCell, position: 'sticky', left: 0, zIndex: 2 }}>Property</th>
              {patterns.map((pattern) => (
                <th key={pattern.id} style={styles.headerCell}>
                  <div style={styles.patternHeader} title={pattern.name}>
                    {pattern.name}
                  </div>
                </th>
              ))}
              <th style={styles.headerCell}>Total</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((property) => (
              <tr key={property.id}>
                <td style={styles.propertyCell} title={property.address}>
                  {property.address}
                </td>
                {patterns.map((pattern) => {
                  const cell: EligibilityCell | undefined = matrixData[property.id]?.[pattern.id];
                  const isEligible = cell?.isEligible ?? false;
                  const cellTitle = isEligible
                    ? `${pattern.name} is eligible for ${property.address}`
                    : `${pattern.name} is not eligible for ${property.address}`;

                  const cellContent = (
                    <span style={styles.eligibilityIndicator(isEligible)}>
                      {isEligible ? '✓' : '×'}
                    </span>
                  );

                  return (
                    <td
                      key={`${pattern.id}-${property.id}`}
                      style={styles.matrixCell(isEligible, Boolean(onCellClick))}
                      title={cellTitle}
                    >
                      {onCellClick ? (
                        <button
                          type="button"
                          className={cn(
                            'flex h-full w-full cursor-pointer items-center justify-center border-none bg-transparent p-0',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0085B3] focus-visible:ring-offset-2',
                          )}
                          onClick={() => {
                            onCellClick(pattern.id, property.id);
                          }}
                          title={cellTitle}
                        >
                          {cellContent}
                        </button>
                      ) : (
                        cellContent
                      )}
                    </td>
                  );
                })}
                <td style={{ ...styles.summaryCell, backgroundColor: LANDIQ_THEME.colors.greys.white }}>
                  {propertyTotals[property.id] ?? 0}
                </td>
              </tr>
            ))}
            <tr style={styles.summaryRow}>
              <td style={{ ...styles.propertyCell, ...styles.summaryRow }}>Eligible Properties</td>
              {patterns.map((pattern) => (
                <td key={`total-${pattern.id}`} style={styles.summaryCell}>
                  {patternTotals[pattern.id] ?? 0}
                </td>
              ))}
              <td style={styles.summaryCell}>-</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <span style={styles.legendDot(LANDIQ_THEME.colors.status.success)} />
          <span>Eligible</span>
        </div>
        <div style={styles.legendItem}>
          <span style={styles.legendDot(LANDIQ_THEME.colors.greys.mid)} />
          <span>Not Eligible</span>
        </div>
      </div>
    </div>
  );
};
