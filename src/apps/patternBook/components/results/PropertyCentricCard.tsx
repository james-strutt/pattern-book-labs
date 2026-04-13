import React, { useState, useMemo, useCallback } from 'react';
import { LANDIQ_THEME } from '@/components/ui/landiq/theme';
import { Badge } from '@/components/ui/landiq';
import { PatternCard } from '@/apps/patternBook/components/PatternCard';
import { VariantComparisonTable } from '@/apps/patternBook/components/VariantComparisonTable';
import type { PropertyPatternAnalysis } from '@/apps/patternBook/types/shortlistAnalysis';
import type { SortField as VariantSortField, SortDirection as VariantSortDirection } from '@/apps/patternBook/types/patternBook';
import { ChevronDown } from 'lucide-react';
import { formatNumber, formatSqm } from '@/utils/formatters';

const cardStyles = {
  propertyCard: {
    border: `1px solid ${LANDIQ_THEME.colors.greys.light}`,
    borderRadius: LANDIQ_THEME.borders.buttonRadius,
    overflow: 'hidden',
    backgroundColor: LANDIQ_THEME.colors.greys.white,
  },
  propertyHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: LANDIQ_THEME.spacing.sm,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    border: 'none',
    width: '100%',
    textAlign: 'left' as const,
    fontFamily: 'inherit',
    backgroundColor: 'transparent',
  },
  propertyInfo: {
    flex: 1,
    minWidth: 0,
  },
  propertyAddress: {
    fontFamily: LANDIQ_THEME.typography.fontFamily,
    fontSize: LANDIQ_THEME.typography.fontSize.sm,
    fontWeight: 600,
    color: LANDIQ_THEME.colors.text.dark,
    marginBottom: LANDIQ_THEME.spacing.xs,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  propertyMeta: {
    display: 'flex',
    gap: LANDIQ_THEME.spacing.md,
    fontFamily: LANDIQ_THEME.typography.fontFamily,
    fontSize: LANDIQ_THEME.typography.fontSize.xs,
    color: LANDIQ_THEME.colors.text.muted,
  },
  badges: {
    display: 'flex',
    gap: LANDIQ_THEME.spacing.sm,
    alignItems: 'center',
  },
  expandIcon: (isExpanded: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: LANDIQ_THEME.colors.text.muted,
    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
    transition: 'transform 0.2s ease',
    border: 'none',
    background: 'none',
    padding: 0,
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginLeft: LANDIQ_THEME.spacing.sm,
  }),
  patternSection: {
    borderTop: `1px solid ${LANDIQ_THEME.colors.greys.light}`,
    padding: LANDIQ_THEME.spacing.md,
    backgroundColor: LANDIQ_THEME.colors.greys.offWhite,
  },
  sectionTitle: {
    fontFamily: LANDIQ_THEME.typography.fontFamily,
    fontSize: LANDIQ_THEME.typography.fontSize.sm,
    fontWeight: 600,
    color: LANDIQ_THEME.colors.text.dark,
    marginBottom: LANDIQ_THEME.spacing.sm,
  },
};

export interface PropertyCentricCardProps {
  property: PropertyPatternAnalysis;
  onPropertyClick?: (featureId: string) => void;
  isLotBased?: boolean;
}

export const PropertyCentricCard: React.FC<PropertyCentricCardProps> = ({
  property,
  onPropertyClick,
  isLotBased = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedPatternId, setExpandedPatternId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<VariantSortField>('fitScore');
  const [sortDirection, setSortDirection] = useState<VariantSortDirection>('desc');

  const handleHeaderClick = (): void => {
    setIsExpanded(!isExpanded);
    onPropertyClick?.(property.featureId);
  };

  const handleHeaderKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleHeaderClick();
    }
  };

  const handleExpandClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleExpandKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      setIsExpanded(!isExpanded);
    }
  };

  const handlePatternExpand = useCallback((patternId: string): void => {
    setExpandedPatternId(prev => (prev === patternId ? null : patternId));
  }, []);

  const handleSortChange = useCallback(
    (field: VariantSortField): void => {
      if (field === sortField) {
        setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDirection('desc');
      }
    },
    [sortField]
  );

  const eligibleCount = property.eligiblePatterns.length;
  const ineligibleCount = property.ineligiblePatterns.length;
  const totalPatterns = eligibleCount + ineligibleCount;

  let variant: 'error' | 'success' | 'warning';
  if (eligibleCount === 0) {
    variant = 'error';
  } else if (eligibleCount >= totalPatterns * 0.5) {
    variant = 'success';
  } else {
    variant = 'warning';
  }

  const renderDwellingInfo = (): React.ReactNode => {
    if (isLotBased) return null;
    if (property.maxDwellings > 0) {
      return (
        <span>
          {property.currentDwellings} → {property.maxDwellings} dwellings
          {property.dwellingUplift > 0 && (
            <span style={{ color: LANDIQ_THEME.colors.status.success, fontWeight: 600 }}>
              {' '}(+{property.dwellingUplift})
            </span>
          )}
        </span>
      );
    }
    if (property.currentDwellings > 0) {
      return <span>{property.currentDwellings} dwellings (current)</span>;
    }
    return null;
  };

  const bestVariants = useMemo(() => {
    let bestGfa: { pattern: string; gfa: number } | null = null;
    let bestDwellings: { pattern: string; dwellings: number } | null = null;

    for (const pattern of property.eligiblePatterns) {
      for (const v of pattern.matchingVariants) {
        if (!bestGfa || v.gfa > bestGfa.gfa) {
          bestGfa = { pattern: pattern.patternName, gfa: v.gfa };
        }
        if (!bestDwellings || v.dwellingYield.total > bestDwellings.dwellings) {
          bestDwellings = { pattern: pattern.patternName, dwellings: v.dwellingYield.total };
        }
      }
    }

    return { bestGfa, bestDwellings };
  }, [property.eligiblePatterns]);

  const siteDims =
    property.siteWidth && property.siteLength
      ? `${formatNumber(property.siteWidth, { decimals: 1 })}m × ${formatNumber(property.siteLength, {
          decimals: 1,
        })}m`
      : null;

  return (
    <div style={cardStyles.propertyCard}>
      <button
        type="button"
        style={cardStyles.propertyHeader}
        onClick={handleHeaderClick}
        onKeyDown={handleHeaderKeyDown}
      >
        <div style={cardStyles.propertyInfo}>
          <div style={cardStyles.propertyAddress} title={property.address}>
            {property.address}
          </div>
          <div style={cardStyles.propertyMeta}>
            <span>{formatSqm(property.siteArea)}</span>
            {siteDims !== null && <span>{siteDims}</span>}
            {renderDwellingInfo()}
            {property.maxGfa > 0 && (
              <span>{formatSqm(Math.round(property.maxGfa))} GFA</span>
            )}
          </div>
        </div>
        <div style={cardStyles.badges}>
          <Badge variant={variant}>
            {eligibleCount} of {totalPatterns} patterns
          </Badge>
          <button
            type="button"
            style={cardStyles.expandIcon(isExpanded)}
            onClick={handleExpandClick}
            onKeyDown={handleExpandKeyDown}
            aria-label={isExpanded ? 'Collapse property details' : 'Expand property details'}
          >
            <ChevronDown size={18} color={LANDIQ_THEME.colors.text.muted} aria-hidden />
          </button>
        </div>
      </button>

      {isExpanded && (
        <div style={cardStyles.patternSection}>
          {eligibleCount > 0 && (
            <div style={{ marginBottom: LANDIQ_THEME.spacing.md }}>
              <div style={cardStyles.sectionTitle}>
                Eligible Patterns ({eligibleCount})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: LANDIQ_THEME.spacing.sm }}>
                {property.eligiblePatterns.map(pattern => (
                  <div key={pattern.patternId}>
                    <PatternCard
                      result={pattern}
                      isExpanded={expandedPatternId === pattern.patternId}
                      onToggleExpand={() => handlePatternExpand(pattern.patternId)}
                      hasHighestGfa={bestVariants.bestGfa?.pattern === pattern.patternName}
                      highestGfaValue={
                        bestVariants.bestGfa?.pattern === pattern.patternName
                          ? bestVariants.bestGfa.gfa
                          : undefined
                      }
                      hasHighestDwellings={bestVariants.bestDwellings?.pattern === pattern.patternName}
                      highestDwellingsValue={
                        bestVariants.bestDwellings?.pattern === pattern.patternName
                          ? bestVariants.bestDwellings.dwellings
                          : undefined
                      }
                    />
                    {expandedPatternId === pattern.patternId && pattern.matchingVariants.length > 0 && (
                      <VariantComparisonTable
                        variants={pattern.matchingVariants}
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onSortChange={handleSortChange}
                        siteWidth={property.siteWidth}
                        siteLength={property.siteLength}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {ineligibleCount > 0 && (
            <div>
              <div style={{ ...cardStyles.sectionTitle, color: LANDIQ_THEME.colors.text.muted }}>
                Ineligible Patterns ({ineligibleCount})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: LANDIQ_THEME.spacing.sm }}>
                {property.ineligiblePatterns.map(pattern => (
                  <PatternCard
                    key={pattern.patternId}
                    result={pattern}
                    isExpanded={expandedPatternId === pattern.patternId}
                    onToggleExpand={() => handlePatternExpand(pattern.patternId)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
