import React from 'react';
import { LANDIQ_THEME } from '@/components/ui/landiq/theme';
import { ArrowUp, ArrowDown, CheckCircle, XCircle, Home, ExternalLink } from 'lucide-react';
import type { VariantMatch, SortField, SortDirection, DwellingYield } from '@/apps/patternBook/types/patternBook';

interface VariantComparisonTableProps {
  variants: VariantMatch[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField) => void;
  siteWidth: number | null;
  siteLength: number | null;
}

interface ColumnConfig {
  field: SortField | 'lotLength';
  label: string;
  format: (v: VariantMatch) => string;
  width?: string;
}

const DWELLING_TYPE_KEYS: Array<keyof Omit<DwellingYield, 'total'>> = [
  'studio',
  'oneBed',
  'twoBed',
  'threeBed',
  'fourBed',
];

const DWELLING_COLORS = {
  studio: LANDIQ_THEME.colors.brand.purple,
  oneBed: LANDIQ_THEME.colors.brand.supplementary,
  twoBed: LANDIQ_THEME.colors.status.success,
  threeBed: LANDIQ_THEME.colors.warning.main,
  fourBed: LANDIQ_THEME.colors.secondary.waratahRed,
};

const DWELLING_LABELS: Record<keyof Omit<DwellingYield, 'total'>, string> = {
  studio: 'Studio',
  oneBed: '1 Bed',
  twoBed: '2 Bed',
  threeBed: '3 Bed',
  fourBed: '4 Bed',
};

function formatCategoryName(category: string): string {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

const COLUMNS: ColumnConfig[] = [
  {
    field: 'lotWidth',
    label: 'Width',
    format: (v) => `${v.lotWidth ?? '-'}m`,
    width: '55px'
  },
  {
    field: 'lotLength',
    label: 'Length',
    format: (v) => `${v.lotLength ?? '-'}m`,
    width: '55px'
  },
  {
    field: 'storeys',
    label: 'Storeys',
    format: (v) => (v.storeys ?? '-').toString(),
    width: '50px'
  },
  {
    field: 'gfa',
    label: 'GFA',
    format: (v) => v.gfa ? `${Math.round(v.gfa).toLocaleString()}m²` : '-',
    width: '70px'
  },
  {
    field: 'fsr',
    label: 'FSR',
    format: (v) => v.fsr ? `${v.fsr.toFixed(2)}:1` : '-',
    width: '55px'
  }
];

function checkVariantFits(
  variant: VariantMatch,
  siteWidth: number | null,
  siteLength: number | null
): boolean {
  if (siteWidth === null || siteLength === null) return false;
  return siteWidth >= variant.lotWidth && siteLength >= variant.lotLength;
}

function variantRowBackground(isBasePattern: boolean, fits: boolean): string {
  if (isBasePattern) {
    return `${LANDIQ_THEME.colors.brand.supplementary}12`;
  }
  if (fits) {
    return LANDIQ_THEME.colors.greys.white;
  }
  return `${LANDIQ_THEME.colors.status.error}08`;
}

function sortHeaderIcon(
  sortField: SortField | 'lotLength',
  sortDirection: SortDirection,
  field: SortField | 'lotLength'
): React.ReactNode {
  if (sortField !== field) return null;
  const Icon = sortDirection === 'asc' ? ArrowUp : ArrowDown;
  return <Icon size={12} style={{ marginLeft: 4 }} />;
}

interface DwellingMixBarProps {
  yield: DwellingYield;
}

const DwellingMixBar: React.FC<DwellingMixBarProps> = ({ yield: dwellingYield }) => {
  const total = dwellingYield.total;

  if (total === 0) return <span style={{ color: LANDIQ_THEME.colors.text.muted }}>—</span>;

  return (
    <div style={{
      display: 'flex',
      height: 18,
      borderRadius: 4,
      overflow: 'hidden',
      minWidth: 140
    }}>
      {DWELLING_TYPE_KEYS.map((type) => {
        const count = dwellingYield[type];
        if (count === 0) return null;
        const width = (count / total) * 100;
        return (
          <div
            key={type}
            title={`${DWELLING_LABELS[type]}: ${count}`}
            style={{
              width: `${width}%`,
              height: '100%',
              background: DWELLING_COLORS[type],
              minWidth: 6
            }}
          />
        );
      })}
    </div>
  );
};

export const VariantComparisonTable: React.FC<VariantComparisonTableProps> = ({
  variants,
  sortField,
  sortDirection,
  onSortChange,
  siteWidth,
  siteLength,
}) => {
  const fittingCount = variants.filter(v => checkVariantFits(v, siteWidth, siteLength)).length;

  const usedDwellingTypes = React.useMemo(
    () => DWELLING_TYPE_KEYS.filter(type => variants.some(v => v.dwellingYield[type] > 0)),
    [variants]
  );

  if (variants.length === 0) {
    return (
      <div style={{
        padding: LANDIQ_THEME.spacing.md,
        background: LANDIQ_THEME.colors.greys.offWhite,
        borderRadius: LANDIQ_THEME.borders.buttonRadius,
        fontSize: LANDIQ_THEME.typography.fontSize.sm,
        color: LANDIQ_THEME.colors.text.muted,
        textAlign: 'center'
      }}>
        No variants match the current filters.
      </div>
    );
  }

  return (
    <div style={{
      marginTop: LANDIQ_THEME.spacing.sm,
      marginLeft: LANDIQ_THEME.spacing.md,
      marginRight: LANDIQ_THEME.spacing.md,
      marginBottom: LANDIQ_THEME.spacing.md,
      background: LANDIQ_THEME.colors.greys.white,
      borderRadius: LANDIQ_THEME.borders.buttonRadius,
      overflow: 'hidden',
      border: `1px solid ${LANDIQ_THEME.colors.greys.grey03}`
    }}>
      <div style={{
        fontSize: LANDIQ_THEME.typography.fontSize.sm,
        fontWeight: LANDIQ_THEME.typography.fontWeight.medium,
        color: LANDIQ_THEME.colors.text.dark,
        padding: LANDIQ_THEME.spacing.sm,
        background: LANDIQ_THEME.colors.greys.offWhite,
        borderBottom: `1px solid ${LANDIQ_THEME.colors.greys.grey03}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>Pattern Variants ({variants.length})</span>
        <span style={{
          fontSize: 12,
          fontWeight: LANDIQ_THEME.typography.fontWeight.medium,
          color: fittingCount > 0
            ? LANDIQ_THEME.colors.status.success
            : LANDIQ_THEME.colors.status.error
        }}>
          {fittingCount} of {variants.length} fit site
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: LANDIQ_THEME.typography.fontSize.sm
        }}>
          <thead>
            <tr style={{ background: LANDIQ_THEME.colors.greys.offWhite }}>
              <th style={{
                padding: `${LANDIQ_THEME.spacing.xs} ${LANDIQ_THEME.spacing.sm}`,
                textAlign: 'center',
                fontWeight: LANDIQ_THEME.typography.fontWeight.medium,
                color: LANDIQ_THEME.colors.text.muted,
                borderBottom: `1px solid ${LANDIQ_THEME.colors.greys.grey03}`,
                width: '36px'
              }}>
                Fit
              </th>
              <th style={{
                padding: `${LANDIQ_THEME.spacing.xs} ${LANDIQ_THEME.spacing.sm}`,
                textAlign: 'left',
                fontWeight: LANDIQ_THEME.typography.fontWeight.medium,
                color: LANDIQ_THEME.colors.text.muted,
                borderBottom: `1px solid ${LANDIQ_THEME.colors.greys.grey03}`,
                minWidth: '110px'
              }}>
                Category
              </th>
              {COLUMNS.map(col => {
                const isSortable = col.field !== 'lotLength';
                return (
                <th
                  key={col.field}
                  onClick={isSortable ? () => { onSortChange(col.field as SortField); } : undefined}
                  style={{
                    padding: `${LANDIQ_THEME.spacing.xs} ${LANDIQ_THEME.spacing.sm}`,
                    textAlign: 'left',
                    fontWeight: LANDIQ_THEME.typography.fontWeight.medium,
                    color: sortField === col.field
                      ? LANDIQ_THEME.colors.brand.supplementary
                      : LANDIQ_THEME.colors.text.muted,
                    borderBottom: `1px solid ${LANDIQ_THEME.colors.greys.grey03}`,
                    cursor: isSortable ? 'pointer' : 'default',
                    width: col.width,
                    whiteSpace: 'nowrap'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: LANDIQ_THEME.spacing.xs
                  }}>
                    {col.label}
                    {isSortable && sortHeaderIcon(sortField, sortDirection, col.field)}
                  </div>
                </th>
                );
              })}
              <th
                onClick={() => { onSortChange('dwellings'); }}
                style={{
                  padding: `${LANDIQ_THEME.spacing.xs} ${LANDIQ_THEME.spacing.sm}`,
                  textAlign: 'left',
                  fontWeight: LANDIQ_THEME.typography.fontWeight.medium,
                  color: sortField === 'dwellings'
                    ? LANDIQ_THEME.colors.brand.supplementary
                    : LANDIQ_THEME.colors.text.muted,
                  borderBottom: `1px solid ${LANDIQ_THEME.colors.greys.grey03}`,
                  cursor: 'pointer',
                  minWidth: '100px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: LANDIQ_THEME.spacing.xs }}>
                  Dwellings
                  {sortHeaderIcon(sortField, sortDirection, 'dwellings')}
                </div>
              </th>
              <th style={{
                padding: `${LANDIQ_THEME.spacing.xs} ${LANDIQ_THEME.spacing.sm}`,
                textAlign: 'left',
                fontWeight: LANDIQ_THEME.typography.fontWeight.medium,
                color: LANDIQ_THEME.colors.text.muted,
                borderBottom: `1px solid ${LANDIQ_THEME.colors.greys.grey03}`,
                minWidth: '160px'
              }}>
                Dwelling Mix
              </th>
            </tr>
          </thead>
          <tbody>
            {variants.map((variant) => {
              const fits = checkVariantFits(variant, siteWidth, siteLength);

              return (
                <tr
                  key={variant.variantId}
                  style={{
                    background: variantRowBackground(Boolean(variant.isBasePattern), fits),
                    opacity: fits ? 1 : 0.7,
                  }}
                >
                  <td style={{
                    padding: `${LANDIQ_THEME.spacing.xs} ${LANDIQ_THEME.spacing.sm}`,
                    borderBottom: `1px solid ${LANDIQ_THEME.colors.greys.grey03}`,
                    textAlign: 'center'
                  }}>
                    {fits ? (
                      <CheckCircle size={14} color={LANDIQ_THEME.colors.status.success} />
                    ) : (
                      <XCircle size={14} color={LANDIQ_THEME.colors.status.error} />
                    )}
                  </td>
                  <td style={{
                    padding: `${LANDIQ_THEME.spacing.xs} ${LANDIQ_THEME.spacing.sm}`,
                    borderBottom: `1px solid ${LANDIQ_THEME.colors.greys.grey03}`,
                    color: fits ? LANDIQ_THEME.colors.text.muted : LANDIQ_THEME.colors.status.error
                  }}>
                    <span>{formatCategoryName(variant.category)}</span>
                  </td>
                  {COLUMNS.map(col => (
                    <td
                      key={col.field}
                      style={{
                        padding: `${LANDIQ_THEME.spacing.xs} ${LANDIQ_THEME.spacing.sm}`,
                        borderBottom: `1px solid ${LANDIQ_THEME.colors.greys.grey03}`,
                        color: fits ? LANDIQ_THEME.colors.text.dark : LANDIQ_THEME.colors.text.muted,
                        fontWeight: col.field === sortField
                          ? LANDIQ_THEME.typography.fontWeight.medium
                          : LANDIQ_THEME.typography.fontWeight.regular
                      }}
                    >
                      {col.format(variant)}
                    </td>
                  ))}
                  <td style={{
                    padding: `${LANDIQ_THEME.spacing.xs} ${LANDIQ_THEME.spacing.sm}`,
                    borderBottom: `1px solid ${LANDIQ_THEME.colors.greys.grey03}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Home size={13} color={LANDIQ_THEME.colors.text.muted} />
                      <span style={{
                        fontWeight: LANDIQ_THEME.typography.fontWeight.medium,
                        color: fits ? LANDIQ_THEME.colors.text.dark : LANDIQ_THEME.colors.text.muted
                      }}>
                        {variant.dwellingYield.total}
                      </span>
                    </div>
                  </td>
                  <td style={{
                    padding: `${LANDIQ_THEME.spacing.xs} ${LANDIQ_THEME.spacing.sm}`,
                    borderBottom: `1px solid ${LANDIQ_THEME.colors.greys.grey03}`
                  }}>
                    <DwellingMixBar yield={variant.dwellingYield} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{
        padding: `${LANDIQ_THEME.spacing.xs} ${LANDIQ_THEME.spacing.sm}`,
        borderTop: `1px solid ${LANDIQ_THEME.colors.greys.grey03}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: LANDIQ_THEME.spacing.sm,
        fontSize: 11,
        color: LANDIQ_THEME.colors.text.muted
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: LANDIQ_THEME.spacing.md }}>
          {siteWidth !== null && siteLength !== null && (
            <span>Site: {siteWidth.toFixed(1)}m × {siteLength.toFixed(1)}m</span>
          )}
          {variants.some(v => v.isBasePattern) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: LANDIQ_THEME.spacing.xs }}>
              <div style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                background: `${LANDIQ_THEME.colors.brand.supplementary}12`,
                border: `1px solid ${LANDIQ_THEME.colors.brand.supplementary}30`
              }} />
              <span>Base pattern</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: LANDIQ_THEME.spacing.sm }}>
          {usedDwellingTypes.map(type => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <div style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: DWELLING_COLORS[type]
              }} />
              <span>{DWELLING_LABELS[type]}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        padding: `${LANDIQ_THEME.spacing.xs} ${LANDIQ_THEME.spacing.sm}`,
        borderTop: `1px solid ${LANDIQ_THEME.colors.greys.grey03}`,
        fontSize: 10,
        color: LANDIQ_THEME.colors.text.muted
      }}>
        <span>Source: </span>
        <a
          href="https://www.planning.nsw.gov.au/government-architect-nsw/housing-design/nsw-housing-pattern-book/pattern-designs"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: LANDIQ_THEME.colors.brand.supplementary,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3
          }}
        >
          NSW Department of Planning Housing and Infrastructure
          <ExternalLink size={10} />
        </a>
      </div>
    </div>
  );
};
