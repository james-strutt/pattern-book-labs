const FORMULA_INJECTION_PREFIX = /^[=+\-@]/;
const CSV_REQUIRES_QUOTING = /[",\r\n]/;

const MAX_DOWNLOAD_FILENAME_LENGTH = 255;

function sanitiseDownloadFilename(filename: string): string {
  const trimmed = filename.replaceAll("\0", "").trim();
  const base = trimmed.replace(/^.*[/\\]/, "");
  const name = base.length > 0 ? base : "download";
  return name.length > MAX_DOWNLOAD_FILENAME_LENGTH ? name.slice(0, MAX_DOWNLOAD_FILENAME_LENGTH) : name;
}

export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = sanitiseDownloadFilename(filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

type CsvScalar = string | number | boolean | null | undefined;

function escapeCsvCell(value: CsvScalar): string {
  if (value === null || value === undefined) return "";
  let stringValue: string;
  if (typeof value === "string") {
    const needsFormulaTab = value.length > 0 && FORMULA_INJECTION_PREFIX.test(value);
    stringValue = needsFormulaTab ? `\t${value}` : value;
  } else {
    stringValue = String(value);
  }
  if (CSV_REQUIRES_QUOTING.test(stringValue)) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }
  return stringValue;
}

export function csvTableToString(headers: string[], rows: CsvScalar[][]): string {
  const headerLine = headers.map(escapeCsvCell).join(",");
  const dataLines = rows.map((row) => row.map(escapeCsvCell).join(","));
  return [headerLine, ...dataLines].join("\n");
}

export function exportToCSV(headers: string[], rows: CsvScalar[][], filename: string): void {
  const csv = csvTableToString(headers, rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadFile(blob, filename);
}
