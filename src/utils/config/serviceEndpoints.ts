export const SERVICE_ENDPOINTS = {
  SUBURBS: "https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Administrative_Boundaries_Theme/FeatureServer/2",
  LGA: "https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Administrative_Boundaries/MapServer/1",
  LALC: "https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Administrative_Boundaries_Theme/MapServer/1",
  SA2: "https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Administrative_Boundaries_Theme/FeatureServer/14",
  LGA_ADMIN_BOUNDARIES:
    "https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Administrative_Boundaries_Theme/FeatureServer/8",
  SUBURB_ADMIN_BOUNDARIES:
    "https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Administrative_Boundaries_Theme/FeatureServer/2",
  PROPERTY_SALES: "https://maps.six.nsw.gov.au/arcgis/rest/services/public/Valuation/MapServer",
  PROPERTY: "https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Land_Parcel_Property_Theme/FeatureServer/12",
  PLANNING_PORTAL:
    "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Principal_Planning/MapServer",
  FLOOD_EXTENTS: "https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/nsw_1aep_flood_extents/FeatureServer/0",
  FLOOD_COPERNICUS:
    "https://services9.arcgis.com/ZFlIzBMHgtgl0EYj/ArcGIS/rest/services/Copernicus%20Observed%20Flood%20Extents%2020200321/FeatureServer/0",
  FLOOD_EXTENT_2022:
    "https://portal.data.nsw.gov.au/arcgis/rest/services/dataenablement/FloodExtent_2022/FeatureServer/0",
  FLOOD_EXTENT_202210_MAP: "https://portal.data.nsw.gov.au/arcgis/rest/services/FloodExtent_202210/MapServer/0",
  FLOOD_EXTENT_202210_FEATURE: "https://portal.data.nsw.gov.au/arcgis/rest/services/FloodExtent_202210/FeatureServer/0",
  FLOOD_EXTENT_202207_MAP: "https://portal.data.nsw.gov.au/arcgis/rest/services/FloodExtent_202207/MapServer/0",
  FLOOD_EXTENT_202207_FEATURE: "https://portal.data.nsw.gov.au/arcgis/rest/services/FloodExtent_202207/FeatureServer/0",
  BUSHFIRE:
    "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Hazard/MapServer/229",
  BUSHFIRE_PRONE_LAND: "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Fire/BFPL/MapServer/0",
  AIRCRAFT_NOISE_RANDWICK:
    "https://mapservices.randwick.nsw.gov.au/arcgis/rest/services/intPlanning/AircraftNoiseANEF2039/MapServer/0",
  AIRCRAFT_NOISE_NSW:
    "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_SEPP/MapServer/280",
  BIODIVERSITY_VALUES: "https://www.lmbc.nsw.gov.au/arcgis/rest/services/BV/BiodiversityValues/MapServer/0",
  BIODIVERSITY_VALUES_BASE: "https://www.lmbc.nsw.gov.au/arcgis/rest/services/BV/BiodiversityValues/MapServer",
  HERITAGE:
    "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer/0",
  ACID_SULFATE_SOILS: "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/Protection/MapServer/1",
  PROTECTION_BASE: "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/Protection/MapServer",
  PLANNING_EPI_PRIMARY_BASE:
    "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer",
  PLANNING_PRINCIPAL_BASE:
    "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/Principal_Planning_Layers/MapServer",
  ELEVATION_CONTOURS: "https://spatial.industry.nsw.gov.au/arcgis/rest/services/PUBLIC/Contours/MapServer/0",
  ELEVATION_CONTOURS_BASE: "https://spatial.industry.nsw.gov.au/arcgis/rest/services/PUBLIC/Contours/MapServer",
  PROXY_MAIN: "https://proxy-server.jameswilliamstrutt.workers.dev",
  PROXY_TRANSPORT_1: "https://tp-proxy-1.jameswilliamstrutt.workers.dev",
  PROXY_TRANSPORT_2: "https://tp-proxy-2.jameswilliamstrutt.workers.dev",
  PROXY_TRANSPORT_3: "https://tp-proxy-3.jameswilliamstrutt.workers.dev",
  PROXY_TRANSPORT_4: "https://tp-proxy-4.jameswilliamstrutt.workers.dev",
  PROXY_TRANSPORT_5: "https://tp-proxy-5.jameswilliamstrutt.workers.dev",
  TRANSPORT_NSW_TRIP_PLANNER: "https://api.transport.nsw.gov.au/v1/tp",
  TRAIN_STATIONS: "https://portal.spatial.nsw.gov.au/server/rest/services/NSW_FOI_Transport_Facilities/FeatureServer/1",
  DA_API: "https://api.apps1.nsw.gov.au/eplanning/data/v0/OnlineDA",
  CDC_API: "https://api.apps1.nsw.gov.au/eplanning/data/v0/OnlineCDC",
  CONSTRUCTION_CERTIFICATE_API: "https://api.apps1.nsw.gov.au/eplanning/data/v0/OnlineCC",
  LAND_USE_PERMISSIBILITY_API: "https://api.apps1.nsw.gov.au/eplanning/data/v0/FetchEPILandUsePermissibility",
  NSW_PLANNING_API_BASE: "https://api.apps1.nsw.gov.au/planning/viewersf/V1/ePlanningApi",
  AMENITY_TRAIN_STATION:
    "https://portal.spatial.nsw.gov.au/server/rest/services/NSW_FOI_Transport_Facilities/FeatureServer/1/query",
  AMENITY_LIGHT_RAIL:
    "https://portal.spatial.nsw.gov.au/server/rest/services/NSW_FOI_Transport_Facilities/FeatureServer/3/query",
  AMENITY_FERRY_WHARF:
    "https://portal.spatial.nsw.gov.au/server/rest/services/NSW_FOI_Transport_Facilities/FeatureServer/4/query",
  AMENITY_PRIMARY_SCHOOL:
    "https://portal.spatial.nsw.gov.au/server/rest/services/NSW_FOI_Education_Facilities/FeatureServer/0/query",
  AMENITY_HIGH_SCHOOL:
    "https://portal.spatial.nsw.gov.au/server/rest/services/NSW_FOI_Education_Facilities/FeatureServer/2/query",
  AMENITY_UNIVERSITY:
    "https://portal.spatial.nsw.gov.au/server/rest/services/NSW_FOI_Education_Facilities/FeatureServer/5/query",
  AMENITY_TAFE:
    "https://portal.spatial.nsw.gov.au/server/rest/services/NSW_FOI_Education_Facilities/FeatureServer/4/query",
  AMENITY_AMBULANCE_STATION:
    "https://portal.spatial.nsw.gov.au/server/rest/services/NSW_FOI_Health_Facilities/FeatureServer/0/query",
  AMENITY_POLICE_STATION:
    "https://portal.spatial.nsw.gov.au/server/rest/services/NSW_FOI_Emergency_Service_Facilities/FeatureServer/1/query",
  AMENITY_FIRE_STATION:
    "https://portal.spatial.nsw.gov.au/server/rest/services/NSW_FOI_Emergency_Service_Facilities/FeatureServer/0/query",
  AMENITY_HOSPITAL:
    "https://portal.spatial.nsw.gov.au/server/rest/services/NSW_FOI_Health_Facilities/FeatureServer/1/query",
  AMENITY_AGED_CARE: "https://services.ga.gov.au/gis/rest/services/Foundation_Facilities_Points/MapServer/1/query",
  AMENITY_NURSING_HOME: "https://services.ga.gov.au/gis/rest/services/Foundation_Facilities_Points/MapServer/1/query",
  AMENITY_DISABILITY_SUPPORT:
    "https://services.ga.gov.au/gis/rest/services/Foundation_Facilities_Points/MapServer/1/query",
  AMENITY_INDIGENOUS_HEALTH:
    "https://services.ga.gov.au/gis/rest/services/Foundation_Facilities_Points/MapServer/1/query",
  AMENITY_PARK:
    "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Public_Spaces/MapServer/260/query",
  AMENITY_PUBLIC_FACILITIES:
    "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Public_Spaces/MapServer/261/query",
  AMENITY_SHOPPING_CENTRE:
    "https://portal.spatial.nsw.gov.au/server/rest/services/NSW_FOI_Retail_Services/FeatureServer/0/query",
  AMENITY_SHOP:
    "https://services-ap1.arcgis.com/iA7fZQOnjY9D67Zx/ArcGIS/rest/services/OSM_AU_Shops/FeatureServer/0/query",
  AMENITY_GREEN_GRID:
    "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Public_Spaces/MapServer/252/query",
  PLANNING_PORTAL_LAND_ZONE:
    "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Principal_Planning/MapServer/19",
  PLANNING_PORTAL_PUBLIC_SPACES:
    "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Public_Spaces/MapServer/260",
  PLANNING_PORTAL_FSR:
    "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Principal_Planning/MapServer/11",
  PLANNING_PORTAL_HOB:
    "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Principal_Planning/MapServer/14",
  PLANNING_PORTAL_LAND_RESERVATION:
    "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Principal_Planning/MapServer/24",
  CADASTRE: "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Common/Admin_3857/MapServer",
  CADASTRE_LOT: "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Common/Admin_3857/MapServer/9",
  CADASTRE_HISTORY: "https://portal.spatial.nsw.gov.au/server/rest/services/Cadastre_History/MapServer/3",
  TEC: "https://mapprod1.environment.nsw.gov.au/arcgis/rest/services/EDP/TECs_GreaterSydney/MapServer",
  KOALA_SIGHTINGS: "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/EDP/KoalaSpeciesSightings/MapServer",
  CONTAMINATION:
    "https://mapprod2.environment.nsw.gov.au/arcgis/rest/services/EPA/Contaminated_land_notified_sites/MapServer",
  GEOSCAPE: "https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/BLDS_Mar24_Geoscape/FeatureServer/0",
  OSM_BUILDINGS:
    "https://services-ap1.arcgis.com/iA7fZQOnjY9D67Zx/arcgis/rest/services/OSM_AU_Buildings/FeatureServer/0",
  ROAD_SEGMENT: "https://portal.data.nsw.gov.au/arcgis/rest/services/RoadSegment/MapServer",
  ROAD_LABELS: "https://maps.six.nsw.gov.au/arcgis/rest/services/sixmaps/LPI_RasterLabels_1/MapServer",
  LMR: "https://spatialportalarcgis.dpie.nsw.gov.au/sarcgis/rest/services/LMR/LMR/MapServer",
  EASEMENTS: "https://mapuat3.environment.nsw.gov.au/arcgis/rest/services/Common/Admin_3857/MapServer",
  POWER_LINES: "https://services.ga.gov.au/gis/rest/services/National_Electricity_Infrastructure/MapServer",
  LUAL: "https://services-ap1.arcgis.com/ug6sGLFkytbXYo4f/arcgis/rest/services/LUAL_Network_LV_Public/FeatureServer/0",
  LOOKUP: "https://services.arcgis.com/Gbs1D7TkFBVkx0Nz/ArcGIS/rest/services/LookUpNLive/FeatureServer/2",
  GPR: "https://arcgis.paggis.nsw.gov.au/arcgis/rest/services/GPR/GPR_shared/MapServer",
  POI: "https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_POI/MapServer",
  NSW_SIX_BOUNDARIES_STATE_ELECTORATE:
    "https://maps.six.nsw.gov.au/arcgis/rest/services/sixmaps/Boundaries/MapServer/3",
  NSW_SIX_BOUNDARIES_SUBURB: "https://maps.six.nsw.gov.au/arcgis/rest/services/sixmaps/Boundaries/MapServer/0",
  NSW_GEOCODED_ADDRESSING:
    "https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Geocoded_Addressing_Theme/FeatureServer/1",
  NSW_PROPERTY_ADDRESS_POLYGONS: "https://maps.six.nsw.gov.au/arcgis/rest/services/sixmaps/PropertyAddress/MapServer/3",
  LOT: "https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Land_Parcel_Property_Theme/FeatureServer/8",
  WATER_MAINS:
    "https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/NSW_Water_Sewer_Infrastructure/FeatureServer/13",
  SEWER_MAINS:
    "https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/NSW_Water_Sewer_Infrastructure/FeatureServer/11",
  ELECTRICITY_INFRASTRUCTURE:
    "https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/NSW_Electricity_Infrastructure/FeatureServer/0",
  ADDRESS_POINTS: "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Common/AddressSearch/MapServer/5",
  BUSHFIRE_BASE:
    "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Hazard/MapServer",
  ABS_CENSUS_2021:
    "https://services1.arcgis.com/vHnIGBHHqDR6y0CR/arcgis/rest/services/2021_ABS_General_Community_Profile/FeatureServer/0",
} as const;
