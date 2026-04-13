import type * as GeoJSON from "geojson";
import { geojsonPolygonToEsri } from "./esri";
import { proxyRequest } from "@/utils/services/proxyService";
import { SERVICE_ENDPOINTS } from "@/utils/config/serviceEndpoints";
import logger from "@/lib/logger";

const SERVICE_NAME = "AddressQueries";
const MAX_GEOMETRY_COORDINATES = 50000;

interface ArcGISCountResponse {
  count?: number;
  error?: { message?: string; code?: number };
}

function getGeometryCoordinateCount(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
): number {
  const rings =
    geometry.type === "Polygon"
      ? geometry.coordinates
      : geometry.coordinates.flat();
  return rings.reduce((sum, ring) => sum + ring.length, 0);
}

export async function queryAddressCountForGeometry(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
): Promise<number> {
  try {
    const coordinateCount = getGeometryCoordinateCount(geometry);
    if (coordinateCount > MAX_GEOMETRY_COORDINATES) {
      logger.debug(
        "Geometry too complex to serialise safely",
        { coordinateCount },
        SERVICE_NAME,
      );
      return 0;
    }

    const params = new URLSearchParams({
      where: "1=1",
      geometry: JSON.stringify(geojsonPolygonToEsri(geometry)),
      geometryType: "esriGeometryPolygon",
      inSR: "4326",
      spatialRel: "esriSpatialRelContains",
      returnCountOnly: "true",
      f: "json",
    });

    const data = await proxyRequest<ArcGISCountResponse>(
      `${SERVICE_ENDPOINTS.ADDRESS_POINTS}/query`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      },
    );

    if (!data || typeof data === "string" || data.error) {
      logger.debug("Address count query failed or returned unexpected response", { data }, SERVICE_NAME);
      return 0;
    }

    return data.count ?? 0;
  } catch (error) {
    logger.debug("Failed to query address count", { error }, SERVICE_NAME);
    return 0;
  }
}
