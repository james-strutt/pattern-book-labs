import type * as GeoJSON from "geojson";
import * as turf from "@turf/turf";
import {
  CROSSFALL_HIGH_PERCENTILE,
  CROSSFALL_LOW_PERCENTILE,
  CROSSFALL_MIN_CONTOURS_FOR_PERCENTILE,
  CROSSFALL_ROBUST_THRESHOLD_METRES,
} from "@/apps/patternBook/services/batchAnalysisConstants";
import type { AircraftNoiseFeature, ContourFeature } from "@/apps/patternBook/services/batchAnalysisBulkSpatial";

function forEachIntersectingFeature<T extends { geometry: GeoJSON.Feature }>(
  propertyGeometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
  items: T[],
  onIntersect: (item: T) => void,
): void {
  const propertyFeature = turf.feature(propertyGeometry);
  const propertyBbox = turf.bbox(propertyFeature);

  for (const item of items) {
    try {
      const itemBbox = turf.bbox(item.geometry);
      if (
        itemBbox[0] > propertyBbox[2] ||
        itemBbox[2] < propertyBbox[0] ||
        itemBbox[1] > propertyBbox[3] ||
        itemBbox[3] < propertyBbox[1]
      ) {
        continue;
      }
      if (turf.booleanIntersects(item.geometry, propertyFeature)) {
        onIntersect(item);
      }
    } catch {
      continue;
    }
  }
}

export function calculateCrossfallFromContours(
  propertyGeometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
  contours: ContourFeature[],
): number | null {
  if (contours.length === 0) return null;

  try {
    const intersectingElevations: number[] = [];

    forEachIntersectingFeature(propertyGeometry, contours, (contour) => {
      intersectingElevations.push(contour.elevation);
    });

    if (intersectingElevations.length <= 1) return 0;

    intersectingElevations.sort((a, b) => a - b);
    const minElevation = intersectingElevations.at(0) ?? 0;
    const maxElevation = intersectingElevations.at(-1) ?? 0;
    let crossfall = maxElevation - minElevation;

    if (
      crossfall > CROSSFALL_ROBUST_THRESHOLD_METRES &&
      intersectingElevations.length > CROSSFALL_MIN_CONTOURS_FOR_PERCENTILE
    ) {
      const p10Index = Math.floor(intersectingElevations.length * CROSSFALL_LOW_PERCENTILE);
      const p90Index = Math.floor(intersectingElevations.length * CROSSFALL_HIGH_PERCENTILE);
      crossfall =
        (intersectingElevations[p90Index] ?? maxElevation) - (intersectingElevations[p10Index] ?? minElevation);
    }

    return crossfall;
  } catch {
    return null;
  }
}

export function calculateAnefFromNoiseFeatures(
  propertyGeometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
  noiseFeatures: AircraftNoiseFeature[],
): number | null {
  if (noiseFeatures.length === 0) return null;

  try {
    let maxAnef: number | null = null;

    forEachIntersectingFeature(propertyGeometry, noiseFeatures, (noise) => {
      if (maxAnef === null || noise.anefValue > maxAnef) {
        maxAnef = noise.anefValue;
      }
    });

    return maxAnef;
  } catch {
    return null;
  }
}
