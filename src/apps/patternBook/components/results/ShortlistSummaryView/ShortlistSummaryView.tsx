import { useState, type FC } from 'react';
import { LANDIQ_THEME } from '@/components/ui/landiq/theme';
import { Badge, Card, Tooltip } from '@/components/ui/landiq';
import { ToggleLeft, ToggleRight } from 'lucide-react';
import type {
  ShortlistSummary,
  PatternRanking,
  ZoneDwellingStats,
} from '@/apps/patternBook/types/shortlistAnalysis';
import type { BatchPlacementTotals } from '@/apps/patternBook/hooks/usePatternPlacementBatch';
import { getPatternImagePath } from '@/apps/patternBook/services/patternBookService';
import landZoningColors from '@/constants/zoneColors';
import { shortlistSummaryStyles as styles } from './shortlistSummaryView.styles';

interface ShortlistSummaryViewProps {
  summary: ShortlistSummary;
  onPatternClick?: (patternId: string) => void;
  isLotBased?: boolean;
  placementTotals?: BatchPlacementTotals | null;
}

interface PatternCardItemProps {
  pattern: PatternRanking;
  rank: number;
  onClick?: () => void;
}

interface ZoneChartProps {
  data: ZoneDwellingStats[];
}

const getZoneColor = (zone: string): string => {
  const colorCode = landZoningColors[zone];
  return colorCode ? `#${colorCode}` : LANDIQ_THEME.colors.greys.mid;
};

const ZONE_LABELS: Record<string, string> = {
  R1: 'R1 General Residential',
  R2: 'R2 Low Density',
  R3: 'R3 Medium Density',
  R4: 'R4 High Density',
};

const ZoneUpliftChart: FC<ZoneChartProps> = ({ data }) => {
  if (data.length === 0) return null;

  const maxUplift = Math.max(...data.map((d) => d.uplift), 1);
  const zonesWithData = data.filter((d) => d.uplift > 0);

  return (
    <div style={styles.chartContainer}>
      {data.map((zone) => (
        <div key={zone.zone} style={styles.chartRow}>
          <div style={styles.chartLabel}>{zone.zone}</div>
          <div style={styles.chartBarContainer}>
            <div
              style={{
                ...styles.chartBar(
                  (zone.uplift / maxUplift) * 100,
                  getZoneColor(zone.zone),
                ),
                ...styles.chartBarInner,
              }}
            >
              {zone.uplift > 0 && (
                <span style={styles.chartBarLabel}>
                  +{zone.uplift.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
      <div style={styles.chartLegend}>
        {zonesWithData.map((zone) => (
          <div key={zone.zone} style={styles.legendItem}>
            <span style={styles.legendDot(getZoneColor(zone.zone))} />
            <span>{ZONE_LABELS[zone.zone] ?? zone.zone}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const PatternCardItem: FC<PatternCardItemProps> = ({
  pattern,
  rank,
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);
  const headingTitle = `#${rank} ${pattern.patternName}`;

  return (
    <Card
      border
      showIcon={false}
      style={styles.patternCardWrapper}
      contentStyle={{ padding: LANDIQ_THEME.spacing.sm }}
      onClick={onClick}
    >
      <div style={styles.patternCardContent}>
        {!imageError && (
          <img
            src={getPatternImagePath(pattern.patternId)}
            alt={pattern.patternName}
            style={styles.patternImage}
            onError={() => {
              setImageError(true);
            }}
          />
        )}
        <div style={styles.patternInfo}>
          <div style={styles.patternName} title={headingTitle}>
            {headingTitle}
          </div>
          <div style={styles.patternMeta} title={pattern.architect}>
            {pattern.architect}
          </div>
        </div>
        <div style={styles.patternStats}>
          <div style={styles.patternStatItem}>
            <Badge variant="info">{pattern.eligiblePropertyCount}</Badge>
            <span style={styles.patternStatLabel}>properties</span>
          </div>
          <div style={styles.patternStatItem}>
            <Badge variant="success">{pattern.totalPotentialDwellings}</Badge>
            <span style={styles.patternStatLabel}>dwellings</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export const ShortlistSummaryView: FC<ShortlistSummaryViewProps> = ({
  summary,
  onPatternClick,
  isLotBased = false,
  placementTotals,
}) => {
  const hasPlacement = placementTotals !== null && placementTotals !== undefined;
  const [showPlaced, setShowPlaced] = useState(true);
  const viewingPlaced = hasPlacement && showPlaced;

  return (
    <div style={styles.container}>
      {hasPlacement && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${LANDIQ_THEME.spacing.xs} ${LANDIQ_THEME.spacing.sm}`,
            marginBottom: LANDIQ_THEME.spacing.md,
            backgroundColor: viewingPlaced
              ? LANDIQ_THEME.colors.status.successBg
              : LANDIQ_THEME.colors.greys.offWhite,
            border: `1px solid ${viewingPlaced
              ? LANDIQ_THEME.colors.status.success
              : LANDIQ_THEME.colors.greys.light}`,
            borderRadius: LANDIQ_THEME.border.radius.md,
            cursor: 'pointer',
          }}
          onClick={(): void => setShowPlaced((prev) => !prev)}
        >
          <span style={{
            fontFamily: LANDIQ_THEME.typography.fontFamily,
            fontSize: LANDIQ_THEME.typography.fontSize.sm,
            fontWeight: 600,
            color: viewingPlaced
              ? LANDIQ_THEME.colors.status.success
              : LANDIQ_THEME.colors.text.muted,
          }}>
            {viewingPlaced ? 'Showing placed results' : 'Showing pre-placement estimates'}
          </span>
          {viewingPlaced
            ? <ToggleRight size={22} color={LANDIQ_THEME.colors.status.success} />
            : <ToggleLeft size={22} color={LANDIQ_THEME.colors.text.muted} />
          }
        </div>
      )}

      {!isLotBased && (
        viewingPlaced && placementTotals ? (
          <div style={styles.statsGrid}>
            <div style={styles.statCard(LANDIQ_THEME.colors.text.muted)}>
              <div style={styles.statValue(LANDIQ_THEME.colors.text.muted)}>
                {summary.totalCurrentDwellings.toLocaleString()}
              </div>
              <div style={styles.statLabel}>Current Dwellings</div>
            </div>
            <div style={styles.statCard(LANDIQ_THEME.colors.status.success)}>
              <div style={styles.statValue(LANDIQ_THEME.colors.status.success)}>
                {placementTotals.totalDwellings.toLocaleString()}
              </div>
              <div style={styles.statLabel}>Placed Dwellings</div>
            </div>
            <div style={styles.statCard(LANDIQ_THEME.colors.status.success)}>
              <div style={styles.statValue(LANDIQ_THEME.colors.status.success)}>
                +{(placementTotals.totalDwellings - summary.totalCurrentDwellings).toLocaleString()}
              </div>
              <div style={styles.statLabel}>Dwelling Uplift</div>
            </div>
          </div>
        ) : (
          <div style={styles.statsGrid}>
            <Tooltip
              content={
                <>
                  Reflects the count of registered addresses within the bounds of
                  the property per the{' '}
                  <a
                    href="https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Common/AddressSearch/MapServer/5"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.tooltipLink}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    address mapserver
                  </a>
                  {'.'}
                </>
              }
              position="bottom"
            >
              <div style={styles.statCard(LANDIQ_THEME.colors.text.muted)}>
                <div style={styles.statValue(LANDIQ_THEME.colors.text.muted)}>
                  {summary.totalCurrentDwellings.toLocaleString()}
                </div>
                <div style={styles.statLabel}>Current Dwellings</div>
              </div>
            </Tooltip>
            <div style={styles.statCard(LANDIQ_THEME.colors.brand.navy)}>
              <div style={styles.statValue(LANDIQ_THEME.colors.brand.navy)}>
                {summary.totalPotentialDwellings.toLocaleString()}
              </div>
              <div style={styles.statLabel}>Potential Dwellings</div>
            </div>
            <div style={styles.statCard(LANDIQ_THEME.colors.status.success)}>
              <div style={styles.statValue(LANDIQ_THEME.colors.status.success)}>
                +{summary.totalDwellingUplift.toLocaleString()}
              </div>
              <div style={styles.statLabel}>Dwelling Uplift</div>
            </div>
          </div>
        )
      )}
      <div style={styles.statsGridTwo}>
        <div style={styles.statCard(LANDIQ_THEME.colors.brand.navy)}>
          <div style={styles.statValue(LANDIQ_THEME.colors.brand.navy)}>
            {viewingPlaced && placementTotals
              ? `${Math.round(placementTotals.totalNetArea).toLocaleString()}m²`
              : `${Math.round(summary.totalPotentialGfa).toLocaleString()}m²`
            }
          </div>
          <div style={styles.statLabel}>
            {viewingPlaced && placementTotals ? 'Placed Net Area' : 'Total Potential GFA'}
          </div>
        </div>
        <div style={styles.statCard(LANDIQ_THEME.colors.info.blue)}>
          <div style={styles.statValue(LANDIQ_THEME.colors.info.blue)}>
            {viewingPlaced && placementTotals
              ? `${placementTotals.successCount} / ${placementTotals.successCount + placementTotals.failureCount}`
              : (summary.eligiblePropertyCount + summary.partiallyEligibleCount)
            }
          </div>
          <div style={styles.statLabel}>
            {viewingPlaced && placementTotals ? 'Successfully Placed' : 'Eligible Sites'}
          </div>
        </div>
      </div>

      {!isLotBased && summary.dwellingsByZone.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Dwelling Uplift by Zone</div>
          <ZoneUpliftChart data={summary.dwellingsByZone} />
        </div>
      )}

      {summary.topPatterns.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Top Patterns by Coverage</div>
          <div style={styles.patternList}>
            {summary.topPatterns.map((pattern, index) => (
              <PatternCardItem
                key={pattern.patternId}
                pattern={pattern}
                rank={index + 1}
                onClick={() => {
                  onPatternClick?.(pattern.patternId);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
