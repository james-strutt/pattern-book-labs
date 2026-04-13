import { useEffect, useState, useCallback, useMemo } from 'react';
import { rpc } from '@gi-nx/iframe-sdk';
import { LANDIQ_THEME } from '@/components/ui/landiq/theme';
import { usePatternBookEligibility } from '@/apps/patternBook/hooks/usePatternBookEligibility';
import { useShortlistSelection } from '@/apps/patternBook/hooks/useShortlistSelection';
import { useShortlistPatternAnalysis } from '@/apps/patternBook/hooks/useShortlistPatternAnalysis';
import { usePatternBookMapLayer } from '@/apps/patternBook/hooks/usePatternBookMapLayer';
import { usePatternBookProjectBundle } from '@/apps/patternBook/hooks/usePatternBookProjectBundle';
import { usePatternPlacement } from '@/apps/patternBook/hooks/usePatternPlacement';
import { usePatternPlacementBatch } from '@/apps/patternBook/hooks/usePatternPlacementBatch';
import { clearPlacementLayers } from '@/apps/patternBook/services/patternBookPlacementService';
import {
  exportMatrixToCSV,
  exportFullAnalysisToCSV,
} from '@/apps/patternBook/services/patternBookExportService';
import {
  removeSelectedBoundaryLayer,
  cleanupSelectedBoundaryLayer,
} from '@/apps/patternBook/services/selectedBoundaryLayerService';
import { flyToProperty } from '@/apps/patternBook/utils/mapNavigation';
import { SingleModeContent } from '@/apps/patternBook/components/SingleModeContent';
import { ShortlistModeContent } from '@/apps/patternBook/components/ShortlistModeContent';
import DataSourcesModal from '@/apps/patternBook/components/DataSourcesModal';
import { RIGHT_BAR_WIDTHS } from '@/constants/uiLayout';
import logger from '@/lib/logger';
import { capture } from '@/lib/posthog';
import { PATTERNBOOK_EVENTS } from '@/constants/analyticsEvents';
import type { PropertyFeature, PropertyFeatureCollection } from '@/types/geometry';
import type {
  VariantMatch,
  FilterOptions,
  SortField as SingleSortField,
  SortDirection,
} from '@/apps/patternBook/types/patternBook';
import type { SelectionMode, ResultsViewMode } from '@/apps/patternBook/types/shortlistAnalysis';

const APP_NAME = 'PatternBookApp';

const SORT_FIELD_ACCESSOR: Record<SingleSortField, (v: VariantMatch) => number> = {
  fitScore: (v) => v.fitScore,
  gfa: (v) => v.gfa,
  fsr: (v) => v.fsr,
  dwellings: (v) => v.dwellingYield.total,
  storeys: (v) => v.storeys,
  lotWidth: (v) => v.lotWidth,
};

const backgroundStyle: React.CSSProperties = {
  backgroundColor: LANDIQ_THEME.colors.greys.offWhite,
  padding: LANDIQ_THEME.spacing.lg,
  paddingTop: '88px',
  paddingBottom: LANDIQ_THEME.spacing.xl,
  minHeight: '100vh',
  boxSizing: 'border-box',
};

interface PatternBookAppProps {
  onBack?: () => void;
}

export const PatternBookApp: React.FC<PatternBookAppProps> = ({ onBack: _onBack }) => {
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('single');
  const [resultsViewMode, setResultsViewMode] = useState<ResultsViewMode>('summary');
  const [selectedFeature, setSelectedFeature] = useState<PropertyFeature | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<SingleSortField>('fitScore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filters, setFilters] = useState<FilterOptions>({
    minDwellings: null,
    maxDwellings: null,
    minGfa: null,
    maxGfa: null,
    minStoreys: null,
    maxStoreys: null,
    setbackCategories: [],
  });
  const [expandedPatternId, setExpandedPatternId] = useState<string | null>(null);
  const [showDataSources, setShowDataSources] = useState(false);

  const {
    isLoading: isSingleLoading,
    error: singleError,
    eligibilityResults,
    patterns,
    hasEligiblePatterns,
    siteWidth,
    siteLength,
    siteTypeDiagnostics,
  } = usePatternBookEligibility(selectionMode === 'single' ? selectedFeature : null, null);

  const shortlistSelection = useShortlistSelection();
  const shortlistAnalysis = useShortlistPatternAnalysis();
  const {
    clearMapLayer,
    setMapData,
    selectFeature: selectMapFeature,
    isLayerActive,
    eligibilityCounts,
    filterByPattern,
    selectedPatternId,
  } = usePatternBookMapLayer();

  const {
    status: bootstrapStatus,
    bootstrap: patternBookBootstrap,
    instantPointId: patternBookInstantPointId,
    error: bootstrapError,
    retry: retryBootstrap,
  } = usePatternBookProjectBundle();

  const {
    status: placementStatus,
    error: placementError,
    result: placementResult,
    place: placePatternVariant,
    clear: clearPlacement,
  } = usePatternPlacement();

  const batchPlacement = usePatternPlacementBatch();

  // Set right bar width on mount
  useEffect(() => {
    const setAppWidth = async (): Promise<void> => {
      try {
        await rpc.invoke('updateUiLayout', [{ rightBarOpenWidth: RIGHT_BAR_WIDTHS.DEFAULT }]);
      } catch (err) {
        logger.error('Failed to update UI layout', { error: err instanceof Error ? err.message : String(err) }, APP_NAME);
      }
    };
    setAppWidth();
  }, []);

  useEffect(() => {
    return (): void => {
      clearMapLayer().catch(() => undefined);
      cleanupSelectedBoundaryLayer();
      removeSelectedBoundaryLayer();
      clearPlacementLayers().catch(() => undefined);
    };
  }, [clearMapLayer]);

  // Auto-trigger shortlist analysis when features are ready
  useEffect(() => {
    if (
      selectionMode === 'shortlist' &&
      shortlistSelection.selectedFeatures.length > 0 &&
      !shortlistSelection.isLoading &&
      !shortlistAnalysis.isAnalysing &&
      !shortlistAnalysis.analysisResults &&
      !shortlistAnalysis.error
    ) {
      capture(PATTERNBOOK_EVENTS.ANALYSIS_STARTED, { property_count: shortlistSelection.selectedFeatures.length });
      shortlistAnalysis.runAnalysis(shortlistSelection.selectedFeatures);
    }
  }, [
    selectionMode,
    shortlistSelection.selectedFeatures,
    shortlistSelection.isLoading,
    shortlistAnalysis.isAnalysing,
    shortlistAnalysis.analysisResults,
    shortlistAnalysis.error,
    shortlistAnalysis.runAnalysis,
  ]);

  // Adjust panel width for matrix view
  useEffect(() => {
    const updateWidth = async (): Promise<void> => {
      try {
        const width = resultsViewMode === 'matrix'
          ? RIGHT_BAR_WIDTHS.DEFAULT + 400
          : RIGHT_BAR_WIDTHS.DEFAULT;
        await rpc.invoke('updateUiLayout', [{ rightBarOpenWidth: width }]);
      } catch (err) {
        logger.error('Failed to update UI layout width', { error: err instanceof Error ? err.message : String(err) }, APP_NAME);
      }
    };
    updateWidth();
  }, [resultsViewMode]);

  useEffect(() => {
    if (resultsViewMode !== 'by-pattern') {
      clearMapLayer().catch(() => undefined);
    }
  }, [resultsViewMode, clearMapLayer]);

  // Sync map layer with analysis results
  useEffect(() => {
    if (shortlistAnalysis.analysisResults && shortlistSelection.selectedFeatures.length > 0) {
      setMapData(shortlistSelection.selectedFeatures, shortlistAnalysis.analysisResults);
    }
  }, [shortlistAnalysis.analysisResults, shortlistSelection.selectedFeatures, setMapData]);

  const handlePropertySelect = useCallback((featureCollection: PropertyFeatureCollection): void => {
    const primaryFeature = featureCollection?.features?.[0];
    if (!primaryFeature) return;

    logger.info('Property selected', { geometryType: primaryFeature.geometry?.type }, APP_NAME);
    capture(PATTERNBOOK_EVENTS.PROPERTY_SELECTED, {});

    if (selectionMode === 'single') {
      setSelectedFeature(primaryFeature);
      setExpandedPatternId(null);
      flyToProperty(primaryFeature).catch(() => undefined);
    } else {
      shortlistSelection.addProperty(primaryFeature as PropertyFeature & { id: string; properties: Record<string, unknown> });
    }
  }, [selectionMode, shortlistSelection]);

  const handleModeChange = useCallback((mode: SelectionMode): void => {
    capture(PATTERNBOOK_EVENTS.SELECTION_MODE_CHANGED, { mode });
    setSelectionMode(mode);
    removeSelectedBoundaryLayer();
    if (mode === 'single') {
      shortlistAnalysis.clearResults();
      clearMapLayer().catch(() => undefined);
    }
  }, [shortlistAnalysis, clearMapLayer]);

  const handleToggleFilters = useCallback((): void => {
    setShowFilters(prev => {
      capture(PATTERNBOOK_EVENTS.FILTER_TOGGLED, { is_open: !prev });
      return !prev;
    });
  }, []);

  const handleFilterChange = useCallback((newFilters: FilterOptions): void => {
    const activeFilterKeys = Object.keys(newFilters).filter(
      k => newFilters[k as keyof FilterOptions] !== null,
    );
    capture(PATTERNBOOK_EVENTS.FILTER_CHANGED, { filter_name: activeFilterKeys.join(',') });
    setFilters(newFilters);
  }, []);

  const handleSortChange = useCallback((field: SingleSortField): void => {
    capture(PATTERNBOOK_EVENTS.SORT_FIELD_CHANGED, { field });
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }, [sortField]);

  const handlePatternExpand = useCallback((patternId: string): void => {
    capture(PATTERNBOOK_EVENTS.PATTERN_EXPANDED, { pattern_name: patternId });
    setExpandedPatternId(prev => prev === patternId ? null : patternId);
  }, []);

  const handleExportMatrix = useCallback((): void => {
    if (shortlistAnalysis.analysisResults) {
      capture(PATTERNBOOK_EVENTS.EXPORT_MATRIX_CSV, {});
      exportMatrixToCSV(shortlistAnalysis.analysisResults);
    }
  }, [shortlistAnalysis.analysisResults]);

  const handleExportFull = useCallback((): void => {
    if (shortlistAnalysis.analysisResults) {
      capture(PATTERNBOOK_EVENTS.EXPORT_FULL_ANALYSIS_CSV, {});
      exportFullAnalysisToCSV(shortlistAnalysis.analysisResults);
    }
  }, [shortlistAnalysis.analysisResults]);

  const patternsWithFilteredVariants = useMemo(() => {
    const filterAndSort = (variants: VariantMatch[]): VariantMatch[] => {
      const filtered = variants.filter(v => {
        if (filters.minDwellings !== null && v.dwellingYield.total < filters.minDwellings) return false;
        if (filters.maxDwellings !== null && v.dwellingYield.total > filters.maxDwellings) return false;
        if (filters.minGfa !== null && v.gfa < filters.minGfa) return false;
        if (filters.maxGfa !== null && v.gfa > filters.maxGfa) return false;
        if (filters.minStoreys !== null && v.storeys < filters.minStoreys) return false;
        if (filters.maxStoreys !== null && v.storeys > filters.maxStoreys) return false;
        if (filters.setbackCategories.length > 0 && !filters.setbackCategories.includes(v.category)) return false;
        return true;
      });
      const accessor = SORT_FIELD_ACCESSOR[sortField];
      const multiplier = sortDirection === 'desc' ? 1 : -1;
      return filtered.sort((a, b) => multiplier * (accessor(b) - accessor(a)));
    };

    return eligibilityResults
      .filter(r => r.isEligible)
      .map(pattern => ({ pattern, filteredVariants: filterAndSort(pattern.matchingVariants) }))
      .filter(({ filteredVariants }) => filteredVariants.length > 0);
  }, [eligibilityResults, filters, sortField, sortDirection]);

  const eligiblePatterns = useMemo(
    () => patternsWithFilteredVariants.map(p => p.pattern),
    [patternsWithFilteredVariants],
  );

  const ineligiblePatterns = useMemo(
    () => eligibilityResults.filter(r => !r.isEligible),
    [eligibilityResults],
  );

  const bestVariants = useMemo(() => {
    let bestGfa: { pattern: string; variant: VariantMatch } | null = null;
    let bestDwellings: { pattern: string; variant: VariantMatch } | null = null;

    for (const { pattern, filteredVariants } of patternsWithFilteredVariants) {
      for (const variant of filteredVariants) {
        if (!bestGfa || variant.gfa > bestGfa.variant.gfa) {
          bestGfa = { pattern: pattern.patternName, variant };
        }
        if (!bestDwellings || variant.dwellingYield.total > bestDwellings.variant.dwellingYield.total) {
          bestDwellings = { pattern: pattern.patternName, variant };
        }
      }
    }

    return { bestGfa, bestDwellings };
  }, [patternsWithFilteredVariants]);

  const totalMatchingVariantsFiltered = useMemo(
    () => patternsWithFilteredVariants.reduce((total, { filteredVariants }) => total + filteredVariants.length, 0),
    [patternsWithFilteredVariants],
  );

  const headerProps = useMemo(() => ({
    selectionMode,
    onModeChange: handleModeChange,
    propertyCount: shortlistSelection.selectedCount,
    isAnalysing: shortlistAnalysis.isAnalysing,
    onDataSourcesClick: () => setShowDataSources(true),
  }), [selectionMode, handleModeChange, shortlistSelection.selectedCount, shortlistAnalysis.isAnalysing]);

  return (
    <div className="w-full h-full overflow-auto" style={backgroundStyle}>
      {selectionMode === 'shortlist' ? (
        <ShortlistModeContent
          selectionMode={selectionMode}
          onModeChange={handleModeChange}
          onDataSourcesClick={() => setShowDataSources(true)}
          shortlistSelection={{
            selectedCount: shortlistSelection.selectedCount,
            isLoading: shortlistSelection.isLoading,
            isLoadingShortlists: shortlistSelection.isLoadingShortlists,
            selectedFeatures: shortlistSelection.selectedFeatures,
            availableShortlists: shortlistSelection.availableShortlists,
            selectedShortlist: shortlistSelection.selectedShortlist,
            error: shortlistSelection.error,
            clearSelection: shortlistSelection.clearSelection,
            selectShortlist: shortlistSelection.selectShortlist,
          }}
          shortlistAnalysis={shortlistAnalysis}
          mapLayer={{
            clearMapLayer,
            isLayerActive,
            eligibilityCounts,
            selectedPatternId,
            filterByPattern,
            selectFeature: selectMapFeature,
          }}
          resultsViewMode={resultsViewMode}
          onResultsViewModeChange={setResultsViewMode}
          onExportFull={handleExportFull}
          onExportMatrix={handleExportMatrix}
          bootstrapStatus={bootstrapStatus}
          patternBookBootstrap={patternBookBootstrap}
          patternBookInstantPointId={patternBookInstantPointId}
          batchPlacement={batchPlacement}
        />
      ) : (
        <SingleModeContent
          selectedFeature={selectedFeature}
          isLoading={isSingleLoading}
          error={singleError}
          onPropertySelect={handlePropertySelect}
          header={headerProps}
          patterns={patterns}
          hasEligiblePatterns={hasEligiblePatterns}
          siteWidth={siteWidth}
          siteLength={siteLength}
          siteTypeDiagnostics={siteTypeDiagnostics}
          showFilters={showFilters}
          onToggleFilters={handleToggleFilters}
          filters={filters}
          onFilterChange={handleFilterChange}
          sortField={sortField}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          expandedPatternId={expandedPatternId}
          onPatternExpand={handlePatternExpand}
          patternsWithFilteredVariants={patternsWithFilteredVariants}
          eligiblePatterns={eligiblePatterns}
          ineligiblePatterns={ineligiblePatterns}
          bestVariants={bestVariants}
          totalMatchingVariantsFiltered={totalMatchingVariantsFiltered}
          bootstrapStatus={bootstrapStatus}
          bootstrapError={bootstrapError}
          patternBookBootstrap={patternBookBootstrap}
          patternBookInstantPointId={patternBookInstantPointId}
          retryBootstrap={retryBootstrap}
          placementStatus={placementStatus}
          placementError={placementError}
          placementResult={placementResult}
          placePatternVariant={placePatternVariant}
          clearPlacement={clearPlacement}
        />
      )}
      <DataSourcesModal
        isOpen={showDataSources}
        onClose={() => setShowDataSources(false)}
      />
    </div>
  );
};

export default PatternBookApp;
