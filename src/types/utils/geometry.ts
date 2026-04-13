import type { Coordinate } from '@/types/geometry';
import type * as GeoJSON from 'geojson';

export type { Coordinate } from '@/types/geometry';

export interface AreaResult {
  squareMetres: number;
  hectares: number;
  squareKilometres: number;
}

export interface CentroidResult {
  type: 'Point';
  coordinates: Coordinate;
}

export interface CentroidCoordinates {
  longitude: number;
  latitude: number;
}

export interface BoundingBoxResult {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface BoundsResult {
  centerX: number;
  centerY: number;
  size: number;
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
}

export interface CoordinateBounds {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}

export interface CoordinatePair {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface EnvelopeBboxResult {
  envelope: string;
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface CenterPoint {
  x: number;
  y: number;
}

export interface AreaCalculationOptions {
  round?: boolean;
  precision?: number;
  units?: 'sqmeters' | 'hectares' | 'sqkm' | 'squarekilometres';
  includeAllUnits?: boolean;
}

export interface DevelopableAreaOptions {
  fallbackToPropertyArea?: boolean;
}

export interface SiteAreaOptions {
  format?: boolean;
  unit?: string;
}

export interface SiteWidthOptions {
  format?: boolean;
  unit?: string;
}

export interface ZoomLevelOptions {
  minZoom?: number;
  maxZoom?: number;
  padding?: number;
}

export type GeometryInput =
  | GeoJSON.Geometry
  | GeoJSON.Feature
  | GeoJSON.FeatureCollection
  | null
  | undefined;

export type PointGeometry = GeoJSON.Point | GeoJSON.Feature<GeoJSON.Point>;

export type PolygonGeometry =
  | GeoJSON.Polygon
  | GeoJSON.MultiPolygon
  | GeoJSON.Feature<GeoJSON.Polygon>
  | GeoJSON.Feature<GeoJSON.MultiPolygon>;

export type PolygonRing = Coordinate[];

export type CoordinateArray = Coordinate[];

export interface WebMercatorCoordinates {
  x: number;
  y: number;
}

export interface WGS84Coordinates {
  latitude: number;
  longitude: number;
}

