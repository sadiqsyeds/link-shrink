"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import type { AnalyticsSummary } from "@/app/types";

interface Props {
  data: AnalyticsSummary;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const hour = Number(label);
  const suffix = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return (
    <div className="glass-card rounded-xl p-3 shadow-lg border border-[var(--border-default)] min-w-[130px]">
      <p className="text-xs text-[var(--text-muted)] mb-2">
        {h12}:00 – {h12}:59 {suffix}
      </p>
      <div className="flex items-center gap-2 text-xs">
        <div className="w-2 h-2 rounded-full bg-cyan-500 flex-shrink-0" />
        <span className="text-[var(--text-secondary)]">Clicks:</span>
        <span className="font-bold text-[var(--text-primary)] tabular-nums">
          {payload[0].value.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

/** Build a 24-slot hourly distribution from hourly buckets or recent clicks. */
function buildHourlyData(data: AnalyticsSummary): { hour: number; clicks: number }[] {
  const slots = Array.from({ length: 24 }, (_, i) => ({ hour: i, clicks: 0 }));

  if (data.granularity === "hour" && data.clicks_over_time.length > 0) {
    // Use aggregated hourly buckets
    for (const row of data.clicks_over_time) {
      const h = new Date(row.bucket).getHours();
      slots[h].clicks += row.total_clicks;
    }
  } else {
    // Fall back: derive from recent_clicks timestamps
    for (const click of data.recent_clicks) {
      const ts = click.created_at ?? (click as { timestamp?: string }).timestamp;
      if (!ts) continue;
      const h = new Date(ts).getHours();
      if (h >= 0 && h < 24) slots[h].clicks += 1;
    }
  }

  return slots;
}

export default function HourlyBarChart({ data }: Props) {
  const chartData = useMemo(() => buildHourlyData(data), [data]);

  const peakHour = useMemo(
    () => chartData.reduce((max, d) => (d.clicks > max.clicks ? d : max), chartData[0]),
    [chartData]
  );

  const hasData = chartData.some((d) => d.clicks > 0);

  if (!hasData) {
    return (
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Hourly Activity</h3>
        <p className="text-xs text-[var(--text-muted)] mt-0.5 mb-4">When are visitors most active?</p>
        <div className="h-44 flex items-center justify-center text-sm text-[var(--text-muted)]">
          Not enough data yet
        </div>
      </div>
    );
  }

  const formatHour = (h: number) => {
    if (h === 0) return "12a";
    if (h === 12) return "12p";
    return h > 12 ? `${h - 12}p` : `${h}a`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-5"
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Hourly Activity</h3>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Peak activity at{" "}
          <span className="text-cyan-500 font-semibold">
            {formatHour(peakHour.hour).toUpperCase()}
          </span>{" "}
          · {peakHour.clicks} clicks
        </p>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -28 }} barCategoryGap="20%">
          <CartesianGrid
            stroke="var(--border-default)"
            strokeDasharray="3 3"
            vertical={false}
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="hour"
            tickFormatter={formatHour}
            tick={{ fontSize: 9, fill: "var(--text-muted)" }}
            tickLine={false}
            axisLine={false}
            interval={2}
          />
          <YAxis
            tick={{ fontSize: 9, fill: "var(--text-muted)" }}
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--bg-raised)", opacity: 0.5 }} />
          <Bar dataKey="clicks" radius={[3, 3, 0, 0]} maxBarSize={24} animationDuration={800}>
            {chartData.map((entry) => (
              <Cell
                key={entry.hour}
                fill={entry.hour === peakHour.hour ? "#06b6d4" : "#0891b2"}
                fillOpacity={entry.hour === peakHour.hour ? 1 : 0.55}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className="text-xs text-[var(--text-muted)] mt-2 text-center">
        Hour of day (local time)
      </p>
    </motion.div>
  );
}
