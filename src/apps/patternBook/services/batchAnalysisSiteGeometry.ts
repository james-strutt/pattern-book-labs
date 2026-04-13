import type * as GeoJSON from "geojson";
import * as turf from "@turf/turf";

function calculateSiteWidthFromGeometry(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon): number | null {
  try {
    const feature = turf.feature(geometry);
    const bbox = turf.bbox(feature);

    const westPoint = turf.point([bbox[0], (bbox[1] + bbox[3]) / 2]);
    const eastPoint = turf.point([bbox[2], (bbox[1] + bbox[3]) / 2]);
    const width = turf.distance(westPoint, eastPoint, { units: "meters" });

    const southPoint = turf.point([(bbox[0] + bbox[2]) / 2, bbox[1]]);
    const northPoint = turf.point([(bbox[0] + bbox[2]) / 2, bbox[3]]);
    const height = turf.distance(southPoint, northPoint, { units: "meters" });

    return Math.min(width, height);
  } catch {
    return null;
  }
}

function calculateBboxLength(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon): number {
  const feature = turf.feature(geometry);
  const bbox = turf.bbox(feature);

  const westPoint = turf.point([bbox[0], (bbox[1] + bbox[3]) / 2]);
  const eastPoint = turf.point([bbox[2], (bbox[1] + bbox[3]) / 2]);
  const bboxWidth = turf.distance(westPoint, eastPoint, { units: "meters" });

  const southPoint = turf.point([(bbox[0] + bbox[2]) / 2, bbox[1]]);
  const northPoint = turf.point([(bbox[0] + bbox[2]) / 2, bbox[3]]);
  const bboxLength = turf.distance(southPoint, northPoint, { units: "meters" });

  return Math.max(bboxWidth, bboxLength);
}

function estimateSiteLengthFromGeometry(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
  siteWidth: number | null,
  siteArea: number,
): number | null {
  if (!siteWidth || siteWidth <= 0) {
    return null;
  }

  try {
    const bboxLength = calculateBboxLength(geometry);
    const estimatedFromArea = siteArea / siteWidth;
    const avgEstimate = (estimatedFromArea + bboxLength) / 2;

    return Math.round(avgEstimate * 10) / 10;
  } catch {
    return Math.round((siteArea / siteWidth) * 10) / 10;
  }
}

export function calculateSiteDimensions(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
  siteArea: number,
  existingSiteWidth: number | null,
): { siteWidth: number; siteLength: number } {
  const calculatedWidth = calculateSiteWidthFromGeometry(geometry);
  const siteWidth = existingSiteWidth ?? calculatedWidth ?? siteArea / 20;
  const siteLength = estimateSiteLengthFromGeometry(geometry, siteWidth, siteArea) ?? siteArea / siteWidth;

  return { siteWidth, siteLength };
}
