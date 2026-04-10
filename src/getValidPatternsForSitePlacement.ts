import { uniq } from "lodash";
import { cartesianDistance } from "./libs/common";
import { CalcProjectedCoordinate, StackedSection } from "./libs/types";
import {
  BATTLE_AXE_NARROW_THRESHOLD_COUNT,
  BATTLE_AXE_NARROW_THRESHOLD_METER,
  BATTLE_AXE_NARROW_THRESHOLD_RATIO,
  SiteType,
} from "./constants";
import { getBoundary, getEnvelopeNodeId, rotateCoord } from "./utils";

/**
 * Filters site features to those valid for pattern placement, mutating each
 * valid feature's flow inputs with the available block IDs and front indices.
 */
export function getValidPatternsForSitePlacement(
  selectedSites: { value: string; label: string }[],
  siteFeatures: StackedSection[],
  projectPatterns: any[],
): StackedSection[] {
  const inputNodeId = getEnvelopeNodeId();

  return siteFeatures.filter((f) => {
    const isSelected = selectedSites.some((s) => s.value === f.properties.id);
    if (!isSelected) return false;

    const coords = f._projected[0] as CalcProjectedCoordinate[];

    let availableBlockIds = [] as string[];

    setSiteType(f);

    if (f.properties.siteType === SiteType.BATTLE_AXE) {
      // TODO: add battle axe logic
      return false;
    }

    const selectedBlockIds = f.properties.flow.inputs.keys;
    const frontIndices = f.properties.flow.inputs[inputNodeId].parameters.sideIndices.front.filter((index: number) => {
      const coord = coords[index];
      const nextCoord = coords[index + 1];
      const angle = Math.atan2(nextCoord[1] - coord[1], nextCoord[0] - coord[0]);
      const rotatedCoords = coords.map((coord) => rotateCoord(coord, -angle)) as CalcProjectedCoordinate[];

      const minX = Math.min(...rotatedCoords.map((e) => e[0]));
      const maxX = Math.max(...rotatedCoords.map((e) => e[0]));
      const minY = Math.min(...rotatedCoords.map((e) => e[1]));
      const maxY = Math.max(...rotatedCoords.map((e) => e[1]));

      const width = maxX - minX;
      const depth = maxY - minY;
      const height = f.properties["Height Of Building"] ?? Infinity;
      const area = f.properties["Area"] ?? Infinity; // TODO: calculate area if not provided

      const currentBlockIds = selectedBlockIds.filter((patternId: string) => {
        const projectPattern = projectPatterns.find((e) => e.id === patternId);

        if (projectPattern) {
          const {
            minSiteWidth,
            minSiteDepth,
            minSiteArea,
            maxHeight,
            width: calculatedWidth,
            depth: calculatedDepth,
            footPrintArea: calculatedFootPrintArea,
            // TODO: add other stats here
          } = projectPattern.stats;

          const passedWidth = width >= minSiteWidth && width >= calculatedWidth;
          const passedDepth = depth >= minSiteDepth && depth >= calculatedDepth;
          const passedHeight = height >= maxHeight;
          const passedArea = area >= minSiteArea && area >= calculatedFootPrintArea;

          return passedWidth && passedDepth && passedHeight && passedArea;
        }
      });

      if (currentBlockIds.length) {
        availableBlockIds = availableBlockIds.concat(currentBlockIds);
        return true;
      }
    });

    if (!availableBlockIds.length || !frontIndices.length) return false;

    f.properties.flow.inputs.keys = uniq(availableBlockIds);
    f.properties.flow.inputs[inputNodeId].parameters.sideIndices.front = frontIndices;

    return true;
  });
}

function setSiteType(siteFeature: StackedSection) {
  // siteFeature is a polygon
  const polygon = siteFeature._projected[0] as CalcProjectedCoordinate[];
  const [longestEdgeIndex] = polygon.reduce(
    (result, coord, index) => {
      if (index === polygon.length - 1) return result;
      const nextCoord = polygon[index + 1];
      const distance = cartesianDistance(coord, nextCoord);
      return distance > result[1] ? [index, distance] : result;
    },
    [0, 0],
  );
  const devidingCount = BATTLE_AXE_NARROW_THRESHOLD_COUNT;
  const narrowThresholdMeter = BATTLE_AXE_NARROW_THRESHOLD_METER;
  const narrowThresholdRatio = BATTLE_AXE_NARROW_THRESHOLD_RATIO;

  const baseCoord = polygon[longestEdgeIndex];
  const angle = -Math.atan2(
    polygon[longestEdgeIndex + 1][1] - baseCoord[1],
    polygon[longestEdgeIndex + 1][0] - baseCoord[0],
  );
  const rotatedPolygon = polygon.map((coord) => rotateCoord(coord, angle, baseCoord)) as CalcProjectedCoordinate[];

  const boundary = getBoundary([
    { ...siteFeature, _projected: [rotatedPolygon] },
  ] as StackedSection[]) as CalcProjectedCoordinate[];

  // const height = boundary[1][1] - boundary[0][1];
  const width = boundary[2][0] - boundary[0][0];
  const heightSegments = [] as number[];
  for (let i = 0; i <= devidingCount; i++) {
    const x = boundary[0][0] + (width * i) / devidingCount;

    let minY = Infinity,
      maxY = -Infinity;
    for (let j = 0; j < rotatedPolygon.length - 1; j++) {
      const currentCoord = rotatedPolygon[j];
      const nextCoord = rotatedPolygon[j + 1];
      if ((currentCoord[0] > x && nextCoord[0] > x) || (currentCoord[0] < x && nextCoord[0] < x)) continue;

      const dx = nextCoord[0] - currentCoord[0];
      if (dx === 0) {
        minY = Math.min(minY, currentCoord[1], nextCoord[1]);
        maxY = Math.max(maxY, currentCoord[1], nextCoord[1]);
      } else {
        const dy = nextCoord[1] - currentCoord[1];
        const a = dy / dx;
        const b = currentCoord[1] - a * currentCoord[0];

        const y = a * x + b;
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }

    heightSegments.push(maxY - minY);
  }

  const narrowCount = heightSegments.filter((height) => height < narrowThresholdMeter).length;

  const narrowRatio = narrowCount / devidingCount;

  const isBattleAxe = narrowRatio > narrowThresholdRatio;

  const inputNodeId = getEnvelopeNodeId();

  let siteType: SiteType;
  try {
    const hasMultiFrontage = siteFeature.properties.flow.inputs[inputNodeId].parameters.sideIndices.front.length > 1;
    siteType = hasMultiFrontage ? SiteType.CORNER : SiteType.MID_BLOCK;
  } catch (error) {
    siteType = SiteType.OTHER;
    console.error("setSiteType:", error);
  }
  siteFeature.properties.siteType = isBattleAxe ? SiteType.BATTLE_AXE : siteType; // TODO: add other site types
}
