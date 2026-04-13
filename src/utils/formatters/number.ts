import logger from "@/lib/logger";

type NullableNumericValue = string | number | null | undefined;
type NullableNumber = number | null | undefined;

export function parseNumericString(value: NullableNumericValue): number {
  if (value === null || value === undefined) return Number.NaN;
  if (typeof value === "number") return value;
  return Number(String(value).replaceAll(",", ""));
}

export function parseIntegerString(value: NullableNumericValue): number {
  const num = parseNumericString(value);
  return Number.isNaN(num) ? Number.NaN : Math.floor(num);
}

export interface FormatNumberOptions {
  decimals?: number;
  locale?: string;
  unit?: string;
  useGrouping?: boolean;
  fallback?: string;
}

export function formatNumber(
  value: NullableNumericValue,
  options: FormatNumberOptions = {}
): string {
  const {
    decimals = 0,
    locale = "en-AU",
    unit = "",
    useGrouping = true,
    fallback = "N/A",
  } = options;

  if (value === undefined || value === null) return fallback;

  const numericValue =
    typeof value === "string" ? Number.parseFloat(value) : value;

  if (Number.isNaN(numericValue)) return fallback;

  try {
    if (unit === "m²" || unit === "m") {
      const roundedValue = Math.round(numericValue);
      return roundedValue.toLocaleString(locale, { useGrouping }) + unit;
    }

    if (unit === "%") {
      return numericValue.toFixed(1) + unit;
    }

    const formatted = numericValue.toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping,
    });

    return unit ? formatted + unit : formatted;
  } catch (error) {
    logger.error("Failed to format number value", { error }, "formatNumber");
    const fallbackValue =
      decimals > 0 ? numericValue.toFixed(decimals) : Math.round(numericValue);
    return unit ? fallbackValue.toString() + unit : fallbackValue.toString();
  }
}

export function metric(value: NullableNumericValue): string {
  if (value === undefined || value === null) return "—";
  if (typeof value === "number") return value.toLocaleString();
  return String(value);
}

export function formatValue(value: NullableNumericValue, unit = ""): string {
  return formatNumber(value, { unit, fallback: "—" });
}

export interface FormatPercentageOptions {
  decimals?: number;
  locale?: string;
  fallback?: string;
}

export function formatPercentage(
  value: NullableNumber,
  options: FormatPercentageOptions = {}
): string {
  const { decimals = 0, locale = "en-AU", fallback = "N/A" } = options;

  if (value === undefined || value === null) return fallback;

  try {
    return new Intl.NumberFormat(locale, {
      style: "percent",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  } catch (error) {
    logger.error(
      "Failed to format percentage value",
      { error },
      "formatPercentage"
    );
    return `${(value * 100).toFixed(decimals)}%`;
  }
}

export interface FormatMarginOptions {
  fallback?: string;
}

export function formatMargin(
  margin: NullableNumber,
  options: FormatMarginOptions = {}
): string {
  const { fallback = "N/A" } = options;

  if (margin == null || Number.isNaN(margin)) return fallback;
  return `${(margin * 100).toFixed(1)}%`;
}

export function getOrdinal(num: number): string {
  const lastDigit = num % 10;
  const lastTwoDigits = num % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return num + "th";
  }

  if (lastDigit === 1) return num + "st";
  if (lastDigit === 2) return num + "nd";
  if (lastDigit === 3) return num + "rd";

  return num + "th";
}

export function formatFSR(
  gfa: NullableNumber,
  landArea: NullableNumber
): string {
  if (gfa == null || landArea == null || landArea === 0) return "N/A";
  return `${(gfa / landArea).toFixed(1)}:1`;
}

export interface FormatFSRDirectOptions {
  fallback?: string;
}

export function formatFSRDirect(
  fsr: NullableNumber,
  options: FormatFSRDirectOptions = {}
): string {
  const { fallback = "N/A" } = options;

  if (fsr == null || Number.isNaN(fsr)) return fallback;
  return `${fsr.toFixed(1)}:1`;
}


export interface FormatCompactNumberOptions {
  locale?: string;
  currency?: string;
  maximumFractionDigits?: number;
  includeCurrencySymbol?: boolean;
}

function formatCompactNumberAsCurrency(
  value: NullableNumericValue,
  options: FormatCompactNumberOptions
): string {
  const {
    locale = "en-AU",
    currency = "AUD",
    maximumFractionDigits = 1,
  } = options;

  if (value === undefined || value === null) {
    return "$0";
  }

  const numericValue = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(numericValue)) {
    return "$0";
  }

  try {
    const formatOptions: Intl.NumberFormatOptions = {
      notation: "compact",
      style: "currency",
      currency,
      maximumFractionDigits,
    };

    return new Intl.NumberFormat(locale, formatOptions).format(numericValue);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      "Failed to format compact number",
      { error: errorMessage },
      "formatCompactNumber"
    );
    const formatted = numericValue.toFixed(maximumFractionDigits);
    const symbol = currency === "AUD" ? "$" : "";
    return `${symbol}${formatted}`;
  }
}

function formatCompactNumberAsNumber(
  value: NullableNumericValue,
  options: FormatCompactNumberOptions
): string {
  const { locale = "en-AU", maximumFractionDigits = 1 } = options;

  if (value === undefined || value === null) {
    return "0";
  }

  const numericValue = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(numericValue)) {
    return "0";
  }

  try {
    const formatOptions: Intl.NumberFormatOptions = {
      notation: "compact",
      maximumFractionDigits,
    };

    return new Intl.NumberFormat(locale, formatOptions).format(numericValue);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      "Failed to format compact number",
      { error: errorMessage },
      "formatCompactNumber"
    );
    return numericValue.toFixed(maximumFractionDigits);
  }
}

function formatCompactNumberImpl(
  value: NullableNumericValue,
  options: FormatCompactNumberOptions = {}
): string {
  if (options.includeCurrencySymbol === true) {
    return formatCompactNumberAsCurrency(value, options);
  }
  return formatCompactNumberAsNumber(value, options);
}

export function formatCompactNumber(
  value: NullableNumericValue,
  includeCurrencySymbolOrOptions?: boolean | FormatCompactNumberOptions,
  options?: FormatCompactNumberOptions
): string {
  if (typeof includeCurrencySymbolOrOptions === "boolean") {
    return formatCompactNumberImpl(value, {
      ...options,
      includeCurrencySymbol: includeCurrencySymbolOrOptions,
    });
  }
  return formatCompactNumberImpl(
    value,
    includeCurrencySymbolOrOptions ?? options
  );
}

