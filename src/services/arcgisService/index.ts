export interface ArcGISServiceConfig {
  baseUrl: string;
  token?: string;
  timeout?: number;
}

export {
  queryBiodiversityRisk,
  queryBushfireRisk,
  queryContamination,
  queryFloodRisk,
  queryHeritageSignificance,
  queryAircraftNoise,
  type AircraftNoiseResult,
} from "./hazards";
export { querySpatial, queryWhere, querySpatialWithGeometry } from "./utils";
