"use client";

import { motion } from "framer-motion";
import type { ReferrerCategory } from "@/app/types";

interface ReferrerEntry {
  referrer: string;
  clicks: number;
  category: ReferrerCategory;
}

interface Props {
  referrers: ReferrerEntry[];
}

function ReferrerIcon({ referrer, category }: { referrer: string; category: ReferrerCategory }) {
  const r = referrer.toLowerCase();
  if (r.includes("google"))    return <span className="text-sm">🔍</span>;
  if (r.includes("bing"))      return <span className="text-sm">🔎</span>;
  if (r.includes("duckduck"))  return <span className="text-sm">🦆</span>;
  if (r.includes("twitter") || r.includes("x.com")) return <span className="text-sm">🐦</span>;
  if (r.includes("linkedin"))  return <span className="text-sm">💼</span>;
  if (r.includes("facebook"))  return <span className="text-sm">👤</span>;
  if (r.includes("reddit"))    return <span className="text-sm">🤖</span>;
  if (r.includes("youtube"))   return <span className="text-sm">▶️</span>;
  if (r.includes("instagram")) return <span className="text-sm">📷</span>;
  if (r.includes("whatsapp") || r.includes("telegram")) return <span className="text-sm">💬</span>;
  if (category === "direct")   return <span className="text-sm">🔗</span>;
  if (category === "search")   return <span className="text-sm">🔍</span>;
  if (category === "social")   return <span className="text-sm">📲</span>;
  return <span className="text-sm">🌐</span>;
}

const CATEGORY_META: Record<ReferrerCategory, { label: string; colorClass: string; bg: string }> = {
  direct: { label: "Direct",  colorClass: "text-blue-500",    bg: "bg-blue-500/10"    },
  search: { label: "Search",  colorClass: "text-amber-500",   bg: "bg-amber-500/10"   },
  social: { label: "Social",  colorClass: "text-violet-500",  bg: "bg-violet-500/10"  },
  other:  { label: "Other",   colorClass: "text-slate-400",   bg: "bg-slate-400/10"   },
};

// Group referrers by category and compute totals
function groupByCategory(referrers: ReferrerEntry[]) {
  const groups: Partial<Record<ReferrerCategory, { total: number; sources: ReferrerEntry[] }>> = {};
  for (const r of referrers) {
    if (!groups[r.category]) groups[r.category] = { total: 0, sources: [] };
    groups[r.category]!.total += r.clicks;
    groups[r.category]!.sources.push(r);
  }
  return groups;
}

export default function ReferrerList({ referrers }: Props) {
  if (!referrers.length) return null;

  const total = referrers.reduce((s, r) => s + r.clicks, 0);
  const groups = groupByCategory(referrers);
  const orderedCats: ReferrerCategory[] = ["direct", "social", "search", "other"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.45 }}
      className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base">🔗</span>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Traffic Sources</h3>
      </div>

      {/* Category summary pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {orderedCats.map((cat) => {
          const g = groups[cat];
          if (!g) return null;
          const meta = CATEGORY_META[cat];
          const pct = total > 0 ? Math.round((g.total / total) * 100) : 0;
          return (
            <div
              key={cat}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${meta.bg}`}
            >
              <span className={`text-xs font-semibold ${meta.colorClass}`}>{meta.label}</span>
              <span className={`text-xs ${meta.colorClass} opacity-80`}>{pct}%</span>
            </div>
          );
        })}
      </div>

      {/* Top referrers list */}
      <div className="space-y-1">
        {referrers.slice(0, 8).map((r, i) => {
          const pct = total > 0 ? Math.round((r.clicks / total) * 100) : 0;
          const meta = CATEGORY_META[r.category];
          const label = r.referrer === "direct" || !r.referrer ? "Direct / None" : r.referrer;

          return (
            <motion.div
              key={`${r.referrer}-${i}`}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.5 + i * 0.05 }}
              className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-[var(--bg-raised)] transition-colors"
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
                <ReferrerIcon referrer={r.referrer} category={r.category} />
              </div>
              <span className="text-xs text-[var(--text-primary)] flex-1 truncate font-medium">
                {label}
              </span>
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${meta.bg} ${meta.colorClass} flex-shrink-0`}>
                {pct}%
              </span>
              <span className="text-xs font-bold text-[var(--text-secondary)] w-10 text-right flex-shrink-0 tabular-nums">
                {r.clicks.toLocaleString()}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
