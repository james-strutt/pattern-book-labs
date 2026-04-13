import type { VariantMatch } from "@/apps/patternBook/types/patternBook";

export interface BlockSpec {
  /**
   * The landiq_labs pattern code (e.g. "SLA02") this block belongs to, or
   * null if the block is "generic" (matches any pattern dimensionally).
   */
  patternId: string | null;
  storeys: number | null;
  width: number | null;
  depth: number | null;
  setback: number | null;
  colourVariant: string | null;
  rawName: string;
}

/**
 * Structured properties that can be set on a Giraffe block (or its
 * rawSection origin point) to avoid fragile name-parsing.  When present
 * these take priority; any field left undefined falls back to the name
 * parser so existing blocks keep working during the migration.
 */
export interface BlockProperties {
  patternId?: string;
  storeys?: number;
  width?: number;
  depth?: number;
  setback?: number;
  colourVariant?: string;
}

/** Pattern codes the parser recognises as block tags. */
const KNOWN_PATTERN_CODES = [
  "TH01",
  "TH02",
  "TH03",
  "TH04",
  "SD01",
  "SD02",
  "MH01",
  "MN01",
  "SLA01",
  "SLA02",
  "SLA03",
  "SLA04",
  "LLA01",
  "LLA02",
  "LLA03",
] as const;

const PATTERN_TAG_REGEX = new RegExp(
  `\\b(${KNOWN_PATTERN_CODES.join("|")})\\b`,
  "i",
);

export interface BlockCatalogueEntry {
  id: string;
  name: string;
  description: string;
  spec: BlockSpec;
}

/**
 * Builds a BlockSpec from explicit block properties, falling back to
 * name-parsing for any field not set.  Once all blocks in the master
 * project carry structured properties the name parser can be removed.
 */
export function resolveBlockSpec(rawName: string, props?: BlockProperties): BlockSpec {
  const parsed = parseBlockName(rawName);
  if (!props) return parsed;

  return {
    patternId: props.patternId?.toUpperCase() ?? parsed.patternId,
    storeys: props.storeys ?? parsed.storeys,
    width: props.width ?? parsed.width,
    depth: props.depth ?? parsed.depth,
    setback: props.setback ?? parsed.setback,
    colourVariant: props.colourVariant ?? parsed.colourVariant,
    rawName,
  };
}

/**
 * Legacy name parser — extracts dimensional spec from Giraffe block names.
 * Naming conventions observed in project 70951:
 *
 *   "4 storey - 3m - 16.6x40"
 *   "3 storey - 1.5 setback - 13.6x40"
 *   "3s - 16 x 40m site"
 *   "5s - 19.8 x 65m site - Beige"
 *   "42m long site - 4 storey"
 *
 * Prefer setting structured BlockProperties on the block instead.
 */
function parseBlockName(rawName: string): BlockSpec {
  const name = rawName.toLowerCase();

  const patternTagMatch = rawName.match(PATTERN_TAG_REGEX);
  const patternId = patternTagMatch?.[1]
    ? patternTagMatch[1].toUpperCase()
    : null;

  const dimsMatch = name.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/);
  const width = dimsMatch ? Number(dimsMatch[1]) : null;
  let depth = dimsMatch ? Number(dimsMatch[2]) : null;

  const storeyWord = name.match(/(\d+)\s*storey/);
  const storeyShort = name.match(/\b(\d+)s\b/);
  const storeys = storeyWord
    ? Number(storeyWord[1])
    : storeyShort
      ? Number(storeyShort[1])
      : null;

  let setback: number | null = null;
  const explicitSetback = name.match(/(\d+(?:\.\d+)?)\s*m?\s*setback/);
  if (explicitSetback?.[1] !== undefined) {
    setback = Number(explicitSetback[1]);
  } else {
    const implicitSetback = name.match(
      /storey\s*-\s*(\d+(?:\.\d+)?)\s*m?\s*-/,
    );
    if (implicitSetback?.[1] !== undefined) {
      setback = Number(implicitSetback[1]);
    }
  }

  if (depth === null) {
    const longSite = name.match(/(\d+(?:\.\d+)?)\s*m?\s*long\s+site/);
    if (longSite?.[1] !== undefined) {
      depth = Number(longSite[1]);
    }
  }

  const colourVariant = name.includes("beige") ? "beige" : null;

  return {
    patternId,
    storeys,
    width,
    depth,
    setback,
    colourVariant,
    rawName,
  };
}

export interface BlockMatchScore {
  entry: BlockCatalogueEntry;
  score: number;
  fits: boolean;
}

/**
 * Scores a block's dimensional spec against a variant. Returns -1 if the
 * block cannot fit the variant (wrong pattern tag, too tall, too narrow,
 * too short); otherwise returns a score where higher = better match.
 *
 * Pattern-matching rules:
 *   - If the block has a `patternId` tag, it only matches variants whose
 *     `parentPatternId` matches (e.g. SLA02 blocks only match SLA02 variants).
 *   - If the block has no tag (`patternId === null`), it can match any pattern
 *     dimensionally — this is the "generic block" fallback.
 *   - A +20 bonus is given when `patternId` matches exactly, to prefer tagged
 *     blocks over generic ones when both dimensions fit.
 *
 * Storey-matching rules (fall-back degradation):
 *   - Blocks with more storeys than the variant's cap are rejected (can't
 *     build higher than planning permits).
 *   - Blocks with fewer storeys are allowed but scored lower — a 3-storey
 *     block for a 5-storey variant scores (3/5) × 100 = 60% of the storey
 *     component. This lets the matcher fall back to smaller buildings when
 *     the exact storey count isn't authored.
 *   - Storey score is weighted 60% vs 40% for geometry because storey count
 *     directly determines dwelling yield.
 */
export function scoreBlockForVariant(
  spec: BlockSpec,
  variant: VariantMatch,
  parentPatternId?: string,
): number {
  if (
    spec.patternId !== null &&
    parentPatternId !== undefined &&
    spec.patternId.toUpperCase() !== parentPatternId.toUpperCase()
  ) {
    return -1;
  }

  if (spec.storeys === null) return -1;
  if (spec.storeys > variant.storeys) return -1;

  if (spec.width !== null && spec.width < variant.lotWidth) return -1;
  if (spec.depth !== null && spec.depth < variant.lotLength) return -1;

  const storeyScore =
    variant.storeys > 0 ? (spec.storeys / variant.storeys) * 100 : 100;

  let geometryRaw = 0;
  let geometryDivisor = 0;
  if (spec.width !== null) {
    geometryRaw += (variant.lotWidth / spec.width) * 100;
    geometryDivisor++;
  }
  if (spec.depth !== null) {
    geometryRaw += (variant.lotLength / spec.depth) * 100;
    geometryDivisor++;
  }
  const geometryScore = geometryDivisor > 0 ? geometryRaw / geometryDivisor : 50;

  const combinedScore = storeyScore * 0.6 + geometryScore * 0.4;

  let setbackBonus = 0;
  if (spec.setback !== null) {
    const setbackDiff = Math.abs(spec.setback - variant.sideSetback);
    setbackBonus = Math.max(0, 10 - setbackDiff * 5);
  }

  const colourPenalty = spec.colourVariant === "beige" ? 5 : 0;

  const patternTagBonus =
    spec.patternId !== null &&
    parentPatternId !== undefined &&
    spec.patternId.toUpperCase() === parentPatternId.toUpperCase()
      ? 20
      : 0;

  return combinedScore + setbackBonus - colourPenalty + patternTagBonus;
}

/**
 * Finds the best-matching Giraffe block for a given variant. Returns null if
 * no block can accommodate the variant. When `parentPatternId` is supplied,
 * pattern-tagged blocks must match that pattern; generic (untagged) blocks
 * still work as fallbacks.
 */
export function findBlockForVariant(
  catalogue: BlockCatalogueEntry[],
  variant: VariantMatch,
  parentPatternId?: string,
): BlockCatalogueEntry | null {
  const scored: BlockMatchScore[] = catalogue
    .map((entry) => {
      const score = scoreBlockForVariant(
        entry.spec,
        variant,
        parentPatternId,
      );
      return {
        entry,
        score,
        fits: score > 0,
      };
    })
    .filter((result) => result.fits)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.entry ?? null;
}

export type RejectionReason =
  | "pattern_mismatch"
  | "untagged_block_excluded_by_pattern"
  | "no_storeys_parsed"
  | "too_tall"
  | "too_narrow"
  | "too_short";

export interface VariantMatchDiagnosis {
  patternId: string;
  variantDims: {
    lotWidth: number;
    lotLength: number;
    storeys: number;
    sideSetback: number;
  };
  totalBlocks: number;
  blocksTaggedForPattern: number;
  blocksWithMatchingStoreys: number;
  summary: string;
  candidates: Array<{
    blockName: string;
    blockId: string;
    spec: BlockSpec;
    reason: RejectionReason | "fits";
  }>;
}

/**
 * Runs the full scorer against every block in the catalogue for a given
 * variant and returns a structured report of why each candidate was accepted
 * or rejected. Use this when findBlockForVariant returns null to produce a
 * human-readable error message for the UI.
 */
export function diagnoseVariantMatch(
  catalogue: BlockCatalogueEntry[],
  variant: VariantMatch,
  parentPatternId: string,
): VariantMatchDiagnosis {
  const targetPattern = parentPatternId.toUpperCase();

  const candidates = catalogue.map((entry) => {
    const spec = entry.spec;
    let reason: RejectionReason | "fits" = "fits";

    if (spec.patternId === null) {
      reason = "untagged_block_excluded_by_pattern";
    } else if (spec.patternId.toUpperCase() !== targetPattern) {
      reason = "pattern_mismatch";
    } else if (spec.storeys === null) {
      reason = "no_storeys_parsed";
    } else if (spec.storeys > variant.storeys) {
      reason = "too_tall";
    } else if (spec.width !== null && spec.width < variant.lotWidth) {
      reason = "too_narrow";
    } else if (spec.depth !== null && spec.depth < variant.lotLength) {
      reason = "too_short";
    }

    return {
      blockName: entry.name,
      blockId: entry.id,
      spec,
      reason,
    };
  });

  const taggedForPattern = candidates.filter(
    (candidate) =>
      candidate.spec.patternId !== null &&
      candidate.spec.patternId.toUpperCase() === targetPattern,
  );
  const taggedWithinStoreyCap = taggedForPattern.filter(
    (candidate) =>
      candidate.spec.storeys !== null &&
      candidate.spec.storeys <= variant.storeys,
  );

  const summary = buildDiagnosisSummary({
    targetPattern,
    variant,
    taggedForPattern,
    taggedWithinStoreyCap,
  });

  return {
    patternId: targetPattern,
    variantDims: {
      lotWidth: variant.lotWidth,
      lotLength: variant.lotLength,
      storeys: variant.storeys,
      sideSetback: variant.sideSetback,
    },
    totalBlocks: catalogue.length,
    blocksTaggedForPattern: taggedForPattern.length,
    blocksWithMatchingStoreys: taggedWithinStoreyCap.length,
    summary,
    candidates,
  };
}

interface DiagnosisSummaryArgs {
  targetPattern: string;
  variant: VariantMatch;
  taggedForPattern: Array<{ spec: BlockSpec }>;
  taggedWithinStoreyCap: Array<{ spec: BlockSpec }>;
}

function buildDiagnosisSummary(args: DiagnosisSummaryArgs): string {
  const { targetPattern, variant, taggedForPattern, taggedWithinStoreyCap } =
    args;

  if (taggedForPattern.length === 0) {
    return `No blocks tagged "${targetPattern}" exist in the Giraffe project yet.`;
  }

  const parseableStoreys = taggedForPattern
    .map((c) => c.spec.storeys)
    .filter((s): s is number => s !== null);

  if (parseableStoreys.length === 0) {
    return `${targetPattern} has ${taggedForPattern.length} block(s) but none have a parseable storey count. Set the "storeys" property on each block.`;
  }

  if (taggedWithinStoreyCap.length === 0) {
    const minAvailableStoreys = Math.min(...parseableStoreys);
    return `${targetPattern} smallest block is ${minAvailableStoreys} storeys but variant caps at ${variant.storeys}. All blocks exceed the planning-allowed height.`;
  }

  const maxWidth = Math.max(
    ...taggedWithinStoreyCap
      .map((c) => c.spec.width)
      .filter((w): w is number => w !== null),
  );
  const maxDepth = Math.max(
    ...taggedWithinStoreyCap
      .map((c) => c.spec.depth)
      .filter((d): d is number => d !== null),
  );

  const widthProblem = Number.isFinite(maxWidth) && variant.lotWidth > maxWidth;
  const depthProblem =
    Number.isFinite(maxDepth) && variant.lotLength > maxDepth;

  if (widthProblem && depthProblem) {
    return `${targetPattern} blocks within ${variant.storeys}-storey cap max out at ${maxWidth}×${maxDepth}m but variant needs ${variant.lotWidth}×${variant.lotLength}m.`;
  }
  if (widthProblem) {
    return `${targetPattern} blocks within ${variant.storeys}-storey cap max out at ${maxWidth}m wide but variant needs ${variant.lotWidth}m.`;
  }
  if (depthProblem) {
    return `${targetPattern} blocks within ${variant.storeys}-storey cap max out at ${maxDepth}m deep but variant needs ${variant.lotLength}m.`;
  }

  return `${targetPattern} has ${taggedWithinStoreyCap.length} candidate block(s) within the storey cap but none fit for an unknown reason — inspect the candidates list.`;
}

export interface BlockInput {
  id: string;
  name?: string;
  description?: string;
  properties?: Record<string, unknown>;
}

/** Pick recognised BlockProperties from an untyped properties bag. */
function extractBlockProperties(props: Record<string, unknown> | undefined): BlockProperties | undefined {
  if (!props) return undefined;

  const out: BlockProperties = {};
  if (typeof props.patternId === "string") out.patternId = props.patternId;
  if (typeof props.storeys === "number" && Number.isFinite(props.storeys)) out.storeys = props.storeys;
  if (typeof props.width === "number" && Number.isFinite(props.width)) out.width = props.width;
  if (typeof props.depth === "number" && Number.isFinite(props.depth)) out.depth = props.depth;
  if (typeof props.setback === "number" && Number.isFinite(props.setback)) out.setback = props.setback;
  if (typeof props.colourVariant === "string") out.colourVariant = props.colourVariant;

  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Builds a catalogue entry list from a raw bundle blocks record.
 * Properties are read from two sources (both optional, merged together):
 *   1. `block.properties` — on the block definition itself
 *   2. `rawSectionPropsByBlockId` — from the rawSection origin point
 *      whose `blockId` matches the block's `id`
 *
 * rawSection properties win when both sources provide the same field,
 * since those are the values the user edits in the Giraffe project UI.
 * Any field still missing falls back to name-parsing.
 */
export function buildBlockCatalogue(
  blocks: Record<string, BlockInput>,
  rawSectionPropsByBlockId?: Map<string, Record<string, unknown>>,
): BlockCatalogueEntry[] {
  return Object.values(blocks).map((block) => {
    const blockProps = extractBlockProperties(block.properties);
    const sectionProps = extractBlockProperties(rawSectionPropsByBlockId?.get(block.id));
    const merged: BlockProperties | undefined =
      blockProps || sectionProps ? { ...blockProps, ...sectionProps } : undefined;

    return {
      id: block.id,
      name: block.name ?? "(unnamed)",
      description: block.description ?? "",
      spec: resolveBlockSpec(block.name ?? "", merged),
    };
  });
}

/**
 * Counts how many landiq_labs patterns have at least one variant that can be
 * matched to a block in the catalogue. Used by the status banner.
 */
export function countMatchablePatterns(
  catalogue: BlockCatalogueEntry[],
  patternVariantsByPatternId: Map<string, VariantMatch[]>,
): number {
  let count = 0;
  for (const variants of patternVariantsByPatternId.values()) {
    if (variants.some((variant) => findBlockForVariant(catalogue, variant))) {
      count++;
    }
  }
  return count;
}
