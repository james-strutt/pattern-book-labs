import {
  ClipType,
  PolyFillType,
  type Path,
  type Paths,
  type ReadonlyPath,
} from "js-angusj-clipper/web";
import { getClipperSync } from "@/utils/geometry/clipperLoader";
import type {
  ProjectedCoordinate,
  ProjectedPolygon,
} from "@/apps/patternBook/types/projectedGeometry";

export const CLIPPER_SCALE = 1e5;

export function clipperUnion(shapes: (Paths | Path)[]): Paths {
  const clipperLoaded = getClipperSync();
  const subjectInputs = shapes
    .filter((s) => s.length > 0)
    .map((s) => ({ data: s, closed: true }));
  if (subjectInputs.length === 0) return [];
  return clipperLoaded.clipToPaths({
    clipType: ClipType.Union,
    subjectInputs,
    subjectFillType: PolyFillType.NonZero,
  });
}

function pointToClipper([x, y]: [number, number]): {
  x: number;
  y: number;
} {
  return {
    x: Math.round(x * CLIPPER_SCALE),
    y: Math.round(y * CLIPPER_SCALE),
  };
}

export function polyToClipper(
  polyFeature: Pick<ProjectedPolygon, "_projected">,
): Paths {
  return polyFeature._projected.map((path: ProjectedCoordinate[]) => path.map(pointToClipper));
}

export function projectedToClipper([
  x,
  y,
]: ProjectedCoordinate): ReadonlyPath[number] {
  return { x: x * CLIPPER_SCALE, y: y * CLIPPER_SCALE };
}
