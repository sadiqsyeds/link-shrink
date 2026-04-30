"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ClickRow } from "@/app/types";

interface Props {
  linkId: string;
  initialClicks: ClickRow[];
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getFlag(country: string | null): string {
  if (!country) return "🌐";
  const name = country.toLowerCase().trim();
  if (/^[a-z]{2}$/.test(name)) {
    return name.toUpperCase().split("").map((c) =>
      String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)
    ).join("");
  }
  const map: Record<string, string> = {
    "united states": "🇺🇸", "united kingdom": "🇬🇧", "india": "🇮🇳",
    "germany": "🇩🇪", "france": "🇫🇷", "canada": "🇨🇦", "australia": "🇦🇺",
    "brazil": "🇧🇷", "japan": "🇯🇵", "china": "🇨🇳", "russia": "🇷🇺",
    "south korea": "🇰🇷", "italy": "🇮🇹", "spain": "🇪🇸", "mexico": "🇲🇽",
    "singapore": "🇸🇬", "indonesia": "🇮🇩", "netherlands": "🇳🇱",
  };
  return map[name] ?? "🌐";
}

function DeviceDot({ device }: { device: string | null }) {
  const d = (device ?? "").toLowerCase();
  if (d.includes("mobile") || d.includes("phone")) return <span title="Mobile">📱</span>;
  if (d.includes("tablet")) return <span title="Tablet">📟</span>;
  return <span title="Desktop">💻</span>;
}

export default function LiveActivity({ linkId, initialClicks }: Props) {
  const [clicks, setClicks] = useState<ClickRow[]>(initialClicks.slice(0, 10));
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track visible time-ago labels using a tick
  const [, setTick] = useState(0);

  // Refresh every 20 seconds
  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      setRefreshing(true);
      try {
        const res = await fetch(`/api/analytics/${linkId}`);
        if (res.ok) {
          const d = await res.json();
          if (d.recent_clicks) {
            setClicks(d.recent_clicks.slice(0, 10));
            setLastRefresh(new Date());
          }
        }
      } catch {
        // silent fail
      } finally {
        setRefreshing(false);
      }
    }, 20_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [linkId]);

  // Tick every 30s to refresh "time ago" labels
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  if (!clicks.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {/* Live pulse dot */}
          <div className="relative w-2 h-2">
            <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
            <div className="relative w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Recent Activity</h3>
          <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-raised)] px-2 py-0.5 rounded-full">
            Live · 20s
          </span>
        </div>
        <div className="flex items-center gap-2">
          {refreshing && (
            <svg className="animate-spin text-blue-500 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          )}
          <span className="text-xs text-[var(--text-muted)]">
            Updated {timeAgo(lastRefresh.toISOString())}
          </span>
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {clicks.map((click, i) => (
            <motion.div
              key={click.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border-default)] hover:border-blue-500/20 transition-colors"
            >
              {/* Flag + device */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-base leading-none">{getFlag(click.country)}</span>
                <span className="text-sm"><DeviceDot device={click.device} /></span>
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-medium text-[var(--text-primary)]">
                    {click.country || "Unknown"}
                  </span>
                  {click.device && (
                    <span className="text-xs text-[var(--text-muted)]">· {click.device}</span>
                  )}
                  {click.browser && (
                    <span className="text-xs text-[var(--text-muted)]">· {click.browser}</span>
                  )}
                </div>
                {click.referrer && click.referrer !== "direct" && (
                  <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                    via {click.referrer}
                  </p>
                )}
              </div>

              {/* Time */}
              <span className="text-xs text-[var(--text-muted)] flex-shrink-0 tabular-nums">
                {timeAgo(click.created_at)}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
