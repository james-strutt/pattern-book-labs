import type { Feature } from "geojson";
import type { PlaceablePropertyFeature } from "@/apps/patternBook/types/placement";
import type { PatternBookSchema, VariantMatch } from "@/apps/patternBook/types/patternBook";
import type { BootstrapResult } from "@/apps/patternBook/services/patternBookProjectBundleService";
import type { ProjectedFeature, ProjectedPolygon } from "@/apps/patternBook/types/projectedGeometry";
import type { EnvelopeSetbackParams } from "@/apps/patternBook/constants/envelopeSetbacks";

export interface ShortlistPlacementSelection {
  property: PlaceablePropertyFeature;
  pattern: PatternBookSchema;
  variant: VariantMatch;
}

export interface ShortlistPlacementProgress {
  current: number;
  total: number;
  currentAddress: string;
}

export interface PlaceShortlistArgs {
  selections: readonly ShortlistPlacementSelection[];
  setbacks: EnvelopeSetbackParams;
  bootstrap: BootstrapResult;
  instantPointId: string;
  onProgress?: (progress: ShortlistPlacementProgress) => void;
  abortSignal?: AbortSignal;
}

export interface ShortlistPlacementOutcome {
  featureId: string;
  address: string;
  patternId: string;
  variantId: string;
  blockId: string;
  success: boolean;
  dwellings: number;
  netArea: number;
  fsr: number;
  footprintArea: number;
  placedFeatures: Feature[];
  projectedSetbackFeatures: ProjectedFeature[];
  projectedStackedFeatures: ProjectedFeature[];
  projectedSiteFeature: ProjectedPolygon | null;
  error: string | null;
}

export interface PlaceShortlistResult {
  outcomes: ShortlistPlacementOutcome[];
  totals: {
    totalDwellings: number;
    totalNetArea: number;
    successCount: number;
    failureCount: number;
  };
}

export interface PreparedSite {
  outcomeIndex: number;
  selection: ShortlistPlacementSelection;
  siteFeature: ProjectedPolygon;
  blockId: string;
  blockName: string;
  frontageBearingRad: number | null;
}
