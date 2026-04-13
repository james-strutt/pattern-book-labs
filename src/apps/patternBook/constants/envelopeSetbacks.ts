export interface EnvelopeSetbackParams {
  front: number;
  rear: number;
  side: number;
}

export const DEFAULT_ENVELOPE_SETBACK_PARAMS: EnvelopeSetbackParams = {
  front: 3,
  rear: 1,
  side: 1,
};

export const ENVELOPE_SETBACK_INPUT_MAX_M = 10;

export const ENVELOPE_SETBACK_PARAMS_STORAGE_KEY =
  "patternBook:envelopeSetbackParams";

export const DEFAULT_ENVELOPE_MAX_HEIGHT = 12;

export const DEFAULT_SLAB_THICKNESS = 0.35;

export const MIN_GEOMETRY_DISTANCE = 0.000000000001;
