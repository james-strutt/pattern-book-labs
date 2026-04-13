import type { ProjectedCoordinate } from "@/apps/patternBook/types/projectedGeometry";

export function cartesianBearing(
  p1: ProjectedCoordinate,
  p2: ProjectedCoordinate,
): number {
  return Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
}

export function cartesianDistance(
  p1: ProjectedCoordinate,
  p2: ProjectedCoordinate,
): number {
  return Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
}

export function projectedPointOnLine(
  point0: ProjectedCoordinate,
  point1: ProjectedCoordinate,
  point: ProjectedCoordinate,
): ProjectedCoordinate {
  const alpha = cartesianBearing(point0, point1);

  if (alpha === 0) {
    return [point[0], point0[1]];
  }
  if (alpha === Math.PI) {
    return [point[0], point0[1]];
  }

  const beta = alpha - Math.PI / 2;
  const a0 = Math.tan(alpha);
  const b0 = point0[1] - a0 * point0[0];
  const a1 = Math.tan(beta);
  const b1 = point[1] - a1 * point[0];

  const x = (b0 - b1) / (a1 - a0);
  const y = x * a0 + b0;
  return [x, y];
}

export function rotateProjectedCoord(
  coord: ProjectedCoordinate,
  angle: number,
  centre: ProjectedCoordinate = [0, 0],
): ProjectedCoordinate {
  const x = coord[0] - centre[0];
  const y = coord[1] - centre[1];
  const rotatedX = x * Math.cos(angle) - y * Math.sin(angle);
  const rotatedY = x * Math.sin(angle) + y * Math.cos(angle);
  return [rotatedX + centre[0], rotatedY + centre[1]];
}
