import type { CSSProperties } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { LANDIQ_THEME } from "@/components/ui/landiq/theme";
import type { BootstrapStatus } from "@/apps/patternBook/hooks/usePatternBookProjectBundle";

const BANNER_ROW_BASE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: LANDIQ_THEME.spacing.sm,
  padding: `${LANDIQ_THEME.spacing.xs} ${LANDIQ_THEME.spacing.md}`,
  borderRadius: LANDIQ_THEME.border.radius.md,
  fontSize: LANDIQ_THEME.typography.fontSize.xs,
  fontWeight: LANDIQ_THEME.typography.fontWeight.medium,
};

const ERROR_CONTENT_ROW: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: LANDIQ_THEME.spacing.xs,
  minWidth: 0,
};

const ERROR_TEXT: CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

interface PlacementStatusBannerProps {
  status: BootstrapStatus;
  error: string | null;
  onRetry: () => void;
}

export function PlacementStatusBanner({
  status,
  error,
  onRetry,
}: Readonly<PlacementStatusBannerProps>): JSX.Element | null {
  if (status !== "loading" && status !== "error") {
    return null;
  }

  if (status === "loading") {
    const blue = LANDIQ_THEME.colors.info.blue;
    return (
      <div
        style={{
          ...BANNER_ROW_BASE,
          background: `${blue}15`,
          color: blue,
          border: `1px solid ${blue}30`,
        }}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <Loader2
          size={14}
          className="animate-spin"
          style={{ flexShrink: 0 }}
        />
        <span>Loading pattern book designs from Giraffe...</span>
      </div>
    );
  }

  const err = LANDIQ_THEME.colors.status.error;
  const message = error ?? "Unknown error";

  return (
    <div
      style={{
        ...BANNER_ROW_BASE,
        background: LANDIQ_THEME.colors.status.errorBg,
        color: err,
        border: `1px solid ${err}30`,
        justifyContent: "space-between",
      }}
      role="alert"
    >
      <div style={ERROR_CONTENT_ROW}>
        <AlertCircle size={14} style={{ flexShrink: 0 }} />
        <span style={ERROR_TEXT} title={error ?? undefined}>
          Pattern placement unavailable: {message}
        </span>
      </div>
      <button
        type="button"
        onClick={onRetry}
        style={{
          background: "transparent",
          border: `1px solid ${err}`,
          color: err,
          borderRadius: LANDIQ_THEME.border.radius.sm,
          padding: `2px ${LANDIQ_THEME.spacing.sm}`,
          fontSize: LANDIQ_THEME.typography.fontSize.xs,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        Retry
      </button>
    </div>
  );
}
