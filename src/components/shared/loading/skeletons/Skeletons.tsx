import type React from 'react';
import { LANDIQ_THEME } from '@/components/ui/landiq/theme';

const BORDER_COLOUR = LANDIQ_THEME.colors.greys.grey03;
const BG_COLOUR = LANDIQ_THEME.colors.greys.offWhite;
const SHIMMER_BG = LANDIQ_THEME.colors.greys.grey04;

const MAX_SKELETON_ROWS = 64;

const TABLE_SKELETON_ROW_KEYS: readonly string[] = Array.from(
  { length: MAX_SKELETON_ROWS },
  (_v, rowOrdinal) => `table-skeleton-row-${rowOrdinal}`,
);

const LIST_SKELETON_ROW_KEYS: readonly string[] = Array.from(
  { length: MAX_SKELETON_ROWS },
  (_v, rowOrdinal) => `list-skeleton-row-${rowOrdinal}`,
);

const CONTENT_SKELETON_LINE_KEYS: readonly string[] = Array.from(
  { length: MAX_SKELETON_ROWS },
  (_v, lineOrdinal) => `content-skeleton-line-${lineOrdinal}`,
);

const TREND_BAR_SEGMENTS: ReadonlyArray<{ readonly id: string; readonly heightPercent: number }> = [
  { id: 'trend-bar-a', heightPercent: 35 },
  { id: 'trend-bar-b', heightPercent: 50 },
  { id: 'trend-bar-c', heightPercent: 40 },
  { id: 'trend-bar-d', heightPercent: 65 },
  { id: 'trend-bar-e', heightPercent: 55 },
  { id: 'trend-bar-f', heightPercent: 70 },
  { id: 'trend-bar-g', heightPercent: 60 },
  { id: 'trend-bar-h', heightPercent: 80 },
  { id: 'trend-bar-i', heightPercent: 45 },
  { id: 'trend-bar-j', heightPercent: 75 },
  { id: 'trend-bar-k', heightPercent: 55 },
  { id: 'trend-bar-l', heightPercent: 65 },
];

const BREAKDOWN_BAR_SEGMENTS: ReadonlyArray<{ readonly id: string; readonly widthPercent: number }> = [
  { id: 'breakdown-bar-a', widthPercent: 85 },
  { id: 'breakdown-bar-b', widthPercent: 70 },
  { id: 'breakdown-bar-c', widthPercent: 55 },
  { id: 'breakdown-bar-d', widthPercent: 40 },
  { id: 'breakdown-bar-e', widthPercent: 30 },
];

export interface ShimmerBarProps {
  readonly width?: string | number;
  readonly height?: number;
  readonly className?: string;
}

export function ShimmerBar({ width = '100%', height = 12, className = '' }: ShimmerBarProps): React.JSX.Element {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{ width, height, backgroundColor: SHIMMER_BG }}
    />
  );
}

export interface SectionSkeletonProps {
  readonly height?: number;
}

export function SectionSkeleton({ height = 180 }: SectionSkeletonProps): React.JSX.Element {
  return (
    <div
      className="animate-pulse rounded-lg border"
      style={{
        height,
        borderColor: BORDER_COLOUR,
        backgroundColor: BG_COLOUR,
      }}
    />
  );
}

export function KPICardSkeleton(): React.JSX.Element {
  return (
    <div
      className="rounded-lg border bg-white p-4 shadow-sm"
      style={{ borderColor: BORDER_COLOUR }}
    >
      <ShimmerBar width="60%" height={10} className="mb-3" />
      <ShimmerBar width="45%" height={24} className="mb-2" />
      <ShimmerBar width="30%" height={10} />
    </div>
  );
}

export function TrendChartSkeleton(): React.JSX.Element {
  return (
    <div
      className="rounded-lg border bg-white p-3"
      style={{ borderColor: BORDER_COLOUR }}
    >
      <ShimmerBar width="40%" height={10} className="mb-4" />
      <div className="flex items-end gap-1" style={{ height: 160 }}>
        {TREND_BAR_SEGMENTS.map((segment, segmentOrdinal) => (
          <div
            key={segment.id}
            className="flex-1 animate-pulse rounded-t-lg"
            style={{
              height: `${segment.heightPercent}%`,
              backgroundColor: SHIMMER_BG,
              animationDelay: `${segmentOrdinal * 80}ms`,
            }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between">
        <ShimmerBar width={30} height={8} />
        <ShimmerBar width={30} height={8} />
        <ShimmerBar width={30} height={8} />
      </div>
    </div>
  );
}

export function BreakdownChartSkeleton({ variant = 'bar' }: {
  readonly variant?: 'bar' | 'pie';
}): React.JSX.Element {
  return (
    <div
      className="rounded-lg border bg-white p-3"
      style={{ borderColor: BORDER_COLOUR }}
    >
      <ShimmerBar width="35%" height={10} className="mb-4" />
      {variant === 'pie' ? (
        <div className="flex items-center justify-center" style={{ height: 180 }}>
          <div
            className="animate-pulse rounded-full"
            style={{ width: 140, height: 140, backgroundColor: SHIMMER_BG }}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2" style={{ height: 180 }}>
          {BREAKDOWN_BAR_SEGMENTS.map((segment, segmentOrdinal) => (
            <div key={segment.id} className="flex items-center gap-2">
              <ShimmerBar width={80} height={10} />
              <div
                className="h-5 flex-1 animate-pulse rounded"
                style={{
                  width: `${segment.widthPercent}%`,
                  backgroundColor: SHIMMER_BG,
                  animationDelay: `${segmentOrdinal * 100}ms`,
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export interface TableSkeletonProps {
  readonly rows?: number;
}

export function TableSkeleton({ rows = 8 }: TableSkeletonProps): React.JSX.Element {
  return (
    <div
      className="rounded-lg border bg-white"
      style={{ borderColor: BORDER_COLOUR }}
    >
      <div
        className="flex items-center justify-between border-b p-3"
        style={{ borderColor: BORDER_COLOUR }}
      >
        <ShimmerBar width={120} height={10} />
        <ShimmerBar width={180} height={30} />
      </div>
      <div className="p-0">
        <div
          className="flex gap-4 px-3 py-2"
          style={{ backgroundColor: BG_COLOUR }}
        >
          <ShimmerBar width={20} height={10} />
          <ShimmerBar width="25%" height={10} />
          <ShimmerBar width="15%" height={10} />
          <ShimmerBar width="15%" height={10} />
          <ShimmerBar width="15%" height={10} />
          <ShimmerBar width="10%" height={10} />
        </div>
        {TABLE_SKELETON_ROW_KEYS.slice(0, rows).map((rowKey, rowOrdinal) => (
          <div
            key={rowKey}
            className="flex gap-4 border-t px-3 py-2.5"
            style={{ borderColor: BORDER_COLOUR, animationDelay: `${rowOrdinal * 60}ms` }}
          >
            <ShimmerBar width={20} height={10} />
            <ShimmerBar width="25%" height={10} />
            <ShimmerBar width="15%" height={10} />
            <ShimmerBar width="15%" height={10} />
            <ShimmerBar width="15%" height={10} />
            <ShimmerBar width="10%" height={10} />
          </div>
        ))}
      </div>
    </div>
  );
}

export interface ListSkeletonProps {
  readonly rows?: number;
  readonly showAvatar?: boolean;
}

export function ListSkeleton({ rows = 5, showAvatar = true }: ListSkeletonProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      {LIST_SKELETON_ROW_KEYS.slice(0, rows).map((rowKey, rowOrdinal) => (
        <div
          key={rowKey}
          className="flex items-center gap-3 rounded-lg border bg-white p-3"
          style={{ borderColor: BORDER_COLOUR, animationDelay: `${rowOrdinal * 80}ms` }}
        >
          {showAvatar && (
            <div
              className="animate-pulse shrink-0 rounded-full"
              style={{ width: 32, height: 32, backgroundColor: SHIMMER_BG }}
            />
          )}
          <div className="flex flex-1 flex-col gap-1.5">
            <ShimmerBar width={`${70 - rowOrdinal * 5}%`} height={12} />
            <ShimmerBar width={`${50 - rowOrdinal * 3}%`} height={8} />
          </div>
        </div>
      ))}
    </div>
  );
}

export interface ContentSkeletonProps {
  readonly lines?: number;
  readonly showTitle?: boolean;
  readonly height?: number;
}

export function ContentSkeleton({ lines = 5, showTitle = true, height }: ContentSkeletonProps): React.JSX.Element {
  const lastShimmerLineKey = lines > 0 ? CONTENT_SKELETON_LINE_KEYS[lines - 1] : undefined;

  return (
    <div
      className="rounded-lg border bg-white p-4"
      style={{ borderColor: BORDER_COLOUR, height }}
    >
      {showTitle && <ShimmerBar width="45%" height={14} className="mb-4" />}
      <div className="flex flex-col gap-2">
        {CONTENT_SKELETON_LINE_KEYS.slice(0, lines).map((lineKey) => (
          <ShimmerBar
            key={lineKey}
            width={lineKey === lastShimmerLineKey ? '60%' : '100%'}
            height={10}
          />
        ))}
      </div>
    </div>
  );
}
