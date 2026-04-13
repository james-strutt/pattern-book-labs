import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGiraffeState } from "@gi-nx/iframe-sdk-react";
import {
  bootstrapPatternBookProject,
  clearPatternBookBootstrap,
  type BootstrapResult,
} from "@/apps/patternBook/services/patternBookProjectBundleService";
import { INSTANT_POINT_LAYER_NAME } from "@/apps/patternBook/constants/placementLayers";
import logger from "@/lib/logger";

const HOOK_NAME = "usePatternBookProjectBundle";

interface RawSectionFeature {
  geometry?: { type?: string };
  properties?: Record<string, unknown> & { id?: string; layerId?: string };
}

interface RawSectionsState {
  features?: RawSectionFeature[];
}

export type BootstrapStatus = "idle" | "loading" | "ready" | "error";

export interface UsePatternBookProjectBundleReturn {
  status: BootstrapStatus;
  bootstrap: BootstrapResult | null;
  instantPointId: string | null;
  error: string | null;
  retry: () => void;
}

interface UsePatternBookProjectBundleOptions {
  autoStart?: boolean;
}

export function usePatternBookProjectBundle(
  options: UsePatternBookProjectBundleOptions = {},
): UsePatternBookProjectBundleReturn {
  const { autoStart = true } = options;

  const mainRawSections = useGiraffeState("rawSections") as RawSectionsState | null;

  const instantPointId = useMemo<string | null>(() => {
    const match = mainRawSections?.features?.find(
      (feature) => feature?.geometry?.type === "Point" && feature?.properties?.layerId === INSTANT_POINT_LAYER_NAME,
    );
    return match?.properties?.id ?? null;
  }, [mainRawSections]);

  const [status, setStatus] = useState<BootstrapStatus>("idle");
  const [bootstrap, setBootstrap] = useState<BootstrapResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const run = useCallback(async (): Promise<void> => {
    setStatus("loading");
    setError(null);
    try {
      const result = await bootstrapPatternBookProject();
      if (!isMountedRef.current) return;
      setBootstrap(result);
      setStatus("ready");
    } catch (err) {
      if (!isMountedRef.current) return;
      const message = err instanceof Error ? err.message : "Failed to bootstrap pattern book project";
      logger.error("Pattern book bootstrap failed", { error: message }, HOOK_NAME);
      setError(message);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return (): void => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!autoStart || status !== "idle") return;
    const timeoutId = globalThis.setTimeout(() => {
      void run();
    }, 0);
    return (): void => globalThis.clearTimeout(timeoutId);
  }, [autoStart, status, run]);

  useEffect(() => {
    if (!bootstrap) return;
    const hasRotationMap = bootstrap.blockRotationsByBlockId instanceof Map;
    const hasInherentMap = bootstrap.blockInherentBearingByBlockId instanceof Map;
    if (hasRotationMap && hasInherentMap) return;
    logger.warn(
      "Stale bootstrap detected in hook state (missing schema fields) — discarding and re-bootstrapping.",
      { hasRotationMap, hasInherentMap },
      HOOK_NAME,
    );
    clearPatternBookBootstrap();
    setBootstrap(null);
    setStatus("idle");
  }, [bootstrap]);

  const retry = useCallback((): void => {
    clearPatternBookBootstrap();
    setBootstrap(null);
    setStatus("idle");
    setError(null);
  }, []);

  return {
    status,
    bootstrap,
    instantPointId,
    error,
    retry,
  };
}
