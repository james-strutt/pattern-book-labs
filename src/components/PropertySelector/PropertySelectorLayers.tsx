import { RadioButton, Checkbox } from '@/components/ui/landiq';
import { FEATURE_PROP, getOptionalProp, getProp, type FeatureWithProperties } from '@/constants/featureProps';
import { getDevelopableAreaDisplayName } from '@/utils/siteBoundaryUtils';
import type { SelectedItem } from './usePropertySelectorState';
import type * as GeoJSON from 'geojson';
import type { FC } from 'react';

const LAYER_LABELS = {
  DEVELOPABLE_AREA: 'Developable Area',
  DEVELOPABLE_AREAS: 'Developable Areas',
  SITE_BOUNDARY: 'Site Boundary',
  SITE_BOUNDARIES: 'Site Boundaries'
} as const;

interface DevelopableLayer {
  id: string;
  layerId: string;
  geometry: GeoJSON.Geometry;
  properties: Record<string, unknown>;
}

interface PropertyLayer {
  id: string;
  address?: string;
  layerId?: string;
  type?: 'property';
  geometry?: GeoJSON.Geometry;
  properties?: Record<string, unknown>;
}

interface PropertySelectorLayersProps {
  propertyLayers: PropertyLayer[];
  developableLayers: DevelopableLayer[];
  showAutoDevelopableArea?: boolean;
  multiSelect?: boolean;
  selectedItem: SelectedItem;
  onSelectProperty: (layer: PropertyLayer & { type: 'property' }) => void;
  onSelectDevelopable: (layer: DevelopableLayer & { type: 'developable' }) => void;
  isItemSelected: (id: string, type: SelectedItem['type']) => boolean;
  showNoShortlistContent?: boolean;
}

const toFeatureWithProperties = (feature: GeoJSON.Feature): FeatureWithProperties =>
  ({
    ...feature,
    properties: feature.properties ?? {}
  }) as FeatureWithProperties;

const getPropertyAddress = (feature: PropertyLayer): string => {
  if (feature.address) return feature.address;
  if (feature.layerId) return feature.layerId;
  if (!feature.properties) return 'Unknown Property';

  const geoFeature: GeoJSON.Feature = {
    type: 'Feature',
    geometry: feature.geometry ?? { type: 'Polygon', coordinates: [] },
    properties: feature.properties
  };
  const featureWithProps = toFeatureWithProperties(geoFeature);
  const propAddress = getProp(featureWithProps, FEATURE_PROP.PROPERTY.ADDRESS) as string | undefined;
  const suitabilityAddress = getOptionalProp(
    featureWithProps,
    FEATURE_PROP.PROPERTY.SUITABILITY_ADDRESS
  ) as string | undefined;
  return propAddress ?? suitabilityAddress ?? feature.layerId ?? 'Unknown Property';
};

export const PropertySelectorLayers: FC<PropertySelectorLayersProps> = ({
  propertyLayers,
  developableLayers,
  showAutoDevelopableArea = true,
  multiSelect = false,
  selectedItem,
  onSelectProperty,
  onSelectDevelopable,
  isItemSelected,
  showNoShortlistContent = true
}) => {
  const propertyLayersList = (
    <div className="space-y-2">
      {propertyLayers.map((layer: PropertyLayer) => {
        const address = getPropertyAddress(layer);
        if (multiSelect) {
          return (
            <Checkbox
              key={`property-${layer.id}`}
              checked={isItemSelected(layer.id, 'property')}
              onCheckedChange={() => onSelectProperty({ ...layer, type: 'property' })}
              label={address}
            />
          );
        }
        return (
          <RadioButton
            key={`property-${layer.id}`}
            name="single-property-or-developable"
            checked={selectedItem.id === layer.id && selectedItem.type === 'property'}
            onChange={() => onSelectProperty({ ...layer, type: 'property' })}
            label={address}
          />
        );
      })}
    </div>
  );

  if (!showNoShortlistContent) {
    return (
      <>
        {propertyLayers.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-greys-grey01 mb-2 border-t border-greys-grey04 pt-3">
              {LAYER_LABELS.SITE_BOUNDARIES}
            </h4>
            {propertyLayersList}
          </div>
        )}
      </>
    );
  }

  const hasNoProperties =
    propertyLayers.length === 0 && (!showAutoDevelopableArea || developableLayers.length === 0);

  if (hasNoProperties) {
    return (
      <div className="text-greys-grey01 text-sm">
        <p>
          No properties or lots available. Create one using Land iQ Site Search and the {LAYER_LABELS.SITE_BOUNDARY}{' '}
          drawing layer, or select a shortlist above.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {propertyLayers.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-greys-grey01 mb-2">{LAYER_LABELS.SITE_BOUNDARIES}</h4>
          {propertyLayersList}
        </div>
      )}

      {showAutoDevelopableArea && developableLayers.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-greys-grey01 mb-2">{LAYER_LABELS.DEVELOPABLE_AREAS}</h4>
          <div className="space-y-2">
            {developableLayers.map((layer: DevelopableLayer) => {
              const displayName = getDevelopableAreaDisplayName(layer.layerId, layer.properties);
              if (multiSelect) {
                return (
                  <Checkbox
                    key={`developable-${layer.id}`}
                    checked={isItemSelected(layer.id, 'developable')}
                    onCheckedChange={() => onSelectDevelopable({ ...layer, type: 'developable' })}
                    label={displayName}
                  />
                );
              }
              return (
                <RadioButton
                  key={`developable-${layer.id}`}
                  name="single-property-or-developable"
                  checked={selectedItem.id === layer.id && selectedItem.type === 'developable'}
                  onChange={() => onSelectDevelopable({ ...layer, type: 'developable' })}
                  label={displayName}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
