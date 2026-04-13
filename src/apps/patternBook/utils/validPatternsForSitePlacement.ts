import { rotateProjectedCoord } from "@/utils/geometry/projectedMath";
import { getEnvelopeNodeId } from "@/apps/patternBook/services/flowDagAdapter";
import type { ProjectedCoordinate, ProjectedPolygon } from "@/apps/patternBook/types/projectedGeometry";
import { FLOW_DAG_SITE_TYPE } from "@/apps/patternBook/constants/placementLayers";
import type { VariantMatch } from "@/apps/patternBook/types/patternBook";

export interface SitePlacementSelector {
  value: string;
  label: string;
}

interface SiteFlowInputs {
  id: string;
  inputs: {
    keys: string[];
    point: [string];
    rotation: string;
    [envelopeNodeId: string]: unknown;
  };
}

interface EnvelopeParameters {
  parameters: {
    sideIndices: {
      front: number[];
      rear: number[];
      side?: number[];
    };
  };
}

export interface FrontEdgeFitment {
  edgeIndex: number;
  edgeLength: number;
  rotatedWidth: number;
  rotatedDepth: number;
  /**
   * True if the variant fits at this edge in EITHER its natural
   * orientation (lotWidth along edge, lotLength into depth) OR
   * rotated 90° (lotLength along edge, lotWidth into depth). The
   * flow DAG is free to pick whichever orientation works once we
   * tell it this edge is the front.
   */
  fits: boolean;
  fitsParallel: boolean;
  fitsPerpendicular: boolean;
  failReason: "width_too_small" | "depth_too_small" | null;
}

export interface SiteFitmentReport {
  siteId: string;
  siteType: string | null;
  battleAxeRejected: boolean;
  variantLotWidth: number;
  variantLotLength: number;
  bboxShort: number;
  bboxLong: number;
  bboxFits: boolean;
  frontEdges: FrontEdgeFitment[];
  passed: boolean;
  passPath: "rotated_edge" | "bbox_fallback" | null;
}

export interface PrefilterResult {
  passedFeatures: ProjectedPolygon[];
  reports: SiteFitmentReport[];
}

interface EdgeDimensions {
  rotatedWidth: number;
  rotatedDepth: number;
}

function computeEdgeDimensions(coords: ProjectedCoordinate[], edgeIndex: number): EdgeDimensions | null {
  const coord = coords[edgeIndex];
  const nextCoord = coords[edgeIndex + 1];
  if (!coord || !nextCoord) return null;

  const angle = Math.atan2(nextCoord[1] - coord[1], nextCoord[0] - coord[0]);
  const rotated = coords.map((c) => rotateProjectedCoord(c, -angle));
  const xs = rotated.map((c) => c[0]);
  const ys = rotated.map((c) => c[1]);
  return {
    rotatedWidth: Math.max(...xs) - Math.min(...xs),
    rotatedDepth: Math.max(...ys) - Math.min(...ys),
  };
}

function computeAxisBbox(coords: ProjectedCoordinate[]): {
  bboxShort: number;
  bboxLong: number;
} {
  if (coords.length === 0) return { bboxShort: 0, bboxLong: 0 };
  const xs = coords.map((c) => c[0]);
  const ys = coords.map((c) => c[1]);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  return {
    bboxShort: Math.min(width, height),
    bboxLong: Math.max(width, height),
  };
}

/**
 * Geometric prefilter — verifies that the selected variant physically
 * fits on the site and mutates `flow.inputs.sideIndices` so the flow
 * DAG receives a clean, refined front-edge classification.
 *
 * **Site-level gate**: per candidate front edge, rotate the site's
 * projected ring so the edge is axis-aligned, measure the bbox, and
 * check `variant.lotWidth`/`lotLength` against it in both orientations
 * (parallel and perpendicular to the edge). A site passes if at least
 * one front edge passes the rotated-edge check, OR (as a fallback)
 * if the raw axis-aligned site bbox fits the variant and there is at
 * least one front candidate. The bbox fallback is weaker but necessary
 * in practice — removing it regressed placements across the shortlist.
 *
 * **Refinement**: for sites that pass the gate, the `sideIndices.front`
 * list is collapsed to the SINGLE LONGEST front candidate (regardless
 * of which edges individually passed fitment — see the in-line comment
 * at the refinement site for why the per-edge fit check isn't used to
 * pick the representative edge). Remaining edges are reclassified as
 * side (if adjacent to the refined front) or rear.
 *
 * Note: this deliberately does NOT use the block's `patternStatsByBlockId`
 * dimensions. Those are derived from the block's evaluated setback-
 * envelope polygon at bootstrap, which inflates the block's "required
 * width" by the setback amount (e.g. a 19.8×55 SLA03 block reports
 * 25.8×61 after a 3m setback ring is included in the bbox). Comparing
 * site dims against those inflated values incorrectly rejects variants
 * that fit on their actual lot-size footprint. The authoritative
 * dimensions are `variant.lotWidth` and `variant.lotLength` from the
 * landiq_labs JSON schema — those match what eligibility checked, so
 * placement and eligibility now agree.
 */
export function getValidPatternsForSitePlacement(
  selectedSites: SitePlacementSelector[],
  siteFeatures: ProjectedPolygon[],
  variant: VariantMatch,
): PrefilterResult {
  const envelopeNodeId = getEnvelopeNodeId();
  const passedFeatures: ProjectedPolygon[] = [];
  const reports: SiteFitmentReport[] = [];

  for (const feature of siteFeatures) {
    const props = feature.properties as Record<string, unknown>;
    const featureId = props.id as string | undefined;
    if (!featureId) continue;

    const isSelected = selectedSites.some((s) => s.value === featureId);
    if (!isSelected) continue;

    const siteType = (props.siteType as string | undefined) ?? null;
    const battleAxeRejected = siteType === FLOW_DAG_SITE_TYPE.BATTLE_AXE;

    const coords = (feature._projected[0] as ProjectedCoordinate[] | undefined) ?? [];

    const flow = props.flow as SiteFlowInputs | undefined;
    const envelopeInput = flow?.inputs[envelopeNodeId] as EnvelopeParameters | undefined;
    const frontCandidates = envelopeInput?.parameters.sideIndices.front ?? [];

    const { bboxShort, bboxLong } = computeAxisBbox(coords);
    const bboxFits = variant.lotWidth <= bboxShort && variant.lotLength <= bboxLong;

    const frontEdges: FrontEdgeFitment[] = [];
    for (const edgeIndex of frontCandidates) {
      const dims = computeEdgeDimensions(coords, edgeIndex);
      if (!dims) continue;
      // Test both variant orientations at this edge. The DAG doesn't
      // care which orientation we "prefer" — it decides based on the
      // block's authored geometry and the envelope dimensions — so an
      // edge is a valid front candidate if EITHER orientation fits.
      const fitsParallel = variant.lotWidth <= dims.rotatedWidth && variant.lotLength <= dims.rotatedDepth;
      const fitsPerpendicular = variant.lotLength <= dims.rotatedWidth && variant.lotWidth <= dims.rotatedDepth;
      const fits = fitsParallel || fitsPerpendicular;
      let failReason: FrontEdgeFitment["failReason"] = null;
      if (!fits) {
        // Report against the better of the two orientations — whichever
        // gets closer to fitting. Keeps the error messages actionable.
        const bestWidth = Math.max(dims.rotatedWidth, dims.rotatedDepth);
        const widthFits = variant.lotWidth <= bestWidth;
        failReason = widthFits ? "depth_too_small" : "width_too_small";
      }
      // Edge length used by the refinement step below to pick a
      // single representative front edge from the candidate list.
      const a = coords[edgeIndex];
      const b = coords[edgeIndex + 1];
      const edgeLength = a && b ? Math.hypot(b[0] - a[0], b[1] - a[1]) : 0;
      frontEdges.push({
        edgeIndex,
        edgeLength,
        rotatedWidth: dims.rotatedWidth,
        rotatedDepth: dims.rotatedDepth,
        fits,
        fitsParallel,
        fitsPerpendicular,
        failReason,
      });
    }

    const passingEdges = frontEdges.filter((edge) => edge.fits);

    // Site-level pass gate. Two acceptance paths:
    //
    //   1. `rotated_edge`: at least one front edge passes the rotated
    //      fit test — the variant demonstrably fits at a specific
    //      frontage orientation.
    //
    //   2. `bbox_fallback`: no front edge passes, but the variant
    //      fits the site's raw axis-aligned bbox. This is a weaker
    //      signal — for skewed or irregular lots a world-axis bbox
    //      fit doesn't prove the variant fits any real frontage —
    //      but removing it regressed placements across the shortlist
    //      in practice because the rotated-edge check is too strict
    //      on Kogarah-style articulated polygons. Left in place as a
    //      pragmatic fallback; the refinement step below still picks
    //      the longest front candidate so the DAG gets a single
    //      coherent signal either way.
    let passPath: SiteFitmentReport["passPath"] = null;
    let passed = false;
    if (!battleAxeRejected && coords.length >= 2 && flow?.inputs) {
      if (passingEdges.length > 0) {
        passPath = "rotated_edge";
        passed = true;
      } else if (bboxFits && frontCandidates.length > 0) {
        passPath = "bbox_fallback";
        passed = true;
      }
    }

    reports.push({
      siteId: featureId,
      siteType,
      battleAxeRejected,
      variantLotWidth: variant.lotWidth,
      variantLotLength: variant.lotLength,
      bboxShort,
      bboxLong,
      bboxFits,
      frontEdges,
      passed,
      passPath,
    });

    if (passed && flow && envelopeInput) {
      // Refine the front-edge list written back to the flow inputs.
      //
      // Selection rules:
      //   1. Prefer front candidates whose polygon edge is at least
      //      MIN_FRONT_EDGE_LENGTH metres long. A real street frontage
      //      on a residential lot is virtually never <10m, and short
      //      edges classified as "front" by getSideIndices are almost
      //      always zig-zags or chamfered corners, NOT street edges.
      //   2. Among those, pick the single longest.
      //   3. Fallback: if no front candidate is ≥10m, fall back to
      //      the longest front edge regardless of length. Better than
      //      nothing for unusual lot shapes.
      //
      // We deliberately do NOT filter by per-edge fitment here — the
      // rotated-bbox fit check is unreliable on articulated polygons
      // (short diagonal edges can produce inflated bboxes and "pass"
      // fitment despite not being real street edges).
      const MIN_FRONT_EDGE_LENGTH = 10;
      const longEnough = frontEdges.filter((edge) => edge.edgeLength >= MIN_FRONT_EDGE_LENGTH);
      const candidatePool = longEnough.length > 0 ? longEnough : frontEdges;
      const longest = [...candidatePool].sort((a, b) => b.edgeLength - a.edgeLength)[0];
      const acceptedFrontEdges: number[] = longest ? [longest.edgeIndex] : frontCandidates;

      // Reclassify the remaining polygon edges around the refined
      // front set. Edges adjacent to a new front become "side", the
      // rest become "rear". Without this, edges that were previously
      // classified as "front" but got dropped by refinement would
      // orphan — not listed in front/side/rear — and the envelope
      // node wouldn't inset them at all.
      const numEdges = coords.length > 1 ? coords.length - 1 : 0;
      const frontSet = new Set(acceptedFrontEdges);
      const newSide: number[] = [];
      const newRear: number[] = [];
      for (let i = 0; i < numEdges; i += 1) {
        if (frontSet.has(i)) continue;
        const nextIdx = (i + 1) % numEdges;
        const prevIdx = i === 0 ? numEdges - 1 : i - 1;
        if (frontSet.has(nextIdx) || frontSet.has(prevIdx)) {
          newSide.push(i);
        } else {
          newRear.push(i);
        }
      }
      envelopeInput.parameters.sideIndices.front = acceptedFrontEdges;
      envelopeInput.parameters.sideIndices.side = newSide;
      envelopeInput.parameters.sideIndices.rear = newRear;
      passedFeatures.push(feature);
    }
  }

  return { passedFeatures, reports };
}

/**
 * Turns a failing SiteFitmentReport into a human-readable error message.
 */
export function formatPrefilterFailure(report: SiteFitmentReport, variantLabel: string): string {
  if (report.battleAxeRejected) {
    return `${variantLabel} rejected — site classified as battle-axe.`;
  }

  if (report.frontEdges.length === 0) {
    return `${variantLabel} rejected — no front edges detected on the site.`;
  }

  const bestEdge = [...report.frontEdges].sort(
    (a, b) => b.rotatedWidth * b.rotatedDepth - a.rotatedWidth * a.rotatedDepth,
  )[0];

  if (!bestEdge) {
    return `${variantLabel} rejected — no front edges to evaluate.`;
  }

  const widthDeficit = report.variantLotWidth - bestEdge.rotatedWidth;
  const depthDeficit = report.variantLotLength - bestEdge.rotatedDepth;
  const bboxInfo = `bbox ${report.bboxShort.toFixed(1)}×${report.bboxLong.toFixed(1)}m`;

  if (widthDeficit > 0 && depthDeficit > 0) {
    return `${variantLabel} needs ${report.variantLotWidth}×${report.variantLotLength}m but the best front edge gives ${bestEdge.rotatedWidth.toFixed(1)}×${bestEdge.rotatedDepth.toFixed(1)}m (${bboxInfo}).`;
  }
  if (widthDeficit > 0) {
    return `${variantLabel} needs ${report.variantLotWidth}m frontage but the best front edge gives ${bestEdge.rotatedWidth.toFixed(1)}m (short by ${widthDeficit.toFixed(1)}m, ${bboxInfo}).`;
  }
  if (depthDeficit > 0) {
    return `${variantLabel} needs ${report.variantLotLength}m depth but the best front edge gives ${bestEdge.rotatedDepth.toFixed(1)}m (short by ${depthDeficit.toFixed(1)}m, ${bboxInfo}).`;
  }

  return `${variantLabel} rejected — unknown reason (inspect the fitment report).`;
}
