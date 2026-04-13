import { PATTERN_BOOK_SHORT_LIST } from "@/apps/patternBook/constants/patternBookFlowDag";
import {
  DEFAULT_ENVELOPE_MAX_HEIGHT,
  ENVELOPE_SETBACK_INPUT_MAX_M,
  type EnvelopeSetbackParams,
} from "@/apps/patternBook/constants/envelopeSetbacks";
import type {
  EnvelopeSideIndices,
  ProjectedFeature,
  ProjectedPolygon,
} from "@/apps/patternBook/types/projectedGeometry";

const ENVELOPE_NODE_TYPE = "7bc5a2c9-09fe-47f8-961d-f8986f0b76b0";

let cachedEnvelopeNodeId: string | null = null;

function clampEnvelopeSetbackMetres(value: number): number {
  return Math.min(ENVELOPE_SETBACK_INPUT_MAX_M, Math.max(0, value));
}

export function getEnvelopeNodeId(): string {
  if (cachedEnvelopeNodeId !== null) {
    return cachedEnvelopeNodeId;
  }

  const envelopeNode = PATTERN_BOOK_SHORT_LIST.nodes.find((node) => node.type === ENVELOPE_NODE_TYPE);

  if (envelopeNode === undefined) {
    throw new Error(
      "Pattern book flow DAG is missing the envelope node. The flow DAG constant may be out of date — check patternBookFlowDag.ts",
    );
  }

  cachedEnvelopeNodeId = envelopeNode.id;
  return envelopeNode.id;
}

interface FlowInputsShape {
  id: string;
  inputs: {
    keys: string[];
    point: [string];
    rotation: string;
    [envelopeNodeId: string]: unknown;
  };
}

interface SiteFeatureProperties {
  id: string;
  address: string | null;
  "Height Of Building": number | null;
  Area: number | null;
  siteType?: string;
  flow: FlowInputsShape;
  [key: string]: unknown;
}

export function setFlowPropertyOfFeature(
  feature: ProjectedFeature,
  params: EnvelopeSetbackParams,
  indices: EnvelopeSideIndices,
  selectedBlockIds: string[],
  instantPointId: string,
  rotations: Record<string, number>,
  fallbackIndex?: number,
): void {
  const envelopeNodeId = getEnvelopeNodeId();

  const rear = clampEnvelopeSetbackMetres(params.rear);
  const front = clampEnvelopeSetbackMetres(params.front);
  const side = clampEnvelopeSetbackMetres(params.side);

  const existingProps = feature.properties;
  const rawId =
    (existingProps.id as string | number | undefined) ?? (existingProps["ID"] as string | number | undefined);
  const address =
    (existingProps.address as string | undefined) ?? (existingProps["Address"] as string | undefined) ?? null;
  const heightOfBuilding = (existingProps["Height Of Building"] as number | undefined) ?? null;
  const area = (existingProps["Area"] as number | undefined) ?? null;

  const nextProperties: SiteFeatureProperties = {
    id: rawId === undefined ? `site_${fallbackIndex ?? 0}` : String(rawId),
    address,
    "Height Of Building": heightOfBuilding,
    Area: area,
    siteType: existingProps.siteType as string | undefined,
    flow: {
      id: PATTERN_BOOK_SHORT_LIST.id,
      inputs: {
        [envelopeNodeId]: {
          type: "envelope",
          parameters: {
            version: "beta",
            maxHeight: DEFAULT_ENVELOPE_MAX_HEIGHT,
            fillEnabled: true,
            sideIndices: {
              rear: indices.rear,
              front: indices.front,
              side: indices.side,
              isManual: true,
            },
            setbackSteps: {
              rear: [{ inset: rear, height: 0 }, { inset: rear }],
              side: [{ inset: side, height: 0 }, { inset: side }],
              front: [{ inset: front, height: 0 }, { inset: front }],
            },
            hasSetbackOutput: true,
          },
        },
        keys: selectedBlockIds,
        point: [instantPointId],
        rotation: JSON.stringify(rotations),
      },
    },
  };

  feature.properties = nextProperties as Record<string, unknown>;
}

export function groupKeyForFlowInputKeys(feature: ProjectedPolygon): string {
  const flow = feature.properties.flow as { inputs?: { keys?: string[] } } | undefined;
  const keys = flow?.inputs?.keys;
  if (Array.isArray(keys)) {
    return JSON.stringify([...keys].sort((a, b) => a.localeCompare(b)));
  }
  return String(keys ?? "");
}
