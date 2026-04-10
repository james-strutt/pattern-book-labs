import { giraffeState, rpc } from "@gi-nx/iframe-sdk";
import { useGiraffeState } from "@gi-nx/iframe-sdk-react";
import type { Feature } from "geojson";
import { chunk, groupBy, isEqual, uniq } from "lodash";
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import "simplebar-react/dist/simplebar.min.css";
import { getReferenceGeoProject } from "./libs/feature";
import { GeoCoordinate, RawSection, StackedPolygon, StackedSection } from "./libs/types";
import { SortAndFilter, SortType } from "./types";
import {
  getPatternStats,
  getRoadFeatures,
  getSideIndices,
  getSiteFeatureByGeoCoord,
  getSiteFeatures,
  groupKeyForFlowInputKeys,
  persistEnvelopeSetbackParamsToStorage,
  readEnvelopeSetbackParamsFromStorage,
  setFlowPropertyOfFeature,
} from "./utils";

import {
  DEFAULT_SLAB_THICKNESS,
  GET_SITES_DEBOUNCE_MS,
  INSTANT_POINT_LAYER_NAME,
  MIN_GEOMETRY_DISTANCE,
  PATTERN_BOOK_SHORT_LIST,
  PATTERN_LAYER_NAME,
  PATTERN_MAIN_BATCH_SIZE,
  PATTERN_MAIN_SORT_OPTIONS,
  SELECTED_SITE_LAYER_NAME,
  SELECTED_SITES_LAYER_NAME,
  SITE_SETBACK_LAYER_NAME,
} from "./constants";
import { getValidPatternsForSitePlacement } from "./getValidPatternsForSitePlacement";
import Patterns from "./Patterns";
import ShortListPanel from "./ShortListPanel";
import SitesPanel from "./SitesPanel";

type BlockDefinition = {
  id: string;
  features: Array<Feature & { _projected?: unknown }>;
};

type GeoJsonLayer = {
  name: string;
  id: string;
  isDrawing?: boolean;
};

function Main() {
  const callbackId = useRef();
  const blocks = useGiraffeState("blocks");

  const projectAppsByAppID = useGiraffeState("projectAppsByAppID");
  const projectLayers = useGiraffeState("projectLayers");
  const projectOrigin = useGiraffeState("projectOrigin");
  const mainRawSections = useGiraffeState("rawSections");

  const instantPointId = useMemo(() => {
    return mainRawSections.features.find(
      (feature: any) => feature.properties.layerId === INSTANT_POINT_LAYER_NAME && feature.geometry.type === "Point",
    )?.properties.id;
  }, [mainRawSections]);

  const geoJsonLayers: GeoJsonLayer[] = useMemo(() => {
    if (!projectLayers) return [];
    const layerNames = projectLayers.reduce(
      (acc: { name: string; id: string }[], layer: any) => {
        return layer.layer_full?.vector_source?.type === "geojson"
          ? acc.concat({ name: layer.layer_full.name, id: layer.id })
          : acc;
      },
      [] as { name: string; id: string }[],
    );
    return layerNames;
  }, [projectLayers]);

  const [siteLayerId, setSiteLayerId] = useState<string | number | undefined>(undefined);
  // @ts-ignore
  const [siteLayerContents, setSiteLayerContents] = useState<any>();
  const [roadContents, setRoadContents] = useState<{ features: any[] }>({
    features: [],
  });
  const [roadLayers, setRoadLayers] = useState<string[]>([]);
  const [selectedRoadLayers, setSelectedRoadLayers] = useState<{ value: string; label: string }[]>([
    { value: "road-street", label: "road-street" },
    { value: "road-secondary-tertiary", label: "road-secondary-tertiary" },
  ]);

  const [siteFeatures, setSiteFeatures] = useState<StackedSection[]>([]);

  const [selectedSites, setSelectedSites] = useState<{ value: string; label: string }[]>([]);

  const [cleanOldBlocks, setCleanOldBlocks] = useState(false);

  const [selectedSiteId, setSelectedSiteId] = useState<string | undefined>(undefined);

  const [geoJsonFeaturesForPattern, setGeoJsonFeaturesForPattern] = useState<Feature[]>([]);
  const [geoJsonFeaturesForSiteSetback, setGeoJsonFeaturesForSiteSetback] = useState<Feature[]>([]);

  // NOTE: envelope setback parameters for frontages — persisted in localStorage
  const [params, setParams] = useState(readEnvelopeSetbackParamsFromStorage);

  useEffect(() => {
    persistEnvelopeSetbackParamsToStorage(params);
  }, [params]);

  const ROAD_TEMP_LAYER = "Selected Roads";

  useEffect(() => {
    const fetchRoadLayers = async () => {
      const style = await rpc.invoke("getMapStyle");
      const layers = (style?.layers ?? [])
        .filter((l: any) => l.id.startsWith("road") && l.type === "line")
        .map((l: any) => l.id);
      setRoadLayers(layers);
    };
    fetchRoadLayers();
  }, []);

  const handleUpdateRoads = useCallback(async () => {
    const layerIds = selectedRoadLayers.map((l) => l.value);
    if (!layerIds.length) return;
    const features = await rpc.invoke("queryRenderedFeatures", [undefined, { layers: layerIds }]);
    const fc = { type: "FeatureCollection", features: features ?? [] };
    setRoadContents(fc);
    await rpc.invoke("removeTempLayer", [ROAD_TEMP_LAYER]);
    await rpc.invoke("addTempLayerGeoJSON", [
      ROAD_TEMP_LAYER,
      fc,
      { type: "line", paint: { "line-color": "#ff0000", "line-width": 3 } },
    ]);
  }, [selectedRoadLayers]);

  const [projectBundle, setProjectBundle] = useState<any>({});
  const [projectPatterns, setProjectPatterns] = useState<any>([]);

  const [selectedPatternIds, setSelectedPatternIds] = useState<string[]>([]); // NOTE: for now, patternId === blockId, but we could use the point id with differnet settings.

  const initTempLayer = useCallback(async () => {
    /* sites layer */
    await rpc.invoke("removeTempLayer", [SELECTED_SITES_LAYER_NAME]);
    await rpc.invoke("addTempLayerGeoJSON", [
      SELECTED_SITES_LAYER_NAME,
      { type: "FeatureCollection", features: [] },
      null,
      {
        mainLayer: "fill",
        mainColor: { fixedValue: "#3CB371" },
        fillOpacity: 0.2,
      },
    ]);
    /* site layer */
    await rpc.invoke("removeTempLayer", [SELECTED_SITE_LAYER_NAME]);
    await rpc.invoke("addTempLayerGeoJSON", [
      SELECTED_SITE_LAYER_NAME,
      { type: "FeatureCollection", features: [] },
      null,
      {
        mainLayer: "fill",
        mainColor: { fixedValue: "#40C4FF" },
        fillOpacity: 0.2,
      },
    ]);

    /* setback layer */
    await rpc.invoke("removeTempLayer", [SITE_SETBACK_LAYER_NAME]);
    await rpc.invoke("addTempLayerGeoJSON", [
      SITE_SETBACK_LAYER_NAME,
      { type: "FeatureCollection", features: [] },
      null,
      {
        mainLayer: "fill",
        showLines: true,
        mainColor: { fixedValue: "#3CB371" },
        fillOpacity: 0.2,
      },
    ]);

    await rpc.invoke("addFlowDag", [PATTERN_BOOK_SHORT_LIST]);
  }, []);

  useEffect(() => {
    initTempLayer();
  }, [initTempLayer]);

  useEffect(() => {
    const cleanup = () => {
      rpc.invoke("removeTempLayer", [ROAD_TEMP_LAYER]);
    };
    giraffeState.addListener(["closingSignal"], cleanup);
  }, []);

  const getSites = useCallback(
    async (
      siteLayerContents: any,
      roadLayerContents: any,
      projectPatterns: any[],
      selectedBlockIds: string[],
      params: { front: number; rear: number; side: number },
    ) => {
      try {
        if (!siteLayerContents?.features?.length) return;

        const rotations = {} as Record<string, number>;
        projectPatterns.forEach((pattern: any) => {
          const rotation = pattern.originPoint.properties.rotation;
          rotations[pattern.id] = rotation ?? 0;
        });

        const geoProject = getReferenceGeoProject(projectOrigin);

        const siteFeatures: StackedSection[] = getSiteFeatures(siteLayerContents, geoProject);

        const roadFeatures: StackedSection[] = getRoadFeatures(roadLayerContents, geoProject);

        siteFeatures.forEach((feature, i) => {
          const indices = getSideIndices(siteFeatures, roadFeatures, i);

          setFlowPropertyOfFeature(feature, params, indices, selectedBlockIds, instantPointId, rotations, i);
        });

        setSiteFeatures(siteFeatures);
      } catch (e) {
        console.error("getting sites failed", e);
      }
    },
    [instantPointId, projectOrigin],
  );

  const clearSelectedSiteFeature = useCallback(async () => {
    const geoJson = {
      type: "FeatureCollection",
      features: [],
    };
    await rpc.invoke("updateTempLayerGeoJSON", [SELECTED_SITE_LAYER_NAME, geoJson, true]);

    setSelectedSiteId(undefined);
  }, []);
  const mouseEventHandler = useCallback(
    async (_evt: any, { data: dataS }: { data: string }) => {
      if (!siteLayerContents?.features?.length) {
        return;
      }
      const geoProject = getReferenceGeoProject(projectOrigin);

      const data = JSON.parse(dataS);
      const { lng, lat } = data.mapboxEvent.lngLat;
      const geoCoord = [lng, lat] as GeoCoordinate;

      const siteFeature = getSiteFeatureByGeoCoord(siteFeatures, geoCoord, geoProject);

      const coloredFeature = siteFeature
        ? {
            ...siteFeature,
            properties: {
              ...siteFeature.properties,
              id: `temp_${siteFeature.properties.id ?? siteFeature.properties["ID"]}`,
              flow: undefined,
              color: "#40C4FF",
              strokeWidth: 2,
              strokeColor: "#228B22",
            },
          }
        : null;

      const geoJson = {
        type: "FeatureCollection",
        features: coloredFeature ? [coloredFeature] : [],
      };
      await rpc.invoke("updateTempLayerGeoJSON", [SELECTED_SITE_LAYER_NAME, geoJson, true]);

      setSelectedSiteId(siteFeature?.properties.id as string);
    },
    [projectOrigin, siteFeatures],
  );

  useEffect(() => {
    rpc.invoke("addMapboxEventListener", ["mousedown", 100]).then((r) => {
      callbackId.current = r;
    });
    giraffeState.addListener(["mapboxEvent"], mouseEventHandler);
    return () => {
      rpc.invoke("removeMapboxEventListener", [callbackId.current]);
      giraffeState.removeListener(["mapboxEvent"]);
    };
  }, [mouseEventHandler]);

  const [sortType, setSortType] = useState<SortType>(PATTERN_MAIN_SORT_OPTIONS[0]);

  const [filter, setFilter] = useState<NonNullable<SortAndFilter["filter"]>>({
    passedLandscape: true,
    passedBuilding: true,
    patternStyle: undefined,
    patternParking: undefined,
  });

  const updateSiteSetbackToTempLayer = useCallback(
    async (geoJsonFeatures: Feature[]) => {
      const geoJson = {
        type: "FeatureCollection",
        features: geoJsonFeatures,
        GiraffeProjectApp: projectBundle.projectApps[1],
      };
      await rpc.invoke("updateTempLayerGeoJSON", [SITE_SETBACK_LAYER_NAME, geoJson, true]);
    },
    [projectBundle.projectApps],
  );

  const updatePatternTempLayerGeoJSON = useCallback(
    async (geoJsonFeatures: Feature[]) => {
      const geoJson = {
        type: "FeatureCollection",
        features: geoJsonFeatures,
        GiraffeProjectApp: projectBundle.projectApps[1],
      };
      await rpc.invoke("updateTempLayerGeoJSON", [PATTERN_LAYER_NAME, geoJson, true]);
    },
    [projectBundle.projectApps],
  );
  const updatePatternGeoJsonFeatures = useCallback(
    async (featuresArray: StackedSection[][], geoJsonFeatures: Feature[]) => {
      const stackedSections = !featuresArray.length ? [] : await rpc.invoke("stackFeatures", [featuresArray[0]]);
      const newGeoJsonFeatures: StackedSection[] = [];

      const usages = projectAppsByAppID[1]?.featureCategories?.usage ?? [];

      stackedSections
        .filter((e: any) => e.geometry.type !== "Point")
        .forEach((feature: any) => {
          const coordinates = feature.geometry.coordinates;
          let baseHeight = feature.properties._baseHeight;
          const height = feature.properties._height;
          const usage = usages[feature.properties.usage];
          const noFacade = usage?.join?.noFacade;

          if (noFacade) {
            const slabThickness = feature.properties.slabThickness ?? DEFAULT_SLAB_THICKNESS;
            for (let i = 0; i < (feature.properties.levels ?? 1); i++) {
              const tweakedCoordinates = structuredClone(coordinates);
              if (feature.geometry.type === "Polygon") {
                tweakedCoordinates[0][1][0] += MIN_GEOMETRY_DISTANCE * baseHeight;
              } else {
                tweakedCoordinates[1][0] += MIN_GEOMETRY_DISTANCE * baseHeight;
              }

              newGeoJsonFeatures.push({
                ...feature,
                geometry: {
                  ...feature.geometry,
                  coordinates: tweakedCoordinates,
                },
                properties: {
                  ...feature.properties,
                  base_height: baseHeight,
                  height: baseHeight + slabThickness,
                },
              });

              baseHeight += feature.properties.floorToFloor;
            }
          } else {
            const hasSameCoordinates = newGeoJsonFeatures.some((e) => isEqual(e.geometry.coordinates, coordinates));

            if (hasSameCoordinates) {
              // prevFeature.properties.height = height;
              const tweakedCoordinates = structuredClone(coordinates);

              if (feature.geometry.type === "Polygon") {
                tweakedCoordinates[0][1][0] += MIN_GEOMETRY_DISTANCE * baseHeight;
              } else {
                tweakedCoordinates[1][0] += MIN_GEOMETRY_DISTANCE * baseHeight;
              }

              newGeoJsonFeatures.push({
                ...feature,
                geometry: {
                  ...feature.geometry,
                  coordinates: tweakedCoordinates,
                },
                properties: {
                  ...feature.properties,
                  base_height: baseHeight,
                  height,
                },
              });
            } else {
              newGeoJsonFeatures.push({
                ...feature,
                properties: {
                  ...feature.properties,
                  base_height: baseHeight,
                  height,
                },
              });
            }
          }
        });

      geoJsonFeatures.push(...newGeoJsonFeatures);
    },
    [projectAppsByAppID],
  );

  const getShortListPatterns = useCallback(
    async (siteFeatures: StackedSection[]) => {
      const geoJsonFeaturesForPattern: Feature[] = [];
      const geoJsonFeaturesForSiteSetback: Feature[] = [];
      setPlacingPatterns(true);
      setProgress(0);
      let index = 1;

      const groupedSiteFeatures = groupBy(siteFeatures, (f) => groupKeyForFlowInputKeys(f));
      const startTime = performance.now();
      for (const group of Object.values(groupedSiteFeatures)) {
        // grouping by PATTERN_MAIN_BATCH_SIZE.
        const batches = chunk(group, PATTERN_MAIN_BATCH_SIZE);

        for (const batch of batches) {
          const firstFeature = structuredClone(batch[0]) as StackedPolygon;
          const otherFeatures = batch.filter((_f, i) => i !== 0) as StackedPolygon[];
          firstFeature.properties.childFeatures = otherFeatures;

          const rawEvaluatedFeatures = await rpc.invoke("evaluateFeatures", [[firstFeature]]);

          const flattenedEvaluatedFeatures = Object.values(rawEvaluatedFeatures).flat() as StackedSection[];

          const groupedEvaluatedFeaturesBySiteId = groupBy(flattenedEvaluatedFeatures, "properties.pattern.siteId");

          const setbackFeatures = groupedEvaluatedFeaturesBySiteId["undefined"];
          geoJsonFeaturesForSiteSetback.push(...setbackFeatures);

          for (const siteEvaluatedFeatures of Object.values(groupedEvaluatedFeaturesBySiteId) as StackedSection[][]) {
            try {
              const groupedEvaluatedFeaturesByPatternId = groupBy(siteEvaluatedFeatures, "properties.pattern.id");

              /* fsr & netArea stats (from main app, sometimes it is never calculated) */
              Object.values(groupedEvaluatedFeaturesByPatternId).forEach((features) => {
                features.forEach((feature) => {
                  if (feature.properties.pattern && feature.properties.pattern.area === undefined) {
                    const projectPattern = projectPatterns.find((e: any) => e.id === feature.properties.pattern.id);
                    const area = projectPattern.stats.area;
                    const fsr = area / feature.properties.pattern.siteArea;
                    feature.properties.pattern.name = projectPattern.name;
                    feature.properties.pattern.fsr = fsr;
                    feature.properties.pattern.area = area;
                  }
                });
              });

              /* sort by selected sort type */
              const featuresArray = Object.keys(groupedEvaluatedFeaturesByPatternId)
                .filter((key) => key !== "undefined")
                .map((key) => groupedEvaluatedFeaturesByPatternId[key])
                .sort((a, b) => b[0].properties.pattern[sortType] - a[0].properties.pattern[sortType]);

              if (featuresArray.length > 0) {
                const minIx = Math.min(...featuresArray[0].map((e) => e.properties.ix ?? 0));
                featuresArray[0].forEach((e) => (e.properties.ix = e.properties.ix - minIx));
              }

              await updatePatternGeoJsonFeatures(featuresArray, geoJsonFeaturesForPattern);
            } catch (e) {
              console.error("getting shortlist patterns failed (evaluateFeatures) :", e);
            }
          }

          setProgress(Math.floor((index / siteFeatures.length) * 100));
          index += batch.length;
        }

        await updatePatternTempLayerGeoJSON(geoJsonFeaturesForPattern);
      }
      const endTime = performance.now();
      console.log(`Time taken for batch ${index}: ${endTime - startTime} milliseconds`);

      await updateSiteSetbackToTempLayer(geoJsonFeaturesForSiteSetback);

      setGeoJsonFeaturesForPattern(geoJsonFeaturesForPattern);
      setGeoJsonFeaturesForSiteSetback(geoJsonFeaturesForSiteSetback);

      setPlacingPatterns(false);
    },
    [
      updateSiteSetbackToTempLayer,
      updatePatternTempLayerGeoJSON,
      updatePatternGeoJsonFeatures,
      projectPatterns,
      sortType,
    ],
  );

  const updateSelectedSites = useCallback(
    async (selectedSites: { value: string; label: string }[]) => {
      const selectedSiteFeatures = structuredClone(
        siteFeatures.filter((f) => selectedSites.some((s) => s.value === f.properties.id)),
      ).map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          id: `temp_${f.properties.id}`,
          flow: undefined,
          color: "#3CB371",
          strokeWidth: 2,
          strokeColor: "#228B22",
        },
      }));

      const geoJson = {
        type: "FeatureCollection",
        features: selectedSiteFeatures,
      };
      await rpc.invoke("updateTempLayerGeoJSON", [SELECTED_SITES_LAYER_NAME, geoJson, true]);
    },
    [siteFeatures],
  );

  const handleSelectSiteLayer = useCallback(
    async (e: { value: string | number }) => {
      setSelectedSites([]);
      updateSelectedSites([]);
      setSiteFeatures([]);
      setSiteLayerId(e.value);
      const siteLayer = geoJsonLayers.find((l) => l.id === e.value);
      if (siteLayer) {
        try {
          const siteLayerContents = await rpc.invoke("getLayerContents", [siteLayer.name]);
          setSiteLayerContents(siteLayerContents);
        } catch (error) {
          console.error("getting site layer contents failed", error);
        }
      }
    },
    [geoJsonLayers, updateSelectedSites],
  );

  const handleSelectSites = useCallback(
    async (e: { value: string; label: string }[]) => {
      setSelectedSites(e);

      updateSelectedSites(e);
    },
    [updateSelectedSites],
  );

  const [projects, setProjects] = useState([]);
  const [loadingProject, setLoadingProject] = useState(false);
  const [placingPatterns, setPlacingPatterns] = useState(false);
  const [placingPattern, setPlacingPattern] = useState(false);

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const id = window.setTimeout(() => {
      getSites(siteLayerContents, roadContents, projectPatterns, selectedPatternIds, params);
    }, GET_SITES_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [siteLayerContents, roadContents, params, getSites, selectedPatternIds, projectPatterns]);

  useEffect(() => {
    const fetchProjects = async () => {
      const result = await rpc.invoke("getProjects");
      setProjects(result.features);
    };
    fetchProjects();
  }, []);

  const handlePlacePatterns = useCallback(async () => {
    if (!selectedSites.length) return;

    // NOTE: prefiltering
    const selectedSiteFeatures = getValidPatternsForSitePlacement(selectedSites, siteFeatures, projectPatterns);

    // NOTE: placing patterns
    getShortListPatterns(selectedSiteFeatures);
  }, [selectedSites, siteFeatures, getShortListPatterns, projectPatterns]);

  // NOTE: sorted evaluated blocks according to the sort type and filter
  const sortedEvaluatedPatterns = useMemo(() => {
    return structuredClone(projectPatterns)
      .sort((a: any, b: any) => b.stats[sortType] - a.stats[sortType])
      .filter((block: any) => {
        if (filter.patternParking) {
          return block.stats.patternParking === filter.patternParking;
        }
        if (filter.patternStyle) {
          return block.stats.patternStyle === filter.patternStyle;
        }
        return true;
      });
  }, [sortType, filter, projectPatterns]);

  const updatePatternIds = useCallback(
    (sortAndFilter: SortAndFilter, oldIds?: string[]) => {
      const ids = oldIds ? oldIds : projectPatterns.map((p: any) => p.id);
      const { sort: sortType, filter } = sortAndFilter;

      const sortedPatterns = structuredClone(projectPatterns).sort(
        (a: any, b: any) => b.stats[sortType!] - a.stats[sortType!],
      );

      const filtered = ids
        .sort(
          (a: string, b: string) =>
            sortedPatterns.findIndex((e: any) => e.id === a) - sortedPatterns.findIndex((e: any) => e.id === b),
        )
        .filter((id: string) => {
          const block = projectPatterns.find((e: any) => e.id === id);
          if (filter?.patternParking) {
            return block?.stats.patternParking === filter.patternParking;
          }
          if (filter?.patternStyle) {
            return block?.stats.patternStyle === filter.patternStyle;
          }
          return true;
        });
      setSelectedPatternIds(filtered);
    },
    [projectPatterns],
  );

  const handleSortTypeChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const next = e.target.value as SortType;
      setSortType(next);
      if (projectPatterns.length > 0) {
        updatePatternIds({ filter, sort: next }, selectedPatternIds);
      }
    },
    [filter, projectPatterns.length, selectedPatternIds, updatePatternIds],
  );

  const handleSelectProject = useCallback(
    async (e: { value: string }) => {
      setSelectedPatternIds([]);
      setPlacingPatterns(false);
      setLoadingProject(true);
      setProjectBundle({});
      try {
        setProgress(0);
        const projectBundle = await rpc.invoke("getProjectBundle", [e.value]);
        setProgress(30);

        const blockOrigins = Object.values(projectBundle.rawSections as Record<string, RawSection>).filter(
          (e) => e.geometry.type === "Point" && e.properties.blockId,
        );
        const projectUsages = projectBundle.projectApps[1].featureCategories?.usage;

        // add pattern blocks to the project if they don't exist
        const allBlocksArray = Object.values(projectBundle.blocks);
        let index = 0;
        for (const block of allBlocksArray) {
          const hasBlock = !!blocks[(block as BlockDefinition).id];

          // clean up block if it exists
          if (hasBlock && cleanOldBlocks) {
            const blockId = (block as BlockDefinition).id;
            await rpc.invoke("deleteBlock", [blockId]);
          }
          // create block
          if (!hasBlock || cleanOldBlocks) {
            const clonedBlock = structuredClone(block) as BlockDefinition;
            clonedBlock.features.forEach((feature: any) => {
              feature.properties._projected = feature._projected;
            });
            await rpc.invoke("createBlock", [clonedBlock]);
          }
          setProgress(30 + (index++ / allBlocksArray.length) * 30);
        }

        await rpc.invoke("removeTempLayer", [PATTERN_LAYER_NAME]);

        const usages = (projectAppsByAppID[1]?.featureCategories?.usage ?? []) as Record<
          string,
          { join: { color: string } }
        >;
        const colors = uniq(Object.values(usages).map((e) => e.join.color)).filter((e) => e !== undefined);
        const paletteMap = colors.map((e) => ({ value: e, color: e }));

        await rpc.invoke("addTempLayerGeoJSON", [
          PATTERN_LAYER_NAME,
          { type: "FeatureCollection", features: [] },
          { type: "fill-extrusion" },
          {
            showLines: true,
            mainLayer: "fill-extrusion",
            mainColor: {
              propertyKey: "color",
              scaleFunc: "scaleOrdinal",
              paletteId: "css",
              paletteMap,
              fallbackColor: "lightgrey",
            },
          },
        ]);
        setProgress(70);
        /* related flows */
        const flowIds = uniq(
          Object.keys(projectBundle.blocks)
            .flatMap((blockId) => {
              return projectBundle.blocks[blockId].features.map((feature: any) => feature.properties?.flow?.id);
            })
            .filter((e) => e !== undefined),
        );

        const flows = flowIds.map((flowId) => projectBundle.flows[flowId]).filter((e) => e !== undefined);

        try {
          for (const flow of flows) {
            await rpc.invoke("addFlowDag", [flow]);
          }
        } catch (e) {
          console.error("adding flows failed", e);
        }

        setProgress(80);

        // evaluate patterns
        const evaluatedPatterns: any[] = [];

        let usedUsageNames = [] as string[];
        for (const blockOrigin of blockOrigins) {
          const blockId = blockOrigin.properties.blockId;
          const isAlreadyUsed = evaluatedPatterns.some((p) => p.id === blockId); // TODO: for now, patternId === blockId, but we could use the point id with differnet settings.

          if (isAlreadyUsed) continue;
          const realOriginPoint = {
            ...(blockOrigin as RawSection),
            geometry: {
              type: "Point",
              coordinates: projectOrigin,
            },
            properties: {
              ...blockOrigin.properties,
              /* main app renference from block definition, scale will no effect the pattern evaluation */
              scale: 1,
            },
          };

          const evaluatedResult = await rpc.invoke("evaluateFeatures", [[realOriginPoint]]);
          const evaluatedFeatures = Object.values(evaluatedResult).flat() as StackedSection[];

          const usageNamesForEvaluatedFeatures = Object.keys(projectUsages).filter((key) =>
            evaluatedFeatures.some((e) => e.properties.usage === key),
          );
          usedUsageNames = usedUsageNames.concat(usageNamesForEvaluatedFeatures);

          const stats = getPatternStats(evaluatedFeatures);

          const minSiteWidth = (blockOrigin.properties.buildingWidth ?? 0) + 2 * params.side;
          const minSiteDepth = (blockOrigin.properties.buildingDepth ?? 0) + params.front + params.rear;
          const minSiteArea = blockOrigin.properties.minSiteArea ?? 0;
          const maxHeight = blockOrigin.properties.maxHeight ?? 0;

          const block = projectBundle.blocks[blockId];
          evaluatedPatterns.push({
            id: blockId, // TODO: for now, patternId === blockId, but we could use the point id with differnet settings.
            name: block.name ?? blockOrigin.properties.name ?? blockId,
            description: block.description ?? blockOrigin.properties.description,
            originPoint: blockOrigin,
            block,
            stats: {
              ...stats,
              minSiteWidth,
              minSiteDepth,
              minSiteArea,
              maxHeight,
            },
            features: evaluatedFeatures,
          });
        }
        setProgress(90);

        // sync usages
        usedUsageNames = uniq(usedUsageNames);
        const currentUsages = projectAppsByAppID[1]?.featureCategories?.usage ?? [];

        for (const usageName of usedUsageNames) {
          const projectUsage = projectUsages[usageName];
          const currentUsage = currentUsages[usageName];
          if (!currentUsage) {
            // create usage
            await rpc.invoke("createUsage", [usageName, projectUsage]);
          } else if (!isEqual(projectUsage, currentUsage)) {
            // update usage
            await rpc.invoke("updateUsage", [usageName, projectUsage]);
          }
        }

        setProgress(95);

        setProjectBundle(projectBundle);
        setProjectPatterns(evaluatedPatterns);

        updatePatternIds(
          { filter, sort: sortType },
          evaluatedPatterns.map((p) => p.id),
        );

        if (!instantPointId) {
          const instantPoint = {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: projectOrigin,
            },
            properties: {
              layerId: INSTANT_POINT_LAYER_NAME,
              fillOpacity: 0,
            },
          };
          await rpc.invoke("createRawSection", [instantPoint]);
        }

        setProgress(100);
      } catch (e) {
        console.error("loading project failed", e);
      } finally {
        setLoadingProject(false);
      }
    },
    [
      blocks,
      cleanOldBlocks,
      filter,
      instantPointId,
      params.front,
      params.rear,
      params.side,
      projectAppsByAppID,
      projectOrigin,
      sortType,
      updatePatternIds,
    ],
  );

  const handleSelectPattern = useCallback(
    async (patternId: string) => {
      let patternIds: string[];
      if (selectedPatternIds.includes(patternId)) {
        patternIds = selectedPatternIds.filter((id) => id !== patternId);
      } else {
        patternIds = [...selectedPatternIds, patternId];
      }

      setSelectedPatternIds(
        patternIds.sort(
          (a, b) =>
            sortedEvaluatedPatterns.findIndex((e: any) => e.id === a) -
            sortedEvaluatedPatterns.findIndex((e: any) => e.id === b),
        ),
      );
    },
    [selectedPatternIds, sortedEvaluatedPatterns],
  );

  const handleLassoSelect = useCallback(async () => {
    if (!siteFeatures.length || !siteLayerId) return;
    const siteLayer = geoJsonLayers.find((l) => l.id === siteLayerId);
    if (!siteLayer) return;

    await rpc.invoke("activateLensLayer", [siteLayer.name]);
    try {
      const lassoedFeatures = await rpc.invoke("getLassoedLensedFeatures");
      if (!lassoedFeatures?.length) return;

      const lassoedIds = new Set(
        lassoedFeatures
          .map((f: any) => f.properties?.id ?? f.properties?.ID)
          .filter(Boolean)
          .map(String),
      );

      const newSelections = siteFeatures
        .filter((f) => lassoedIds.has(String(f.properties.id)))
        .map((f) => ({ value: f.properties.id, label: f.properties.address }));

      if (!newSelections.length) return;

      const merged = [...selectedSites];
      for (const s of newSelections) {
        if (!merged.some((e) => e.value === s.value)) merged.push(s);
      }
      setSelectedSites(merged);
      updateSelectedSites(merged);
    } finally {
      await rpc.invoke("deactivateLensLayer");
    }
  }, [siteFeatures, selectedSites, updateSelectedSites, siteLayerId, geoJsonLayers]);

  // Click-to-toggle: listen to mapSelectCoord and toggle the clicked site
  const selectedSitesRef = useRef(selectedSites);
  selectedSitesRef.current = selectedSites;

  useEffect(() => {
    const handler = async () => {
      if (!siteFeatures.length) return;
      const feature = await rpc.invoke("getQueriedFeature");
      if (!feature?.properties) return;

      const featureId = String(feature.properties.id ?? feature.properties.ID ?? "");
      if (!featureId) return;

      const matchedSite = siteFeatures.find((f) => String(f.properties.id) === featureId);
      if (!matchedSite) return;

      const current = selectedSitesRef.current;
      const existing = current.find((s) => s.value === matchedSite.properties.id);
      const updated = existing
        ? current.filter((s) => s.value !== matchedSite.properties.id)
        : [
            ...current,
            {
              value: matchedSite.properties.id,
              label: matchedSite.properties.address,
            },
          ];

      setSelectedSites(updated);
      updateSelectedSites(updated);
    };

    giraffeState.addListener(["mapSelectCoord"], handler);
  }, [siteFeatures, updateSelectedSites]);

  const handleSelectAllSites = useCallback(() => {
    const newSelectedSites = siteFeatures.map((f) => ({
      value: f.properties.id,
      label: f.properties.address ?? f.properties.id,
    }));
    setSelectedSites(newSelectedSites);
    updateSelectedSites(newSelectedSites);
  }, [siteFeatures, updateSelectedSites]);

  const handleClearSelection = useCallback(() => {
    setSelectedSites([]);
    updateSelectedSites([]);
  }, [updateSelectedSites, setSelectedSites]);

  const handlePlacePatternToSelectedSite = useCallback(
    async (patternFeatures: StackedPolygon[], setbackFeature: StackedPolygon) => {
      setPlacingPattern(true);
      const siteId = patternFeatures[0].properties.pattern.siteId;
      const newGeoJsonFeatures = structuredClone(
        geoJsonFeaturesForPattern.filter((f) => f.properties!.pattern.siteId !== siteId),
      );

      const featuresArray = [structuredClone(patternFeatures)];
      const minIx = Math.min(...featuresArray[0].map((e) => e.properties.ix ?? 0));
      featuresArray[0].forEach((e) => (e.properties.ix = e.properties.ix - minIx));

      await updatePatternGeoJsonFeatures(featuresArray, newGeoJsonFeatures);
      await updatePatternTempLayerGeoJSON(newGeoJsonFeatures);
      setGeoJsonFeaturesForPattern(newGeoJsonFeatures);
      const newGeoJsonFeaturesForSiteSetback = structuredClone(
        geoJsonFeaturesForSiteSetback.filter((f) => f.properties!.id !== setbackFeature.properties.id),
      );
      newGeoJsonFeaturesForSiteSetback.push(setbackFeature);
      await updateSiteSetbackToTempLayer(newGeoJsonFeaturesForSiteSetback);
      setGeoJsonFeaturesForSiteSetback(newGeoJsonFeaturesForSiteSetback);
      setPlacingPattern(false);
    },
    [
      geoJsonFeaturesForPattern,
      geoJsonFeaturesForSiteSetback,
      updatePatternGeoJsonFeatures,
      updatePatternTempLayerGeoJSON,
      updateSiteSetbackToTempLayer,
    ],
  );

  const selectedPatternIdForSite = useMemo(() => {
    return geoJsonFeaturesForPattern.find((f) => f.properties!.pattern.siteId === selectedSiteId)?.properties!.pattern
      .id;
  }, [geoJsonFeaturesForPattern, selectedSiteId]);

  return (
    <div className="flex flex-col gap-2 p-4">
      <h1 className="mb-2 font-[arial] text-2xl font-bold">
        Pattern <br /> Book
      </h1>

      {selectedSiteId !== undefined ? (
        <ShortListPanel
          siteFeature={siteFeatures.find((f) => f.properties.id === selectedSiteId) as StackedPolygon}
          projectPatterns={projectPatterns}
          placingPattern={placingPattern}
          disabled={placingPatterns}
          sortType={sortType}
          selectedPatternId={selectedPatternIdForSite}
          onBack={() => clearSelectedSiteFeature()}
          onSelectPattern={handlePlacePatternToSelectedSite}
        />
      ) : (
        <div className="flex flex-col gap-2">
          <SitesPanel
            placingPatterns={placingPatterns}
            geoJsonLayers={geoJsonLayers}
            siteLayerId={siteLayerId}
            onSelectSiteLayer={handleSelectSiteLayer}
            selectedRoadLayers={selectedRoadLayers}
            onRoadLayersChange={setSelectedRoadLayers}
            roadLayers={roadLayers}
            onUpdateRoads={handleUpdateRoads}
            params={params}
            setParams={setParams}
            siteFeatures={siteFeatures}
            selectedSites={selectedSites}
            onSelectSites={handleSelectSites}
            onLassoSelect={handleLassoSelect}
            onSelectAllSites={handleSelectAllSites}
            onClearSelection={handleClearSelection}
          />
          <Patterns
            sortType={sortType}
            onSortTypeReactSelectChange={setSortType}
            onSortTypeNativeChange={handleSortTypeChange}
            filter={filter}
            setFilter={setFilter}
            placingPatterns={placingPatterns}
            projectPatterns={projectPatterns}
            projectBundle={projectBundle}
            sortedEvaluatedPatterns={sortedEvaluatedPatterns}
            selectedPatternIds={selectedPatternIds}
            onSelectAllPatterns={() => setSelectedPatternIds(sortedEvaluatedPatterns.map((p: any) => p.id))}
            onDeselectAllPatterns={() => setSelectedPatternIds([])}
            projects={projects}
            loadingProject={loadingProject}
            cleanOldBlocks={cleanOldBlocks}
            onCleanOldBlocksToggle={() => setCleanOldBlocks(!cleanOldBlocks)}
            onSelectProject={handleSelectProject}
            onTogglePattern={handleSelectPattern}
            onPlacePatterns={handlePlacePatterns}
            progress={progress}
            selectedSitesCount={selectedSites.length}
          />
        </div>
      )}
    </div>
  );
}

export default Main;
