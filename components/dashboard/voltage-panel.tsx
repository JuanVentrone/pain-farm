"use client";

import type { PowerMetricsData } from "@/lib/types";
import { useLocale } from "@/lib/i18n";
import { VoltagePhaseCard } from "./voltage-phase-card";

type VoltagePanelProps = {
  metrics: PowerMetricsData | null;
  live: boolean;
  rs485Status?: string | null;
  /** Main sin heartbeat */
  rs485Unavailable?: boolean;
  error?: string | null;
  usingMock?: boolean;
  /** Modo prueba: badge distinto al de “simulado por fallo API” */
  testMode?: boolean;
};

export function VoltagePanel({
  metrics,
  live,
  rs485Status,
  rs485Unavailable,
  error,
  usingMock,
  testMode,
}: VoltagePanelProps) {
  const { t } = useLocale();
  const na = t("common.na");
  const phaseUnavailable = metrics == null;
  const l1 = metrics?.v_l1 ?? NaN;
  const l2 = metrics?.v_l2 ?? NaN;
  const l3 = metrics?.v_l3 ?? NaN;

  return (
    <section
      aria-label={t("voltage.section")}
      className="rounded-xl border border-[#49483e] bg-[#3e3d32]/30 p-4"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-[#75715e]">
          {t("voltage.heading")}
        </h2>
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <span className="rounded border border-[#49483e] bg-[#272822] px-2 py-0.5 text-[#cfd0c9]">
            {t("voltage.rs485_label")}{" "}
            <span
              className={
                testMode
                  ? "text-[#66d9ef]"
                  : rs485Unavailable
                    ? "text-[#75715e]"
                    : live
                      ? "text-[#a6e22e]"
                      : "text-[#fd971f]"
              }
            >
              {testMode ? t("voltage.testRs485Value") : rs485Unavailable ? na : rs485Status ?? na}
            </span>
          </span>
          {testMode && (
            <span className="rounded-full border border-[#66d9ef]/50 bg-[#1e3035] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#66d9ef]">
              {t("voltage.testBadge")}
            </span>
          )}
          {!testMode && usingMock && (
            <span className="rounded-full border border-[#fd971f]/50 bg-[#3e3629] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#fd971f]">
              {t("voltage.simulatedBadge")}
            </span>
          )}
          <span className={`rounded px-2 py-0.5 ${live ? "text-[#66d9ef]" : "text-[#75715e]"}`}>
            {live ? t("voltage.liveInterval") : t("voltage.staleInterval")}
          </span>
        </div>
      </div>

      {!live && error && !phaseUnavailable && (
        <p className="mb-3 rounded-md border border-[#6b3545] bg-[#381822] px-3 py-2 text-sm text-[#fba8c8]">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <VoltagePhaseCard label="L1" volts={l1} stale={!live} unavailable={phaseUnavailable} />
        <VoltagePhaseCard label="L2" volts={l2} stale={!live} unavailable={phaseUnavailable} />
        <VoltagePhaseCard label="L3" volts={l3} stale={!live} unavailable={phaseUnavailable} />
      </div>
    </section>
  );
}
