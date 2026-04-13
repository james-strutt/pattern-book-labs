import { MAX_FEATURE_JSON_STRING_LENGTH } from "@/apps/patternBook/services/batchAnalysisConstants";

export function parseJsonArrayFromFeatureString<T>(raw: string): T[] | null {
  if (raw.length > MAX_FEATURE_JSON_STRING_LENGTH) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}

export function parseJsonValueFromFeatureString(raw: string): unknown {
  if (raw.length > MAX_FEATURE_JSON_STRING_LENGTH) {
    return null;
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}
