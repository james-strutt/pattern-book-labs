import { getFeaturesProjectedBox, getViewBox } from "./libs/bbox";
import { StackedSection } from "./libs/types";
import FeatureOutline from "./FeatureOutline";

interface FeaturesSvgProps {
  features: StackedSection[];
  units?: "meters" | "feet";
  width?: number;
  height?: number;
  showIndices?: boolean;
  highlightIndices?: number[];
  highlightEdgeIndicesList?: number[][];
  onMouseClick?: (index?: number) => void;
}

const FeaturesSvg = ({
  features,
  units,
  width = 250,
  height = 250,
  showIndices = false,
  highlightEdgeIndicesList = [],
  highlightIndices = [],
  onMouseClick,
}: FeaturesSvgProps) => (
  <svg width={width} height={height} viewBox={getViewBox(getFeaturesProjectedBox(features), 0.05)}>
    {features.map((f, i) => (
      <FeatureOutline
        key={`${f.properties.id}_${f.properties.ix || i}`}
        feature={f}
        units={units}
        index={i}
        showIndex={showIndices}
        isHighlighted={highlightIndices.includes(i)}
        highlightEdgeIndices={highlightEdgeIndicesList[i]}
        onMouseClick={onMouseClick}
      />
    ))}
  </svg>
);

export default FeaturesSvg;
