import type { FeatureWithProperties } from "@/constants/featureProps";
import type * as GeoJSON from "geojson";

export interface ProjectLayer {
  id: string | number;
  layer_full?: {
    name?: string;
    description?: string;
  };
  name?: string;
}

export interface ShortlistLayer {
  id: string;
  name: string;
  description?: string;
  projectLayer?: ProjectLayer;
  rawFeature?: FeatureWithProperties;
}

export interface ShortlistContents extends GeoJSON.FeatureCollection {
  features: FeatureWithProperties[];
  lastModified?: string;
}

export interface ShortlistSummaryStats {
  propertyCount: number;
  totalArea: number;
  zoneBreakdown: Record<string, number>;
  fieldBreakdowns: Record<string, Record<string, number>>;
}

export interface ShortlistPropertySummary {
  featureId: string;
  address: string;
  area: number;
  zone: string;
  siteName: string;
  lastModified: string;
  lotReference: string;
}
