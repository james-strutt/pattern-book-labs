import { LANDIQ_THEME } from "@/components/ui/landiq/theme";
import {
  ENVELOPE_SETBACK_INPUT_MAX_M,
  type EnvelopeSetbackParams,
} from "@/apps/patternBook/constants/envelopeSetbacks";

interface SetbackInputsProps {
  params: EnvelopeSetbackParams;
  onChange: (field: keyof EnvelopeSetbackParams, value: string | number) => void;
  onReset?: () => void;
  disabled?: boolean;
}

const FIELDS: Array<{ key: keyof EnvelopeSetbackParams; label: string }> = [
  { key: "front", label: "Front" },
  { key: "rear", label: "Rear" },
  { key: "side", label: "Side" },
];

export function SetbackInputs({
  params,
  onChange,
  onReset,
  disabled,
}: Readonly<SetbackInputsProps>) {
  return (
    <fieldset
      style={{
        display: "flex",
        flexDirection: "column",
        gap: LANDIQ_THEME.spacing.xs,
        padding: LANDIQ_THEME.spacing.sm,
        border: `1px solid ${LANDIQ_THEME.colors.greys.grey02}`,
        borderRadius: LANDIQ_THEME.border.radius.sm,
      }}
      disabled={disabled}
    >
      <legend
        style={{
          fontSize: 11,
          fontWeight: LANDIQ_THEME.typography.fontWeight.semibold,
          color: LANDIQ_THEME.colors.text.muted,
          padding: `0 ${LANDIQ_THEME.spacing.xs}`,
        }}
      >
        Envelope setbacks (m)
      </legend>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: LANDIQ_THEME.spacing.xs,
        }}
      >
        {FIELDS.map((field) => (
          <label
            key={field.key}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              fontSize: 10,
              color: LANDIQ_THEME.colors.text.muted,
            }}
          >
            <span>{field.label}</span>
            <input
              type="number"
              min={0}
              max={ENVELOPE_SETBACK_INPUT_MAX_M}
              step={0.5}
              value={params[field.key]}
              onChange={(e) => {
                onChange(field.key, e.target.value);
              }}
              disabled={disabled}
              style={{
                width: "100%",
                padding: "4px 6px",
                fontSize: 12,
                borderRadius: 4,
                border: `1px solid ${LANDIQ_THEME.colors.greys.grey03}`,
                color: LANDIQ_THEME.colors.text.dark,
                background: disabled
                  ? LANDIQ_THEME.colors.greys.grey02
                  : LANDIQ_THEME.colors.greys.white,
              }}
            />
          </label>
        ))}
      </div>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          disabled={disabled}
          style={{
            alignSelf: "flex-end",
            fontSize: 10,
            color: LANDIQ_THEME.colors.info.blue,
            background: "transparent",
            border: "none",
            cursor: disabled ? "not-allowed" : "pointer",
            padding: 0,
          }}
        >
          Reset defaults
        </button>
      )}
    </fieldset>
  );
}
