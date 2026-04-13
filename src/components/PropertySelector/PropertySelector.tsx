import { InPageAlert, StatusBadge } from '@/components/ui/landiq';
import { FEATURE_PROP, getOptionalProp, getProp, type FeatureWithProperties } from '@/constants/featureProps';
import { useShortlistSelection, type ShortlistFeature as HookShortlistFeature } from '@/hooks/useShortlistSelection';
import { useSiteBoundaries } from '@/hooks/useSiteBoundaries';
import logger from '@/lib/logger';
import { removePropertyBoundaryLayer, showPropertyBoundaryLayer } from '@/services/propertyBoundaryService';
import type { PropertyFeature, PropertyFeatureCollection } from '@/types/geometry';
import type { GiraffeRawSections } from '@/types/external/iframe-sdk';
import { getDevelopableAreaDisplayName } from '@/utils/siteBoundaryUtils';
import { giraffeState } from '@gi-nx/iframe-sdk';
import type * as GeoJSON from 'geojson';
import { Minimize2, Maximize2 } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { PropertySelectorShortlist } from './PropertySelectorShortlist';
import { PropertySelectorLayers } from './PropertySelectorLayers';
import { usePropertySelectorState, type SelectedItem } from './usePropertySelectorState';

const LAYER_ID_PREFIX = {
  DEVELOPABLE_AREA: 'Developable Area',
  SITE_BOUNDARY: 'Site Boundary'
} as const;

export const LAYER_LABELS = {
  DEVELOPABLE_AREA: 'Developable Area',
  DEVELOPABLE_AREAS: 'Developable Areas',
  SITE_BOUNDARY: 'Site Boundary',
  SITE_BOUNDARIES: 'Site Boundaries'
} as const;

const toFeatureWithProperties = (feature: GeoJSON.Feature): FeatureWithProperties => {
  return {
    ...feature,
    properties: feature.properties ?? {},
  } as FeatureWithProperties;
};

interface DevelopableLayer {
  id: string;
  layerId: string;
  geometry: GeoJSON.Geometry;
  properties: Record<string, unknown>;
}

interface Shortlist {
  id: string;
  name: string;
  projectLayer: boolean;
  layer_full?: unknown;
}

interface ShortlistFeature extends Omit<HookShortlistFeature, 'id' | 'type'> {
  id: string;
  type: 'shortlist';
  sourceFeatureProperties?: Record<string, unknown>;
}

interface PropertyLayer {
  id: string;
  address?: string;
  layerId?: string;
  type?: 'property';
  geometry?: GeoJSON.Geometry;
  properties?: Record<string, unknown>;
}

interface PropertySelectorProps {
  onPropertySelect?: (featureCollection: PropertyFeatureCollection) => void;
  onFlyToFeature?: (feature: GeoJSON.Feature) => void;
  onDevelopableAreaSelected?: (featureCollection: PropertyFeatureCollection) => void;
  showAutoDevelopableArea?: boolean;
  multiSelect?: boolean;
  onMultiSelect?: (features: PropertyFeature[]) => void;
  maxSelections?: number;
  autoCollapseOnSelection?: boolean;
  defaultCollapsed?: boolean;
}

const PropertySelector: React.FC<PropertySelectorProps> = ({
  onPropertySelect,
  onFlyToFeature,
  onDevelopableAreaSelected,
  showAutoDevelopableArea = true,
  multiSelect = false,
  onMultiSelect,
  maxSelections = 10,
  autoCollapseOnSelection = false,
  defaultCollapsed = false
}) => {
  const { siteBoundaries } = useSiteBoundaries('layerId', false, 'propertySelector');
  const propertyLayers = siteBoundaries as PropertyLayer[];
  const {
    shortlists,
    selectedShortlist,
    shortlistFeatures,
    isLoadingShortlists,
    isLoadingFeatures,
    error: shortlistError,
    selectShortlist
  } = useShortlistSelection();

  const shortlistFeatureCacheRef = useRef<Map<string, PropertyFeature>>(new Map());
  const [developableLayers, setDevelopableLayers] = useState<DevelopableLayer[]>([]);
  const [shortlistSearchTerm, setShortlistSearchTerm] = useState<string>('');
  const [filteredShortlistFeatures, setFilteredShortlistFeatures] = useState<HookShortlistFeature[]>([]);

  const isDevelopableLayer = (feature: GeoJSON.Feature): boolean => {
    if (!feature.properties) return false;
    const featureWithProps = toFeatureWithProperties(feature);
    const layerId = getProp(featureWithProps, FEATURE_PROP.LAYER_ID) as string | undefined;
    return layerId !== undefined &&
      layerId.startsWith(LAYER_ID_PREFIX.DEVELOPABLE_AREA) &&
      !layerId.includes(LAYER_ID_PREFIX.SITE_BOUNDARY);
  };

  const mapToDevelopableLayer = (feature: GeoJSON.Feature): DevelopableLayer => {
    const featureWithProps = toFeatureWithProperties(feature);
    return {
      id: getProp(featureWithProps, FEATURE_PROP.ID) as string,
      layerId: getProp(featureWithProps, FEATURE_PROP.LAYER_ID) as string,
      geometry: feature.geometry,
      properties: (feature.properties ?? {}) as Record<string, unknown>
    };
  };

  const fetchDevelopableLayers = useCallback(async (): Promise<void> => {
    try {
      const rawSections = giraffeState.get('rawSections') as GiraffeRawSections | null;

      if (!rawSections?.features) {
        setDevelopableLayers([]);
        return;
      }

      const developable: DevelopableLayer[] = rawSections.features
        .filter(isDevelopableLayer)
        .map(mapToDevelopableLayer);
      setDevelopableLayers(developable);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Failed to fetch developable layers', {
        error: errorMessage,
        stack: errorStack,
        context: 'PropertySelector.fetchDevelopableLayers'
      }, 'PropertySelector');
      setDevelopableLayers([]);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchDevelopableLayers();
    }, 0);

    const listenerKey = giraffeState.addListener(['rawSections'], () => {
      fetchDevelopableLayers();
    });

    return (): void => {
      clearTimeout(timeoutId);
      if (listenerKey) {
        try {
          giraffeState.removeListener(listenerKey);
        } catch (error) {
          logger.debug('Failed to remove listener', {
            error: error instanceof Error ? error.message : 'Unknown error',
            context: 'PropertySelector.cleanup'
          }, 'PropertySelector');
        }
      }
      removePropertyBoundaryLayer();
    };
  }, [fetchDevelopableLayers]);

  useEffect(() => {
    setFilteredShortlistFeatures(shortlistFeatures);
  }, [shortlistFeatures]);

  const createGeoFeature = (
    geometry: GeoJSON.Geometry | undefined,
    properties: Record<string, unknown> | undefined,
    sourceFeatureProperties?: Record<string, unknown>
  ): GeoJSON.Feature => {
    return {
      type: 'Feature',
      geometry: geometry ?? { type: 'Polygon', coordinates: [] },
      properties: properties ?? {},
      ...(sourceFeatureProperties && { sourceFeatureProperties })
    } as GeoJSON.Feature;
  };

  const handlePropertySelection = async (propLayer: PropertyLayer): Promise<void> => {
    try {
      setSelectionError(null);
      if (onPropertySelect) {
        const geoFeature = createGeoFeature(propLayer.geometry, propLayer.properties);
        const featureCollection: PropertyFeatureCollection = {
          type: 'FeatureCollection',
          features: [geoFeature as PropertyFeature]
        };
        onPropertySelect(featureCollection);
      }

      await removePropertyBoundaryLayer();

      if (onFlyToFeature && propLayer.geometry) {
        const geoFeature = createGeoFeature(propLayer.geometry, propLayer.properties);
        onFlyToFeature(geoFeature);
      }

      const propertyName = propLayer.address ?? propLayer.layerId ?? 'Property';
      toast.success(`Selected: ${propertyName}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to select property', {
        error: errorMessage,
        context: 'PropertySelector.handlePropertySelection'
      }, 'PropertySelector');
      setSelectionError('Failed to select property. Please try again.');
    }
  };

  const handleShortlistSelection = async (shortlistLayer: ShortlistFeature): Promise<void> => {
    try {
      setSelectionError(null);
      const properties = (shortlistLayer.properties ?? {}) as Record<string, unknown> | undefined;
      if (onPropertySelect) {
        const geoFeature = createGeoFeature(shortlistLayer.geometry, properties, shortlistLayer.sourceFeatureProperties);
        const featureCollection: PropertyFeatureCollection = {
          type: 'FeatureCollection',
          features: [geoFeature as PropertyFeature]
        };
        onPropertySelect(featureCollection);
      }

      if (shortlistLayer.geometry) {
        const geoFeature = createGeoFeature(shortlistLayer.geometry, properties, shortlistLayer.sourceFeatureProperties);
        await showPropertyBoundaryLayer(geoFeature);
      } else {
        await removePropertyBoundaryLayer();
      }

      if (onFlyToFeature && shortlistLayer.geometry) {
        const geoFeature = createGeoFeature(shortlistLayer.geometry, properties, shortlistLayer.sourceFeatureProperties);
        onFlyToFeature(geoFeature);
      }

      const propertyName = shortlistLayer.address ?? 'Property';
      toast.success(`Selected: ${propertyName}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to select shortlist property', {
        error: errorMessage,
        context: 'PropertySelector.handleShortlistSelection'
      }, 'PropertySelector');
      setSelectionError('Failed to select property. Please try again.');
    }
  };

  const handleDevelopableSelection = async (developableLayer: DevelopableLayer & { type: 'developable' }): Promise<void> => {
    try {
      setSelectionError(null);
      await removePropertyBoundaryLayer();

      if (onDevelopableAreaSelected) {
        const geoFeature = createGeoFeature(developableLayer.geometry, developableLayer.properties);
        const featureCollection: PropertyFeatureCollection = {
          type: 'FeatureCollection',
          features: [geoFeature as PropertyFeature]
        };
        onDevelopableAreaSelected(featureCollection);
      }

      if (onFlyToFeature && developableLayer.geometry) {
        const geoFeature = createGeoFeature(developableLayer.geometry, developableLayer.properties);
        onFlyToFeature(geoFeature);
      }

      const areaName = getDevelopableAreaDisplayName(
        developableLayer.layerId ?? LAYER_LABELS.DEVELOPABLE_AREA,
        developableLayer.properties
      );
      toast.success(`Selected: ${areaName}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to select developable area', {
        error: errorMessage,
        context: 'PropertySelector.handleDevelopableSelection'
      }, 'PropertySelector');
      setSelectionError('Failed to select developable area. Please try again.');
    }
  };

  const mapItemToFeature = useCallback((item: SelectedItem): PropertyFeature | null => {
    if (item.type === 'property') {
      const propLayer = propertyLayers.find(p => p.id === item.id);
      if (propLayer) {
        return createGeoFeature(propLayer.geometry, propLayer.properties) as PropertyFeature;
      }
    } else if (item.type === 'shortlist') {
      if (multiSelect) {
        return shortlistFeatureCacheRef.current.get(item.id) ?? null;
      }
      const shortlistFeature = shortlistFeatures.find(f => {
        const featureId = typeof f.id === 'string' ? f.id : String(f.id ?? '');
        return featureId === item.id;
      });
      if (shortlistFeature) {
        const props = (shortlistFeature.properties ?? {}) as Record<string, unknown>;
        const sourceProps = (shortlistFeature as { sourceFeatureProperties?: Record<string, unknown> }).sourceFeatureProperties;
        return createGeoFeature(shortlistFeature.geometry, props, sourceProps) as PropertyFeature;
      }
    } else if (item.type === 'developable') {
      const developableLayer = developableLayers.find(d => d.id === item.id);
      if (developableLayer) {
        return createGeoFeature(developableLayer.geometry, developableLayer.properties) as PropertyFeature;
      }
    }
    return null;
  }, [multiSelect, propertyLayers, shortlistFeatures, developableLayers]);

  const {
    selectedItem,
    selectedItems,
    selectionError,
    isCollapsed,
    setIsCollapsed,
    setSelectionError,
    isItemSelected,
    selectItem,
    getSelectedPropertyInfo
  } = usePropertySelectorState({
    multiSelect,
    maxSelections,
    autoCollapseOnSelection,
    defaultCollapsed,
    onMultiSelect,
    mapItemToFeature
  });

  const selectProperty = async (layer: PropertyLayer | ShortlistFeature | (DevelopableLayer & { type: 'developable' })): Promise<void> => {
    const rawId = typeof layer.id === 'string' ? layer.id : String(layer.id ?? '');

    let itemId = rawId;
    if (multiSelect && layer.type === 'shortlist' && selectedShortlist) {
      const shortlistId = (selectedShortlist as Shortlist).id;
      itemId = `${shortlistId}::${rawId}`;
      const props = (layer.properties ?? {}) as Record<string, unknown>;
      const sourceProps = layer.sourceFeatureProperties;
      const feature = createGeoFeature(layer.geometry, props, sourceProps) as PropertyFeature;
      shortlistFeatureCacheRef.current.set(itemId, feature);
    }

    selectItem(itemId, layer.type as SelectedItem['type']);

    if (layer.type === 'property') {
      await handlePropertySelection(layer);
    } else if (layer.type === 'shortlist') {
      await handleShortlistSelection(layer);
    } else if (layer.type === 'developable') {
      await handleDevelopableSelection(layer);
    }
  };

  const getShortlistName = (): string => {
    if (selectedShortlist && typeof selectedShortlist === 'object' && 'name' in selectedShortlist) {
      return (selectedShortlist as Shortlist).name;
    }
    return 'Shortlist';
  };

  const getPropertyAddress = (feature: unknown): string => {
    const propLayer = feature as PropertyLayer;
    if (propLayer.address) return propLayer.address;
    if (propLayer.layerId) return propLayer.layerId;
    
    if (!propLayer.properties) return 'Unknown Property';
    
    const geoFeature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: propLayer.geometry ?? { type: 'Polygon', coordinates: [] },
      properties: propLayer.properties
    };
    const featureWithProps = toFeatureWithProperties(geoFeature);
    const propAddress = getProp(featureWithProps, FEATURE_PROP.PROPERTY.ADDRESS) as string | undefined;
    const suitabilityAddress = getOptionalProp(featureWithProps, FEATURE_PROP.PROPERTY.SUITABILITY_ADDRESS) as string | undefined;
    return propAddress ?? suitabilityAddress ?? propLayer.layerId ?? 'Unknown Property';
  };

  const selectedPropertyInfo = getSelectedPropertyInfo(
    propertyLayers,
    developableLayers,
    filteredShortlistFeatures,
    getShortlistName,
    getPropertyAddress,
    LAYER_LABELS
  );


  return (
    <div className="bg-white rounded-lg shadow mb-4">
      <div className="p-4 border-b border-greys-grey04">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-greys-dark">Select Properties/Lots</h3>
            {selectedPropertyInfo && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-greys-dark">{selectedPropertyInfo.address}</span>
                {multiSelect && selectedItems.length > 0 && (
                  <span className="text-xs text-greys-grey01">({selectedItems.length}/{maxSelections})</span>
                )}
                <StatusBadge
                  variant={selectedPropertyInfo.type === 'shortlist' ? 'built' : 'draft'}
                  active={true}
                >
                  {selectedPropertyInfo.source}
                </StatusBadge>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-1 px-2 py-1 text-sm text-greys-dark hover:bg-greys-offWhite rounded transition-colors"
            aria-label={isCollapsed ? 'Expand selector' : 'Collapse selector'}
          >
            {isCollapsed ? (
              <>
                <Maximize2 className="h-4 w-4" />
                <span>Expand</span>
              </>
            ) : (
              <>
                <Minimize2 className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-4 animate-in fade-in-50 duration-200">
          {selectionError && (
            <InPageAlert type="error" compact={true} className="mb-4">
              {selectionError}
            </InPageAlert>
          )}

          <PropertySelectorShortlist
            shortlists={shortlists}
            selectedShortlist={selectedShortlist}
            shortlistFeatures={shortlistFeatures}
            isLoadingShortlists={isLoadingShortlists}
            isLoadingFeatures={isLoadingFeatures}
            error={shortlistError}
            selectShortlist={selectShortlist}
            multiSelect={multiSelect}
            selectedItem={selectedItem}
            selectedItems={selectedItems}
            onSelect={selectProperty}
            isItemSelected={isItemSelected}
            searchTerm={shortlistSearchTerm}
            onSearchTermChange={setShortlistSearchTerm}
            onFilteredFeaturesChange={setFilteredShortlistFeatures}
          />

          {selectedShortlist ? (
            <PropertySelectorLayers
              propertyLayers={propertyLayers}
              developableLayers={[]}
              showAutoDevelopableArea={false}
              multiSelect={multiSelect}
              selectedItem={selectedItem}
              onSelectProperty={(layer) => selectProperty(layer)}
              onSelectDevelopable={() => {}}
              isItemSelected={isItemSelected}
              showNoShortlistContent={false}
            />
          ) : (
            <PropertySelectorLayers
              propertyLayers={propertyLayers}
              developableLayers={developableLayers}
              showAutoDevelopableArea={showAutoDevelopableArea}
              multiSelect={multiSelect}
              selectedItem={selectedItem}
              onSelectProperty={(layer) => selectProperty(layer)}
              onSelectDevelopable={(layer) => selectProperty(layer)}
              isItemSelected={isItemSelected}
              showNoShortlistContent={true}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default PropertySelector;

