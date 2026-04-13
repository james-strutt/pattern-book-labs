import FeaturesSvg from "./FeaturesSvg";
import { StackedPolygon } from "./libs/types";

const THUMB_W = 100;
const THUMB_H = 100;

type Props = {
  siteFeatures: StackedPolygon[];
  patternFeatures: StackedPolygon[];
  disabled: boolean;
  onClick: () => void;
  selected: boolean;
};

export default function PatternCard({ siteFeatures, patternFeatures, onClick, selected, disabled }: Props) {
  const outer = {
    ...siteFeatures[0],
    properties: {
      ...siteFeatures[0].properties,
      stroke: "green",
    },
  };
  const inner = {
    ...siteFeatures[1],
    properties: {
      ...siteFeatures[0].properties,
      stroke: "green",
    },
  };

  const patternStats = patternFeatures[0].properties.pattern;
  const title = String(patternStats.name ?? patternStats.id ?? "");

  const colorizedSiteFeatures: StackedPolygon[] = [outer, inner];

  const textColor = disabled ? "text-gray-500" : selected ? "text-white" : "text-gray-700";

  return (
    <div
      className={`flex flex-col items-start rounded border px-4 py-3 ${
        disabled ? "cursor-not-allowed bg-gray-300" : selected ? "cursor-pointer" : "cursor-pointer bg-gray-50"
      } hover:border-[rgb(160,200,75)]`}
      style={{
        background: disabled ? "#e0e0e0" : selected ? "green" : "#fafafa",
      }}
      onClick={onClick}
      title={title}
    >
      <div className="w-full overflow-hidden">
        <p className={`mb-2 truncate text-left font-bold ${textColor}`}>{title}</p>
      </div>

      <div className="flex flex-row flex-wrap items-center justify-center gap-3">
        <div className="overflow-hidden rounded-lg bg-gray-200" style={{ width: THUMB_W, height: THUMB_H }}>
          <FeaturesSvg features={colorizedSiteFeatures.concat(patternFeatures)} width={THUMB_W} height={THUMB_H} />
        </div>

        <div className="flex w-25 flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-semibold ${textColor}`}>dwellings</span>
            <span className={`ml-1 text-[11px] ${textColor}`}>{patternStats.dwellings}</span>
          </div>
          <div className="-mt-2 flex items-center justify-between">
            <span className={`text-[11px] font-semibold ${textColor}`}>area</span>
            <span className={`ml-1 text-[11px] ${textColor}`}>{patternStats.area.toFixed(0)}m²</span>
          </div>
          <div className="-mt-2 flex items-center justify-between">
            <span className={`text-[11px] font-semibold ${textColor}`}>fsr</span>
            <span className={`ml-1 text-[11px] ${textColor}`}>{patternStats.fsr.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
