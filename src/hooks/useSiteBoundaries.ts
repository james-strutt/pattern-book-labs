import logger from "@/lib/logger";
import { getSiteBoundaries } from "@/utils/siteBoundaryUtils";
import { giraffeState } from "@gi-nx/iframe-sdk";
import { useCallback, useEffect, useState } from "react";

type SiteBoundaryFeature = ReturnType<typeof getSiteBoundaries>[number];
type GetSiteBoundariesParams = Parameters<typeof getSiteBoundaries>;

interface UseSiteBoundariesReturn {
  siteBoundaries: SiteBoundaryFeature[];
  isLoading: boolean;
  refreshSiteBoundaries: () => void;
}

export const useSiteBoundaries = (
  filterType: GetSiteBoundariesParams[0] = "usage",
  includeDeduplication: GetSiteBoundariesParams[1] = false,
  format: GetSiteBoundariesParams[2] = "standard",
): UseSiteBoundariesReturn => {
  const [siteBoundaries, setSiteBoundaries] = useState<SiteBoundaryFeature[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSiteBoundaries = useCallback((): void => {
    setIsLoading(true);
    try {
      setSiteBoundaries(getSiteBoundaries(filterType, includeDeduplication, format));
    } catch (error) {
      logger.error("Error refreshing site boundaries", { error }, "useSiteBoundaries");
      setSiteBoundaries([]);
    } finally {
      setIsLoading(false);
    }
  }, [filterType, includeDeduplication, format]);

  useEffect(() => {
    refreshSiteBoundaries();

    const listenerKey = giraffeState.addListener(["rawSections"], refreshSiteBoundaries);

    return (): void => {
      giraffeState.removeListener(listenerKey);
    };
  }, [refreshSiteBoundaries]);

  return {
    siteBoundaries,
    isLoading,
    refreshSiteBoundaries,
  };
};
