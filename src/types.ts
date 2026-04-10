import { Feature, Polygon } from "geojson";

// Site Definition
export type PatternSite = {
  outer?: Feature<Polygon>;
  inner?: Feature<Polygon>;
  height?: number;
};

export enum SortType {
  AREA = "area",
  FSR = "fsr",
  DWELLINGS = "dwellings",
}

export type SortAndFilter = {
  sort?: SortType; // TODO
  filter?: {
    passedLandscape: boolean;
    passedBuilding: boolean;
    patternStyle?: string;
    patternParking?: string;
  };
};
