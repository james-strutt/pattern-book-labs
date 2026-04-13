import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import type { PropertyFeature } from "@/types/geometry";
import { getDevelopableAreaDisplayName } from "@/utils/siteBoundaryUtils";
import { isNonNullObject } from "@/utils/typeGuards";

const DEFAULT_MAX_SELECTIONS = 10;

export interface SelectedItem {
  id: string;
  type: "property" | "shortlist" | "developable" | "";
}

export interface SelectedPropertyInfo {
  address: string;
  source: string;
  type: "shortlist" | "property" | "developable";
}

interface LayerLabels {
  SITE_BOUNDARY: string;
  DEVELOPABLE_AREA: string;
}

interface UsePropertySelectorStateProps {
  multiSelect?: boolean;
  maxSelections?: number;
  autoCollapseOnSelection?: boolean;
  defaultCollapsed?: boolean;
  onMultiSelect?: (features: PropertyFeature[]) => void;
  mapItemToFeature: (item: SelectedItem) => PropertyFeature | null;
}

interface UsePropertySelectorStateReturn {
  selectedItem: SelectedItem;
  selectedItems: SelectedItem[];
  selectionError: string | null;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  setSelectionError: (error: string | null) => void;
  isItemSelected: (id: string, type: SelectedItem["type"]) => boolean;
  handleMultiSelectToggle: (layerId: string, layerType: SelectedItem["type"]) => void;
  selectItem: (id: string, type: SelectedItem["type"]) => void;
  getSelectedPropertyInfo: (
    propertyLayers: unknown[],
    developableLayers: unknown[],
    filteredShortlistFeatures: unknown[],
    getShortlistName: () => string,
    getPropertyAddress: (feature: unknown) => string,
    LAYER_LABELS: LayerLabels,
  ) => SelectedPropertyInfo | null;
}

function shortlistFeatureIdMatches(f: unknown, selectedId: string): boolean {
  if (!isNonNullObject(f) || !("id" in f)) {
    return false;
  }
  const raw = (f as { id: unknown }).id;
  if (typeof raw === "string") {
    return raw === selectedId;
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return String(raw) === selectedId;
  }
  return false;
}

function strictStringFeatureIdMatches(f: unknown, selectedId: string): boolean {
  if (!isNonNullObject(f) || !("id" in f)) {
    return false;
  }
  const raw = (f as { id: unknown }).id;
  return typeof raw === "string" && raw === selectedId;
}

function getMultiSelectInfo(
  items: SelectedItem[],
  getShortlistName: () => string,
  LAYER_LABELS: LayerLabels,
): SelectedPropertyInfo | null {
  const firstItem = items[0];
  if (items.length === 0 || !firstItem?.type) {
    return null;
  }

  const count = `${items.length} selected`;

  if (firstItem.type === "shortlist") {
    return {
      address: count,
      source: getShortlistName(),
      type: "shortlist",
    };
  }
  if (firstItem.type === "property") {
    return {
      address: count,
      source: LAYER_LABELS.SITE_BOUNDARY,
      type: "property",
    };
  }
  if (firstItem.type === "developable") {
    return {
      address: count,
      source: LAYER_LABELS.DEVELOPABLE_AREA,
      type: "developable",
    };
  }
  return null;
}

function getSingleSelectInfo(
  item: SelectedItem,
  propertyLayers: unknown[],
  developableLayers: unknown[],
  filteredShortlistFeatures: unknown[],
  getShortlistName: () => string,
  getPropertyAddress: (feature: unknown) => string,
  LAYER_LABELS: LayerLabels,
): SelectedPropertyInfo | null {
  if (!item.id || !item.type) {
    return null;
  }

  if (item.type === "shortlist") {
    const feature = filteredShortlistFeatures.find((f): f is { id: string | number; address?: string } =>
      shortlistFeatureIdMatches(f, item.id),
    );

    if (!feature) {
      return null;
    }

    return {
      address: feature.address ?? "Unknown Property",
      source: getShortlistName(),
      type: "shortlist",
    };
  }

  if (item.type === "property") {
    const feature = propertyLayers.find((f): f is { id: string } => strictStringFeatureIdMatches(f, item.id));

    if (!feature) {
      return null;
    }

    return {
      address: getPropertyAddress(feature),
      source: LAYER_LABELS.SITE_BOUNDARY,
      type: "property",
    };
  }

  if (item.type === "developable") {
    const feature = developableLayers.find(
      (
        f,
      ): f is {
        id: string;
        layerId?: string;
        properties?: Record<string, unknown>;
      } => strictStringFeatureIdMatches(f, item.id),
    );

    if (!feature) {
      return null;
    }

    const displayName = getDevelopableAreaDisplayName(feature.layerId ?? "Unknown Area", feature.properties);

    return {
      address: displayName,
      source: LAYER_LABELS.DEVELOPABLE_AREA,
      type: "developable",
    };
  }

  return null;
}

export const usePropertySelectorState = ({
  multiSelect = false,
  maxSelections = DEFAULT_MAX_SELECTIONS,
  autoCollapseOnSelection = false,
  defaultCollapsed = false,
  onMultiSelect,
  mapItemToFeature,
}: UsePropertySelectorStateProps): UsePropertySelectorStateReturn => {
  const [selectedItem, setSelectedItem] = useState<SelectedItem>({
    id: "",
    type: "",
  });
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(defaultCollapsed);

  const isItemSelected = useCallback(
    (id: string, type: SelectedItem["type"]): boolean => {
      if (multiSelect) {
        return selectedItems.some((item) => item.id === id && item.type === type);
      }
      return selectedItem.id === id && selectedItem.type === type;
    },
    [multiSelect, selectedItems, selectedItem],
  );

  const handleMultiSelectToggle = useCallback(
    (layerId: string, layerType: SelectedItem["type"]): void => {
      setSelectedItems((prev) => {
        const isCurrentlySelected = prev.some((item) => item.id === layerId && item.type === layerType);

        if (isCurrentlySelected) {
          return prev.filter((item) => !(item.id === layerId && item.type === layerType));
        }

        if (prev.length >= maxSelections) {
          toast.warning(`Maximum ${maxSelections} selections allowed`);
          return prev;
        }

        return [...prev, { id: layerId, type: layerType }];
      });
    },
    [maxSelections],
  );

  const selectItem = useCallback(
    (id: string, type: SelectedItem["type"]): void => {
      if (multiSelect) {
        handleMultiSelectToggle(id, type);
        return;
      }

      setSelectedItem({ id, type });

      if (autoCollapseOnSelection) {
        setIsCollapsed(true);
      }
    },
    [multiSelect, autoCollapseOnSelection, handleMultiSelectToggle],
  );

  const mapItemToFeatureRef = useRef(mapItemToFeature);

  useEffect(() => {
    mapItemToFeatureRef.current = mapItemToFeature;
  }, [mapItemToFeature]);

  useEffect(() => {
    if (multiSelect && onMultiSelect) {
      const features = selectedItems
        .map((item) => mapItemToFeatureRef.current(item))
        .filter((f): f is PropertyFeature => f !== null);
      onMultiSelect(features);
    }
  }, [multiSelect, selectedItems, onMultiSelect]);

  const getSelectedPropertyInfo = useCallback(
    (
      propertyLayers: unknown[],
      developableLayers: unknown[],
      filteredShortlistFeatures: unknown[],
      getShortlistName: () => string,
      getPropertyAddress: (feature: unknown) => string,
      LAYER_LABELS: LayerLabels,
    ): SelectedPropertyInfo | null => {
      if (multiSelect) {
        return getMultiSelectInfo(selectedItems, getShortlistName, LAYER_LABELS);
      }
      return getSingleSelectInfo(
        selectedItem,
        propertyLayers,
        developableLayers,
        filteredShortlistFeatures,
        getShortlistName,
        getPropertyAddress,
        LAYER_LABELS,
      );
    },
    [multiSelect, selectedItems, selectedItem],
  );

  return {
    selectedItem,
    selectedItems,
    selectionError,
    isCollapsed,
    setIsCollapsed,
    setSelectionError,
    isItemSelected,
    handleMultiSelectToggle,
    selectItem,
    getSelectedPropertyInfo,
  };
};
