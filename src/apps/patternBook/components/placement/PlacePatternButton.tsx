import React, { useEffect, useMemo, useState } from "react";
import { MapPin, Trash2, Loader2, AlertCircle } from "lucide-react";
import { LANDIQ_THEME } from "@/components/ui/landiq/theme";
import { useEnvelopeSetbackParams } from "@/apps/patternBook/hooks/useEnvelopeSetbackParams";
import {
  findBlockForVariant,
  diagnoseVariantMatch,
} from "@/apps/patternBook/utils/blockCatalogue";
import logger from "@/lib/logger";
import { SetbackInputs } from "./SetbackInputs";
import { PlacementPreviewSvg } from "./PlacementPreviewSvg";
import type { PatternBookSchema, VariantMatch } from "@/apps/patternBook/types/patternBook";
import type { PropertyFeature } from "@/types/geometry";
import type {
  PlacementResult,
  PlaceVariantArgs,
} from "@/apps/patternBook/types/placement";
import type { BootstrapResult } from "@/apps/patternBook/services/patternBookProjectBundleService";
import type { BootstrapStatus } from "@/apps/patternBook/hooks/usePatternBookProjectBundle";

interface PlacePatternButtonProps {
  property: PropertyFeature | null;
  pattern: PatternBookSchema;
  variant: VariantMatch;
  bootstrap: BootstrapResult | null;
  bootstrapStatus: BootstrapStatus;
  instantPointId: string | null;
  onPlace: (
    args: Omit<PlaceVariantArgs, "bootstrap" | "instantPointId"> & {
      bootstrap: BootstrapResult | null;
      instantPointId: string | null;
    },
  ) => Promise<PlacementResult | null>;
  onClear: () => Promise<void>;
  placementResult: PlacementResult | null;
  placementError: string | null;
  isPlacing: boolean;
}

export const PlacePatternButton: React.FC<PlacePatternButtonProps> = ({
  property,
  pattern,
  variant,
  bootstrap,
  bootstrapStatus,
  instantPointId,
  onPlace,
  onClear,
  placementResult,
  placementError,
  isPlacing,
}) => {
  const setbackParams = useEnvelopeSetbackParams();
  const [showSettings, setShowSettings] = useState(false);

  const matchedBlock = useMemo(
    () =>
      bootstrap
        ? findBlockForVariant(
            bootstrap.blockCatalogue,
            variant,
            pattern.metadata.id,
          )
        : null,
    [bootstrap, variant, pattern.metadata.id],
  );
  const blockMapped = matchedBlock !== null;

  const diagnosis = useMemo(
    () =>
      bootstrap && !blockMapped
        ? diagnoseVariantMatch(
            bootstrap.blockCatalogue,
            variant,
            pattern.metadata.id,
          )
        : null,
    [bootstrap, blockMapped, variant, pattern.metadata.id],
  );

  useEffect(() => {
    if (!diagnosis) return;
    logger.warn(
      `Variant could not be matched to any Giraffe block: ${diagnosis.summary}`,
      {
        patternId: diagnosis.patternId,
        variantDims: diagnosis.variantDims,
        totalBlocks: diagnosis.totalBlocks,
        blocksTaggedForPattern: diagnosis.blocksTaggedForPattern,
        blocksWithMatchingStoreys: diagnosis.blocksWithMatchingStoreys,
        rejectedCandidates: diagnosis.candidates
          .filter(
            (c) =>
              c.spec.patternId !== null &&
              c.spec.patternId.toUpperCase() === diagnosis.patternId.toUpperCase(),
          )
          .map((c) => ({
            name: c.blockName,
            storeys: c.spec.storeys,
            width: c.spec.width,
            depth: c.spec.depth,
            reason: c.reason,
          })),
      },
      "PlacePatternButton",
    );
  }, [diagnosis]);

  const disabled =
    !property ||
    bootstrapStatus !== "ready" ||
    !blockMapped ||
    !instantPointId ||
    isPlacing;

  const matchesThisVariant =
    placementResult !== null &&
    matchedBlock !== null &&
    placementResult.blockId === matchedBlock.id;

  const buttonLabel = useMemo((): string => {
    if (bootstrapStatus === "loading") return "Loading patterns…";
    if (bootstrapStatus === "error") return "Placement unavailable";
    if (!blockMapped) {
      return `No matching block for ${pattern.metadata.id} ${variant.lotWidth}×${variant.lotLength}m ${variant.storeys}s`;
    }
    if (isPlacing) return "Placing…";
    return `Place on site (${matchedBlock.name})`;
  }, [
    bootstrapStatus,
    blockMapped,
    pattern.metadata.id,
    variant.lotWidth,
    variant.lotLength,
    variant.storeys,
    isPlacing,
    matchedBlock,
  ]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: LANDIQ_THEME.spacing.sm,
        padding: LANDIQ_THEME.spacing.sm,
        background: LANDIQ_THEME.colors.greys.offWhite,
        borderRadius: LANDIQ_THEME.border.radius.sm,
        border: `1px solid ${LANDIQ_THEME.colors.greys.grey02}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: LANDIQ_THEME.spacing.md,
        }}
      >
        {matchesThisVariant ? (
          <PlacementPreviewSvg
            svgFeatures={placementResult.svgFeatures}
            width={110}
            height={110}
          />
        ) : (
          <div
            style={{
              width: 110,
              height: 110,
              background: LANDIQ_THEME.colors.greys.grey02,
              borderRadius: LANDIQ_THEME.border.radius.sm,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: LANDIQ_THEME.colors.text.muted,
              fontSize: 10,
              textAlign: "center",
              padding: LANDIQ_THEME.spacing.xs,
            }}
          >
            Preview appears after placing
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: LANDIQ_THEME.spacing.xs,
            flex: 1,
            minWidth: 0,
          }}
        >
          <button
            type="button"
            onClick={async (): Promise<void> => {
              if (!property) return;
              await onPlace({
                property,
                pattern,
                variant,
                setbacks: setbackParams.params,
                bootstrap,
                instantPointId,
              });
            }}
            disabled={disabled}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: LANDIQ_THEME.spacing.xs,
              padding: `${LANDIQ_THEME.spacing.xs} ${LANDIQ_THEME.spacing.md}`,
              background: disabled
                ? LANDIQ_THEME.colors.greys.grey03
                : LANDIQ_THEME.colors.brand.dark,
              color: LANDIQ_THEME.colors.greys.white,
              border: "none",
              borderRadius: LANDIQ_THEME.border.radius.sm,
              fontSize: 12,
              fontWeight: LANDIQ_THEME.typography.fontWeight.semibold,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            {isPlacing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <MapPin size={14} />
            )}
            {buttonLabel}
          </button>

          {matchesThisVariant && (
            <>
              <div
                style={{
                  display: "flex",
                  gap: LANDIQ_THEME.spacing.sm,
                  fontSize: 11,
                  color: LANDIQ_THEME.colors.text.muted,
                }}
              >
                <span>
                  Dwellings:{" "}
                  <strong style={{ color: LANDIQ_THEME.colors.text.dark }}>
                    {placementResult.stats.dwellings}
                  </strong>
                </span>
                <span>
                  GFA:{" "}
                  <strong style={{ color: LANDIQ_THEME.colors.text.dark }}>
                    {Math.round(placementResult.stats.netArea).toLocaleString()}
                    m²
                  </strong>
                </span>
                <span>
                  FSR:{" "}
                  <strong style={{ color: LANDIQ_THEME.colors.text.dark }}>
                    {placementResult.stats.fsr.toFixed(2)}
                  </strong>
                </span>
              </div>
              <button
                type="button"
                onClick={onClear}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  background: "transparent",
                  border: "none",
                  color: LANDIQ_THEME.colors.status.error,
                  cursor: "pointer",
                  padding: 0,
                  alignSelf: "flex-start",
                }}
              >
                <Trash2 size={12} />
                Clear placement
              </button>
            </>
          )}

          <button
            type="button"
            onClick={(): void => setShowSettings((prev) => !prev)}
            style={{
              fontSize: 10,
              color: LANDIQ_THEME.colors.info.blue,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
              alignSelf: "flex-start",
            }}
          >
            {showSettings ? "Hide setbacks" : "Adjust setbacks"}
          </button>

          {placementError && (
            <div
              role="alert"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 10,
                color: LANDIQ_THEME.colors.status.error,
              }}
            >
              <AlertCircle size={11} />
              <span>{placementError}</span>
            </div>
          )}

          {diagnosis && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 4,
                fontSize: 10,
                color: LANDIQ_THEME.colors.warning.main,
                lineHeight: 1.3,
              }}
            >
              <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{diagnosis.summary}</span>
            </div>
          )}
        </div>
      </div>

      {showSettings && (
        <SetbackInputs
          params={setbackParams.params}
          onChange={setbackParams.setField}
          onReset={setbackParams.reset}
          disabled={isPlacing}
        />
      )}
    </div>
  );
};
