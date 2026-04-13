import type { Feature, LineString, Point, Polygon } from "geojson";

export type ProjectedCoordinate = [x: number, y: number];
export type GeoCoordinate = [longitude: number, latitude: number];

export type ProjectedPolygonRing = ProjectedCoordinate[];

export interface ProjectedPolygon extends Feature<Polygon> {
  _projected: ProjectedPolygonRing[];
  properties: Record<string, unknown>;
}

export interface ProjectedLineString extends Feature<LineString> {
  _projected: ProjectedCoordinate[];
  properties: Record<string, unknown>;
}

export interface ProjectedPoint extends Feature<Point> {
  _projected: ProjectedCoordinate;
  properties: Record<string, unknown>;
}

export type ProjectedFeature =
  | ProjectedPolygon
  | ProjectedLineString
  | ProjectedPoint;

export const PATTERN_BOOK_SECTION_TYPES = {
  BUILDING_SECTION: "buildingSection",
  ROAD: "road",
  LANDSCAPE: "landscape",
  PAVED_AREA: "paving",
  BASEMENT: "basement",
  LAND_USE: "landUse",
  POINT: "genericPoint",
  LINE: "genericLine",
  POLYGON: "genericPolygon",
  IMAGE: "image",
  THREE_D: "3d",
  REFERENCE: "reference",
  BLUSH: "blush",
  ARROW: "arrow",
  LOT: "lot",
} as const;

export interface PatternStats {
  fsr: number;
  area: number;
  footPrintArea: number;
  parkingProvided: unknown;
  patternStyle: unknown;
  dwellings: number;
  width: number;
  depth: number;
  minSiteWidth: number;
  minSiteDepth: number;
  minSiteArea: number;
  maxHeight: number;
}

export interface EnvelopeSideIndices {
  front: number[];
  rear: number[];
  side: number[];
}
