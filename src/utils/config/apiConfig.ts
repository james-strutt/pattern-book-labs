import type { ArcGISGeometry } from "@/types/api/arcgis";
import { SERVICE_ENDPOINTS } from "./serviceEndpoints";

const NSW_PLANNING_API_BASE = SERVICE_ENDPOINTS.NSW_PLANNING_API_BASE;
const MAX_LOT_ID_LENGTH = 200;

export const NSW_PLANNING_API = {
  baseUrl: NSW_PLANNING_API_BASE,

  buildAddressSearchUrl: (query: string, noOfRecords = 10): string =>
    `${NSW_PLANNING_API_BASE}/address?a=${encodeURIComponent(query)}&noOfRecords=${noOfRecords}`,

  buildLotSearchUrl: (query: string, noOfRecords = 10): string =>
    `${NSW_PLANNING_API_BASE}/lot?l=${encodeURIComponent(query)}&noOfRecords=${noOfRecords}`,

  buildBoundaryUrl: (propId: string, type = "property"): string =>
    `${NSW_PLANNING_API_BASE}/boundary?id=${encodeURIComponent(propId)}&Type=${encodeURIComponent(type)}`,

  buildLotByPropIdUrl: (propId: string): string => `${NSW_PLANNING_API_BASE}/lot?propId=${encodeURIComponent(propId)}`,

  buildLayerIntersectUrl: (type: string, id: string, layers = "epi"): string =>
    `${NSW_PLANNING_API_BASE}/layerintersect?type=${encodeURIComponent(
      type,
    )}&id=${encodeURIComponent(id)}&layers=${encodeURIComponent(layers)}`,
} as const;

export const NSW_CADASTRE_API = {
  baseUrl: SERVICE_ENDPOINTS.CADASTRE_LOT,

  validateLotId: (lotIdString: string): void => {
    if (!lotIdString || typeof lotIdString !== "string") {
      throw new Error("Lot ID must be a non-empty string");
    }

    if (lotIdString.length > MAX_LOT_ID_LENGTH) {
      throw new Error(`Lot ID must be less than ${MAX_LOT_ID_LENGTH} characters`);
    }

    if (!/^[a-zA-Z0-9/._\s-]+$/.test(lotIdString)) {
      throw new Error("Lot ID contains invalid characters");
    }
  },

  buildLotGeometryUrl: (lotIdString: string): string => {
    NSW_CADASTRE_API.validateLotId(lotIdString);

    const escapedLotId = lotIdString.replaceAll("'", "''");
    const whereClause = `lotidstring='${escapedLotId}'`;
    const encodedWhere = encodeURIComponent(whereClause).replaceAll("%2F", "/");

    return `${NSW_CADASTRE_API.baseUrl}/query?where=${encodedWhere}&outFields=*&returnGeometry=true&f=json`;
  },
} as const;

export const NSW_EPLANNING_API = {
  constructionCertificateEndpoint: SERVICE_ENDPOINTS.CONSTRUCTION_CERTIFICATE_API,
} as const;

export function buildElevationQueryUrl(geometry: ArcGISGeometry): string {
  const params = new URLSearchParams({
    f: "json",
    geometryType: "esriGeometryPolygon",
    geometry: JSON.stringify(geometry),
    spatialRel: "esriSpatialRelIntersects",
    outFields: "elevation",
    returnGeometry: "false",
  });

  return `${SERVICE_ENDPOINTS.ELEVATION_CONTOURS}/query?${params}`;
}
