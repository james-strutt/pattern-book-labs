import type { Feature, FeatureCollection } from "geojson";
import type { AnyLayer, LngLatBoundsLike, LngLatLike, ExpressionSpecification } from "mapbox-gl";
import type { FeatureWithProperties } from "@/constants/featureProps";

/**
 * Typed wrapper for `giraffeState.get("rawSections")`.
 *
 * The SDK declares this as `FeatureCollection<RawSection['geometry'], RawSection['properties']>`
 * but `@gi-nx/gi-types` is not installed, so generics resolve to `any`. This type provides
 * the actual shape: a FeatureCollection whose features have guaranteed non-null properties
 * (matching `FeatureWithProperties`).
 */
export interface GiraffeRawSections extends Omit<FeatureCollection, 'features'> {
  features: FeatureWithProperties[];
}

/**
 * Typed wrapper for `giraffeState.get("projectLayers")`.
 */
export interface GiraffeProjectLayer {
  id: string | number;
  name?: string;
  layer_full?: {
    id?: string | number;
    name?: string;
    description?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * SDK Return Type Interfaces
 * These define the expected structure of data returned from iframe SDK methods.
 */

export interface ProjectDetails {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  ownerId?: string;
  teamId?: string;
  settings?: Record<string, unknown>;
}

export interface Vista {
  id: string;
  name: string;
  bounds?: [number, number, number, number];
  center?: [number, number];
  zoom?: number;
  bearing?: number;
  pitch?: number;
}

export interface ProjectApp {
  id: string;
  name: string;
  type?: string;
  config?: Record<string, unknown>;
  enabled?: boolean;
}

export interface GiraffeProjectFeature {
  type: "Feature";
  geometry: Record<string, unknown>;
  properties: {
    id?: string;
    name?: string;
    description?: string;
    [key: string]: unknown;
  };
}

export interface GiraffeProjectCollection {
  type: "FeatureCollection";
  features: GiraffeProjectFeature[];
}

export interface ProjectBundleApp {
  app?: string;
  public?: Record<string, unknown> | string;
  [key: string]: unknown;
}

export interface ProjectBundle {
  activeProject?: GiraffeProjectFeature;
  projectApps?: Record<string, ProjectBundleApp>;
  projectLayers?: unknown[];
  layerTree?: Record<string, unknown>;
  rawSections?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AnalyticsResult {
  id?: string;
  data?: Record<string, unknown>;
  metrics?: Record<string, number>;
  timestamp?: string;
}

export interface Team {
  id: string;
  name: string;
  members?: string[];
  permissions?: Record<string, unknown>;
}

export interface LensDefinition {
  mainLayer?: string;
  mainColor?: { fixedValue?: string; property?: string };
  fillOpacity?: number;
  lineColor?: { fixedValue?: string; property?: string };
  showLines?: boolean;
  overrideFillExtrusion?: {
    paint?: Record<string, unknown>;
  };
}

export interface LayerContents {
  features: Feature[];
  type: "FeatureCollection";
}

/**
 * Mapbox GL filter expression type
 * Used for queryRenderedFeatures and layer filters
 */
export type MapboxFilterExpression = ExpressionSpecification | boolean | null | undefined;

export interface FlyToOptions {
  center: [number, number];
  zoom?: number;
  bearing?: number;
  pitch?: number;
  duration?: number;
}

export interface FitBoundsOptions {
  animate?: boolean;
  padding?: number;
}

export interface UpdateUiLayoutConfig {
  rightBarOpen?: boolean;
  rightBarOpenWidth?: number;
  leftBarOpen?: boolean;
  leftBarOpenWidth?: number;
  lensTableHeight?: number;
  sdkPopupOpen?: boolean;
}

export interface QueryRenderedFeaturesOptions {
  filter?: MapboxFilterExpression;
  layers?: string[];
}

export interface FeatureStateTarget {
  source: string;
  id: string | number;
}

export interface LayerStyleUpdate {
  paint?: Record<string, unknown>;
  layout?: Record<string, unknown>;
}

export interface HtmlPopupConfig {
  lngLat: [number, number];
  html: string;
  closeButton?: boolean;
  closeOnClick?: boolean;
  anchor?:
    | "center"
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";
  offset?: [number, number];
}

export interface IframePopupConfig {
  lngLat: [number, number];
  url: string;
  width?: number;
  height?: number;
  closeButton?: boolean;
  anchor?:
    | "center"
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";
  offset?: [number, number];
}

export interface ContextMenuItem {
  label: string;
  action: string;
  icon?: string;
}

export interface TempLayerDefinition {
  id: string;
  type: string;
  source: {
    type: string;
    data?: FeatureCollection;
    [key: string]: unknown;
  };
  paint?: Record<string, unknown>;
  layout?: Record<string, unknown>;
  filter?: unknown;
  [key: string]: unknown;
}

export interface RpcMethodSignatures {
  flyTo: (options: FlyToOptions) => Promise<void>;
  fitBounds: (
    bounds: LngLatBoundsLike,
    options?: FitBoundsOptions
  ) => Promise<void>;
  getSelectedFeatures: () => Promise<FeatureCollection>;
  setSelectedFeatures: (featureIds: string[]) => Promise<void>;
  setHighlightedFeatures: (featureIds: string[]) => Promise<void>;
  queryRenderedFeatures: (
    lngLat: LngLatLike,
    options?: QueryRenderedFeaturesOptions,
    pixBuffer?: number
  ) => Promise<Feature[]>;
  getQueriedFeature: (featureId: string) => Promise<Feature | null>;
  getMapBounds: () => Promise<LngLatBoundsLike>;
  setFeatureState: (
    target: FeatureStateTarget,
    state: Record<string, unknown>
  ) => Promise<void>;
  getFeatureState: (target: FeatureStateTarget) => Promise<Record<string, unknown>>;
  removeFeatureState: (
    target: FeatureStateTarget,
    stateKey?: string
  ) => Promise<void>;
  addHtmlPopup: (config: HtmlPopupConfig) => Promise<void>;
  addIframePopup: (
    url: string,
    lngLat: [number, number],
    options: { closeButton?: boolean; closeOnClick?: boolean; anchor?: string; offset?: [number, number]; className?: string },
    width?: number,
    height?: number,
    openOverBottomBarContent?: boolean
  ) => Promise<void>;
  clearSDKPopup: () => Promise<void>;
  addTempLayerGeoJSON: (
    layerName: string,
    geojson: FeatureCollection,
    style?: Record<string, unknown> | null
  ) => Promise<string>;
  addTempLayer: (
    layerName: string,
    layerDef: TempLayerDefinition,
    lens?: LensDefinition | null,
    hideInTree?: boolean,
    opacity?: number
  ) => Promise<string>;
  updateTempLayerGeoJSON: (
    layerId: string,
    geojson: FeatureCollection
  ) => Promise<void>;
  removeTempLayer: (layerId: string) => Promise<void>;
  updateLayerStyle: (
    layerName: string,
    style: LayerStyleUpdate
  ) => Promise<void>;
  getLayerContents: (layerIds: string[]) => Promise<LayerContents | FeatureCollection>;
  changeLayerOpacity: (layerId: string, opacity: number) => Promise<void>;
  activateDrawingLayer: (layerName: string) => Promise<void>;
  activateLensLayer: (layerName: string) => Promise<void>;
  deactivateLensLayer: () => Promise<void>;
  getLayerPermission: (layerName: string) => Promise<string>;
  createLayerGroup: (groupName: string) => Promise<void>;
  moveLayerTreeItemIntoGroup: (
    itemId: string,
    groupId: string
  ) => Promise<void>;
  removeLayerGroup: (groupName: string) => Promise<void>;
  reorderLayerTreeItem: (itemId: string, newIndex: number) => Promise<void>;
  activateViewLayers: (viewId: string) => Promise<void>;
  setDrawTool: (tool: string) => Promise<void>;
  getUserDrawnPolygon: () => Promise<Feature | null>;
  getLassoShape: () => Promise<Feature | null>;
  getSelectableProjectFeatures: () => Promise<FeatureCollection>;
  getLassoedProjectFeatures: () => Promise<FeatureCollection>;
  addMapboxEventListener: (
    eventType: string,
    debounceTime?: number
  ) => Promise<string>;
  removeMapboxEventListener: (listenerId: string) => Promise<void>;
  updateUiLayout: (config: UpdateUiLayoutConfig) => Promise<void>;
  getUrlParams: () => Promise<Record<string, string>>;
  fetchProjectDetails: () => Promise<ProjectDetails>;
  fetchVistas: () => Promise<Vista[]>;
  createRawSection: (feature: Feature) => Promise<void>;
  getProjectApp: (appId: string) => Promise<ProjectApp>;
  setContextMenuItems: (items: ContextMenuItem[]) => Promise<void>;
  enableIsolateMode: () => Promise<void>;
  disableIsolateMode: () => Promise<void>;
  enableMapHover: () => Promise<void>;
  disableMapHover: () => Promise<void>;
  setTopView: () => Promise<void>;
  getAnalyticsResult: () => Promise<AnalyticsResult>;
  getTeamList: () => Promise<Team[]>;
  readyToClose: () => Promise<void>;
  enableBottomBarIframe: (url: string, height?: number) => Promise<void>;
  disableBottomBarIframe: () => Promise<void>;
  getProjects: () => Promise<GiraffeProjectCollection>;
  getProjectBundle: (projectId: string) => Promise<ProjectBundle>;
}

export interface TypedRpc {
  invoke<T extends keyof RpcMethodSignatures>(
    method: T,
    ...args: Parameters<RpcMethodSignatures[T]>
  ): ReturnType<RpcMethodSignatures[T]>;
  /** Fallback overload for dynamic method calls not in RpcMethodSignatures */
  invoke<T = unknown>(method: string, params?: unknown[]): Promise<T>;
}

declare module "@gi-nx/iframe-sdk" {
  export interface UILayoutConfig {
    rightBarOpen?: boolean;
    rightBarOpenWidth?: number;
    leftBarOpen?: boolean;
    leftBarOpenWidth?: number;
    lensTableHeight?: number;
    sdkPopupOpen?: boolean;
  }
}
