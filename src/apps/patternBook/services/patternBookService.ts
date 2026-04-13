import logger from "@/lib/logger";
import type { PatternBookRegistry, PatternBookEntry, PatternBookSchema } from "@/apps/patternBook/types/patternBook";

const REGISTRY_PATH = "/pattern-book/index.json";
const SCHEMA_PATH_PREFIX = "/pattern-book/schema/";
const SERVICE_NAME = "PatternBookService";

const PATTERN_ID_TO_IMAGE_FILE: Record<string, string> = {
  SLA01: "small-lot-apartments-01",
  SLA02: "small-lot-apartments-02",
  SLA03: "small-lot-apartments-03",
  SLA04: "small-lot-apartments-04",
  LLA01: "large-lot-apartments-01",
  LLA02: "large-lot-apartments-02",
  LLA03: "large-lot-apartments-03",
  SD01: "semis-01",
  SD02: "semis-02",
  TH01: "terraces-01",
  TH02: "terraces-02",
  TH03: "terraces-03",
  TH04: "terraces-04",
  MH01: "row-homes-01",
  MN01: "manor-homes-01",
};

let cachedRegistry: PatternBookRegistry | null = null;
const schemaCache = new Map<string, PatternBookSchema>();

function isAllowedSchemaFetchPath(schemaPath: string): boolean {
  if (!schemaPath.startsWith(SCHEMA_PATH_PREFIX)) {
    return false;
  }
  if (schemaPath.includes("..") || schemaPath.includes("\\")) {
    return false;
  }
  if (schemaPath.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(schemaPath)) {
    return false;
  }
  return true;
}

function unknownPatternImageStem(patternId: string): string {
  let stem = patternId;
  if (/[/\\]|\.\./.test(stem)) {
    stem = stem.replaceAll(/[/\\]/g, "").replaceAll("..", "");
  }
  return stem.toLowerCase();
}

async function fetchPatternBookJson<T>(url: string, httpErrorPrefix: string, htmlFallbackMessage: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${httpErrorPrefix}: ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  const leading = text.trimStart();
  if (leading.startsWith("<!DOCTYPE") || leading.startsWith("<html")) {
    throw new Error(htmlFallbackMessage);
  }
  return JSON.parse(text) as T;
}

export async function loadPatternBookRegistry(): Promise<PatternBookEntry[]> {
  if (cachedRegistry) {
    return cachedRegistry.patterns.filter((p) => p.enabled);
  }

  try {
    cachedRegistry = await fetchPatternBookJson<PatternBookRegistry>(
      REGISTRY_PATH,
      "Failed to fetch pattern book registry",
      "Pattern book registry not found. Ensure index.json exists in public/pattern-book/",
    );

    logger.info(
      "Pattern book registry loaded",
      {
        version: cachedRegistry.version,
        patternCount: cachedRegistry.patterns.length,
      },
      SERVICE_NAME,
    );

    return cachedRegistry.patterns.filter((p) => p.enabled);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to load pattern book registry", { error: errorMessage }, SERVICE_NAME);
    throw error;
  }
}

export async function loadPatternBookSchema(schemaPath: string): Promise<PatternBookSchema> {
  const cached = schemaCache.get(schemaPath);
  if (cached) {
    return cached;
  }

  if (!isAllowedSchemaFetchPath(schemaPath)) {
    throw new Error("Invalid pattern book schema path");
  }

  try {
    const schema = await fetchPatternBookJson<PatternBookSchema>(
      schemaPath,
      "Failed to fetch pattern book schema",
      `Pattern book schema not found at ${schemaPath}`,
    );
    schemaCache.set(schemaPath, schema);

    logger.info(
      "Pattern book schema loaded",
      {
        id: schema.metadata.id,
        name: schema.metadata.name,
      },
      SERVICE_NAME,
    );

    return schema;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error(
      "Failed to load pattern book schema",
      {
        schemaPath,
        error: errorMessage,
      },
      SERVICE_NAME,
    );
    throw error;
  }
}

export async function loadAllPatternBooks(): Promise<PatternBookSchema[]> {
  try {
    const entries = await loadPatternBookRegistry();

    const schemaPromises = entries.map((entry) =>
      loadPatternBookSchema(entry.schemaPath).catch((error) => {
        logger.warn(
          "Failed to load pattern book",
          {
            id: entry.id,
            error: error instanceof Error ? error.message : "Unknown error",
          },
          SERVICE_NAME,
        );
        return null;
      }),
    );

    const schemas = await Promise.all(schemaPromises);
    const validSchemas = schemas.filter((s): s is PatternBookSchema => s !== null);

    logger.info(
      "All pattern books loaded",
      {
        total: entries.length,
        successful: validSchemas.length,
      },
      SERVICE_NAME,
    );

    return validSchemas;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to load all pattern books", { error: errorMessage }, SERVICE_NAME);
    return [];
  }
}

export function clearPatternBookCache(): void {
  cachedRegistry = null;
  schemaCache.clear();
  logger.info("Pattern book cache cleared", {}, SERVICE_NAME);
}

export function getPatternImagePath(patternId: string): string {
  const fileName = PATTERN_ID_TO_IMAGE_FILE[patternId] ?? unknownPatternImageStem(patternId);
  return `/pattern-book/design-images/${fileName}.jpg`;
}
