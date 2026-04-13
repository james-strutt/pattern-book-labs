import React, { useState } from 'react';
import { LANDIQ_THEME } from '@/components/ui/landiq/theme';
import { Badge } from '@/components/ui/landiq';
import { MapPin, Image as ImageIcon, ChevronDown } from 'lucide-react';
import type { PatternPropertyAnalysis } from '@/apps/patternBook/types/shortlistAnalysis';
import { getPatternImagePath } from '@/apps/patternBook/services/patternBookService';
import { formatPercentage, formatSqm } from '@/utils/formatters';

const cardStyles = {
  patternCard: (isSelected: boolean): React.CSSProperties => ({
    border: isSelected
      ? `2px solid ${LANDIQ_THEME.colors.brand.supplementary}`
      : `1px solid ${LANDIQ_THEME.colors.greys.light}`,
    borderRadius: LANDIQ_THEME.borders.buttonRadius,
    overflow: 'hidden',
    backgroundColor: LANDIQ_THEME.colors.greys.white,
    boxShadow: isSelected ? `0 0 0 3px ${LANDIQ_THEME.colors.brand.supplementary}30` : 'none',
    transition: 'all 0.15s ease',
  }),
  patternHeader: (isSelected: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: LANDIQ_THEME.spacing.sm,
    padding: LANDIQ_THEME.spacing.sm,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    backgroundColor: isSelected ? `${LANDIQ_THEME.colors.brand.supplementary}1A` : 'transparent',
    border: 'none',
    width: '100%',
    textAlign: 'left',
    fontFamily: 'inherit',
  }),
  patternImage: {
    width: '56px',
    height: '56px',
    borderRadius: LANDIQ_THEME.borders.buttonRadius,
    objectFit: 'cover' as const,
    backgroundColor: LANDIQ_THEME.colors.greys.light,
  },
  imageContainer: {
    width: '56px',
    height: '56px',
    borderRadius: LANDIQ_THEME.borders.buttonRadius,
    backgroundColor: LANDIQ_THEME.colors.greys.light,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  imagePlaceholder: {
    width: '24px',
    height: '24px',
    color: LANDIQ_THEME.colors.text.muted,
  },
  patternInfo: {
    flex: 1,
    minWidth: 0,
  },
  patternName: {
    fontFamily: LANDIQ_THEME.typography.fontFamily,
    fontSize: LANDIQ_THEME.typography.fontSize.sm,
    fontWeight: 600,
    color: LANDIQ_THEME.colors.text.dark,
    marginBottom: '2px',
  },
  patternMeta: {
    fontFamily: LANDIQ_THEME.typography.fontFamily,
    fontSize: LANDIQ_THEME.typography.fontSize.xs,
    color: LANDIQ_THEME.colors.text.muted,
  },
  badges: {
    display: 'flex',
    gap: LANDIQ_THEME.spacing.sm,
  },
  mapIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '10px',
    color: LANDIQ_THEME.colors.brand.supplementary,
    fontWeight: 500,
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
  }),
  propertyList: {
    borderTop: `1px solid ${LANDIQ_THEME.colors.greys.light}`,
    padding: LANDIQ_THEME.spacing.sm,
    backgroundColor: LANDIQ_THEME.colors.greys.offWhite,
  },
  propertyItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${LANDIQ_THEME.spacing.xs} ${LANDIQ_THEME.spacing.sm}`,
    backgroundColor: LANDIQ_THEME.colors.greys.white,
    borderRadius: LANDIQ_THEME.borders.buttonRadius,
    marginBottom: LANDIQ_THEME.spacing.xs,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    border: 'none',
    width: '100%',
    textAlign: 'left' as const,
    fontFamily: 'inherit',
  },
  propertyAddress: {
    fontFamily: LANDIQ_THEME.typography.fontFamily,
    fontSize: LANDIQ_THEME.typography.fontSize.xs,
    color: LANDIQ_THEME.colors.text.dark,
    flex: 1,
  },
  propertyMeta: {
    display: 'flex',
    gap: LANDIQ_THEME.spacing.sm,
    fontFamily: LANDIQ_THEME.typography.fontFamily,
    fontSize: LANDIQ_THEME.typography.fontSize.xs,
    color: LANDIQ_THEME.colors.text.muted,
  },
  emptyState: {
    padding: LANDIQ_THEME.spacing.lg,
    textAlign: 'center' as const,
    fontFamily: LANDIQ_THEME.typography.fontFamily,
    color: LANDIQ_THEME.colors.text.muted,
    fontSize: LANDIQ_THEME.typography.fontSize.sm,
  },
  stats: {
    display: 'flex',
    gap: LANDIQ_THEME.spacing.md,
    fontFamily: LANDIQ_THEME.typography.fontFamily,
    fontSize: LANDIQ_THEME.typography.fontSize.xs,
    color: LANDIQ_THEME.colors.text.muted,
    marginTop: LANDIQ_THEME.spacing.xs,
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: LANDIQ_THEME.spacing.xs,
  },
};

export interface PatternCentricCardProps {
  pattern: PatternPropertyAnalysis;
  isSelected: boolean;
  onPropertyClick?: (featureId: string) => void;
  onSelect?: () => void;
  isLotBased?: boolean;
}

export const PatternCentricCard: React.FC<PatternCentricCardProps> = ({
  pattern,
  isSelected,
  onPropertyClick,
  onSelect,
  isLotBased = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const hasEligible = pattern.eligibleProperties.length > 0;
  const coverageLabel = formatPercentage(pattern.coveragePercentage / 100, { decimals: 0 });

  const handleHeaderClick = (): void => {
    onSelect?.();
  };

  const handleExpandClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleHeaderKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleHeaderClick();
    }
  };

  const handleExpandKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      setIsExpanded(!isExpanded);
    }
  };

  const handlePropertyKeyDown = (featureId: string) => (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPropertyClick?.(featureId);
    }
  };

  return (
    <div style={cardStyles.patternCard(isSelected)}>
      <button
        type="button"
        style={cardStyles.patternHeader(isSelected)}
        onClick={handleHeaderClick}
        onKeyDown={handleHeaderKeyDown}
      >
        <div style={cardStyles.imageContainer}>
          {imageError ? (
            <ImageIcon style={cardStyles.imagePlaceholder} />
          ) : (
            <img
              src={getPatternImagePath(pattern.patternId)}
              alt={pattern.patternName}
              style={cardStyles.patternImage}
              onError={() => {
                setImageError(true);
              }}
            />
          )}
        </div>
        <div style={cardStyles.patternInfo}>
          <div style={cardStyles.patternName}>{pattern.patternName}</div>
          <div style={cardStyles.patternMeta}>{pattern.architect}</div>
          <div style={cardStyles.stats}>
            <span style={cardStyles.statItem}>
              <strong>{coverageLabel}</strong> coverage
            </span>
            {!isLotBased && (
              <span style={cardStyles.statItem}>
                <strong>{pattern.totalPotentialDwellings}</strong> dwellings
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <div style={cardStyles.badges}>
            <Badge variant="success">
              {pattern.eligibleProperties.length} eligible
            </Badge>
            {pattern.ineligibleProperties.length > 0 && (
              <Badge variant="error">
                {pattern.ineligibleProperties.length} ineligible
              </Badge>
            )}
          </div>
          {isSelected && (
            <div style={cardStyles.mapIndicator}>
              <MapPin size={12} />
              Showing on map
            </div>
          )}
        </div>
        <button
          type="button"
          style={cardStyles.expandIcon(isExpanded)}
          onClick={handleExpandClick}
          onKeyDown={handleExpandKeyDown}
          aria-label={isExpanded ? 'Collapse pattern properties' : 'Expand pattern properties'}
        >
          <ChevronDown size={18} color={LANDIQ_THEME.colors.text.muted} aria-hidden />
        </button>
      </button>

      {isExpanded && (
        <div style={cardStyles.propertyList}>
          {hasEligible ? (
            pattern.eligibleProperties.map(property => (
              <button
                key={property.featureId}
                type="button"
                style={cardStyles.propertyItem}
                onClick={() => onPropertyClick?.(property.featureId)}
                onKeyDown={handlePropertyKeyDown(property.featureId)}
              >
                <span style={cardStyles.propertyAddress}>{property.address}</span>
                <div style={cardStyles.propertyMeta}>
                  <span>{formatSqm(property.siteArea)}</span>
                  {!isLotBased && <span>{property.maxDwellings} dwellings</span>}
                </div>
              </button>
            ))
          ) : (
            <div style={cardStyles.emptyState}>No eligible properties for this pattern</div>
          )}
        </div>
      )}
    </div>
  );
};
