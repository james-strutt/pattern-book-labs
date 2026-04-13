import {
  PATTERN_BOOK_SECTION_TYPES,
  type ProjectedCoordinate,
  type ProjectedFeature,
  type ProjectedPolygon,
} from "@/apps/patternBook/types/projectedGeometry";

export const RAW_SECTION_FLAG = "isRawSection";

export function isBuildingSection(feature: ProjectedFeature): boolean {
  const props = feature.properties as Record<string, unknown> | undefined;
  if (!props) return false;
  const type = props.type as string | undefined;
  if (
    type !== PATTERN_BOOK_SECTION_TYPES.BUILDING_SECTION &&
    type !== PATTERN_BOOK_SECTION_TYPES.BASEMENT
  ) {
    return false;
  }
  const levels = Number(props.levels);
  const floorToFloor = Number(props.floorToFloor);
  return !Number.isNaN(levels) && !Number.isNaN(floorToFloor);
}

/**
 * Returns the axis-aligned bounding box of the polygon features in the input,
 * formatted as a 4-corner ring. Skips features flagged as raw sections and,
 * when isBuilding is true, restricts to building sections only.
 */
export function getProjectedBoundary(
  features: ProjectedFeature[],
  isBuilding = false,
): ProjectedCoordinate[] {
  const initial: [number, number, number, number] = [
    Infinity,
    Infinity,
    -Infinity,
    -Infinity,
  ];

  const [minX, minY, maxX, maxY] = features.reduce((result, feature) => {
    const [currentMinX, currentMinY, currentMaxX, currentMaxY] = result;
    const props = feature.properties as Record<string, unknown> | undefined;

    if (
      !props ||
      props[RAW_SECTION_FLAG] ||
      feature.geometry.type !== "Polygon" ||
      (isBuilding && !isBuildingSection(feature))
    ) {
      return result;
    }

    const coords = (feature as ProjectedPolygon)._projected[0] ?? [];
    let next: [number, number, number, number] = [
      currentMinX,
      currentMinY,
      currentMaxX,
      currentMaxY,
    ];

    for (const coord of coords) {
      const [x, y] = coord;
      if (x < next[0]) next = [x, next[1], next[2], next[3]];
      if (y < next[1]) next = [next[0], y, next[2], next[3]];
      if (x > next[2]) next = [next[0], next[1], x, next[3]];
      if (y > next[3]) next = [next[0], next[1], next[2], y];
    }

    return next;
  }, initial);

  return [
    [minX, minY],
    [minX, maxY],
    [maxX, maxY],
    [maxX, minY],
  ];
}
