import type { CSSProperties, FC } from 'react';
import { LANDIQ_THEME } from '@/components/ui/landiq/theme';
import type { PropertyPatternAnalysis, PropertyFeature } from '@/apps/patternBook/types/shortlistAnalysis';
import { getProp, FEATURE_PROP } from '@/constants/featureProps';
import * as turf from '@turf/turf';

interface ShortlistPropertyListProps {
  properties: PropertyFeature[];
  analysisResults?: Record<string, PropertyPatternAnalysis>;
  onRemove: (featureId: string) => void;
  onSelect: (feature: PropertyFeature) => void;
  selectedId?: string;
  maxHeight?: string;
}

const styles = {
  container: {
    border: `1px solid ${LANDIQ_THEME.colors.greys.light}`,
    borderRadius: LANDIQ_THEME.border.radius.md,
    overflow: 'hidden',
    backgroundColor: 'white',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    backgroundColor: LANDIQ_THEME.colors.greys.offWhite,
    borderBottom: `1px solid ${LANDIQ_THEME.colors.greys.light}`,
  },
  headerTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: LANDIQ_THEME.colors.text.dark,
  },
  headerCount: {
    fontSize: '12px',
    color: LANDIQ_THEME.colors.text.muted,
  },
  list: (maxHeight: string): CSSProperties => ({
    maxHeight,
    overflowY: 'auto' as const,
  }),
  row: (isSelected: boolean): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    padding: '10px 12px',
    borderBottom: `1px solid ${LANDIQ_THEME.colors.greys.light}`,
    backgroundColor: isSelected ? LANDIQ_THEME.colors.brand.light : 'white',
    transition: 'background-color 0.15s ease',
    width: '100%',
  }),
  selectTrigger: {
    flex: 1,
    minWidth: 0,
    display: 'block',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    textAlign: 'left' as const,
    fontFamily: 'inherit',
    fontSize: 'inherit',
    padding: 0,
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  address: {
    fontSize: '13px',
    fontWeight: 500,
    color: LANDIQ_THEME.colors.text.dark,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginBottom: '2px',
  },
  meta: {
    display: 'flex',
    gap: '8px',
    fontSize: '11px',
    color: LANDIQ_THEME.colors.text.muted,
  },
  badge: (isEligible: boolean): CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    padding: '2px 6px',
    borderRadius: LANDIQ_THEME.border.radius.lg,
    fontSize: '11px',
    fontWeight: 500,
    backgroundColor: isEligible ? LANDIQ_THEME.colors.success.light : LANDIQ_THEME.colors.error.light,
    color: isEligible ? LANDIQ_THEME.colors.status.success : LANDIQ_THEME.colors.status.error,
    marginLeft: '8px',
  }),
  removeButton: {
    padding: '4px 8px',
    border: 'none',
    backgroundColor: 'transparent',
    color: LANDIQ_THEME.colors.text.muted,
    cursor: 'pointer',
    fontSize: '16px',
    lineHeight: 1,
    borderRadius: LANDIQ_THEME.border.radius.sm,
    transition: 'all 0.15s ease',
    flexShrink: 0,
  },
  emptyState: {
    padding: '24px',
    textAlign: 'center' as const,
    color: LANDIQ_THEME.colors.text.muted,
    fontSize: '13px',
  },
};

function getPropertyAddress(feature: PropertyFeature): string {
  const address: unknown = getProp(feature, FEATURE_PROP.PROPERTY.ADDRESS, null);
  if (typeof address === 'string' && address.trim()) return address;

  const lotRef: unknown = getProp(feature, FEATURE_PROP.LOT.LOT_REFERENCE, null);
  if (typeof lotRef === 'string' && lotRef.trim()) return `Lot ${lotRef}`;

  const lotNumber = getProp(feature, FEATURE_PROP.LOT.LOT_NUMBER, null);
  const planLabel = getProp(feature, FEATURE_PROP.LOT.PLAN_LABEL, null);
  if (lotNumber && planLabel) return `Lot ${lotNumber} ${planLabel}`;

  return `Property ${feature.id}`;
}

function getPropertyArea(feature: PropertyFeature): number {
  const areaValue = getProp(feature, FEATURE_PROP.PROPERTY.AREA, null);
  if (typeof areaValue === 'number' && Number.isFinite(areaValue)) return areaValue;
  if (typeof areaValue === 'string') {
    const parsed = Number.parseFloat(areaValue);
    if (Number.isFinite(parsed)) return parsed;
  }
  try {
    if (!feature.geometry) return 0;
    const computed = turf.area(feature.geometry);
    return Number.isFinite(computed) ? computed : 0;
  } catch {
    return 0;
  }
}

export const ShortlistPropertyList: FC<ShortlistPropertyListProps> = ({
  properties,
  analysisResults,
  onRemove,
  onSelect,
  selectedId,
  maxHeight = '300px',
}) => {
  if (properties.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          No properties selected. Load from your Giraffe shortlist or select properties on the map.
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>Selected Properties</span>
        <span style={styles.headerCount}>{properties.length} properties</span>
      </div>
      <div style={styles.list(maxHeight)}>
        {properties.map(property => {
          const address = getPropertyAddress(property);
          const area = getPropertyArea(property);
          const analysis = analysisResults?.[property.id];
          const eligibleCount = analysis?.eligiblePatterns.length ?? 0;

          return (
            <div key={property.id} style={styles.row(selectedId === property.id)}>
              <button
                type="button"
                style={styles.selectTrigger}
                onClick={() => {
                  onSelect(property);
                }}
              >
                <div style={styles.itemContent}>
                  <div style={styles.address} title={address}>
                    {address}
                  </div>
                  <div style={styles.meta}>
                    <span>{area.toLocaleString()}m²</span>
                    {analysis && (
                      <span style={styles.badge(eligibleCount > 0)}>
                        {eligibleCount > 0 ? `${eligibleCount} patterns` : 'Ineligible'}
                      </span>
                    )}
                  </div>
                </div>
              </button>
              <button
                type="button"
                style={styles.removeButton}
                onClick={() => {
                  onRemove(property.id);
                }}
                title="Remove from selection"
                aria-label="Remove from selection"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
