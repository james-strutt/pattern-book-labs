import { rpc } from "@gi-nx/iframe-sdk";
const groupBy = <T>(arr: T[], fn: (item: T) => string): Record<string, T[]> =>
  arr.reduce<Record<string, T[]>>((acc, item) => {
    const key = fn(item);
    (acc[key] ??= []).push(item);
    return acc;
  }, {});
import type { Feature } from "geojson";
import { createLocalProjection } from "@/utils/geometry/localProjection";
import { groupKeyForFlowInputKeys } from "@/apps/patternBook/services/flowDagAdapter";
import { PATTERN_MAIN_BATCH_SIZE } from "@/apps/patternBook/constants/placementLayers";
import logger from "@/lib/logger";
import type { BootstrapResult } from "@/apps/patternBook/services/patternBookProjectBundleService";
import type { ProjectedFeature, ProjectedPolygon } from "@/apps/patternBook/types/projectedGeometry";
import { expandEvaluatedFeatures, computePlacementStats } from "@/apps/patternBook/services/patternBookPlacementExpand";
import {
  alignPatternToEnvelope,
  isPointInRing,
  ringCentroid,
} from "@/apps/patternBook/services/patternBookPlacementAlign";
import { convertProjectedToWgs84 } from "@/apps/patternBook/services/patternBookPlacementSupport";
import type {
  PreparedSite,
  ShortlistPlacementOutcome,
  ShortlistPlacementProgress,
} from "@/apps/patternBook/services/patternBookPlacementShortlistTypes";

const SERVICE_NAME = "PatternBookPlacement";

export async function executeShortlistGroupedEvaluation(params: {
  passedPrepared: PreparedSite[];
  outcomes: ShortlistPlacementOutcome[];
  bootstrap: BootstrapResult;
  geoProject: ReturnType<typeof createLocalProjection>;
  abortSignal?: AbortSignal;
  onProgress?: (progress: ShortlistPlacementProgress) => void;
}): Promise<{ allPlacedWgs84: Feature[]; allSetbackWgs84: Feature[] }> {
  const { passedPrepared, outcomes, bootstrap, geoProject, abortSignal, onProgress } = params;

  const grouped = groupBy(passedPrepared, (p) => groupKeyForFlowInputKeys(p.siteFeature));

  const allPlacedWgs84: Feature[] = [];
  const allSetbackWgs84: Feature[] = [];
  let completedCount = 0;

  for (const group of Object.values(grouped)) {
    for (let start = 0; start < group.length; start += PATTERN_MAIN_BATCH_SIZE) {
      if (abortSignal?.aborted) break;
      const batch = group.slice(start, start + PATTERN_MAIN_BATCH_SIZE);
      const firstPrepared = batch[0];
      if (!firstPrepared) continue;
      const firstClone = structuredClone(firstPrepared.siteFeature);
      const childFeatures = batch.slice(1).map((p) => p.siteFeature);
      (firstClone.properties as Record<string, unknown>).childFeatures = childFeatures;

      onProgress?.({
        current: completedCount,
        total: passedPrepared.length,
        currentAddress: outcomes[firstPrepared.outcomeIndex]?.address ?? "",
      });

      logger.info(
        "placeVariantsOnShortlist: invoking evaluateFeatures for batch",
        {
          batchSize: batch.length,
          firstSiteId: (firstClone.properties as { id?: unknown }).id,
          blockIds: batch.map((p) => p.blockId),
        },
        SERVICE_NAME,
      );

      let rawEvaluated: Record<string, unknown>;
      try {
        rawEvaluated = (await rpc.invoke("evaluateFeatures", [[firstClone]])) as Record<string, unknown>;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        for (const p of batch) {
          const outcome = outcomes[p.outcomeIndex];
          if (outcome) outcome.error = `evaluateFeatures failed: ${message}`;
        }
        completedCount += batch.length;
        continue;
      }

      const flat = Object.values(rawEvaluated).flat() as ProjectedFeature[];

      const bySiteId = groupBy(flat, (f) => {
        const props = f.properties as { pattern?: { siteId?: string } } | null;
        return props?.pattern?.siteId ?? "undefined";
      });

      const batchSetbacks = (bySiteId["undefined"] ?? []) as ProjectedFeature[];

      const envelopesByOutcomeIndex = new Map<number, ProjectedFeature[]>();
      for (const setbackFeature of batchSetbacks) {
        if (setbackFeature.geometry.type !== "Polygon") continue;
        const envRing = (setbackFeature as ProjectedPolygon)._projected[0];
        if (!envRing || envRing.length < 3) continue;
        const envCentroid = ringCentroid(envRing);
        if (!envCentroid) continue;
        for (const p of batch) {
          const siteRing = p.siteFeature._projected[0];
          if (!siteRing || siteRing.length < 3) continue;
          if (isPointInRing(envCentroid, siteRing)) {
            const bucket = envelopesByOutcomeIndex.get(p.outcomeIndex) ?? [];
            bucket.push(setbackFeature);
            envelopesByOutcomeIndex.set(p.outcomeIndex, bucket);
            break;
          }
        }
      }

      for (const p of batch) {
        const siteId = String((p.siteFeature.properties as { id?: unknown }).id ?? "");
        const siteFeatures = (bySiteId[siteId] ?? []) as ProjectedFeature[];
        const patternFeatures = siteFeatures.filter((f) => {
          const props = f.properties as { pattern?: { siteId?: string } } | null;
          return props?.pattern?.siteId !== undefined;
        });

        if (patternFeatures.length === 0) {
          const outcome = outcomes[p.outcomeIndex];
          if (outcome) outcome.error = "Flow DAG returned no pattern features for this site";
          completedCount += 1;
          continue;
        }

        const minIx = Math.min(
          ...patternFeatures.map((f) => {
            const ix = (f.properties as { ix?: number } | null)?.ix;
            return typeof ix === "number" ? ix : 0;
          }),
        );
        if (Number.isFinite(minIx) && minIx !== 0) {
          for (const f of patternFeatures) {
            const props = f.properties as { ix?: number };
            if (typeof props.ix === "number") props.ix -= minIx;
          }
        }

        let stacked: ProjectedFeature[] = patternFeatures;
        try {
          const stackedResult = (await rpc.invoke("stackFeatures", [patternFeatures])) as ProjectedFeature[] | null;
          stacked = stackedResult ?? patternFeatures;
        } catch (err) {
          logger.warn(
            "stackFeatures failed in batch — using unstacked features",
            { error: err instanceof Error ? err.message : String(err) },
            SERVICE_NAME,
          );
        }

        const siteEnvelopes = envelopesByOutcomeIndex.get(p.outcomeIndex) ?? [];
        const alignResult = alignPatternToEnvelope(
          stacked,
          siteEnvelopes,
          p.frontageBearingRad,
          geoProject,
          outcomes[p.outcomeIndex]?.featureId ?? "",
        );
        if (!alignResult.success) {
          const outcome = outcomes[p.outcomeIndex];
          if (outcome) {
            outcome.error = alignResult.reason ?? "Placement alignment failed — pattern does not fit the envelope";
          }
          logger.warn(
            "placeVariantsOnShortlist: pattern failed envelope alignment",
            {
              featureId: outcomes[p.outcomeIndex]?.featureId,
              address: outcomes[p.outcomeIndex]?.address,
              reason: alignResult.reason,
              envelopeCount: siteEnvelopes.length,
            },
            SERVICE_NAME,
          );
          completedCount += 1;
          continue;
        }
        logger.info(
          "placeVariantsOnShortlist: pattern aligned to envelope",
          {
            featureId: outcomes[p.outcomeIndex]?.featureId,
            address: outcomes[p.outcomeIndex]?.address,
            mode: alignResult.mode,
          },
          SERVICE_NAME,
        );

        const expanded = expandEvaluatedFeatures(stacked, bootstrap.projectAppsByAppID);
        const wgs84 = convertProjectedToWgs84(expanded as unknown as ProjectedFeature[], geoProject);
        allPlacedWgs84.push(...wgs84);

        const siteAreaValue =
          typeof (p.siteFeature.properties as { Area?: unknown }).Area === "number"
            ? (p.siteFeature.properties as { Area: number }).Area
            : 0;
        const stats = computePlacementStats(stacked, siteAreaValue);

        const outcome = outcomes[p.outcomeIndex];
        if (outcome) {
          outcome.dwellings = stats.dwellings;
          outcome.netArea = stats.netArea;
          outcome.fsr = stats.fsr;
          outcome.footprintArea = stats.footprintArea;
          outcome.success = stats.dwellings > 0;
          outcome.placedFeatures = wgs84;
          outcome.projectedStackedFeatures = stacked;
          if (stats.dwellings === 0) {
            outcome.error = "Flow DAG produced zero dwellings for this site";
          }
        }

        completedCount += 1;
      }

      for (const [outcomeIndex, envelopes] of envelopesByOutcomeIndex) {
        const outcome = outcomes[outcomeIndex];
        if (outcome) {
          outcome.projectedSetbackFeatures.push(...envelopes);
        }
        if (outcome?.success) {
          const envWgs84 = convertProjectedToWgs84(structuredClone(envelopes), geoProject);
          allSetbackWgs84.push(...envWgs84);
        }
      }
    }
  }

  return { allPlacedWgs84, allSetbackWgs84 };
}
