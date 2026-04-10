import proj4 from "proj4";
import { SECTION_TYPES, StackedSection } from "./types";

const proj4String = ([longitude, latitude]: number[]) =>
  `+proj=lcc +lat_0=${latitude} +lat_1=${latitude + 0.1} +lat_2=${
    latitude - 0.1
  } +lon_0=${longitude} +units=m +no_defs +ellps=WGS84`;

export const isBuildingSection = (s: StackedSection) =>
  (s.properties?.type === SECTION_TYPES.BUILDING_SECTION || s.properties?.type === SECTION_TYPES.BASEMENT) &&
  !isNaN(Number(s.properties.levels)) &&
  !isNaN(Number(s.properties.floorToFloor));

export const getReferenceGeoProject = (ref: number[]) => proj4(proj4String(ref));
