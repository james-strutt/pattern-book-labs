import type * as GeoJSON from "geojson";

export const FEATURE_PROP = {
  ID: "id",
  APP_ID: "appId",
  USAGE: "usage",
  PUBLIC: "public",
  LAYER_ID: "layerId",
  PROJECT_ID: "projectId",
  VERSION_ID: "versionId",

  PROPERTY: {
    SITE_ID: "site__id",
    ADDRESS: "site__address",
    SITE_NAME: "Site_Name",
    MULTIPLE_ADDRESSES: "site__multiple_addresses",
    GURAS_ID: "site__guras_id",
    PROPERTY_ID: "site__property_id",
    GEOMETRY: "site__geometry",

    VALNET_LOT_COUNT: "site__valnet_lot_count",
    DISSOLVED_PARCEL_COUNT: "site__dissolved_parcel_count",
    RELATED_LOT_REFERENCES: "site__related_lot_references",
    VALNET_PROPERTY_STATUS: "site__valnet_property_status",

    LGA: "site_suitability__LGA",
    AREA: "site_suitability__area",
    SUBURB: "site_suitability__suburb",
    SITE_SUITABILITY_SITE_ID: "site_suitability__site_id",
    SUITABILITY_ADDRESS: "site_suitability__address",
    LANDZONE: "site_suitability__landzone",
    ELECTORATE: "site_suitability__electorate",
    SITE_WIDTH: "site_suitability__site_width",
    SITE_LENGTH: "site_suitability__site_length",
    SIX_CITIES: "site_suitability__six_cities",
    FLOOD_PRONE: "site_suitability__flood_prone",
    FLOOD_SUMMARY: "site_suitability__floodSummary",
    BUSHFIRE_PRONE: "site_suitability__bushfire_prone",
    BUSHFIRE_RISK: "site_suitability__bushfire_risk",
    BUSHFIRE_SUMMARY: "site_suitability__bushfireSummary",
    BUSHFIRE_FEATURES: "site_suitability__bushfireFeatures",
    FLOOD_FEATURES: "site_suitability__floodFeatures",
    FLOOD_RISK_1IN100_FEATURES: "site_suitability__floodRisk1in100Features",
    FLOOD_1_AEP_PERCENTAGE: "site_suitability__flood_1_a_e_p",
    TEC_FEATURES: "site_suitability__tecFeatures",
    KOALA_SIGHTINGS_FEATURES: "site_suitability__koalaSightingsFeatures",
    BIODIVERSITY_FEATURES: "site_suitability__biodiversityFeatures",
    CONTAMINATION_FEATURES: "site_suitability__contaminationFeatures",
    CONTAMINATED_LAND: "site_suitability__contaminated_land",
    WATER_FEATURES: "site_suitability__waterFeatures",
    SEWER_FEATURES: "site_suitability__sewerFeatures",
    POWER_FEATURES: "site_suitability__powerFeatures",
    STRATA_STATUS: "site_suitability__strata_status",
    HERITAGE_CLASS: "site_suitability__heritage_class",
    PROPERTY_VALUE: "site_suitability__property_value",
    FLOORSPACE_RATIO: "site_suitability__floorspace_ratio",
    HOUSEHOLD_INCOME: "site_suitability__household_income",
    POPULATION_GROWTH: "site_suitability__population_growth",
    BUILDING_FOOTPRINT: "site_suitability__building_footprint",
    HEIGHT_OF_BUILDING: "site_suitability__height_of_building",
    NSW_GOVERNMENT_AGENCY: "site_suitability__NSW_government_agency",
    AGENCY: "site_suitability__agency",
    HERITAGE_SIGNIFICANCE: "site_suitability__heritage_significance",
    HERITAGE_ITEM: "site_suitability__heritage_item",
    HERITAGE_ITEMS: "site_suitability__heritageItems",
    VEGETATION_COVER_2016: "site_suitability__vegetation_cover_2016",
    BIODIVERSITY_SITE_AREA: "site_suitability__biodiversity_site_area",
    TREE_CANOPY_COVER_2016: "site_suitability__tree_canopy_cover_2016",
    BIODIVERSITY_PERCENTAGE: "site_suitability__biodiversity_percentage",
    NSW_GOVERNMENT_LAND_OWNER: "site_suitability__NSW_government_land_owner",
    PRINCIPAL_ZONE_IDENTIFIER: "site_suitability__principal_zone_identifier",
    CURRENT_GOVERNMENT_LAND_USE: "site_suitability__current_government_land_use",
    POTENTIAL_LAND_USE: "potential_land_use",
    FUTURE_REQUIREMENTS: "future_requirements",
    TIMING: "timing",
    THEORETICAL_GROSS_FLOOR_AREA: "site_suitability__theoretical_gross_floor_area",
    LOCAL_ABORIGINAL_LAND_COUNCIL_BOUNDARY: "site_suitability__local_aboriginal_land_council_boundary",
    WALKING_CATCHMENTS_LOW_AND_MID_RISE_HOUSING: "site_suitability__walking_catchments_low_and_mid_rise_housing",
    TRANSPORT_ORIENTED_DEVELOPMENT: "site_suitability__transport_oriented_development",
    TRANSPORT_ORIENTED_DEVELOPMENT_PRECINCTS: "site_suitability__transport_oriented_development_precincts",
    TRANSPORT_ORIENTED_DEVELOPMENT_REZONING_SITES: "site_suitability__transport_oriented_development_rezoning_sites",

    PUBLIC_TRANSPORT_ACCESS_LEVEL_AM: "site_suitability__public_transport_access_level_AM",
    PUBLIC_TRANSPORT_ACCESS_LEVEL_PM: "site_suitability__public_transport_access_level_PM",

    HOT_DAYS_2040_TO_2059_H_E_S: "site_suitability__hot_days_2040_to_2059_h_e_s",
    HOT_DAYS_2040_TO_2059_L_E_S: "site_suitability__hot_days_2040_to_2059_l_e_s",
    AVERAGE_HOT_DAYS_1990_TO_2009: "site_suitability__average_hot_days_1990_to_2009",
    CHANGE_IN_HOT_DAYS_2040_TO_2059_H_E_S: "site_suitability__change_in_hot_days_2040_to_2059_h_e_s",
    CHANGE_IN_HOT_DAYS_2040_TO_2059_L_E_S: "site_suitability__change_in_hot_days_2040_to_2059_l_e_s",

    AVERAGE_TEMPERATURE_1990_TO_2009: "site_suitability__average_temperature_1990_to_2009",
    AVERAGE_TEMPERATURE_2040_TO_2059_H_E_S: "site_suitability__average_temperature_2040_to_2059_h_e_s",
    AVERAGE_TEMPERATURE_2040_TO_2059_L_E_S: "site_suitability__average_temperature_2040_to_2059_l_e_s",
    CHANGE_IN_TEMPERATURE_2040_TO_2059_H_E_S: "site_suitability__change_in_temperature_2040_to_2059_h_e_s",
    CHANGE_IN_TEMPERATURE_2040_TO_2059_L_E_S: "site_suitability__change_in_temperature_2040_to_2059_l_e_s",

    ANNUAL_RAINFALL_2040_TO_2059_H_E_S: "site_suitability__annual_rainfall_2040_to_2059_h_e_s",
    ANNUAL_RAINFALL_2040_TO_2059_L_E_S: "site_suitability__annual_rainfall_2040_to_2059_l_e_s",
    AVERAGE_ANNUAL_RAINFALL_1990_TO_2009: "site_suitability__average_annual_rainfall_1990_to_2009",
    CHANGE_IN_RAINFALL_2040_TO_2059_H_E_S: "site_suitability__change_in_rainfall_2040_to_2059_h_e_s",
    CHANGE_IN_RAINFALL_2040_TO_2059_L_E_S: "site_suitability__change_in_rainfall_2040_to_2059_l_e_s",

    SEVERE_FIRE_WEATHER_DAYS_1990_TO_2009: "site_suitability__severe_fire_weather_days_1990_to_2009",
    SEVERE_FIRE_WEATHER_DAYS_2040_TO_2059_H_E_S: "site_suitability__severe_fire_weather_days_2040_to_2059_h_e_s",
    SEVERE_FIRE_WEATHER_DAYS_2040_TO_2059_L_E_S: "site_suitability__severe_fire_weather_days_2040_to_2059_l_e_s",
    CHANGE_IN_SEVERE_FIRE_WEATHER_DAYS_2040_TO_2059_H_E_S:
      "site_suitability__change_in_severe_fire_weather_days_2040_to_2059_h_e_s",
    CHANGE_IN_SEVERE_FIRE_WEATHER_DAYS_2040_TO_2059_L_E_S:
      "site_suitability__change_in_severe_fire_weather_days_2040_to_2059_l_e_s",

    URBAN_HEAT_ISLAND_TEMPERATURE_2016: "sustainability__urban_heat_island_temperature_2016",

    EMPLOYMENT_2021_5KM: "livability__employment_2021_5km",
    EMPLOYMENT_2036_5KM: "livability__employment_2036_5km",
    EMPLOYMENT_2041_5KM: "livability__employment_2041_5km",
    EMPLOYMENT_2021_400M: "livability__employment_2021_400m",
    EMPLOYMENT_2021_800M: "livability__employment_2021_800m",
    EMPLOYMENT_2036_400M: "livability__employment_2036_400m",
    EMPLOYMENT_2036_800M: "livability__employment_2036_800m",
    EMPLOYMENT_2041_400M: "livability__employment_2041_400m",
    EMPLOYMENT_2041_800M: "livability__employment_2041_800m",

    POPULATION_2021_5KM: "livability__population_2021_5km",
    POPULATION_2036_5KM: "livability__population_2036_5km",
    POPULATION_2041_5KM: "livability__population_2041_5km",
    POPULATION_2021_400M: "livability__population_2021_400m",
    POPULATION_2021_800M: "livability__population_2021_800m",
    POPULATION_2036_400M: "livability__population_2036_400m",
    POPULATION_2036_800M: "livability__population_2036_800m",
    POPULATION_2041_400M: "livability__population_2041_400m",
    POPULATION_2041_800M: "livability__population_2041_800m",

    OCCUPIED_PRIVATE_DWELLINGS_2021_5KM: "livability__occupied_private_dwellings_2021_5km",
    OCCUPIED_PRIVATE_DWELLINGS_2036_5KM: "livability__occupied_private_dwellings_2036_5km",
    OCCUPIED_PRIVATE_DWELLINGS_2041_5KM: "livability__occupied_private_dwellings_2041_5km",
    OCCUPIED_PRIVATE_DWELLINGS_2021_400M: "livability__occupied_private_dwellings_2021_400m",
    OCCUPIED_PRIVATE_DWELLINGS_2021_800M: "livability__occupied_private_dwellings_2021_800m",
    OCCUPIED_PRIVATE_DWELLINGS_2036_400M: "livability__occupied_private_dwellings_2036_400m",
    OCCUPIED_PRIVATE_DWELLINGS_2036_800M: "livability__occupied_private_dwellings_2036_800m",
    OCCUPIED_PRIVATE_DWELLINGS_2041_400M: "livability__occupied_private_dwellings_2041_400m",
    OCCUPIED_PRIVATE_DWELLINGS_2041_800M: "livability__occupied_private_dwellings_2041_800m",

    DISTANCE_NEAREST_MUSEUM: "livability__distance_nearest_museum",
    DISTANCE_NEAREST_LIBRARY: "livability__distance_nearest_library",
    DISTANCE_NEAREST_BUS_STOP: "livability__distance_nearest_bus_stop",
    DISTANCE_NEAREST_HOSPITAL: "livability__distance_nearest_hospital",
    DISTANCE_NEAREST_PRE_SCHOOL: "livability__distance_nearest_pre_school",
    DISTANCE_NEAREST_ART_GALLERY: "livability__distance_nearest_art_gallery",
    DISTANCE_NEAREST_HIGH_SCHOOL: "livability__distance_nearest_high_school",
    DISTANCE_NEAREST_PICNIC_AREA: "livability__distance_nearest_picnic_area",
    DISTANCE_NEAREST_POST_OFFICE: "livability__distance_nearest_post_office",
    DISTANCE_NEAREST_PUBLIC_PARK: "livability__distance_nearest_public_park",
    DISTANCE_NEAREST_SES_STATION: "livability__distance_nearest_ses_station",
    DISTANCE_NEAREST_FIRE_STATION: "livability__distance_nearest_fire_station",
    DISTANCE_NEAREST_RAIL_STATION: "livability__distance_nearest_rail_station",
    DISTANCE_NEAREST_SPORTS_FIELD: "livability__distance_nearest_sports_field",
    DISTANCE_NEAREST_MEDICAL_CENTRE: "livability__distance_nearest_medical_centre",
    DISTANCE_NEAREST_POLICE_STATION: "livability__distance_nearest_police_station",
    DISTANCE_NEAREST_PRIMARY_SCHOOL: "livability__distance_nearest_primary_school",
    DISTANCE_NEAREST_INDUSTRIAL_ZONE: "livability__distance_nearest_industrial_zone",
    DISTANCE_NEAREST_SHOPPING_CENTRE: "livability__distance_nearest_shopping_centre",
    DISTANCE_NEAREST_CHILDCARE_CENTRE: "livability__distance_nearest_childcare_centre",
    DISTANCE_NEAREST_AMBULANCE_STATION: "livability__distance_nearest_ambulance_station",
    DISTANCE_NEAREST_COMMUNITY_AMENITY: "livability__distance_nearest_community_amenity",
    DISTANCE_NEAREST_PUBLIC_OPEN_SPACE: "livability__distance_nearest_public_open_space",
    DISTANCE_NEAREST_GREEN_GRID_LOCATION: "livability__distance_nearest_green_grid_location",
    DISTANCE_NEAREST_EMERGENCY_SERVICE_STATION: "livability__distance_nearest_emergency_service_station",
    DISTANCE_NEAREST_COMBINED_PRIMARY_HIGH_SCHOOL: "livability__distance_nearest_combined_primary_high_school",

    NAME_NEAREST_BUS_STOP: "livability__nearest_bus_stop_name",
    NAME_NEAREST_RAIL_STATION: "livability__nearest_rail_station_name",
    NAME_NEAREST_PRIMARY_SCHOOL: "livability__nearest_primary_school_name",
    NAME_NEAREST_HIGH_SCHOOL: "livability__nearest_high_school_name",
    NAME_NEAREST_PUBLIC_OPEN_SPACE: "livability__nearest_public_open_space_name",
    NAME_NEAREST_PICNIC_AREA: "livability__nearest_picnic_area_name",
    NAME_NEAREST_SPORTS_FIELD: "livability__nearest_sports_field_name",

    TOD_PRECINCT: "site__tod_precinct",
    LMR_CATCHMENT: "site__lmr_catchment",
    SEPP_OVERRIDE: "site__sepp_override",

    VACANT_STATUS: "site_suitability__vacant_status",
    STREET_VIEW_DATE: "site_suitability__street_view_date",
    STREET_VIEW_URL: "site_suitability__street_view_url",

    GEOSCAPE_FEATURES: "site_suitability__geoscapeFeatures",
    BUILDINGS_FEATURES: "site_suitability__buildingsFeatures",

    PROPID: "propid",
    SITE_PROPID: "site__propid",
    RELATED_PROPIDS: "site__related_propids",
    PROP_ID: "propId",
    ESTIMATED_GFA: "estimated_gfa",
    ZONE: "zone",
    NAME: "name",
    BP_ADDRESS: "bp_address",
    LATEST_SALE_PRICE: "latest_sale_price",
    LAND_RESERVATION_FEATURES: "landReservationFeatures",
  },

  SALE: {
    PRICE: "price",
    DATE: "sale_date",
  },

  ASSESS: {
    LAND_USE: "land_use",
    FUTURE_REQUIREMENTS: "future_requirements",
    TIMING: "timing",
    ATTACHMENTS: "attachments",
  },

  SCENARIO: {
    DEVELOPMENT_YIELD: "developmentYield",
    RESIDUAL_LAND_VALUE: "residualLandValue",
    RESIDUAL_LAND_VALUE_PER_M2: "residualLandValuePerM2",
    FEASIBILITY_STATUS: "feasibilityStatus",
    IS_OPEN_SPACE: "isOpenSpace",
    LANDSCAPE_TYPE: "landscapeType",
  },

  INTERNAL: {
    COPIED_FROM: "copiedFrom",
    SOURCE_FEATURE_PROPERTIES: "sourceFeatureProperties",
    PROJECTED_FEATURE_INDEX: "ix",
  },

  LOT: {
    SITE_ID: "site__id",
    CAD_ID: "site__cad_id",
    LOT_NUMBER: "site__lot_number",
    PLAN_LABEL: "site__plan_label",
    HAS_STRATUM: "site__has_stratum",
    PLAN_NUMBER: "site__plan_number",
    CLASS_SUBTYPE: "site__class_subtype",
    LOT_REFERENCE: "site__lot_reference",
    STRATUM_LEVEL: "site__stratum_level",
    SECTION_NUMBER: "site__section_number",
    ITS_TITLE_STATUS: "site__ITS_title_status",
    CONTROLLING_AUTHORITY_OID: "site__controlling_authority_oid",
    GEOMETRY: "site__geometry",

    LGA: "site_suitability__LGA",
    AREA: "site_suitability__area",
    SUBURB: "site_suitability__suburb",
    LANDZONE: "site_suitability__landzone",
    ELECTORATE: "site_suitability__electorate",
    SITE_WIDTH: "site_suitability__site_width",
    SITE_LENGTH: "site_suitability__site_length",
    SIX_CITIES: "site_suitability__six_cities",
    FLOOD_PRONE: "site_suitability__flood_prone",
    FLOOD_1_AEP_PERCENTAGE: "site_suitability__flood_1_a_e_p",
    STRATA_STATUS: "site_suitability__strata_status",
    FLOORSPACE_RATIO: "site_suitability__floorspace_ratio",
    HOUSEHOLD_INCOME: "site_suitability__household_income",
    POPULATION_GROWTH: "site_suitability__population_growth",
    BUILDING_FOOTPRINT: "site_suitability__building_footprint",
    HEIGHT_OF_BUILDING: "site_suitability__height_of_building",
    NSW_GOVERNMENT_AGENCY: "site_suitability__NSW_government_agency",
    VEGETATION_COVER_2016: "site_suitability__vegetation_cover_2016",
    BIODIVERSITY_SITE_AREA: "site_suitability__biodiversity_site_area",
    TREE_CANOPY_COVER_2016: "site_suitability__tree_canopy_cover_2016",
    BIODIVERSITY_PERCENTAGE: "site_suitability__biodiversity_percentage",
    NSW_GOVERNMENT_LAND_OWNER: "site_suitability__NSW_government_land_owner",
    PRINCIPAL_ZONE_IDENTIFIER: "site_suitability__principal_zone_identifier",
    CURRENT_GOVERNMENT_LAND_USE: "site_suitability__current_government_land_use",
    POTENTIAL_LAND_USE: "potential_land_use",
    FUTURE_REQUIREMENTS: "future_requirements",
    TIMING: "timing",
    THEORETICAL_GROSS_FLOOR_AREA: "site_suitability__theoretical_gross_floor_area",
    LOCAL_ABORIGINAL_LAND_COUNCIL_BOUNDARY: "site_suitability__local_aboriginal_land_council_boundary",
    TRANSPORT_ORIENTED_DEVELOPMENT_REZONING_SITES: "site_suitability__transport_oriented_development_rezoning_sites",

    PUBLIC_TRANSPORT_ACCESS_LEVEL_AM: "site_suitability__public_transport_access_level_AM",
    PUBLIC_TRANSPORT_ACCESS_LEVEL_PM: "site_suitability__public_transport_access_level_PM",

    HOT_DAYS_2040_TO_2059_H_E_S: "site_suitability__hot_days_2040_to_2059_h_e_s",
    HOT_DAYS_2040_TO_2059_L_E_S: "site_suitability__hot_days_2040_to_2059_l_e_s",
    AVERAGE_HOT_DAYS_1990_TO_2009: "site_suitability__average_hot_days_1990_to_2009",
    CHANGE_IN_HOT_DAYS_2040_TO_2059_H_E_S: "site_suitability__change_in_hot_days_2040_to_2059_h_e_s",
    CHANGE_IN_HOT_DAYS_2040_TO_2059_L_E_S: "site_suitability__change_in_hot_days_2040_to_2059_l_e_s",

    AVERAGE_TEMPERATURE_1990_TO_2009: "site_suitability__average_temperature_1990_to_2009",
    AVERAGE_TEMPERATURE_2040_TO_2059_H_E_S: "site_suitability__average_temperature_2040_to_2059_h_e_s",
    AVERAGE_TEMPERATURE_2040_TO_2059_L_E_S: "site_suitability__average_temperature_2040_to_2059_l_e_s",
    CHANGE_IN_TEMPERATURE_2040_TO_2059_H_E_S: "site_suitability__change_in_temperature_2040_to_2059_h_e_s",
    CHANGE_IN_TEMPERATURE_2040_TO_2059_L_E_S: "site_suitability__change_in_temperature_2040_to_2059_l_e_s",

    ANNUAL_RAINFALL_2040_TO_2059_H_E_S: "site_suitability__annual_rainfall_2040_to_2059_h_e_s",
    ANNUAL_RAINFALL_2040_TO_2059_L_E_S: "site_suitability__annual_rainfall_2040_to_2059_l_e_s",
    AVERAGE_ANNUAL_RAINFALL_1990_TO_2009: "site_suitability__average_annual_rainfall_1990_to_2009",
    CHANGE_IN_RAINFALL_2040_TO_2059_H_E_S: "site_suitability__change_in_rainfall_2040_to_2059_h_e_s",
    CHANGE_IN_RAINFALL_2040_TO_2059_L_E_S: "site_suitability__change_in_rainfall_2040_to_2059_l_e_s",

    SEVERE_FIRE_WEATHER_DAYS_1990_TO_2009: "site_suitability__severe_fire_weather_days_1990_to_2009",
    SEVERE_FIRE_WEATHER_DAYS_2040_TO_2059_H_E_S: "site_suitability__severe_fire_weather_days_2040_to_2059_h_e_s",
    SEVERE_FIRE_WEATHER_DAYS_2040_TO_2059_L_E_S: "site_suitability__severe_fire_weather_days_2040_to_2059_l_e_s",
    CHANGE_IN_SEVERE_FIRE_WEATHER_DAYS_2040_TO_2059_H_E_S:
      "site_suitability__change_in_severe_fire_weather_days_2040_to_2059_h_e_s",
    CHANGE_IN_SEVERE_FIRE_WEATHER_DAYS_2040_TO_2059_L_E_S:
      "site_suitability__change_in_severe_fire_weather_days_2040_to_2059_l_e_s",

    URBAN_HEAT_ISLAND_TEMPERATURE_2016: "sustainability__urban_heat_island_temperature_2016",

    EMPLOYMENT_2021_5KM: "livability__employment_2021_5km",
    EMPLOYMENT_2036_5KM: "livability__employment_2036_5km",
    EMPLOYMENT_2041_5KM: "livability__employment_2041_5km",
    EMPLOYMENT_2021_400M: "livability__employment_2021_400m",
    EMPLOYMENT_2021_800M: "livability__employment_2021_800m",
    EMPLOYMENT_2036_400M: "livability__employment_2036_400m",
    EMPLOYMENT_2036_800M: "livability__employment_2036_800m",
    EMPLOYMENT_2041_400M: "livability__employment_2041_400m",
    EMPLOYMENT_2041_800M: "livability__employment_2041_800m",

    POPULATION_2021_5KM: "livability__population_2021_5km",
    POPULATION_2036_5KM: "livability__population_2036_5km",
    POPULATION_2041_5KM: "livability__population_2041_5km",
    POPULATION_2021_400M: "livability__population_2021_400m",
    POPULATION_2021_800M: "livability__population_2021_800m",
    POPULATION_2036_400M: "livability__population_2036_400m",
    POPULATION_2036_800M: "livability__population_2036_800m",
    POPULATION_2041_400M: "livability__population_2041_400m",
    POPULATION_2041_800M: "livability__population_2041_800m",

    OCCUPIED_PRIVATE_DWELLINGS_2021_5KM: "livability__occupied_private_dwellings_2021_5km",
    OCCUPIED_PRIVATE_DWELLINGS_2036_5KM: "livability__occupied_private_dwellings_2036_5km",
    OCCUPIED_PRIVATE_DWELLINGS_2041_5KM: "livability__occupied_private_dwellings_2041_5km",
    OCCUPIED_PRIVATE_DWELLINGS_2021_400M: "livability__occupied_private_dwellings_2021_400m",
    OCCUPIED_PRIVATE_DWELLINGS_2021_800M: "livability__occupied_private_dwellings_2021_800m",
    OCCUPIED_PRIVATE_DWELLINGS_2036_400M: "livability__occupied_private_dwellings_2036_400m",
    OCCUPIED_PRIVATE_DWELLINGS_2036_800M: "livability__occupied_private_dwellings_2036_800m",
    OCCUPIED_PRIVATE_DWELLINGS_2041_400M: "livability__occupied_private_dwellings_2041_400m",
    OCCUPIED_PRIVATE_DWELLINGS_2041_800M: "livability__occupied_private_dwellings_2041_800m",

    DISTANCE_NEAREST_MUSEUM: "livability__distance_nearest_museum",
    DISTANCE_NEAREST_LIBRARY: "livability__distance_nearest_library",
    DISTANCE_NEAREST_BUS_STOP: "livability__distance_nearest_bus_stop",
    DISTANCE_NEAREST_HOSPITAL: "livability__distance_nearest_hospital",
    DISTANCE_NEAREST_PRE_SCHOOL: "livability__distance_nearest_pre_school",
    DISTANCE_NEAREST_ART_GALLERY: "livability__distance_nearest_art_gallery",
    DISTANCE_NEAREST_HIGH_SCHOOL: "livability__distance_nearest_high_school",
    DISTANCE_NEAREST_PICNIC_AREA: "livability__distance_nearest_picnic_area",
    DISTANCE_NEAREST_POST_OFFICE: "livability__distance_nearest_post_office",
    DISTANCE_NEAREST_PUBLIC_PARK: "livability__distance_nearest_public_park",
    DISTANCE_NEAREST_SES_STATION: "livability__distance_nearest_ses_station",
    DISTANCE_NEAREST_FIRE_STATION: "livability__distance_nearest_fire_station",
    DISTANCE_NEAREST_RAIL_STATION: "livability__distance_nearest_rail_station",
    DISTANCE_NEAREST_SPORTS_FIELD: "livability__distance_nearest_sports_field",
    DISTANCE_NEAREST_MEDICAL_CENTRE: "livability__distance_nearest_medical_centre",
    DISTANCE_NEAREST_POLICE_STATION: "livability__distance_nearest_police_station",
    DISTANCE_NEAREST_PRIMARY_SCHOOL: "livability__distance_nearest_primary_school",
    DISTANCE_NEAREST_INDUSTRIAL_ZONE: "livability__distance_nearest_industrial_zone",
    DISTANCE_NEAREST_SHOPPING_CENTRE: "livability__distance_nearest_shopping_centre",
    DISTANCE_NEAREST_CHILDCARE_CENTRE: "livability__distance_nearest_childcare_centre",
    DISTANCE_NEAREST_AMBULANCE_STATION: "livability__distance_nearest_ambulance_station",
    DISTANCE_NEAREST_COMMUNITY_AMENITY: "livability__distance_nearest_community_amenity",
    DISTANCE_NEAREST_PUBLIC_OPEN_SPACE: "livability__distance_nearest_public_open_space",
    DISTANCE_NEAREST_GREEN_GRID_LOCATION: "livability__distance_nearest_green_grid_location",
    DISTANCE_NEAREST_EMERGENCY_SERVICE_STATION: "livability__distance_nearest_emergency_service_station",
    DISTANCE_NEAREST_COMBINED_PRIMARY_HIGH_SCHOOL: "livability__distance_nearest_combined_primary_high_school",

    FROM_LAYER: "fromLayer",
    LAYER_ID_INTERNAL: "_layerId",
  },

  SOURCE: {
    FROM_LAYER: "fromLayer",
    LAYER_ID: "_layerId",
  },
} as const;

export type FeaturePropKey =
  | (typeof FEATURE_PROP)[keyof typeof FEATURE_PROP]
  | (typeof FEATURE_PROP.PROPERTY)[keyof typeof FEATURE_PROP.PROPERTY]
  | (typeof FEATURE_PROP.LOT)[keyof typeof FEATURE_PROP.LOT]
  | (typeof FEATURE_PROP.SOURCE)[keyof typeof FEATURE_PROP.SOURCE]
  | (typeof FEATURE_PROP.SALE)[keyof typeof FEATURE_PROP.SALE]
  | (typeof FEATURE_PROP.ASSESS)[keyof typeof FEATURE_PROP.ASSESS]
  | (typeof FEATURE_PROP.SCENARIO)[keyof typeof FEATURE_PROP.SCENARIO]
  | (typeof FEATURE_PROP.INTERNAL)[keyof typeof FEATURE_PROP.INTERNAL];

export interface FeatureWithProperties extends GeoJSON.Feature {
  properties: {
    [key: string]: unknown;
    copiedFrom?: {
      [key: string]: unknown;
    };
    sourceFeatureProperties?: {
      [key: string]: unknown;
    };
  };
  sourceFeatureProperties?: {
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

function resolveFromFallbackChain(feature: FeatureWithProperties, key: string): unknown {
  const sources = [
    feature.properties?.[key],
    feature.properties?.copiedFrom?.[key],
    feature.properties?.sourceFeatureProperties?.[key],
    feature.sourceFeatureProperties?.[key],
    feature[key],
  ];

  for (const value of sources) {
    if (value === undefined) continue;
    return value;
  }

  return undefined;
}

export function getProp<T = unknown>(
  feature: FeatureWithProperties | null | undefined,
  key: string,
  defaultValue: T | null = null,
): T | null {
  if (!feature || !key) return defaultValue;

  const resolved = resolveFromFallbackChain(feature, key);
  return resolved === undefined ? defaultValue : (resolved as T);
}

export function getOptionalProp<T = unknown>(
  feature: FeatureWithProperties | null | undefined,
  key: string,
  fallback: T | null = null,
): T | null {
  return getProp(feature, key, fallback);
}

export function hasProp(feature: FeatureWithProperties | null | undefined, key: string): boolean {
  if (!feature || !key) return false;

  return resolveFromFallbackChain(feature, key) !== undefined;
}

export function getAllProps(feature: FeatureWithProperties | null | undefined): Record<string, unknown> {
  if (!feature) return {};

  const directProps = feature?.properties ?? {};
  const copiedFromProps = feature?.properties?.copiedFrom ?? {};
  const sourceProps = feature?.properties?.sourceFeatureProperties ?? {};
  const featureSourceProps = feature?.sourceFeatureProperties ?? {};

  return {
    ...directProps,
    ...copiedFromProps,
    ...sourceProps,
    ...featureSourceProps,
  };
}

export function extractLgaName(featureProperties: Record<string, unknown>): string {
  if (!featureProperties) return "";
  const feature = {
    properties: featureProperties,
  } as unknown as FeatureWithProperties;
  const value =
    getProp<string>(feature, FEATURE_PROP.PROPERTY.LGA) ??
    (featureProperties.lga as string) ??
    (featureProperties.LGA_NAME as string);
  return value ? String(value) : "";
}
