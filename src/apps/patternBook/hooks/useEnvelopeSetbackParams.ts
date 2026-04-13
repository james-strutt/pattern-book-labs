import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  DEFAULT_ENVELOPE_SETBACK_PARAMS,
  ENVELOPE_SETBACK_INPUT_MAX_M,
  ENVELOPE_SETBACK_PARAMS_STORAGE_KEY,
  type EnvelopeSetbackParams,
} from "@/apps/patternBook/constants/envelopeSetbacks";
import logger from "@/lib/logger";

const HOOK_NAME = "useEnvelopeSetbackParams";

export function parseEnvelopeSetbackMeters(value: string | number | undefined): number {
  if (value === undefined || value === null) return 0;
  const trimmed = typeof value === "string" ? value.trim() : String(value);
  if (trimmed === "") return 0;
  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(ENVELOPE_SETBACK_INPUT_MAX_M, Math.max(0, parsed));
}

export function readEnvelopeSetbackParamsFromStorage(): EnvelopeSetbackParams {
  if (globalThis.window === undefined) return DEFAULT_ENVELOPE_SETBACK_PARAMS;
  try {
    const raw = globalThis.localStorage.getItem(ENVELOPE_SETBACK_PARAMS_STORAGE_KEY);
    if (!raw) return DEFAULT_ENVELOPE_SETBACK_PARAMS;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && "front" in parsed && "rear" in parsed && "side" in parsed) {
      const candidate = parsed as Record<string, unknown>;
      const front = candidate.front;
      const rear = candidate.rear;
      const side = candidate.side;
      if (
        typeof front === "number" &&
        typeof rear === "number" &&
        typeof side === "number" &&
        Number.isFinite(front) &&
        Number.isFinite(rear) &&
        Number.isFinite(side)
      ) {
        return {
          front: parseEnvelopeSetbackMeters(front),
          rear: parseEnvelopeSetbackMeters(rear),
          side: parseEnvelopeSetbackMeters(side),
        };
      }
    }
  } catch (error) {
    logger.warn(
      "Failed to read envelope setback params from storage",
      { error: error instanceof Error ? error.message : String(error) },
      HOOK_NAME,
    );
  }
  return DEFAULT_ENVELOPE_SETBACK_PARAMS;
}

function writeToStorage(params: EnvelopeSetbackParams): void {
  if (globalThis.window === undefined) return;
  try {
    globalThis.localStorage.setItem(ENVELOPE_SETBACK_PARAMS_STORAGE_KEY, JSON.stringify(params));
  } catch (error) {
    logger.warn(
      "Failed to persist envelope setback params",
      { error: error instanceof Error ? error.message : String(error) },
      HOOK_NAME,
    );
  }
}

export interface UseEnvelopeSetbackParamsReturn {
  params: EnvelopeSetbackParams;
  setParams: Dispatch<SetStateAction<EnvelopeSetbackParams>>;
  setField: (field: keyof EnvelopeSetbackParams, value: string | number) => void;
  reset: () => void;
}

export function useEnvelopeSetbackParams(): UseEnvelopeSetbackParamsReturn {
  const [params, setParams] = useState<EnvelopeSetbackParams>(readEnvelopeSetbackParamsFromStorage);

  useEffect(() => {
    writeToStorage(params);
  }, [params]);

  const setField = useCallback<UseEnvelopeSetbackParamsReturn["setField"]>((field, value) => {
    const parsed = parseEnvelopeSetbackMeters(value);
    setParams((prev) => ({ ...prev, [field]: parsed }));
  }, []);

  const reset = useCallback((): void => {
    setParams(DEFAULT_ENVELOPE_SETBACK_PARAMS);
  }, []);

  return { params, setParams, setField, reset };
}
