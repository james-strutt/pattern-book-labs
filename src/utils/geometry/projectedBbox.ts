import type { ProjectedCoordinate, ProjectedFeature } from "@/apps/patternBook/types/projectedGeometry";

export interface ProjectedBBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function stretchBox(box: ProjectedBBox, x: number, y: number): void {
  if (x < box.minX) box.minX = x;
  else if (x > box.maxX) box.maxX = x;
  if (y < box.minY) box.minY = y;
  else if (y > box.maxY) box.maxY = y;
}

function seedBox(x: number, y: number): ProjectedBBox {
  return { minX: x, minY: y, maxX: x, maxY: y };
}

function mergeProjectedBoxes(target: ProjectedBBox, source: ProjectedBBox): void {
  if (source.minX < target.minX) target.minX = source.minX;
  if (source.minY < target.minY) target.minY = source.minY;
  if (source.maxX > target.maxX) target.maxX = source.maxX;
  if (source.maxY > target.maxY) target.maxY = source.maxY;
}

function getFeatureProjectedBox(feature: ProjectedFeature, box?: ProjectedBBox): ProjectedBBox {
  const projected = feature._projected;

  if (feature.geometry.type === "Polygon") {
    const outerRing = (projected as ProjectedCoordinate[][])[0];
    if (!box && outerRing?.[0]) {
      box = seedBox(outerRing[0][0], outerRing[0][1]);
    }
    outerRing?.forEach((p) => stretchBox(box!, p[0], p[1]));
  } else if (feature.geometry.type === "LineString") {
    const coords = projected as ProjectedCoordinate[];
    if (!box && coords[0]) {
      box = seedBox(coords[0][0], coords[0][1]);
    }
    coords.forEach((p) => stretchBox(box!, p[0], p[1]));
  } else if (feature.geometry.type === "Point") {
    const coord = projected as ProjectedCoordinate;
    box ??= seedBox(coord[0], coord[1]);
    stretchBox(box, coord[0], coord[1]);
  }

  return box!;
}

export function getFeaturesProjectedBox(features: ProjectedFeature[], initial?: ProjectedBBox): ProjectedBBox {
  let box = initial;
  for (const feature of features) {
    const featureBox = Array.isArray(feature)
      ? getFeaturesProjectedBox(feature as ProjectedFeature[], box)
      : getFeatureProjectedBox(feature, box);
    if (box) {
      mergeProjectedBoxes(box, featureBox);
    } else {
      box = featureBox;
    }
  }
  return box as ProjectedBBox;
}

export function getProjectedViewBox(bbox: ProjectedBBox, bufferFraction = 0.1): string {
  const paddingX = (bbox.maxX - bbox.minX) * bufferFraction;
  const paddingY = (bbox.maxY - bbox.minY) * bufferFraction;
  return `${bbox.minX - paddingX} ${-(bbox.maxY + paddingY)} ${bbox.maxX - bbox.minX + 2 * paddingX} ${bbox.maxY - bbox.minY + 2 * paddingY}`;
}
