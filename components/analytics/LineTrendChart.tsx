"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceDot,
} from "recharts";
import type { AnalyticsSummary, AnalyticsGranularity } from "@/app/types";

interface Props {
  data: AnalyticsSummary;
  granularity: AnalyticsGranularity;
  onGranularityChange: (g: AnalyticsGranularity) => void;
}

type Range = "24h" | "7d" | "30d";
const rangeButtons: { label: string; value: Range; gran: AnalyticsGranularity }[] = [
  { label: "24h", value: "24h", gran: "hour" },
  { label: "7d",  value: "7d",  gran: "day"  },
  { label: "30d", value: "30d", gran: "day"  },
];

function formatBucket(bucket: string, gran: AnalyticsGranularity): string {
  const d = new Date(bucket);
  if (gran === "hour") return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label, gran }: any) {
  if (!active || !payload?.length) return null;
  const d = new Date(label);
  const dateStr =
    gran === "hour"
      ? d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="glass-card rounded-xl p-3 shadow-lg border border-[var(--border-default)] min-w-[150px]">
      <p className="text-xs text-[var(--text-muted)] mb-2">{dateStr}</p>
      {payload.map((p: { color: string; name: string; value: number }, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs mb-1 last:mb-0">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-[var(--text-secondary)] capitalize">{p.name}:</span>
          <span className="font-bold text-[var(--text-primary)] ml-auto tabular-nums">
            {p.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

import { useState } from "react";

export default function LineTrendChart({ data, granularity, onGranularityChange }: Props) {
  const [range, setRange] = useState<Range>("30d");

  const chartData = useMemo(() => {
    const now = Date.now();
    const filtered = data.clicks_over_time.filter((d) => {
      if (range === "24h") return new Date(d.bucket).getTime() >= now - 24 * 60 * 60 * 1000;
      if (range === "7d")  return new Date(d.bucket).getTime() >= now - 7 * 24 * 60 * 60 * 1000;
      return true;
    });
    // Limit to 30 points for performance
    const step = Math.max(1, Math.floor(filtered.length / 30));
    return filtered
      .filter((_, i) => i % step === 0 || i === filtered.length - 1)
      .map((d) => ({ ...d, label: formatBucket(d.bucket, granularity) }));
  }, [data.clicks_over_time, range, granularity]);

  const peak = useMemo(
    () => chartData.reduce<typeof chartData[0] | null>((max, d) =>
      !max || d.total_clicks > max.total_clicks ? d : max, null),
    [chartData]
  );

  const bestDay = useMemo(() => {
    if (!peak) return null;
    const d = new Date(peak.bucket);
    return granularity === "hour"
      ? d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
  }, [peak, granularity]);

  function handleRangeClick(r: { value: Range; gran: AnalyticsGranularity }) {
    setRange(r.value);
    if (r.gran !== granularity) onGranularityChange(r.gran);
  }

  if (!chartData.length) {
    return (
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-5">
        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1">
          Click Trend
        </p>
        <p className="text-xs text-[var(--text-muted)] mb-4">Traffic over time</p>
        <div className="h-48 flex items-center justify-center text-sm text-[var(--text-muted)]">
          Not enough data yet
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Click Trend</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {peak && bestDay ? (
              <>
                Peak:{" "}
                <span className="text-blue-500 font-semibold">
                  {peak.total_clicks.toLocaleString()} clicks
                </span>{" "}
                on {bestDay}
              </>
            ) : (
              "Traffic over time"
            )}
          </p>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          {rangeButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => handleRangeClick(btn)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                range === btn.value
                  ? "bg-blue-500 text-white shadow-sm"
                  : "bg-[var(--bg-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 10, right: 4, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="ltGradTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="ltGradUnique" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="var(--border-default)"
            strokeDasharray="3 3"
            vertical={false}
            strokeOpacity={0.6}
          />
          <XAxis
            dataKey="bucket"
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            tickFormatter={(v) => formatBucket(v, granularity)}
            interval="preserveStartEnd"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={<CustomTooltip gran={granularity} />}
            cursor={{ stroke: "var(--border-default)", strokeWidth: 1, strokeDasharray: "4 4" }}
          />
          <Area
            type="monotone"
            dataKey="total_clicks"
            name="total"
            stroke="#3b82f6"
            strokeWidth={2.5}
            fill="url(#ltGradTotal)"
            dot={false}
            activeDot={{ r: 5, fill: "#3b82f6", stroke: "var(--bg-subtle)", strokeWidth: 2 }}
            animationDuration={900}
          />
          <Area
            type="monotone"
            dataKey="unique_clicks"
            name="unique"
            stroke="#8b5cf6"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            fill="url(#ltGradUnique)"
            dot={false}
            activeDot={{ r: 4, fill: "#8b5cf6", stroke: "var(--bg-subtle)", strokeWidth: 2 }}
            animationDuration={900}
          />
          {peak && (
            <ReferenceDot
              x={peak.bucket}
              y={peak.total_clicks}
              r={5}
              fill="#f59e0b"
              stroke="var(--bg-subtle)"
              strokeWidth={2}
              label={{ value: "Peak", position: "top", fontSize: 9, fill: "#f59e0b" }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-blue-500 rounded-full" />
          <span className="text-xs text-[var(--text-muted)]">Total</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-4 h-0.5 rounded-full"
            style={{ backgroundImage: "repeating-linear-gradient(90deg,#8b5cf6 0,#8b5cf6 4px,transparent 4px,transparent 7px)" }}
          />
          <span className="text-xs text-[var(--text-muted)]">Unique</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-xs text-[var(--text-muted)]">Peak</span>
        </div>
      </div>
    </motion.div>
  );
}
