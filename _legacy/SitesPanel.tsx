import type { Dispatch, SetStateAction } from "react";
import SearchableSelect from "react-select";
import { StackedSection } from "./libs/types";
import { type EnvelopeSetbackParams, ENVELOPE_SETBACK_INPUT_MAX_M } from "./constants";
import { patternBookSelectMultiLine, patternBookSelectSingleLine } from "./patternBookSelectStyles";
import { parseEnvelopeSetbackMeters } from "./utils";

type GeoJsonLayerOption = { name: string; id: string | number };

export type SitesPanelProps = {
  placingPatterns: boolean;
  geoJsonLayers: GeoJsonLayerOption[];
  siteLayerId: string | number | undefined;
  onSelectSiteLayer: (e: { value: string | number }) => void;
  selectedRoadLayers: { value: string; label: string }[];
  onRoadLayersChange: (layers: { value: string; label: string }[]) => void;
  roadLayers: string[];
  onUpdateRoads: () => void;
  params: EnvelopeSetbackParams;
  setParams: Dispatch<SetStateAction<EnvelopeSetbackParams>>;
  siteFeatures: StackedSection[];
  selectedSites: { value: string; label: string }[];
  onSelectSites: (sites: { value: string; label: string }[]) => void;
  onLassoSelect: () => void;
  onSelectAllSites: () => void;
  onClearSelection: () => void;
};

export default function SitesPanel({
  placingPatterns,
  geoJsonLayers,
  siteLayerId,
  onSelectSiteLayer,
  selectedRoadLayers,
  onRoadLayersChange,
  roadLayers,
  onUpdateRoads,
  params,
  setParams,
  siteFeatures,
  selectedSites,
  onSelectSites,
  onLassoSelect,
  onSelectAllSites,
  onClearSelection,
}: SitesPanelProps) {
  return (
    <>
      <h3 className="mt-3 text-sm font-bold">Sites</h3>

      <div className="flex flex-row items-center justify-between gap-2">
        <div className="flex w-25 flex-row items-center gap-2">
          <span>Site Layer</span>
        </div>
        <div className="w-[calc(100%-100px)]">
          <SearchableSelect
            className="basic-single"
            classNamePrefix="select"
            value={
              siteLayerId
                ? {
                    value: siteLayerId,
                    label: geoJsonLayers.find((l) => l.id === siteLayerId)?.name ?? "",
                  }
                : undefined
            }
            isDisabled={placingPatterns}
            isClearable={false}
            isSearchable
            name="Site Layer"
            placeholder="Select Site Layer"
            styles={patternBookSelectSingleLine}
            onChange={(e) => e && onSelectSiteLayer(e as { value: string | number })}
            options={geoJsonLayers.map((l) => ({ value: l.id, label: l.name }))}
          />
        </div>
      </div>

      <div className="flex flex-row items-center justify-between gap-2">
        <div className="flex w-25 flex-row items-center gap-2">
          <span>Road Layers</span>
        </div>
        <div className="w-[calc(100%-100px)]">
          <SearchableSelect
            className="basic-single"
            classNamePrefix="select"
            value={selectedRoadLayers}
            isDisabled={placingPatterns}
            isClearable
            isSearchable
            isMulti
            name="Road Layers"
            placeholder="Select road layers…"
            styles={patternBookSelectMultiLine}
            onChange={(v) => onRoadLayersChange(v as { value: string; label: string }[])}
            options={roadLayers.map((id) => ({ value: id, label: id }))}
          />
        </div>
      </div>
      <div className="flex flex-row justify-end gap-2">
        <button onClick={onUpdateRoads} disabled={placingPatterns || selectedRoadLayers.length === 0}>
          Update Roads from Map
        </button>
      </div>

      <div className="flex flex-row items-center justify-between gap-2">
        <div className="flex w-25 flex-row items-center gap-2">
          <span>Envelope setbacks (m)</span>
        </div>
        <div className="flex w-[calc(100%-100px)] flex-col gap-2">
          <div className="flex flex-row items-center gap-2">
            <span className="w-25">Front</span>
            <input
              type="number"
              min={0}
              max={ENVELOPE_SETBACK_INPUT_MAX_M}
              value={params.front}
              onChange={(e) =>
                setParams((prev) => ({
                  ...prev,
                  front: parseEnvelopeSetbackMeters(e.target.value),
                }))
              }
              className="w-full rounded border border-gray-300 px-2 py-1"
              disabled={placingPatterns}
            />
          </div>
          <div className="flex flex-row items-center gap-2">
            <span className="w-25">Rear</span>
            <input
              type="number"
              min={0}
              max={ENVELOPE_SETBACK_INPUT_MAX_M}
              value={params.rear}
              onChange={(e) =>
                setParams((prev) => ({
                  ...prev,
                  rear: parseEnvelopeSetbackMeters(e.target.value),
                }))
              }
              className="w-full rounded border border-gray-300 px-2 py-1"
              disabled={placingPatterns}
            />
          </div>
          <div className="flex flex-row items-center gap-2">
            <span className="w-25">Side</span>
            <input
              type="number"
              min={0}
              max={ENVELOPE_SETBACK_INPUT_MAX_M}
              value={params.side}
              onChange={(e) =>
                setParams((prev) => ({
                  ...prev,
                  side: parseEnvelopeSetbackMeters(e.target.value),
                }))
              }
              className="w-full rounded border border-gray-300 px-2 py-1"
              disabled={placingPatterns}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-row items-center justify-between gap-2">
        <div className="flex w-25 flex-row items-center gap-2">
          <span>Sites</span>
        </div>
        <div className="w-[calc(100%-100px)]">
          <SearchableSelect
            className="basic-single"
            classNamePrefix="select"
            value={selectedSites}
            isDisabled={placingPatterns}
            isClearable={false}
            isSearchable
            name="Site Layer"
            placeholder="Select Sites"
            isMulti
            styles={patternBookSelectMultiLine}
            onChange={(v) => onSelectSites([...(v as { value: string; label: string }[])])}
            options={siteFeatures.map((l) => ({
              value: l.properties.id as string,
              label: (l.properties.address ?? l.properties.id) as string,
            }))}
          />
        </div>
      </div>
      <div className="flex flex-row justify-end gap-2">
        <button
          className="rounded bg-blue-600 px-5 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onLassoSelect}
          disabled={siteFeatures.length === 0}
        >
          Lasso Select
        </button>
        <button
          className="rounded bg-blue-600 px-5 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onSelectAllSites}
          disabled={siteFeatures.length === 0 || selectedSites.length === siteFeatures.length || placingPatterns}
        >
          Select All
        </button>
        <button
          className="rounded bg-blue-600 px-5 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onClearSelection}
          disabled={selectedSites.length === 0 || placingPatterns}
        >
          Clear Selection
        </button>
      </div>
    </>
  );
}
