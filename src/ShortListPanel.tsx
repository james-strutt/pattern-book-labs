import { rpc } from "@gi-nx/iframe-sdk";
import { IconArrowLeft } from "@tabler/icons-react";
import { groupBy } from "lodash";
import { useCallback, useEffect, useState } from "react";
import { getValidPatternsForSitePlacement } from "./getValidPatternsForSitePlacement";
import { StackedPolygon, StackedSection } from "./libs/types";
import PatternCard from "./PatternCard";
import { SortType } from "./types";

type ShortListPanelProps = {
  siteFeature: StackedPolygon;
  selectedPatternId: string;
  placingPattern: boolean;
  disabled: boolean;
  // @ts-ignore
  projectPatterns: any; // TODO: fix this type
  sortType: SortType;
  onBack: () => void;
  onSelectPattern: (patternFeatures: StackedPolygon[], setbackFeature: StackedPolygon) => void;
};

function siteSummary(properties: StackedPolygon["properties"]) {
  const p = properties as Record<string, unknown>;
  const id = String(p.id ?? p["ID"] ?? "—");
  const name = String(p.address ?? p.Address ?? p.name ?? "—");

  let area = "—";
  const a = p.Area;
  if (typeof a === "number" && Number.isFinite(a)) area = `${Math.round(a)}m²`;
  else if (typeof a === "string" && a.trim()) area = /[²m]/i.test(a) ? a : `${a}m²`;

  let height = "—";
  const h = p["Height Of Building"];
  if (typeof h === "number" && Number.isFinite(h)) height = `${h}m`;
  else if (typeof h === "string" && h.trim()) height = /m\s*$/i.test(h) ? h : `${h}m`;

  return { id, name, area, height };
}

export default function ShortListPanel({
  placingPattern,
  disabled,
  siteFeature,
  projectPatterns,
  selectedPatternId,
  sortType,

  onBack,
  onSelectPattern,
}: ShortListPanelProps) {
  const { id, name, area, height } = siteSummary(siteFeature.properties);
  const [calculating, setCalculating] = useState(false);

  const [featuresArray, setFeaturesArray] = useState<StackedPolygon[][]>([]);
  const [setbackFeature, setSetbackFeature] = useState<StackedPolygon | null>(null);

  const getShortList = useCallback(
    async (feature: StackedPolygon) => {
      setCalculating(true);
      setFeaturesArray([]);
      setSetbackFeature(null);

      const isValid =
        getValidPatternsForSitePlacement(
          [{ value: feature.properties.id, label: feature.properties.name }],
          [feature],
          projectPatterns,
        )?.length > 0;

      if (!isValid) {
        setCalculating(false);
        return;
      }

      const rawEvaluatedFeatures = await rpc.invoke("evaluateFeatures", [[feature]]);
      const flattenedEvaluatedFeatures = Object.values(rawEvaluatedFeatures).flat() as StackedSection[];
      const groupedEvaluatedFeaturesByPatternId = groupBy(flattenedEvaluatedFeatures, "properties.pattern.id");

      /* fsr & netArea stats (from main app, sometimes it is never calculated) */
      Object.values(groupedEvaluatedFeaturesByPatternId).forEach((features) => {
        features.forEach((feature) => {
          if (feature.properties.pattern && feature.properties.pattern.area === undefined) {
            const projectPattern = projectPatterns.find((e: any) => e.id === feature.properties.pattern.id);
            const area = projectPattern.stats.area;
            const fsr = area / feature.properties.pattern.siteArea;
            feature.properties.pattern.name = projectPattern.name;
            feature.properties.pattern.fsr = fsr;
            feature.properties.pattern.area = area;
          }
        });
      });

      /* sort by selected sort type */
      const featuresArray = Object.keys(groupedEvaluatedFeaturesByPatternId)
        .filter((key) => key !== "undefined")
        .map((key) => groupedEvaluatedFeaturesByPatternId[key])
        .sort((a, b) => b[0].properties.pattern[sortType] - a[0].properties.pattern[sortType]);

      const setbackFeature = groupedEvaluatedFeaturesByPatternId["undefined"][0];

      setFeaturesArray(featuresArray as StackedPolygon[][]);
      setSetbackFeature(setbackFeature as StackedPolygon);

      setCalculating(false);
    },
    [projectPatterns, sortType],
  );

  useEffect(() => {
    if (disabled) return;
    getShortList(siteFeature);
  }, [getShortList, disabled, siteFeature]);

  return (
    <div className="relative w-full">
      <div className="flex w-full flex-col gap-4">
        <button
          className="flex w-25 items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          onClick={onBack}
        >
          <IconArrowLeft size={16} />
          Back
        </button>

        <div className="mt-4 flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Selected Site</h3>

          <div className="overflow-hidden rounded-md border border-gray-200 bg-gray-50 shadow-sm">
            <div className="flex flex-col divide-y divide-gray-200">
              {[
                { label: "ID", value: id },
                { label: "Name", value: name },
                { label: "Area", value: area },
                { label: "Height", value: height },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {row.label}
                  </span>
                  <span className="line-clamp-2 text-right text-sm font-medium text-gray-800">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {!disabled && (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Available Patterns</h3>

            {calculating ? (
              <div className="flex flex-col items-center pt-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                <h4 className="text-xs font-bold">Generating patterns...</h4>
              </div>
            ) : siteFeature && setbackFeature && featuresArray.length > 0 ? (
              <div className="relative">
                <div className="grid grid-cols-2 gap-2">
                  {featuresArray.map((features, index) => (
                    <PatternCard
                      key={index}
                      siteFeatures={[siteFeature, setbackFeature]}
                      patternFeatures={features}
                      disabled={placingPattern}
                      selected={features.some((f) => f.properties.pattern.id === selectedPatternId)}
                      onClick={() => onSelectPattern(features, setbackFeature)}
                    />
                  ))}
                </div>

                {placingPattern && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-md bg-white/70 backdrop-blur-sm">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                    <h4 className="text-xs font-bold">Placing pattern...</h4>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-row items-center justify-center gap-2 p-4">
                <span className="text-sm text-gray-700">No patterns found</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
