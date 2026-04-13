import type { FC } from "react";
import { LANDIQ_THEME } from "@/components/ui/landiq/theme";
import { FeaturesSvg } from "./FeaturesSvg";
import type { ProjectedFeature } from "@/apps/patternBook/types/projectedGeometry";

const DEFAULT_PREVIEW_PX = 120;

const PREVIEW_LAYER_OVERLAYS: ReadonlyArray<{
  readonly color: string;
  readonly stroke: string;
}> = [
  {
    color: LANDIQ_THEME.colors.greys.grey02,
    stroke: LANDIQ_THEME.colors.text.muted,
  },
  {
    color: LANDIQ_THEME.colors.status.successBg,
    stroke: LANDIQ_THEME.colors.status.success,
  },
];

interface PlacementPreviewSvgProps {
  svgFeatures: ProjectedFeature[];
  width?: number;
  height?: number;
}

export const PlacementPreviewSvg: FC<PlacementPreviewSvgProps> = ({
  svgFeatures,
  width = DEFAULT_PREVIEW_PX,
  height = DEFAULT_PREVIEW_PX,
}) => {
  const colourisedFeatures =
    svgFeatures.length === 0
      ? []
      : svgFeatures.map((feature, index) => {
          const overlay = PREVIEW_LAYER_OVERLAYS[index];
          if (!overlay) return feature;
          return {
            ...feature,
            properties: { ...feature.properties, ...overlay },
          };
        });

  if (colourisedFeatures.length === 0) {
    return (
      <div
        style={{
          width,
          height,
          background: LANDIQ_THEME.colors.greys.grey02,
          borderRadius: LANDIQ_THEME.border.radius.sm,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          color: LANDIQ_THEME.colors.text.muted,
        }}
      >
        No preview
      </div>
    );
  }

  return (
    <div
      style={{
        width,
        height,
        background: LANDIQ_THEME.colors.greys.white,
        borderRadius: LANDIQ_THEME.border.radius.sm,
        border: `1px solid ${LANDIQ_THEME.colors.greys.grey02}`,
        overflow: "hidden",
      }}
    >
      <FeaturesSvg
        features={colourisedFeatures}
        width={width}
        height={height}
      />
    </div>
  );
};
