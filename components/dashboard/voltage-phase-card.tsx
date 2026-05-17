"use client";

import {
  toneClasses,
  voltageTone,
  type VoltageTone,
} from "@/lib/voltage-color";
import { useLocale, type MessageKey } from "@/lib/i18n";

type VoltagePhaseCardProps = {
  label: string;
  volts: number;
  stale?: boolean;
  /** Sin lectura (p. ej. Main sin API / multímetro) */
  unavailable?: boolean;
};

const TONE_KEYS: Record<VoltageTone, MessageKey> = {
  optimal: "tone.optimal",
  caution: "tone.caution",
  alert: "tone.alert",
};

export function VoltagePhaseCard({
  label,
  volts,
  stale,
  unavailable,
}: VoltagePhaseCardProps) {
  const { t } = useLocale();
  const na = t("common.na");

  if (unavailable) {
    return (
      <div
        className={`rounded-lg border border-[#49483e] bg-[#3e3d32] px-4 py-3 text-[#75715e] ${
          stale ? "opacity-70" : ""
        }`}
      >
        <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-wide">
          <span>{label}</span>
          <span className="font-mono">{na}</span>
        </div>
        <div className="mt-2 font-mono text-2xl font-semibold tabular-nums">{na}</div>
      </div>
    );
  }

  const tone: VoltageTone = Number.isFinite(volts) ? voltageTone(volts) : "alert";
  const display = Number.isFinite(volts) ? `${volts.toFixed(1)} V` : na;
  const toneText = t(TONE_KEYS[tone]);

  return (
    <div
      className={`rounded-lg border px-4 py-3 transition-colors ${toneClasses[tone]} ${
        stale ? "opacity-70" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-wide text-[#75715e]">
        <span>{label}</span>
        <span className="font-mono">{toneText}</span>
      </div>
      <div className="mt-2 font-mono text-2xl font-semibold tabular-nums">{display}</div>
    </div>
  );
}
