import type { Feature, FeatureCollection } from "geojson";
import type proj4 from "proj4";
import { rotateProjectedCoord } from "@/utils/geometry/projectedMath";
import type {
  GeoCoordinate,
  ProjectedCoordinate,
  ProjectedFeature,
  ProjectedLineString,
  ProjectedPoint,
  ProjectedPolygon,
} from "@/apps/patternBook/types/projectedGeometry";

type RawChildFeature = Feature & {
  geometry: { type: string; coordinates: unknown };
  _projected?: unknown;
};

type ProjectedPolygonWithChildren = ProjectedPolygon & {
  _projectedChildren?: ProjectedFeature[];
};

/**
 * Projects a GeoJSON feature from WGS84 coordinates to local projected metres
 * using the supplied proj4 converter, optionally applying a rotation about the
 * origin. The projected coordinates are stored on the feature as `_projected`
 * and the feature is pushed into `calculatedFeatures`.
 *
 * Ported near-verbatim from the standalone pattern-book-app's
 * `getFeaturesWithProjectedCoordinates` (src/utils.ts), with strict typing and
 * helper extraction.
 */
export function projectFeatureIntoList(
  feature: Feature,
  geoProject: proj4.Converter,
  rotationDegrees: number,
  calculatedFeatures: ProjectedFeature[],
): void {
  const rotationRad = (rotationDegrees * Math.PI) / 180;

  switch (feature.geometry.type) {
    case "Polygon": {
      const polygonFeature = projectPolygon(
        feature,
        geoProject,
        rotationRad,
      );
      calculatedFeatures.push(polygonFeature);
      break;
    }
    case "MultiPolygon": {
      const firstRing = (
        feature.geometry.coordinates as number[][][][]
      )[0]?.[0];
      if (!firstRing) break;
      const coords = firstRing.map((c) =>
        geoProject.forward(c as number[]),
      ) as ProjectedCoordinate[];
      const rotated = coords.map((coord) =>
        rotateProjectedCoord(coord, rotationRad),
      );
      calculatedFeatures.push({
        ...feature,
        geometry: {
          type: "Polygon",
          coordinates: (
            feature.geometry.coordinates as number[][][][]
          )[0] as number[][][],
        },
        _projected: [rotated],
      } as ProjectedPolygon);
      break;
    }
    case "LineString": {
      const coords = (feature.geometry.coordinates as number[][]).map(
        (c) => geoProject.forward(c),
      ) as ProjectedCoordinate[];
      const rotated = coords.map((coord) =>
        rotateProjectedCoord(coord, rotationRad),
      );
      calculatedFeatures.push({
        ...feature,
        _projected: rotated,
      } as ProjectedLineString);
      break;
    }
    case "MultiLineString": {
      const coordsArray = (
        feature.geometry.coordinates as number[][][]
      ).map(
        (line) =>
          line.map((c) => geoProject.forward(c)) as ProjectedCoordinate[],
      );
      const rotated = coordsArray.map((coords) =>
        coords.map((coord) => rotateProjectedCoord(coord, rotationRad)),
      );
      calculatedFeatures.push({
        ...feature,
        // Stored as nested array for line-string lists; consumers handle both
        _projected: rotated as unknown as ProjectedCoordinate[],
      } as ProjectedLineString);
      break;
    }
    case "Point": {
      const coord = geoProject.forward(
        feature.geometry.coordinates as number[],
      ) as ProjectedCoordinate;
      const rotated = rotateProjectedCoord(coord, rotationRad);
      calculatedFeatures.push({
        ...feature,
        _projected: rotated,
      } as ProjectedPoint);
      break;
    }
    default:
      break;
  }
}

function projectPolygon(
  feature: Feature,
  geoProject: proj4.Converter,
  rotationRad: number,
): ProjectedPolygonWithChildren {
  const ring = (feature.geometry as { coordinates: number[][][] })
    .coordinates[0];
  const coords = (ring ?? []).map((c) =>
    geoProject.forward(c),
  ) as ProjectedCoordinate[];
  const rotated = coords.map((coord) =>
    rotateProjectedCoord(coord, rotationRad),
  );

  const polygonFeature: ProjectedPolygonWithChildren = {
    ...feature,
    _projected: [rotated],
  } as ProjectedPolygonWithChildren;

  const rawChildren = (feature.properties as Record<string, unknown> | null)
    ?.childFeatures as RawChildFeature[] | undefined;

  if (rawChildren?.length) {
    polygonFeature._projectedChildren = rawChildren.map((child) =>
      projectChildFeature(child, geoProject, rotationRad),
    );
  }

  return polygonFeature;
}

function projectChildFeature(
  child: RawChildFeature,
  geoProject: proj4.Converter,
  rotationRad: number,
): ProjectedFeature {
  if (child.geometry.type === "Polygon") {
    const ring = (child.geometry.coordinates as number[][][])[0] ?? [];
    const coords = ring.map((c) =>
      geoProject.forward(c),
    ) as ProjectedCoordinate[];
    const rotated = coords.map((coord) =>
      rotateProjectedCoord(coord, rotationRad),
    );
    return {
      ...(child as unknown as ProjectedPolygon),
      _projected: [rotated],
    };
  }
  const coords = (child.geometry.coordinates as number[][]).map((c) =>
    geoProject.forward(c),
  ) as ProjectedCoordinate[];
  const rotated = coords.map((coord) =>
    rotateProjectedCoord(coord, rotationRad),
  );
  return {
    ...(child as unknown as ProjectedFeature),
    _projected: rotated as unknown as ProjectedCoordinate[][],
  } as ProjectedFeature;
}

export function calculateFeatureCoordinatesByProjected(
  feature: ProjectedFeature,
  geoProject: proj4.Converter,
): void {
  switch (feature.geometry.type) {
    case "Polygon": {
      const projected = (feature as ProjectedPolygon)._projected[0] ?? [];
      const coords = projected.map((c) =>
        geoProject.inverse(c),
      ) as GeoCoordinate[];
      (feature as ProjectedPolygon).geometry.coordinates = [coords];
      const withChildren = feature as ProjectedPolygonWithChildren;
      if (withChildren._projectedChildren?.length) {
        withChildren._projectedChildren.forEach((child) => {
          calculateFeatureCoordinatesByProjected(child, geoProject);
        });
        (feature.properties as Record<string, unknown>).childFeatures =
          withChildren._projectedChildren;
      }
      break;
    }
    case "LineString": {
      const projected = (feature as ProjectedLineString)
        ._projected as ProjectedCoordinate[];
      const coords = projected.map((c) =>
        geoProject.inverse(c),
      ) as GeoCoordinate[];
      (feature as ProjectedLineString).geometry.coordinates = coords;
      break;
    }
    case "Point": {
      const projected = (feature as ProjectedPoint)
        ._projected as ProjectedCoordinate;
      const coord = geoProject.inverse(projected);
      (feature as ProjectedPoint).geometry.coordinates = coord;
      break;
    }
    default:
      break;
  }
}

export function projectGeoJsonCollection(
  collection: FeatureCollection | { features: Feature[] } | null | undefined,
  geoProject: proj4.Converter,
  predicate?: (feature: Feature) => boolean,
): ProjectedFeature[] {
  if (!collection?.features?.length) return [];
  const projected: ProjectedFeature[] = [];
  for (const feature of collection.features) {
    if (predicate && !predicate(feature)) continue;
    projectFeatureIntoList(feature, geoProject, 0, projected);
  }
  return projected;
}
