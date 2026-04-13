import type {
  ShortlistPatternAnalysisResult,
  PropertyPatternAnalysis,
  PatternPropertyAnalysis,
} from "@/apps/patternBook/types/shortlistAnalysis";
import { csvTableToString, downloadFile, exportToCSV } from "@/utils/export";
import logger from "@/lib/logger";
import { toast } from "react-toastify";

const SERVICE_NAME = "patternBookExportService";

const MAX_INELIGIBLE_REASONS_PER_PROPERTY_ROW = 5;

function isoDateForFilename(): string {
  return new Date().toISOString().split("T")[0] ?? "export";
}

function notifyCsvDownloaded(filename: string, logMessage: string, logMeta: Record<string, unknown>): void {
  toast.success(`Downloaded: ${filename}`);
  logger.info(logMessage, logMeta, SERVICE_NAME);
}

function downloadCsvString(csv: string, filename: string, logMessage: string, logMeta: Record<string, unknown>): void {
  downloadFile(new Blob([csv], { type: "text/csv;charset=utf-8;" }), filename);
  notifyCsvDownloaded(filename, logMessage, logMeta);
}

function runExportToCsv(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
  filename: string,
  logMessage: string,
  logMeta: Record<string, unknown>,
): void {
  exportToCSV(headers, rows, filename);
  notifyCsvDownloaded(filename, logMessage, logMeta);
}

export function exportMatrixToCSV(results: ShortlistPatternAnalysisResult): void {
  const patterns = Object.values(results.patternResults);
  const properties = Object.values(results.propertyResults);

  const headers = ["Property Address", "Site Area (m²)", ...patterns.map((p) => p.patternName), "Eligible Count"];

  const rows = properties.map((property) => {
    const propertyRow = results.eligibilityMatrix.data[property.featureId];
    const eligibleCount = patterns.filter((pattern) => propertyRow?.[pattern.patternId]?.isEligible).length;

    return [
      property.address,
      property.siteArea,
      ...patterns.map((pattern) => {
        const cell = propertyRow?.[pattern.patternId];
        return cell?.isEligible ? "Yes" : "No";
      }),
      eligibleCount,
    ];
  });

  rows.push([
    "Eligible Properties",
    "",
    ...patterns.map(
      (pattern) =>
        properties.filter((property) => {
          const row = results.eligibilityMatrix.data[property.featureId];
          return row?.[pattern.patternId]?.isEligible;
        }).length,
    ),
    "",
  ]);

  runExportToCsv(headers, rows, `pattern-eligibility-matrix-${isoDateForFilename()}.csv`, "Matrix CSV exported", {
    propertyCount: properties.length,
    patternCount: patterns.length,
  });
}

export function exportPropertyResultsToCSV(propertyResults: Record<string, PropertyPatternAnalysis>): void {
  const headers = [
    "Property Address",
    "Feature ID",
    "Site Area (m²)",
    "Eligible Patterns",
    "Total Patterns",
    "Max Dwellings",
    "Max GFA (m²)",
    "Best Pattern",
    "Eligible Pattern Names",
    "Ineligible Reasons",
  ];

  const rows = Object.values(propertyResults).map((property) => {
    const eligibleNames = property.eligiblePatterns.map((p) => p.patternName).join("; ");
    const ineligibleReasons = [...new Set(property.ineligiblePatterns.flatMap((p) => p.ineligibleReasons))]
      .slice(0, MAX_INELIGIBLE_REASONS_PER_PROPERTY_ROW)
      .join("; ");
    const bestPatternName =
      property.eligiblePatterns.length > 0 ? (property.eligiblePatterns[0]?.patternName ?? "") : "";

    return [
      property.address,
      property.featureId,
      property.siteArea,
      property.eligiblePatterns.length,
      property.eligiblePatterns.length + property.ineligiblePatterns.length,
      property.maxDwellings,
      property.maxGfa,
      bestPatternName,
      eligibleNames,
      ineligibleReasons,
    ];
  });

  runExportToCsv(
    headers,
    rows,
    `pattern-property-results-${isoDateForFilename()}.csv`,
    "Property results CSV exported",
    { propertyCount: Object.keys(propertyResults).length },
  );
}

export function exportPatternResultsToCSV(patternResults: Record<string, PatternPropertyAnalysis>): void {
  const headers = [
    "Pattern Name",
    "Pattern ID",
    "Architect",
    "Eligible Properties",
    "Total Properties",
    "Coverage (%)",
    "Total Potential Dwellings",
    "Total Potential GFA (m²)",
    "Eligible Property Addresses",
  ];

  const rows = Object.values(patternResults).map((pattern) => {
    const eligibleAddresses = pattern.eligibleProperties.map((p) => p.address).join("; ");
    const totalProperties = pattern.eligibleProperties.length + pattern.ineligibleProperties.length;
    const totalGfa = pattern.eligibleProperties.reduce((sum, p) => sum + (p.bestVariant?.gfa ?? 0), 0);

    return [
      pattern.patternName,
      pattern.patternId,
      pattern.architect,
      pattern.eligibleProperties.length,
      totalProperties,
      pattern.coveragePercentage.toFixed(1),
      pattern.totalPotentialDwellings,
      totalGfa,
      eligibleAddresses,
    ];
  });

  runExportToCsv(
    headers,
    rows,
    `pattern-analysis-results-${isoDateForFilename()}.csv`,
    "Pattern results CSV exported",
    { patternCount: Object.keys(patternResults).length },
  );
}

export function exportFullAnalysisToCSV(results: ShortlistPatternAnalysisResult): void {
  const sections: string[] = [];

  sections.push("SUMMARY");
  const summaryHeaders = ["Metric", "Value"];
  const summaryRows: (string | number)[][] = [
    [
      "Total Properties",
      results.summary.eligiblePropertyCount +
        results.summary.partiallyEligibleCount +
        results.summary.ineligiblePropertyCount,
    ],
    ["Fully Eligible Properties", results.summary.eligiblePropertyCount],
    ["Partially Eligible Properties", results.summary.partiallyEligibleCount],
    ["Ineligible Properties", results.summary.ineligiblePropertyCount],
    ["Total Potential Dwellings", results.summary.totalPotentialDwellings],
    ["Total Potential GFA (m²)", results.summary.totalPotentialGfa],
  ];
  sections.push(csvTableToString(summaryHeaders, summaryRows), "", "TOP PATTERNS BY COVERAGE");
  const topPatternsHeaders = [
    "Rank",
    "Pattern Name",
    "Architect",
    "Eligible Properties",
    "Total Dwellings",
    "Coverage (%)",
  ];
  const totalProps = results.propertyCount;
  const topPatternsRows = results.summary.topPatterns.map((pattern, index) => {
    const coveragePercentage = totalProps > 0 ? (pattern.eligiblePropertyCount / totalProps) * 100 : 0;
    return [
      index + 1,
      pattern.patternName,
      pattern.architect,
      pattern.eligiblePropertyCount,
      pattern.totalPotentialDwellings,
      coveragePercentage.toFixed(1),
    ];
  });
  sections.push(csvTableToString(topPatternsHeaders, topPatternsRows), "", "COMMON INELIGIBILITY REASONS");
  const ineligibilityHeaders = ["Reason", "Count", "Percentage"];
  const ineligibilityRows = results.summary.commonIneligibilityReasons.map((reason) => [
    reason.reason,
    reason.count,
    reason.percentage.toFixed(1),
  ]);
  sections.push(csvTableToString(ineligibilityHeaders, ineligibilityRows), "", "PROPERTY DETAILS");
  const propertyDetailsHeaders = [
    "Address",
    "Site Area (m²)",
    "Eligible Patterns",
    "Max Dwellings",
    "Max GFA (m²)",
    "Best Pattern",
  ];
  const propertyDetailsRows = Object.values(results.propertyResults).map((property) => {
    const bestPatternName =
      property.eligiblePatterns.length > 0 ? (property.eligiblePatterns[0]?.patternName ?? "") : "";
    return [
      property.address,
      property.siteArea,
      property.eligiblePatterns.length,
      property.maxDwellings,
      property.maxGfa,
      bestPatternName,
    ];
  });
  sections.push(csvTableToString(propertyDetailsHeaders, propertyDetailsRows));

  downloadCsvString(
    sections.join("\n"),
    `pattern-book-full-analysis-${isoDateForFilename()}.csv`,
    "Full analysis CSV exported",
    {
      propertyCount: Object.keys(results.propertyResults).length,
      patternCount: results.patternCount,
    },
  );
}
