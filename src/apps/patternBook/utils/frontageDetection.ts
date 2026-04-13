import {
  cartesianBearing,
  cartesianDistance,
  projectedPointOnLine,
} from "@/utils/geometry/projectedMath";
import { isBuildingSection } from "@/apps/patternBook/utils/polygonHelpers";
import type {
  EnvelopeSideIndices,
  ProjectedCoordinate,
  ProjectedFeature,
  ProjectedLineString,
  ProjectedPolygon,
} from "@/apps/patternBook/types/projectedGeometry";

/** Absolute maximum distance (metres) for an edge to count as a frontage. */
const MAX_FRONT_DISTANCE = 20;
/** Edges within this factor of the closest-to-road distance also count as front. */
const FRONT_RELATIVE_FACTOR = 1.4;
/** Midpoint-on-another-site tolerance (metres) — treats shared party walls as non-frontage. */
const ON_EDGE_TOLERANCE = 0.2;

function distancePointToSegment(
  p: ProjectedCoordinate,
  a: ProjectedCoordinate,
  b: ProjectedCoordinate,
): number {
  const foot = projectedPointOnLine(a, b, p);
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-20) return cartesianDistance(p, a);
  let t =
    ((foot[0] - a[0]) * dx + (foot[1] - a[1]) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const closest: ProjectedCoordinate = [
    a[0] + t * dx,
    a[1] + t * dy,
  ];
  return cartesianDistance(p, closest);
}

function isPointOnSegment(
  p: ProjectedCoordinate,
  a: ProjectedCoordinate,
  b: ProjectedCoordinate,
  tolerance: number,
): boolean {
  return distancePointToSegment(p, a, b) <= tolerance;
}

function collectRoadSegments(
  roadFeatures: ProjectedFeature[],
): Array<[ProjectedCoordinate, ProjectedCoordinate]> {
  const segments: Array<[ProjectedCoordinate, ProjectedCoordinate]> = [];
  for (const feature of roadFeatures) {
    if (feature.geometry.type === "LineString") {
      const line = (feature as ProjectedLineString)._projected;
      for (let j = 0; j < line.length - 1; j++) {
        segments.push([line[j]!, line[j + 1]!]);
      }
    } else if ((feature.geometry.type as string) === "MultiLineString") {
      const lines = (feature as unknown as { _projected: ProjectedCoordinate[][] })
        ._projected;
      if (Array.isArray(lines)) {
        for (const line of lines) {
          for (let j = 0; j < line.length - 1; j++) {
            segments.push([line[j]!, line[j + 1]!]);
          }
        }
      }
    } else if (feature.geometry.type === "Polygon") {
      const ring = (feature as ProjectedPolygon)._projected[0] ?? [];
      for (let j = 0; j < ring.length - 1; j++) {
        segments.push([ring[j]!, ring[j + 1]!]);
      }
    }
  }
  return segments;
}

function collectOtherSiteEdges(
  siteFeatures: ProjectedFeature[],
  currentSiteIndex: number,
): Array<[ProjectedCoordinate, ProjectedCoordinate]> {
  const edges: Array<[ProjectedCoordinate, ProjectedCoordinate]> = [];
  siteFeatures.forEach((feature, index) => {
    if (index === currentSiteIndex || feature.geometry.type !== "Polygon") {
      return;
    }
    const coords =
      (feature as ProjectedPolygon)._projected[0] ?? [];
    for (let j = 0; j < coords.length - 1; j++) {
      edges.push([coords[j]!, coords[j + 1]!]);
    }
  });
  return edges;
}

/**
 * Classifies each edge of a site polygon as front, rear, or side based on
 * proximity to nearby roads. Ported from the standalone pattern-book-app's
 * `getSideIndices` (src/utils.ts) with the same tolerance parameters.
 */
export function getSideIndices(
  siteFeatures: ProjectedFeature[],
  roadFeatures: ProjectedFeature[],
  currentSiteIndex: number,
): EnvelopeSideIndices {
  const front: number[] = [];
  const side: number[] = [];
  const rear: number[] = [];

  const current = siteFeatures[currentSiteIndex];
  if (!current || current.geometry.type !== "Polygon") {
    return { front, rear, side };
  }

  const ring = (current as ProjectedPolygon)._projected[0] ?? [];
  const numEdges = ring.length - 1;
  if (numEdges <= 0) return { front, rear, side };

  const roadSegments = collectRoadSegments(roadFeatures);
  const otherSiteEdges = collectOtherSiteEdges(
    siteFeatures,
    currentSiteIndex,
  );

  const minDistToRoad = (mid: ProjectedCoordinate): number => {
    let distance = Infinity;
    for (const [p, q] of roadSegments) {
      const segmentDistance = distancePointToSegment(mid, p, q);
      if (segmentDistance < distance) distance = segmentDistance;
    }
    return distance;
  };

  const edgeDistances: number[] = [];
  for (let i = 0; i < numEdges; i++) {
    const a = ring[i]!;
    const b = ring[i + 1]!;
    const mid: ProjectedCoordinate = [
      (a[0] + b[0]) / 2,
      (a[1] + b[1]) / 2,
    ];
    edgeDistances.push(minDistToRoad(mid));
  }

  const dMin =
    roadSegments.length > 0 ? Math.min(...edgeDistances) : Infinity;

  const frontThreshold =
    roadSegments.length > 0
      ? Math.max(MAX_FRONT_DISTANCE, dMin * FRONT_RELATIVE_FACTOR)
      : Infinity;

  for (let i = 0; i < numEdges; i++) {
    const a = ring[i]!;
    const b = ring[i + 1]!;
    const mid: ProjectedCoordinate = [
      (a[0] + b[0]) / 2,
      (a[1] + b[1]) / 2,
    ];

    const onOtherSiteEdge = otherSiteEdges.some(([p, q]) =>
      isPointOnSegment(mid, p, q, ON_EDGE_TOLERANCE),
    );
    if (onOtherSiteEdge) continue;

    if (edgeDistances[i]! <= frontThreshold) {
      front.push(i);
    }
  }

  for (let i = 0; i < numEdges; i++) {
    if (front.includes(i)) continue;
    const nextIndex = (i + 1) % numEdges;
    const prevIndex = i === 0 ? numEdges - 1 : i - 1;
    if (front.includes(nextIndex) || front.includes(prevIndex)) {
      side.push(i);
      continue;
    }
    rear.push(i);
  }

  return { front, rear, side };
}

/**
 * Fallback when frontage detection returns no front edges: pick the longest
 * edge of the polygon as the single front edge. This gives us *something*
 * usable rather than failing placement entirely.
 */
export function longestEdgeAsFrontage(
  site: ProjectedPolygon,
): EnvelopeSideIndices {
  const ring = site._projected[0] ?? [];
  const numEdges = ring.length - 1;
  if (numEdges <= 0) return { front: [], rear: [], side: [] };

  let longestIndex = 0;
  let longestLength = 0;
  for (let i = 0; i < numEdges; i++) {
    const length = cartesianDistance(ring[i]!, ring[i + 1]!);
    if (length > longestLength) {
      longestLength = length;
      longestIndex = i;
    }
  }

  const front = [longestIndex];
  const side: number[] = [];
  const rear: number[] = [];

  for (let i = 0; i < numEdges; i++) {
    if (i === longestIndex) continue;
    const nextIndex = (i + 1) % numEdges;
    const prevIndex = i === 0 ? numEdges - 1 : i - 1;
    if (nextIndex === longestIndex || prevIndex === longestIndex) {
      side.push(i);
    } else {
      rear.push(i);
    }
  }

  return { front, rear, side };
}

function bearingDegrees(
  a: ProjectedCoordinate,
  b: ProjectedCoordinate,
): number {
  let degrees = (cartesianBearing(a, b) * 180) / Math.PI;
  while (degrees > 180) degrees -= 360;
  while (degrees <= -180) degrees += 360;
  return degrees;
}

/**
 * Returns the bearing (in radians) of the road segment closest to the
 * site's centroid. Each lot gets the precise bearing of its own nearest
 * road — on a curved street (crescent, bend), adjacent lots will have
 * slightly different bearings because the road curves between them.
 * This is geometrically correct.
 *
 * Returns `null` if there are no road segments available.
 */
export function getFrontageBearingFromNearestRoadRad(
  site: ProjectedPolygon,
  roadFeatures: ProjectedFeature[],
): number | null {
  const ring = site._projected[0] ?? [];
  if (ring.length === 0) return null;

  let sumX = 0;
  let sumY = 0;
  for (const [x, y] of ring) {
    sumX += x;
    sumY += y;
  }
  const centroid: ProjectedCoordinate = [
    sumX / ring.length,
    sumY / ring.length,
  ];

  const roadSegments = collectRoadSegments(roadFeatures);
  if (roadSegments.length === 0) return null;

  let closestDist = Infinity;
  let closestA: ProjectedCoordinate | null = null;
  let closestB: ProjectedCoordinate | null = null;
  for (const [a, b] of roadSegments) {
    const d = distancePointToSegment(centroid, a, b);
    if (d < closestDist) {
      closestDist = d;
      closestA = a;
      closestB = b;
    }
  }
  if (!closestA || !closestB) return null;
  return cartesianBearing(closestA, closestB);
}

/**
 * Returns the bearing (in degrees) of the longest edge in the largest
 * building polygon within the evaluated features. Used to detect a block's
 * *current* orientation in the master project, which may differ from its
 * *authored* orientation if Giraffe rotated it during a cross-project copy.
 *
 * The heuristic assumes the block's intended "front" is its longest straight
 * facade — true for virtually every rectangular apartment footprint. Blocks
 * with articulated frontages (L-shape, courtyard) still have a dominant
 * longest edge aligned with the authored front.
 *
 * Returns `null` if no building polygon is present.
 *
 * Normalised to the range (-180, 180]. Sign convention matches
 * `rotateProjectedCoord`: positive = counter-clockwise.
 */
export function getBlockInherentBearingDegrees(
  features: ProjectedFeature[],
): number | null {
  let largestPolygon: ProjectedPolygon | null = null;
  let largestArea = 0;

  for (const feature of features) {
    if (feature.geometry.type !== "Polygon") continue;
    if (!isBuildingSection(feature)) continue;
    const poly = feature as ProjectedPolygon;
    const ring = poly._projected[0];
    if (!ring || ring.length < 3) continue;

    let signedArea = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const [x1, y1] = ring[i]!;
      const [x2, y2] = ring[i + 1]!;
      signedArea += x1 * y2 - x2 * y1;
    }
    const area = Math.abs(signedArea) / 2;
    if (area > largestArea) {
      largestArea = area;
      largestPolygon = poly;
    }
  }

  if (!largestPolygon) return null;

  const ring = largestPolygon._projected[0] ?? [];
  let longestLength = 0;
  let longestBearing: number | null = null;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i]!;
    const b = ring[i + 1]!;
    const length = cartesianDistance(a, b);
    if (length > longestLength) {
      longestLength = length;
      longestBearing = bearingDegrees(a, b);
    }
  }
  return longestBearing;
}

/**
 * Returns the bearing (in degrees) of the site's frontage, measured as the
 * angle of the front-edge direction vector relative to the local +X axis.
 * On corner sites the longest front edge wins. Returns `null` if no front.
 */
export function getFrontageBearingDegrees(
  site: ProjectedPolygon,
  indices: EnvelopeSideIndices,
): number | null {
  const ring = site._projected[0] ?? [];
  if (ring.length < 2) return null;
  if (!indices.front.length) return null;

  let chosenIndex = indices.front[0]!;
  let longestLength = 0;
  for (const edgeIndex of indices.front) {
    const a = ring[edgeIndex];
    const b = ring[edgeIndex + 1];
    if (!a || !b) continue;
    const length = cartesianDistance(a, b);
    if (length > longestLength) {
      longestLength = length;
      chosenIndex = edgeIndex;
    }
  }

  const a = ring[chosenIndex];
  const b = ring[chosenIndex + 1];
  if (!a || !b) return null;
  return bearingDegrees(a, b);
}
