import type { CSSProperties, FC } from 'react';
import { LANDIQ_THEME } from '@/components/ui/landiq/theme';
import { Button } from '@/components/ui/landiq';
import { X } from 'lucide-react';
import type { FilterOptions } from '@/apps/patternBook/types/patternBook';

interface FilterControlsProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
}

type NumericRangeKey =
  | 'minDwellings'
  | 'maxDwellings'
  | 'minGfa'
  | 'maxGfa'
  | 'minStoreys'
  | 'maxStoreys';

const SETBACK_CATEGORIES = [
  { value: '0m_setback', label: '0m' },
  { value: '1.5m_setback', label: '1.5m' },
  { value: '2.0m_setback', label: '2.0m' },
  { value: '2.5m_setback', label: '2.5m' },
  { value: '3m_setback', label: '3.0m' }
] as const;

const NUMERIC_RANGE_GROUPS: ReadonlyArray<{
  label: string;
  minKey: NumericRangeKey;
  maxKey: NumericRangeKey;
}> = [
  { label: 'Dwellings', minKey: 'minDwellings', maxKey: 'maxDwellings' },
  { label: 'GFA (m²)', minKey: 'minGfa', maxKey: 'maxGfa' },
  { label: 'Storeys', minKey: 'minStoreys', maxKey: 'maxStoreys' }
];

const NULLABLE_FILTER_KEYS: Array<keyof Pick<FilterOptions, NumericRangeKey>> = [
  'minDwellings',
  'maxDwellings',
  'minGfa',
  'maxGfa',
  'minStoreys',
  'maxStoreys'
];

const inputStyle: CSSProperties = {
  width: 65,
  padding: '6px 8px',
  fontSize: 13,
  border: `1px solid ${LANDIQ_THEME.colors.greys.grey03}`,
  borderRadius: 4,
  outline: 'none',
  textAlign: 'center',
  color: LANDIQ_THEME.colors.text.dark,
  background: LANDIQ_THEME.colors.greys.white
};

const panelStyle: CSSProperties = {
  minWidth: 0,
  padding: LANDIQ_THEME.spacing.md,
  background: LANDIQ_THEME.colors.greys.white,
  borderRadius: LANDIQ_THEME.borders.buttonRadius,
  border: `1px solid ${LANDIQ_THEME.colors.greys.grey03}`
};

const headerRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: LANDIQ_THEME.spacing.md
};

const titleStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: LANDIQ_THEME.typography.fontWeight.semibold,
  color: LANDIQ_THEME.colors.text.dark
};

const fieldsWrapStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: LANDIQ_THEME.spacing.lg
};

const sectionLabelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: LANDIQ_THEME.typography.fontWeight.medium,
  color: LANDIQ_THEME.colors.text.muted,
  marginBottom: 6
};

const rangeRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6
};

const dashStyle: CSSProperties = {
  color: LANDIQ_THEME.colors.text.muted,
  fontSize: 12
};

const setbackWrapStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 4
};

const NUMBER_INPUT_GLOBAL_CSS = `
  input[type="number"]::-webkit-outer-spin-button,
  input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type="number"] {
    -moz-appearance: textfield;
  }
  input[type="number"]:focus {
    border-color: ${LANDIQ_THEME.colors.brand.supplementary};
  }
  input[type="number"]::placeholder {
    color: ${LANDIQ_THEME.colors.greys.grey03};
  }
`;

function parseOptionalFiniteNumber(value: string): number | null {
  if (value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export const FilterControls: FC<FilterControlsProps> = ({ filters, onFilterChange }) => {
  const patchNumeric = (field: NumericRangeKey, value: string): void => {
    onFilterChange({
      ...filters,
      [field]: parseOptionalFiniteNumber(value)
    });
  };

  const toggleSetback = (category: string): void => {
    const current = filters.setbackCategories;
    const setbackCategories = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category];
    onFilterChange({ ...filters, setbackCategories });
  };

  const clearFilters = (): void => {
    onFilterChange({
      minDwellings: null,
      maxDwellings: null,
      minGfa: null,
      maxGfa: null,
      minStoreys: null,
      maxStoreys: null,
      setbackCategories: []
    });
  };

  const hasActiveFilters =
    NULLABLE_FILTER_KEYS.some((k) => filters[k] !== null) ||
    filters.setbackCategories.length > 0;

  return (
    <div style={panelStyle}>
      <div style={headerRowStyle}>
        <div style={titleStyle}>Filter Variants</div>
        {hasActiveFilters && (
          <Button variant="outline" size="small" onClick={clearFilters}>
            <X size={14} style={{ marginRight: 4 }} />
            Clear
          </Button>
        )}
      </div>

      <div style={fieldsWrapStyle}>
        {NUMERIC_RANGE_GROUPS.map(({ label, minKey, maxKey }) => (
          <div key={minKey}>
            <div style={sectionLabelStyle}>{label}</div>
            <div style={rangeRowStyle}>
              <input
                type="number"
                placeholder="Min"
                value={filters[minKey] ?? ''}
                onChange={(e) => patchNumeric(minKey, e.target.value)}
                style={inputStyle}
              />
              <span style={dashStyle}>–</span>
              <input
                type="number"
                placeholder="Max"
                value={filters[maxKey] ?? ''}
                onChange={(e) => patchNumeric(maxKey, e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
        ))}

        <div>
          <div style={sectionLabelStyle}>Setback Category</div>
          <div style={setbackWrapStyle}>
            {SETBACK_CATEGORIES.map((category) => {
              const isSelected = filters.setbackCategories.includes(category.value);
              return (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => toggleSetback(category.value)}
                  style={{
                    padding: '5px 10px',
                    fontSize: 12,
                    fontWeight: LANDIQ_THEME.typography.fontWeight.medium,
                    borderRadius: 4,
                    border: `1px solid ${
                      isSelected
                        ? LANDIQ_THEME.colors.brand.supplementary
                        : LANDIQ_THEME.colors.greys.grey03
                    }`,
                    background: isSelected
                      ? LANDIQ_THEME.colors.brand.supplementary
                      : LANDIQ_THEME.colors.greys.white,
                    color: isSelected
                      ? LANDIQ_THEME.colors.greys.white
                      : LANDIQ_THEME.colors.text.muted,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <style>{NUMBER_INPUT_GLOBAL_CSS}</style>
    </div>
  );
};
