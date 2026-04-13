import React from 'react';
import { LANDIQ_THEME } from '@/components/ui/landiq/theme';
import { Button } from '@/components/ui/landiq';
import { SelectionSummary } from '@/apps/patternBook/components/selection/SelectionSummary';
import {
  ViewModeToggle,
  ShortlistSummaryView,
  PatternCentricView,
  PropertyCentricView,
  EligibilityMatrixView,
} from '@/apps/patternBook/components/results';
import { PatternBookMapLegend } from '@/apps/patternBook/components/map';
import { OptimiseAndApplyPanel } from '@/apps/patternBook/components/placement/OptimiseAndApplyPanel';
import { PatternBookHeader } from '@/apps/patternBook/components/PatternBookHeader';
import { Download } from 'lucide-react';
import { capture } from '@/lib/posthog';
import { PATTERNBOOK_EVENTS } from '@/constants/analyticsEvents';
import { removeSelectedBoundaryLayer } from '@/apps/patternBook/services/selectedBoundaryLayerService';
import { flyToProperty } from '@/apps/patternBook/utils/mapNavigation';
import type { PropertyFeature } from '@/types/geometry';
import type { SelectionMode, ResultsViewMode } from '@/apps/patternBook/types/shortlistAnalysis';
import type { UseShortlistPatternAnalysisReturn } from '@/apps/patternBook/hooks/useShortlistPatternAnalysis';
import type { UsePatternBookMapLayerReturn } from '@/apps/patternBook/hooks/usePatternBookMapLayer';
import type { BootstrapResult } from '@/apps/patternBook/services/patternBookProjectBundleService';
import type { UsePatternPlacementBatchReturn } from '@/apps/patternBook/hooks/usePatternPlacementBatch';
import type { ShortlistLayer } from '@/types/domain/shortlist';

interface ShortlistSelectionData {
  selectedCount: number;
  isLoading: boolean;
  isLoadingShortlists: boolean;
  selectedFeatures: Array<PropertyFeature & { id: string }>;
  availableShortlists: ShortlistLayer[];
  selectedShortlist: ShortlistLayer | null;
  error: string | null;
  clearSelection: () => void;
  selectShortlist: (shortlist: ShortlistLayer) => void;
}

interface ShortlistModeContentProps {
  selectionMode: SelectionMode;
  onModeChange: (mode: SelectionMode) => void;
  onDataSourcesClick: () => void;
  shortlistSelection: ShortlistSelectionData;
  shortlistAnalysis: UseShortlistPatternAnalysisReturn;
  mapLayer: Pick<UsePatternBookMapLayerReturn, 'clearMapLayer' | 'isLayerActive' | 'eligibilityCounts' | 'selectedPatternId' | 'filterByPattern' | 'selectFeature'>;
  resultsViewMode: ResultsViewMode;
  onResultsViewModeChange: (mode: ResultsViewMode) => void;
  onExportFull: () => void;
  onExportMatrix: () => void;
  bootstrapStatus: string;
  patternBookBootstrap: BootstrapResult | null;
  patternBookInstantPointId: string | null;
  batchPlacement: UsePatternPlacementBatchReturn;
}

const handleShortlistPropertySelect = (
  feature: PropertyFeature & { id: string },
  selectMapFeature: (id: string | null) => void,
): void => {
  flyToProperty(feature).catch(() => undefined);
  selectMapFeature(feature.id);
};

export const ShortlistModeContent: React.FC<ShortlistModeContentProps> = ({
  selectionMode,
  onModeChange,
  onDataSourcesClick,
  shortlistSelection,
  shortlistAnalysis,
  mapLayer,
  resultsViewMode,
  onResultsViewModeChange,
  onExportFull,
  onExportMatrix,
  bootstrapStatus,
  patternBookBootstrap,
  patternBookInstantPointId,
  batchPlacement,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: LANDIQ_THEME.spacing.md }}>
    <PatternBookHeader
      selectionMode={selectionMode}
      onModeChange={onModeChange}
      propertyCount={shortlistSelection.selectedCount}
      disableModeToggle={shortlistAnalysis.isAnalysing}
      onDataSourcesClick={onDataSourcesClick}
    />

    <div style={{ position: 'relative' }}>
      <SelectionSummary
        propertyCount={shortlistSelection.selectedCount}
        isLoading={shortlistSelection.isLoading}
        isLoadingShortlists={shortlistSelection.isLoadingShortlists}
        isAnalysing={shortlistAnalysis.isAnalysing}
        progress={shortlistAnalysis.progress}
        availableShortlists={shortlistSelection.availableShortlists}
        selectedShortlist={shortlistSelection.selectedShortlist}
        onSelectShortlist={(shortlist) => {
          shortlistAnalysis.clearResults();
          mapLayer.clearMapLayer().catch(() => undefined);
          shortlistSelection.selectShortlist(shortlist);
        }}
        onClearSelection={() => {
          shortlistSelection.clearSelection();
          shortlistAnalysis.clearResults();
          mapLayer.clearMapLayer().catch(() => undefined);
          removeSelectedBoundaryLayer();
        }}
        onCancelAnalysis={shortlistAnalysis.cancelAnalysis}
        error={shortlistSelection.error ?? shortlistAnalysis.error}
      />

      {resultsViewMode === 'by-pattern' && mapLayer.isLayerActive && (
        <div style={{
          position: 'absolute',
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
        }}>
          <PatternBookMapLegend
            eligibilityCounts={mapLayer.eligibilityCounts}
            isPatternFiltered={mapLayer.selectedPatternId !== null}
          />
        </div>
      )}
    </div>

    {shortlistAnalysis.analysisResults && (
      <>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${LANDIQ_THEME.spacing.sm} 0`,
          borderTop: `1px solid ${LANDIQ_THEME.colors.greys.light}`,
          marginTop: LANDIQ_THEME.spacing.sm,
        }}>
          <ViewModeToggle
            mode={resultsViewMode}
            onChange={(mode) => {
              capture(PATTERNBOOK_EVENTS.VIEW_MODE_CHANGED, { mode });
              onResultsViewModeChange(mode);
            }}
          />
          <Button variant="outline" size="small" onClick={onExportFull}>
            <Download size={14} style={{ marginRight: LANDIQ_THEME.spacing.xs }} />
            Export
          </Button>
        </div>

        {resultsViewMode === 'summary' && (
          <>
            <OptimiseAndApplyPanel
              analysisResult={shortlistAnalysis.analysisResults}
              selectedFeatures={shortlistSelection.selectedFeatures}
              patterns={shortlistAnalysis.patterns}
              bootstrap={patternBookBootstrap}
              bootstrapReady={bootstrapStatus === 'ready'}
              instantPointId={patternBookInstantPointId}
              batch={batchPlacement}
            />
            <ShortlistSummaryView
              summary={shortlistAnalysis.analysisResults.summary}
              onPatternClick={(patternId) => {
                onResultsViewModeChange('by-pattern');
              }}
              isLotBased={shortlistAnalysis.analysisResults.isLotBased}
              placementTotals={batchPlacement.totals}
            />
          </>
        )}

        {resultsViewMode === 'by-pattern' && (
          <PatternCentricView
            patternResults={shortlistAnalysis.analysisResults.patternResults}
            selectedPatternId={mapLayer.selectedPatternId}
            onPropertyClick={(featureId) => {
              const feature = shortlistSelection.selectedFeatures.find(f => f.id === featureId);
              if (feature) handleShortlistPropertySelect(feature, mapLayer.selectFeature);
            }}
            onPatternSelect={mapLayer.filterByPattern}
            isLotBased={shortlistAnalysis.analysisResults.isLotBased}
          />
        )}

        {resultsViewMode === 'by-property' && (
          <PropertyCentricView
            propertyResults={shortlistAnalysis.analysisResults.propertyResults}
            onPropertyClick={(featureId) => {
              const feature = shortlistSelection.selectedFeatures.find(f => f.id === featureId);
              if (feature) handleShortlistPropertySelect(feature, mapLayer.selectFeature);
            }}
            isLotBased={shortlistAnalysis.analysisResults.isLotBased}
          />
        )}

        {resultsViewMode === 'matrix' && (
          <EligibilityMatrixView
            results={shortlistAnalysis.analysisResults}
            onExport={onExportMatrix}
          />
        )}
      </>
    )}
  </div>
);
