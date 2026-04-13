/**
 * Master Giraffe project containing the authored pattern blocks.
 * Blocks are authored at 0° true north so no post-rotation correction
 * is needed after flow DAG evaluation. Can be overridden via
 * `VITE_PATTERN_BOOK_PROJECT_ID` for staging/dev.
 */
export const PATTERN_BOOK_PROJECT_ID = Number(import.meta.env.VITE_PATTERN_BOOK_PROJECT_ID ?? 70951);

export const PLACEMENT_LAYER_NAMES = {
  PATTERN: "pattern-book-placement-patterns",
  SELECTED_SITES: "pattern-book-placement-selected-sites",
  SELECTED_SITE: "pattern-book-placement-selected-site",
  SITE_SETBACK: "pattern-book-placement-site-setback",
} as const;

export const INSTANT_POINT_LAYER_NAME = "instant-point";

export const PATTERN_MAIN_BATCH_SIZE = 20;

export const GET_SITES_DEBOUNCE_MS = 300;

export type SiteType = "battle-axe" | "mid-block" | "corner" | "mixed-use" | "other";

export const FLOW_DAG_SITE_TYPE = {
  BATTLE_AXE: "battle-axe",
  MID_BLOCK: "mid-block",
  CORNER: "corner",
  MIXED_USE: "mixed-use",
  OTHER: "other",
} as const satisfies Record<string, SiteType>;
