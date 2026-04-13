import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type * as GeoJSON from "geojson";
import { loadAllPatternBooks } from "@/apps/patternBook/services/patternBookService";
import { evaluateAllPatterns } from "@/apps/patternBook/utils/patternBookEligibility";
import { fetchCrossfallForGeometry } from "@/apps/patternBook/utils/contourService";
import { queryAircraftNoise } from "@/services/arcgisService";
import logger from "@/lib/logger";
import type { PropertyFeature } from "@/types/geometry";
import type {
  PatternBookSchema,
  PatternEligibilityResult,
  SiteType,
  SiteTypeDiagnostics,
  UsePatternBookEligibilityReturn,
} from "@/apps/patternBook/types/patternBook";
import {
  arePatternEligibilityResultsEqual,
  extractSiteEligibilityData,
  type PatternBookDevelopableArea,
} from "@/apps/patternBook/utils/siteEligibilityExtraction";

export type { PatternBookDevelopableArea } from "@/apps/patternBook/utils/siteEligibilityExtraction";

const HOOK_NAME = "usePatternBookEligibility";

export function usePatternBookEligibility(
  selectedFeature: PropertyFeature | null,
  developableArea: number | PatternBookDevelopableArea | null,
): UsePatternBookEligibilityReturn {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [patterns, setPatterns] = useState<PatternBookSchema[]>([]);
  const [eligibilityResults, setEligibilityResults] = useState<PatternEligibilityResult[]>([]);
  const [crossfallMetres, setCrossfallMetres] = useState<number | null>(null);
  const [isFetchingSpatialLayers, setIsFetchingSpatialLayers] = useState<boolean>(false);
  const [anefValue, setAnefValue] = useState<number | null>(null);
  const [siteWidth, setSiteWidth] = useState<number | null>(null);
  const [siteLength, setSiteLength] = useState<number | null>(null);
  const [siteType, setSiteType] = useState<SiteType | null>(null);
  const [siteTypeDiagnostics, setSiteTypeDiagnostics] = useState<SiteTypeDiagnostics | null>(null);

  const previousResultsRef = useRef<PatternEligibilityResult[] | null>(null);
  const prevResultsLengthRef = useRef<number>(0);
  const isInitialised = useRef<boolean>(false);
  const spatialFetchGenerationRef = useRef<number>(0);

  const spatialGeometryKey = useMemo((): string | null => {
    const g = selectedFeature?.geometry;
    if (!g || (g.type !== "Polygon" && g.type !== "MultiPolygon")) {
      return null;
    }
    return JSON.stringify(g.coordinates);
  }, [selectedFeature?.geometry]);

  useEffect(() => {
    if (isInitialised.current) return;

    const loadPatterns = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        const loadedPatterns = await loadAllPatternBooks();
        setPatterns(loadedPatterns);
        isInitialised.current = true;

        logger.info(
          "Pattern books loaded for eligibility checking",
          {
            count: loadedPatterns.length,
          },
          HOOK_NAME,
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load pattern books";
        setError(errorMessage);
        logger.error("Failed to load pattern books", { error: errorMessage }, HOOK_NAME);
      } finally {
        setIsLoading(false);
      }
    };

    void loadPatterns();
  }, []);

  useEffect(() => {
    if (spatialGeometryKey === null) {
      spatialFetchGenerationRef.current += 1;
      setCrossfallMetres(null);
      setAnefValue(null);
      setIsFetchingSpatialLayers(false);
      return;
    }

    const polygonGeometry = selectedFeature?.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
    const generation = ++spatialFetchGenerationRef.current;
    setIsFetchingSpatialLayers(true);

    void (async (): Promise<void> => {
      try {
        const [crossfallResult, noiseResult] = await Promise.all([
          fetchCrossfallForGeometry(polygonGeometry),
          queryAircraftNoise(polygonGeometry),
        ]);

        if (generation !== spatialFetchGenerationRef.current) {
          return;
        }

        setCrossfallMetres(crossfallResult.crossfallMetres);
        setAnefValue(noiseResult.anefValue);

        if (crossfallResult.error) {
          logger.warn("Contour fetch warning", { error: crossfallResult.error }, HOOK_NAME);
        } else {
          logger.debug(
            "Crossfall data fetched",
            {
              crossfallMetres: crossfallResult.crossfallMetres,
              contourCount: crossfallResult.contourCount,
            },
            HOOK_NAME,
          );
        }

        logger.debug(
          "Aircraft noise data fetched",
          {
            anefValue: noiseResult.anefValue,
            source: noiseResult.source,
          },
          HOOK_NAME,
        );
      } catch (err) {
        if (generation !== spatialFetchGenerationRef.current) {
          return;
        }
        logger.error(
          "Failed to fetch spatial layers (contour / aircraft noise)",
          {
            error: err instanceof Error ? err.message : String(err),
          },
          HOOK_NAME,
        );
        setCrossfallMetres(null);
        setAnefValue(null);
      } finally {
        if (generation === spatialFetchGenerationRef.current) {
          setIsFetchingSpatialLayers(false);
        }
      }
    })();

    return (): void => {
      spatialFetchGenerationRef.current += 1;
    };
  }, [spatialGeometryKey]);

  const evaluateEligibility = useCallback((): void => {
    if (!selectedFeature || patterns.length === 0) {
      if (prevResultsLengthRef.current > 0) {
        setEligibilityResults([]);
        previousResultsRef.current = null;
        prevResultsLengthRef.current = 0;
      }
      setSiteWidth(null);
      setSiteLength(null);
      setSiteType(null);
      setSiteTypeDiagnostics(null);
      return;
    }

    const extracted = extractSiteEligibilityData(selectedFeature, developableArea);

    if (!extracted) {
      setError("Unable to extract site data for eligibility checking");
      setEligibilityResults([]);
      prevResultsLengthRef.current = 0;
      setSiteType(null);
      setSiteTypeDiagnostics(null);
      return;
    }

    const { siteData, siteTypeDiagnostics: extractedDiagnostics } = extracted;

    siteData.crossfallMetres = crossfallMetres;
    siteData.anefValue = anefValue;
    setSiteWidth(siteData.siteWidth);
    setSiteLength(siteData.siteLength);
    setSiteType(siteData.siteType);
    setSiteTypeDiagnostics(extractedDiagnostics);

    logger.info(
      "Site eligibility data extracted",
      {
        siteArea: siteData.siteArea,
        siteWidth: siteData.siteWidth,
        siteLength: siteData.siteLength,
        zoneCode: siteData.zoneCode,
        isInLMRArea: siteData.isInLMRArea,
        lmrCatchmentDistance: siteData.lmrCatchmentDistance,
        isInTODArea: siteData.isInTODArea,
        isBushfireProne: siteData.isBushfireProne,
        isFloodProne: siteData.isFloodProne,
        hasContamination: siteData.hasContamination,
        hasHeritageSignificance: siteData.hasHeritageSignificance,
        siteFsr: siteData.siteFsr,
        siteHob: siteData.siteHob,
        crossfallMetres: siteData.crossfallMetres,
        anefValue: siteData.anefValue,
      },
      HOOK_NAME,
    );

    const results = evaluateAllPatterns(patterns, siteData);

    if (!arePatternEligibilityResultsEqual(previousResultsRef.current, results)) {
      previousResultsRef.current = results;
      setEligibilityResults(results);
      prevResultsLengthRef.current = results.length;
      setError(null);

      logger.debug(
        "Pattern eligibility results updated",
        {
          eligible: results.filter((r) => r.isEligible).length,
          total: results.length,
        },
        HOOK_NAME,
      );
    }
  }, [selectedFeature, developableArea, patterns, crossfallMetres, anefValue]);

  useEffect(() => {
    if (!isLoading && patterns.length > 0 && selectedFeature && !isFetchingSpatialLayers) {
      evaluateEligibility();
    }
  }, [isLoading, patterns, selectedFeature, developableArea, evaluateEligibility, isFetchingSpatialLayers]);

  const hasEligiblePatterns = eligibilityResults.some((r) => r.isEligible);
  const totalMatchingVariants = eligibilityResults.reduce((sum, r) => sum + r.matchingVariants.length, 0);

  return {
    isLoading,
    error,
    eligibilityResults,
    patterns,
    hasEligiblePatterns,
    totalMatchingVariants,
    siteWidth,
    siteLength,
    siteType,
    siteTypeDiagnostics,
  };
}

export default usePatternBookEligibility;
