import { useState, useCallback, useRef, useEffect } from "react";
import type { PatternBookSchema } from "@/apps/patternBook/types/patternBook";
import type {
  ShortlistPatternAnalysisResult,
  AnalysisProgress,
  PropertyFeature,
} from "@/apps/patternBook/types/shortlistAnalysis";
import { runBatchAnalysis } from "@/apps/patternBook/services/batchAnalysisService";
import { loadAllPatternBooks } from "@/apps/patternBook/services/patternBookService";
import logger from "@/lib/logger";

const HOOK_NAME = "useShortlistPatternAnalysis";

export interface UseShortlistPatternAnalysisReturn {
  patterns: PatternBookSchema[];
  analysisResults: ShortlistPatternAnalysisResult | null;
  isLoadingPatterns: boolean;
  isAnalysing: boolean;
  progress: AnalysisProgress | null;
  error: string | null;
  runAnalysis: (features: PropertyFeature[]) => Promise<void>;
  cancelAnalysis: () => void;
  clearResults: () => void;
}

export function useShortlistPatternAnalysis(): UseShortlistPatternAnalysisReturn {
  const [patterns, setPatterns] = useState<PatternBookSchema[]>([]);
  const [analysisResults, setAnalysisResults] = useState<ShortlistPatternAnalysisResult | null>(null);
  const [isLoadingPatterns, setIsLoadingPatterns] = useState(true);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    async function loadPatterns(): Promise<void> {
      try {
        const loadedPatterns = await loadAllPatternBooks();
        if (!isMountedRef.current) return;
        setPatterns(loadedPatterns);
        setIsLoadingPatterns(false);
        logger.info("Patterns loaded for shortlist analysis", { count: loadedPatterns.length }, HOOK_NAME);
      } catch (err) {
        if (!isMountedRef.current) return;
        setError("Failed to load pattern book designs");
        setIsLoadingPatterns(false);
        logger.error("Failed to load patterns", { error: err }, HOOK_NAME);
      }
    }

    void loadPatterns();

    return (): void => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  const runAnalysis = useCallback(
    async (features: PropertyFeature[]) => {
      if (features.length === 0) {
        setError("No properties selected for analysis");
        return;
      }

      if (patterns.length === 0) {
        setError("No pattern book designs available");
        return;
      }

      setIsAnalysing(true);
      setError(null);
      setProgress({
        current: 0,
        total: features.length,
        currentPropertyAddress: "",
        phase: "loading",
      });

      abortControllerRef.current = new AbortController();

      try {
        logger.info(
          "Starting shortlist analysis",
          {
            propertyCount: features.length,
            patternCount: patterns.length,
          },
          HOOK_NAME,
        );

        const results = await runBatchAnalysis(features, patterns, {
          onProgress: (next) => {
            if (isMountedRef.current) setProgress(next);
          },
          abortSignal: abortControllerRef.current.signal,
        });

        if (!isMountedRef.current) return;

        setAnalysisResults(results);
        logger.info(
          "Shortlist analysis complete",
          {
            eligibleProperties: results.summary.eligiblePropertyCount,
            totalDwellings: results.summary.totalPotentialDwellings,
          },
          HOOK_NAME,
        );
      } catch (err) {
        if (!isMountedRef.current) return;
        const isCancelled =
          (err instanceof Error && err.message === "Analysis aborted") ||
          (err instanceof Error && err.name === "AbortError");
        if (isCancelled) {
          logger.info("Analysis was cancelled", {}, HOOK_NAME);
          setError("Analysis cancelled");
        } else {
          const errorMessage = err instanceof Error ? err.message : "Analysis failed";
          setError(errorMessage);
          logger.error("Shortlist analysis failed", { error: errorMessage }, HOOK_NAME);
        }
      } finally {
        abortControllerRef.current = null;
        if (isMountedRef.current) {
          setIsAnalysing(false);
          setProgress(null);
        }
      }
    },
    [patterns],
  );

  const cancelAnalysis = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      logger.info("Analysis cancellation requested", {}, HOOK_NAME);
    }
  }, []);

  const clearResults = useCallback(() => {
    setAnalysisResults(null);
    setError(null);
    setProgress(null);
  }, []);

  return {
    patterns,
    analysisResults,
    isLoadingPatterns,
    isAnalysing,
    progress,
    error,
    runAnalysis,
    cancelAnalysis,
    clearResults,
  };
}
