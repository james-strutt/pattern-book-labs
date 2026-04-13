import { rpc, giraffeState } from "@gi-nx/iframe-sdk";
const uniq = <T>(arr: T[]): T[] => [...new Set(arr)];
const isEqual = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
import { PATTERN_BOOK_SHORT_LIST } from "@/apps/patternBook/constants/patternBookFlowDag";
import { PATTERN_BOOK_PROJECT_ID, INSTANT_POINT_LAYER_NAME } from "@/apps/patternBook/constants/placementLayers";
import { getPatternStats } from "@/apps/patternBook/utils/patternStats";
import { getBlockInherentBearingDegrees } from "@/apps/patternBook/utils/frontageDetection";
import { buildBlockCatalogue, type BlockCatalogueEntry } from "@/apps/patternBook/utils/blockCatalogue";
import { ensureClipperLoaded } from "@/utils/geometry/clipperLoader";
import type { PatternStats, ProjectedFeature } from "@/apps/patternBook/types/projectedGeometry";
import logger from "@/lib/logger";

const SERVICE = "PatternBookBootstrap";

const SETBACK_SIDE_METRES = 1.5;
const SETBACK_FRONT_REAR_METRES = 3;

function readGiraffeState(key: string): unknown {
  return (giraffeState as { get: (k: string) => unknown }).get(key);
}

function normaliseProjectOrigin(value: unknown): [number, number] {
  if (!Array.isArray(value) || value.length < 2) {
    return [0, 0];
  }
  const [a, b] = value;
  if (typeof a !== "number" || typeof b !== "number") {
    return [0, 0];
  }
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    logger.warn("Invalid projectOrigin from giraffeState; using [0, 0]", { value }, SERVICE);
    return [0, 0];
  }
  return [a, b];
}

function normaliseProjectApps(value: unknown): ProjectBundle["projectApps"] | null {
  if (Array.isArray(value)) return value as ProjectBundle["projectApps"];
  if (value && typeof value === "object") return Object.values(value) as ProjectBundle["projectApps"];
  return null;
}

function parseProjectBundle(raw: unknown): ProjectBundle | null {
  if (raw === null || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const { blocks, flows, rawSections, projectApps } = o;

  if (
    !blocks ||
    typeof blocks !== "object" ||
    !flows ||
    typeof flows !== "object" ||
    !rawSections ||
    typeof rawSections !== "object"
  ) {
    return null;
  }

  const normalisedApps = normaliseProjectApps(projectApps);
  if (!normalisedApps) {
    return null;
  }

  (o as { projectApps: ProjectBundle["projectApps"] }).projectApps = normalisedApps;
  return raw as ProjectBundle;
}

export interface BlockFeatureDef {
  properties: Record<string, unknown> & { _projected?: unknown };
  _projected?: unknown;
}

export interface BlockDefinition {
  id: string;
  name?: string;
  description?: string;
  features: BlockFeatureDef[];
}

interface RawSection {
  geometry: { type: string; coordinates: unknown };
  properties: Record<string, unknown> & {
    blockId?: string;
    buildingWidth?: number;
    buildingDepth?: number;
    minSiteArea?: number;
    maxHeight?: number;
    rotation?: number;
  };
}

interface ProjectBundle {
  blocks: Record<string, BlockDefinition>;
  flows: Record<string, unknown>;
  rawSections: Record<string, RawSection>;
  projectApps: Array<{
    featureCategories?: { usage?: Record<string, unknown> };
  }>;
}

export interface BootstrapResult {
  blocksReady: boolean;
  patternStatsByBlockId: Map<string, PatternStats>;
  blockCatalogue: BlockCatalogueEntry[];
  bundleBlocks: Record<string, BlockDefinition>;
  blockRotationsByBlockId: Map<string, number>;
  blockInherentBearingByBlockId: Map<string, number>;
  projectAppsByAppID: Record<number, unknown>;
}

let inFlightBootstrap: Promise<BootstrapResult> | null = null;

export function copyProjectedOntoBlockFeatures(features: BlockFeatureDef[]): void {
  for (const blockEntry of features) {
    const propsBag = blockEntry.properties as Record<string, unknown>;
    propsBag._projected = blockEntry._projected;
  }
}

export async function bootstrapPatternBookProject(): Promise<BootstrapResult> {
  if (inFlightBootstrap) return inFlightBootstrap;

  inFlightBootstrap = doBootstrap().finally(() => {
    inFlightBootstrap = null;
  });

  return inFlightBootstrap;
}

async function loadProjectBundle(): Promise<ProjectBundle> {
  const attempts: Array<string | number> = [PATTERN_BOOK_PROJECT_ID, String(PATTERN_BOOK_PROJECT_ID)];

  const errors: string[] = [];
  for (const candidate of attempts) {
    try {
      const bundleResult = await rpc.invoke("getProjectBundle", [candidate]);
      if (!bundleResult) {
        errors.push(`${candidate}: getProjectBundle returned ${typeof bundleResult}`);
        continue;
      }
      const parsed = parseProjectBundle(bundleResult);
      if (parsed) {
        logger.info("getProjectBundle succeeded", { projectId: candidate }, SERVICE);
        return parsed;
      }
      errors.push(`${candidate}: malformed project bundle shape`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${candidate}: ${message}`);
    }
  }

  try {
    const result = (await rpc.invoke("getProjects")) as {
      features?: Array<{ properties: Record<string, unknown> }>;
    } | null;
    const available =
      result?.features?.map((f) => ({
        id: f.properties.id,
        name: f.properties.name,
      })) ?? [];
    logger.error(
      "getProjectBundle failed. Available projects from getProjects (set VITE_PATTERN_BOOK_PROJECT_ID to one of these IDs)",
      {
        attemptedIds: attempts,
        errors,
        availableCount: available.length,
        available: available.slice(0, 20),
      },
      SERVICE,
    );
  } catch (error) {
    logger.error(
      "getProjectBundle failed and getProjects diagnostic also failed",
      {
        attemptedIds: attempts,
        errors,
        diagnosticError: error instanceof Error ? error.message : String(error),
      },
      SERVICE,
    );
  }

  throw new Error(
    `Pattern book project not found. Tried: ${attempts.join(", ")}. ` +
      "Check the console logs for a list of available Giraffe projects and " +
      "update VITE_PATTERN_BOOK_PROJECT_ID in your .env file.",
  );
}

function flowIdsFromBundleBlocks(blocks: Record<string, BlockDefinition>): string[] {
  return uniq(
    Object.values(blocks).flatMap((block) =>
      block.features
        .map((feature) => (feature.properties as { flow?: { id?: string } }).flow?.id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
}

async function registerBundleBlocks(bundle: ProjectBundle, existingBlocks: Record<string, unknown>): Promise<void> {
  for (const block of Object.values(bundle.blocks)) {
    if (existingBlocks[block.id]) continue;
    const cloned = structuredClone(block);
    copyProjectedOntoBlockFeatures(cloned.features);
    try {
      await rpc.invoke("createBlock", [cloned]);
    } catch (error) {
      logger.warn(
        "createBlock failed for pattern block",
        {
          blockId: block.id,
          error: error instanceof Error ? error.message : String(error),
        },
        SERVICE,
      );
    }
  }
}

async function registerFlowsFromBundle(bundle: ProjectBundle): Promise<void> {
  const flowIds = flowIdsFromBundleBlocks(bundle.blocks);
  for (const flowId of flowIds) {
    const flow = bundle.flows[flowId];
    if (!flow) continue;
    try {
      await rpc.invoke("addFlowDag", [flow]);
    } catch (error) {
      logger.warn(
        "addFlowDag failed for related flow",
        {
          flowId,
          error: error instanceof Error ? error.message : String(error),
        },
        SERVICE,
      );
    }
  }
}

interface BlockOriginStatsMaps {
  patternStatsByBlockId: Map<string, PatternStats>;
  blockRotationsByBlockId: Map<string, number>;
  blockInherentBearingByBlockId: Map<string, number>;
}

async function evaluateStatsForBlockOrigins(
  bundle: ProjectBundle,
  projectOrigin: [number, number],
): Promise<BlockOriginStatsMaps> {
  const patternStatsByBlockId = new Map<string, PatternStats>();
  const blockRotationsByBlockId = new Map<string, number>();
  const blockInherentBearingByBlockId = new Map<string, number>();
  const blockOrigins = Object.values(bundle.rawSections).filter(
    (section): section is RawSection =>
      section.geometry.type === "Point" && typeof section.properties.blockId === "string",
  );

  for (const origin of blockOrigins) {
    const blockId = origin.properties.blockId;
    if (!blockId) continue;
    if (patternStatsByBlockId.has(blockId)) continue;

    const originRotation = typeof origin.properties.rotation === "number" ? origin.properties.rotation : 0;
    blockRotationsByBlockId.set(blockId, originRotation);

    const anchoredOrigin = {
      ...origin,
      geometry: {
        type: "Point",
        coordinates: projectOrigin,
      },
      properties: { ...origin.properties, scale: 1 },
    };

    try {
      const evaluated = await rpc.invoke("evaluateFeatures", [[anchoredOrigin]]);
      const evaluatedFeatures = Object.values(evaluated as Record<string, unknown>).flat() as ProjectedFeature[];

      const rawStats = getPatternStats(evaluatedFeatures);

      const inherentBearing = getBlockInherentBearingDegrees(evaluatedFeatures);
      if (inherentBearing !== null) {
        blockInherentBearingByBlockId.set(blockId, inherentBearing);
      }

      const minSiteWidth = (origin.properties.buildingWidth ?? 0) + 2 * SETBACK_SIDE_METRES;
      const minSiteDepth = (origin.properties.buildingDepth ?? 0) + 2 * SETBACK_FRONT_REAR_METRES;
      const minSiteArea = origin.properties.minSiteArea ?? 0;
      const maxHeight = origin.properties.maxHeight ?? 0;

      patternStatsByBlockId.set(blockId, {
        ...rawStats,
        minSiteWidth,
        minSiteDepth,
        minSiteArea,
        maxHeight,
      });
    } catch (error) {
      logger.warn(
        "evaluateFeatures failed for block origin",
        {
          blockId,
          error: error instanceof Error ? error.message : String(error),
        },
        SERVICE,
      );
    }
  }

  return {
    patternStatsByBlockId,
    blockRotationsByBlockId,
    blockInherentBearingByBlockId,
  };
}

async function syncUsageCategoriesFromBundle(
  bundle: ProjectBundle,
  projectAppsByAppID: Record<number, unknown>,
): Promise<void> {
  const projectUsages = bundle.projectApps[1]?.featureCategories?.usage ?? {};
  const currentUsages =
    (projectAppsByAppID[1] as { featureCategories?: { usage?: Record<string, unknown> } } | undefined)
      ?.featureCategories?.usage ?? {};

  for (const [name, usage] of Object.entries(projectUsages)) {
    const current = currentUsages[name];
    try {
      if (!current) {
        await rpc.invoke("createUsage", [name, usage]);
      } else if (!isEqual(usage, current)) {
        await rpc.invoke("updateUsage", [name, usage]);
      }
    } catch (error) {
      logger.warn(
        "Failed to sync usage category",
        {
          usage: name,
          error: error instanceof Error ? error.message : String(error),
        },
        SERVICE,
      );
    }
  }
}

function logPatternBookBootstrapped(
  blockCatalogue: BlockCatalogueEntry[],
  parseableCount: number,
  stats: BlockOriginStatsMaps,
): void {
  const { patternStatsByBlockId, blockRotationsByBlockId, blockInherentBearingByBlockId } = stats;
  const nonZeroRotations = Array.from(blockRotationsByBlockId.entries()).filter(([, rotation]) => rotation !== 0);
  const inherentBearingSample = Array.from(blockInherentBearingByBlockId.entries()).slice(0, 8);
  logger.info(
    "Pattern book project bootstrapped",
    {
      blockCount: patternStatsByBlockId.size,
      catalogueSize: blockCatalogue.length,
      parseableBlocks: parseableCount,
      totalRotations: blockRotationsByBlockId.size,
      nonZeroRotationCount: nonZeroRotations.length,
      sampleRotations: nonZeroRotations.slice(0, 5),
      inherentBearingsDetected: blockInherentBearingByBlockId.size,
      inherentBearingSample,
    },
    SERVICE,
  );
}

async function doBootstrap(): Promise<BootstrapResult> {
  logger.info("Bootstrapping pattern book project", { projectId: PATTERN_BOOK_PROJECT_ID }, SERVICE);

  await ensureClipperLoaded();
  await rpc.invoke("addFlowDag", [PATTERN_BOOK_SHORT_LIST]);

  const bundle = await loadProjectBundle();
  const existingBlocks = (readGiraffeState("blocks") as Record<string, unknown> | undefined) ?? {};
  await registerBundleBlocks(bundle, existingBlocks);
  await registerFlowsFromBundle(bundle);

  const projectOrigin = normaliseProjectOrigin(readGiraffeState("projectOrigin"));
  const originStats = await evaluateStatsForBlockOrigins(bundle, projectOrigin);

  const projectAppsByAppID = (readGiraffeState("projectAppsByAppID") as Record<number, unknown> | undefined) ?? {};
  await syncUsageCategoriesFromBundle(bundle, projectAppsByAppID);

  await ensureInstantPointRawSection(projectOrigin);

  const blockCatalogue = buildBlockCatalogue(
    bundle.blocks as Record<string, { id: string; name?: string; description?: string }>,
  );
  const parseableCount = blockCatalogue.filter(
    (entry) => entry.spec.storeys !== null && entry.spec.width !== null,
  ).length;

  const result: BootstrapResult = {
    blocksReady: true,
    patternStatsByBlockId: originStats.patternStatsByBlockId,
    blockCatalogue,
    bundleBlocks: bundle.blocks,
    blockRotationsByBlockId: originStats.blockRotationsByBlockId,
    blockInherentBearingByBlockId: originStats.blockInherentBearingByBlockId,
    projectAppsByAppID,
  };

  logPatternBookBootstrapped(blockCatalogue, parseableCount, originStats);

  return result;
}

async function ensureInstantPointRawSection(projectOrigin: [number, number]): Promise<void> {
  const state = readGiraffeState("rawSections") as
    | {
        features?: Array<{
          geometry?: { type?: string };
          properties?: Record<string, unknown>;
        }>;
      }
    | null
    | undefined;

  const alreadyExists = state?.features?.some(
    (feature) =>
      feature.geometry?.type === "Point" &&
      (feature.properties as { layerId?: string } | undefined)?.layerId === INSTANT_POINT_LAYER_NAME,
  );

  if (alreadyExists) return;

  try {
    await rpc.invoke("createRawSection", [
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: projectOrigin },
        properties: {
          layerId: INSTANT_POINT_LAYER_NAME,
          fillOpacity: 0,
        },
      },
    ]);
    logger.info("Instant-point rawSection created (fire-and-forget)", {}, SERVICE);
  } catch (error) {
    logger.warn(
      "Failed to create instant-point rawSection",
      { error: error instanceof Error ? error.message : String(error) },
      SERVICE,
    );
  }
}

export function clearPatternBookBootstrap(): void {
  inFlightBootstrap = null;
}
