import proj4 from "proj4";

export function createLocalProjection(
  reference: number[],
): proj4.Converter {
  const longitude = reference[0] ?? 0;
  const latitude = reference[1] ?? 0;
  const projString =
    `+proj=lcc +lat_0=${latitude} +lat_1=${latitude + 0.1} +lat_2=${
      latitude - 0.1
    } +lon_0=${longitude} +units=m +no_defs +ellps=WGS84`;
  return proj4(projString);
}
