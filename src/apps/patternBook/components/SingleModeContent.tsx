import React from 'react';
import { LANDIQ_THEME } from '@/components/ui/landiq/theme';
import { Button, InPageAlert } from '@/components/ui/landiq';
import PropertySelector from '@/components/PropertySelector/PropertySelector';
import { PatternCard } from '@/apps/patternBook/components/PatternCard';
import { VariantComparisonTable } from '@/apps/patternBook/components/VariantComparisonTable';
import { FilterControls } from '@/apps/patternBook/components/FilterControls';
import { PlacePatternButton, PlacementStatusBanner } from '@/apps/patternBook/components/placement';
import { PatternBookHeader } from '@/apps/patternBook/components/PatternBookHeader';
import { ContentSkeleton, ShimmerBar } from '@/components/shared/loading/skeletons';
import { findFirstPlaceableVariant } from '@/apps/patternBook/utils/blockCatalogue';
import { Filter } from 'lucide-react';
import type { PropertyFeature, PropertyFeatureCollection } from '@/types/geometry';
import type {
  PatternBookSchema,
  PatternEligibilityResult,
  VariantMatch,
  FilterOptions,
  SortField as SingleSortField,
  SortDirection,
  SiteTypeDiagnostics,
} from '@/apps/patternBook/types/patternBook';
import type { SelectionMode } from '@/apps/patternBook/types/shortlistAnalysis';
import type { BootstrapStatus } from '@/apps/patternBook/hooks/usePatternBookProjectBundle';
import type { BootstrapResult } from '@/apps/patternBook/services/patternBookProjectBundleService';
import type { PlacementResult } from '@/apps/patternBook/types/placement';
import type { UsePatternPlacementReturn } from '@/apps/patternBook/hooks/usePatternPlacement';

interface BestVariants {
  bestGfa: { pattern: string; variant: VariantMatch } | null;
  bestDwellings: { pattern: string; variant: VariantMatch } | null;
}

interface PatternWithFilteredVariants {
  pattern: PatternEligibilityResult;
  filteredVariants: VariantMatch[];
}

interface HeaderProps {
  selectionMode: SelectionMode;
  onModeChange: (mode: SelectionMode) => void;
  propertyCount: number;
  isAnalysing: boolean;
  onDataSourcesClick: () => void;
}

interface SingleModeContentProps {
  selectedFeature: PropertyFeature | null;
  isLoading: boolean;
  error: string | null;
  onPropertySelect: (fc: PropertyFeatureCollection) => void;
  header: HeaderProps;
  patterns: PatternBookSchema[];
  hasEligiblePatterns: boolean;
  siteWidth: number | null;
  siteLength: number | null;
  siteTypeDiagnostics: SiteTypeDiagnostics | null;
  showFilters: boolean;
  onToggleFilters: () => void;
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  sortField: SingleSortField;
  sortDirection: SortDirection;
  onSortChange: (field: SingleSortField) => void;
  expandedPatternId: string | null;
  onPatternExpand: (patternId: string) => void;
  patternsWithFilteredVariants: PatternWithFilteredVariants[];
  eligiblePatterns: PatternEligibilityResult[];
  ineligiblePatterns: PatternEligibilityResult[];
  bestVariants: BestVariants;
  totalMatchingVariantsFiltered: number;
  bootstrapStatus: BootstrapStatus;
  bootstrapError: string | null;
  patternBookBootstrap: BootstrapResult | null;
  patternBookInstantPointId: string | null;
  retryBootstrap: () => void;
  placementStatus: string;
  placementError: string | null;
  placementResult: PlacementResult | null;
  placePatternVariant: UsePatternPlacementReturn['place'];
  clearPlacement: () => Promise<void>;
}

const renderHeaderComponent = (
  props: HeaderProps,
  additionalRight?: React.ReactNode,
  enableModeToggle?: boolean,
): React.JSX.Element => (
  <PatternBookHeader
    selectionMode={props.selectionMode}
    onModeChange={props.onModeChange}
    propertyCount={props.propertyCount}
    disableModeToggle={enableModeToggle === true ? false : props.isAnalysing}
    onDataSourcesClick={props.onDataSourcesClick}
    additionalRightContent={additionalRight}
  />
);

const EligibilitySummaryBanner: React.FC<{
  eligibleCount: number;
  totalVariants: number;
  bestVariants: BestVariants;
}> = ({ eligibleCount, totalVariants, bestVariants }) => (
  <div style={{
    padding: LANDIQ_THEME.spacing.md,
    background: LANDIQ_THEME.colors.status.successBg,
    border: `1px solid ${LANDIQ_THEME.colors.status.success}`,
    borderRadius: LANDIQ_THEME.borders.buttonRadius,
    display: 'flex',
    flexDirection: 'column',
    gap: LANDIQ_THEME.spacing.sm,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: LANDIQ_THEME.spacing.sm }}>
      <div style={{
        width: LANDIQ_THEME.spacing.sm,
        height: LANDIQ_THEME.spacing.sm,
        borderRadius: '50%',
        background: LANDIQ_THEME.colors.status.success,
      }} />
      <span style={{
        fontSize: LANDIQ_THEME.typography.fontSize.sm,
        fontWeight: LANDIQ_THEME.typography.fontWeight.medium,
        color: LANDIQ_THEME.colors.status.success,
      }}>
        {eligibleCount} eligible {eligibleCount === 1 ? 'pattern' : 'patterns'} with {totalVariants} matching {totalVariants === 1 ? 'variant' : 'variants'}
      </span>
    </div>
    {(bestVariants.bestGfa ?? bestVariants.bestDwellings) && (
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: LANDIQ_THEME.spacing.md,
        paddingLeft: LANDIQ_THEME.spacing.md,
        fontSize: LANDIQ_THEME.typography.fontSize.xs,
        color: LANDIQ_THEME.colors.text.dark,
      }}>
        {bestVariants.bestGfa && (
          <div>
            <span style={{ color: LANDIQ_THEME.colors.text.muted }}>Highest GFA: </span>
            <span style={{ fontWeight: LANDIQ_THEME.typography.fontWeight.medium }}>
              {Math.round(bestVariants.bestGfa.variant.gfa).toLocaleString()}m²
            </span>
            <span style={{ color: LANDIQ_THEME.colors.text.muted }}> ({bestVariants.bestGfa.pattern})</span>
          </div>
        )}
        {bestVariants.bestDwellings && (
          <div>
            <span style={{ color: LANDIQ_THEME.colors.text.muted }}>Most dwellings: </span>
            <span style={{ fontWeight: LANDIQ_THEME.typography.fontWeight.medium }}>
              {bestVariants.bestDwellings.variant.dwellingYield.total}
            </span>
            <span style={{ color: LANDIQ_THEME.colors.text.muted }}> ({bestVariants.bestDwellings.pattern})</span>
          </div>
        )}
      </div>
    )}
  </div>
);

export const SingleModeContent: React.FC<SingleModeContentProps> = (props) => {
  if (!props.selectedFeature) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: LANDIQ_THEME.spacing.lg }}>
        {renderHeaderComponent(props.header)}
        <PropertySelector onPropertySelect={props.onPropertySelect} autoCollapseOnSelection={true} />
      </div>
    );
  }

  if (props.isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: LANDIQ_THEME.spacing.lg }}>
        {renderHeaderComponent(props.header)}
        <ContentSkeleton lines={3} />
        <div className="flex flex-col gap-2">
          <ShimmerBar width="100%" height={48} className="rounded-lg" />
          <ShimmerBar width="100%" height={48} className="rounded-lg" />
          <ShimmerBar width="100%" height={48} className="rounded-lg" />
        </div>
      </div>
    );
  }

  if (props.error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: LANDIQ_THEME.spacing.lg }}>
        {renderHeaderComponent(props.header)}
        <InPageAlert type="error">
          {props.error ?? 'An error occurred while checking pattern book eligibility.'}
        </InPageAlert>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: LANDIQ_THEME.spacing.lg }}>
      {renderHeaderComponent(
        props.header,
        <Button variant="outline" size="small" onClick={props.onToggleFilters}>
          <Filter size={14} style={{ marginRight: LANDIQ_THEME.spacing.xs }} />
          {props.showFilters ? 'Hide Filters' : 'Filters'}
        </Button>,
        true,
      )}

      <PropertySelector
        onPropertySelect={props.onPropertySelect}
        autoCollapseOnSelection={true}
        defaultCollapsed={true}
      />

      <PlacementStatusBanner
        status={props.bootstrapStatus}
        error={props.bootstrapError}
        onRetry={props.retryBootstrap}
      />

      {props.hasEligiblePatterns ? (
        <EligibilitySummaryBanner
          eligibleCount={props.eligiblePatterns.length}
          totalVariants={props.totalMatchingVariantsFiltered}
          bestVariants={props.bestVariants}
        />
      ) : (
        <InPageAlert type="warning">
          No pattern book designs are eligible for this site based on current planning controls and constraints.
        </InPageAlert>
      )}

      {props.showFilters && (
        <FilterControls filters={props.filters} onFilterChange={props.onFilterChange} />
      )}

      {props.eligiblePatterns.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: LANDIQ_THEME.spacing.md }}>
          <h2 style={{
            fontSize: LANDIQ_THEME.typography.fontSize.md,
            fontWeight: LANDIQ_THEME.typography.fontWeight.semibold,
            color: LANDIQ_THEME.colors.text.dark,
            margin: 0,
          }}>
            Eligible Patterns
          </h2>

          {props.patternsWithFilteredVariants.map(({ pattern: result, filteredVariants }) => {
            const patternSchema = props.patterns.find(p => p.metadata.id === result.patternId);
            const variantToPlace = patternSchema && props.patternBookBootstrap
              ? findFirstPlaceableVariant(
                  props.patternBookBootstrap.blockCatalogue,
                  filteredVariants,
                  patternSchema.metadata.id,
                ) ?? filteredVariants[0]
              : filteredVariants[0];
            return (
              <div key={result.patternId}>
                <PatternCard
                  result={result}
                  isExpanded={props.expandedPatternId === result.patternId}
                  onToggleExpand={() => props.onPatternExpand(result.patternId)}
                  hasHighestGfa={props.bestVariants.bestGfa?.pattern === result.patternName}
                  highestGfaValue={props.bestVariants.bestGfa?.pattern === result.patternName ? props.bestVariants.bestGfa.variant.gfa : undefined}
                  hasHighestDwellings={props.bestVariants.bestDwellings?.pattern === result.patternName}
                  highestDwellingsValue={props.bestVariants.bestDwellings?.pattern === result.patternName ? props.bestVariants.bestDwellings.variant.dwellingYield.total : undefined}
                  filteredVariantCount={filteredVariants.length}
                  siteTypeDiagnostics={props.siteTypeDiagnostics}
                />
                {props.expandedPatternId === result.patternId && filteredVariants.length > 0 && (
                  <VariantComparisonTable
                    variants={filteredVariants}
                    sortField={props.sortField}
                    sortDirection={props.sortDirection}
                    onSortChange={props.onSortChange}
                    siteWidth={props.siteWidth}
                    siteLength={props.siteLength}
                  />
                )}
                {props.expandedPatternId === result.patternId &&
                  filteredVariants.length > 0 &&
                  patternSchema &&
                  variantToPlace && (
                    <PlacePatternButton
                      property={props.selectedFeature}
                      pattern={patternSchema}
                      variant={variantToPlace}
                      bootstrap={props.patternBookBootstrap}
                      bootstrapStatus={props.bootstrapStatus}
                      instantPointId={props.patternBookInstantPointId}
                      onPlace={props.placePatternVariant}
                      onClear={props.clearPlacement}
                      placementResult={props.placementResult}
                      placementError={props.placementError}
                      isPlacing={props.placementStatus === 'placing'}
                    />
                  )}
              </div>
            );
          })}
        </div>
      )}

      {props.ineligiblePatterns.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: LANDIQ_THEME.spacing.md }}>
          <h2 style={{
            fontSize: LANDIQ_THEME.typography.fontSize.md,
            fontWeight: LANDIQ_THEME.typography.fontWeight.semibold,
            color: LANDIQ_THEME.colors.text.muted,
            margin: 0,
          }}>
            Ineligible Patterns ({props.ineligiblePatterns.length})
          </h2>

          {props.ineligiblePatterns.map((result: PatternEligibilityResult) => (
            <PatternCard
              key={result.patternId}
              result={result}
              isExpanded={props.expandedPatternId === result.patternId}
              onToggleExpand={() => props.onPatternExpand(result.patternId)}
              siteTypeDiagnostics={props.siteTypeDiagnostics}
            />
          ))}
        </div>
      )}
    </div>
  );
};
