import type * as GeoJSON from "geojson";
import type { PropertyFeatureProperties } from "./domain/property";
import type { FeatureWithProperties } from "@/constants/featureProps";

export type { Feature, FeatureCollection } from "geojson";

export type Coordinate = [number, number];

export type BoundingBox = [number, number, number, number];

export interface PropertyFeature extends FeatureWithProperties {
  properties: PropertyFeatureProperties;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

export interface PropertyFeatureCollection extends GeoJSON.FeatureCollection {
  features: PropertyFeature[];
}
