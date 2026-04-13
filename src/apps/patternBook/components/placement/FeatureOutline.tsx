import React, { type SVGProps } from "react";
import { LANDIQ_THEME } from "@/components/ui/landiq/theme";
import type {
  ProjectedCoordinate,
  ProjectedFeature,
  ProjectedLineString,
  ProjectedPoint,
  ProjectedPolygon,
} from "@/apps/patternBook/types/projectedGeometry";

interface FeatureOutlineProps
  extends SVGProps<SVGPathElement & SVGCircleElement> {
  feature: ProjectedFeature | ProjectedFeature[];
  index?: number;
  showIndex?: boolean;
  isHighlighted?: boolean;
  highlightEdgeIndices?: number[];
  onMouseClick?: (index?: number) => void;
}

const DEFAULT_FILL = "#EDF4FC";
const HIGHLIGHT_FILL = LANDIQ_THEME.colors.status.warning ?? "#FF6E40";
const DEFAULT_STROKE = LANDIQ_THEME.colors.text.dark;
const HIGHLIGHT_EDGE = LANDIQ_THEME.colors.status.error;

type PathElementProps = SVGProps<SVGPathElement & SVGCircleElement>;

interface PolygonOutlineParams {
  poly: ProjectedPolygon;
  index?: number;
  showIndex?: boolean;
  isHighlighted?: boolean;
  highlightEdgeIndices: number[];
  onMouseClick?: (index?: number) => void;
  pathProps: PathElementProps;
}

export const FeatureOutline: React.FC<FeatureOutlineProps> = ({
  feature,
  index,
  showIndex,
  isHighlighted,
  highlightEdgeIndices = [],
  onMouseClick,
  ...pathProps
}) => {
  if (!feature) return null;

  if (Array.isArray(feature)) {
    return (
      <>
        {feature.map((f, i) => {
          const props = f.properties;
          const id = (props.id as string | undefined) ?? String(i);
          const ix = (props.ix as number | undefined) ?? i;
          return (
            <FeatureOutline
              key={`${i}_${id}_${ix}`}
              feature={f}
              index={i}
              showIndex={showIndex}
              {...pathProps}
            />
          );
        })}
      </>
    );
  }

  switch (feature.geometry.type) {
    case "Polygon":
      return renderProjectedPolygonOutline({
        poly: feature as ProjectedPolygon,
        index,
        showIndex,
        isHighlighted,
        highlightEdgeIndices,
        onMouseClick,
        pathProps,
      });
    case "LineString": {
      const projected = (feature as ProjectedLineString)._projected;
      const props = feature.properties;
      const strokeColor =
        isHighlighted
          ? HIGHLIGHT_EDGE
          : (props.stroke as string | undefined) ??
            (props.color as string | undefined) ??
            DEFAULT_STROKE;
      return (
        <path
          d={buildLineStringPath(projected)}
          fillOpacity="0"
          stroke={strokeColor}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          {...pathProps}
        />
      );
    }
    case "Point": {
      const projected = (feature as ProjectedPoint)._projected;
      const props = feature.properties;
      return (
        <circle
          cx={projected[0]}
          cy={-projected[1]}
          r={3}
          vectorEffect="non-scaling-stroke"
          fill={
            isHighlighted
              ? HIGHLIGHT_EDGE
              : (props.color as string | undefined) ?? DEFAULT_FILL
          }
          {...pathProps}
        />
      );
    }
    default:
      return null;
  }
};

function renderProjectedPolygonOutline({
  poly,
  index,
  showIndex,
  isHighlighted,
  highlightEdgeIndices,
  onMouseClick,
  pathProps,
}: PolygonOutlineParams): React.ReactElement | null {
  const coordsList = poly._projected;
  const firstCoords = coordsList[0];
  if (!firstCoords || firstCoords.length === 0) return null;

  const firstVertex = firstCoords[0];
  if (firstVertex === undefined) return null;

  const restCoords = coordsList.slice(1);
  const props = poly.properties;
  const fillColor =
    isHighlighted
      ? HIGHLIGHT_FILL
      : (props.color as string | undefined) ?? DEFAULT_FILL;
  const strokeColor =
    (props.stroke as string | undefined) ??
    (props.color as string | undefined) ??
    DEFAULT_STROKE;
  const maskId = svgMaskFragmentId(props.id, index ?? 0);

  return (
    <g>
      <path
        d={buildPolygonPath(firstCoords)}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        cursor={onMouseClick ? "pointer" : "inherit"}
        mask={restCoords.length ? `url(#${maskId})` : undefined}
        onClick={(): void => {
          onMouseClick?.(index);
        }}
        {...pathProps}
      />
      {highlightEdgeIndices.map((edgeIndex) => {
        const a = firstCoords[edgeIndex];
        const b = firstCoords[(edgeIndex + 1) % firstCoords.length];
        if (!a || !b) return null;
        return (
          <line
            key={edgeIndex}
            x1={a[0]}
            y1={-a[1]}
            x2={b[0]}
            y2={-b[1]}
            stroke={HIGHLIGHT_EDGE}
            strokeWidth={2}
          />
        );
      })}
      {showIndex && (
        <text
          x={firstVertex[0]}
          y={-firstVertex[1]}
          textAnchor="middle"
          fontSize={10}
          pointerEvents="none"
        >
          {index}
        </text>
      )}
      {restCoords.length > 0 && (
        <>
          {restCoords.map((coords, i) => (
            <path
              key={`${maskId}_outline_${i + 1}`}
              d={buildPolygonPath(coords)}
              fill="transparent"
              stroke={strokeColor}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              {...pathProps}
            />
          ))}
          <mask id={maskId}>
            <path
              d={buildPolygonPath(firstCoords)}
              fill="white"
              stroke="white"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
            {restCoords.map((coords, i) => (
              <path
                key={`${maskId}_mask_${i + 1}`}
                d={buildPolygonPath(coords)}
                fill="black"
              />
            ))}
          </mask>
        </>
      )}
    </g>
  );
}

function svgMaskFragmentId(rawId: unknown, fallbackIndex: number): string {
  const sanitise = (s: string): string => s.replaceAll(/[^\w:.-]/g, "_");

  if (typeof rawId === "string") {
    const trimmed = rawId.trim();
    return trimmed.length === 0 ? `feat_${fallbackIndex}` : sanitise(trimmed);
  }
  if (typeof rawId === "number" && Number.isFinite(rawId)) {
    return sanitise(String(rawId));
  }
  if (typeof rawId === "bigint") {
    return sanitise(rawId.toString());
  }
  return `feat_${fallbackIndex}`;
}

function buildLineStringPath(projected: ProjectedCoordinate[]): string {
  return `M ${projected.map(([x, y]) => [x, -y].join(" ")).join(" L ")}`;
}

function buildPolygonPath(coords: ProjectedCoordinate[]): string {
  return `M ${coords.map(([x, y]) => [x, -y].join(" ")).join(" L ")} Z`;
}

export default FeatureOutline;
