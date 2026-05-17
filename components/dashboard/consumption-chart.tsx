"use client";

import type { PowerMetricsData } from "@/lib/types";
import { useLocale } from "@/lib/i18n";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type KwPoint = {
  timeLabel: string;
  total_kw: number;
  l1_kw: number;
  l2_kw: number;
  l3_kw: number;
};

type Props = {
  series: KwPoint[];
  usingMock: boolean;
  /** Último total kW para mostrar junto al título */
  currentTotalKw: number | null;
  /** Main sin datos de potencia */
  valueUnavailable?: boolean;
  /** Ocultar badge “simulado” en Main con datos reales */
  showSimulatedBadge?: boolean;
};

/** Reparte potencia total por proporción de corriente entre fases. */
export function derivePhaseKw(m: PowerMetricsData, timeLocaleBcp47 = "es-ES"): KwPoint {
  const a1 = Math.max(m.a_l1, 0);
  const a2 = Math.max(m.a_l2, 0);
  const a3 = Math.max(m.a_l3, 0);
  const sum = a1 + a2 + a3;
  const total = Math.max(m.potencia_kw, 0);
  let l1_kw: number;
  let l2_kw: number;
  let l3_kw: number;

  if (sum <= 1e-6) {
    l1_kw = total / 3;
    l2_kw = total / 3;
    l3_kw = total / 3;
  } else {
    l1_kw = total * (a1 / sum);
    l2_kw = total * (a2 / sum);
    l3_kw = total * (a3 / sum);
  }

  const t = new Date(m.timestamp);
  return {
    timeLabel: t.toLocaleTimeString(timeLocaleBcp47, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    total_kw: total,
    l1_kw,
    l2_kw,
    l3_kw,
  };
}

export function ConsumptionChart({
  series,
  usingMock,
  currentTotalKw,
  valueUnavailable,
  showSimulatedBadge = true,
}: Props) {
  const { t } = useLocale();
  const na = t("common.na");

  const legendMap = {
    total_kw: t("charts.legend.total"),
    l1_kw: t("charts.legend.l1"),
    l2_kw: t("charts.legend.l2"),
    l3_kw: t("charts.legend.l3"),
  } as const;

  return (
    <section className="flex min-h-[320px] flex-col rounded-xl border border-[#49483e] bg-[#272822]/70 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
        <h2 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#75715e]">
          <span>{t("charts.consumptionTitle")}</span>
          {valueUnavailable ? (
            <span className="font-mono text-sm font-semibold normal-case tracking-normal text-[#75715e]">
              {na}
            </span>
          ) : (
            currentTotalKw != null && (
              <span className="font-mono text-sm font-semibold lowercase normal-case tracking-normal text-[#66d9ef] tabular-nums">
                {currentTotalKw.toFixed(3)}{" "}
                <span className="uppercase tracking-[0.1em]">kW</span>
              </span>
            )
          )}
        </h2>
        {showSimulatedBadge && usingMock && (
          <span className="rounded-full border border-[#fd971f]/50 bg-[#3e3629] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#fd971f]">
            {t("charts.consumptionSimulated")}
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%" minHeight={260}>
          <AreaChart data={series} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="kTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#66d9ef" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#66d9ef" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="k1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a6e22e" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#a6e22e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="k2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fd971f" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#fd971f" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="k3" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ae81ff" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#ae81ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 6" stroke="#49483e" />
            <XAxis
              dataKey="timeLabel"
              tick={{ fill: "#75715e", fontSize: 10 }}
              axisLine={{ stroke: "#49483e" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "#75715e", fontSize: 10 }}
              axisLine={{ stroke: "#49483e" }}
              tickLine={false}
              domain={[0, "auto"]}
              width={42}
              unit=" kW"
            />
            <Tooltip
              contentStyle={{
                background: "#3e3d32",
                border: "1px solid #49483e",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "#e6db74" }}
              formatter={(value: number, name: string) => [
                `${value.toFixed(3)} kW`,
                legendMap[name as keyof typeof legendMap] ?? name,
              ]}
            />
            <Legend formatter={(value) => legendMap[value as keyof typeof legendMap] ?? value} />
            <Area
              type="monotone"
              dataKey="total_kw"
              name="total_kw"
              stroke="#66d9ef"
              fill="url(#kTotal)"
              strokeWidth={2}
            />
            <Area type="monotone" dataKey="l1_kw" name="l1_kw" stroke="#a6e22e" fill="url(#k1)" />
            <Area type="monotone" dataKey="l2_kw" name="l2_kw" stroke="#fd971f" fill="url(#k2)" />
            <Area type="monotone" dataKey="l3_kw" name="l3_kw" stroke="#ae81ff" fill="url(#k3)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
