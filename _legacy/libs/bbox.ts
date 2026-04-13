import { Position } from "geojson";
import { StackedSection } from "./types";

type BBox = { minX: number; minY: number; maxX: number; maxY: number };
type SimpleCoords = [x: number, y: number] | Position;
type MaybeNestedCoords = SimpleCoords | MaybeNestedCoords[];

const getFirstNestedCoord = (coord: MaybeNestedCoords) => {
  while (coord && Array.isArray(coord[0])) coord = coord[0];

  return coord as SimpleCoords;
};
const getFirstProjectedCoord = (f: { _projected: MaybeNestedCoords }) => getFirstNestedCoord(f._projected);

const getFeatureProjectedBox = (feature: StackedSection, bbox?: BBox): BBox => {
  if (!bbox) {
    const firstCoord = getFirstProjectedCoord(feature);
    bbox = {
      minX: firstCoord[0],
      minY: firstCoord[1],
      maxX: firstCoord[0],
      maxY: firstCoord[1],
    };
  }

  if (feature.geometry.type === "Polygon") {
    // @ts-ignore
    feature._projected[0].forEach((p) => {
      bbox = stretchBox(bbox!, p);
    });
  } else if (feature.geometry.type === "LineString") {
    (feature._projected as SimpleCoords[]).forEach((p) => {
      bbox = stretchBox(bbox!, p);
    });
  } else if (feature.geometry.type === "Point") {
    bbox = stretchBox(bbox, feature._projected as SimpleCoords);
  }
  return bbox;
};

const stretchBox = (box: BBox, point: SimpleCoords) => {
  if (point[0] < box.minX) box.minX = point[0];
  else if (point[0] > box.maxX) box.maxX = point[0];
  if (point[1] < box.minY) box.minY = point[1];
  else if (point[1] > box.maxY) box.maxY = point[1];
  return box;
};

export const getFeaturesProjectedBox = (features: StackedSection[], bbox?: BBox) => {
  Object.values(features).forEach((feature) => {
    let cBox: BBox;
    if (Array.isArray(feature)) {
      cBox = getFeaturesProjectedBox(feature, bbox);
    } else {
      cBox = getFeatureProjectedBox(feature, bbox);
    }
    if (!bbox) {
      bbox = cBox;
    } else if (cBox) {
      bbox.minX = bbox.minX > cBox.minX ? cBox.minX : bbox.minX;
      bbox.minY = bbox.minY > cBox.minY ? cBox.minY : bbox.minY;
      bbox.maxX = bbox.maxX < cBox.maxX ? cBox.maxX : bbox.maxX;
      bbox.maxY = bbox.maxY < cBox.maxY ? cBox.maxY : bbox.maxY;
    }
  });
  return bbox as BBox;
};

export const getViewBox = (bbox: BBox, bufferF = 0.1) => {
  const paddingX = (bbox.maxX - bbox.minX) * bufferF;
  const paddingY = (bbox.maxY - bbox.minY) * bufferF;
  return `${bbox.minX - paddingX} ${-bbox.maxY - paddingY} ${bbox.maxX - bbox.minX + 2 * paddingX} ${
    bbox.maxY - bbox.minY + 2 * paddingY
  }`;
};
