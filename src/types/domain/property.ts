export interface BasePropertyFields {
  /**
   * Index signature for dynamic GeoJSON feature properties.
   *
   * The [key: string]: unknown signature aligns with GeoJSON specification requirements
   * for flexible properties from external sources. This is intentional for dynamic feature
   * properties that may be added from various GIS data sources.
   *
   * Always use type guards or property access helpers (getProp, getFeatureProperty, etc.)
   * with type narrowing to safely handle the unknown type. Direct property access without
   * type checking may result in runtime errors.
   */
  [key: string]: unknown;
  id?: string;
  appId?: string;
  usage?: string;
  public?: boolean;
  layerId?: string;
  projectId?: string;
  versionId?: string;

  site__id?: string;
  site__geometry?: unknown;

  site_suitability__LGA?: string;
  site_suitability__area?: number;
  site_suitability__suburb?: string;
  site_suitability__landzone?: string;
  site_suitability__electorate?: string;
  site_suitability__site_width?: number;
  site_suitability__six_cities?: string;
  site_suitability__flood_prone?: boolean;
  site_suitability__strata_status?: string;
  site_suitability__floorspace_ratio?: number;
  site_suitability__household_income?: number;
  site_suitability__population_growth?: number;
  site_suitability__building_footprint?: number;
  site_suitability__height_of_building?: number;
  site_suitability__NSW_government_agency?: string;
  site_suitability__vegetation_cover_2016?: number;
  site_suitability__biodiversity_site_area?: number;
  site_suitability__tree_canopy_cover_2016?: number;
  site_suitability__biodiversity_percentage?: number;
  site_suitability__NSW_government_land_owner?: string;
  site_suitability__principal_zone_identifier?: string;
  site_suitability__current_government_land_use?: string;
  potential_land_use?: string;
  future_requirements?: string;
  timing?: string;
  site_suitability__theoretical_gross_floor_area?: number;
  site_suitability__local_aboriginal_land_council_boundary?: string;
  site_suitability__transport_oriented_development_rezoning_sites?: string;
  site_suitability__public_transport_access_level_AM?: string;
  site_suitability__public_transport_access_level_PM?: string;
  site_suitability__hot_days_2040_to_2059_h_e_s?: number;
  site_suitability__hot_days_2040_to_2059_l_e_s?: number;
  site_suitability__average_hot_days_1990_to_2009?: number;
  site_suitability__change_in_hot_days_2040_to_2059_h_e_s?: number;
  site_suitability__change_in_hot_days_2040_to_2059_l_e_s?: number;
  site_suitability__average_temperature_1990_to_2009?: number;
  site_suitability__average_temperature_2040_to_2059_h_e_s?: number;
  site_suitability__average_temperature_2040_to_2059_l_e_s?: number;
  site_suitability__change_in_temperature_2040_to_2059_h_e_s?: number;
  site_suitability__change_in_temperature_2040_to_2059_l_e_s?: number;
  site_suitability__annual_rainfall_2040_to_2059_h_e_s?: number;
  site_suitability__annual_rainfall_2040_to_2059_l_e_s?: number;
  site_suitability__average_annual_rainfall_1990_to_2009?: number;
  site_suitability__change_in_rainfall_2040_to_2059_h_e_s?: number;
  site_suitability__change_in_rainfall_2040_to_2059_l_e_s?: number;
  site_suitability__severe_fire_weather_days_1990_to_2009?: number;
  site_suitability__severe_fire_weather_days_2040_to_2059_h_e_s?: number;
  site_suitability__severe_fire_weather_days_2040_to_2059_l_e_s?: number;
  site_suitability__change_in_severe_fire_weather_days_2040_to_2059_h_e_s?: number;
  site_suitability__change_in_severe_fire_weather_days_2040_to_2059_l_e_s?: number;

  sustainability__urban_heat_island_temperature_2016?: number;

  livability__employment_2021_5km?: number;
  livability__employment_2036_5km?: number;
  livability__employment_2041_5km?: number;
  livability__employment_2021_400m?: number;
  livability__employment_2021_800m?: number;
  livability__employment_2036_400m?: number;
  livability__employment_2036_800m?: number;
  livability__employment_2041_400m?: number;
  livability__employment_2041_800m?: number;
  livability__population_2021_5km?: number;
  livability__population_2036_5km?: number;
  livability__population_2041_5km?: number;
  livability__population_2021_400m?: number;
  livability__population_2021_800m?: number;
  livability__population_2036_400m?: number;
  livability__population_2036_800m?: number;
  livability__population_2041_400m?: number;
  livability__population_2041_800m?: number;
  livability__occupied_private_dwellings_2021_5km?: number;
  livability__occupied_private_dwellings_2036_5km?: number;
  livability__occupied_private_dwellings_2041_5km?: number;
  livability__occupied_private_dwellings_2021_400m?: number;
  livability__occupied_private_dwellings_2021_800m?: number;
  livability__occupied_private_dwellings_2036_400m?: number;
  livability__occupied_private_dwellings_2036_800m?: number;
  livability__occupied_private_dwellings_2041_400m?: number;
  livability__occupied_private_dwellings_2041_800m?: number;
  livability__distance_nearest_museum?: number;
  livability__distance_nearest_library?: number;
  livability__distance_nearest_bus_stop?: number;
  livability__distance_nearest_hospital?: number;
  livability__distance_nearest_pre_school?: number;
  livability__distance_nearest_art_gallery?: number;
  livability__distance_nearest_high_school?: number;
  livability__distance_nearest_picnic_area?: number;
  livability__distance_nearest_post_office?: number;
  livability__distance_nearest_public_park?: number;
  livability__distance_nearest_ses_station?: number;
  livability__distance_nearest_fire_station?: number;
  livability__distance_nearest_rail_station?: number;
  livability__distance_nearest_sports_field?: number;
  livability__distance_nearest_medical_centre?: number;
  livability__distance_nearest_police_station?: number;
  livability__distance_nearest_primary_school?: number;
  livability__distance_nearest_industrial_zone?: number;
  livability__distance_nearest_shopping_centre?: number;
  livability__distance_nearest_childcare_centre?: number;
  livability__distance_nearest_ambulance_station?: number;
  livability__distance_nearest_community_amenity?: number;
  livability__distance_nearest_public_open_space?: number;
  livability__distance_nearest_green_grid_location?: number;
  livability__distance_nearest_emergency_service_station?: number;
  livability__distance_nearest_combined_primary_high_school?: number;
}

export interface PropertyFeatureProperties extends BasePropertyFields {
  site__address?: string;
  Site_Name?: string;
  site__multiple_addresses?: string;
  site__guras_id?: string;
  site__property_id?: string;
  site__valnet_lot_count?: number;
  site__dissolved_parcel_count?: number;
  site__related_lot_references?: string;
  site__valnet_property_status?: string;

  site_suitability__site_id?: string;
  site_suitability__bushfire_prone?: boolean;
  site_suitability__bushfire_risk?: string;
  site_suitability__bushfireFeatures?: unknown;
  site_suitability__floodFeatures?: unknown;
  site_suitability__tecFeatures?: unknown;
  site_suitability__biodiversityFeatures?: unknown;
  site_suitability__contaminationFeatures?: unknown;
  site_suitability__heritage_class?: string;
  site_suitability__property_value?: number;
  site_suitability__agency?: string;
  site_suitability__heritage_significance?: string;
  site_suitability__heritage_item?: string;
  site_suitability__heritageItems?: unknown;
  site_suitability__walking_catchments_low_and_mid_rise_housing?: string;
  site_suitability__transport_oriented_development?: string;

  livability__nearest_bus_stop_name?: string;
  livability__nearest_rail_station_name?: string;
  livability__nearest_primary_school_name?: string;
  livability__nearest_high_school_name?: string;
  livability__nearest_public_open_space_name?: string;
  livability__nearest_picnic_area_name?: string;
  livability__nearest_sports_field_name?: string;
}

export interface LotFeatureProperties extends BasePropertyFields {
  site__cad_id?: string;
  site__lot_number?: string;
  site__plan_label?: string;
  site__has_stratum?: boolean;
  site__plan_number?: string;
  site__class_subtype?: string;
  site__lot_reference?: string;
  site__stratum_level?: string;
  site__section_number?: string;
  site__ITS_title_status?: string;
  site__controlling_authority_oid?: string;

  fromLayer?: string;
  _layerId?: string;
}

export interface SourceFeatureProperties {
  fromLayer?: string;
  _layerId?: string;
}

export type FeatureProperties =
  | PropertyFeatureProperties
  | LotFeatureProperties
  | SourceFeatureProperties;

export interface PropertyMetadata {
  address?: string;
  area?: number;
  zone?: string;
  fsr?: number;
  hob?: number;
  [key: string]: unknown;
}

export interface PropertyMapData {
  geometry: import('@/types/api/arcgis').ArcGISGeometry | import('geojson').Geometry;
  address?: string;
}

export interface PropertyExtractionData {
  isMultipleProperties?: boolean;
  allProperties?: Array<Record<string, unknown>>;
  combinedGeometry?:
    | import('geojson').Geometry
    | import('geojson').Feature
    | import('geojson').FeatureCollection
    | string;
  developableArea?: Array<{ geometry?: import('geojson').Geometry }>;
  site_geometry?: unknown;
  [key: string]: unknown;
}
