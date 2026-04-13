import { FEATURE_PROP, getProp, type FeatureWithProperties } from "@/constants/featureProps";
import type { GiraffeRawSections } from "@/types/external/iframe-sdk";
import { giraffeState } from "@gi-nx/iframe-sdk";
import type * as GeoJSON from "geojson";

interface MappedSiteBoundaryFeature {
  id: string | number | null;
  name: string;
  feature: GeoJSON.Feature;
}

interface PropertySelectorSiteBoundaryFeature {
  id: string | number | null | undefined;
  layerId: string | number | null | undefined;
  geometry: GeoJSON.Geometry;
  properties: Record<string, unknown>;
  address: string;
}

type FilterType = "usage" | "layerId";
type FormatType = "standard" | "propertySelector";

export function filterSiteBoundaryFeatures(
  rawSections: GiraffeRawSections | null | undefined,
): FeatureWithProperties[] {
  if (!rawSections?.features) {
    return [];
  }

  return rawSections.features.filter((feature) => getProp(feature, FEATURE_PROP.USAGE) === "Site boundary");
}

export function filterSiteBoundaryFeaturesByLayerId(
  rawSections: GiraffeRawSections | null | undefined,
): FeatureWithProperties[] {
  if (!rawSections?.features) {
    return [];
  }

  return rawSections.features.filter((feature) => {
    const layerId = getProp(feature, FEATURE_PROP.LAYER_ID);
    if (typeof layerId === "string") {
      return layerId.includes("Site Boundary");
    }
    if (typeof layerId === "number") {
      return String(layerId).includes("Site Boundary");
    }
    return false;
  });
}

export function mapSiteBoundaryFeatures(
  features: FeatureWithProperties[],
  includeDeduplication = false,
): MappedSiteBoundaryFeature[] {
  const mapped: MappedSiteBoundaryFeature[] = features.map((feature) => ({
    id: getProp(feature, FEATURE_PROP.ID) ?? getProp(feature, "OBJECTID") ?? null,
    name:
      getProp<string>(feature, FEATURE_PROP.PROPERTY.ADDRESS) ??
      getProp<string>(feature, FEATURE_PROP.LOT.LOT_REFERENCE) ??
      getProp<string>(feature, "name") ??
      "Unnamed Boundary",
    feature,
  }));

  const filtered = mapped.filter((item) => item.id);

  if (includeDeduplication) {
    return Array.from(new Map(filtered.map((item) => [item.id, item])).values());
  }

  return filtered;
}

export function mapSiteBoundaryFeaturesForPropertySelector(
  features: FeatureWithProperties[],
): PropertySelectorSiteBoundaryFeature[] {
  return features.map((feature) => {
    const address: string =
      getProp<string>(feature, FEATURE_PROP.PROPERTY.ADDRESS) ??
      getProp<string>(feature, FEATURE_PROP.LOT.LOT_REFERENCE) ??
      getProp<string>(feature, FEATURE_PROP.LAYER_ID) ??
      "Project Boundary";

    return {
      id: getProp(feature, FEATURE_PROP.ID),
      layerId: getProp(feature, FEATURE_PROP.LAYER_ID),
      geometry: feature.geometry,
      properties: {
        ...feature.properties,
        site_suitability__address: address,
      },
      address,
    };
  });
}

export function getDevelopableAreaDisplayName(layerId: string, properties?: Record<string, unknown>): string {
  const prefix = "Developable Area";
  const trimmedSuffix = layerId
    .slice(prefix.length)
    .replace(/^[\s\-–—:]+/, "")
    .trim();

  if (trimmedSuffix.length > 0) {
    return layerId;
  }

  if (properties) {
    const featureWithProps: FeatureWithProperties = {
      type: "Feature",
      geometry: { type: "Point", coordinates: [0, 0] },
      properties,
    };
    const address =
      getProp<string>(featureWithProps, FEATURE_PROP.PROPERTY.ADDRESS) ??
      getProp<string>(featureWithProps, FEATURE_PROP.PROPERTY.SUITABILITY_ADDRESS) ??
      getProp<string>(featureWithProps, FEATURE_PROP.PROPERTY.SITE_NAME);

    if (address) {
      return `${prefix} - ${address}`;
    }
  }

  return layerId;
}

export function getSiteBoundaries(
  filterType: FilterType = "usage",
  includeDeduplication = false,
  format: FormatType = "standard",
): MappedSiteBoundaryFeature[] | PropertySelectorSiteBoundaryFeature[] {
  const rawSections = giraffeState.get("rawSections") as GiraffeRawSections | null | undefined;

  const features =
    filterType === "layerId"
      ? filterSiteBoundaryFeaturesByLayerId(rawSections)
      : filterSiteBoundaryFeatures(rawSections);

  if (format === "propertySelector") {
    return mapSiteBoundaryFeaturesForPropertySelector(features);
  }

  return mapSiteBoundaryFeatures(features, includeDeduplication);
}
