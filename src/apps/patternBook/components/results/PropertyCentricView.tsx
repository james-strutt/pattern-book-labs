import React, { useState, useMemo } from 'react';
import { LANDIQ_THEME } from '@/components/ui/landiq/theme';
import { Checkbox } from '@/components/ui/landiq';
import type { PropertyPatternAnalysis, SortField, SortDirection } from '@/apps/patternBook/types/shortlistAnalysis';
import { PropertyCentricCard } from './PropertyCentricCard';

interface PropertyCentricViewProps {
  propertyResults: Record<string, PropertyPatternAnalysis>;
  onPropertyClick?: (featureId: string) => void;
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
    borderRadius: LANDIQ_THEME.borders.buttonRadius,
    backgroundColor: LANDIQ_THEME.colors.greys.white,
  },
  propertyList: {
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
};

export const PropertyCentricView: React.FC<PropertyCentricViewProps> = ({
  propertyResults,
  onPropertyClick,
  isLotBased = false,
}) => {
  const [sortBy, setSortBy] = useState<SortField>('eligibleCount');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showOnlyEligible, setShowOnlyEligible] = useState(false);

  const sortedProperties = useMemo(() => {
    let properties = Object.values(propertyResults);

    if (showOnlyEligible) {
      properties = properties.filter(p => p.eligiblePatterns.length > 0);
    }

    return properties.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'address':
          comparison = a.address.localeCompare(b.address);
          break;
        case 'area':
          comparison = a.siteArea - b.siteArea;
          break;
        case 'eligibleCount':
          comparison = a.eligiblePatterns.length - b.eligiblePatterns.length;
          break;
        case 'maxDwellings':
          comparison = a.maxDwellings - b.maxDwellings;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [propertyResults, sortBy, sortDirection, showOnlyEligible]);

  return (
    <div style={styles.container}>
      <div style={styles.filterBar}>
        <span style={styles.filterLabel}>Sort by:</span>
        <select
          style={styles.filterSelect}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortField)}
        >
          <option value="eligibleCount">Eligible Patterns</option>
          <option value="maxDwellings">Max Dwellings</option>
          <option value="area">Site Area</option>
          <option value="address">Address</option>
        </select>

        <select
          style={styles.filterSelect}
          value={sortDirection}
          onChange={(e) => setSortDirection(e.target.value as SortDirection)}
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>

        <Checkbox
          label="Show only eligible sites"
          checked={showOnlyEligible}
          onChange={(e) => setShowOnlyEligible(e.target.checked)}
          size="small"
        />
      </div>

      <div style={styles.propertyList}>
        {sortedProperties.map(property => (
          <PropertyCentricCard
            key={property.featureId}
            property={property}
            onPropertyClick={onPropertyClick}
            isLotBased={isLotBased}
          />
        ))}
      </div>

      {sortedProperties.length === 0 && (
        <div style={styles.emptyState}>
          No properties match the current filter criteria
        </div>
      )}
    </div>
  );
};
