import React, { useState, useMemo } from 'react';
import { LANDIQ_THEME } from '@/components/ui/landiq/theme';
import { Tooltip } from '@/components/ui/landiq';
import { withOpacity } from '@/lib/utils';
import { getPatternImagePath } from '@/apps/patternBook/services/patternBookService';
import { CheckCircle, XCircle, ChevronDown, ChevronUp, Building2, Info } from 'lucide-react';
import type {
  EligibilityCheckResult,
  PatternEligibilityResult,
  SiteTypeDiagnostics,
} from '@/apps/patternBook/types/patternBook';
import {
  ELIGIBILITY_CHECKS,
  formatCheckValue,
  getCardStyling,
  type CheckItem,
} from '@/apps/patternBook/components/patternCardEligibilityDisplay';
import { PatternCardBadges } from '@/apps/patternBook/components/PatternCardBadges';

interface PatternCardProps {
  result: PatternEligibilityResult;
  isExpanded: boolean;
  onToggleExpand: () => void;
  hasHighestGfa?: boolean;
  highestGfaValue?: number;
  hasHighestDwellings?: boolean;
  highestDwellingsValue?: number;
  filteredVariantCount?: number;
  siteTypeDiagnostics?: SiteTypeDiagnostics | null;
}

interface PatternImageProps {
  imagePath: string;
  patternName: string;
  imageError: boolean;
  onImageError: () => void;
}

const PatternImage: React.FC<PatternImageProps> = ({
  imagePath,
  patternName,
  imageError,
  onImageError,
}) => {
  if (imageError) {
    return <Building2 size={32} color={LANDIQ_THEME.colors.greys.grey04} />;
  }

  return (
    <img
      src={imagePath}
      alt={patternName}
      onError={onImageError}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      }}
    />
  );
};

interface EligibilityCheckItemProps {
  check: CheckItem;
  checkResult: EligibilityCheckResult;
  siteTypeDiagnostics?: SiteTypeDiagnostics | null;
}

const EligibilityCheckItem: React.FC<EligibilityCheckItemProps> = ({
  check,
  checkResult,
  siteTypeDiagnostics,
}) => {
  const isPassing = checkResult.met;
  const actualValue = formatCheckValue(checkResult.actual, checkResult.required, check.key);
  const tooltipContent = useMemo(() => {
    if (check.key === 'siteType' && siteTypeDiagnostics) {
      const diag = siteTypeDiagnostics;
      const wa = diag.widthAnalysis;
      const thresholds = diag.thresholds;

      return (
        <div style={{ fontSize: 11, lineHeight: 1.35, maxWidth: 280 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Site type diagnostics</div>
          <div style={{ color: LANDIQ_THEME.colors.text.muted, marginBottom: 8 }}>{check.tooltip}</div>

          <div style={{ display: 'grid', gap: 2 }}>
            <div>
              <strong>Area</strong>: {Math.round(diag.siteArea).toLocaleString()}m²
            </div>
            <div>
              <strong>Skipped (large)</strong>: {diag.skippedBecauseLarge ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Classified battle‑axe</strong>: {diag.isBattleAxe ? 'Yes' : 'No'}
            </div>
          </div>

          {wa ? (
            <div style={{ marginTop: 8, display: 'grid', gap: 2 }}>
              <div>
                <strong>p10 width</strong>: {wa.p10Width.toFixed(1)}m (handle &lt; {thresholds.handleMaxWidthMetres}m)
              </div>
              <div>
                <strong>p60 width</strong>: {wa.p60Width.toFixed(1)}m (body ≥ {thresholds.bodyMinWidthMetres}m)
              </div>
              <div>
                <strong>p10/p60</strong>:{' '}
                {wa.handleBodyRatio === null ? 'N/A' : wa.handleBodyRatio.toFixed(2)} (threshold &lt;{' '}
                {thresholds.handleBodyRatioThreshold})
              </div>
              <div>
                <strong>Narrow samples</strong>: {wa.narrowCount} ({Math.round(wa.narrowFraction * 100)}%)
              </div>
              <div>
                <strong>Min / avg‑body</strong>: {wa.widthRatio.toFixed(2)}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 8, color: LANDIQ_THEME.colors.text.muted }}>
              Width analysis not available for this geometry.
            </div>
          )}
        </div>
      );
    }

    return check.tooltip;
  }, [check.key, check.tooltip, siteTypeDiagnostics]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: LANDIQ_THEME.spacing.xs,
        padding: `${LANDIQ_THEME.spacing.xs} ${LANDIQ_THEME.spacing.sm}`,
        background: isPassing
          ? withOpacity(LANDIQ_THEME.colors.status.success, '10')
          : withOpacity(LANDIQ_THEME.colors.status.error, '10'),
        borderRadius: 4,
        fontSize: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: LANDIQ_THEME.spacing.xs,
          minWidth: 0,
          flex: '1 1 auto',
          overflow: 'hidden',
        }}
      >
        {isPassing ? (
          <CheckCircle size={14} color={LANDIQ_THEME.colors.status.success} style={{ flexShrink: 0 }} />
        ) : (
          <XCircle size={14} color={LANDIQ_THEME.colors.status.error} style={{ flexShrink: 0 }} />
        )}
        <span
          style={{
            color: isPassing ? LANDIQ_THEME.colors.status.success : LANDIQ_THEME.colors.status.error,
            fontWeight: LANDIQ_THEME.typography.fontWeight.medium,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minWidth: 0,
          }}
        >
          {check.label}
        </span>
        {check.tooltip && (
          <Tooltip content={tooltipContent} position="top">
            <Info
              size={12}
              color={isPassing ? LANDIQ_THEME.colors.status.success : LANDIQ_THEME.colors.status.error}
              style={{ flexShrink: 0, cursor: 'help', opacity: 0.7 }}
            />
          </Tooltip>
        )}
      </div>
      {actualValue && (
        <span
          style={{
            color: isPassing ? LANDIQ_THEME.colors.text.muted : LANDIQ_THEME.colors.status.error,
            fontSize: 11,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {actualValue}
        </span>
      )}
    </div>
  );
};

interface EligibilityChecksListProps {
  checks: CheckItem[];
  result: PatternEligibilityResult;
  siteTypeDiagnostics?: SiteTypeDiagnostics | null;
}

const EligibilityChecksList: React.FC<EligibilityChecksListProps> = ({
  checks,
  result,
  siteTypeDiagnostics,
}) => {
  return (
    <>
      <div
        style={{
          fontSize: 13,
          fontWeight: LANDIQ_THEME.typography.fontWeight.medium,
          color: LANDIQ_THEME.colors.text.dark,
          marginBottom: LANDIQ_THEME.spacing.sm,
        }}
      >
        Eligibility Checks
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
          gap: LANDIQ_THEME.spacing.xs,
        }}
      >
        {checks.map(check => (
          <EligibilityCheckItem
            key={check.key}
            check={check}
            checkResult={result.checks[check.key]}
            siteTypeDiagnostics={siteTypeDiagnostics}
          />
        ))}
      </div>

      {!result.isEligible && result.ineligibleReasons.length > 0 && (
        <div style={{ marginTop: LANDIQ_THEME.spacing.md }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: LANDIQ_THEME.typography.fontWeight.medium,
              color: LANDIQ_THEME.colors.status.error,
              marginBottom: LANDIQ_THEME.spacing.xs,
            }}
          >
            Reasons for Ineligibility
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: LANDIQ_THEME.spacing.lg,
              fontSize: 12,
              color: LANDIQ_THEME.colors.text.muted,
            }}
          >
            {result.ineligibleReasons.map((reason, index) => (
              <li key={`${index}-${reason}`} style={{ marginBottom: 2 }}>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
};

export const PatternCard: React.FC<PatternCardProps> = ({
  result,
  isExpanded,
  onToggleExpand,
  hasHighestGfa,
  highestGfaValue,
  hasHighestDwellings,
  highestDwellingsValue,
  filteredVariantCount,
  siteTypeDiagnostics,
}) => {
  const [imageError, setImageError] = useState(false);
  const imagePath = getPatternImagePath(result.patternId);

  const passedChecks = ELIGIBILITY_CHECKS.filter(check => result.checks[check.key].met).length;
  const totalChecks = ELIGIBILITY_CHECKS.length;
  const variantCount = filteredVariantCount ?? result.matchingVariants.length;
  const cardStyling = getCardStyling(result.isEligible);

  const handleImageError = (): void => {
    setImageError(true);
  };

  return (
    <div
      style={{
        background: cardStyling.background,
        borderRadius: LANDIQ_THEME.borders.buttonRadius,
        border: cardStyling.border,
        boxShadow: cardStyling.boxShadow,
        opacity: cardStyling.opacity,
        overflow: 'hidden',
        transition: 'all 0.2s ease',
      }}
    >
      <button
        type="button"
        onClick={onToggleExpand}
        style={{
          display: 'flex',
          gap: LANDIQ_THEME.spacing.md,
          padding: LANDIQ_THEME.spacing.md,
          cursor: 'pointer',
          background: 'transparent',
          border: 'none',
          width: '100%',
          textAlign: 'left',
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: LANDIQ_THEME.borders.buttonRadius,
            overflow: 'hidden',
            flexShrink: 0,
            background: LANDIQ_THEME.colors.greys.grey02,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <PatternImage
            imagePath={imagePath}
            patternName={result.patternName}
            imageError={imageError}
            onImageError={handleImageError}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: LANDIQ_THEME.spacing.sm,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: LANDIQ_THEME.typography.fontWeight.semibold,
                  color: LANDIQ_THEME.colors.text.dark,
                  marginBottom: 2,
                }}
              >
                {result.patternName}
              </div>
              <div style={{ fontSize: 13, color: LANDIQ_THEME.colors.text.muted }}>{result.architect}</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: LANDIQ_THEME.spacing.xs }}>
              {result.isEligible ? (
                <CheckCircle size={18} color={LANDIQ_THEME.colors.status.success} />
              ) : (
                <XCircle size={18} color={LANDIQ_THEME.colors.status.error} />
              )}
              {isExpanded ? (
                <ChevronUp size={18} color={LANDIQ_THEME.colors.text.muted} />
              ) : (
                <ChevronDown size={18} color={LANDIQ_THEME.colors.text.muted} />
              )}
            </div>
          </div>

          <PatternCardBadges
            isEligible={result.isEligible}
            passedChecks={passedChecks}
            totalChecks={totalChecks}
            variantCount={variantCount}
            hasHighestGfa={hasHighestGfa}
            highestGfaValue={highestGfaValue}
            hasHighestDwellings={hasHighestDwellings}
            highestDwellingsValue={highestDwellingsValue}
          />
        </div>
      </button>

      {isExpanded && (
        <div
          style={{
            borderTop: `1px solid ${LANDIQ_THEME.colors.greys.grey02}`,
            padding: LANDIQ_THEME.spacing.md,
          }}
        >
          <EligibilityChecksList
            checks={ELIGIBILITY_CHECKS}
            result={result}
            siteTypeDiagnostics={siteTypeDiagnostics}
          />
        </div>
      )}
    </div>
  );
};

export default PatternCard;
