import { createLocalProjection } from "@/utils/geometry/localProjection";
import { rotateProjectedCoord } from "@/utils/geometry/projectedMath";
import { calculateFeatureCoordinatesByProjected } from "@/apps/patternBook/utils/projectFeatures";
import logger from "@/lib/logger";
import type { ProjectedFeature, ProjectedPolygon } from "@/apps/patternBook/types/projectedGeometry";

const SERVICE_NAME = "PatternBookPlacement";

export interface AlignResult {
  success: boolean;
  mode: "parallel" | "perpendicular" | null;
  reason: string | null;
}

function ringSignedArea(ring: readonly [number, number][]): number {
  let s = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const a = ring[i];
    const b = ring[i + 1];
    if (!a || !b) continue;
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
}

function ringCentroid(ring: readonly [number, number][]): [number, number] | null {
  if (ring.length < 3) return null;
  let cx = 0;
  let cy = 0;
  let doubleArea = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const a = ring[i];
    const b = ring[i + 1];
    if (!a || !b) continue;
    const cross = a[0] * b[1] - b[0] * a[1];
    cx += (a[0] + b[0]) * cross;
    cy += (a[1] + b[1]) * cross;
    doubleArea += cross;
  }
  if (Math.abs(doubleArea) < 1e-12) return null;
  const factor = 1 / (3 * doubleArea);
  return [cx * factor, cy * factor];
}

function largestPolygonRing(features: ProjectedFeature[]): { ring: [number, number][]; area: number } | null {
  let best: { ring: [number, number][]; area: number } | null = null;
  for (const feature of features) {
    if (feature.geometry.type !== "Polygon") continue;
    const projectedRing = (feature as ProjectedPolygon)._projected[0];
    if (!projectedRing || projectedRing.length < 3) continue;
    const ring = projectedRing as [number, number][];
    const area = Math.abs(ringSignedArea(ring));
    if (!best || area > best.area) {
      best = { ring, area };
    }
  }
  return best;
}

function ringLongestEdgeBearingRad(ring: readonly [number, number][]): { bearingRad: number; length: number } | null {
  if (ring.length < 2) return null;
  let bestLen = -Infinity;
  let bestBearing = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const a = ring[i];
    const b = ring[i + 1];
    if (!a || !b) continue;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len > bestLen) {
      bestLen = len;
      bestBearing = Math.atan2(dy, dx);
    }
  }
  if (!Number.isFinite(bestLen) || bestLen <= 0) return null;
  return { bearingRad: bestBearing, length: bestLen };
}

export function isPointInRing(point: [number, number], ring: readonly [number, number][]): boolean {
  if (ring.length < 3) return false;
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[i];
    const b = ring[j];
    if (!a || !b) continue;
    const [ax, ay] = a;
    const [bx, by] = b;
    const intersects = ay > py !== by > py && px < ((bx - ax) * (py - ay)) / (by - ay + 1e-12) + ax;
    if (intersects) inside = !inside;
  }
  return inside;
}

function arePolygonsContainedInRing(features: ProjectedFeature[], envelopeRing: readonly [number, number][]): boolean {
  for (const feature of features) {
    if (feature.geometry.type !== "Polygon") continue;
    const ring = (feature as ProjectedPolygon)._projected[0];
    if (!ring) continue;
    for (const vertex of ring) {
      if (!isPointInRing(vertex, envelopeRing)) return false;
    }
  }
  return true;
}

function rotatePatternFeaturesInPlace(
  features: ProjectedFeature[],
  pivot: [number, number],
  angleRad: number,
  geoProject: ReturnType<typeof createLocalProjection>,
): void {
  if (angleRad === 0) return;
  for (const feature of features) {
    if (feature.geometry.type !== "Polygon") continue;
    const poly = feature as ProjectedPolygon;
    const projected = poly._projected;
    if (!Array.isArray(projected)) continue;
    const ring = projected[0];
    if (!ring) continue;
    poly._projected = [ring.map((coord) => rotateProjectedCoord(coord, angleRad, pivot))];
    calculateFeatureCoordinatesByProjected(poly, geoProject);
  }
}

function translatePatternFeaturesInPlace(
  features: ProjectedFeature[],
  dx: number,
  dy: number,
  geoProject: ReturnType<typeof createLocalProjection>,
): void {
  if (dx === 0 && dy === 0) return;
  for (const feature of features) {
    if (feature.geometry.type !== "Polygon") continue;
    const poly = feature as ProjectedPolygon;
    const projected = poly._projected;
    if (!Array.isArray(projected)) continue;
    const ring = projected[0];
    if (!ring) continue;
    poly._projected = [ring.map(([x, y]): [number, number] => [x + dx, y + dy])];
    calculateFeatureCoordinatesByProjected(poly, geoProject);
  }
}

function revertSnapshots(
  features: ProjectedFeature[],
  snapshots: Array<[number, number][] | null>,
  geoProject: ReturnType<typeof createLocalProjection>,
): void {
  for (let i = 0; i < features.length; i += 1) {
    const snapshot = snapshots[i];
    const poly = features[i] as ProjectedPolygon;
    if (snapshot && poly) {
      poly._projected = [snapshot];
      calculateFeatureCoordinatesByProjected(poly, geoProject);
    }
  }
}

function resolveEnvelopeBearingRad(
  envelopeRing: [number, number][],
  frontageBearingRad: number | null,
): { outcome: "ok"; bearingRad: number } | { outcome: "error"; message: string } {
  if (frontageBearingRad === null) {
    const envelopeBearingInfo = ringLongestEdgeBearingRad(envelopeRing);
    if (!envelopeBearingInfo) {
      return { outcome: "error", message: "envelope has no edges" };
    }
    return { outcome: "ok", bearingRad: envelopeBearingInfo.bearingRad };
  }
  return { outcome: "ok", bearingRad: frontageBearingRad };
}

export function alignPatternToEnvelope(
  stackedPatternFeatures: ProjectedFeature[],
  envelopeFeatures: ProjectedFeature[],
  frontageBearingRad: number | null,
  geoProject: ReturnType<typeof createLocalProjection>,
  siteId: string,
): AlignResult {
  if (stackedPatternFeatures.length === 0) {
    return { success: false, mode: null, reason: "no pattern features" };
  }
  if (envelopeFeatures.length === 0) {
    return { success: false, mode: null, reason: "no envelope features" };
  }

  const envLargest = largestPolygonRing(envelopeFeatures);
  if (!envLargest) {
    return {
      success: false,
      mode: null,
      reason: "envelope has no valid polygon",
    };
  }
  const envelopeRing = envLargest.ring;
  const envelopeCentroid = ringCentroid(envelopeRing);
  if (!envelopeCentroid) {
    return {
      success: false,
      mode: null,
      reason: "envelope centroid calculation failed",
    };
  }

  const envelopeBearingResolution = resolveEnvelopeBearingRad(envelopeRing, frontageBearingRad);
  if (envelopeBearingResolution.outcome === "error") {
    return { success: false, mode: null, reason: envelopeBearingResolution.message };
  }
  const envelopeBearingRad = envelopeBearingResolution.bearingRad;

  const patLargest = largestPolygonRing(stackedPatternFeatures);
  if (!patLargest) {
    return {
      success: false,
      mode: null,
      reason: "pattern has no valid polygon",
    };
  }
  const patternCentroid = ringCentroid(patLargest.ring);
  if (patternCentroid) {
    const patternBearingInfo = ringLongestEdgeBearingRad(patLargest.ring);
    if (!patternBearingInfo) {
      return { success: false, mode: null, reason: "pattern has no edges" };
    }
    const patternBearingRad = patternBearingInfo.bearingRad;

    const tryMode = (target: "parallel" | "perpendicular"): boolean => {
      const snapshots = stackedPatternFeatures.map((f) => {
        const poly = f as ProjectedPolygon;
        const ring = poly._projected?.[0];
        return ring ? ring.map(([x, y]): [number, number] => [x, y]) : null;
      });

      const targetBearingRad = target === "parallel" ? envelopeBearingRad : envelopeBearingRad + Math.PI / 2;
      const rotationRad = targetBearingRad - patternBearingRad;

      rotatePatternFeaturesInPlace(stackedPatternFeatures, patternCentroid, rotationRad, geoProject);

      const rotatedLargest = largestPolygonRing(stackedPatternFeatures);
      if (!rotatedLargest) {
        revertSnapshots(stackedPatternFeatures, snapshots, geoProject);
        return false;
      }
      const rotatedCentroid = ringCentroid(rotatedLargest.ring);
      if (!rotatedCentroid) {
        revertSnapshots(stackedPatternFeatures, snapshots, geoProject);
        return false;
      }
      const dx = envelopeCentroid[0] - rotatedCentroid[0];
      const dy = envelopeCentroid[1] - rotatedCentroid[1];
      translatePatternFeaturesInPlace(stackedPatternFeatures, dx, dy, geoProject);

      const contained = arePolygonsContainedInRing(stackedPatternFeatures, envelopeRing);

      logger.info(
        "alignPatternToEnvelope attempt",
        {
          siteId,
          mode: target,
          envelopeBearingDeg: (envelopeBearingRad * 180) / Math.PI,
          patternBearingDeg: (patternBearingRad * 180) / Math.PI,
          rotationDeg: (rotationRad * 180) / Math.PI,
          envelopeCentroid,
          patternCentroidBefore: patternCentroid,
          patternCentroidAfterRotation: rotatedCentroid,
          translateDx: dx,
          translateDy: dy,
          envelopeArea: envLargest.area,
          patternArea: patLargest.area,
          contained,
        },
        SERVICE_NAME,
      );

      if (!contained) {
        revertSnapshots(stackedPatternFeatures, snapshots, geoProject);
        return false;
      }
      return true;
    };

    if (tryMode("parallel")) {
      return { success: true, mode: "parallel", reason: null };
    }
    if (tryMode("perpendicular")) {
      return { success: true, mode: "perpendicular", reason: null };
    }
    return {
      success: false,
      mode: null,
      reason:
        "pattern does not fit inside the setback envelope polygon in either parallel or perpendicular orientation",
    };
  }
  return {
    success: false,
    mode: null,
    reason: "pattern centroid calculation failed",
  };
}

export { ringCentroid };
