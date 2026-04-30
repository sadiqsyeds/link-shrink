"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceDot,
} from "recharts";
import type { AnalyticsSummary, AnalyticsGranularity } from "@/app/types";

type Range = "24h" | "7d" | "30d";

interface Props {
  data: AnalyticsSummary;
  granularity: AnalyticsGranularity;
  onGranularityChange: (g: AnalyticsGranularity) => void;
}

function formatBucket(bucket: string, gran: AnalyticsGranularity): string {
  if (gran === "hour") {
    const d = new Date(bucket);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const d = new Date(bucket);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label, gran }: any) {
  if (!active || !payload?.length) return null;
  const d = new Date(label);
  const dateStr = gran === "hour"
    ? d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="glass-card rounded-xl p-3 shadow-lg border border-[var(--border-default)] min-w-[140px]">
      <p className="text-xs text-[var(--text-muted)] mb-2">{dateStr}</p>
      {payload.map((p: { color: string; name: string; value: number }, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[var(--text-secondary)] capitalize">{p.name}:</span>
          <span className="font-bold text-[var(--text-primary)]">{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export default function ChartContainer({ data, granularity, onGranularityChange }: Props) {
  const [range, setRange] = useState<Range>("30d");

  const rangeButtons: { label: string; value: Range; gran: AnalyticsGranularity }[] = [
    { label: "24h", value: "24h", gran: "hour" },
    { label: "7d",  value: "7d",  gran: "day"  },
    { label: "30d", value: "30d", gran: "day"  },
  ];

  const chartData = useMemo(() => {
    const filtered = data.clicks_over_time.filter((d) => {
      if (range === "24h") {
        return new Date(d.bucket) >= new Date(Date.now() - 24 * 60 * 60 * 1000);
      }
      if (range === "7d") {
        return new Date(d.bucket) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      }
      return true;
    });
    return filtered.map((d) => ({
      ...d,
      label: formatBucket(d.bucket, granularity),
    }));
  }, [data.clicks_over_time, range, granularity]);

  // Find peak point
  const peak = useMemo(() => {
    if (!chartData.length) return null;
    return chartData.reduce((max, d) => (d.total_clicks > max.total_clicks ? d : max), chartData[0]);
  }, [chartData]);

  // Find best day label
  const bestDay = useMemo(() => {
    if (!peak) return null;
    const d = new Date(peak.bucket);
    return granularity === "hour"
      ? d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
  }, [peak, granularity]);

  function handleRangeClick(r: { value: Range; gran: AnalyticsGranularity }) {
    setRange(r.value);
    if (r.gran !== granularity) {
      onGranularityChange(r.gran);
    }
  }

  if (!chartData.length) {
    return (
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-5">
        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-4">Clicks Over Time</p>
        <div className="h-48 flex items-center justify-center text-sm text-[var(--text-muted)]">
          No data for this period
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Clicks Over Time</h3>
          {peak && bestDay && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Peak: <span className="text-blue-500 font-semibold">{peak.total_clicks.toLocaleString()} clicks</span> on {bestDay}
            </p>
          )}
        </div>
        <div className="flex gap-1.5">
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
        <AreaChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="gradUnique" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border-default)" strokeDasharray="3 3" vertical={false} />
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
            strokeWidth={2}
            fill="url(#gradTotal)"
            dot={false}
            activeDot={{ r: 5, fill: "#3b82f6", stroke: "var(--bg-subtle)", strokeWidth: 2 }}
            animationDuration={800}
          />
          <Area
            type="monotone"
            dataKey="unique_clicks"
            name="unique"
            stroke="#8b5cf6"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            fill="url(#gradUnique)"
            dot={false}
            activeDot={{ r: 4, fill: "#8b5cf6", stroke: "var(--bg-subtle)", strokeWidth: 2 }}
            animationDuration={800}
          />
          {/* Peak reference dot */}
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
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-blue-500 rounded-full" />
          <span className="text-xs text-[var(--text-muted)]">Total</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-violet-500 rounded-full" style={{ backgroundImage: "repeating-linear-gradient(90deg, #8b5cf6 0, #8b5cf6 4px, transparent 4px, transparent 7px)" }} />
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
