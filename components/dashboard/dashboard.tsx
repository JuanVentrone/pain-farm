"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  getGeneralStatus,
  getHeartbeat,
  getPowerMetrics,
  postBocina,
  postContactorSwitch,
  postGeneralSwitch,
  postLuces,
} from "@/lib/api";
import type { PowerMetricsData } from "@/lib/types";
import { useLocale, type MessageKey } from "@/lib/i18n";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import type { KwPoint } from "./consumption-chart";
import { derivePhaseKw } from "./consumption-chart";
import { ContactorControls } from "./contactor-controls";
import { IndustrialNavbar } from "./industrial-navbar";
import type { TempPoint } from "./temperature-chart";
import { VoltagePanel } from "./voltage-panel";
import { getBootRunMode } from "@/lib/run-mode";

/** Recharts (ResponsiveContainer) no es seguro en SSR; evita errores 500 en GET /. */
function ChartSkeleton() {
  return (
    <div
      className="min-h-[320px] animate-pulse rounded-xl border border-[#49483e] bg-[#3e3d32]/30"
      aria-busy="true"
      aria-label="Chart loading"
    />
  );
}

const ConsumptionChart = dynamic(
  () => import("./consumption-chart").then((m) => ({ default: m.ConsumptionChart })),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

const TemperatureChart = dynamic(
  () => import("./temperature-chart").then((m) => ({ default: m.TemperatureChart })),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

const MAX_SAMPLES = 60;
const POLL_MS = 1000;
const METRICS_MAX_AGE_MS = 6000;

type ContactorMap = Record<"C1" | "C2" | "C3", boolean>;

type PendingConfirm =
  | null
  | {
      scope: "general" | "C1" | "C2" | "C3" | "luces" | "bocina";
      nextActive: boolean;
    };

function stateFromBackend(v: unknown): boolean {
  return v === "ON";
}

function initialContactor(): ContactorMap {
  return { C1: false, C2: false, C3: false };
}

function mockPower(row: Date): PowerMetricsData {
  const sway = Math.sin(row.getTime() / 4000) * 14;
  const vBase = 238 + sway;
  const jitter = Math.sin(row.getTime() / 1700);
  const l1 = vBase + jitter * 1.8;
  const l2 = vBase + Math.cos(row.getTime() / 2300) * 2;
  const l3 = vBase - jitter * 1.2;
  const a1 = 12 + Math.sin(row.getTime() / 2500) * 4;
  const a2 = 11 + Math.cos(row.getTime() / 3100) * 3;
  const a3 = 10 + Math.sin(row.getTime() / 2900) * 5;
  return {
    v_l1: l1,
    v_l2: l2,
    v_l3: l3,
    a_l1: a1,
    a_l2: a2,
    a_l3: a3,
    potencia_kw:
      Math.max(l1 * a1 / 1000 + l2 * a2 / 1000 + l3 * a3 / 1000 + Math.random() * 0.08, 0),
    factor_potencia: 0.92 + Math.sin(row.getTime() / 5000) * 0.06,
    frecuencia: 59.98 + jitter * 0.15,
    timestamp: row.toISOString(),
    source: "simulated_dashboard",
  };
}

function useSimulatedTemperature() {
  const ref = useRef(28 + Math.random() * 4);
  return useCallback((tick: Date) => {
    const drift = Math.sin(tick.getTime() / 8000) * 0.04;
    const noise = (Math.random() - 0.5) * 0.35;
    ref.current = Math.min(48, Math.max(18, ref.current + drift + noise));
    return ref.current;
  }, []);
}

export function Dashboard() {
  const { t, bcp47 } = useLocale();
  const runMode = getBootRunMode();

  const [contactors, setContactors] = useState<ContactorMap>(initialContactor);
  const [statusKnown, setStatusKnown] = useState(true);
  const [lightsOn, setLightsOn] = useState(false);
  const [hornOn, setHornOn] = useState(false);
  const [metrics, setMetrics] = useState<PowerMetricsData | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [heartbeat, setHeartbeat] = useState<{
    rs485_status: string;
    uptime_seconds: number;
  } | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const [kwSeries, setKwSeries] = useState<KwPoint[]>([]);
  const [tempSeries, setTempSeries] = useState<TempPoint[]>([]);
  const [usingMockKw, setUsingMockKw] = useState(false);

  const [pending, setPending] = useState<PendingConfirm>(null);
  const [seqPending, setSeqPending] = useState(false);

  const simTemp = useSimulatedTemperature();

  const generalOn = contactors.C1 && contactors.C2 && contactors.C3;

  const metricsFresh = useMemo(() => {
    if (!metrics?.timestamp) return false;
    const then = Date.parse(metrics.timestamp);
    if (Number.isNaN(then)) return false;
    return Date.now() - then < METRICS_MAX_AGE_MS;
  }, [metrics]);

  useEffect(() => {
    let stopped = false;

    if (runMode === "test") {
      function tick() {
        if (stopped) return;
        const now = new Date();
        setConnectionError(null);
        setMetricsError(null);
        setStatusKnown(true);
        setUsingMockKw(true);
        const powerBlock = mockPower(now);
        setMetrics(powerBlock);
        setHeartbeat(null);

        const kwPoint = derivePhaseKw(powerBlock, bcp47);
        const tempVal = simTemp(now);
        const tempPoint: TempPoint = {
          timeLabel: now.toLocaleTimeString(bcp47, {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          celsius: tempVal,
        };
        setTempSeries((prev) => [...prev, tempPoint].slice(-MAX_SAMPLES));
        setKwSeries((prev) => [...prev, kwPoint].slice(-MAX_SAMPLES));
      }
      tick();
      const id = window.setInterval(tick, POLL_MS);
      return () => {
        stopped = true;
        window.clearInterval(id);
      };
    }

    async function poll() {
      const now = new Date();
      const [statsRes, powerRes, hbRes] = await Promise.all([
        getGeneralStatus(),
        getPowerMetrics(),
        getHeartbeat(),
      ]);

      if (stopped) return;

      if (!statsRes.ok) {
        setConnectionError(statsRes.error ?? t("error.statusGeneral"));
        setStatusKnown(false);
      } else {
        setConnectionError(null);
        setStatusKnown(true);
        const d = statsRes.data;
        if (d) {
          setContactors({
            C1: stateFromBackend(d.C1?.state),
            C2: stateFromBackend(d.C2?.state),
            C3: stateFromBackend(d.C3?.state),
          });
        }
      }

      if (hbRes.ok && hbRes.data) {
        setHeartbeat({
          rs485_status: hbRes.data.rs485_status,
          uptime_seconds: hbRes.data.uptime_seconds,
        });
      } else {
        setHeartbeat(null);
      }

      if (powerRes.ok && powerRes.data?.success && powerRes.data.data) {
        setMetricsError(null);
        setMetrics(powerRes.data.data);
        setUsingMockKw(false);
        const kwPoint = derivePhaseKw(powerRes.data.data, bcp47);
        const tempVal = simTemp(now);
        const tempPoint: TempPoint = {
          timeLabel: now.toLocaleTimeString(bcp47, {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          celsius: tempVal,
        };
        setTempSeries((prev) => [...prev, tempPoint].slice(-MAX_SAMPLES));
        setKwSeries((prev) => [...prev, kwPoint].slice(-MAX_SAMPLES));
      } else {
        const err =
          powerRes.data?.error ?? powerRes.error ?? t("error.multimeter");
        setMetricsError(err);
        setMetrics(null);
        setUsingMockKw(false);
        setKwSeries([]);
        setTempSeries([]);
      }
    }

    poll();
    const id = window.setInterval(poll, POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [runMode, simTemp, bcp47, t]);

  useEffect(() => {
    if (generalOn) setSeqPending(false);
  }, [generalOn]);

  const openConfirm = (scope: NonNullable<PendingConfirm>["scope"], nextActive: boolean) => {
    setPending({ scope, nextActive });
  };

  const runMutation = async () => {
    if (!pending) return;
    const { scope, nextActive } = pending;
    setPending(null);

    if (runMode === "test") {
      if (scope === "general") {
        setContactors({ C1: nextActive, C2: nextActive, C3: nextActive });
        setSeqPending(false);
        return;
      }
      if (scope === "C1" || scope === "C2" || scope === "C3") {
        setContactors((prev) => ({ ...prev, [scope]: nextActive }));
        return;
      }
      if (scope === "luces") {
        setLightsOn(nextActive);
        return;
      }
      if (scope === "bocina") {
        setHornOn(nextActive);
      }
      return;
    }

    try {
      if (scope === "general") {
        const res = await postGeneralSwitch({ estado: nextActive });
        if (!res.ok || !res.data) {
          setConnectionError(res.error ?? t("error.switchGeneral"));
          return;
        }
        const body = res.data;
        if ("accepted" in body && body.accepted && nextActive) {
          const msg = (body.message || "").toLowerCase();
          if (msg.includes("background") || msg.includes("sequential")) {
            setSeqPending(true);
          }
        } else {
          setSeqPending(false);
        }
        return;
      }

      if (scope === "C1" || scope === "C2" || scope === "C3") {
        const res = await postContactorSwitch(scope, { estado: nextActive });
        if (!res.ok || !res.data?.success) {
          setConnectionError(
            res.data?.error ?? res.error ?? t("error.contactor", { id: scope }),
          );
        }
        return;
      }

      if (scope === "luces") {
        const res = await postLuces({ estado: nextActive });
        if (res.ok && res.data?.success !== false) {
          setLightsOn(nextActive);
        } else {
          setConnectionError(res.error ?? t("error.lights"));
        }
        return;
      }

      if (scope === "bocina") {
        const res = await postBocina({ estado: nextActive });
        if (res.ok && res.data?.success) {
          setHornOn(nextActive);
        } else {
          setConnectionError(res.data?.error ?? res.error ?? t("error.horn"));
        }
      }
    } catch (e) {
      setConnectionError(e instanceof Error ? e.message : t("error.network"));
    }
  };

  const confirmCopy = useMemo(() => {
    if (!pending) return { title: "", description: "", confirmLabel: "" };
    const targets: Record<NonNullable<PendingConfirm>["scope"], MessageKey> = {
      general: "confirm.target.general",
      C1: "confirm.target.c1",
      C2: "confirm.target.c2",
      C3: "confirm.target.c3",
      luces: "confirm.target.lights",
      bocina: "confirm.target.horn",
    };
    const targetPhrase = t(targets[pending.scope]);
    const promptKey = pending.nextActive ? "confirm.turnOn.prompt" : "confirm.turnOff.prompt";
    return {
      title: t("confirm.action"),
      description: t(promptKey, { target: targetPhrase }),
      confirmLabel: pending.nextActive ? t("confirm.turnOn.confirm") : t("confirm.turnOff.confirm"),
    };
  }, [pending, t]);

  const mainMetricsMissing = runMode === "main" && metrics == null;
  const voltageLive =
    runMode === "test" || (Boolean(metrics) && metricsFresh && !usingMockKw);

  return (
    <div className="flex min-h-dvh flex-col">
      <IndustrialNavbar
        statusKnown={runMode === "test" ? true : statusKnown}
        generalOn={generalOn}
        generalBusy={seqPending}
        lightsOn={lightsOn}
        hornOn={hornOn}
        contactors={contactors}
        onGeneralClick={() => openConfirm("general", !generalOn)}
        onLightsClick={() => openConfirm("luces", !lightsOn)}
        onHornClick={() => openConfirm("bocina", !hornOn)}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 lg:px-8">
        {runMode === "main" && (connectionError || metricsError) && (
          <div className="flex flex-wrap items-start gap-2 rounded-lg border border-[#75604b] bg-[#3e3629] px-4 py-3 text-sm text-[#fde1c7]">
            <span className="font-semibold text-[#fd971f]">{t("notice.banner")}</span>
            {connectionError && <span>{connectionError}</span>}
            {!connectionError && metricsError && (
              <span className="text-[#fcd7a9]">{metricsError}</span>
            )}
          </div>
        )}

        <ContactorControls
          contactors={contactors}
          statusKnown={runMode === "test" ? true : statusKnown}
          onToggle={(k) => openConfirm(k, !contactors[k])}
        />

        <VoltagePanel
          metrics={metrics}
          live={voltageLive}
          rs485Status={heartbeat?.rs485_status}
          rs485Unavailable={runMode === "main" && !heartbeat}
          error={metricsError}
          usingMock={usingMockKw}
          testMode={runMode === "test"}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <ConsumptionChart
            series={kwSeries}
            usingMock={runMode === "test" || usingMockKw}
            currentTotalKw={
              kwSeries.length > 0 ? kwSeries[kwSeries.length - 1]!.total_kw : null
            }
            valueUnavailable={mainMetricsMissing}
            showSimulatedBadge={runMode === "test" || usingMockKw}
          />
          <TemperatureChart
            series={tempSeries}
            currentCelsius={
              tempSeries.length > 0 ? tempSeries[tempSeries.length - 1]!.celsius : null
            }
            valueUnavailable={mainMetricsMissing}
            showSimulatedBadge={runMode === "test"}
          />
        </div>

        <footer className="border-t border-[#49483e] pb-10 pt-6 text-xs text-[#75715e]">
          {t("footer.line")}
        </footer>
      </main>

      <ConfirmModal
        open={pending !== null}
        title={confirmCopy.title}
        description={confirmCopy.description}
        confirmLabel={confirmCopy.confirmLabel}
        cancelLabel={t("confirm.cancel")}
        destructive={pending?.nextActive === false}
        onConfirm={runMutation}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
