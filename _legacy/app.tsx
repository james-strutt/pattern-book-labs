import { giraffeState, rpc } from "@gi-nx/iframe-sdk";                                       // Giraffe SDK bridge: global state store + RPC invoker
import { useGiraffeState } from "@gi-nx/iframe-sdk-react";                                   // React hook that subscribes to Giraffe state keys
import type { Feature } from "geojson";                                                      // GeoJSON Feature type used across the app
import { chunk, groupBy, isEqual, uniq } from "lodash";                                      // Lodash helpers: batching, grouping, deep equality, dedupe
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"; // React primitives for state/lifecycle
import "simplebar-react/dist/simplebar.min.css";                                             // Global CSS for simplebar custom scrollbars
import { getReferenceGeoProject } from "./libs/feature";                                     // Builds a local projection anchored to the project origin
import { GeoCoordinate, RawSection, StackedPolygon, StackedSection } from "./libs/types";    // Domain geometry types
import { SortAndFilter, SortType } from "./types";                                           // UI sort/filter types for pattern list
import {                                                                                     
  getPatternStats,                                                              // Computes FSR/area/height stats for an evaluated pattern
  getRoadFeatures,                                                              // Projects road features into the local coordinate system
  getSideIndices,                                                               // Determines which polygon sides are front/rear/side
  getSiteFeatureByGeoCoord,                                                     // Resolves a clicked lng/lat to a site polygon
  getSiteFeatures,                                                              // Projects site layer features into local coordinates
  groupKeyForFlowInputKeys,                                                     // Builds a cache-friendly key from flow input properties
  persistEnvelopeSetbackParamsToStorage,                                        // Saves front/rear/side params to localStorage
  readEnvelopeSetbackParamsFromStorage,                                         // Reads front/rear/side params from localStorage
  setFlowPropertyOfFeature,                                                     // Attaches flow-input object onto a site feature
} from "./utils";                                                                                 

import {                                                                             
  DEFAULT_SLAB_THICKNESS,                                                       // Fallback slab thickness (m) used when feature lacks one
  GET_SITES_DEBOUNCE_MS,                                                        // Debounce window (ms) before re-computing site features
  INSTANT_POINT_LAYER_NAME,                                                     // Layer ID for the hidden "instant" anchor point
  MIN_GEOMETRY_DISTANCE,                                                        // Minimum geometric nudge to avoid z-fighting between stacked polys
  PATTERN_BOOK_SHORT_LIST,                                                      // Flow DAG id used for the shortlist evaluation pipeline
  PATTERN_LAYER_NAME,                                                           // Temp map layer name for rendered patterns
  PATTERN_MAIN_BATCH_SIZE,                                                      // Batch size for pattern evaluation RPC calls
  PATTERN_MAIN_SORT_OPTIONS,                                                    // Available sort options for the main pattern list
  SELECTED_SITE_LAYER_NAME,                                                     // Temp layer name for the single hovered/selected site
  SELECTED_SITES_LAYER_NAME,                                                    // Temp layer name for the multi-selection site set
  SITE_SETBACK_LAYER_NAME,                                                      // Temp layer name for setback polygons drawn around sites
} from "./constants";                                                                             
import { getValidPatternsForSitePlacement } from "./getValidPatternsForSitePlacement";    // Prefilters patterns by min width/depth/area per site
import Patterns from "./Patterns";                                              // Main patterns panel (list, sort, filter, place)
import ShortListPanel from "./ShortListPanel";                                  // Per-site shortlist panel shown when a site is selected
import SitesPanel from "./SitesPanel";                                          // Panel for choosing site/road layers and selecting sites

type BlockDefinition = {                                                        // Local type describing a pattern "block" bundle
  id: string;                                                                   // Unique block identifier
  features: Array<Feature & { _projected?: unknown }>;                          // Features with optional pre-projected geometry
};                                                                            

type GeoJsonLayer = {                                                           // Local type describing a selectable GeoJSON layer
  name: string;                                                                 // Human-readable layer name
  id: string;                                                                   // Layer id used by Giraffe RPCs
  isDrawing?: boolean;                                                          // Flag indicating an in-progress drawing layer
};                                                                                        

function Main() {                                                               // Root component for the Pattern Book app
  const callbackId = useRef();                                                  // Stores the mapbox mousedown listener id for teardown
  const blocks = useGiraffeState("blocks");                                     // Live map of currently loaded blocks in the host project

  const projectAppsByAppID = useGiraffeState("projectAppsByAppID");             // Project-level app configs keyed by app id
  const projectLayers = useGiraffeState("projectLayers");                       // All layers available in the current project
  const projectOrigin = useGiraffeState("projectOrigin");                       // Lng/lat origin used for local projection
  const mainRawSections = useGiraffeState("rawSections");                       // Raw (unevaluated) sections in the project

  const instantPointId = useMemo(() => {                                        // Look up the hidden instant-point feature id
    return mainRawSections.features.find(                                       // Search raw sections for the anchor
      (feature: any) => feature.properties.layerId === INSTANT_POINT_LAYER_NAME && feature.geometry.type === "Point", // Match by layer name + geometry type
    )?.properties.id;                                                           // Return its id (or undefined)
  }, [mainRawSections]);                                                        // Recompute when raw sections change

  const geoJsonLayers: GeoJsonLayer[] = useMemo(() => {                         // Build list of GeoJSON-backed layers for selection UI
    if (!projectLayers) return [];                                              // Bail out early if layers not loaded yet
    const layerNames = projectLayers.reduce(                                    // Reduce to only geojson-sourced layers
      (acc: { name: string; id: string }[], layer: any) => {                    // Accumulator holds name+id pairs
        return layer.layer_full?.vector_source?.type === "geojson"              // Keep layers whose vector source is geojson
          ? acc.concat({ name: layer.layer_full.name, id: layer.id })           // Append matching layer descriptor
          : acc;                                                                // Skip otherwise
      },                                                                        // End reducer callback
      [] as { name: string; id: string }[],                                     // Initial empty typed array
    );                                                                          // End reduce
    return layerNames;                                                          // Expose to consumers
  }, [projectLayers]);                                                          // Recompute on layer list change

  const [siteLayerId, setSiteLayerId] = useState<string | number | undefined>(undefined);  // Id of the selected site layer
  // @ts-ignore
  const [siteLayerContents, setSiteLayerContents] = useState<any>();             // Raw GeoJSON contents of the selected site layer
  const [roadContents, setRoadContents] = useState<{ features: any[] }>({        // Queried road features used for frontage detection
    features: [],                                                                // Initially empty until user requests a query
  });                                                                                                
  const [roadLayers, setRoadLayers] = useState<string[]>([]);                                      // Full list of road layer ids available in map style
  const [selectedRoadLayers, setSelectedRoadLayers] = useState<{ value: string; label: string }[]>([ // User-selected subset of road layers
    { value: "road-street", label: "road-street" },                              // Default pick: street roads
    { value: "road-secondary-tertiary", label: "road-secondary-tertiary" },      // Default pick: secondary/tertiary roads
  ]);                                                                                                

  const [siteFeatures, setSiteFeatures] = useState<StackedSection[]>([]);        // Projected + annotated site features ready for evaluation

  const [selectedSites, setSelectedSites] = useState<{ value: string; label: string }[]>([]);         // User-selected sites (for placement)

  const [cleanOldBlocks, setCleanOldBlocks] = useState(false);                                        // Toggle: delete existing blocks before importing new ones

  const [selectedSiteId, setSelectedSiteId] = useState<string | undefined>(undefined);                // Currently focused site id (drives ShortListPanel)

  const [geoJsonFeaturesForPattern, setGeoJsonFeaturesForPattern] = useState<Feature[]>([]);          // Buffered pattern features pushed to map temp layer
  const [geoJsonFeaturesForSiteSetback, setGeoJsonFeaturesForSiteSetback] = useState<Feature[]>([]);  // Buffered setback features pushed to map temp layer

  // NOTE: envelope setback parameters for frontages — persisted in localStorage
  const [params, setParams] = useState(readEnvelopeSetbackParamsFromStorage);   // Front/rear/side setbacks hydrated from localStorage

  useEffect(() => {                                                             // Persist setback params whenever they change
    persistEnvelopeSetbackParamsToStorage(params);                              // Write latest params back to localStorage
  }, [params]);                                                                 // Re-run on params change

  const ROAD_TEMP_LAYER = "Selected Roads";                                     // Constant temp layer name for the highlighted roads overlay

  useEffect(() => {                                                             // On mount: discover all road-type line layers in map style
    const fetchRoadLayers = async () => {                                       // Inner async fetcher
      const style = await rpc.invoke("getMapStyle");                            // Request the full mapbox style from Giraffe
      const layers = (style?.layers ?? [])                                      // Fall back to empty array if style missing
        .filter((l: any) => l.id.startsWith("road") && l.type === "line")       // Keep only road-prefixed line layers
        .map((l: any) => l.id);                                                 // Reduce to layer id strings
      setRoadLayers(layers);                                                    // Store in state for the UI selector
    };                                                                          // End fetchRoadLayers
    fetchRoadLayers();                                                          // Fire once on mount
  }, []);                                                                                             

  const handleUpdateRoads = useCallback(async () => {                           // Query and render the selected road layers
    const layerIds = selectedRoadLayers.map((l) => l.value);                    // Flatten selector options to raw ids
    if (!layerIds.length) return;                                               // No-op when nothing selected
    const features = await rpc.invoke("queryRenderedFeatures", [undefined, { layers: layerIds }]); // Ask Giraffe for rendered features from those layers
    const fc = { type: "FeatureCollection", features: features ?? [] };         // Wrap as a GeoJSON FeatureCollection
    setRoadContents(fc);                                                        // Store features for later frontage computation
    await rpc.invoke("removeTempLayer", [ROAD_TEMP_LAYER]);                     // Clear any previously drawn highlight layer
    await rpc.invoke("addTempLayerGeoJSON", [                                   // Redraw fresh highlight of the queried roads
      ROAD_TEMP_LAYER,                                                          // Layer name
      fc,                                                                       // FeatureCollection payload
      { type: "line", paint: { "line-color": "#ff0000", "line-width": 3 } },    // Red line paint style
    ]);                                                                         // End addTempLayerGeoJSON
  }, [selectedRoadLayers]);                                                     // Re-bind when selected road layers change

  const [projectBundle, setProjectBundle] = useState<any>({});                  // Raw bundle downloaded from the selected source project
  const [projectPatterns, setProjectPatterns] = useState<any>([]);              // Evaluated patterns derived from the bundle

  const [selectedPatternIds, setSelectedPatternIds] = useState<string[]>([]);   // NOTE: for now, patternId === blockId, but we could use the point id with differnet settings.

  const initTempLayer = useCallback(async () => {                               // One-time initialisation of temp layers on the map
    /* sites layer */                                                           // Group: the multi-selected sites overlay
    await rpc.invoke("removeTempLayer", [SELECTED_SITES_LAYER_NAME]);           // Tear down any stale layer first
    await rpc.invoke("addTempLayerGeoJSON", [                                   // Create an empty selected-sites layer
      SELECTED_SITES_LAYER_NAME,                                                // Layer id
      { type: "FeatureCollection", features: [] },                              // Empty collection
      null,                                                                     // No raw mapbox style override
      {                                                                         // Giraffe styling block
        mainLayer: "fill",                                                      // Render as filled polygons
        mainColor: { fixedValue: "#3CB371" },                                   // Sea-green fill colour
        fillOpacity: 0.2,                                                       // Light opacity so underlying basemap shows through
      },                                                                        
    ]);                                                                        
    /* site layer */                                                            // Group: the single hovered site overlay
    await rpc.invoke("removeTempLayer", [SELECTED_SITE_LAYER_NAME]);            // Tear down any stale layer first
    await rpc.invoke("addTempLayerGeoJSON", [                                   // Create an empty single-site layer
      SELECTED_SITE_LAYER_NAME,                                                 // Layer id
      { type: "FeatureCollection", features: [] },                              // Empty collection
      null,                                                                     // No raw mapbox style override
      {                                                                         // Giraffe styling block
        mainLayer: "fill",                                                      // Render as filled polygon
        mainColor: { fixedValue: "#40C4FF" },                                   // Light-blue fill colour
        fillOpacity: 0.2,                                                       // Light opacity
      },                                                                                              
    ]);                                                                                                

    /* setback layer */                                                         // Group: the setback polygon overlay
    await rpc.invoke("removeTempLayer", [SITE_SETBACK_LAYER_NAME]);             // Tear down any stale layer first
    await rpc.invoke("addTempLayerGeoJSON", [                                   // Create an empty setback layer
      SITE_SETBACK_LAYER_NAME,                                                  // Layer id
      { type: "FeatureCollection", features: [] },                              // Empty collection
      null,                                                                     // No raw mapbox style override
      {                                                                         // Giraffe styling block
        mainLayer: "fill",                                                      // Render as filled polygon
        showLines: true,                                                        // Also draw edge outlines
        mainColor: { fixedValue: "#3CB371" },                                   // Sea-green fill colour
        fillOpacity: 0.2,                                                       // Light opacity
      },                                                                                              
    ]);                                                                                                

    await rpc.invoke("addFlowDag", [PATTERN_BOOK_SHORT_LIST]);                  // Register the shortlist flow DAG with Giraffe
  }, []);                                                                       // Empty deps: init only once

  useEffect(() => {                                                             // Invoke initTempLayer on mount
    initTempLayer();                                                            // Kick off the initialisation
  }, [initTempLayer]);                                                          // Re-run if the callback identity changes

  useEffect(() => {                                                             // Register cleanup when the iframe is being closed
    const cleanup = () => {                                                     // Cleanup function invoked by Giraffe on close
      rpc.invoke("removeTempLayer", [ROAD_TEMP_LAYER]);                         // Remove the highlighted roads overlay
    };                                                                          // End cleanup
    giraffeState.addListener(["closingSignal"], cleanup);                       // Subscribe to Giraffe's closing signal
  }, []);                                                                       // Mount-only

  const getSites = useCallback(                                                 // Build/refresh site features from the current layer contents
    async (                                                                     // Inputs:
      siteLayerContents: any,                                                    //   raw geojson of the chosen site layer
      roadLayerContents: any,                                                    //   raw geojson of chosen road layers
      projectPatterns: any[],                                                    //   currently-loaded project patterns
      selectedBlockIds: string[],                                                //   blocks selected for placement
      params: { front: number; rear: number; side: number },                     //   setback parameters
    ) => {                                                                      // Body
      try {                                                                     // Guard against projection/evaluation failures
        if (!siteLayerContents?.features?.length) return;                       // No-op when no site features available

        const rotations = {} as Record<string, number>;                         // Per-pattern rotation lookup (id -> degrees)
        projectPatterns.forEach((pattern: any) => {                             // Populate rotations from each pattern's origin point
          const rotation = pattern.originPoint.properties.rotation;             // Read rotation off the origin point
          rotations[pattern.id] = rotation ?? 0;                                // Default to 0 when missing
        });                                                                     // End rotations loop

        const geoProject = getReferenceGeoProject(projectOrigin);               // Build projection anchored at project origin

        const siteFeatures: StackedSection[] = getSiteFeatures(siteLayerContents, geoProject);  // Project site features into local coords

        const roadFeatures: StackedSection[] = getRoadFeatures(roadLayerContents, geoProject);  // Project road features into local coords

        siteFeatures.forEach((feature, i) => {                                                  // Enrich each site with front/rear/side indices and flow
          const indices = getSideIndices(siteFeatures, roadFeatures, i);                        // Determine side orientation relative to nearest road

          setFlowPropertyOfFeature(feature, params, indices, selectedBlockIds, instantPointId, rotations, i); // Attach flow object to the feature
        });                                                                                            

        setSiteFeatures(siteFeatures);                                                     // Commit enriched site features to state
      } catch (e) {                                                                        // Catch and log any failure during projection/enrichment
        console.error("getting sites failed", e);                                          // Error log
      }                                                                                    // End try/catch
    },                                                                                     // End callback body
    [instantPointId, projectOrigin],                                                       // Re-bind when anchor point or origin changes
  );                                                                                       // End useCallback

  const clearSelectedSiteFeature = useCallback(async () => {                               // Reset the single hovered-site layer
    const geoJson = {                                                                      // Build an empty FeatureCollection
      type: "FeatureCollection",                                                           // GeoJSON type
      features: [],                                                                        // No features
    };                                                                                    
    await rpc.invoke("updateTempLayerGeoJSON", [SELECTED_SITE_LAYER_NAME, geoJson, true]); // Push empty collection to the map

    setSelectedSiteId(undefined);                                                          // Clear the focused site id locally
  }, []);                                                                                  // Mount-only closure
  const mouseEventHandler = useCallback(                                                   // Handles mousedown map events to select a site
    async (_evt: any, { data: dataS }: { data: string }) => {                              // Receives (key, event-object-with-string-data)
      if (!siteLayerContents?.features?.length) {                                          // Ignore clicks before a site layer is loaded
        return;                                                                            // Early exit
      }                                                                                    
      const geoProject = getReferenceGeoProject(projectOrigin);                            // Build projection anchored at project origin

      const data = JSON.parse(dataS);                                                      // Deserialise the event payload from string
      const { lng, lat } = data.mapboxEvent.lngLat;                                        // Extract lng/lat of the click
      const geoCoord = [lng, lat] as GeoCoordinate;                                        // Tuple form used by local helpers

      const siteFeature = getSiteFeatureByGeoCoord(siteFeatures, geoCoord, geoProject);    // Find which site polygon contains the click

      const coloredFeature = siteFeature                                                   // Build a recoloured clone for the hover layer
        ? {                                                                                // When a site was hit:
            ...siteFeature,                                                                // Clone base feature
            properties: {                                                                  // Override visual properties
              ...siteFeature.properties,                                                   // Keep existing properties
              id: `temp_${siteFeature.properties.id ?? siteFeature.properties["ID"]}`,     // Use a temp id to avoid colliding with real id
              flow: undefined,                                                             // Strip the flow so it renders as plain polygon
              color: "#40C4FF",                                                            // Hover blue fill
              strokeWidth: 2,                                                              // Visible outline width
              strokeColor: "#228B22",                                                      // Dark green outline
            },                                                                             // End property overrides
          }                                                                                // End mapped object
        : null;                                                                            // When click missed, produce null

      const geoJson = {                                                                    // Wrap the (optional) feature in a collection
        type: "FeatureCollection",                                                         // GeoJSON type
        features: coloredFeature ? [coloredFeature] : [],                                  // Either a single feature or empty
      };                                                                                   // End collection
      await rpc.invoke("updateTempLayerGeoJSON", [SELECTED_SITE_LAYER_NAME, geoJson, true]);  // Push the hover layer to the map

      setSelectedSiteId(siteFeature?.properties.id as string);                             // Update the focused site id (opens ShortListPanel)
    },                                                                                     // End handler body
    [projectOrigin, siteFeatures],                                                         // Re-bind when projection origin or sites change
  );                                                                                       // End useCallback

  useEffect(() => {                                                                        // Register the mousedown listener and wire it up
    rpc.invoke("addMapboxEventListener", ["mousedown", 100]).then((r) => {                 // Attach mousedown with 100ms throttle
      callbackId.current = r;                                                              // Remember the callback id for later removal
    });                                                                                    // End then
    giraffeState.addListener(["mapboxEvent"], mouseEventHandler);                          // Subscribe to Giraffe's forwarded mapbox events
    return () => {                                                                         // Teardown on unmount / deps change
      rpc.invoke("removeMapboxEventListener", [callbackId.current]);                       // Detach mousedown from mapbox
      giraffeState.removeListener(["mapboxEvent"]);                                        // Unsubscribe from Giraffe event state
    };                                                                                     // End cleanup
  }, [mouseEventHandler]);                                                                 // Re-run when handler identity changes

  const [sortType, setSortType] = useState<SortType>(PATTERN_MAIN_SORT_OPTIONS[0]);        // Current sort mode (default: first option)

  const [filter, setFilter] = useState<NonNullable<SortAndFilter["filter"]>>({             // Current filter state for the pattern list
    passedLandscape: true,                                                                 // Default: only show patterns that pass landscape checks
    passedBuilding: true,                                                                  // Default: only show patterns that pass building checks
    patternStyle: undefined,                                                               // No style filter by default
    patternParking: undefined,                                                             // No parking filter by default
  });                                                                                      // End default filter

  const updateSiteSetbackToTempLayer = useCallback(                                       // Helper: push setback features to the setback temp layer
    async (geoJsonFeatures: Feature[]) => {                                               // Input: array of setback features
      const geoJson = {                                                                   // Wrap in FeatureCollection shape
        type: "FeatureCollection",                                                        // GeoJSON type
        features: geoJsonFeatures,                                                        // Supplied features
        GiraffeProjectApp: projectBundle.projectApps[1],                                  // Attach the project app metadata
      };                                                                                  // End collection
      await rpc.invoke("updateTempLayerGeoJSON", [SITE_SETBACK_LAYER_NAME, geoJson, true]);  // Push to map
    },                                                                                    // End callback body
    [projectBundle.projectApps],                                                          // Re-bind on project app change
  );                                                                                      // End useCallback

  const updatePatternTempLayerGeoJSON = useCallback(                                      // Helper: push pattern features to the pattern temp layer
    async (geoJsonFeatures: Feature[]) => {                                               // Input: array of pattern features
      const geoJson = {                                                                   // Wrap in FeatureCollection shape
        type: "FeatureCollection",                                                        // GeoJSON type
        features: geoJsonFeatures,                                                        // Supplied features
        GiraffeProjectApp: projectBundle.projectApps[1],                                  // Attach the project app metadata
      };                                                                                  // End collection
      await rpc.invoke("updateTempLayerGeoJSON", [PATTERN_LAYER_NAME, geoJson, true]);    // Push to map
    },                                                                                    // End callback body
    [projectBundle.projectApps],                                                          // Re-bind on project app change
  );                                                                                                    
  /*
   * ─── Coordinate / feature "nudging" explained ───────────────────────────────────────────────
   *
   * Several places below apply a microscopic offset to a single vertex of a feature's geometry:
   *
   *     tweakedCoordinates[0][1][0] += MIN_GEOMETRY_DISTANCE * baseHeight;   // Polygon: ring[0], vertex[1], x
   *     tweakedCoordinates[1][0]    += MIN_GEOMETRY_DISTANCE * baseHeight;   // LineString: vertex[1], x
   *
   * MIN_GEOMETRY_DISTANCE is 1e-12 (in degrees of longitude). At ~111 km per degree of latitude,
   * that works out to roughly 1e-7 m ≈ 0.1 micrometres on the ground — far, far below any display
   * threshold. Visually, the nudged feature is indistinguishable from the un-nudged original.
   *
   * WHY we do this:
   *   1. Giraffe's `stackFeatures` / evaluator pipeline (and the downstream Mapbox fill-extrusion
   *      renderer) treats features with byte-identical coordinates as duplicates. Two slabs
   *      sitting on the exact same footprint can be deduped, merged, or Z-fight (flicker) when
   *      rendered as extruded polygons at different heights.
   *   2. Nudging one vertex by a sub-micrometre amount makes each slab's geometry *numerically*
   *      unique without changing what a user sees. The renderer keeps them as separate features
   *      and draws them in the correct base_height → height range.
   *
   * WHY it's scaled by `baseHeight`:
   *   - A constant nudge would only break ties between two features. Using `baseHeight` as the
   *     multiplier gives every level in a stack a *different* nudge (level 0 → 0, level 1 →
   *     floorToFloor × 1e-12, level 2 → 2·floorToFloor × 1e-12, etc.).
   *   - That produces a deterministic, monotonically-increasing offset per level, which also
   *     acts as a stable ordering tiebreaker when two features would otherwise sort equally.
   *
   * Two call sites use this:
   *   • The `noFacade` branch, which manually emits one slab per level and needs every level to
   *     be numerically distinct from every other level on the same footprint.
   *   • The `hasSameCoordinates` branch, which catches the case where `stackFeatures` already
   *     produced overlapping geometries (e.g. two usages stacked on top of each other) and
   *     offsets the later one so both survive into the final FeatureCollection.
   * ────────────────────────────────────────────────────────────────────────────────────────────
   */
  const updatePatternGeoJsonFeatures = useCallback(                                       // Converts evaluated stacked sections into flat geojson features
    async (featuresArray: StackedSection[][], geoJsonFeatures: Feature[]) => {            // Inputs: nested evaluated arrays + output accumulator
      const stackedSections = !featuresArray.length ? [] : await rpc.invoke("stackFeatures", [featuresArray[0]]); // Ask Giraffe to stack vertically
      const newGeoJsonFeatures: StackedSection[] = [];                                    // Collected output features for this call

      const usages = projectAppsByAppID[1]?.featureCategories?.usage ?? [];               // Lookup of usage metadata (colours, flags, etc.)

      stackedSections                                                                     // Iterate returned stacked sections
        .filter((e: any) => e.geometry.type !== "Point")                                  // Skip point-type results (origin markers)
        .forEach((feature: any) => {                                                      // Process each polygon/line section
          const coordinates = feature.geometry.coordinates;                               // Cache the coordinates reference
          let baseHeight = feature.properties._baseHeight;                                // Starting base elevation
          const height = feature.properties._height;                                      // Top elevation
          const usage = usages[feature.properties.usage];                                 // Usage metadata for this feature
          const noFacade = usage?.join?.noFacade;                                         // Flag: this usage omits facade geometry

          if (noFacade) {                                                                 // Branch: reconstruct per-level slabs manually
            const slabThickness = feature.properties.slabThickness ?? DEFAULT_SLAB_THICKNESS;  // Per-level slab thickness
            for (let i = 0; i < (feature.properties.levels ?? 1); i++) {                  // Emit one stacked slab per level
              const tweakedCoordinates = structuredClone(coordinates);                    // Clone to avoid mutating the source geometry
              if (feature.geometry.type === "Polygon") {                                  // For polygons: nudge second vertex of first ring
                tweakedCoordinates[0][1][0] += MIN_GEOMETRY_DISTANCE * baseHeight;        // Z-fight avoidance scaled by height
              } else {                                                                    // For non-polygon (lines): nudge index 1 of ring
                tweakedCoordinates[1][0] += MIN_GEOMETRY_DISTANCE * baseHeight;           // Same z-fight avoidance
              }                                                                           // End geometry branch

              newGeoJsonFeatures.push({                                                   // Push a new slab feature
                ...feature,                                                               // Clone base
                geometry: {                                                               // Override geometry
                  ...feature.geometry,                                                    // Preserve type
                  coordinates: tweakedCoordinates,                                        // Use nudged coords
                },                                                                        // End geometry
                properties: {                                                             // Override height props
                  ...feature.properties,                                                  // Keep existing props
                  base_height: baseHeight,                                                // Slab floor elevation
                  height: baseHeight + slabThickness,                                     // Slab top = base + slab thickness
                },                                                                        // End properties
              });                                                                                         

              baseHeight += feature.properties.floorToFloor;                              // Advance to next level
            }                                                                             // End level loop
          } else {                                                                        // Default branch: one feature per section
            const hasSameCoordinates = newGeoJsonFeatures.some((e) => isEqual(e.geometry.coordinates, coordinates)); // Detect duplicate geometry

            if (hasSameCoordinates) {                                                     // When a dup exists, nudge and re-push with overridden height
              // prevFeature.properties.height = height;                                  
              const tweakedCoordinates = structuredClone(coordinates);                    // Clone before mutating

              if (feature.geometry.type === "Polygon") {                                  // Polygon nudge
                tweakedCoordinates[0][1][0] += MIN_GEOMETRY_DISTANCE * baseHeight;        // Nudge by height
              } else {                                                                    // Non-polygon nudge
                tweakedCoordinates[1][0] += MIN_GEOMETRY_DISTANCE * baseHeight;           // Nudge by height
              }                                                                           

              newGeoJsonFeatures.push({                                                   // Push duplicate-offset feature
                ...feature,                                                               // Clone base
                geometry: {                                                               // Override geometry
                  ...feature.geometry,                                                    // Preserve type
                  coordinates: tweakedCoordinates,                                        // Use nudged coords
                },                                                                                        
                properties: {                                                             // Override elevations
                  ...feature.properties,                                                  // Keep existing props
                  base_height: baseHeight,                                                // Base elevation
                  height,                                                                 // Top elevation
                },                                                                                        
              });                                                                                          
            } else {                                                                      // No dup: push straight through
              newGeoJsonFeatures.push({                                                   // Push feature as-is (with height props)
                ...feature,                                                               // Clone base
                properties: {                                                             // Override elevations
                  ...feature.properties,                                                  // Keep existing props
                  base_height: baseHeight,                                                // Base elevation
                  height,                                                                 // Top elevation
                },                                                                                       
              });                                                                                          
            }                                                                                             
          }                                                                                               
        });                                                                                                

      geoJsonFeatures.push(...newGeoJsonFeatures);                                        // Append to caller's accumulator
    },                                                                                    
    [projectAppsByAppID],                                                                 // Re-bind when project app config changes
  );                                                                                                       

  const getShortListPatterns = useCallback(                                               // Evaluate patterns for all sites, batched + grouped
    async (siteFeatures: StackedSection[]) => {                                                         // Input: sites to evaluate
      const geoJsonFeaturesForPattern: Feature[] = [];                                                   // Output buffer: pattern features
      const geoJsonFeaturesForSiteSetback: Feature[] = [];                                              // Output buffer: setback features
      setPlacingPatterns(true);                                                                          // UI flag: block further placement
      setProgress(0);                                                                                     // Reset progress bar
      let index = 1;                                                                                      // Cumulative index for progress calculation

      const groupedSiteFeatures = groupBy(siteFeatures, (f) => groupKeyForFlowInputKeys(f));            // Group sites by identical flow inputs for reuse
      const startTime = performance.now();                                                                // Timing: start
      for (const group of Object.values(groupedSiteFeatures)) {                                           // Process each group independently
        // grouping by PATTERN_MAIN_BATCH_SIZE.                                                            // (Preserved: batching rationale)
        const batches = chunk(group, PATTERN_MAIN_BATCH_SIZE);                                            // Subdivide the group into RPC-sized batches

        for (const batch of batches) {                                                                    // Send one RPC per batch
          const firstFeature = structuredClone(batch[0]) as StackedPolygon;                              // Clone head feature to avoid mutation
          const otherFeatures = batch.filter((_f, i) => i !== 0) as StackedPolygon[];                    // Remaining features become children
          firstFeature.properties.childFeatures = otherFeatures;                                          // Attach children via props (batching trick)

          const rawEvaluatedFeatures = await rpc.invoke("evaluateFeatures", [[firstFeature]]);            // Invoke Giraffe's pattern evaluator

          const flattenedEvaluatedFeatures = Object.values(rawEvaluatedFeatures).flat() as StackedSection[]; // Flatten nested output to a single array

          const groupedEvaluatedFeaturesBySiteId = groupBy(flattenedEvaluatedFeatures, "properties.pattern.siteId"); // Split results per site

          const setbackFeatures = groupedEvaluatedFeaturesBySiteId["undefined"];                          // Features without siteId are setbacks
          geoJsonFeaturesForSiteSetback.push(...setbackFeatures);                                         // Collect them for the setback layer

          for (const siteEvaluatedFeatures of Object.values(groupedEvaluatedFeaturesBySiteId) as StackedSection[][]) { // Process each site's results
            try {                                                                                          // Isolate per-site failures
              const groupedEvaluatedFeaturesByPatternId = groupBy(siteEvaluatedFeatures, "properties.pattern.id"); // Sub-group by pattern id

              /* fsr & netArea stats (from main app, sometimes it is never calculated) */                // Backfill missing stats on patterns
              Object.values(groupedEvaluatedFeaturesByPatternId).forEach((features) => {                  // Iterate each pattern's feature set
                features.forEach((feature) => {                                                            // Iterate its features
                  if (feature.properties.pattern && feature.properties.pattern.area === undefined) {      // Only backfill when missing
                    const projectPattern = projectPatterns.find((e: any) => e.id === feature.properties.pattern.id); // Find matching project pattern
                    const area = projectPattern.stats.area;                                                // Re-use project-pattern area
                    const fsr = area / feature.properties.pattern.siteArea;                               // Derive FSR from site area
                    feature.properties.pattern.name = projectPattern.name;                                // Copy over pattern name
                    feature.properties.pattern.fsr = fsr;                                                  // Write derived FSR
                    feature.properties.pattern.area = area;                                                // Write derived area
                  }                                                                                         // End backfill check
                });                                                                                         // End inner loop
              });                                                                                            // End outer loop

              /* sort by selected sort type */                                                            // Order patterns per current sort
              const featuresArray = Object.keys(groupedEvaluatedFeaturesByPatternId)                      // Get pattern id keys
                .filter((key) => key !== "undefined")                                                      // Drop the setback bucket
                .map((key) => groupedEvaluatedFeaturesByPatternId[key])                                    // Expand keys to feature lists
                .sort((a, b) => b[0].properties.pattern[sortType] - a[0].properties.pattern[sortType]);   // Descending sort by chosen metric

              if (featuresArray.length > 0) {                                                              // When the best pattern exists:
                const minIx = Math.min(...featuresArray[0].map((e) => e.properties.ix ?? 0));              // Compute min index for rebasing
                featuresArray[0].forEach((e) => (e.properties.ix = e.properties.ix - minIx));              // Rebase ix so lowest is zero
              }                                                                                             // End rebasing branch

              await updatePatternGeoJsonFeatures(featuresArray, geoJsonFeaturesForPattern);               // Flatten + append into output buffer
            } catch (e) {                                                                                  // Per-site error handler
              console.error("getting shortlist patterns failed (evaluateFeatures) :", e);                 // Log and continue
            }                                                                                              // End try/catch
          }                                                                                                 // End per-site loop

          setProgress(Math.floor((index / siteFeatures.length) * 100));                                   // Update progress bar %
          index += batch.length;                                                                            // Advance cumulative index
        }                                                                                                   // End batch loop

        await updatePatternTempLayerGeoJSON(geoJsonFeaturesForPattern);                                    // Push incremental results to map
      }                                                                                                     // End group loop
      const endTime = performance.now();                                                                    // Timing: end
      console.log(`Time taken for batch ${index}: ${endTime - startTime} milliseconds`);                   // Log total duration

      await updateSiteSetbackToTempLayer(geoJsonFeaturesForSiteSetback);                                    // Push final setbacks to map

      setGeoJsonFeaturesForPattern(geoJsonFeaturesForPattern);                                              // Commit pattern buffer to state
      setGeoJsonFeaturesForSiteSetback(geoJsonFeaturesForSiteSetback);                                      // Commit setback buffer to state

      setPlacingPatterns(false);                                                                            // UI flag: evaluation done
    },                                                                                                       // End callback body
    [                                                                                                        // Dependency array:
      updateSiteSetbackToTempLayer,                                                                          //   setback push helper
      updatePatternTempLayerGeoJSON,                                                                         //   pattern push helper
      updatePatternGeoJsonFeatures,                                                                          //   pattern flattener
      projectPatterns,                                                                                       //   project patterns (for backfill)
      sortType,                                                                                              //   sort order
    ],                                                                                                        // End deps
  );                                                                                                          // End useCallback

  const updateSelectedSites = useCallback(                                                               // Redraw the multi-selected sites temp layer
    async (selectedSites: { value: string; label: string }[]) => {                                         // Input: selector options
      const selectedSiteFeatures = structuredClone(                                                         // Clone so we can mutate properties safely
        siteFeatures.filter((f) => selectedSites.some((s) => s.value === f.properties.id)),               // Pick only the currently-selected sites
      ).map((f) => ({                                                                                       // Map into display form
        ...f,                                                                                                // Base feature
        properties: {                                                                                        // Override visual properties
          ...f.properties,                                                                                   // Keep original properties
          id: `temp_${f.properties.id}`,                                                                    // Temp id to avoid collision with real sites
          flow: undefined,                                                                                    // Strip flow for rendering
          color: "#3CB371",                                                                                   // Selected sites: sea-green
          strokeWidth: 2,                                                                                     // Visible outline width
          strokeColor: "#228B22",                                                                              // Dark green outline
        },                                                                                                     // End properties override
      }));                                                                                                     // End map

      const geoJson = {                                                                                       // Wrap as FeatureCollection
        type: "FeatureCollection",                                                                             // GeoJSON type
        features: selectedSiteFeatures,                                                                        // Selected features
      };                                                                                                       // End collection
      await rpc.invoke("updateTempLayerGeoJSON", [SELECTED_SITES_LAYER_NAME, geoJson, true]);                 // Push to map
    },                                                                                                          // End callback body
    [siteFeatures],                                                                                            // Re-bind when available sites change
  );                                                                                                            // End useCallback

  const handleSelectSiteLayer = useCallback(                                                               // User changes the site layer selector
    async (e: { value: string | number }) => {                                                                // Selector option
      setSelectedSites([]);                                                                                    // Clear prior multi-selection
      updateSelectedSites([]);                                                                                 // Clear on-map selection too
      setSiteFeatures([]);                                                                                     // Clear computed site features
      setSiteLayerId(e.value);                                                                                 // Store chosen layer id
      const siteLayer = geoJsonLayers.find((l) => l.id === e.value);                                           // Locate full layer descriptor
      if (siteLayer) {                                                                                          // When found
        try {                                                                                                   // Guard against RPC failure
          const siteLayerContents = await rpc.invoke("getLayerContents", [siteLayer.name]);                    // Fetch full geojson contents
          setSiteLayerContents(siteLayerContents);                                                              // Store raw contents (feeds debounced getSites)
        } catch (error) {                                                                                       // RPC error
          console.error("getting site layer contents failed", error);                                           // Log
        }                                                                                                        // End try/catch
      }                                                                                                          // End found branch
    },                                                                                                            // End callback body
    [geoJsonLayers, updateSelectedSites],                                                                        // Re-bind on layer/selection changes
  );                                                                                                              // End useCallback

  const handleSelectSites = useCallback(                                                                    // Multi-select handler for the sites picker
    async (e: { value: string; label: string }[]) => {                                                        // New selection array
      setSelectedSites(e);                                                                                     // Commit selection to state

      updateSelectedSites(e);                                                                                  // Push to on-map overlay
    },                                                                                                          // End callback body
    [updateSelectedSites],                                                                                     // Re-bind when updater changes
  );                                                                                                            // End useCallback

  const [projects, setProjects] = useState([]);                                                              // Available source projects (for project selector)
  const [loadingProject, setLoadingProject] = useState(false);                                                // Flag: currently importing a project bundle
  const [placingPatterns, setPlacingPatterns] = useState(false);                                              // Flag: batch pattern placement in progress
  const [placingPattern, setPlacingPattern] = useState(false);                                                // Flag: single pattern placement in progress

  const [progress, setProgress] = useState(0);                                                                // Progress percentage for long-running ops

  useEffect(() => {                                                                                           // Debounced recomputation of site features
    const id = window.setTimeout(() => {                                                                       // Schedule a rebuild
      getSites(siteLayerContents, roadContents, projectPatterns, selectedPatternIds, params);                 // Rebuild with latest inputs
    }, GET_SITES_DEBOUNCE_MS);                                                                                 // After the debounce window
    return () => window.clearTimeout(id);                                                                      // Cancel if deps change mid-wait
  }, [siteLayerContents, roadContents, params, getSites, selectedPatternIds, projectPatterns]);               // Inputs that should trigger a rebuild

  useEffect(() => {                                                                                           // On mount: load available projects
    const fetchProjects = async () => {                                                                        // Inner async fetcher
      const result = await rpc.invoke("getProjects");                                                          // Ask Giraffe for accessible projects
      setProjects(result.features);                                                                             // Store features for the selector
    };                                                                                                          // End fetchProjects
    fetchProjects();                                                                                            // Fire once
  }, []);                                                                                                        // Mount-only

  const handlePlacePatterns = useCallback(async () => {                                                      // Kick off batch placement onto all selected sites
    if (!selectedSites.length) return;                                                                         // Guard: nothing selected

    // NOTE: prefiltering                                                                                      // (Preserved comment: prefilter by width/depth/area)
    const selectedSiteFeatures = getValidPatternsForSitePlacement(selectedSites, siteFeatures, projectPatterns); // Narrow to sites that can host at least one pattern

    // NOTE: placing patterns                                                                                  // (Preserved comment: kick off evaluation)
    getShortListPatterns(selectedSiteFeatures);                                                                // Run the batched evaluator
  }, [selectedSites, siteFeatures, getShortListPatterns, projectPatterns]);                                    // Re-bind on input changes

  // NOTE: sorted evaluated blocks according to the sort type and filter                                      // (Preserved comment: memo computes visible pattern order)
  const sortedEvaluatedPatterns = useMemo(() => {                                                            // Memoised list used by the Patterns panel
    return structuredClone(projectPatterns)                                                                    // Clone so sort/filter don't mutate state
      .sort((a: any, b: any) => b.stats[sortType] - a.stats[sortType])                                         // Descending sort by chosen metric
      .filter((block: any) => {                                                                                 // Apply filter
        if (filter.patternParking) {                                                                            // Parking-type filter
          return block.stats.patternParking === filter.patternParking;                                          // Keep matches
        }                                                                                                        // End parking branch
        if (filter.patternStyle) {                                                                              // Style filter
          return block.stats.patternStyle === filter.patternStyle;                                              // Keep matches
        }                                                                                                        // End style branch
        return true;                                                                                             // No filter: keep all
      });                                                                                                         // End filter
  }, [sortType, filter, projectPatterns]);                                                                      // Recompute on any input change

  const updatePatternIds = useCallback(                                                                     // Recompute which pattern ids are selected after sort/filter
    (sortAndFilter: SortAndFilter, oldIds?: string[]) => {                                                    // Inputs: new sort/filter + optional previous ids
      const ids = oldIds ? oldIds : projectPatterns.map((p: any) => p.id);                                    // Default to all project pattern ids
      const { sort: sortType, filter } = sortAndFilter;                                                        // Destructure for readability

      const sortedPatterns = structuredClone(projectPatterns).sort(                                            // Sorted clone for index lookup
        (a: any, b: any) => b.stats[sortType!] - a.stats[sortType!],                                           // Descending by chosen metric
      );                                                                                                        // End sort

      const filtered = ids                                                                                      // Start from candidate id list
        .sort(                                                                                                   // Order them by sortedPatterns position
          (a: string, b: string) =>                                                                              // Comparator:
            sortedPatterns.findIndex((e: any) => e.id === a) - sortedPatterns.findIndex((e: any) => e.id === b), // sort by sorted index
        )                                                                                                        // End sort
        .filter((id: string) => {                                                                                // Apply parking/style filters
          const block = projectPatterns.find((e: any) => e.id === id);                                           // Look up full pattern
          if (filter?.patternParking) {                                                                           // Parking filter branch
            return block?.stats.patternParking === filter.patternParking;                                         // Keep matches
          }                                                                                                        // End parking branch
          if (filter?.patternStyle) {                                                                             // Style filter branch
            return block?.stats.patternStyle === filter.patternStyle;                                             // Keep matches
          }                                                                                                        // End style branch
          return true;                                                                                             // No filter: keep
        });                                                                                                         // End filter
      setSelectedPatternIds(filtered);                                                                            // Commit filtered, ordered ids to state
    },                                                                                                             // End callback body
    [projectPatterns],                                                                                             // Re-bind when project patterns change
  );                                                                                                                // End useCallback

  const handleSortTypeChange = useCallback(                                                                    // Native <select> sort handler
    (e: ChangeEvent<HTMLSelectElement>) => {                                                                     // Receives synthetic change event
      const next = e.target.value as SortType;                                                                    // Narrow value to SortType
      setSortType(next);                                                                                          // Commit chosen sort mode
      if (projectPatterns.length > 0) {                                                                           // Only re-order ids when patterns exist
        updatePatternIds({ filter, sort: next }, selectedPatternIds);                                             // Recompute id order using new sort
      }                                                                                                             // End guard
    },                                                                                                              // End callback body
    [filter, projectPatterns.length, selectedPatternIds, updatePatternIds],                                        // Re-bind on relevant deps
  );                                                                                                                 // End useCallback

  const handleSelectProject = useCallback(                                                                      // Load a full project bundle and prepare patterns
    async (e: { value: string }) => {                                                                             // Receives selector option with project id
      setSelectedPatternIds([]);                                                                                   // Clear selected ids before reload
      setPlacingPatterns(false);                                                                                   // Reset placement flag
      setLoadingProject(true);                                                                                    // Show project loading UI
      setProjectBundle({});                                                                                       // Clear previous bundle
      try {                                                                                                        // Guard against RPC failure
        setProgress(0);                                                                                             // Reset progress
        const projectBundle = await rpc.invoke("getProjectBundle", [e.value]);                                     // Download the full project bundle
        setProgress(30);                                                                                            // Progress: bundle fetched

        const blockOrigins = Object.values(projectBundle.rawSections as Record<string, RawSection>).filter(        // Extract block anchor points from raw sections
          (e) => e.geometry.type === "Point" && e.properties.blockId,                                              // Keep only Point sections tagged with blockId
        );                                                                                                          // End filter
        const projectUsages = projectBundle.projectApps[1].featureCategories?.usage;                               // Usage catalogue from the source project

        // add pattern blocks to the project if they don't exist                                                  // (Preserved comment: ensure blocks exist locally)
        const allBlocksArray = Object.values(projectBundle.blocks);                                                // All block definitions in the bundle
        let index = 0;                                                                                              // Index for progress calc
        for (const block of allBlocksArray) {                                                                       // Process each block sequentially
          const hasBlock = !!blocks[(block as BlockDefinition).id];                                                 // Is it already present locally?

          // clean up block if it exists                                                                           // (Preserved comment: optional cleanup)
          if (hasBlock && cleanOldBlocks) {                                                                         // Conditional delete
            const blockId = (block as BlockDefinition).id;                                                          // Grab id
            await rpc.invoke("deleteBlock", [blockId]);                                                             // Delete via RPC
          }                                                                                                          // End cleanup branch
          // create block                                                                                           // (Preserved comment: create if missing)
          if (!hasBlock || cleanOldBlocks) {                                                                        // Recreate when missing or cleaned
            const clonedBlock = structuredClone(block) as BlockDefinition;                                          // Deep clone before mutation
            clonedBlock.features.forEach((feature: any) => {                                                        // Lift _projected into properties
              feature.properties._projected = feature._projected;                                                   // Giraffe expects it inside properties
            });                                                                                                      // End forEach
            await rpc.invoke("createBlock", [clonedBlock]);                                                          // Ask Giraffe to register the block
          }                                                                                                           // End create branch
          setProgress(30 + (index++ / allBlocksArray.length) * 30);                                                  // Progress: 30% → 60% during block sync
        }                                                                                                             // End block loop

        await rpc.invoke("removeTempLayer", [PATTERN_LAYER_NAME]);                                                    // Tear down the old pattern layer

        const usages = (projectAppsByAppID[1]?.featureCategories?.usage ?? []) as Record<                             // Local usage catalogue (for palette)
          string,                                                                                                       // Key: usage name
          { join: { color: string } }                                                                                   // Value: colour metadata
        >;                                                                                                               // End type assertion
        const colors = uniq(Object.values(usages).map((e) => e.join.color)).filter((e) => e !== undefined);              // Unique non-null colours
        const paletteMap = colors.map((e) => ({ value: e, color: e }));                                                  // Palette entries for ordinal scale

        await rpc.invoke("addTempLayerGeoJSON", [                                                                     // Recreate the pattern layer with 3D styling
          PATTERN_LAYER_NAME,                                                                                          // Layer id
          { type: "FeatureCollection", features: [] },                                                                 // Start empty
          { type: "fill-extrusion" },                                                                                  // Mapbox layer type: extruded polygons
          {                                                                                                             // Giraffe styling options
            showLines: true,                                                                                            // Also render outlines
            mainLayer: "fill-extrusion",                                                                                // Primary layer type
            mainColor: {                                                                                                 // Colour configuration
              propertyKey: "color",                                                                                      // Drive colour from the 'color' property
              scaleFunc: "scaleOrdinal",                                                                                 // Ordinal scale
              paletteId: "css",                                                                                          // Use css palette identifier
              paletteMap,                                                                                                // Our computed palette entries
              fallbackColor: "lightgrey",                                                                                 // Default when no match
            },                                                                                                             // End mainColor
          },                                                                                                               // End styling
        ]);                                                                                                                 // End addTempLayerGeoJSON
        setProgress(70);                                                                                                   // Progress: layer ready
        /* related flows */                                                                                                // (Preserved comment: discover flows used by this bundle)
        const flowIds = uniq(                                                                                              // Unique flow ids referenced by any feature
          Object.keys(projectBundle.blocks)                                                                                // Iterate block keys
            .flatMap((blockId) => {                                                                                        // Flatten each block's feature list
              return projectBundle.blocks[blockId].features.map((feature: any) => feature.properties?.flow?.id);          // Extract flow id off properties
            })                                                                                                              // End flatMap
            .filter((e) => e !== undefined),                                                                                // Drop undefineds
        );                                                                                                                   // End uniq

        const flows = flowIds.map((flowId) => projectBundle.flows[flowId]).filter((e) => e !== undefined);                  // Resolve ids to full flow objects

        try {                                                                                                                // Add flows one by one
          for (const flow of flows) {                                                                                         // Sequential to preserve order
            await rpc.invoke("addFlowDag", [flow]);                                                                           // Register with Giraffe
          }                                                                                                                    // End for
        } catch (e) {                                                                                                          // Guard against flow registration failure
          console.error("adding flows failed", e);                                                                             // Log and continue
        }                                                                                                                      // End try/catch

        setProgress(80);                                                                                                      // Progress: flows registered

        // evaluate patterns                                                                                                   // (Preserved comment: evaluate each unique pattern)
        const evaluatedPatterns: any[] = [];                                                                                   // Accumulator for evaluated patterns

        let usedUsageNames = [] as string[];                                                                                   // Collect usages actually consumed
        for (const blockOrigin of blockOrigins) {                                                                              // For each anchor point representing a pattern
          const blockId = blockOrigin.properties.blockId;                                                                      // Read the pattern/block id
          const isAlreadyUsed = evaluatedPatterns.some((p) => p.id === blockId); // TODO: for now, patternId === blockId, but we could use the point id with differnet settings.

          if (isAlreadyUsed) continue;                                                                                         // Skip duplicates
          const realOriginPoint = {                                                                                             // Construct an evaluation anchor at project origin
            ...(blockOrigin as RawSection),                                                                                      // Clone base section
            geometry: {                                                                                                          // Override geometry
              type: "Point",                                                                                                     // Must stay a point
              coordinates: projectOrigin,                                                                                         // Use project origin as location
            },                                                                                                                    // End geometry
            properties: {                                                                                                         // Override properties
              ...blockOrigin.properties,                                                                                          // Keep original props
              /* main app renference from block definition, scale will no effect the pattern evaluation */                         // (Preserved comment: scale is cosmetic here)
              scale: 1,                                                                                                            // Force unit scale
            },                                                                                                                     // End properties
          };                                                                                                                        // End realOriginPoint

          const evaluatedResult = await rpc.invoke("evaluateFeatures", [[realOriginPoint]]);                                       // Run the evaluator
          const evaluatedFeatures = Object.values(evaluatedResult).flat() as StackedSection[];                                      // Flatten result

          const usageNamesForEvaluatedFeatures = Object.keys(projectUsages).filter((key) =>                                         // Pick usage names referenced by output
            evaluatedFeatures.some((e) => e.properties.usage === key),                                                               // Any feature uses this key?
          );                                                                                                                         // End filter
          usedUsageNames = usedUsageNames.concat(usageNamesForEvaluatedFeatures);                                                    // Accumulate

          const stats = getPatternStats(evaluatedFeatures);                                                                         // Compute aggregated stats for this pattern

          const minSiteWidth = (blockOrigin.properties.buildingWidth ?? 0) + 2 * params.side;                                       // Required width incl. side setbacks
          const minSiteDepth = (blockOrigin.properties.buildingDepth ?? 0) + params.front + params.rear;                            // Required depth incl. front/rear setbacks
          const minSiteArea = blockOrigin.properties.minSiteArea ?? 0;                                                               // Minimum site area (author-specified)
          const maxHeight = blockOrigin.properties.maxHeight ?? 0;                                                                    // Maximum height (author-specified)

          const block = projectBundle.blocks[blockId];                                                                               // Look up the block definition
          evaluatedPatterns.push({                                                                                                    // Push fully resolved pattern
            id: blockId, // TODO: for now, patternId === blockId, but we could use the point id with differnet settings.
            name: block.name ?? blockOrigin.properties.name ?? blockId,                                                               // Best-available name
            description: block.description ?? blockOrigin.properties.description,                                                      // Best-available description
            originPoint: blockOrigin,                                                                                                  // Original anchor point
            block,                                                                                                                    // Block definition
            stats: {                                                                                                                    // Aggregated stats
              ...stats,                                                                                                                  // From getPatternStats
              minSiteWidth,                                                                                                              // Plus constraints
              minSiteDepth,                                                                                                              // …
              minSiteArea,                                                                                                               // …
              maxHeight,                                                                                                                 // …
            },                                                                                                                           // End stats
            features: evaluatedFeatures,                                                                                                // All evaluated features
          });                                                                                                                            // End push
        }                                                                                                                                 // End pattern loop
        setProgress(90);                                                                                                                  // Progress: evaluation complete

        // sync usages                                                                                                                    // (Preserved comment: mirror usages into local project)
        usedUsageNames = uniq(usedUsageNames);                                                                                            // Dedupe usage names
        const currentUsages = projectAppsByAppID[1]?.featureCategories?.usage ?? [];                                                       // Lookup of existing local usages

        for (const usageName of usedUsageNames) {                                                                                          // For each referenced usage
          const projectUsage = projectUsages[usageName];                                                                                    // Authoritative source usage
          const currentUsage = currentUsages[usageName];                                                                                    // Local existing usage (if any)
          if (!currentUsage) {                                                                                                               // Missing locally
            // create usage                                                                                                                   // (Preserved comment: create branch)
            await rpc.invoke("createUsage", [usageName, projectUsage]);                                                                       // Register new usage
          } else if (!isEqual(projectUsage, currentUsage)) {                                                                                  // Exists but differs
            // update usage                                                                                                                   // (Preserved comment: update branch)
            await rpc.invoke("updateUsage", [usageName, projectUsage]);                                                                       // Patch existing usage
          }                                                                                                                                    // End if/else
        }                                                                                                                                       // End usage sync loop

        setProgress(95);                                                                                                                       // Progress: usages synced

        setProjectBundle(projectBundle);                                                                                                       // Commit bundle to state
        setProjectPatterns(evaluatedPatterns);                                                                                                 // Commit evaluated patterns

        updatePatternIds(                                                                                                                       // Seed selected ids (all, in current sort order)
          { filter, sort: sortType },                                                                                                           // Current sort/filter
          evaluatedPatterns.map((p) => p.id),                                                                                                   // All new pattern ids
        );                                                                                                                                       // End updatePatternIds

        if (!instantPointId) {                                                                                                                  // Ensure the anchor point exists
          const instantPoint = {                                                                                                                 // Build the hidden anchor feature
            type: "Feature",                                                                                                                     // GeoJSON type
            geometry: {                                                                                                                          // Geometry
              type: "Point",                                                                                                                     // Point
              coordinates: projectOrigin,                                                                                                         // Anchored at project origin
            },                                                                                                                                    // End geometry
            properties: {                                                                                                                         // Properties
              layerId: INSTANT_POINT_LAYER_NAME,                                                                                                  // Identify layer
              fillOpacity: 0,                                                                                                                     // Hidden visually
            },                                                                                                                                     // End properties
          };                                                                                                                                        // End instantPoint
          await rpc.invoke("createRawSection", [instantPoint]);                                                                                    // Create via RPC
        }                                                                                                                                           // End anchor check

        setProgress(100);                                                                                                                           // Progress: done
      } catch (e) {                                                                                                                                 // Outer try/catch for entire project load
        console.error("loading project failed", e);                                                                                                 // Log failure
      } finally {                                                                                                                                    // Always runs:
        setLoadingProject(false);                                                                                                                     // Hide loading UI
      }                                                                                                                                                // End try/catch/finally
    },                                                                                                                                                 // End callback body
    [                                                                                                                                                   // Dependency array:
      blocks,                                                                                                                                             //   live block map
      cleanOldBlocks,                                                                                                                                     //   cleanup toggle
      filter,                                                                                                                                              //   filter state
      instantPointId,                                                                                                                                      //   anchor id
      params.front,                                                                                                                                         //   front setback
      params.rear,                                                                                                                                          //   rear setback
      params.side,                                                                                                                                          //   side setback
      projectAppsByAppID,                                                                                                                                    //   project app map
      projectOrigin,                                                                                                                                         //   project origin
      sortType,                                                                                                                                              //   sort mode
      updatePatternIds,                                                                                                                                      //   id updater
    ],                                                                                                                                                       // End deps
  );                                                                                                                                                          // End useCallback

  const handleSelectPattern = useCallback(                                                                                                         // Toggle a pattern id in/out of the selection
    async (patternId: string) => {                                                                                                                    // Input: pattern id
      let patternIds: string[];                                                                                                                       // Output list
      if (selectedPatternIds.includes(patternId)) {                                                                                                    // Already selected?
        patternIds = selectedPatternIds.filter((id) => id !== patternId);                                                                              //   remove
      } else {                                                                                                                                          // Not selected?
        patternIds = [...selectedPatternIds, patternId];                                                                                                //   add
      }                                                                                                                                                  // End toggle

      setSelectedPatternIds(                                                                                                                             // Commit sorted selection
        patternIds.sort(                                                                                                                                  // Sort by sortedEvaluatedPatterns index
          (a, b) =>                                                                                                                                        // Comparator:
            sortedEvaluatedPatterns.findIndex((e: any) => e.id === a) -                                                                                     // a's position
            sortedEvaluatedPatterns.findIndex((e: any) => e.id === b),                                                                                      // minus b's position
        ),                                                                                                                                                 // End sort
      );                                                                                                                                                   // End setState
    },                                                                                                                                                      // End callback body
    [selectedPatternIds, sortedEvaluatedPatterns],                                                                                                          // Re-bind on selection/order changes
  );                                                                                                                                                        // End useCallback

  const handleLassoSelect = useCallback(async () => {                                                                                             // Lens+lasso multi-select of sites
    if (!siteFeatures.length || !siteLayerId) return;                                                                                                // Guard: need sites + chosen layer
    const siteLayer = geoJsonLayers.find((l) => l.id === siteLayerId);                                                                                // Resolve layer descriptor
    if (!siteLayer) return;                                                                                                                           // Guard: descriptor must exist

    await rpc.invoke("activateLensLayer", [siteLayer.name]);                                                                                          // Turn on lens mode on the site layer
    try {                                                                                                                                               // Ensure deactivation regardless of errors
      const lassoedFeatures = await rpc.invoke("getLassoedLensedFeatures");                                                                            // Ask user to lasso features
      if (!lassoedFeatures?.length) return;                                                                                                             // User cancelled or no hits

      const lassoedIds = new Set(                                                                                                                         // Build fast lookup of selected ids
        lassoedFeatures                                                                                                                                    // From the lassoed features
          .map((f: any) => f.properties?.id ?? f.properties?.ID)                                                                                           // Read id (either case)
          .filter(Boolean)                                                                                                                                   // Drop nullish
          .map(String),                                                                                                                                     // Normalise to string
      );                                                                                                                                                    // End Set

      const newSelections = siteFeatures                                                                                                                    // Match lassoed ids back to computed sites
        .filter((f) => lassoedIds.has(String(f.properties.id)))                                                                                              // Keep lassoed ones
        .map((f) => ({ value: f.properties.id, label: f.properties.address }));                                                                              // Map to selector option shape

      if (!newSelections.length) return;                                                                                                                    // Nothing usable

      const merged = [...selectedSites];                                                                                                                     // Start from current selection
      for (const s of newSelections) {                                                                                                                        // Add new ones without duplicates
        if (!merged.some((e) => e.value === s.value)) merged.push(s);                                                                                         // Dedupe by value
      }                                                                                                                                                        // End merge loop
      setSelectedSites(merged);                                                                                                                               // Commit merged state
      updateSelectedSites(merged);                                                                                                                            // Sync on-map overlay
    } finally {                                                                                                                                               // Cleanup regardless:
      await rpc.invoke("deactivateLensLayer");                                                                                                                //   always turn lens mode back off
    }                                                                                                                                                          // End try/finally
  }, [siteFeatures, selectedSites, updateSelectedSites, siteLayerId, geoJsonLayers]);                                                                         // Re-bind on any relevant change

  // Click-to-toggle: listen to mapSelectCoord and toggle the clicked site                                                                                   // (Preserved comment: explains the effect below)
  const selectedSitesRef = useRef(selectedSites);                                                                                                             // Ref mirror of selectedSites (for fresh reads in handler)
  selectedSitesRef.current = selectedSites;                                                                                                                    // Keep ref in sync each render

  useEffect(() => {                                                                                                                                           // Subscribe to mapSelectCoord for toggle-select
    const handler = async () => {                                                                                                                              // Handler runs on each map select event
      if (!siteFeatures.length) return;                                                                                                                         // No-op when sites not ready
      const feature = await rpc.invoke("getQueriedFeature");                                                                                                    // Ask Giraffe for the clicked feature
      if (!feature?.properties) return;                                                                                                                         // Guard: no feature

      const featureId = String(feature.properties.id ?? feature.properties.ID ?? "");                                                                           // Normalise id to string
      if (!featureId) return;                                                                                                                                   // Guard: no id

      const matchedSite = siteFeatures.find((f) => String(f.properties.id) === featureId);                                                                      // Match against our computed sites
      if (!matchedSite) return;                                                                                                                                  // Guard: not one of ours

      const current = selectedSitesRef.current;                                                                                                                   // Read latest selection via ref
      const existing = current.find((s) => s.value === matchedSite.properties.id);                                                                                // Is it already selected?
      const updated = existing                                                                                                                                     // Compute new selection array
        ? current.filter((s) => s.value !== matchedSite.properties.id)                                                                                             //   remove when already present
        : [                                                                                                                                                         //   add when absent
            ...current,                                                                                                                                              //   clone existing
            {                                                                                                                                                         //   new entry
              value: matchedSite.properties.id,                                                                                                                         //   id
              label: matchedSite.properties.address,                                                                                                                    //   label
            },                                                                                                                                                         //   end entry
          ];                                                                                                                                                           //   end add branch

      setSelectedSites(updated);                                                                                                                                        // Commit new selection
      updateSelectedSites(updated);                                                                                                                                     // Sync on-map overlay
    };                                                                                                                                                                   // End handler

    giraffeState.addListener(["mapSelectCoord"], handler);                                                                                                               // Register listener for map selects
  }, [siteFeatures, updateSelectedSites]);                                                                                                                               // Re-bind when deps change

  const handleSelectAllSites = useCallback(() => {                                                                                                           // Select every available site
    const newSelectedSites = siteFeatures.map((f) => ({                                                                                                         // Map to selector options
      value: f.properties.id,                                                                                                                                    // id
      label: f.properties.address ?? f.properties.id,                                                                                                            // address fallback to id
    }));                                                                                                                                                          // End map
    setSelectedSites(newSelectedSites);                                                                                                                           // Commit to state
    updateSelectedSites(newSelectedSites);                                                                                                                        // Sync on-map overlay
  }, [siteFeatures, updateSelectedSites]);                                                                                                                        // Re-bind on deps

  const handleClearSelection = useCallback(() => {                                                                                                           // Clear the site selection
    setSelectedSites([]);                                                                                                                                       // Empty state
    updateSelectedSites([]);                                                                                                                                    // Empty overlay
  }, [updateSelectedSites, setSelectedSites]);                                                                                                                    // Re-bind on deps

  const handlePlacePatternToSelectedSite = useCallback(                                                                                                     // Replace the pattern for one focused site
    async (patternFeatures: StackedPolygon[], setbackFeature: StackedPolygon) => {                                                                            // Inputs: new pattern + setback for the site
      setPlacingPattern(true);                                                                                                                                 // UI flag: single placement in progress
      const siteId = patternFeatures[0].properties.pattern.siteId;                                                                                              // Which site we're replacing on
      const newGeoJsonFeatures = structuredClone(                                                                                                                // Clone buffer (remove old pattern for this site)
        geoJsonFeaturesForPattern.filter((f) => f.properties!.pattern.siteId !== siteId),                                                                         // Drop features belonging to this site
      );                                                                                                                                                           // End clone

      const featuresArray = [structuredClone(patternFeatures)];                                                                                                    // Wrap new features for updatePatternGeoJsonFeatures
      const minIx = Math.min(...featuresArray[0].map((e) => e.properties.ix ?? 0));                                                                                 // Compute min ix for rebasing
      featuresArray[0].forEach((e) => (e.properties.ix = e.properties.ix - minIx));                                                                                  // Rebase ix to zero

      await updatePatternGeoJsonFeatures(featuresArray, newGeoJsonFeatures);                                                                                          // Flatten + merge into buffer
      await updatePatternTempLayerGeoJSON(newGeoJsonFeatures);                                                                                                        // Push buffer to map
      setGeoJsonFeaturesForPattern(newGeoJsonFeatures);                                                                                                               // Commit buffer to state
      const newGeoJsonFeaturesForSiteSetback = structuredClone(                                                                                                        // Rebuild setback buffer
        geoJsonFeaturesForSiteSetback.filter((f) => f.properties!.id !== setbackFeature.properties.id),                                                                // Drop old setback for this site
      );                                                                                                                                                                // End clone
      newGeoJsonFeaturesForSiteSetback.push(setbackFeature);                                                                                                            // Add new setback
      await updateSiteSetbackToTempLayer(newGeoJsonFeaturesForSiteSetback);                                                                                             // Push setback buffer to map
      setGeoJsonFeaturesForSiteSetback(newGeoJsonFeaturesForSiteSetback);                                                                                               // Commit setback buffer
      setPlacingPattern(false);                                                                                                                                         // UI flag: single placement done
    },                                                                                                                                                                   // End callback body
    [                                                                                                                                                                     // Dependency array:
      geoJsonFeaturesForPattern,                                                                                                                                            //   current pattern buffer
      geoJsonFeaturesForSiteSetback,                                                                                                                                         //   current setback buffer
      updatePatternGeoJsonFeatures,                                                                                                                                          //   pattern flattener
      updatePatternTempLayerGeoJSON,                                                                                                                                         //   pattern push helper
      updateSiteSetbackToTempLayer,                                                                                                                                          //   setback push helper
    ],                                                                                                                                                                        // End deps
  );                                                                                                                                                                           // End useCallback

  const selectedPatternIdForSite = useMemo(() => {                                                                                                             // Currently-placed pattern id for the focused site
    return geoJsonFeaturesForPattern.find((f) => f.properties!.pattern.siteId === selectedSiteId)?.properties!.pattern                                           // Find any feature for this site
      .id;                                                                                                                                                         // Return its pattern id
  }, [geoJsonFeaturesForPattern, selectedSiteId]);                                                                                                                  // Recompute on buffer/site change

  return (                                                                                                                                                      // Render the app
    <div className="flex flex-col gap-2 p-4">{/* outer container: column layout with padding */}
      <h1 className="mb-2 font-[arial] text-2xl font-bold">{/* page title */}
        Pattern <br /> Book{/* heading text with line break */}
      {/* end h1 */}</h1>
      {/* blank spacer */}
      {selectedSiteId !== undefined ? ( // ternary: show ShortListPanel when a site is focused
        <ShortListPanel
          siteFeature={siteFeatures.find((f) => f.properties.id === selectedSiteId) as StackedPolygon /* the focused site feature */}
          projectPatterns={projectPatterns /* full list of evaluated project patterns */}
          placingPattern={placingPattern /* single-placement in-progress flag */}
          disabled={placingPatterns /* disable panel during batch placement */}
          sortType={sortType /* current sort mode */}
          selectedPatternId={selectedPatternIdForSite /* currently placed pattern for this site */}
          onBack={() => clearSelectedSiteFeature() /* leave per-site view */}
          onSelectPattern={handlePlacePatternToSelectedSite /* place a new pattern on this site */}
        />
      ) : (                                                                                                                                                    // else: show the main panels
        <div className="flex flex-col gap-2">{/* inner container: column layout */}
          <SitesPanel
            placingPatterns={placingPatterns /* disable while placing */}
            geoJsonLayers={geoJsonLayers /* available site layers */}
            siteLayerId={siteLayerId /* currently chosen site layer id */}
            onSelectSiteLayer={handleSelectSiteLayer /* layer picker callback */}
            selectedRoadLayers={selectedRoadLayers /* chosen road layer subset */}
            onRoadLayersChange={setSelectedRoadLayers /* road layer setter */}
            roadLayers={roadLayers /* all road layer ids */}
            onUpdateRoads={handleUpdateRoads /* re-query + redraw roads */}
            params={params /* setback params */}
            setParams={setParams /* setback params setter */}
            siteFeatures={siteFeatures /* computed site features */}
            selectedSites={selectedSites /* current site multi-selection */}
            onSelectSites={handleSelectSites /* multi-select callback */}
            onLassoSelect={handleLassoSelect /* lens-based lasso select */}
            onSelectAllSites={handleSelectAllSites /* select everything */}
            onClearSelection={handleClearSelection /* clear the selection */}
          />
          <Patterns
            sortType={sortType /* current sort mode */}
            onSortTypeReactSelectChange={setSortType /* react-select handler */}
            onSortTypeNativeChange={handleSortTypeChange /* native select handler */}
            filter={filter /* current filter state */}
            setFilter={setFilter /* filter setter */}
            placingPatterns={placingPatterns /* disable during placement */}
            projectPatterns={projectPatterns /* evaluated patterns */}
            projectBundle={projectBundle /* full loaded bundle */}
            sortedEvaluatedPatterns={sortedEvaluatedPatterns /* sorted+filtered patterns */}
            selectedPatternIds={selectedPatternIds /* selected pattern id order */}
            onSelectAllPatterns={() => setSelectedPatternIds(sortedEvaluatedPatterns.map((p: any) => p.id)) /* select all visible */}
            onDeselectAllPatterns={() => setSelectedPatternIds([]) /* clear selection */}
            projects={projects /* available source projects */}
            loadingProject={loadingProject /* project import in progress */}
            cleanOldBlocks={cleanOldBlocks /* toggle: delete existing blocks on import */}
            onCleanOldBlocksToggle={() => setCleanOldBlocks(!cleanOldBlocks) /* toggler for above */}
            onSelectProject={handleSelectProject /* project import trigger */}
            onTogglePattern={handleSelectPattern /* per-pattern toggle */}
            onPlacePatterns={handlePlacePatterns /* batch placement trigger */}
            progress={progress /* progress percent */}
            selectedSitesCount={selectedSites.length /* count for the button label */}
          />
        {/* end inner container */}</div>
      )}
    {/* end outer container */}</div>
  );                                                                                                                                                              // Close the return JSX expression
}                                                                                                                                                                  // End Main component

export default Main;                                                                                                                                              // Default export for the app entry point
