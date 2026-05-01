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
  Cell,
} from "recharts";

interface Props {
  countries: { country: string; clicks: number }[];
}

// ISO 2-letter code → flag emoji
function getFlag(country: string): string {
  const name = country.toLowerCase().trim();
  if (!name || name === "unknown") return "🌐";
  if (/^[a-z]{2}$/.test(name)) {
    return name
      .toUpperCase()
      .split("")
      .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
      .join("");
  }
  const map: Record<string, string> = {
    "united states": "🇺🇸", "united kingdom": "🇬🇧", "india": "🇮🇳",
    "germany": "🇩🇪", "france": "🇫🇷", "canada": "🇨🇦", "australia": "🇦🇺",
    "brazil": "🇧🇷", "japan": "🇯🇵", "china": "🇨🇳", "russia": "🇷🇺",
    "south korea": "🇰🇷", "italy": "🇮🇹", "spain": "🇪🇸", "mexico": "🇲🇽",
    "netherlands": "🇳🇱", "sweden": "🇸🇪", "singapore": "🇸🇬",
    "malaysia": "🇲🇾", "indonesia": "🇮🇩", "pakistan": "🇵🇰",
    "saudi arabia": "🇸🇦", "uae": "🇦🇪", "united arab emirates": "🇦🇪",
  };
  return map[name] ?? "🌐";
}

const BAR_COLORS = ["#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#f43f5e", "#f97316", "#eab308"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { country, clicks, pct } = payload[0].payload;
  return (
    <div className="glass-card rounded-xl p-3 shadow-lg border border-[var(--border-default)] min-w-[140px]">
      <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">
        {getFlag(country)} {country || "Unknown"}
      </p>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-[var(--text-muted)]">Clicks:</span>
        <span className="font-bold text-[var(--text-primary)] tabular-nums">{clicks.toLocaleString()}</span>
        <span className="text-[var(--text-muted)]">({pct}%)</span>
      </div>
    </div>
  );
}

export default function CountryBarChart({ countries }: Props) {
  const chartData = useMemo(() => {
    const top = [...countries].sort((a, b) => b.clicks - a.clicks).slice(0, 8);
    const total = top.reduce((s, c) => s + c.clicks, 0);
    return top.map((c) => ({
      ...c,
      pct: total > 0 ? Math.round((c.clicks / total) * 100) : 0,
      label: `${getFlag(c.country)} ${c.country || "Unknown"}`,
    }));
  }, [countries]);

  if (!chartData.length) {
    return (
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Top Countries</h3>
        <p className="text-xs text-[var(--text-muted)] mt-0.5 mb-4">Geographic distribution</p>
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
      transition={{ duration: 0.4, delay: 0.3 }}
      className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-5"
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Top Countries</h3>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">Geographic distribution of clicks</p>
      </div>

      <ResponsiveContainer width="100%" height={chartData.length * 34 + 8}>
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 0, right: 48, bottom: 0, left: 8 }}
          barCategoryGap="25%"
        >
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
            label={{ position: "right", fontSize: 10, fill: "var(--text-muted)", formatter: (v: any) => typeof v === "number" ? v.toLocaleString() : String(v) }}
          >
            {chartData.map((entry, i) => (
              <Cell key={entry.country} fill={BAR_COLORS[i % BAR_COLORS.length]} fillOpacity={0.9} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
