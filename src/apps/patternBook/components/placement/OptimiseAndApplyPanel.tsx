import React, { useMemo, useState } from "react";
import {
  Button,
  RadioGroup,
  InPageAlert,
  Badge,
  Progress,
} from "@/components/ui/landiq";
import { LANDIQ_THEME } from "@/components/ui/landiq/theme";
import { Sparkles, Trash2, Loader2, CheckCircle2, XCircle } from "lucide-react";
import type {
  PropertyFeature,
  ShortlistPatternAnalysisResult,
} from "@/apps/patternBook/types/shortlistAnalysis";
import type { PatternBookSchema } from "@/apps/patternBook/types/patternBook";
import type { BootstrapResult } from "@/apps/patternBook/services/patternBookProjectBundleService";
import {
  optimisePatternSelection,
  type OptimisationObjective,
  type OptimisationSummary,
  type OptimisedPatternSelection,
  type IsVariantPlaceable,
} from "@/apps/patternBook/utils/optimisePatternSelection";
import { findBlockForVariant } from "@/apps/patternBook/utils/blockCatalogue";
import type {
  UsePatternPlacementBatchReturn,
  BatchPlacementSelection,
} from "@/apps/patternBook/hooks/usePatternPlacementBatch";

interface OptimiseAndApplyPanelProps {
  analysisResult: ShortlistPatternAnalysisResult | null;
  selectedFeatures: readonly PropertyFeature[];
  patterns: readonly PatternBookSchema[];
  bootstrap: BootstrapResult | null;
  bootstrapReady: boolean;
  instantPointId: string | null;
  batch: UsePatternPlacementBatchReturn;
}

const OPTIMISATION_OBJECTIVE_RADIO_OPTIONS: Array<{
  value: OptimisationObjective;
  label: string;
}> = [
  { value: "dwellings", label: "Maximise dwellings" },
  { value: "gfa", label: "Maximise GFA" },
];

const styles = {
  card: {
    marginBottom: LANDIQ_THEME.spacing.lg,
    padding: LANDIQ_THEME.spacing.md,
    backgroundColor: LANDIQ_THEME.colors.greys.white,
    border: `1px solid ${LANDIQ_THEME.colors.greys.light}`,
    borderRadius: LANDIQ_THEME.border.radius.md,
  } as React.CSSProperties,
  header: {
    display: "flex",
    alignItems: "center",
    gap: LANDIQ_THEME.spacing.xs,
    marginBottom: LANDIQ_THEME.spacing.sm,
  } as React.CSSProperties,
  title: {
    fontFamily: LANDIQ_THEME.typography.fontFamily,
    fontSize: LANDIQ_THEME.typography.fontSize.md,
    fontWeight: 600,
    color: LANDIQ_THEME.colors.text.dark,
  } as React.CSSProperties,
  subtitle: {
    fontFamily: LANDIQ_THEME.typography.fontFamily,
    fontSize: LANDIQ_THEME.typography.fontSize.sm,
    color: LANDIQ_THEME.colors.text.muted,
    marginBottom: LANDIQ_THEME.spacing.sm,
  } as React.CSSProperties,
  previewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: LANDIQ_THEME.spacing.sm,
    marginTop: LANDIQ_THEME.spacing.sm,
    marginBottom: LANDIQ_THEME.spacing.sm,
  } as React.CSSProperties,
  previewCell: (color: string): React.CSSProperties => ({
    padding: LANDIQ_THEME.spacing.sm,
    backgroundColor: LANDIQ_THEME.colors.greys.white,
    border: `1px solid ${color}`,
    borderRadius: LANDIQ_THEME.border.radius.sm,
    textAlign: "center",
  }),
  previewValue: (color: string): React.CSSProperties => ({
    fontFamily: LANDIQ_THEME.typography.fontFamily,
    fontSize: "22px",
    fontWeight: 700,
    color,
    lineHeight: 1.1,
  }),
  previewLabel: {
    fontFamily: LANDIQ_THEME.typography.fontFamily,
    fontSize: "11px",
    color: LANDIQ_THEME.colors.text.muted,
    marginTop: 2,
  } as React.CSSProperties,
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: LANDIQ_THEME.spacing.sm,
    marginTop: LANDIQ_THEME.spacing.sm,
    minWidth: 0,
  } as React.CSSProperties,
  progressRow: {
    display: "flex",
    alignItems: "center",
    gap: LANDIQ_THEME.spacing.sm,
    marginTop: LANDIQ_THEME.spacing.sm,
    fontFamily: LANDIQ_THEME.typography.fontFamily,
    fontSize: LANDIQ_THEME.typography.fontSize.sm,
    color: LANDIQ_THEME.colors.text.muted,
    minWidth: 0,
  } as React.CSSProperties,
  resultsRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: LANDIQ_THEME.spacing.sm,
    marginTop: LANDIQ_THEME.spacing.sm,
    fontFamily: LANDIQ_THEME.typography.fontFamily,
    fontSize: LANDIQ_THEME.typography.fontSize.sm,
    minWidth: 0,
  } as React.CSSProperties,
};

function buildBatchSelections(
  optimiserSelections: readonly OptimisedPatternSelection[],
  patterns: readonly PatternBookSchema[],
  selectedFeatures: readonly PropertyFeature[],
): BatchPlacementSelection[] {
  const patternById = new Map(patterns.map((p) => [p.metadata.id, p]));
  const featureById = new Map(selectedFeatures.map((f) => [f.id, f]));

  const result: BatchPlacementSelection[] = [];
  for (const selection of optimiserSelections) {
    const pattern = patternById.get(selection.patternId);
    const property = featureById.get(selection.featureId);
    if (!pattern || !property) continue;
    result.push({
      property,
      pattern,
      variant: selection.variant,
    });
  }
  return result;
}

function objectiveFromRadioValue(value: string): OptimisationObjective {
  return value === "gfa" ? "gfa" : "dwellings";
}

function placementProgressPercent(progress: {
  current: number;
  total: number;
}): number {
  const { current, total } = progress;
  if (total <= 0) return 0;
  return Math.round(((current + 1) / total) * 100);
}

export const OptimiseAndApplyPanel: React.FC<OptimiseAndApplyPanelProps> = ({
  analysisResult,
  selectedFeatures,
  patterns,
  bootstrap,
  bootstrapReady,
  instantPointId,
  batch,
}) => {
  const [objective, setObjective] = useState<OptimisationObjective>(
    "dwellings",
  );

  const optimisation: OptimisationSummary | null = useMemo(() => {
    if (!analysisResult) return null;
    const isVariantPlaceable: IsVariantPlaceable | undefined = bootstrap
      ? (patternId, variant) =>
          findBlockForVariant(bootstrap.blockCatalogue, variant, patternId) !==
          null
      : undefined;
    return optimisePatternSelection(analysisResult, objective, {
      isVariantPlaceable,
    });
  }, [analysisResult, objective, bootstrap]);

  const canApply =
    optimisation !== null &&
    optimisation.placeableSiteCount > 0 &&
    bootstrapReady &&
    bootstrap !== null &&
    instantPointId !== null &&
    batch.status !== "placing";

  const handleApply = async (): Promise<void> => {
    if (!optimisation || optimisation.selections.length === 0) return;
    const selections = buildBatchSelections(
      optimisation.selections,
      patterns,
      selectedFeatures,
    );
    await batch.place({
      selections,
      bootstrap,
      instantPointId,
      objective,
    });
  };

  const handleClear = async (): Promise<void> => {
    await batch.clear();
  };

  const handleAbort = (): void => {
    batch.abort();
  };

  if (!analysisResult) return null;

  const placing = batch.status === "placing";
  const placed = batch.status === "placed";
  const aborted = batch.status === "aborted";

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <Sparkles size={18} color={LANDIQ_THEME.colors.brand.supplementary} />
        <span style={styles.title}>Optimise &amp; apply to shortlist</span>
      </div>
      <div style={styles.subtitle}>
        Pick the best pattern for every eligible site and place it on the map
        via the pattern-book flow DAG. Optimisation is based on the
        pre-placement variant spec; final totals reflect real placement.
      </div>

      <RadioGroup
        value={objective}
        onChange={(value: string): void => {
          setObjective(objectiveFromRadioValue(value));
        }}
        name="patternbook-optimisation-objective"
        options={OPTIMISATION_OBJECTIVE_RADIO_OPTIONS}
      />

      {optimisation && (
        <div style={styles.previewGrid}>
          <div style={styles.previewCell(LANDIQ_THEME.colors.info.blue)}>
            <div style={styles.previewValue(LANDIQ_THEME.colors.info.blue)}>
              {optimisation.placeableSiteCount}
            </div>
            <div style={styles.previewLabel}>Sites to place</div>
          </div>
          <div style={styles.previewCell(LANDIQ_THEME.colors.brand.navy)}>
            <div style={styles.previewValue(LANDIQ_THEME.colors.brand.navy)}>
              {optimisation.totalProjectedDwellings.toLocaleString()}
            </div>
            <div style={styles.previewLabel}>Projected dwellings</div>
          </div>
          <div style={styles.previewCell(LANDIQ_THEME.colors.status.success)}>
            <div
              style={styles.previewValue(LANDIQ_THEME.colors.status.success)}
            >
              {Math.round(optimisation.totalProjectedGfa).toLocaleString()}m²
            </div>
            <div style={styles.previewLabel}>Projected GFA</div>
          </div>
        </div>
      )}

      {optimisation && optimisation.skippedSiteCount > 0 && (
        <InPageAlert type="info" compact>
          {optimisation.skippedSiteCount} site
          {optimisation.skippedSiteCount === 1 ? "" : "s"} skipped — no
          eligible pattern variant fits.
        </InPageAlert>
      )}

      <div style={styles.actions}>
        {!placing && (
          <Button
            variant="primary"
            onClick={handleApply}
            disabled={!canApply}
          >
            Apply to shortlist
          </Button>
        )}
        {placing && (
          <Button variant="outline" onClick={handleAbort}>
            Cancel
          </Button>
        )}
        {(placed || aborted) && batch.outcomes.length > 0 && (
          <Button variant="outline" onClick={handleClear}>
            <Trash2 size={14} />
            &nbsp;Clear placements
          </Button>
        )}
      </div>

      {placing && batch.progress && (
        <div style={styles.progressRow}>
          <Loader2
            size={14}
            style={{ animation: "spin 1s linear infinite" }}
          />
          <span>
            Placing {batch.progress.current + 1} of {batch.progress.total}
            {batch.progress.currentAddress
              ? ` — ${batch.progress.currentAddress}`
              : ""}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Progress value={placementProgressPercent(batch.progress)} />
          </div>
        </div>
      )}

      {placed && batch.totals && (
        <div style={styles.resultsRow}>
          <CheckCircle2
            size={16}
            color={LANDIQ_THEME.colors.status.success}
          />
          <span>
            Placed {batch.totals.successCount} site
            {batch.totals.successCount === 1 ? "" : "s"} —{" "}
          </span>
          <Badge variant="success">
            {batch.totals.totalDwellings.toLocaleString()} dwellings
          </Badge>
          <Badge variant="info">
            {Math.round(batch.totals.totalNetArea).toLocaleString()}m² net area
          </Badge>
          {batch.totals.failureCount > 0 && (
            <Badge variant="warning">
              {batch.totals.failureCount} failed
            </Badge>
          )}
        </div>
      )}

      {batch.status === "error" && batch.error && (
        <InPageAlert type="error" compact>
          <XCircle size={14} />
          &nbsp;{batch.error}
        </InPageAlert>
      )}
    </div>
  );
};
