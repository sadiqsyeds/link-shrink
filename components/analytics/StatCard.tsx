"use client";

import { motion } from "framer-motion";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; label: string } | null;
  color?: "blue" | "violet" | "emerald" | "amber" | "rose" | "cyan";
  delay?: number;
}

const COLOR_MAP = {
  blue:    { grad: "from-blue-500/15 to-blue-600/5",   border: "border-blue-500/20",   text: "text-blue-500",   icon: "bg-blue-500/10"   },
  violet:  { grad: "from-violet-500/15 to-violet-600/5", border: "border-violet-500/20", text: "text-violet-500", icon: "bg-violet-500/10" },
  emerald: { grad: "from-emerald-500/15 to-emerald-600/5", border: "border-emerald-500/20", text: "text-emerald-500", icon: "bg-emerald-500/10" },
  amber:   { grad: "from-amber-500/15 to-amber-600/5", border: "border-amber-500/20",   text: "text-amber-500",  icon: "bg-amber-500/10"  },
  rose:    { grad: "from-rose-500/15 to-rose-600/5",   border: "border-rose-500/20",    text: "text-rose-500",   icon: "bg-rose-500/10"   },
  cyan:    { grad: "from-cyan-500/15 to-cyan-600/5",   border: "border-cyan-500/20",    text: "text-cyan-500",   icon: "bg-cyan-500/10"   },
};

export default function StatCard({ label, value, icon, trend, color = "blue", delay = 0 }: StatCardProps) {
  const c = COLOR_MAP[color];
  const isPositive = trend ? trend.value >= 0 : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={`rounded-2xl p-5 bg-gradient-to-br ${c.grad} border ${c.border} relative overflow-hidden`}
    >
      {/* Background glow */}
      <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full ${c.icon} blur-2xl`} />

      <div className="relative">
        {/* Icon + label row */}
        <div className="flex items-center justify-between mb-3">
          <div className={`w-9 h-9 rounded-xl ${c.icon} flex items-center justify-center ${c.text}`}>
            {icon}
          </div>
          {trend !== null && trend !== undefined && (
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                isPositive
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-rose-500/10 text-rose-500"
              }`}
            >
              {isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
            </span>
          )}
        </div>

        {/* Value */}
        <p className={`text-2xl font-bold ${c.text} tabular-nums`}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>

        {/* Label */}
        <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">{label}</p>

        {/* Trend label */}
        {trend && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{trend.label}</p>
        )}
      </div>
    </motion.div>
  );
}
