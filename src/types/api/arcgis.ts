export interface ArcGISSpatialReference {
  wkid?: number;
  wkt?: string;
  latestWkid?: number;
  vcsWkid?: number;
}

export interface ArcGISGeometry {
  rings?: number[][][];
  paths?: number[][][];
  points?: number[][];
  x?: number;
  y?: number;
  z?: number;
  m?: number;
  spatialReference?: ArcGISSpatialReference;
}

export interface ArcGISField {
  name: string;
  type: string;
  alias?: string;
  length?: number;
  domain?: {
    type: string;
    name: string;
    codedValues?: Array<{
      name: string;
      code: string | number;
    }>;
  };
  nullable?: boolean;
  editable?: boolean;
}

export interface ArcGISFeature<T = Record<string, unknown>> {
  attributes: T;
  geometry?: ArcGISGeometry;
}

export interface ArcGISQueryResponse<T = Record<string, unknown>> {
  features: ArcGISFeature<T>[];
  exceededTransferLimit?: boolean;
  fields?: ArcGISField[];
  objectIdFieldName?: string;
  globalIdFieldName?: string;
  geometryType?: string;
  spatialReference?: ArcGISSpatialReference;
}

export interface ArcGISError {
  code?: number | string;
  message?: string;
  details?: string[];
}

export interface ArcGISErrorResponse {
  error: ArcGISError;
}

export interface PropertyBoundaryAttributes {
  propid?: number;
  address?: string;
  suburb?: string;
  postcode?: string;
  lot_number?: string;
  plan_number?: string;
  area?: number;
  [key: string]: unknown;
}

export interface SalesAttributes {
  propid?: number;
  sale_date?: string | number;
  sale_price?: number;
  address?: string;
  suburb?: string;
  postcode?: string;
  lot_number?: string;
  plan_number?: string;
  area?: number;
  dealing?: string | number;
  strata?: number;
  [key: string]: unknown;
}

export interface PlanningAttributes {
  SYM_CODE?: string;
  FSR?: number | string;
  MAX_B_H?: number | string;
  [key: string]: unknown;
}

export interface FloodRiskAttributes {
  FLOOD_PLAN?: string;
  FLOOD_CAT?: string;
  FLOOD_LVL?: string;
  FLOOD_NAME?: string;
  [key: string]: unknown;
}

export interface BushfireRiskAttributes {
  BF_CAT?: string;
  BF_BUFF?: number;
  BF_DESCRIPTION?: string;
  VEG_CATEGORY?: string;
  [key: string]: unknown;
}

export interface BiodiversityRiskAttributes {
  BIO_CAT?: string;
  BIO_NAME?: string;
  SPECIES?: string;
  HABITAT_TYPE?: string;
  [key: string]: unknown;
}

export interface HeritageAttributes {
  SIG?: string;
  LAY_CLASS?: string;
  H_NAME?: string;
  SHR_NUM?: string;
  [key: string]: unknown;
}

export interface ContaminationAttributes {
  [key: string]: unknown;
}

export interface PCTAttributes {
  PCTID: number;
  PCTName: string;
  vegForm: string;
  vegClass: string;
  [key: string]: unknown;
}

export type PropertyBoundaryFeature = ArcGISFeature<PropertyBoundaryAttributes>;
export type SalesFeature = ArcGISFeature<SalesAttributes>;
export type PlanningFeature = ArcGISFeature<PlanningAttributes>;
export type FloodRiskFeature = ArcGISFeature<FloodRiskAttributes>;
export type BushfireRiskFeature = ArcGISFeature<BushfireRiskAttributes>;
export type BiodiversityRiskFeature = ArcGISFeature<BiodiversityRiskAttributes>;
export type HeritageFeature = ArcGISFeature<HeritageAttributes>;
export type ContaminationFeature = ArcGISFeature<ContaminationAttributes>;

export type PropertyBoundaryQueryResponse =
  ArcGISQueryResponse<PropertyBoundaryAttributes>;
export type SalesQueryResponse = ArcGISQueryResponse<SalesAttributes>;
export type PlanningQueryResponse = ArcGISQueryResponse<PlanningAttributes>;
export type FloodRiskQueryResponse = ArcGISQueryResponse<FloodRiskAttributes>;
export type BushfireRiskQueryResponse =
  ArcGISQueryResponse<BushfireRiskAttributes>;
export type BiodiversityRiskQueryResponse =
  ArcGISQueryResponse<BiodiversityRiskAttributes>;
export type HeritageQueryResponse = ArcGISQueryResponse<HeritageAttributes>;
export type ContaminationQueryResponse =
  ArcGISQueryResponse<ContaminationAttributes>;
export type PCTFeature = ArcGISFeature<PCTAttributes>;
export type PCTQueryResponse = ArcGISQueryResponse<PCTAttributes>;

export interface DistanceProgress {
  current: number;
  total: number;
  percentage: number;
}
export interface DistanceAnalysisResult {
  featuresAnalyzed: number;
  featuresWithDistances: number;
  bufferSize: number;
  minDistance?: number;
  maxDistance?: number;
  avgDistance?: number;
}
export interface FieldOption {
  name: string;
  alias: string;
}
export type DistanceUnit = "meters" | "kilometers" | "miles" | "feet";

export type ArcGISGeometryType =
  | "esriGeometryPoint"
  | "esriGeometryMultipoint"
  | "esriGeometryPolyline"
  | "esriGeometryPolygon"
  | "esriGeometryEnvelope";

export type ArcGISSpatialRelationship =
  | "esriSpatialRelIntersects"
  | "esriSpatialRelContains"
  | "esriSpatialRelCrosses"
  | "esriSpatialRelEnvelopeIntersects"
  | "esriSpatialRelIndexIntersects"
  | "esriSpatialRelOverlaps"
  | "esriSpatialRelTouches"
  | "esriSpatialRelWithin";

export interface ArcGISQueryParams {
  where?: string;
  geometry?: string;
  geometryType?: ArcGISGeometryType;
  spatialRel?: ArcGISSpatialRelationship;
  outFields?: string | string[];
  returnGeometry?: boolean;
  outSR?: number;
  inSR?: number;
  resultOffset?: number;
  resultRecordCount?: number;
  orderByFields?: string;
  f?: "json" | "geojson";
}

export interface LGAAttributes {
  LGA_NAME?: string;
  LGA_CODE?: string;
  ABBREV_NAME?: string;
  [key: string]: unknown;
}

export interface SuburbAttributes {
  SUBURBNAME?: string;
  SUBURB?: string;
  POSTCODE?: string;
  STATE?: string;
  [key: string]: unknown;
}

export interface LandZoneAttributes {
  SYM_CODE?: string;
  LAY_CLASS?: string;
  ZONE_NAME?: string;
  [key: string]: unknown;
}
export type LGAFeature = ArcGISFeature<LGAAttributes>;
export type SuburbFeature = ArcGISFeature<SuburbAttributes>;
export type LandZoneFeature = ArcGISFeature<LandZoneAttributes>;
export type LGAQueryResponse = ArcGISQueryResponse<LGAAttributes>;
export type SuburbQueryResponse = ArcGISQueryResponse<SuburbAttributes>;
export type LandZoneQueryResponse = ArcGISQueryResponse<LandZoneAttributes>;
