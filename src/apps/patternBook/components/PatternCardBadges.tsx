import type { CSSProperties, ReactNode } from 'react';
import { LANDIQ_THEME } from '@/components/ui/landiq/theme';
import { TrendingUp, Home, Layers } from 'lucide-react';

export interface PatternCardBadgesProps {
  isEligible: boolean;
  passedChecks: number;
  totalChecks: number;
  variantCount: number;
  hasHighestGfa: boolean | undefined;
  highestGfaValue: number | undefined;
  hasHighestDwellings: boolean | undefined;
  highestDwellingsValue: number | undefined;
}

const ROW_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: LANDIQ_THEME.spacing.sm,
  marginTop: LANDIQ_THEME.spacing.sm,
};

const BADGE_BASE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: LANDIQ_THEME.spacing.xs,
  fontSize: LANDIQ_THEME.typography.fontSize.xs,
  fontWeight: LANDIQ_THEME.typography.fontWeight.medium,
  padding: `${LANDIQ_THEME.borders.controlWidth} ${LANDIQ_THEME.spacing.xs}`,
  borderRadius: LANDIQ_THEME.border.radius.sm,
};

function formatMetricSuffix(
  value: number | undefined,
  kind: 'gfa' | 'dwellings',
): string {
  if (value === undefined || !Number.isFinite(value)) {
    return '';
  }
  return kind === 'gfa'
    ? ` (${Math.round(value).toLocaleString()}m²)`
    : ` (${value})`;
}

function BadgeChip({
  colour,
  icon,
  children,
}: Readonly<{
  colour: string;
  icon: ReactNode;
  children: ReactNode;
}>): JSX.Element {
  return (
    <div
      style={{
        ...BADGE_BASE,
        color: colour,
        background: `${colour}15`,
      }}
    >
      {icon}
      {children}
    </div>
  );
}

export function PatternCardBadges({
  isEligible,
  passedChecks,
  totalChecks,
  variantCount,
  hasHighestGfa,
  highestGfaValue,
  hasHighestDwellings,
  highestDwellingsValue,
}: Readonly<PatternCardBadgesProps>): JSX.Element {
  return (
    <div style={ROW_STYLE}>
      <div
        style={{
          fontSize: LANDIQ_THEME.typography.fontSize.xs,
          color: isEligible ? LANDIQ_THEME.colors.status.success : LANDIQ_THEME.colors.text.muted,
          fontWeight: LANDIQ_THEME.typography.fontWeight.medium,
        }}
      >
        {passedChecks}/{totalChecks} checks passed
      </div>

      {isEligible && variantCount > 0 && (
        <BadgeChip colour={LANDIQ_THEME.colors.brand.supplementary} icon={<Layers size={11} />}>
          {variantCount} {variantCount === 1 ? 'variant' : 'variants'}
        </BadgeChip>
      )}

      {hasHighestGfa && (
        <BadgeChip colour={LANDIQ_THEME.colors.info.blue} icon={<TrendingUp size={12} />}>
          Highest GFA{formatMetricSuffix(highestGfaValue, 'gfa')}
        </BadgeChip>
      )}

      {hasHighestDwellings && (
        <BadgeChip colour={LANDIQ_THEME.colors.status.success} icon={<Home size={12} />}>
          Most Dwellings{formatMetricSuffix(highestDwellingsValue, 'dwellings')}
        </BadgeChip>
      )}
    </div>
  );
}
