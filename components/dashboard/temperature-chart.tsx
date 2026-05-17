"use client";

import { useLocale } from "@/lib/i18n";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type TempPoint = { timeLabel: string; celsius: number };

type Props = {
  series: TempPoint[];
  /** Lectura más reciente (°C) junto al título */
  currentCelsius: number | null;
  valueUnavailable?: boolean;
  showSimulatedBadge?: boolean;
};

export function TemperatureChart({
  series,
  currentCelsius,
  valueUnavailable,
  showSimulatedBadge = true,
}: Props) {
  const { t } = useLocale();
  const tempLabel = t("charts.tooltipTemp");
  const na = t("common.na");

  return (
    <section className="flex min-h-[320px] flex-col rounded-xl border border-[#49483e] bg-[#272822]/70 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
        <h2 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#75715e]">
          <span>{t("charts.temperatureTitle")}</span>
          {valueUnavailable ? (
            <span className="font-mono text-sm font-semibold normal-case tracking-normal text-[#75715e]">
              {na}
            </span>
          ) : (
            currentCelsius != null && (
              <span className="font-mono text-sm font-semibold lowercase normal-case tracking-normal text-[#fd5ff0] tabular-nums">
                {currentCelsius.toFixed(1)} °C
              </span>
            )
          )}
        </h2>
        {showSimulatedBadge && (
          <span className="rounded-full border border-[#66d9ef]/40 bg-[#1e3035] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#66d9ef]">
            {t("charts.temperatureSimulated")}
          </span>
        )}
        {!showSimulatedBadge && valueUnavailable && (
          <span className="rounded-full border border-[#49483e] bg-[#3e3d32] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#75715e]">
            {na}
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%" minHeight={260}>
          <LineChart data={series} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
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
              domain={["auto", "auto"]}
              width={40}
              unit="°"
            />
            <Tooltip
              contentStyle={{
                background: "#3e3d32",
                border: "1px solid #49483e",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "#e6db74" }}
              formatter={(value: number) => [`${value.toFixed(1)} °C`, tempLabel]}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="celsius"
              name={tempLabel}
              stroke="#fd5ff0"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: "#fd5ff0" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
