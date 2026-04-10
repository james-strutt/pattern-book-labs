// @ts-expect-error no type declarations available
import { format } from "d3-format";
// @ts-expect-error no type declarations available
import polylabel from "polylabel";
import { SVGProps } from "react";
import { fromMetric } from "./libs/metric";
import { CalcProjectedCoordinate, StackedPolygon, StackedSection } from "./libs/types";

interface FeatureOutlineProps extends SVGProps<SVGPathElement & SVGCircleElement> {
  feature: StackedSection | StackedSection[];
  units?: "meters" | "feet";
  index?: number;
  showArea?: boolean;
  showIndex?: boolean;
  strokeWidth?: number;
  isHighlighted?: boolean;
  highlightEdgeIndices?: number[];
  onMouseClick?: (index?: number) => void;
}

const FeatureOutline = ({
  feature,
  units,
  showArea,
  showIndex,
  index,
  highlightEdgeIndices = [],
  isHighlighted,
  onMouseClick,
  ...props
}: FeatureOutlineProps) => {
  if (!feature) return null;

  const showText = showArea || showIndex;

  if (Array.isArray(feature)) {
    return (
      <>
        {feature.map((f, i) => (
          <FeatureOutline
            key={`${f.properties.id}_${f.properties.ix || i}`}
            feature={f}
            units={units}
            showArea={showArea}
            {...props}
          />
        ))}
      </>
    );
  }

  switch (feature.geometry.type) {
    case "Polygon": {
      const [labelX, labelY] = showText && units ? polylabel(feature._projected as number[][][]) : [];
      const labelVal = showArea && units && getAreaString(feature as StackedPolygon, units);
      const coordsList = feature._projected as CalcProjectedCoordinate[][];
      const firstCoords = coordsList[0]!;
      const restCoords = coordsList.filter((e, i) => i);

      return (
        <g>
          <path
            d={`M ${firstCoords.map(([x, y]) => `${x} ${-y}`).join(" L ")} Z`}
            fill={isHighlighted ? "#FF6E40" : (feature.properties["color"] ?? "#EDF4FC")}
            stroke={feature.properties["stroke"] ?? feature.properties["color"] ?? "black"}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            cursor={onMouseClick ? "pointer" : "inherited"}
            mask={restCoords.length ? `url(#${feature.properties.id})` : undefined}
            onClick={() => (onMouseClick ? onMouseClick(index) : undefined)}
            {...props}
          />
          {highlightEdgeIndices.map((index) => (
            <line
              key={index}
              x1={firstCoords[index]![0]}
              y1={-firstCoords[index]![1]}
              x2={firstCoords[(index + 1) % firstCoords.length]![0]}
              y2={-firstCoords[(index + 1) % firstCoords.length]![1]}
              stroke="red"
              strokeWidth={2}
            />
          ))}
          {showText && (
            <text
              key="dim-area"
              x={labelX}
              y={-labelY!}
              dominantBaseline="middle"
              textAnchor="middle"
              fontSize={showArea ? 3 : 10}
            >
              <tspan style={{ pointerEvents: "none" }}>{showArea ? labelVal : index}</tspan>
            </text>
          )}

          {restCoords.length > 0 && (
            <>
              {restCoords.map((coords, i) => (
                <path
                  key={`${feature.properties.id}_outline_${i + 1}`}
                  d={`M ${coords.map(([x, y]) => `${x} ${-y}`).join(" L ")} Z`}
                  fill={"transparent"}
                  stroke={feature.properties["stroke"] ?? feature.properties["color"] ?? "black"}
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                  {...props}
                />
              ))}
              <mask id={`${feature.properties.id}`}>
                <path
                  d={`M ${firstCoords.map(([x, y]) => `${x} ${-y}`).join(" L ")} Z`}
                  fill={"white"}
                  stroke={"white"}
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
                {restCoords.map((coords, i) => (
                  <path
                    key={`${feature.properties.id}_mask_${i + 1}_1`}
                    d={`M ${coords.map(([x, y]) => `${x} ${-y}`).join(" L ")} Z`}
                    fill={"black"}
                  />
                ))}
              </mask>
            </>
          )}
        </g>
      );
    }
    case "LineString": {
      return (
        <path
          d={`M ${(feature._projected as CalcProjectedCoordinate[]).map(([x, y]) => `${x} ${-y}`).join(" L ")}`}
          fillOpacity="0"
          stroke={isHighlighted ? "red" : (feature.properties["stroke"] ?? feature.properties["color"] ?? "black")}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          {...props}
        />
      );
    }
    case "Point": {
      return (
        <circle
          cx={feature._projected[0] as number}
          cy={-feature._projected[1] as number}
          r="3"
          vectorEffect="non-scaling-stroke"
          fill={isHighlighted ? "red" : feature.properties["color"]}
          {...props}
        />
      );
    }
    default: {
      // TODO roads/trees/annotations
      return null;
    }
  }
};

const getAreaString = ({ geometry, properties }: StackedPolygon, units: "meters" | "feet") => {
  if (geometry.type !== "Polygon" || !properties.grossArea) return "";

  return `${format(",.5r")((properties.grossArea / (properties["levels"] ?? 1)) * fromMetric(units, 2))}${
    units === "feet" ? "ft" : "m"
  }²`;
};

export default FeatureOutline;
