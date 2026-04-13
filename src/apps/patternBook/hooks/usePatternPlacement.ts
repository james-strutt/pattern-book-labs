import { useCallback, useEffect, useRef, useState } from "react";
import { placeVariantOnProperty, clearPlacementLayers } from "@/apps/patternBook/services/patternBookPlacementService";
import { capture } from "@/lib/posthog";
import { PATTERNBOOK_EVENTS } from "@/constants/analyticsEvents";
import logger from "@/lib/logger";
import type { PlaceVariantArgs, PlacementResult } from "@/apps/patternBook/types/placement";

const HOOK_NAME = "usePatternPlacement";

const INSTANT_POINT_UNAVAILABLE_MESSAGE =
  "Instant-point rawSection is not yet available in Giraffe state. " +
  "This usually resolves within a second after the project loads — try again.";

export type PlacementStatus = "idle" | "placing" | "placed" | "error";

export interface UsePatternPlacementReturn {
  status: PlacementStatus;
  error: string | null;
  result: PlacementResult | null;
  place: (
    args: Omit<PlaceVariantArgs, "bootstrap" | "instantPointId"> & {
      bootstrap: PlaceVariantArgs["bootstrap"] | null;
      instantPointId: string | null;
    },
  ) => Promise<PlacementResult | null>;
  clear: () => Promise<void>;
}

export function usePatternPlacement(): UsePatternPlacementReturn {
  const [status, setStatus] = useState<PlacementStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlacementResult | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return (): void => {
      isMountedRef.current = false;
    };
  }, []);

  const place = useCallback<UsePatternPlacementReturn["place"]>(async ({ bootstrap, instantPointId, ...rest }) => {
    const recordBlockedPlacement = (
      message: string,
      reason: "bootstrap_not_ready" | "instant_point_not_ready",
    ): null => {
      setError(message);
      setStatus("error");
      capture(PATTERNBOOK_EVENTS.PATTERN_PLACEMENT_FAILED, {
        pattern_id: rest.pattern.metadata.id,
        variant_id: rest.variant.variantId,
        reason,
      });
      return null;
    };

    if (!bootstrap) {
      return recordBlockedPlacement("Pattern book project is still loading", "bootstrap_not_ready");
    }
    if (!instantPointId) {
      return recordBlockedPlacement(INSTANT_POINT_UNAVAILABLE_MESSAGE, "instant_point_not_ready");
    }

    setStatus("placing");
    setError(null);
    const startedAt = performance.now();

    try {
      const placement = await placeVariantOnProperty({
        ...rest,
        bootstrap,
        instantPointId,
      });
      if (!isMountedRef.current) return placement;
      setResult(placement);
      setStatus("placed");
      capture(PATTERNBOOK_EVENTS.PATTERN_PLACED, {
        pattern_id: rest.pattern.metadata.id,
        variant_id: rest.variant.variantId,
        block_id: placement.blockId,
        fit_score: rest.variant.fitScore,
        dwellings: placement.stats.dwellings,
        net_area: placement.stats.netArea,
        fsr: placement.stats.fsr,
        duration_ms: Math.round(performance.now() - startedAt),
      });
      logger.info(
        "Pattern placement succeeded",
        {
          patternId: rest.pattern.metadata.id,
          variantId: rest.variant.variantId,
        },
        HOOK_NAME,
      );
      return placement;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (isMountedRef.current) {
        setError(message);
        setStatus("error");
      }
      capture(PATTERNBOOK_EVENTS.PATTERN_PLACEMENT_FAILED, {
        pattern_id: rest.pattern.metadata.id,
        variant_id: rest.variant.variantId,
        reason: "placement_error",
        error_message: message,
      });
      logger.error("Pattern placement failed", { error: message, patternId: rest.pattern.metadata.id }, HOOK_NAME);
      return null;
    }
  }, []);

  const clear = useCallback(async (): Promise<void> => {
    await clearPlacementLayers();
    if (!isMountedRef.current) return;
    setResult(null);
    setStatus("idle");
    setError(null);
  }, []);

  return {
    status,
    error,
    result,
    place,
    clear,
  };
}
