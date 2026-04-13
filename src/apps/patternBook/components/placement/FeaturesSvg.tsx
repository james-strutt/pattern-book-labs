import type { JSX } from "react";
import {
  getFeaturesProjectedBox,
  getProjectedViewBox,
} from "@/utils/geometry/projectedBbox";
import {
  getProp,
  FEATURE_PROP,
  type FeatureWithProperties,
} from "@/constants/featureProps";
import { FeatureOutline } from "./FeatureOutline";
import type { ProjectedFeature } from "@/apps/patternBook/types/projectedGeometry";

interface FeaturesSvgProps {
  readonly features: ProjectedFeature[];
  readonly width?: number;
  readonly height?: number;
  readonly showIndices?: boolean;
  readonly highlightIndices?: number[];
  readonly highlightEdgeIndicesList?: number[][];
  readonly onMouseClick?: (index?: number) => void;
  readonly className?: string;
}

export function FeaturesSvg({
  features,
  width = 250,
  height = 250,
  showIndices = false,
  highlightEdgeIndicesList = [],
  highlightIndices = [],
  onMouseClick,
  className,
}: FeaturesSvgProps): JSX.Element | null {
  if (!features.length) return null;

  const bbox = getFeaturesProjectedBox(features);
  if (!bbox) return null;

  const viewBox = getProjectedViewBox(bbox, 0.05);

  return (
    <svg width={width} height={height} viewBox={viewBox} className={className}>
      <title>Pattern placement preview</title>
      {features.map((feature, index) => {
        const asFeature = feature as unknown as FeatureWithProperties;
        const idRaw = getProp<string | number>(asFeature, FEATURE_PROP.ID, null);
        const idKey = String(idRaw ?? index);
        const ixRaw = getProp<number>(
          asFeature,
          FEATURE_PROP.INTERNAL.PROJECTED_FEATURE_INDEX,
          null,
        );
        const ixKey = ixRaw ?? index;
        return (
          <FeatureOutline
            key={`${index}_${idKey}_${ixKey}`}
            feature={feature}
            index={index}
            showIndex={showIndices}
            isHighlighted={highlightIndices.includes(index)}
            highlightEdgeIndices={highlightEdgeIndicesList[index]}
            onMouseClick={onMouseClick}
          />
        );
      })}
    </svg>
  );
}

export default FeaturesSvg;
