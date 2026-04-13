import { ClipType, ClipperLibWrapper, Path, Paths, PolyFillType, ReadonlyPath } from "js-angusj-clipper/web";
import { CalcProjectedCoordinate, StackedPolygon } from "./types";

const isNode =
  typeof (globalThis as any).process !== "undefined" && (globalThis as any).process?.versions?.node != null;

export const CLIPPER_SCALE = 1e5;

// note that for browser self.clipper is window.clipper but it works on node too
export const getClipper = (): ClipperLibWrapper => (isNode ? (globalThis as any).clipper : (self as any).clipper);

export const clipperUnion = (shapes: (Paths | Path)[]) => {
  const clipperLoaded = getClipper();
  const subjectInputs = shapes.filter((s) => s.length > 0).map((s) => ({ data: s, closed: true }));
  if (!clipperLoaded || subjectInputs.length === 0) return [];
  return clipperLoaded.clipToPaths({
    clipType: ClipType.Union,
    subjectInputs,
    subjectFillType: PolyFillType.NonZero,
  });
};

export const pointToClipper = ([x, y]: [number, number]) => ({
  x: Math.round(x * CLIPPER_SCALE),
  y: Math.round(y * CLIPPER_SCALE),
});

export const polyToClipper = (polyFeature: Pick<StackedPolygon, "_projected">): Paths =>
  polyFeature._projected.map((path) => path.map(pointToClipper));

export const projectedToClipper = ([x, y]: CalcProjectedCoordinate): ReadonlyPath[number] => ({
  x: x * CLIPPER_SCALE,
  y: y * CLIPPER_SCALE,
});
