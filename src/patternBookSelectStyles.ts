import type { CSSObjectWithLabel } from "react-select";

/** Shared react-select control styles for Pattern Book panels. */
export const patternBookSelectSingleLine = {
  control: (base: CSSObjectWithLabel) => ({
    ...base,
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "12px",
    minHeight: "30px",
    height: "30px",
    ".select__value-container": {
      padding: "0 10px",
    },
    ".select__indicators": {
      height: "28px",
      ".select__indicator-separator": {
        display: "none",
      },
    },
    ".select__menu": {
      fontSize: "12px",
    },
  }),
};

export const patternBookSelectMultiLine = {
  control: (base: CSSObjectWithLabel) => ({
    ...base,
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "12px",
    minHeight: "30px",
    maxHeight: "200px",
    overflowY: "auto" as const,
    ".select__value-container": {
      padding: "0 10px",
    },
    ".select__indicators": {
      height: "28px",
      ".select__indicator-separator": {
        display: "none",
      },
    },
    ".select__menu": {
      fontSize: "12px",
    },
  }),
};
