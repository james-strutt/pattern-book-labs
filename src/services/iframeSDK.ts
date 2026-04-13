import type {
  AnalyticsResult,
  ContextMenuItem,
  FeatureStateTarget,
  FitBoundsOptions,
  FlyToOptions,
  GiraffeProjectCollection,
  GiraffeProjectLayer,
  GiraffeRawSections,
  HtmlPopupConfig,
  IframePopupConfig,
  LayerContents,
  LayerStyleUpdate,
  LensDefinition,
  ProjectApp,
  ProjectBundle,
  ProjectDetails,
  QueryRenderedFeaturesOptions,
  RpcMethodSignatures,
  Team,
  TempLayerDefinition,
  TypedRpc,
  UpdateUiLayoutConfig,
  Vista,
} from "@/types/external/iframe-sdk";
import { rpc as baseRpc, giraffeState } from "@gi-nx/iframe-sdk";
import type { Feature, FeatureCollection } from "geojson";

type LngLatBoundsLike = [number, number, number, number] | [[number, number], [number, number]];
type LngLatLike = [number, number] | { lng: number; lat: number };
type AnyLayerPaint = Record<string, unknown>;

function typedInvoke<T extends keyof RpcMethodSignatures>(
  method: T,
  ...args: Parameters<RpcMethodSignatures[T]>
): ReturnType<RpcMethodSignatures[T]>;
function typedInvoke<T = unknown>(method: string, ...args: unknown[]): Promise<T> {
  return baseRpc.invoke(method, args);
}

const rpc = {
  invoke: typedInvoke,
} as TypedRpc;

export async function flyTo(options: FlyToOptions): Promise<void> {
  return rpc.invoke("flyTo", options);
}

export async function fitBounds(bounds: LngLatBoundsLike, options?: FitBoundsOptions): Promise<void> {
  return rpc.invoke("fitBounds", bounds, options);
}

export async function getSelectedFeatures(): Promise<FeatureCollection> {
  return rpc.invoke("getSelectedFeatures");
}

export async function setSelectedFeatures(featureIds: string[]): Promise<void> {
  return rpc.invoke("setSelectedFeatures", featureIds);
}

export async function setHighlightedFeatures(featureIds: string[]): Promise<void> {
  return rpc.invoke("setHighlightedFeatures", featureIds);
}

export async function queryRenderedFeatures(
  lngLat: LngLatLike,
  options?: QueryRenderedFeaturesOptions,
  pixBuffer?: number,
): Promise<Feature[]> {
  return rpc.invoke("queryRenderedFeatures", lngLat, options, pixBuffer);
}

export async function getQueriedFeature(featureId: string): Promise<Feature | null> {
  return rpc.invoke("getQueriedFeature", featureId);
}

export async function getMapBounds(): Promise<LngLatBoundsLike> {
  return rpc.invoke("getMapBounds") as Promise<LngLatBoundsLike>;
}

export async function setFeatureState(target: FeatureStateTarget, state: Record<string, unknown>): Promise<void> {
  return rpc.invoke("setFeatureState", target, state);
}

export async function getFeatureState(target: FeatureStateTarget): Promise<Record<string, unknown>> {
  return rpc.invoke("getFeatureState", target);
}

export async function removeFeatureState(target: FeatureStateTarget, stateKey?: string): Promise<void> {
  return rpc.invoke("removeFeatureState", target, stateKey);
}

export async function addHtmlPopup(config: HtmlPopupConfig): Promise<void> {
  return rpc.invoke("addHtmlPopup", config);
}

export async function addIframePopup(config: IframePopupConfig): Promise<void> {
  return rpc.invoke(
    "addIframePopup",
    config.url,
    config.lngLat,
    {
      closeButton: config.closeButton,
      anchor: config.anchor,
      offset: config.offset,
    },
    config.width,
    config.height,
  );
}

export async function clearSDKPopup(): Promise<void> {
  return rpc.invoke("clearSDKPopup");
}

export async function addTempLayerGeoJSON(
  layerName: string,
  geojson: FeatureCollection,
  style?: AnyLayerPaint,
): Promise<string> {
  return rpc.invoke("addTempLayerGeoJSON", layerName, geojson, style);
}

export async function updateTempLayerGeoJSON(layerId: string, geojson: FeatureCollection): Promise<void> {
  return rpc.invoke("updateTempLayerGeoJSON", layerId, geojson);
}

export async function addTempLayer(
  layerName: string,
  layerDef: TempLayerDefinition,
  lens?: LensDefinition | null,
  hideInTree?: boolean,
  opacity?: number,
): Promise<string> {
  return rpc.invoke("addTempLayer", layerName, layerDef, lens, hideInTree, opacity);
}

export async function removeTempLayer(layerId: string): Promise<void> {
  return rpc.invoke("removeTempLayer", layerId);
}

export async function updateLayerStyle(layerName: string, style: LayerStyleUpdate): Promise<void> {
  return rpc.invoke("updateLayerStyle", layerName, style);
}

export async function getLayerContents(layerIds: string[]): Promise<LayerContents | FeatureCollection> {
  return rpc.invoke("getLayerContents", layerIds);
}

export async function changeLayerOpacity(layerId: string, opacity: number): Promise<void> {
  return rpc.invoke("changeLayerOpacity", layerId, opacity);
}

export async function activateDrawingLayer(layerName: string): Promise<void> {
  return rpc.invoke("activateDrawingLayer", layerName);
}

export async function activateLensLayer(layerName: string): Promise<void> {
  return rpc.invoke("activateLensLayer", layerName);
}

export async function deactivateLensLayer(): Promise<void> {
  return rpc.invoke("deactivateLensLayer");
}

export async function getLayerPermission(layerName: string): Promise<string> {
  return rpc.invoke("getLayerPermission", layerName);
}

export async function createLayerGroup(groupName: string): Promise<void> {
  return rpc.invoke("createLayerGroup", groupName);
}

export async function moveLayerTreeItemIntoGroup(itemId: string, groupId: string): Promise<void> {
  return rpc.invoke("moveLayerTreeItemIntoGroup", itemId, groupId);
}

export async function removeLayerGroup(groupName: string): Promise<void> {
  return rpc.invoke("removeLayerGroup", groupName);
}

export async function reorderLayerTreeItem(itemId: string, newIndex: number): Promise<void> {
  return rpc.invoke("reorderLayerTreeItem", itemId, newIndex);
}

export async function activateViewLayers(viewId: string): Promise<void> {
  return rpc.invoke("activateViewLayers", viewId);
}

export async function setDrawTool(tool: string): Promise<void> {
  return rpc.invoke("setDrawTool", tool);
}

export async function getUserDrawnPolygon(): Promise<Feature | null> {
  return rpc.invoke("getUserDrawnPolygon");
}

export async function getLassoShape(): Promise<Feature | null> {
  return rpc.invoke("getLassoShape");
}

export async function getSelectableProjectFeatures(): Promise<FeatureCollection> {
  return rpc.invoke("getSelectableProjectFeatures");
}

export async function getLassoedProjectFeatures(): Promise<FeatureCollection> {
  return rpc.invoke("getLassoedProjectFeatures");
}

export async function addMapboxEventListener(eventType: string, debounceTime?: number): Promise<string> {
  return rpc.invoke("addMapboxEventListener", eventType, debounceTime);
}

export async function removeMapboxEventListener(listenerId: string): Promise<void> {
  return rpc.invoke("removeMapboxEventListener", listenerId);
}

export async function updateUiLayout(config: UpdateUiLayoutConfig): Promise<void> {
  return rpc.invoke("updateUiLayout", config);
}

export async function getUrlParams(): Promise<Record<string, string>> {
  return rpc.invoke("getUrlParams");
}

export async function fetchProjectDetails(): Promise<ProjectDetails> {
  return rpc.invoke("fetchProjectDetails");
}

export async function fetchVistas(): Promise<Vista[]> {
  return rpc.invoke("fetchVistas");
}

export async function createRawSection(feature: Feature): Promise<void> {
  return rpc.invoke("createRawSection", feature);
}

export async function getProjectApp(appId: string): Promise<ProjectApp> {
  return rpc.invoke("getProjectApp", appId);
}

export async function setContextMenuItems(items: ContextMenuItem[]): Promise<void> {
  return rpc.invoke("setContextMenuItems", items);
}

export async function enableIsolateMode(): Promise<void> {
  return rpc.invoke("enableIsolateMode");
}

export async function disableIsolateMode(): Promise<void> {
  return rpc.invoke("disableIsolateMode");
}

export async function enableMapHover(): Promise<void> {
  return rpc.invoke("enableMapHover");
}

export async function disableMapHover(): Promise<void> {
  return rpc.invoke("disableMapHover");
}

export async function setTopView(): Promise<void> {
  return rpc.invoke("setTopView");
}

export async function getAnalyticsResult(): Promise<AnalyticsResult> {
  return rpc.invoke("getAnalyticsResult");
}

export async function getTeamList(): Promise<Team[]> {
  return rpc.invoke("getTeamList");
}

export async function readyToClose(): Promise<void> {
  return rpc.invoke("readyToClose");
}

export async function enableBottomBarIframe(url: string, height?: number): Promise<void> {
  return rpc.invoke("enableBottomBarIframe", url, height);
}

export async function disableBottomBarIframe(): Promise<void> {
  return rpc.invoke("disableBottomBarIframe");
}

export async function getProjects(): Promise<GiraffeProjectCollection> {
  return rpc.invoke("getProjects");
}

export async function getProjectBundle(projectId: string): Promise<ProjectBundle> {
  return rpc.invoke("getProjectBundle", projectId);
}

export async function getPng(): Promise<string> {
  return rpc.invoke("getPng" as never) as Promise<string>;
}

export function getRawSections(): GiraffeRawSections | undefined {
  return giraffeState.get("rawSections") as GiraffeRawSections | undefined;
}

export function getProjectLayers(): GiraffeProjectLayer[] | undefined {
  return giraffeState.get("projectLayers") as GiraffeProjectLayer[] | undefined;
}
