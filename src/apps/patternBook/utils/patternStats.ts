const sum = (arr: number[]): number => arr.reduce((a, b) => a + b, 0);
import { CLIPPER_SCALE, clipperUnion, polyToClipper, projectedToClipper } from "@/utils/geometry/projectedClipper";
import { getProjectedBoundary, isBuildingSection } from "@/apps/patternBook/utils/polygonHelpers";
import type { PatternStats, ProjectedFeature, ProjectedPolygon } from "@/apps/patternBook/types/projectedGeometry";
import logger from "@/lib/logger";

const UTILITY_NAME = "PatternStats";
const DEFAULT_SITE_AREA = 10000;

interface SiteReference {
  outer?: ProjectedPolygon;
}

/**
 * Derives pattern-level statistics (fsr, area, footprint, dwellings, width,
 * depth) from the evaluated features of a Giraffe block.
 *
 * Ported from the standalone pattern-book-app's `getPatternStats`
 * (src/utils.ts). Used during bootstrap to populate `patternStatsByBlockId`
 * for the geometric prefilter.
 */
export function getPatternStats(
  features: ProjectedFeature[],
  site?: SiteReference,
): Omit<PatternStats, "minSiteWidth" | "minSiteDepth" | "minSiteArea" | "maxHeight"> {
  const buildingSections = features.filter(
    (feature) => feature.geometry.type === "Polygon" && isBuildingSection(feature),
  );

  const netAreaTotal = sum(
    buildingSections.map((feature) => {
      const props = feature.properties;
      return typeof props.netArea === "number" ? props.netArea : 0;
    }),
  );

  const firstFeature = features[0];
  const firstProps = firstFeature?.properties as Record<string, unknown> | undefined;
  const parkingProvided = firstProps?.patternParkingProvided;
  const patternStyle = firstProps?.patternStyle;

  const siteOuter = site?.outer;
  const siteCoord = siteOuter ? siteOuter._projected[0]?.map(projectedToClipper) : undefined;
  const siteArea = siteCoord
    ? (() => {
        try {
          return (
            Math.abs((globalThis as { clipper?: { area: (p: unknown) => number } }).clipper?.area(siteCoord) ?? 0) /
            (CLIPPER_SCALE * CLIPPER_SCALE)
          );
        } catch {
          return DEFAULT_SITE_AREA;
        }
      })()
    : DEFAULT_SITE_AREA;

  const polygonFeatures = features.filter((feature) => feature.geometry.type === "Polygon");
  const boundary = getProjectedBoundary(polygonFeatures);

  let width = 0;
  let depth = 0;
  if (boundary.length > 0) {
    const minX = Math.min(...boundary.map((coord) => coord[0]));
    const minY = Math.min(...boundary.map((coord) => coord[1]));
    const maxX = Math.max(...boundary.map((coord) => coord[0]));
    const maxY = Math.max(...boundary.map((coord) => coord[1]));
    width = maxX - minX;
    depth = maxY - minY;
  }

  const dwellings = buildingSections.reduce((total, section) => {
    const props = section.properties;
    const dwellingCount = props.dwellingCount as Array<{ value?: number }> | undefined;
    if (dwellingCount) {
      return total + sum(dwellingCount.map((entry) => entry.value ?? 0));
    }
    return total;
  }, 0);

  let footPrintArea = 0;
  const buildingPolygons = buildingSections.flatMap((section) => polyToClipper(section as ProjectedPolygon));

  try {
    const clipperGlobal = (
      globalThis as {
        clipper?: {
          cleanPolygon: (path: unknown, distance: number) => unknown[];
          area: (path: unknown) => number;
        };
      }
    ).clipper;

    if (clipperGlobal) {
      const cleaned = buildingPolygons
        .map((path) => clipperGlobal.cleanPolygon(path, CLIPPER_SCALE * 0.1))
        .filter((path) => Array.isArray(path) && path.length > 2 && Math.abs(clipperGlobal.area(path)) > 0);
      const footprint = clipperUnion(cleaned as never[]);
      footPrintArea =
        Math.abs(sum(footprint.map((path) => clipperGlobal.area(path)))) / (CLIPPER_SCALE * CLIPPER_SCALE);
    }
  } catch (error) {
    logger.warn(
      "Footprint area calculation failed",
      { error: error instanceof Error ? error.message : String(error) },
      UTILITY_NAME,
    );
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
  };
}
