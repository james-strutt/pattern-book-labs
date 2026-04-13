import { getBoundingBox } from "@/utils/geometry/boundingBox";
import { flyTo } from "@/services/iframeSDK";
import { showSelectedBoundaryLayer } from "@/apps/patternBook/services/selectedBoundaryLayerService";
import logger from "@/lib/logger";
import type { PropertyFeature } from "@/types/geometry";
import type { BoundingBoxResult } from "@/types/utils/geometry";

const UTILITY_NAME = "mapNavigation";

const ZOOM_THRESHOLDS: ReadonlyArray<{ maxDelta: number; zoom: number }> = [
  { maxDelta: 0.1, zoom: 14 },
  { maxDelta: 0.05, zoom: 15 },
  { maxDelta: 0.01, zoom: 16 },
];

const DEFAULT_ZOOM = 18;
const FLY_TO_DURATION_MS = 1500;

function calculateZoomLevel(bbox: BoundingBoxResult): number {
  const maxDelta = Math.max(bbox.maxX - bbox.minX, bbox.maxY - bbox.minY);
  return ZOOM_THRESHOLDS.find((t) => maxDelta > t.maxDelta)?.zoom ?? DEFAULT_ZOOM;
}

export async function flyToProperty(feature: PropertyFeature): Promise<void> {
  if (!feature?.geometry) return;

  try {
    const bbox = getBoundingBox(feature.geometry);
    if (bbox.minX === 0 && bbox.maxX === 0) return;

    await showSelectedBoundaryLayer(feature);

    await flyTo({
      center: [(bbox.minX + bbox.maxX) / 2, (bbox.minY + bbox.maxY) / 2],
      zoom: calculateZoomLevel(bbox),
      duration: FLY_TO_DURATION_MS,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error flying to property", { error: errorMessage }, UTILITY_NAME);
  }
}
