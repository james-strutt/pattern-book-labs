import { AUSTRALIAN_STATES, POSTCODE_PATTERN, STREET_TYPES } from "@/constants/address";

const STREET_TYPE_SET = new Set<string>(STREET_TYPES);

const UNIT_PREFIX_PATTERN = /^UNIT\s+\S+\s+(.*)$/i;
const LEADING_STREET_NUMBER_PATTERN = /^(\d+)[A-Za-z]?(?:\s*[-/]\s*\d+[A-Za-z]?)?\s+(.*)$/;

const ADDRESS_ACRONYMS = new Set([
  "RAAF",
  "HMAS",
  "TAFE",
  "CSIRO",
  "RSL",
  "RMS",
  "CBD",
  "UNSW",
  "UTS",
  "ANU",
  "USQ",
  "UNE",
  "ACU",
  "SCU",
  "ANZAC",
  "SES",
  "RFS",
  "CFA",
  "EPA",
  "RTA",
  "YMCA",
  "YWCA",
  "RSA",
  "RPA",
  "RPAH",
]);

const LOWERCASE_TITLE_WORDS = new Set(["and", "of", "the", "to", "at", "in", "on", "for"]);

function isStreetTypeToken(token: string | undefined): boolean {
  return Boolean(token && STREET_TYPE_SET.has(token.toLowerCase()));
}

export interface ParsedAddress {
  streetName: string;
  houseNumber: number;
}

export function parseAddressForSorting(address: string | null | undefined): ParsedAddress {
  if (!address || typeof address !== "string") {
    return { streetName: "", houseNumber: Number.POSITIVE_INFINITY };
  }

  let trimmed = address.trim();

  const unitMatch = UNIT_PREFIX_PATTERN.exec(trimmed);
  if (unitMatch?.[1]) {
    trimmed = unitMatch[1].trim();
  }

  const match = LEADING_STREET_NUMBER_PATTERN.exec(trimmed);

  if (!match?.[1] || !match?.[2]) {
    return {
      streetName: trimmed.toUpperCase(),
      houseNumber: Number.POSITIVE_INFINITY,
    };
  }

  const houseNumber = Number.parseInt(match[1], 10);
  const streetName = match[2].trim().toUpperCase();

  return {
    streetName,
    houseNumber: Number.isNaN(houseNumber) ? Number.POSITIVE_INFINITY : houseNumber,
  };
}

export function toTitleCase(str: string | null | undefined): string {
  if (!str || typeof str !== "string") return str ?? "";

  const uppercaseWords = new Set<string>([...AUSTRALIAN_STATES, "PO", "GPO", ...ADDRESS_ACRONYMS]);

  const originalWords = str.split(" ");
  const allWordsUppercase = originalWords.every((w) => !w || /^\d/.test(w) || w === w.toUpperCase());
  if (!allWordsUppercase) {
    for (const word of originalWords) {
      if (word.length >= 2 && word === word.toUpperCase() && /^[A-Z]+$/.test(word)) {
        uppercaseWords.add(word);
      }
    }
  }

  return str
    .toLowerCase()
    .split(" ")
    .map((word, index) => {
      if (!word) return word;

      if (/^\d{4}$/.test(word)) return word;

      if (uppercaseWords.has(word.toUpperCase())) {
        return word.toUpperCase();
      }

      if (index > 0 && LOWERCASE_TITLE_WORDS.has(word.toLowerCase())) {
        return word.toLowerCase();
      }

      if (word.includes("'")) {
        return word
          .split("'")
          .map((part, partIndex) => {
            if (partIndex === 0 || part.length > 1) {
              return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
            }
            return part.toLowerCase();
          })
          .join("'");
      }

      if (word.includes("-")) {
        return word
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join("-");
      }

      if (word.includes(".")) {
        const parts = word.split(".");
        const mainPart = parts[0];
        if (!mainPart) return word;
        const suffix = parts.slice(1).join(".");
        return mainPart.charAt(0).toUpperCase() + mainPart.slice(1).toLowerCase() + (suffix ? `.${suffix}` : "");
      }

      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

interface AddressPart {
  hasNumber: boolean;
  streetNumber: number | null;
  streetName: string;
  suburb: string;
  postcode: string;
}

interface ProcessedAddress {
  streetNumbers?: string;
  streetName?: string;
  suburb: string;
  postcode: string;
  formattedAddress: string;
}

export function formatAddresses(addresses: string[] | null | undefined): string {
  if (!addresses || addresses.length === 0) return "";
  if (addresses.length === 1) return toTitleCase(addresses[0]);

  const addressParts: AddressPart[] = addresses.map((addr) => {
    const parts = addr.split(" ");
    const postcode = parts.at(-1) ?? "";

    let streetEnd = 0;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (isStreetTypeToken(part)) {
        streetEnd = i;
        break;
      }
    }

    const suburb = parts.slice(streetEnd + 1, -1).join(" ");
    const streetParts = parts.slice(0, streetEnd + 1);

    const hasNumber = /^\d+$/.test(streetParts[0] ?? "");

    return {
      hasNumber,
      streetNumber: hasNumber ? Number.parseInt(streetParts[0] ?? "0", 10) : null,
      streetName: hasNumber ? streetParts.slice(1).join(" ") : streetParts.join(" "),
      suburb,
      postcode,
    };
  });

  const withNumbers = addressParts.filter((part) => part.hasNumber);
  const withoutNumbers = addressParts.filter((part) => !part.hasNumber);

  const groupedAddresses = withNumbers.reduce(
    (acc, curr) => {
      const key = `${curr.streetName}|${curr.suburb}|${curr.postcode}`;
      const group = acc[key];
      if (group) {
        group.push(curr);
      } else {
        acc[key] = [curr];
      }
      return acc;
    },
    {} as Record<string, AddressPart[]>,
  );

  const processedGroups: ProcessedAddress[] = Object.entries(groupedAddresses).map(([key, group]) => {
    const [streetName, suburb, postcode] = key.split("|");

    if (!streetName || !suburb || !postcode || group.length === 0) {
      return {
        suburb: suburb ?? "",
        postcode: postcode ?? "",
        formattedAddress: "",
      };
    }

    group.sort((a, b) => (a.streetNumber ?? 0) - (b.streetNumber ?? 0));

    const ranges: AddressPart[][] = [];
    const firstItem = group[0];
    if (!firstItem) {
      return {
        suburb: toTitleCase(suburb),
        postcode,
        formattedAddress: "",
      };
    }
    let range: AddressPart[] = [firstItem];

    for (let i = 1; i < group.length; i++) {
      const prevItem = group[i - 1];
      const currItem = group[i];
      if (!prevItem || !currItem) continue;
      const prev = prevItem.streetNumber ?? 0;
      const curr = currItem.streetNumber ?? 0;
      const diff = curr - prev;
      if (diff === 1 || (diff === 2 && curr % 2 === prev % 2)) {
        range.push(currItem);
      } else {
        ranges.push(range);
        range = [currItem];
      }
    }
    ranges.push(range);

    const formattedRanges = ranges.map((r) => {
      const first = r[0];
      if (!first) return "";
      if (r.length === 1) {
        return first.streetNumber?.toString() ?? "";
      }

      const last = r.at(-1);
      return `${first.streetNumber}-${last?.streetNumber ?? ""}`;
    });

    return {
      streetNumbers: formattedRanges.join(", "),
      streetName: toTitleCase(streetName),
      suburb: toTitleCase(suburb),
      postcode,
      formattedAddress: `${formattedRanges.join(", ")} ${toTitleCase(streetName)}`,
    };
  });

  const unnumberedAddresses: ProcessedAddress[] = withoutNumbers.map((addr) => ({
    formattedAddress: toTitleCase(addr.streetName),
    suburb: toTitleCase(addr.suburb),
    postcode: addr.postcode,
  }));

  const allProcessedAddresses = [...processedGroups, ...unnumberedAddresses];

  if (allProcessedAddresses.length === 0) {
    return "";
  }

  const firstAddr = allProcessedAddresses[0];
  if (!firstAddr) {
    return "";
  }

  const allSameLocation = allProcessedAddresses.every(
    (addr) => addr.suburb === firstAddr.suburb && addr.postcode === firstAddr.postcode,
  );

  if (allSameLocation) {
    const streetAddresses = allProcessedAddresses.map((addr) => addr.formattedAddress).join(" and ");
    return `${streetAddresses}, ${firstAddr.suburb} ${firstAddr.postcode}`;
  }

  return allProcessedAddresses.map((addr) => `${addr.formattedAddress}, ${addr.suburb} ${addr.postcode}`).join(" and ");
}

export interface FormatSingleAddressOptions {
  fallback?: string;
}

export function formatSingleAddress(
  address: string | null | undefined,
  options: FormatSingleAddressOptions = {},
): string {
  const { fallback } = options;

  if (!address || typeof address !== "string") {
    return fallback ?? address ?? "";
  }

  try {
    return toTitleCase(address);
  } catch {
    return fallback ?? address;
  }
}

export function fixArticleUsage(text: string | null | undefined): string {
  if (!text || typeof text !== "string") return text ?? "";

  return text.replaceAll(/\ba ([aeiouAEIOU])/g, "an $1");
}

function createAddressLines(line1Tokens: string[], line2Tokens: string[], originalAddress: string): string[] {
  if (line1Tokens.length === 0 || line2Tokens.length === 0) {
    return [originalAddress];
  }
  return [line1Tokens.join(" "), line2Tokens.join(" ")];
}

function splitByStreetType(tokens: string[], originalAddress: string): string[] | null {
  const matchPositions: number[] = [];
  for (let i = 1; i < tokens.length - 1; i++) {
    const token = tokens[i];
    if (isStreetTypeToken(token)) {
      matchPositions.push(i);
    }
  }

  if (matchPositions.length === 0) return null;

  const head = matchPositions[0];
  if (head === undefined) {
    return null;
  }

  let splitIndex: number;
  if (matchPositions.length === 1) {
    splitIndex = head;
  } else if (head === 1) {
    splitIndex = matchPositions[1] ?? head;
  } else {
    splitIndex = head;
  }

  const line1Tokens = tokens.slice(0, splitIndex + 1);
  const line2Tokens = tokens.slice(splitIndex + 1);
  return createAddressLines(line1Tokens, line2Tokens, originalAddress);
}

export function splitAddressIntoLines(address: string | null | undefined): string[] {
  if (!address || typeof address !== "string") return [address ?? ""];

  if (address.includes(",")) {
    const parts = address.split(",");
    if (parts.length < 2) return [address];
    const line1 = parts[0]?.trim();
    const line2 = parts.slice(1).join(",").trim();
    if (!line1 || !line2) return [address];
    return [line1, line2];
  }

  const tokens = address.trim().split(/\s+/);
  if (tokens.length < 3) return [address];

  const last = tokens.at(-1);
  if (!last || !POSTCODE_PATTERN.test(last)) {
    return [address];
  }

  const streetTypeSplit = splitByStreetType(tokens, address);
  if (streetTypeSplit) {
    return streetTypeSplit;
  }

  if (tokens.length >= 4) {
    const line2Tokens = tokens.slice(-3);
    const line1Tokens = tokens.slice(0, -3);
    const result = createAddressLines(line1Tokens, line2Tokens, address);
    if (result[0] !== address) {
      return result;
    }
  }

  const line2Tokens = tokens.slice(-2);
  const line1Tokens = tokens.slice(0, -2);
  return createAddressLines(line1Tokens, line2Tokens, address);
}
