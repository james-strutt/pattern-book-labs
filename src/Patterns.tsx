import { uniq } from "lodash";
import { type ChangeEvent, type Dispatch, type SetStateAction } from "react";
import SearchableSelect from "react-select";
import BlockCard from "./BlockCard";
import { PATTERN_MAIN_SORT_OPTIONS } from "./constants";
import { patternBookSelectSingleLine } from "./patternBookSelectStyles";
import type { SortAndFilter, SortType } from "./types";

type ProjectPattern = {
  id: string;
  stats: Record<string, unknown> & {
    patternStyle?: string;
    patternParking?: string;
  };
};

type PatternFilter = NonNullable<SortAndFilter["filter"]>;

type PatternsProps = {
  sortType: SortType;
  onSortTypeReactSelectChange: (sort: SortType) => void;
  onSortTypeNativeChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  filter: PatternFilter;
  setFilter: Dispatch<SetStateAction<PatternFilter>>;
  placingPatterns: boolean;
  projectPatterns: ProjectPattern[];
  projectBundle: { blocks?: Record<string, unknown> };
  sortedEvaluatedPatterns: ProjectPattern[];
  selectedPatternIds: string[];
  onSelectAllPatterns: () => void;
  onDeselectAllPatterns: () => void;
  projects: { properties: { id: string; name: string } }[];
  loadingProject: boolean;
  cleanOldBlocks: boolean;
  onCleanOldBlocksToggle: () => void;
  onSelectProject: (e: { value: string }) => void;
  onTogglePattern: (patternId: string) => void;
  onPlacePatterns: () => void;
  progress: number;
  selectedSitesCount: number;
};

export default function Patterns({
  sortType,
  onSortTypeReactSelectChange,
  onSortTypeNativeChange,
  filter,
  setFilter,
  placingPatterns,
  projectPatterns,
  projectBundle,
  sortedEvaluatedPatterns,
  selectedPatternIds,
  onSelectAllPatterns,
  onDeselectAllPatterns,
  projects,
  loadingProject,
  cleanOldBlocks,
  onCleanOldBlocksToggle,
  onSelectProject,
  onTogglePattern,
  onPlacePatterns,
  progress,
  selectedSitesCount,
}: PatternsProps) {
  return (
    <>
      <h3 className="mt-3 text-sm font-bold">Patterns</h3>

      <div className="flex flex-row items-center justify-between gap-2">
        <div className="flex w-25 flex-row items-center gap-2">
          <span>Sort By</span>
        </div>
        <div className="w-[calc(100%-100px)]">
          <SearchableSelect
            className="basic-single"
            classNamePrefix="select"
            value={{ value: sortType, label: sortType }}
            isClearable={false}
            isSearchable={false}
            isDisabled={placingPatterns}
            name="Sort By"
            styles={patternBookSelectSingleLine}
            onChange={(e) => e && onSortTypeReactSelectChange((e as { value: SortType }).value)}
            options={PATTERN_MAIN_SORT_OPTIONS.map((s) => ({
              value: s,
              label: s,
            }))}
          />
        </div>
      </div>

      <div className="flex flex-row items-center justify-between gap-2">
        <div className="flex w-25 flex-row items-center gap-2">
          <span>Style</span>
        </div>
        <div className="w-[calc(100%-100px)]">
          <SearchableSelect
            className="basic-single"
            classNamePrefix="select"
            value={filter.patternStyle ? { value: filter.patternStyle, label: filter.patternStyle } : null}
            isClearable
            isSearchable
            isDisabled={placingPatterns}
            name="Pattern Style"
            placeholder="All styles"
            styles={patternBookSelectSingleLine}
            onChange={(e) =>
              setFilter((f) => ({
                ...f,
                patternStyle: (e as { value: string } | null)?.value,
              }))
            }
            options={uniq(projectPatterns.map((p) => p.stats?.patternStyle).filter(Boolean)).map((s) => ({
              value: s as string,
              label: s as string,
            }))}
          />
        </div>
      </div>

      <div className="flex flex-row items-center justify-between gap-2">
        <div className="flex w-25 flex-row items-center gap-2">
          <span>Parking</span>
        </div>
        <div className="w-[calc(100%-100px)]">
          <SearchableSelect
            className="basic-single"
            classNamePrefix="select"
            value={filter.patternParking ? { value: filter.patternParking, label: filter.patternParking } : null}
            isClearable
            isSearchable
            isDisabled={placingPatterns}
            name="Pattern Parking"
            placeholder="All parking"
            styles={patternBookSelectSingleLine}
            onChange={(e) =>
              setFilter((f) => ({
                ...f,
                patternParking: (e as { value: string } | null)?.value,
              }))
            }
            options={uniq(projectPatterns.map((p) => p.stats?.patternParking).filter(Boolean)).map((s) => ({
              value: s as string,
              label: s as string,
            }))}
          />
        </div>
      </div>

      <div className="flex flex-row items-center justify-between gap-2">
        <div className="flex w-25 flex-row items-center gap-2">
          <span>Pattern Project</span>
        </div>
        <div className="w-[calc(100%-200px)]">
          <SearchableSelect
            className="basic-single"
            classNamePrefix="select"
            defaultValue={undefined}
            isDisabled={loadingProject || placingPatterns}
            isLoading={loadingProject}
            isClearable={false}
            isSearchable
            name="Project"
            placeholder="Select Project"
            styles={patternBookSelectSingleLine}
            onChange={(e) => e && onSelectProject(e as { value: string })}
            options={projects.map((p) => ({
              value: p.properties.id,
              label: p.properties.name,
            }))}
          />
        </div>
        <label className="flex w-25 items-center gap-1.5">
          <input
            type="checkbox"
            checked={cleanOldBlocks}
            onChange={onCleanOldBlocksToggle}
            disabled={loadingProject || placingPatterns}
          />
          No Cache
        </label>
      </div>

      {projectBundle?.blocks && Object.keys(projectBundle.blocks).length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-row justify-end gap-2">
            <button
              className="rounded bg-blue-600 px-5 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={onSelectAllPatterns}
              disabled={selectedPatternIds.length === sortedEvaluatedPatterns.length}
            >
              Select All
            </button>
            <button
              className="rounded bg-blue-600 px-5 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={onDeselectAllPatterns}
              disabled={selectedPatternIds.length === 0}
            >
              Deselect All
            </button>
          </div>

          <div className="mt-1 flex flex-row items-center justify-between">
            <div className="flex items-center">
              <span className="mr-2 text-sm">Sort by: </span>
              <select
                value={sortType}
                onChange={onSortTypeNativeChange}
                className="w-25 rounded border border-gray-300 text-sm"
                disabled={projectPatterns.length === 0 || placingPatterns}
              >
                {PATTERN_MAIN_SORT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1">
            {sortedEvaluatedPatterns.map((projectPattern) => (
              <div key={projectPattern.id}>
                <BlockCard
                  pattern={projectPattern}
                  onClick={() => onTogglePattern(projectPattern.id)}
                  selected={selectedPatternIds.includes(projectPattern.id)}
                  disabled={placingPatterns}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {loadingProject && (
        <div className="flex flex-col items-center pt-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          <h4 className="text-xs font-bold">Loading Project...</h4>
        </div>
      )}
      {!placingPatterns && !loadingProject ? (
        <button
          className="mt-1 rounded bg-blue-600 px-4 py-2 text-base font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onPlacePatterns}
          disabled={selectedPatternIds.length === 0 || selectedSitesCount === 0 || loadingProject || placingPatterns}
        >
          Place Patterns
        </button>
      ) : (
        <div className="h-8 w-full overflow-hidden rounded-sm bg-gray-200">
          <div className="h-full bg-green-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
    </>
  );
}
