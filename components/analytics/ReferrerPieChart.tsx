"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { ReferrerCategory } from "@/app/types";

interface ReferrerEntry {
  referrer: string;
  clicks: number;
  category: ReferrerCategory;
}

interface Props {
  referrers: ReferrerEntry[];
}

const CATEGORY_COLORS: Record<ReferrerCategory, string> = {
  direct: "#3b82f6",
  social: "#a855f7",
  search: "#10b981",
  other:  "#f59e0b",
};

const CATEGORY_LABELS: Record<ReferrerCategory, string> = {
  direct: "Direct",
  social: "Social",
  search: "Search",
  other:  "Other",
};

const CATEGORY_ICONS: Record<ReferrerCategory, string> = {
  direct: "🔗",
  social: "📣",
  search: "🔍",
  other:  "🌐",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { name, value, pct } = payload[0].payload;
  return (
    <div className="glass-card rounded-xl p-3 shadow-lg border border-[var(--border-default)] min-w-[130px]">
      <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">
        {CATEGORY_ICONS[name as ReferrerCategory] ?? "🌐"} {CATEGORY_LABELS[name as ReferrerCategory] ?? name}
      </p>
      <div className="flex items-center gap-1.5 text-xs">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: payload[0].fill }} />
        <span className="text-[var(--text-muted)]">Clicks:</span>
        <span className="font-bold text-[var(--text-primary)] tabular-nums">{value.toLocaleString()}</span>
        <span className="text-[var(--text-muted)]">({pct}%)</span>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, pct }: any) {
  if (pct < 6) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
      {pct}%
    </text>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomLegend({ payload }: any) {
  if (!payload?.length) return null;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5 justify-center mt-2">
      {payload.map((entry: { color: string; value: ReferrerCategory; payload: { pct: number } }, i: number) => (
        <div key={i} className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />
          <span className="text-xs text-[var(--text-secondary)]">
            {CATEGORY_ICONS[entry.value] ?? "🌐"} {CATEGORY_LABELS[entry.value] ?? entry.value}
          </span>
          <span className="text-xs text-[var(--text-muted)] tabular-nums">({entry.payload.pct}%)</span>
        </div>
      ))}
    </div>
  );
}

export default function ReferrerPieChart({ referrers }: Props) {
  const chartData = useMemo(() => {
    // Aggregate by category on the client
    const agg = new Map<ReferrerCategory, number>();
    for (const r of referrers) {
      agg.set(r.category, (agg.get(r.category) ?? 0) + r.clicks);
    }
    const total = Array.from(agg.values()).reduce((s, v) => s + v, 0);
    return Array.from(agg.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category, clicks]) => ({
        name: category,
        value: clicks,
        pct: total > 0 ? Math.round((clicks / total) * 100) : 0,
      }));
  }, [referrers]);

  if (!chartData.length) {
    return (
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Referrer Sources</h3>
        <p className="text-xs text-[var(--text-muted)] mt-0.5 mb-4">Where your traffic comes from</p>
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
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Referrer Sources</h3>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">Where your visitors come from</p>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={82}
            paddingAngle={3}
            dataKey="value"
            labelLine={false}
            label={renderCustomLabel}
            animationBegin={0}
            animationDuration={800}
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.name}
                fill={CATEGORY_COLORS[entry.name as ReferrerCategory] ?? "#94a3b8"}
                stroke="var(--bg-subtle)"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
