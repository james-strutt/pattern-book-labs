import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import type {
  PatternBookSchema,
  VariantMatch,
} from "@/apps/patternBook/types/patternBook";
import type { EnvelopeSetbackParams } from "@/apps/patternBook/constants/envelopeSetbacks";
import type { FeatureWithProperties } from "@/constants/featureProps";
import type {
  ProjectedFeature,
  ProjectedPolygon,
} from "@/apps/patternBook/types/projectedGeometry";
import type { BootstrapResult } from "@/apps/patternBook/services/patternBookProjectBundleService";

export type PlaceablePropertyFeature = FeatureWithProperties & {
  geometry: Polygon | MultiPolygon;
};

export interface PlaceVariantArgs {
  property: PlaceablePropertyFeature;
  pattern: PatternBookSchema;
  variant: VariantMatch;
  setbacks: EnvelopeSetbackParams;
  bootstrap: BootstrapResult;
  instantPointId: string;
}

export interface PlacementStats {
  dwellings: number;
  netArea: number;
  fsr: number;
  footprintArea: number;
}

export interface PlacementResult {
  placedFeatures: Feature[];
  setbackFeatures: ProjectedFeature[];
  svgFeatures: ProjectedFeature[];
  featureCollection: FeatureCollection;
  stats: PlacementStats;
  blockId: string;
  siteFeature: ProjectedPolygon;
}
