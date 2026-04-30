"use client";

import { motion } from "framer-motion";

interface GeoEntry {
  country: string;
  clicks: number;
}

interface Props {
  countries: GeoEntry[];
}

// Map country names/codes to flag emojis
function getFlag(country: string): string {
  const name = country.toLowerCase().trim();
  if (!name || name === "unknown") return "🌐";

  // ISO 2-letter code → flag
  if (/^[a-z]{2}$/.test(name)) {
    return name
      .toUpperCase()
      .split("")
      .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
      .join("");
  }

  // Common country names
  const map: Record<string, string> = {
    "united states": "🇺🇸", "united kingdom": "🇬🇧", "india": "🇮🇳",
    "germany": "🇩🇪", "france": "🇫🇷", "canada": "🇨🇦", "australia": "🇦🇺",
    "brazil": "🇧🇷", "japan": "🇯🇵", "china": "🇨🇳", "russia": "🇷🇺",
    "south korea": "🇰🇷", "italy": "🇮🇹", "spain": "🇪🇸", "mexico": "🇲🇽",
    "netherlands": "🇳🇱", "sweden": "🇸🇪", "norway": "🇳🇴", "finland": "🇫🇮",
    "denmark": "🇩🇰", "poland": "🇵🇱", "turkey": "🇹🇷", "indonesia": "🇮🇩",
    "pakistan": "🇵🇰", "bangladesh": "🇧🇩", "nigeria": "🇳🇬", "egypt": "🇪🇬",
    "argentina": "🇦🇷", "colombia": "🇨🇴", "south africa": "🇿🇦", "singapore": "🇸🇬",
    "malaysia": "🇲🇾", "thailand": "🇹🇭", "vietnam": "🇻🇳", "philippines": "🇵🇭",
    "saudi arabia": "🇸🇦", "uae": "🇦🇪", "united arab emirates": "🇦🇪",
    "israel": "🇮🇱", "ukraine": "🇺🇦", "switzerland": "🇨🇭", "belgium": "🇧🇪",
    "austria": "🇦🇹", "portugal": "🇵🇹", "greece": "🇬🇷", "czech republic": "🇨🇿",
    "romania": "🇷🇴", "hungary": "🇭🇺", "new zealand": "🇳🇿", "ireland": "🇮🇪",
  };
  return map[name] ?? "🌐";
}

const COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-cyan-500",
  "bg-emerald-500", "bg-amber-500", "bg-rose-500",
  "bg-pink-500", "bg-indigo-500",
];

export default function GeoList({ countries }: Props) {
  if (!countries.length) return null;
  const max = countries[0].clicks;
  const total = countries.reduce((s, c) => s + c.clicks, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base">🌍</span>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Top Countries</h3>
      </div>

      <div className="space-y-3">
        {countries.slice(0, 8).map((c, i) => {
          const pct = total > 0 ? Math.round((c.clicks / total) * 100) : 0;
          const barPct = max > 0 ? (c.clicks / max) * 100 : 0;

          return (
            <motion.div
              key={c.country}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.35 + i * 0.05 }}
              className="group"
            >
              <div className="flex items-center gap-2.5 mb-1">
                <span className="text-base leading-none w-5 text-center flex-shrink-0">
                  {getFlag(c.country)}
                </span>
                <span className="text-xs font-medium text-[var(--text-primary)] flex-1 truncate">
                  {c.country || "Unknown"}
                </span>
                <span className="text-xs text-[var(--text-muted)] flex-shrink-0 tabular-nums">
                  {c.clicks.toLocaleString()}
                </span>
                <span className="text-xs font-semibold text-[var(--text-secondary)] flex-shrink-0 w-9 text-right tabular-nums">
                  {pct}%
                </span>
              </div>
              <div className="h-1.5 bg-[var(--bg-raised)] rounded-full overflow-hidden ml-7">
                <motion.div
                  className={`h-full rounded-full ${COLORS[i % COLORS.length]}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${barPct}%` }}
                  transition={{ duration: 0.6, delay: 0.4 + i * 0.05, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
