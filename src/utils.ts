import { Feature } from "geojson";
import { sum } from "lodash";
import proj4 from "proj4";
import {
  DEFAULT_ENVELOPE_SETBACK_PARAMS,
  ENVELOPE_SETBACK_INPUT_MAX_M,
  ENVELOPE_SETBACK_PARAMS_STORAGE_KEY,
  type EnvelopeSetbackParams,
  PATTERN_BOOK_SHORT_LIST,
} from "./constants";
import { CLIPPER_SCALE, clipperUnion, getClipper, polyToClipper, projectedToClipper } from "./libs/clipper";
import { cartesianDistance, projectedPointOnLine } from "./libs/common";
import { isBuildingSection } from "./libs/feature";
import {
  CalcProjectedCoordinate,
  GeoCoordinate,
  StackedLineString,
  StackedPoint,
  StackedPolygon,
  StackedSection,
} from "./libs/types";
import { PatternSite } from "./types";

export const RAW_SECTION_FLAG = "isRawSection";

/** Distance from point p to segment a-b. Uses projectedPointOnLine and clamps to segment. */
function distancePointToSegment(
  p: CalcProjectedCoordinate,
  a: CalcProjectedCoordinate,
  b: CalcProjectedCoordinate,
): number {
  const foot = projectedPointOnLine(a, b, p);
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-20) return cartesianDistance(p, a);
  let t = ((foot[0] - a[0]) * dx + (foot[1] - a[1]) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const closest: CalcProjectedCoordinate = [a[0] + t * dx, a[1] + t * dy];
  return cartesianDistance(p, closest);
}

function isPointOnSegment(
  p: CalcProjectedCoordinate,
  a: CalcProjectedCoordinate,
  b: CalcProjectedCoordinate,
  tol: number,
): boolean {
  return distancePointToSegment(p, a, b) <= tol;
}

export function getBoundary(features: StackedSection[], isBuilding = false) {
  const [minX, minY, maxX, maxY] = features.reduce(
    (result, feature) => {
      let [minX, minY, maxX, maxY] = result;
      if (
        !feature.properties[RAW_SECTION_FLAG] &&
        feature.geometry.type === "Polygon" &&
        (!isBuilding || isBuildingSection(feature))
      ) {
        const coords = feature._projected[0] as CalcProjectedCoordinate[];
        for (const coord of coords) {
          if (coord[0] < minX) minX = coord[0];
          if (coord[1] < minY) minY = coord[1];
          if (coord[0] > maxX) maxX = coord[0];
          if (coord[1] > maxY) maxY = coord[1];
        }
        return [minX, minY, maxX, maxY];
      }
      return result;
    },
    [Infinity, Infinity, -Infinity, -Infinity] as [number, number, number, number],
  );

  return [
    [minX, minY],
    [minX, maxY],
    [maxX, maxY],
    [maxX, minY],
  ] as CalcProjectedCoordinate[];
}

export function getPatternStats(features: StackedSection[], site?: PatternSite) {
  const clipperLoaded = getClipper();
  // NB some parkingSections are also buildingSections
  const buildingSections = features.filter((s) => s.geometry.type === "Polygon" && isBuildingSection(s));

  const netAreaTotal = sum(buildingSections.map((e) => e.properties.netArea));
  const parkingProvided = features[0].properties.patternParkingProvided;
  const patternStyle = features.map((e) => e.properties.patternStyle)[0];

  const siteCoord = site ? (site.outer as StackedPolygon)._projected[0].map(projectedToClipper) : undefined;
  const siteArea = siteCoord ? Math.abs(clipperLoaded.area(siteCoord)) / (CLIPPER_SCALE * CLIPPER_SCALE) : 10000;

  const boundary = getBoundary(features.filter((s) => s.geometry.type === "Polygon"));
  const minX = Math.min(...boundary.map((e) => e[0]));
  const minY = Math.min(...boundary.map((e) => e[1]));
  const maxX = Math.max(...boundary.map((e) => e[0]));
  const maxY = Math.max(...boundary.map((e) => e[1]));
  const width = maxX - minX; // frontage
  const depth = maxY - minY; // depth

  // Defined on blocks for now, but could be computed here
  // const buildingBoundary = getBoundary(buildingSections, true);
  // const buildingMinX = Math.min(...buildingBoundary.map((e) => e[0]));
  // const buildingMinY = Math.min(...buildingBoundary.map((e) => e[1]));
  // const buildingMaxX = Math.max(...buildingBoundary.map((e) => e[0]));
  // const buildingMaxY = Math.max(...buildingBoundary.map((e) => e[1]));
  // const buildingWidth = buildingMaxX - buildingMinX;
  // const buildingDepth = buildingMaxY - buildingMinY;

  const dwellings = buildingSections.reduce((result, section) => {
    if (section.properties.dwellingCount) {
      return result + sum(section.properties.dwellingCount.map((e: any) => e.value ?? 0));
    }
    return result;
  }, 0);

  let footPrintArea = 0;
  const buildingPolygons = buildingSections.flatMap((s) => polyToClipper(s as StackedPolygon));
  const cleanedBuildingPolygons = buildingPolygons
    .map((path) => clipperLoaded.cleanPolygon(path, CLIPPER_SCALE * 0.1))
    .filter((path) => path.length > 2 && Math.abs(clipperLoaded.area(path)) > 0);
  try {
    const footprint = clipperUnion(cleanedBuildingPolygons);
    footPrintArea = Math.abs(sum(footprint.map((e) => clipperLoaded.area(e)))) / (CLIPPER_SCALE * CLIPPER_SCALE);
  } catch (e) {
    console.log("getPatternStats:footPrintArea", e, cleanedBuildingPolygons);
  }

  const fsr = siteArea > 0 ? netAreaTotal / siteArea : 0;

  return {
    fsr,
    area: netAreaTotal,
    footPrintArea,
    parkingProvided,
    patternStyle,
    dwellings,
    width,
    depth,
    // buildingWidth,
    // buildingDepth,
  };
}

export function rotateCoord(coord: CalcProjectedCoordinate, angle: number, center = [0, 0]) {
  const x = coord[0] - center[0];
  const y = coord[1] - center[1];
  const rotatedX = x * Math.cos(angle) - y * Math.sin(angle);
  const rotatedY = x * Math.sin(angle) + y * Math.cos(angle);
  return [rotatedX + center[0], rotatedY + center[1]];
}

export function calculateFeatureCoordinatesByProjected(feature: StackedSection, geoProject: proj4.Converter) {
  switch (feature.geometry.type) {
    case "Polygon": {
      const projected = feature._projected[0] as CalcProjectedCoordinate[];
      const coords = projected.map((c) => geoProject.inverse(c)) as GeoCoordinate[];
      feature.geometry.coordinates = [coords];
      if ((feature as any)._projectedChildren?.length) {
        (feature as any)._projectedChildren.forEach((child: any) => {
          calculateFeatureCoordinatesByProjected(child, geoProject);
        });
        feature.properties!.childFeatures = (feature as any)._projectedChildren;
      }
      break;
    }
    case "LineString": {
      const projected = feature._projected as CalcProjectedCoordinate[];
      const coords = projected.map((c) => geoProject.inverse(c)) as GeoCoordinate[];
      feature.geometry.coordinates = coords;
      break;
    }
    case "Point": {
      const projected = feature._projected as CalcProjectedCoordinate;
      const coords = geoProject.inverse(projected);
      feature.geometry.coordinates = coords;
      break;
    }
    default: {
      console.log("Unknown feature", feature);
    }
  }
}

export function getFeaturesWithProjectedCoordinates(
  feature: Feature,
  geoProject: proj4.Converter,
  rotation: number,
  calculatedFeatures: StackedSection[],
) {
  switch (feature.geometry.type) {
    case "Polygon": {
      const coords = (feature.geometry as any).coordinates[0].map((c: any) =>
        geoProject.forward(c),
      ) as CalcProjectedCoordinate[];
      const rotated = coords.map((coord) =>
        rotateCoord(coord, (rotation * Math.PI) / 180),
      ) as CalcProjectedCoordinate[];

      const polygonFeature = {
        ...feature,
        _projected: [rotated],
      } as StackedPolygon;

      if (feature.properties?.childFeatures?.length) {
        const projectedChildren = feature.properties.childFeatures.map((child: any) => {
          if (child.geometry.type === "Polygon") {
            const coords = child.geometry.coordinates[0].map((c: any) =>
              geoProject.forward(c),
            ) as CalcProjectedCoordinate[];
            const rotated = coords.map((coord) =>
              rotateCoord(coord, (rotation * Math.PI) / 180),
            ) as CalcProjectedCoordinate[];
            return {
              ...child,
              _projected: [rotated],
            };
          } else {
            const coords = child.geometry.coordinates.map((c: any) =>
              geoProject.forward(c),
            ) as CalcProjectedCoordinate[];
            const rotated = coords.map((coord) =>
              rotateCoord(coord, (rotation * Math.PI) / 180),
            ) as CalcProjectedCoordinate[];
            return {
              ...child,
              _projected: rotated,
            };
          }
        });
        (polygonFeature as any)._projectedChildren = projectedChildren;
      }

      calculatedFeatures.push(polygonFeature);
      break;
    }
    case "MultiPolygon": {
      // TODO: support multiple polygons
      const coords = (feature.geometry as any).coordinates[0][0].map((c: any) =>
        geoProject.forward(c),
      ) as CalcProjectedCoordinate[];
      const rotated = coords.map((coord) =>
        rotateCoord(coord, (rotation * Math.PI) / 180),
      ) as CalcProjectedCoordinate[];

      const polygonFeature = {
        ...feature,
        geometry: {
          type: "Polygon",
          coordinates: (feature.geometry as any).coordinates[0],
        },
        _projected: [rotated],
      } as StackedPolygon;

      calculatedFeatures.push(polygonFeature);
      break;
    }
    case "LineString": {
      const coords = feature.geometry.coordinates.map((c: any) => geoProject.forward(c)) as CalcProjectedCoordinate[];
      const rotated = coords.map((coord) =>
        rotateCoord(coord, (rotation * Math.PI) / 180),
      ) as CalcProjectedCoordinate[];

      calculatedFeatures.push({
        ...feature,
        _projected: rotated,
      } as StackedLineString);
      break;
    }
    case "MultiLineString": {
      const coordsArray = (feature.geometry as any).coordinates.map(
        (line: any) => line.map((c: any) => geoProject.forward(c)) as CalcProjectedCoordinate[],
      );
      const rotated = coordsArray.map(
        (coords: CalcProjectedCoordinate[]) =>
          coords.map((coord) => rotateCoord(coord, (rotation * Math.PI) / 180)) as CalcProjectedCoordinate[],
      );

      calculatedFeatures.push({
        ...feature,
        _projected: rotated,
      } as StackedSection);
      break;
    }
    case "Point": {
      const coord = geoProject.forward(feature.geometry.coordinates) as CalcProjectedCoordinate;
      const rotated = rotateCoord(coord, (rotation * Math.PI) / 180) as CalcProjectedCoordinate;

      calculatedFeatures.push({
        ...feature,
        _projected: rotated,
      } as StackedPoint);
      break;
    }
    default: {
      console.log(`rawPatterns: ${feature.geometry}`);
    }
  }
}

const MAX_FRONT_DISTANCE = 20; // meters; absolute max distance to road for "front"
const FRONT_RELATIVE_FACTOR = 1.4; // edges within this factor of min edge-to-road distance count as front
const ON_EDGE_TOLERANCE = 0.2; // meters; treat midpoint as "on" another site's edge

export const getSideIndices = (
  siteFeatures: StackedSection[],
  roadFeatures: StackedSection[],
  currentSiteIndex: number,
) => {
  const front: number[] = [];
  const side: number[] = [];
  const rear: number[] = [];

  const current = siteFeatures[currentSiteIndex];
  if (!current || current.geometry.type !== "Polygon") {
    return { front, rear };
  }

  const ring = (current as StackedPolygon)._projected[0] as CalcProjectedCoordinate[];
  const n = ring.length;
  const numEdges = n - 1;
  if (numEdges <= 0) return { front, rear };

  const roadSegments: Array<[CalcProjectedCoordinate, CalcProjectedCoordinate]> = [];
  roadFeatures.forEach((f) => {
    if (f.geometry.type === "LineString") {
      const line = (f as StackedLineString)._projected;
      for (let j = 0; j < line.length - 1; j++) roadSegments.push([line[j], line[j + 1]]);
    } else {
      const lines = (f as any)._projected as CalcProjectedCoordinate[][];
      lines.forEach((line) => {
        for (let j = 0; j < line.length - 1; j++) roadSegments.push([line[j], line[j + 1]]);
      });
    }
  });

  const otherSiteEdges: Array<[CalcProjectedCoordinate, CalcProjectedCoordinate]> = [];
  siteFeatures.forEach((f, idx) => {
    if (idx === currentSiteIndex || f.geometry.type !== "Polygon") return;
    const coords = (f as StackedPolygon)._projected[0] as CalcProjectedCoordinate[];
    for (let j = 0; j < coords.length - 1; j++) otherSiteEdges.push([coords[j], coords[j + 1]]);
  });

  // Per-edge min distance to any road segment (no vertical-line filter)
  const minDistToRoad = (mid: CalcProjectedCoordinate) => {
    let d = Infinity;
    for (const [p, q] of roadSegments) {
      const t = distancePointToSegment(mid, p, q);
      if (t < d) d = t;
    }
    return d;
  };

  const edgeDistances: number[] = [];
  for (let i = 0; i < numEdges; i++) {
    const a = ring[i],
      b = ring[i + 1];
    const mid: CalcProjectedCoordinate = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    edgeDistances.push(minDistToRoad(mid));
  }

  const dMin = roadSegments.length > 0 ? Math.min(...edgeDistances) : Infinity;

  // So that at least the closest edge is front when road is far: threshold >= dMin
  const frontThreshold =
    roadSegments.length > 0 ? Math.max(MAX_FRONT_DISTANCE, dMin * FRONT_RELATIVE_FACTOR) : Infinity;

  for (let i = 0; i < numEdges; i++) {
    const a = ring[i],
      b = ring[i + 1];
    const mid: CalcProjectedCoordinate = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

    const onOtherSiteEdge = otherSiteEdges.some(([p, q]) => isPointOnSegment(mid, p, q, ON_EDGE_TOLERANCE));
    if (onOtherSiteEdge) {
      continue;
    }

    const d = edgeDistances[i];
    const isFront = d <= frontThreshold;

    if (isFront) front.push(i);
  }

  for (let i = 0; i < numEdges; i++) {
    if (front.includes(i)) continue;
    const nI = (i + 1) % numEdges;
    const pI = i === 0 ? numEdges - 1 : i - 1;
    if (front.includes(nI) || front.includes(pI)) {
      side.push(i);
      continue;
    }
    rear.push(i);
  }

  return { front, rear, side };
};

/** Lodash groupBy needs a scalar key; flow `keys` is an array — normalize to a stable string. */
export function groupKeyForFlowInputKeys(feature: StackedSection): string {
  const keys = feature.properties?.flow?.inputs?.keys;
  if (Array.isArray(keys)) {
    return JSON.stringify([...keys].sort());
  }
  return String(keys ?? "");
}

export function getEnvelopeNodeId() {
  return PATTERN_BOOK_SHORT_LIST.nodes[3].id; // 27c92de04d8e432ebbd56d446d881dcc
}

export function readEnvelopeSetbackParamsFromStorage(): EnvelopeSetbackParams {
  if (typeof window === "undefined") return DEFAULT_ENVELOPE_SETBACK_PARAMS;
  try {
    const raw = localStorage.getItem(ENVELOPE_SETBACK_PARAMS_STORAGE_KEY);
    if (!raw) return DEFAULT_ENVELOPE_SETBACK_PARAMS;
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "front" in parsed &&
      "rear" in parsed &&
      "side" in parsed &&
      typeof (parsed as { front: unknown }).front === "number" &&
      typeof (parsed as { rear: unknown }).rear === "number" &&
      typeof (parsed as { side: unknown }).side === "number" &&
      Number.isFinite((parsed as { front: number }).front) &&
      Number.isFinite((parsed as { rear: number }).rear) &&
      Number.isFinite((parsed as { side: number }).side)
    ) {
      return {
        front: (parsed as { front: number }).front,
        rear: (parsed as { rear: number }).rear,
        side: (parsed as { side: number }).side,
      };
    }
  } catch {
    /* ignore corrupt storage */
  }
  return DEFAULT_ENVELOPE_SETBACK_PARAMS;
}

export function persistEnvelopeSetbackParamsToStorage(params: EnvelopeSetbackParams): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ENVELOPE_SETBACK_PARAMS_STORAGE_KEY, JSON.stringify(params));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Chakra NumberInput may pass "" or undefined while editing; avoid NaN and negative values. */
export function parseEnvelopeSetbackMeters(value: string | undefined): number {
  const s = value == null ? "" : String(value).trim();
  if (s === "") return 0;
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return 0;
  return Math.min(ENVELOPE_SETBACK_INPUT_MAX_M, Math.max(0, n));
}

function isPointInPolygon(coord: GeoCoordinate, polygon: GeoCoordinate[]) {
  const [x, y] = coord;
  let inside = false;
  for (let j = 1, i = 0; j < polygon.length; i = j++) {
    const [xi, yi] = polygon[i]!;
    const [xj, yj] = polygon[j]!;
    const intersect = yi > y != yj > y && x < (xj - xi) * ((y - yi) / (yj - yi)) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function getSiteFeatures(siteLayerContents: any, geoProject: proj4.Converter) {
  const siteFeatures: StackedSection[] = [];
  siteLayerContents.features
    .filter((feature: Feature) => feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon")
    .forEach((feature: Feature) => getFeaturesWithProjectedCoordinates(feature, geoProject, 0, siteFeatures));
  return siteFeatures;
}

export function getRoadFeatures(roadContents: any, geoProject: proj4.Converter) {
  const roadFeatures: StackedSection[] = [];
  if (roadContents?.features?.length) {
    roadContents.features.forEach((feature: Feature) =>
      getFeaturesWithProjectedCoordinates(feature, geoProject, 0, roadFeatures),
    );
  }
  return roadFeatures;
}

export function getSiteFeatureByGeoCoord(
  siteFeatures: StackedSection[],
  geoCoord: GeoCoordinate,
  geoProject: proj4.Converter,
) {
  const coord = geoProject.forward(geoCoord);

  const polygons = siteFeatures.map((feature) =>
    (feature.geometry.coordinates[0] as GeoCoordinate[]).map((coord) => geoProject.forward(coord)),
  );

  const index = polygons.findIndex((polygon) => isPointInPolygon(coord, polygon));

  return index !== -1 ? siteFeatures[index] : null;
}

export function setFlowPropertyOfFeature(
  feature: StackedSection,
  params: EnvelopeSetbackParams,
  indices: { front: number[]; rear: number[]; side?: number[] },
  selectedBlockIds: string[],
  instantPointId: string,
  rotations: Record<string, number>,
  index?: number,
) {
  const { front, rear, side } = indices;
  const inputNodeId = getEnvelopeNodeId();
  feature.properties = {
    id: feature.properties.id
      ? `${feature.properties.id}`
      : feature.properties["ID"]
        ? `${feature.properties["ID"]}`
        : `site_${index}`,
    address: feature.properties.Address,
    "Height Of Building": feature.properties["Height Of Building"],
    Area: feature.properties["Area"],
    // TODO: add other native site properties here
    // zone: feature.properties.Landzone,
    flow: {
      id: PATTERN_BOOK_SHORT_LIST.id,
      inputs: {
        [inputNodeId]: {
          type: "envelope",
          parameters: {
            version: "beta",
            maxHeight: 12,
            fillEnabled: true,
            sideIndices: {
              rear,
              front,
              side,
              isManual: true,
            },
            setbackSteps: {
              rear: [
                {
                  inset: params.rear,
                  height: 0,
                },
                {
                  inset: params.rear,
                },
              ],
              side: [
                {
                  inset: params.side,
                  height: 0,
                },
                {
                  inset: params.side,
                },
              ],
              front: [
                {
                  inset: params.front,
                  height: 0,
                },
                {
                  inset: params.front,
                },
              ],
            },
            hasSetbackOutput: true,
          },
        },
        keys: selectedBlockIds,
        point: [instantPointId],
        rotation: JSON.stringify(rotations),
      },
    },
  };
}
