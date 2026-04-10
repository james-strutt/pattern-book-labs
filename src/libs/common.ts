import { CalcProjectedCoordinate } from "./types";

const cartesianBearing = (p1: CalcProjectedCoordinate, p2: CalcProjectedCoordinate): number =>
  Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);

export const cartesianDistance = (p1: CalcProjectedCoordinate, p2: CalcProjectedCoordinate) =>
  Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);

export const projectedPointOnLine = (
  point0: CalcProjectedCoordinate, // line start point1
  point1: CalcProjectedCoordinate, // line start point2
  point: CalcProjectedCoordinate, // objective point
): CalcProjectedCoordinate => {
  const alpha = cartesianBearing(point0, point1);

  if (alpha === 0) {
    return [point[0], point0[1]];
  } else if (alpha === Math.PI) {
    return [point0[0], point[1]];
  }
  const beta = alpha - Math.PI / 2;
  const a0 = Math.tan(alpha);
  const b0 = point0[1] - a0 * point0[0];
  const a1 = Math.tan(beta);
  const b1 = point[1] - a1 * point[0];

  const x = (b0 - b1) / (a1 - a0);
  const y = x * a0 + b0;
  return [x, y];
};
