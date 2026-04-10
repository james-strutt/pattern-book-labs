import { IconCheck } from "@tabler/icons-react";
import FeaturesSvg from "./FeaturesSvg";

const THUMB_W = 50;
const THUMB_H = 50;

type Props = {
  //@ts-ignore
  pattern: any;
  selected?: boolean;
  onClick: () => void;
  disabled?: boolean;
};

export default function BlockCard({ pattern, selected, onClick, disabled }: Props) {
  const label = `${pattern.name} \n${pattern.id}`;
  const stats = pattern.stats as { dwellings?: number; area?: number; maxHeight?: number } | undefined;
  const dwellingsText =
    stats?.dwellings !== undefined && Number.isFinite(stats.dwellings) ? String(stats.dwellings) : "—";
  const areaText = stats?.area !== undefined && Number.isFinite(stats.area) ? `${Math.round(stats.area)}m²` : "—";
  const heightText = stats?.maxHeight !== undefined && Number.isFinite(stats.maxHeight) ? `${stats.maxHeight}m` : "—";

  return (
    <div
      className={`min-h-0 flex items-start rounded border px-4 py-2 ${
        disabled ? "cursor-not-allowed bg-gray-100 opacity-50" : "cursor-pointer bg-gray-50"
      } ${selected ? "border-[rgb(160,200,75)]" : "border-gray-300"} hover:border-[rgb(160,200,75)]`}
      onClick={disabled ? undefined : onClick}
      title={label}
    >
      <div className="flex w-full flex-row items-center">
        <IconCheck size={22} strokeWidth={selected ? 3 : 1.5} color={selected ? "green" : "#CBD5E0"} />

        <div className="flex flex-col items-center" style={{ width: THUMB_W, height: THUMB_H + 20 }}>
          <span className="text-left text-[10px] leading-tight text-gray-600">front</span>
          <FeaturesSvg
            features={pattern.features.filter((e: any) => e.geometry.type !== "Point")}
            width={THUMB_W}
            height={THUMB_H}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="overflow-hidden">
            <p className="truncate text-left font-semibold">{label}</p>
          </div>
          <span className="text-left text-[10px] leading-tight text-gray-700">dwellings: {dwellingsText}</span>
          <span className="text-left text-[10px] leading-tight text-gray-700">area: {areaText}</span>
          <span className="text-left text-[10px] leading-tight text-gray-700">height: {heightText}</span>
        </div>
      </div>
    </div>
  );
}
