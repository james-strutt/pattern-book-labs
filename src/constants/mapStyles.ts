export const MAP_COLORS = {
  BOUNDARY_RED: "#ff0000",
  HOVER_YELLOW: "#ffff00",
  SELECTION_BLUE: "#3b82f6",
  MARKER_RED: "#dc2626",
  WHITE: "#ffffff",
  BLACK: "#1f2937",
} as const;

export interface MapboxLinePaint {
  "line-color": string;
  "line-width": number;
  "line-opacity": number;
}

export interface MapboxLineLayout {
  "line-join": "round" | "miter" | "bevel";
  "line-cap": "round" | "butt" | "square";
  visibility: "visible" | "none";
}

export interface MapboxFillPaint {
  "fill-color": string;
  "fill-opacity": number;
}

export interface MapboxFillLayout {
  visibility?: "visible" | "none";
}

export interface MapboxLineLayerStyle {
  type: "line";
  paint: MapboxLinePaint;
  layout: MapboxLineLayout;
}

export interface MapboxFillLayerStyle {
  type: "fill";
  paint: MapboxFillPaint;
  layout?: MapboxFillLayout;
}

export const BOUNDARY_LINE_STYLE: MapboxLineLayerStyle = {
  type: "line",
  paint: {
    "line-color": MAP_COLORS.BOUNDARY_RED,
    "line-width": 3,
    "line-opacity": 1,
  },
  layout: {
    "line-join": "round",
    "line-cap": "round",
    visibility: "visible",
  },
};

export const HOVER_HIGHLIGHT_FILL_STYLE: MapboxFillLayerStyle = {
  type: "fill",
  paint: {
    "fill-color": MAP_COLORS.HOVER_YELLOW,
    "fill-opacity": 0.5,
  },
};

export interface MapboxLineLayerWithId extends MapboxLineLayerStyle {
  id: string;
}

export interface MapboxFillLayerWithId extends MapboxFillLayerStyle {
  id: string;
}

export const createBoundaryLineStyle = (
  layerId: string
): MapboxLineLayerWithId => {
  return {
    id: layerId,
    ...BOUNDARY_LINE_STYLE,
  };
};

export const createHoverHighlightFillStyle = (
  layerId: string
): MapboxFillLayerWithId => {
  return {
    id: layerId,
    ...HOVER_HIGHLIGHT_FILL_STYLE,
  };
};

export const createLineStyle = (
  layerId: string,
  color: string,
  width: number = 3,
  opacity: number = 1
): MapboxLineLayerWithId => {
  return {
    id: layerId,
    type: "line",
    paint: {
      "line-color": color,
      "line-width": width,
      "line-opacity": opacity,
    },
    layout: {
      "line-join": "round",
      "line-cap": "round",
      visibility: "visible",
    },
  };
};
