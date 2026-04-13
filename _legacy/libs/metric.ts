type Dimensions = number | undefined;

export const FEET_PER_METER = 3.280839895013;

const M_PER_FT = 1 / FEET_PER_METER;
const SQFT_PER_SQM = FEET_PER_METER ** 2;
const SQM_PER_SQFT = 1 / SQFT_PER_SQM;

export const fromMetric = (units: "meters" | "feet", dimension: Dimensions) => {
  if (units === "feet") {
    switch (dimension) {
      case 1:
        return FEET_PER_METER;
      case 2:
        return SQFT_PER_SQM;
      case -1:
        return M_PER_FT;
      case -2:
        return SQM_PER_SQFT;
      case undefined:
        return 1;
      default:
        return FEET_PER_METER ** dimension;
    }
  }
  return 1;
};
