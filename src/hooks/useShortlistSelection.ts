import { FEATURE_PROP, getOptionalProp, getProp } from "@/constants/featureProps";
import logger from "@/lib/logger";
import { removePropertyBoundaryLayer } from "@/services/propertyBoundaryService";
import { parseAddressForSorting } from "@/utils/formatters/address";
import { giraffeState, rpc } from "@gi-nx/iframe-sdk";
import type * as GeoJSON from "geojson";
import { useEffect, useRef, useState } from "react";

interface Shortlist {
  id: string;
  name: string;
  projectLayer: boolean;
  layer_full: unknown;
}

export interface ShortlistFeature {
  type: "Feature" | "shortlist";
  geometry: GeoJSON.Geometry;
  properties: GeoJSON.GeoJsonProperties;
  id?: string | number;
  address: string;
}

interface LayerContents {
  features?: GeoJSON.Feature[];
}

interface UseShortlistSelectionReturn {
  shortlists: Shortlist[];
  selectedShortlist: Shortlist | null;
  shortlistFeatures: ShortlistFeature[];
  isLoadingShortlists: boolean;
  isLoadingFeatures: boolean;
  error: string | null;
  selectShortlist: (shortlist: Shortlist | null) => Promise<void>;
  fetchShortlists: () => Promise<void>;
}

export const useShortlistSelection = (): UseShortlistSelectionReturn => {
  const [shortlists, setShortlists] = useState<Shortlist[]>([]);
  const [selectedShortlist, setSelectedShortlist] = useState<Shortlist | null>(null);
  const [shortlistFeatures, setShortlistFeatures] = useState<ShortlistFeature[]>([]);
  const [isLoadingShortlists, setIsLoadingShortlists] = useState<boolean>(false);
  const [isLoadingFeatures, setIsLoadingFeatures] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const featuresFetchGenerationRef = useRef(0);

  const fetchShortlists = async (): Promise<void> => {
    setIsLoadingShortlists(true);
    setError(null);

    try {
      const projectLayers = giraffeState.get("projectLayers") as unknown;

      if (!projectLayers || !Array.isArray(projectLayers)) {
        setShortlists([]);
        return;
      }

      const shortlistLayers = (projectLayers as Array<{ layer_full?: { name?: string } }>)
        .filter((layer) => layer.layer_full?.name?.startsWith("Shortlist"))
        .map((layer) => ({
          id: layer.layer_full?.name ?? "",
          name: layer.layer_full?.name ?? "",
          projectLayer: true,
          layer_full: layer.layer_full,
        }));

      shortlistLayers.sort((a, b) => a.name.localeCompare(b.name));
      setShortlists(shortlistLayers);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      logger.error("Failed to fetch shortlists", { error: errorMessage }, "useShortlistSelection.fetchShortlists");
      setError("Failed to load shortlists");
      setShortlists([]);
    } finally {
      setIsLoadingShortlists(false);
    }
  };

  const fetchShortlistFeatures = async (shortlistName: string): Promise<void> => {
    if (!shortlistName) {
      featuresFetchGenerationRef.current += 1;
      setShortlistFeatures([]);
      setIsLoadingFeatures(false);
      return;
    }

    const generation = (featuresFetchGenerationRef.current += 1);

    setIsLoadingFeatures(true);
    setError(null);

    try {
      const layerContents = (await rpc.invoke("getLayerContents", [shortlistName])) as LayerContents;

      if (generation !== featuresFetchGenerationRef.current) {
        return;
      }

      if (layerContents?.features) {
        const processedFeatures = layerContents.features.map((feature): ShortlistFeature => {
          const featureWithProps = feature as GeoJSON.Feature & {
            properties: Record<string, unknown>;
            [key: string]: unknown;
          };
          const address =
            getProp(featureWithProps, FEATURE_PROP.PROPERTY.ADDRESS) ??
            getProp(featureWithProps, FEATURE_PROP.PROPERTY.SITE_NAME) ??
            getOptionalProp(featureWithProps, FEATURE_PROP.PROPERTY.NAME) ??
            getOptionalProp(featureWithProps, FEATURE_PROP.LAYER_ID) ??
            "Unnamed Property";

          return {
            ...feature,
            type: "Feature",
            id: feature.id ?? getOptionalProp(featureWithProps, FEATURE_PROP.ID) ?? crypto.randomUUID(),
            address,
          } as ShortlistFeature;
        });

        processedFeatures.sort((a, b) => {
          const aParsed = parseAddressForSorting(a.address);
          const bParsed = parseAddressForSorting(b.address);

          if (aParsed.streetName < bParsed.streetName) return -1;
          if (aParsed.streetName > bParsed.streetName) return 1;

          return aParsed.houseNumber - bParsed.houseNumber;
        });

        if (generation !== featuresFetchGenerationRef.current) {
          return;
        }

        setShortlistFeatures(processedFeatures);
      } else {
        if (generation !== featuresFetchGenerationRef.current) {
          return;
        }
        setShortlistFeatures([]);
      }
    } catch (err) {
      if (generation !== featuresFetchGenerationRef.current) {
        return;
      }
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      logger.error(
        "Failed to fetch shortlist features",
        { error: errorMessage, shortlistName },
        "useShortlistSelection.fetchShortlistFeatures",
      );
      setError(`Failed to load features for "${shortlistName}"`);
      setShortlistFeatures([]);
    } finally {
      if (generation === featuresFetchGenerationRef.current) {
        setIsLoadingFeatures(false);
      }
    }
  };

  const selectShortlist = async (shortlist: Shortlist | null): Promise<void> => {
    await removePropertyBoundaryLayer();

    setSelectedShortlist(shortlist);
    if (shortlist) {
      await fetchShortlistFeatures(shortlist.name);
    } else {
      featuresFetchGenerationRef.current += 1;
      setShortlistFeatures([]);
      setIsLoadingFeatures(false);
    }
  };

  useEffect(() => {
    fetchShortlists();

    const listenerKey = giraffeState.addListener(["projectLayers"], () => {
      fetchShortlists();
    });

    return (): void => {
      giraffeState.removeListener(listenerKey);
      removePropertyBoundaryLayer();
    };
  }, []);

  return {
    shortlists,
    selectedShortlist,
    shortlistFeatures,
    isLoadingShortlists,
    isLoadingFeatures,
    error,
    selectShortlist,
    fetchShortlists,
  };
};
