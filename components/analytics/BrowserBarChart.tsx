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

interface Props {
  browsers: { browser: string; clicks: number }[];
}

const BAR_COLORS = ["#f59e0b", "#ef4444", "#6366f1", "#14b8a6", "#ec4899", "#f97316"];

function getBrowserEmoji(browser: string): string {
  const b = browser.toLowerCase();
  if (b.includes("chrome")) return "🌐";
  if (b.includes("firefox")) return "🦊";
  if (b.includes("safari")) return "🧭";
  if (b.includes("edge")) return "🔷";
  if (b.includes("opera")) return "🅾️";
  if (b.includes("samsung")) return "📱";
  return "🌐";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { browser, clicks, pct } = payload[0].payload;
  return (
    <div className="glass-card rounded-xl p-3 shadow-lg border border-[var(--border-default)] min-w-[130px]">
      <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">
        {getBrowserEmoji(browser)} {browser || "Unknown"}
      </p>
      <div className="flex items-center gap-1.5 text-xs">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: payload[0].fill }} />
        <span className="text-[var(--text-muted)]">Clicks:</span>
        <span className="font-bold text-[var(--text-primary)] tabular-nums">{clicks.toLocaleString()}</span>
        <span className="text-[var(--text-muted)]">({pct}%)</span>
      </div>
    </div>
  );
}

export default function BrowserBarChart({ browsers }: Props) {
  const chartData = useMemo(() => {
    const top = [...browsers].sort((a, b) => b.clicks - a.clicks).slice(0, 5);
    const total = top.reduce((s, b) => s + b.clicks, 0);
    return top.map((b) => ({
      ...b,
      pct: total > 0 ? Math.round((b.clicks / total) * 100) : 0,
      label: `${getBrowserEmoji(b.browser)} ${b.browser || "Unknown"}`,
    }));
  }, [browsers]);

  if (!chartData.length) {
    return (
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Browser Usage</h3>
        <p className="text-xs text-[var(--text-muted)] mt-0.5 mb-4">Top browsers used by visitors</p>
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
      transition={{ duration: 0.4, delay: 0.4 }}
      className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-5"
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Browser Usage</h3>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">Top browsers your visitors use</p>
      </div>

      <ResponsiveContainer width="100%" height={chartData.length * 38 + 8}>
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 0, right: 48, bottom: 0, left: 8 }}
          barCategoryGap="25%"
        >
          <CartesianGrid
            stroke="var(--border-default)"
            strokeDasharray="3 3"
            horizontal={false}
            strokeOpacity={0.4}
          />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--text-primary)" }}
            tickLine={false}
            axisLine={false}
            width={110}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--bg-raised)", opacity: 0.4 }} />
          <Bar dataKey="clicks" radius={[0, 4, 4, 0]} maxBarSize={18} animationDuration={700}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            label={{ position: "right", fontSize: 10, fill: "var(--text-muted)", formatter: (v: any) => typeof v === "number" ? `${v.toLocaleString()}` : String(v) }}
          >
            {chartData.map((entry, i) => (
              <Cell key={entry.browser} fill={BAR_COLORS[i % BAR_COLORS.length]} fillOpacity={0.9} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
