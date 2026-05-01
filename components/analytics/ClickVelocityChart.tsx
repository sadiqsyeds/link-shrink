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
  ReferenceLine,
} from "recharts";
import type { AnalyticsSummary } from "@/app/types";

interface Props {
  data: AnalyticsSummary;
}

/**
 * Builds time-bucketed velocity data.
 * - If hourly data is available: show last 48h as hourly buckets.
 * - Otherwise: use recent_clicks to compute per-minute buckets (last N clicks).
 */
function buildVelocityData(
  data: AnalyticsSummary
): { label: string; clicks: number; ts: number }[] {
  if (data.granularity === "hour" && data.clicks_over_time.length > 0) {
    // Use last 24h of hourly buckets
    const now = Date.now();
    return data.clicks_over_time
      .filter((row) => new Date(row.bucket).getTime() >= now - 24 * 60 * 60 * 1000)
      .slice(-24)
      .map((row) => {
        const d = new Date(row.bucket);
        return {
          ts: d.getTime(),
          label: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          clicks: row.total_clicks,
        };
      });
  }

  // Fall back: bucket recent clicks by 5-minute windows
  const clicks = [...data.recent_clicks].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  if (clicks.length < 2) return [];

  const WINDOW_MS = 5 * 60 * 1000; // 5-minute buckets
  const start = new Date(clicks[0].created_at).getTime();
  const end = new Date(clicks[clicks.length - 1].created_at).getTime();
  const buckets: { ts: number; clicks: number; label: string }[] = [];

  for (let t = start; t <= end + WINDOW_MS; t += WINDOW_MS) {
    const count = clicks.filter((c) => {
      const ct = new Date(c.created_at).getTime();
      return ct >= t && ct < t + WINDOW_MS;
    }).length;
    const d = new Date(t);
    buckets.push({
      ts: t,
      label: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      clicks: count,
    });
  }

  return buckets.slice(-20); // max 20 points
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-xl p-3 shadow-lg border border-[var(--border-default)] min-w-[130px]">
      <p className="text-xs text-[var(--text-muted)] mb-1.5">{label}</p>
      <div className="flex items-center gap-2 text-xs">
        <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
        <span className="text-[var(--text-secondary)]">Clicks:</span>
        <span className="font-bold text-[var(--text-primary)] tabular-nums">
          {payload[0].value.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

export default function ClickVelocityChart({ data }: Props) {
  const chartData = useMemo(() => buildVelocityData(data), [data]);

  const avg = useMemo(() => {
    if (!chartData.length) return 0;
    return chartData.reduce((s, d) => s + d.clicks, 0) / chartData.length;
  }, [chartData]);

  const peak = useMemo(
    () => chartData.reduce<(typeof chartData)[0] | null>((m, d) => (!m || d.clicks > m.clicks ? d : m), null),
    [chartData]
  );

  const hasData = chartData.some((d) => d.clicks > 0);

  if (!hasData) {
    return (
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Click Velocity</h3>
        <p className="text-xs text-[var(--text-muted)] mt-0.5 mb-4">Traffic bursts &amp; spikes</p>
        <div className="h-44 flex items-center justify-center text-sm text-[var(--text-muted)]">
          Not enough data yet
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.45 }}
      className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-5"
    >
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Click Velocity</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Traffic bursts &amp; spikes over time</p>
        </div>
        {peak && peak.clicks > 0 && (
          <div className="flex-shrink-0 text-right">
            <p className="text-xs text-[var(--text-muted)]">Peak burst</p>
            <p className="text-sm font-bold text-emerald-500 tabular-nums">{peak.clicks} clicks</p>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={chartData} margin={{ top: 6, right: 4, bottom: 0, left: -28 }}>
          <defs>
            <linearGradient id="cvGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="var(--border-default)"
            strokeDasharray="3 3"
            vertical={false}
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: "var(--text-muted)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 9, fill: "var(--text-muted)" }}
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--border-default)", strokeWidth: 1 }} />
          {/* Average reference line */}
          {avg > 0 && (
            <ReferenceLine
              y={avg}
              stroke="#6b7280"
              strokeDasharray="4 3"
              strokeWidth={1}
              label={{ value: "avg", position: "right", fontSize: 9, fill: "#6b7280" }}
            />
          )}
          <Area
            type="monotone"
            dataKey="clicks"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#cvGrad)"
            dot={false}
            activeDot={{ r: 5, fill: "#10b981", stroke: "var(--bg-subtle)", strokeWidth: 2 }}
            animationDuration={900}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-4 mt-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-emerald-500 rounded-full" />
          <span className="text-xs text-[var(--text-muted)]">Clicks / interval</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded-full" style={{ backgroundImage: "repeating-linear-gradient(90deg,#6b7280 0,#6b7280 4px,transparent 4px,transparent 7px)" }} />
          <span className="text-xs text-[var(--text-muted)]">Average</span>
        </div>
      </div>
    </motion.div>
  );
}
