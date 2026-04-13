import { useCallback, useEffect, useRef, useState } from "react";
import {
  placeVariantsOnShortlist,
  clearPlacementLayers,
  type ShortlistPlacementSelection,
  type ShortlistPlacementOutcome,
  type ShortlistPlacementProgress,
  type PlaceShortlistResult,
} from "@/apps/patternBook/services/patternBookPlacementService";
import { capture } from "@/lib/posthog";
import { PATTERNBOOK_EVENTS } from "@/constants/analyticsEvents";
import logger from "@/lib/logger";
import type { BootstrapResult } from "@/apps/patternBook/services/patternBookProjectBundleService";
import { readEnvelopeSetbackParamsFromStorage } from "@/apps/patternBook/hooks/useEnvelopeSetbackParams";
import type { OptimisationObjective } from "@/apps/patternBook/utils/optimisePatternSelection";

const HOOK_NAME = "usePatternPlacementBatch";

export type BatchPlacementStatus = "idle" | "placing" | "placed" | "aborted" | "error";

export type BatchPlacementSelection = ShortlistPlacementSelection;

export type BatchPlacementProgress = ShortlistPlacementProgress;

export type BatchPlacementOutcome = ShortlistPlacementOutcome;

export interface BatchPlacementTotals {
  totalDwellings: number;
  totalNetArea: number;
  successCount: number;
  failureCount: number;
}

export interface BatchPlacementRunArgs {
  selections: readonly BatchPlacementSelection[];
  bootstrap: BootstrapResult | null;
  instantPointId: string | null;
  objective: OptimisationObjective;
}

export interface UsePatternPlacementBatchReturn {
  status: BatchPlacementStatus;
  progress: BatchPlacementProgress | null;
  outcomes: BatchPlacementOutcome[];
  totals: BatchPlacementTotals | null;
  error: string | null;
  place: (args: BatchPlacementRunArgs) => Promise<void>;
  clear: () => Promise<void>;
  abort: () => void;
}

export function usePatternPlacementBatch(): UsePatternPlacementBatchReturn {
  const [status, setStatus] = useState<BatchPlacementStatus>("idle");
  const [progress, setProgress] = useState<BatchPlacementProgress | null>(null);
  const [outcomes, setOutcomes] = useState<BatchPlacementOutcome[]>([]);
  const [totals, setTotals] = useState<BatchPlacementTotals | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return (): void => {
      isMountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const place = useCallback<UsePatternPlacementBatchReturn["place"]>(
    async ({ selections, bootstrap, instantPointId, objective }) => {
      if (!selections.length) {
        setError("No eligible sites to place");
        setStatus("error");
        return;
      }
      if (!bootstrap) {
        setError("Pattern book project is still loading");
        setStatus("error");
        return;
      }
      if (!instantPointId) {
        setError(
          "Instant-point rawSection is not yet available in Giraffe state. " +
            "This usually resolves within a second after the project loads — try again.",
        );
        setStatus("error");
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;

      setStatus("placing");
      setError(null);
      setOutcomes([]);
      setTotals(null);
      setProgress({
        current: 0,
        total: selections.length,
        currentAddress: "",
      });

      const startedAt = performance.now();
      capture(PATTERNBOOK_EVENTS.SHORTLIST_PLACEMENT_BATCH_STARTED, {
        site_count: selections.length,
        objective,
      });
      logger.info("Batch placement started", { siteCount: selections.length, objective }, HOOK_NAME);

      const storedSetbacks = readEnvelopeSetbackParamsFromStorage();

      let result: PlaceShortlistResult;
      try {
        result = await placeVariantsOnShortlist({
          selections,
          setbacks: storedSetbacks,
          bootstrap,
          instantPointId,
          abortSignal: controller.signal,
          onProgress: (p) => {
            if (!isMountedRef.current) return;
            setProgress(p);
            capture(PATTERNBOOK_EVENTS.SHORTLIST_PLACEMENT_BATCH_PROGRESS, {
              current: p.current,
              total: p.total,
            });
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown placement error";
        if (isMountedRef.current) {
          setError(message);
          setStatus("error");
        }
        capture(PATTERNBOOK_EVENTS.SHORTLIST_PLACEMENT_BATCH_FAILED, {
          site_count: selections.length,
          objective,
          reason: "service_error",
          error_message: message,
        });
        logger.error("Batch placement service threw", { error: message }, HOOK_NAME);
        abortRef.current = null;
        return;
      }

      if (isMountedRef.current) {
        setOutcomes(result.outcomes);
        setProgress(null);
        if (controller.signal.aborted) {
          setStatus("aborted");
        } else {
          setTotals(result.totals);
          setStatus("placed");
        }
      }

      abortRef.current = null;

      if (controller.signal.aborted) {
        return;
      }

      capture(PATTERNBOOK_EVENTS.SHORTLIST_PLACEMENT_BATCH_COMPLETED, {
        site_count: selections.length,
        objective,
        success_count: result.totals.successCount,
        failure_count: result.totals.failureCount,
        total_dwellings: result.totals.totalDwellings,
        total_net_area: result.totals.totalNetArea,
        duration_ms: Math.round(performance.now() - startedAt),
      });
      logger.info(
        "Batch placement completed",
        {
          siteCount: selections.length,
          successCount: result.totals.successCount,
          failureCount: result.totals.failureCount,
          totalDwellings: result.totals.totalDwellings,
        },
        HOOK_NAME,
      );
    },
    [],
  );

  const clear = useCallback(async (): Promise<void> => {
    await clearPlacementLayers();
    if (!isMountedRef.current) return;
    setOutcomes([]);
    setTotals(null);
    setProgress(null);
    setStatus("idle");
    setError(null);
    capture(PATTERNBOOK_EVENTS.SHORTLIST_PLACEMENT_BATCH_CLEARED, {});
  }, []);

  const abort = useCallback((): void => {
    abortRef.current?.abort();
  }, []);

  return {
    status,
    progress,
    outcomes,
    totals,
    error,
    place,
    clear,
    abort,
  };
}
