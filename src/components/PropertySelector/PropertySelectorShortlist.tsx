import { InPageAlert, RadioButton, Checkbox } from '@/components/ui/landiq';
import { FEATURE_PROP, getOptionalProp, type FeatureWithProperties } from '@/constants/featureProps';
import type { ShortlistFeature as HookShortlistFeature } from '@/hooks/useShortlistSelection';
import type { SelectedItem } from './usePropertySelectorState';
import { formatNumber } from '@/utils/formatters';
import type * as GeoJSON from 'geojson';
import { ChevronDown, Layers, Search, X } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

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

interface PropertySelectorShortlistProps {
  shortlists: Shortlist[];
  selectedShortlist: Shortlist | null;
  shortlistFeatures: HookShortlistFeature[];
  isLoadingShortlists: boolean;
  isLoadingFeatures: boolean;
  error: string | null;
  selectShortlist: (shortlist: Shortlist & { layer_full: unknown }) => void;
  multiSelect?: boolean;
  selectedItem: SelectedItem;
  selectedItems: SelectedItem[];
  onSelect: (feature: ShortlistFeature) => void;
  isItemSelected: (id: string, type: SelectedItem['type']) => boolean;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  onFilteredFeaturesChange?: (features: HookShortlistFeature[]) => void;
}

const toFeatureWithProperties = (feature: GeoJSON.Feature): FeatureWithProperties => {
  return {
    ...feature,
    properties: feature.properties ?? {},
  } as FeatureWithProperties;
};

export const PropertySelectorShortlist: React.FC<PropertySelectorShortlistProps> = ({
  shortlists,
  selectedShortlist,
  shortlistFeatures,
  isLoadingShortlists,
  isLoadingFeatures,
  error: shortlistError,
  selectShortlist,
  multiSelect = false,
  selectedItem,
  selectedItems: _selectedItems,
  onSelect,
  isItemSelected,
  searchTerm,
  onSearchTermChange,
  onFilteredFeaturesChange
}) => {
  const [showShortlistDropdown, setShowShortlistDropdown] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (dropdownRef.current && event.target instanceof Node && !dropdownRef.current.contains(event.target)) {
        setShowShortlistDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return (): void => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredShortlistFeatures = useMemo((): ShortlistFeature[] => {
    if (!searchTerm) {
      return shortlistFeatures as ShortlistFeature[];
    }
    const searchLower = searchTerm.toLowerCase();
    return shortlistFeatures.filter((feature) => {
      const featureWithProps = toFeatureWithProperties({
        type: 'Feature',
        geometry: feature.geometry ?? { type: 'Polygon', coordinates: [] },
        properties: feature.properties ?? {}
      });
      const siteName = getOptionalProp(featureWithProps, FEATURE_PROP.PROPERTY.SITE_NAME) as string | undefined;
      const address = getOptionalProp(featureWithProps, FEATURE_PROP.PROPERTY.ADDRESS) as string | undefined;
      const suitabilityAddress = getOptionalProp(featureWithProps, FEATURE_PROP.PROPERTY.SUITABILITY_ADDRESS) as string | undefined;

      const matchesAddress = feature.address?.toLowerCase().includes(searchLower) ?? false;
      const matchesSiteName = siteName?.toLowerCase().includes(searchLower) ?? false;
      const matchesPropAddress = address?.toLowerCase().includes(searchLower) ?? false;
      const matchesSuitabilityAddress = suitabilityAddress?.toLowerCase().includes(searchLower) ?? false;

      return matchesAddress || matchesSiteName || matchesPropAddress || matchesSuitabilityAddress;
    }) as ShortlistFeature[];
  }, [shortlistFeatures, searchTerm]);

  useEffect(() => {
    if (onFilteredFeaturesChange) {
      onFilteredFeaturesChange(filteredShortlistFeatures);
    }
  }, [filteredShortlistFeatures, onFilteredFeaturesChange]);

  const getShortlistDropdownText = (): string => {
    if (isLoadingShortlists) return 'Loading shortlists...';
    if (selectedShortlist) {
      return selectedShortlist.name;
    }
    return 'Choose a shortlist';
  };

  const renderEmptyStateMessage = (): React.ReactNode => {
    if (isLoadingFeatures) {
      return (
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-supplementary"></div>
          <span>Loading shortlist properties...</span>
        </div>
      );
    }
    if (shortlistFeatures.length === 0) {
      return <p>No properties found in this shortlist.</p>;
    }
    return <p>No properties match your search criteria.</p>;
  };

  if (shortlists.length === 0) {
    return null;
  }

  return (
    <>
      <div className="mb-4 border border-greys-grey04 rounded-lg p-3 bg-greys-offWhite">
        <div className="flex items-center gap-2 mb-2">
          <Layers className="h-4 w-4 text-brand-supplementary" />
          <span className="text-sm font-medium text-greys-dark">Select from Shortlist</span>
        </div>

        <div ref={dropdownRef} className="relative mb-2">
          <button
            type="button"
            onClick={() => setShowShortlistDropdown(!showShortlistDropdown)}
            disabled={isLoadingShortlists}
            className="w-full flex items-center justify-between rounded-md px-3 py-2 text-sm bg-white border border-greys-grey03 hover:bg-greys-offWhite disabled:opacity-50 text-greys-dark"
          >
            <span>
              {getShortlistDropdownText()}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showShortlistDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showShortlistDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-greys-grey03 rounded-md shadow-lg max-h-48 overflow-y-auto">
              {shortlists.map((shortlist: Shortlist) => (
                <button
                  type="button"
                  key={shortlist.id}
                  onClick={() => {
                    selectShortlist(shortlist as Shortlist & { layer_full: unknown });
                    setShowShortlistDropdown(false);
                    onSearchTermChange('');
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-greys-offWhite border-b border-greys-grey04 last:border-b-0 text-greys-dark"
                >
                  {shortlist.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedShortlist && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-greys-grey03" />
              <input
                type="text"
                placeholder={`Search in ${selectedShortlist.name}...`}
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
                className="w-full pl-10 pr-10 py-2 text-sm border border-greys-grey03 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-supplementary focus:border-brand-supplementary text-greys-dark"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => onSearchTermChange('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-greys-grey03 hover:text-greys-dark"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {shortlistFeatures.length > 0 && (
              <div className="text-xs text-greys-grey01">
                {searchTerm
                  ? `Showing ${formatNumber(filteredShortlistFeatures.length)} of ${formatNumber(shortlistFeatures.length)} properties`
                  : `${formatNumber(shortlistFeatures.length)} properties available`}
              </div>
            )}
          </div>
        )}

        {isLoadingFeatures && (
          <div className="text-sm text-greys-grey01 mt-2">Loading shortlist properties...</div>
        )}

        {shortlistError && (
          <InPageAlert type="error" compact={true} className="mt-2">
            {shortlistError}
          </InPageAlert>
        )}
      </div>

      {selectedShortlist && (
        <div className="space-y-4">
          {filteredShortlistFeatures.length === 0 ? (
            <div className="text-greys-grey01 text-sm text-center py-4">
              {renderEmptyStateMessage()}
            </div>
          ) : (
            <div>
              <div className="max-h-80 overflow-y-auto border border-greys-grey04 rounded-lg bg-white">
                <div className="space-y-2">
                  {filteredShortlistFeatures.map((layer) => {
                    const layerId = typeof layer.id === 'string' ? layer.id : String(layer.id ?? '');
                    const shortlistFeature: ShortlistFeature = {
                      ...layer,
                      type: 'shortlist',
                      id: layerId,
                      properties: (layer.properties ?? {}) as Record<string, unknown>,
                      sourceFeatureProperties: (layer as { sourceFeatureProperties?: Record<string, unknown> }).sourceFeatureProperties
                    };
                    const itemId = multiSelect ? `${selectedShortlist.id}::${layerId}` : layerId;

                    return (
                      <div key={`shortlist-${layerId}`} className="p-2">
                        <div className="flex items-center gap-2">
                          {multiSelect ? (
                            <Checkbox
                              checked={isItemSelected(itemId, 'shortlist')}
                              onCheckedChange={() => onSelect(shortlistFeature)}
                            />
                          ) : (
                            <RadioButton
                              name="single-property-or-developable"
                              checked={selectedItem.id === layerId && selectedItem.type === 'shortlist'}
                              onChange={() => onSelect(shortlistFeature)}
                            />
                          )}
                          <div className="flex-1">
                            <div className="font-medium text-greys-dark">{layer.address}</div>
                            <div className="text-xs text-greys-grey01 mt-1">From {selectedShortlist.name}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
