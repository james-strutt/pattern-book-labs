export const STREET_TYPES = [
  "street",
  "st",
  "road",
  "rd",
  "avenue",
  "ave",
  "av",
  "drive",
  "dr",
  "parade",
  "pde",
  "lane",
  "ln",
  "way",
  "close",
  "cl",
  "circuit",
  "cct",
  "crescent",
  "cres",
  "cr",
  "court",
  "ct",
  "place",
  "pl",
  "boulevard",
  "blvd",
  "highway",
  "hwy",
  "terrace",
  "tce",
  "grove",
  "gr",
  "square",
  "sq",
  "parkway",
  "pwy",
  "esplanade",
  "esp",
  "walk",
  "rise",
  "trail",
  "trl",
  "loop",
  "alley",
  "view",
  "ridge",
  "mews",
  "plaza",
  "promenade",
  "prom",
  "quay",
  "gardens",
  "gdns",
  "track",
  "trk",
  "bypass",
  "circle",
  "concourse",
  "glade",
  "green",
  "mall",
] as const;

export const AUSTRALIAN_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"] as const;

export const AUSTRALIAN_STATE_FULL_NAMES: Record<string, string> = {
  "NEW SOUTH WALES": "NSW",
  VICTORIA: "VIC",
  QUEENSLAND: "QLD",
  "SOUTH AUSTRALIA": "SA",
  "WESTERN AUSTRALIA": "WA",
  TASMANIA: "TAS",
  "NORTHERN TERRITORY": "NT",
  "AUSTRALIAN CAPITAL TERRITORY": "ACT",
};

export const COUNTRY_SUFFIXES = ["AUS", "AUSTRALIA"] as const;

export const STREET_TYPE_ABBREVIATIONS = {
  ST: "STREET",
  RD: "ROAD",
  AVE: "AVENUE",
  DR: "DRIVE",
  PDE: "PARADE",
  LN: "LANE",
  CL: "CLOSE",
  CCT: "CIRCUIT",
  CRES: "CRESCENT",
  CT: "COURT",
  PL: "PLACE",
  BLVD: "BOULEVARD",
  AV: "AVENUE",
  HWY: "HIGHWAY",
  TCE: "TERRACE",
  GR: "GROVE",
  CR: "CRESCENT",
  SQ: "SQUARE",
  PWY: "PARKWAY",
  ESP: "ESPLANADE",
  TRL: "TRAIL",
  TRK: "TRACK",
  GDNS: "GARDENS",
  PROM: "PROMENADE",
} as const;

export const STREET_TYPES_FOR_PARSING = STREET_TYPES.map((t) => t.toUpperCase()) as readonly string[];

export const POSTCODE_PATTERN = /^\d{4}$/;

const STATE_POSTCODE_ALTERNATIVES = [...Object.keys(AUSTRALIAN_STATE_FULL_NAMES), ...AUSTRALIAN_STATES].join("|");

export const STATE_POSTCODE_PATTERN = new RegExp(
  String.raw`\s+(?:${STATE_POSTCODE_ALTERNATIVES})\s*,?\s*\d{4}.*$`,
  "i",
);

export const ADDRESS_COLUMN_VARIANTS = [
  "address",
  "addr",
  "full_address",
  "full address",
  "street_address",
  "street address",
] as const;

export type StreetType = (typeof STREET_TYPES)[number];

export type AustralianState = (typeof AUSTRALIAN_STATES)[number];

export type StreetTypeAbbreviation = keyof typeof STREET_TYPE_ABBREVIATIONS;

export type StreetTypeForParsing = (typeof STREET_TYPES_FOR_PARSING)[number];

export type AddressColumnVariant = (typeof ADDRESS_COLUMN_VARIANTS)[number];
