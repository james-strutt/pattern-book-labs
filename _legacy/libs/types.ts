import { Feature, LineString, Point, Polygon } from "geojson";

export type RawSection = Feature<Polygon | LineString | Point> & {
  properties: Record<string, any>;
};

export type StackedPolygon = Feature<Polygon> & {
  _projected: CalcProjectedCoordinate[][];
  properties: Record<string, any>;
};

export type StackedLineString = Feature<LineString> & {
  _projected: CalcProjectedCoordinate[];
  properties: Record<string, any>;
};

export type StackedPoint = Feature<Point> & {
  _projected: CalcProjectedCoordinate;
  properties: Record<string, any>;
};

export type StackedSection = StackedPolygon | StackedLineString | StackedPoint;
export type CalcProjectedCoordinate = [x: number, y: number]; // in meters relative to project origin
export type GeoCoordinate = [x: number, y: number]; // in degrees

export const SECTION_TYPES = {
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
