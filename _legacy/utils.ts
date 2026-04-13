import { Feature } from "geojson";                                                                                     // GeoJSON Feature type import
import { sum } from "lodash";                                                                                          // Lodash sum helper import
import proj4 from "proj4";                                                                                             // proj4 coordinate-projection library
import {                                                                                                               // Begin named import from constants
  DEFAULT_ENVELOPE_SETBACK_PARAMS,                                                                                     // Default front/side/rear setback values
  ENVELOPE_SETBACK_INPUT_MAX_M,                                                                                        // Max allowed setback input in metres
  ENVELOPE_SETBACK_PARAMS_STORAGE_KEY,                                                                                 // localStorage key for setback params
  type EnvelopeSetbackParams,                                                                                          // Envelope setback params type
  PATTERN_BOOK_SHORT_LIST,                                                                                             // Pattern book flow DAG definition
} from "./constants";                                                                                                  // End constants import
import { CLIPPER_SCALE, clipperUnion, getClipper, polyToClipper, projectedToClipper } from "./libs/clipper";           // Clipper helpers: scale, union, loader, polygon converters
import { cartesianDistance, projectedPointOnLine } from "./libs/common";                                               // Geometry helpers: cartesian distance and projected-point-on-line
import { isBuildingSection } from "./libs/feature";                                                                    // Classifier: is this feature a building section?
import {                                                                                                               // Begin named import from local types
  CalcProjectedCoordinate,                                                                                             // 2D projected coordinate type
  GeoCoordinate,                                                                                                       // Geographic (lon/lat) coordinate type
  StackedLineString,                                                                                                   // Stacked line string type
  StackedPoint,                                                                                                        // Stacked point type
  StackedPolygon,                                                                                                      // Stacked polygon type
  StackedSection,                                                                                                      // Generic stacked section feature type
} from "./libs/types";                                                                                                 // End types import
import { PatternSite } from "./types";                                                                                 // PatternSite type import

export const RAW_SECTION_FLAG = "isRawSection";                                                                        // Marker flag for sections excluded from bounds and stats

/** Distance from point p to segment a-b. Uses projectedPointOnLine and clamps to segment. */                          // JSDoc for distancePointToSegment
function distancePointToSegment(                                                                                       // Function: distance from point p to segment a-b
  p: CalcProjectedCoordinate,                                                                                          // Param: query point p
  a: CalcProjectedCoordinate,                                                                                          // Param: segment endpoint a
  b: CalcProjectedCoordinate,                                                                                          // Param: segment endpoint b
): number {                                                                                                            // Returns a distance (number)
  const foot = projectedPointOnLine(a, b, p);                                                                          // Foot of perpendicular from p onto infinite line a-b
  const dx = b[0] - a[0],                                                                                              // Segment delta x
    dy = b[1] - a[1];                                                                                                  // Segment delta y
  const lenSq = dx * dx + dy * dy;                                                                                     // Squared length of segment a-b
  if (lenSq < 1e-20) return cartesianDistance(p, a);                                                                   // Degenerate segment (a==b): distance is p->a
  let t = ((foot[0] - a[0]) * dx + (foot[1] - a[1]) * dy) / lenSq;                                                     // Parametric position of foot along the segment
  t = Math.max(0, Math.min(1, t));                                                                                     // Clamp t to [0,1] so closest point lies on the segment
  const closest: CalcProjectedCoordinate = [a[0] + t * dx, a[1] + t * dy];                                             // Clamped closest point on the segment
  return cartesianDistance(p, closest);                                                                                // Return Euclidean distance from p to closest
}                                                                                                                      // End of distancePointToSegment

function isPointOnSegment(                                                                                             // Predicate: is point p on segment a-b within tolerance?
  p: CalcProjectedCoordinate,                                                                                          // Param: query point
  a: CalcProjectedCoordinate,                                                                                          // Param: segment endpoint
  b: CalcProjectedCoordinate,                                                                                          // Param: segment endpoint
  tol: number,                                                                                                         // Param: tolerance in metres
): boolean {                                                                                                           // Returns boolean
  return distancePointToSegment(p, a, b) <= tol;                                                                       // Delegate to distance helper and compare against tol
}                                                                                                                      // End of isPointOnSegment

export function getBoundary(features: StackedSection[], isBuilding = false) {                                          // Compute AABB of projected features (optionally building-only)
  const [minX, minY, maxX, maxY] = features.reduce(                                                                    // Reduce over features folding running min/max extents
    (result, feature) => {                                                                                             // Reducer callback: running extents and current feature
      let [minX, minY, maxX, maxY] = result;                                                                           // Destructure running min/max from accumulator
      if (                                                                                                             // Begin qualifying filter
        !feature.properties[RAW_SECTION_FLAG] &&                                                                       // Exclude raw sections from bounds
        feature.geometry.type === "Polygon" &&                                                                         // Only consider polygon geometries
        (!isBuilding || isBuildingSection(feature))                                                                    // In building mode, restrict to building sections
      ) {                                                                                                              // End qualifying filter
        const coords = feature._projected[0] as CalcProjectedCoordinate[];                                             // Pull projected outer ring
        for (const coord of coords) {                                                                                  // Iterate ring vertices
          if (coord[0] < minX) minX = coord[0];                                                                        // Update minX on smaller x
          if (coord[1] < minY) minY = coord[1];                                                                        // Update minY on smaller y
          if (coord[0] > maxX) maxX = coord[0];                                                                        // Update maxX on larger x
          if (coord[1] > maxY) maxY = coord[1];                                                                        // Update maxY on larger y
        }                                                                                                              // End vertex loop
        return [minX, minY, maxX, maxY];                                                                               // Return updated extents for this feature
      }                                                                                                                // End qualifying branch
      return result;                                                                                                   // Feature ignored - propagate accumulator
    },                                                                                                                 // End reducer callback
    [Infinity, Infinity, -Infinity, -Infinity] as [number, number, number, number],                                    // Initial accumulator: +/-Infinity sentinels
  );                                                                                                                   // End reduce call

  return [                                                                                                             // Return four corners of bounding box as a ring
    [minX, minY],                                                                                                      // Bottom-left corner
    [minX, maxY],                                                                                                      // Top-left corner
    [maxX, maxY],                                                                                                      // Top-right corner
    [maxX, minY],                                                                                                      // Bottom-right corner
  ] as CalcProjectedCoordinate[];                                                                                      // Cast as projected coordinate array
}                                                                                                                      // End of getBoundary

export function getPatternStats(features: StackedSection[], site?: PatternSite) {                                      // Compute aggregate pattern stats for a feature set
  const clipperLoaded = getClipper();                                                                                  // Load clipper WebAssembly module
  // NB some parkingSections are also buildingSections
  const buildingSections = features.filter((s) => s.geometry.type === "Polygon" && isBuildingSection(s));              // Filter to polygon building sections

  const netAreaTotal = sum(buildingSections.map((e) => e.properties.netArea));                                         // Sum net floor area across building sections
  const parkingProvided = features[0].properties.patternParkingProvided;                                               // Parking provided, taken from first section
  const patternStyle = features.map((e) => e.properties.patternStyle)[0];                                              // Pattern style taken from first section

  const siteCoord = site ? (site.outer as StackedPolygon)._projected[0].map(projectedToClipper) : undefined;           // Project site outer ring to clipper units if site given
  const siteArea = siteCoord ? Math.abs(clipperLoaded.area(siteCoord)) / (CLIPPER_SCALE * CLIPPER_SCALE) : 10000;      // Site area in sqm, or 10,000 sqm fallback

  const boundary = getBoundary(features.filter((s) => s.geometry.type === "Polygon"));                                 // Compute polygon-only bounding box
  const minX = Math.min(...boundary.map((e) => e[0]));                                                                 // Min x of bounding ring
  const minY = Math.min(...boundary.map((e) => e[1]));                                                                 // Min y of bounding ring
  const maxX = Math.max(...boundary.map((e) => e[0]));                                                                 // Max x of bounding ring
  const maxY = Math.max(...boundary.map((e) => e[1]));                                                                 // Max y of bounding ring
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

  const dwellings = buildingSections.reduce((result, section) => {                                                     // Sum dwelling counts across building sections
    if (section.properties.dwellingCount) {                                                                            // Guard: section has dwellingCount field
      return result + sum(section.properties.dwellingCount.map((e: any) => e.value ?? 0));                             // Accumulate dwelling values from yield entries
    }                                                                                                                  // End guard branch
    return result;                                                                                                     // Propagate accumulator when no dwellingCount
  }, 0);                                                                                                               // End reduce (initial 0)

  let footPrintArea = 0;                                                                                               // Footprint area accumulator
  const buildingPolygons = buildingSections.flatMap((s) => polyToClipper(s as StackedPolygon));                        // Flatten building polygons into clipper paths
  const cleanedBuildingPolygons = buildingPolygons                                                                     // Clean paths to remove near-duplicate points
    .map((path) => clipperLoaded.cleanPolygon(path, CLIPPER_SCALE * 0.1))                                              // Cleaning tolerance of 0.1 in scaled clipper units
    .filter((path) => path.length > 2 && Math.abs(clipperLoaded.area(path)) > 0);                                      // Discard degenerate (<3 pts or zero area) paths
  try {                                                                                                                // Try/catch around clipper union
    const footprint = clipperUnion(cleanedBuildingPolygons);                                                           // Union cleaned paths into a single footprint
    footPrintArea = Math.abs(sum(footprint.map((e) => clipperLoaded.area(e)))) / (CLIPPER_SCALE * CLIPPER_SCALE);      // Convert clipper area back to real square metres
  } catch (e) {                                                                                                        // Catch clipper failures
    console.log("getPatternStats:footPrintArea", e, cleanedBuildingPolygons);                                          // Diagnostic log for footprint failure
  }                                                                                                                    // End try/catch

  const fsr = siteArea > 0 ? netAreaTotal / siteArea : 0;                                                              // Floor space ratio = net area / site area

  return {                                                                                                             // Begin returned stats object
    fsr,                                                                                                               // Floor space ratio
    area: netAreaTotal,                                                                                                // Total net floor area
    footPrintArea,                                                                                                     // Building footprint area (sqm)
    parkingProvided,                                                                                                   // Parking provision count
    patternStyle,                                                                                                      // Pattern style id
    dwellings,                                                                                                         // Total dwelling count
    width,                                                                                                             // Pattern frontage width
    depth,                                                                                                             // Pattern depth
    // buildingWidth,
    // buildingDepth,
  };                                                                                                                   // End stats object
}                                                                                                                      // End of getPatternStats

export function rotateCoord(coord: CalcProjectedCoordinate, angle: number, center = [0, 0]) {                          // Rotate a 2D point by angle (radians) about centre
  const x = coord[0] - center[0];                                                                                      // Translate x to origin
  const y = coord[1] - center[1];                                                                                      // Translate y to origin
  const rotatedX = x * Math.cos(angle) - y * Math.sin(angle);                                                          // Apply 2D rotation matrix to x
  const rotatedY = x * Math.sin(angle) + y * Math.cos(angle);                                                          // Apply 2D rotation matrix to y
  return [rotatedX + center[0], rotatedY + center[1]];                                                                 // Translate back and return rotated coord
}                                                                                                                      // End of rotateCoord

export function calculateFeatureCoordinatesByProjected(feature: StackedSection, geoProject: proj4.Converter) {         // Write geographic coords onto a feature from its projected coords
  switch (feature.geometry.type) {                                                                                     // Switch on geometry type
    case "Polygon": {                                                                                                  // Polygon case
      const projected = feature._projected[0] as CalcProjectedCoordinate[];                                            // Pull projected outer ring
      const coords = projected.map((c) => geoProject.inverse(c)) as GeoCoordinate[];                                   // Inverse-project to geographic coords
      feature.geometry.coordinates = [coords];                                                                         // Assign ring back to feature geometry
      if ((feature as any)._projectedChildren?.length) {                                                               // Recurse into projected child features if any
        (feature as any)._projectedChildren.forEach((child: any) => {                                                  // Iterate projected children
          calculateFeatureCoordinatesByProjected(child, geoProject);                                                   // Recursive call for each child
        });                                                                                                            // End child loop
        feature.properties!.childFeatures = (feature as any)._projectedChildren;                                       // Expose children via properties.childFeatures
      }                                                                                                                // End children branch
      break;                                                                                                           // Break polygon case
    }                                                                                                                  // End polygon case
    case "LineString": {                                                                                               // LineString case
      const projected = feature._projected as CalcProjectedCoordinate[];                                               // Pull projected line coords
      const coords = projected.map((c) => geoProject.inverse(c)) as GeoCoordinate[];                                   // Inverse-project to geographic coords
      feature.geometry.coordinates = coords;                                                                           // Assign line coords back to feature
      break;                                                                                                           // Break line string case
    }                                                                                                                  // End line string case
    case "Point": {                                                                                                    // Point case
      const projected = feature._projected as CalcProjectedCoordinate;                                                 // Pull projected point coord
      const coords = geoProject.inverse(projected);                                                                    // Inverse-project the point
      feature.geometry.coordinates = coords;                                                                           // Assign coord back to feature
      break;                                                                                                           // Break point case
    }                                                                                                                  // End point case
    default: {                                                                                                         // Default case
      console.log("Unknown feature", feature);                                                                         // Log unknown feature
    }                                                                                                                  // End default case
  }                                                                                                                    // End switch
}                                                                                                                      // End of calculateFeatureCoordinatesByProjected

export function getFeaturesWithProjectedCoordinates(                                                                   // Project a feature and push it into calculatedFeatures
  feature: Feature,                                                                                                    // Param: raw input feature
  geoProject: proj4.Converter,                                                                                         // Param: proj4 converter
  rotation: number,                                                                                                    // Param: rotation in degrees
  calculatedFeatures: StackedSection[],                                                                                // Param: output accumulator
) {                                                                                                                    // Begin function body
  switch (feature.geometry.type) {                                                                                     // Switch on geometry type
    case "Polygon": {                                                                                                  // Polygon case
      const coords = (feature.geometry as any).coordinates[0].map((c: any) =>                                          // Project each coord of outer ring forward
        geoProject.forward(c),                                                                                         // Forward projection (lon/lat -> cartesian)
      ) as CalcProjectedCoordinate[];                                                                                  // Cast to projected coordinate array
      const rotated = coords.map((coord) =>                                                                            // Rotate each projected coord
        rotateCoord(coord, (rotation * Math.PI) / 180),                                                                // Rotation in radians
      ) as CalcProjectedCoordinate[];                                                                                  // Cast to projected coordinate array

      const polygonFeature = {                                                                                         // Build stacked polygon feature
        ...feature,                                                                                                    // Spread original feature props
        _projected: [rotated],                                                                                         // Attach projected outer ring
      } as StackedPolygon;                                                                                             // Cast to StackedPolygon

      if (feature.properties?.childFeatures?.length) {                                                                 // Handle nested child features if present
        const projectedChildren = feature.properties.childFeatures.map((child: any) => {                               // Map each child to its projected counterpart
          if (child.geometry.type === "Polygon") {                                                                     // Child is a polygon
            const coords = child.geometry.coordinates[0].map((c: any) =>                                               // Project child outer ring
              geoProject.forward(c),                                                                                   // Forward-project child coord
            ) as CalcProjectedCoordinate[];                                                                            // Cast to projected coordinate array
            const rotated = coords.map((coord) =>                                                                      // Rotate child coords
              rotateCoord(coord, (rotation * Math.PI) / 180),                                                          // Rotation in radians
            ) as CalcProjectedCoordinate[];                                                                            // Cast to projected coordinate array
            return {                                                                                                   // Return child with projected ring
              ...child,                                                                                                // Spread child props
              _projected: [rotated],                                                                                   // Attach rotated ring
            };                                                                                                         // End polygon child branch
          } else {                                                                                                     // Else: non-polygon child (line or point)
            const coords = child.geometry.coordinates.map((c: any) =>                                                  // Project child coords (flat list)
              geoProject.forward(c),                                                                                   // Forward projection
            ) as CalcProjectedCoordinate[];                                                                            // Cast to projected coordinate array
            const rotated = coords.map((coord) =>                                                                      // Rotate child coords
              rotateCoord(coord, (rotation * Math.PI) / 180),                                                          // Rotation in radians
            ) as CalcProjectedCoordinate[];                                                                            // Cast to projected coordinate array
            return {                                                                                                   // Return child with projected coords
              ...child,                                                                                                // Spread child props
              _projected: rotated,                                                                                     // Attach rotated coords
            };                                                                                                         // End non-polygon child branch
          }                                                                                                            // End child map
        });                                                                                                            // Attach processed children onto polygon feature
        (polygonFeature as any)._projectedChildren = projectedChildren;                                                // Cast required because _projectedChildren is not on the base type
      }                                                                                                                // End children branch

      calculatedFeatures.push(polygonFeature);                                                                         // Push polygon feature into output
      break;                                                                                                           // Break polygon case
    }                                                                                                                  // End polygon case
    case "MultiPolygon": {                                                                                             // MultiPolygon case
      // TODO: support multiple polygons
      const coords = (feature.geometry as any).coordinates[0][0].map((c: any) =>                                       // Project first polygon first ring forward
        geoProject.forward(c),                                                                                         // Forward projection
      ) as CalcProjectedCoordinate[];                                                                                  // Cast to projected coordinate array
      const rotated = coords.map((coord) =>                                                                            // Rotate each projected coord
        rotateCoord(coord, (rotation * Math.PI) / 180),                                                                // Rotation in radians
      ) as CalcProjectedCoordinate[];                                                                                  // Cast to projected coordinate array

      const polygonFeature = {                                                                                         // Build collapsed polygon feature
        ...feature,                                                                                                    // Spread original feature props
        geometry: {                                                                                                    // Override geometry as Polygon
          type: "Polygon",                                                                                             // Geometry type set to Polygon
          coordinates: (feature.geometry as any).coordinates[0],                                                       // Take first polygon coordinates
        },                                                                                                             // End overridden geometry
        _projected: [rotated],                                                                                         // Attach projected ring
      } as StackedPolygon;                                                                                             // Cast to StackedPolygon

      calculatedFeatures.push(polygonFeature);                                                                         // Push collapsed polygon into output
      break;                                                                                                           // Break multipolygon case
    }                                                                                                                  // End multipolygon case
    case "LineString": {                                                                                               // LineString case
      const coords = feature.geometry.coordinates.map((c: any) => geoProject.forward(c)) as CalcProjectedCoordinate[];  // Project each line coord forward
      const rotated = coords.map((coord) =>                                                                            // Rotate each projected coord
        rotateCoord(coord, (rotation * Math.PI) / 180),                                                                // Rotation in radians
      ) as CalcProjectedCoordinate[];                                                                                  // Cast to projected coordinate array

      calculatedFeatures.push({                                                                                        // Push stacked line string into output
        ...feature,                                                                                                    // Spread original feature props
        _projected: rotated,                                                                                           // Attach projected coords
      } as StackedLineString);                                                                                         // Cast to StackedLineString
      break;                                                                                                           // Break line string case
    }                                                                                                                  // End line string case
    case "MultiLineString": {                                                                                          // MultiLineString case
      const coordsArray = (feature.geometry as any).coordinates.map(                                                   // Map each sub-line to projected coord array
        (line: any) => line.map((c: any) => geoProject.forward(c)) as CalcProjectedCoordinate[],                       // Forward project each coord in sub-line
      );                                                                                                               // End sub-line projection map
      const rotated = coordsArray.map(                                                                                 // Rotate each projected coord of each sub-line
        (coords: CalcProjectedCoordinate[]) =>                                                                         // Inner mapper over one sub-line
          coords.map((coord) => rotateCoord(coord, (rotation * Math.PI) / 180)) as CalcProjectedCoordinate[],          // Apply rotation in radians per coord
      );                                                                                                               // End rotation map

      calculatedFeatures.push({                                                                                        // Push stacked multiline feature
        ...feature,                                                                                                    // Spread original feature props
        _projected: rotated,                                                                                           // Attach projected sub-lines
      } as StackedSection);                                                                                            // Cast to StackedSection
      break;                                                                                                           // Break multiline case
    }                                                                                                                  // End multiline case
    case "Point": {                                                                                                    // Point case
      const coord = geoProject.forward(feature.geometry.coordinates) as CalcProjectedCoordinate;                       // Project the single point forward
      const rotated = rotateCoord(coord, (rotation * Math.PI) / 180) as CalcProjectedCoordinate;                       // Rotate the projected point

      calculatedFeatures.push({                                                                                        // Push stacked point into output
        ...feature,                                                                                                    // Spread original feature props
        _projected: rotated,                                                                                           // Attach projected coord
      } as StackedPoint);                                                                                              // Cast to StackedPoint
      break;                                                                                                           // Break point case
    }                                                                                                                  // End point case
    default: {                                                                                                         // Default case
      console.log(`rawPatterns: ${feature.geometry}`);                                                                 // Log unhandled geometry
    }                                                                                                                  // End default case
  }                                                                                                                    // End switch
}                                                                                                                      // End of getFeaturesWithProjectedCoordinates

const MAX_FRONT_DISTANCE = 20; // meters; absolute max distance to road for "front"
const FRONT_RELATIVE_FACTOR = 1.4; // edges within this factor of min edge-to-road distance count as front
const ON_EDGE_TOLERANCE = 0.2; // meters; treat midpoint as "on" another site's edge

export const getSideIndices = (                                                                                        // Classify edges of current site as front/side/rear
  siteFeatures: StackedSection[],                                                                                      // Param: all site features
  roadFeatures: StackedSection[],                                                                                      // Param: all road features
  currentSiteIndex: number,                                                                                            // Param: index of current site
) => {                                                                                                                 // Begin function body
  const front: number[] = [];                                                                                          // Accumulator for front edge indices
  const side: number[] = [];                                                                                           // Accumulator for side edge indices
  const rear: number[] = [];                                                                                           // Accumulator for rear edge indices

  const current = siteFeatures[currentSiteIndex];                                                                      // Pick out current site
  if (!current || current.geometry.type !== "Polygon") {                                                               // Guard: current site missing or not a polygon
    return { front, rear };                                                                                            // Return empty front/rear in degenerate case
  }                                                                                                                    // End guard

  const ring = (current as StackedPolygon)._projected[0] as CalcProjectedCoordinate[];                                 // Outer ring of current site polygon
  const n = ring.length;                                                                                               // Vertex count
  const numEdges = n - 1;                                                                                              // Edge count = vertex count - closing vertex
  if (numEdges <= 0) return { front, rear };                                                                           // Early return if no edges

  const roadSegments: Array<[CalcProjectedCoordinate, CalcProjectedCoordinate]> = [];                                  // Flatten road features into segment pairs
  roadFeatures.forEach((f) => {                                                                                        // Iterate each road feature
    if (f.geometry.type === "LineString") {                                                                            // Plain LineString branch
      const line = (f as StackedLineString)._projected;                                                                // Pull projected line
      for (let j = 0; j < line.length - 1; j++) roadSegments.push([line[j], line[j + 1]]);                             // Split into consecutive segments
    } else {                                                                                                           // Else: multi-line-like
      const lines = (f as any)._projected as CalcProjectedCoordinate[][];                                              // Cast to array of lines
      lines.forEach((line) => {                                                                                        // Iterate sub-lines
        for (let j = 0; j < line.length - 1; j++) roadSegments.push([line[j], line[j + 1]]);                           // Split each sub-line into segments
      });                                                                                                              // End sub-line iteration
    }                                                                                                                  // End multi-line branch
  });                                                                                                                  // End road feature iteration

  const otherSiteEdges: Array<[CalcProjectedCoordinate, CalcProjectedCoordinate]> = [];                                // Accumulator for edges of other sites
  siteFeatures.forEach((f, idx) => {                                                                                   // Iterate site features with index
    if (idx === currentSiteIndex || f.geometry.type !== "Polygon") return;                                             // Skip current site and non-polygons
    const coords = (f as StackedPolygon)._projected[0] as CalcProjectedCoordinate[];                                   // Outer ring of other polygon
    for (let j = 0; j < coords.length - 1; j++) otherSiteEdges.push([coords[j], coords[j + 1]]);                       // Split into consecutive edges
  });                                                                                                                  // End other-site iteration

  // Per-edge min distance to any road segment (no vertical-line filter)
  const minDistToRoad = (mid: CalcProjectedCoordinate) => {                                                            // Helper: min distance from mid to any road segment
    let d = Infinity;                                                                                                  // Running minimum
    for (const [p, q] of roadSegments) {                                                                               // Iterate road segments
      const t = distancePointToSegment(mid, p, q);                                                                     // Distance from midpoint to this segment
      if (t < d) d = t;                                                                                                // Update running minimum
    }                                                                                                                  // End road segment loop
    return d;                                                                                                          // Return smallest distance
  };                                                                                                                   // End minDistToRoad

  const edgeDistances: number[] = [];                                                                                  // Per-edge min road-distance array
  for (let i = 0; i < numEdges; i++) {                                                                                 // Iterate edges
    const a = ring[i],                                                                                                 // Edge start vertex
      b = ring[i + 1];                                                                                                 // Edge end vertex
    const mid: CalcProjectedCoordinate = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];                                       // Midpoint of current edge
    edgeDistances.push(minDistToRoad(mid));                                                                            // Store midpoint distance to road
  }                                                                                                                    // End edge loop

  const dMin = roadSegments.length > 0 ? Math.min(...edgeDistances) : Infinity;                                        // Overall min edge-to-road distance (Infinity if no roads)

  // So that at least the closest edge is front when road is far: threshold >= dMin
  const frontThreshold =                                                                                               // Front threshold computation
    roadSegments.length > 0 ? Math.max(MAX_FRONT_DISTANCE, dMin * FRONT_RELATIVE_FACTOR) : Infinity;                   // Max of absolute cap and relative multiple of dMin (or Infinity)

  for (let i = 0; i < numEdges; i++) {                                                                                 // Iterate edges to classify as front
    const a = ring[i],                                                                                                 // Edge start vertex
      b = ring[i + 1];                                                                                                 // Edge end vertex
    const mid: CalcProjectedCoordinate = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];                                       // Midpoint of current edge

    const onOtherSiteEdge = otherSiteEdges.some(([p, q]) => isPointOnSegment(mid, p, q, ON_EDGE_TOLERANCE));           // Check if midpoint lies on another site edge
    if (onOtherSiteEdge) {                                                                                             // Skip edges shared with neighbour sites
      continue;                                                                                                        // Continue to next edge
    }                                                                                                                  // End shared-edge skip

    const d = edgeDistances[i];                                                                                        // Pull stored edge distance
    const isFront = d <= frontThreshold;                                                                               // Is edge a front edge?

    if (isFront) front.push(i);                                                                                        // Record front index
  }                                                                                                                    // End front classification loop

  for (let i = 0; i < numEdges; i++) {                                                                                 // Second pass: classify remaining edges
    if (front.includes(i)) continue;                                                                                   // Skip edges already marked front
    const nI = (i + 1) % numEdges;                                                                                     // Next edge index (wraps around)
    const pI = i === 0 ? numEdges - 1 : i - 1;                                                                         // Previous edge index (wraps around)
    if (front.includes(nI) || front.includes(pI)) {                                                                    // Side edge: adjacent to at least one front edge
      side.push(i);                                                                                                    // Record as side
      continue;                                                                                                        // Continue to next edge
    }                                                                                                                  // End side branch
    rear.push(i);                                                                                                      // Otherwise, edge is rear
  }                                                                                                                    // End side/rear classification loop

  return { front, rear, side };                                                                                        // Return classified edge sets
};                                                                                                                     // End of getSideIndices

/** Lodash groupBy needs a scalar key; flow `keys` is an array — normalize to a stable string. */
export function groupKeyForFlowInputKeys(feature: StackedSection): string {                                            // Build a stable string key for feature flow input keys
  const keys = feature.properties?.flow?.inputs?.keys;                                                                 // Pull raw keys array from feature properties
  if (Array.isArray(keys)) {                                                                                           // Array branch: sort and stringify for stable key
    return JSON.stringify([...keys].sort());                                                                           // Return stringified sorted keys
  }                                                                                                                    // End array branch
  return String(keys ?? "");                                                                                           // Fallback: coerce scalar or null to string
}                                                                                                                      // End of groupKeyForFlowInputKeys

export function getEnvelopeNodeId() {                                                                                  // Resolve envelope input node id from short list
  return PATTERN_BOOK_SHORT_LIST.nodes[3].id; // 27c92de04d8e432ebbd56d446d881dcc
}                                                                                                                      // End of getEnvelopeNodeId

export function readEnvelopeSetbackParamsFromStorage(): EnvelopeSetbackParams {                                        // Read envelope setback params from localStorage
  if (typeof window === "undefined") return DEFAULT_ENVELOPE_SETBACK_PARAMS;                                           // Return defaults in non-browser environments (SSR)
  try {                                                                                                                // Try parsing stored JSON
    const raw = localStorage.getItem(ENVELOPE_SETBACK_PARAMS_STORAGE_KEY);                                             // Read raw JSON string from localStorage
    if (!raw) return DEFAULT_ENVELOPE_SETBACK_PARAMS;                                                                  // Return defaults if key missing
    const parsed = JSON.parse(raw) as unknown;                                                                         // Parse JSON as unknown
    if (                                                                                                               // Validate parsed payload shape
      parsed &&                                                                                                        // Must be truthy
      typeof parsed === "object" &&                                                                                    // Must be an object
      "front" in parsed &&                                                                                             // Must have front property
      "rear" in parsed &&                                                                                              // Must have rear property
      "side" in parsed &&                                                                                              // Must have side property
      typeof (parsed as { front: unknown }).front === "number" &&                                                      // front must be a number
      typeof (parsed as { rear: unknown }).rear === "number" &&                                                        // rear must be a number
      typeof (parsed as { side: unknown }).side === "number" &&                                                        // side must be a number
      Number.isFinite((parsed as { front: number }).front) &&                                                          // front must be finite
      Number.isFinite((parsed as { rear: number }).rear) &&                                                            // rear must be finite
      Number.isFinite((parsed as { side: number }).side)                                                               // side must be finite
    ) {                                                                                                                // End validation
      return {                                                                                                         // Return normalised params object
        front: (parsed as { front: number }).front,                                                                    // Front setback
        rear: (parsed as { rear: number }).rear,                                                                       // Rear setback
        side: (parsed as { side: number }).side,                                                                       // Side setback
      };                                                                                                               // End return object
    }                                                                                                                  // End validation branch
  } catch {                                                                                                            // Swallow parse/validation errors
    /* ignore corrupt storage */
  }                                                                                                                    // End catch
  return DEFAULT_ENVELOPE_SETBACK_PARAMS;                                                                              // Fallback: return defaults
}                                                                                                                      // End of readEnvelopeSetbackParamsFromStorage

export function persistEnvelopeSetbackParamsToStorage(params: EnvelopeSetbackParams): void {                           // Persist envelope setback params to localStorage
  if (typeof window === "undefined") return;                                                                           // No-op outside the browser
  try {                                                                                                                // Try writing to storage
    localStorage.setItem(ENVELOPE_SETBACK_PARAMS_STORAGE_KEY, JSON.stringify(params));                                 // Serialise and write under well-known key
  } catch {                                                                                                            // Catch storage errors
    /* ignore quota / private mode */
  }                                                                                                                    // End catch
}                                                                                                                      // End of persistEnvelopeSetbackParamsToStorage

/** Chakra NumberInput may pass "" or undefined while editing; avoid NaN and negative values. */
export function parseEnvelopeSetbackMeters(value: string | undefined): number {                                        // Parse setback metres from NumberInput string value
  const s = value == null ? "" : String(value).trim();                                                                 // Coerce null/undefined to empty string and trim
  if (s === "") return 0;                                                                                              // Empty string -> 0
  const n = parseFloat(s);                                                                                             // Parse as float
  if (!Number.isFinite(n)) return 0;                                                                                   // Reject NaN / Infinity -> 0
  return Math.min(ENVELOPE_SETBACK_INPUT_MAX_M, Math.max(0, n));                                                       // Clamp to [0, max] and return
}                                                                                                                      // End of parseEnvelopeSetbackMeters

function isPointInPolygon(coord: GeoCoordinate, polygon: GeoCoordinate[]) {                                            // Ray-casting point-in-polygon test (geographic)
  const [x, y] = coord;                                                                                                // Destructure query x/y
  let inside = false;                                                                                                  // Inside flag toggles on each crossing
  for (let j = 1, i = 0; j < polygon.length; i = j++) {                                                                // Walk polygon edges using i/j indices
    const [xi, yi] = polygon[i]!;                                                                                      // Edge vertex i
    const [xj, yj] = polygon[j]!;                                                                                      // Edge vertex j
    const intersect = yi > y != yj > y && x < (xj - xi) * ((y - yi) / (yj - yi)) + xi;                                 // Test whether ray from (x,y) crosses this edge
    if (intersect) inside = !inside;                                                                                   // Toggle inside flag on crossing
  }                                                                                                                    // End edge loop
  return inside;                                                                                                       // Return whether point is inside
}                                                                                                                      // End of isPointInPolygon

export function getSiteFeatures(siteLayerContents: any, geoProject: proj4.Converter) {                                 // Extract polygon site features from a Giraffe layer
  const siteFeatures: StackedSection[] = [];                                                                           // Accumulator for projected site features
  siteLayerContents.features                                                                                           // Start chained processing on layer features
    .filter((feature: Feature) => feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon")     // Filter to polygon/multipolygon geometries
    .forEach((feature: Feature) => getFeaturesWithProjectedCoordinates(feature, geoProject, 0, siteFeatures));         // Convert each to stacked projected representation
  return siteFeatures;                                                                                                 // Return accumulated site features
}                                                                                                                      // End of getSiteFeatures

export function getRoadFeatures(roadContents: any, geoProject: proj4.Converter) {                                      // Extract road features from a Giraffe road layer
  const roadFeatures: StackedSection[] = [];                                                                           // Accumulator for projected road features
  if (roadContents?.features?.length) {                                                                                // Guard: layer exists and has features
    roadContents.features.forEach((feature: Feature) =>                                                                // Iterate raw road features
      getFeaturesWithProjectedCoordinates(feature, geoProject, 0, roadFeatures),                                       // Project into stacked representation
    );                                                                                                                 // End forEach call
  }                                                                                                                    // End guard
  return roadFeatures;                                                                                                 // Return accumulated road features
}                                                                                                                      // End of getRoadFeatures

export function getSiteFeatureByGeoCoord(                                                                              // Find site containing a given geographic coord
  siteFeatures: StackedSection[],                                                                                      // Param: candidate sites
  geoCoord: GeoCoordinate,                                                                                             // Param: query geographic coord
  geoProject: proj4.Converter,                                                                                         // Param: proj4 converter
) {                                                                                                                    // Begin function body
  const coord = geoProject.forward(geoCoord);                                                                          // Forward-project query point into cartesian

  const polygons = siteFeatures.map((feature) =>                                                                       // Forward-project each site ring into cartesian
    (feature.geometry.coordinates[0] as GeoCoordinate[]).map((coord) => geoProject.forward(coord)),                    // Inner map over ring vertices
  );                                                                                                                   // End polygons map

  const index = polygons.findIndex((polygon) => isPointInPolygon(coord, polygon));                                     // Find first polygon containing the query point

  return index !== -1 ? siteFeatures[index] : null;                                                                    // Return matching site or null
}                                                                                                                      // End of getSiteFeatureByGeoCoord

export function setFlowPropertyOfFeature(                                                                              // Attach pattern book flow DAG input to a site feature
  feature: StackedSection,                                                                                             // Param: target site feature
  params: EnvelopeSetbackParams,                                                                                       // Param: envelope setback params
  indices: { front: number[]; rear: number[]; side?: number[] },                                                       // Param: classified edge indices
  selectedBlockIds: string[],                                                                                          // Param: selected pattern block ids
  instantPointId: string,                                                                                              // Param: instant point id
  rotations: Record<string, number>,                                                                                   // Param: per-block rotation map
  index?: number,                                                                                                      // Param: optional fallback index
) {                                                                                                                    // Begin function body
  const { front, rear, side } = indices;                                                                               // Destructure front/rear/side
  const inputNodeId = getEnvelopeNodeId();                                                                             // Resolve envelope input node id
  feature.properties = {                                                                                               // Overwrite feature properties with flow-aware shape
    id: feature.properties.id                                                                                          // Prefer existing lowercase id
      ? `${feature.properties.id}`                                                                                     // Stringify existing id
      : feature.properties["ID"]                                                                                       // Else prefer uppercase ID
        ? `${feature.properties["ID"]}`                                                                                // Stringify existing ID
        : `site_${index}`,                                                                                             // Else synthesise site_<index>
    address: feature.properties.Address,                                                                               // Copy Address property
    "Height Of Building": feature.properties["Height Of Building"],                                                    // Copy Height Of Building property
    Area: feature.properties["Area"],                                                                                  // Copy Area property
    // TODO: add other native site properties here
    // zone: feature.properties.Landzone,
    flow: {                                                                                                            // Begin flow object
      id: PATTERN_BOOK_SHORT_LIST.id,                                                                                  // Flow DAG identifier
      inputs: {                                                                                                        // Begin flow inputs dictionary
        [inputNodeId]: {                                                                                               // Keyed by envelope input node id
          type: "envelope",                                                                                            // Input type marker: envelope
          parameters: {                                                                                                // Begin envelope parameters
            version: "beta",                                                                                           // Schema version marker (beta)
            maxHeight: 12,                                                                                             // Max building height in metres
            fillEnabled: true,                                                                                         // Enable mass fill of envelope
            sideIndices: {                                                                                             // Begin side index classification
              rear,                                                                                                    // Rear edge indices
              front,                                                                                                   // Front edge indices
              side,                                                                                                    // Side edge indices
              isManual: true,                                                                                          // Flag: manual classification was used
            },                                                                                                         // End side indices
            setbackSteps: {                                                                                            // Begin setback steps block
              rear: [                                                                                                  // Rear steps array begins
                {                                                                                                      // First rear step
                  inset: params.rear,                                                                                  // Rear inset distance (ground)
                  height: 0,                                                                                           // Ground step height
                },                                                                                                     // End first rear step
                {                                                                                                      // Second rear step (above ground)
                  inset: params.rear,                                                                                  // Rear inset distance (above)
                },                                                                                                     // End second rear step
              ],                                                                                                       // End rear steps array
              side: [                                                                                                  // Side steps array begins
                {                                                                                                      // First side step
                  inset: params.side,                                                                                  // Side inset distance (ground)
                  height: 0,                                                                                           // Ground step height
                },                                                                                                     // End first side step
                {                                                                                                      // Second side step (above ground)
                  inset: params.side,                                                                                  // Side inset distance (above)
                },                                                                                                     // End second side step
              ],                                                                                                       // End side steps array
              front: [                                                                                                 // Front steps array begins
                {                                                                                                      // First front step
                  inset: params.front,                                                                                 // Front inset distance (ground)
                  height: 0,                                                                                           // Ground step height
                },                                                                                                     // End first front step
                {                                                                                                      // Second front step (above ground)
                  inset: params.front,                                                                                 // Front inset distance (above)
                },                                                                                                     // End second front step
              ],                                                                                                       // End front steps array
            },                                                                                                         // End setback steps
            hasSetbackOutput: true,                                                                                    // Enable setback output flag
          },                                                                                                           // End envelope parameters
        },                                                                                                             // End envelope input entry
        keys: selectedBlockIds,                                                                                        // Selected block ids
        point: [instantPointId],                                                                                       // Instant point id wrapped in array
        rotation: JSON.stringify(rotations),                                                                           // Rotation map serialised to string
      },                                                                                                               // End inputs object
    },                                                                                                                 // End flow object
  };                                                                                                                   // End properties assignment
}                                                                                                                      // End of setFlowPropertyOfFeature
