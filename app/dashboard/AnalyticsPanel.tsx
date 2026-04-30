"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { LinkRow, AnalyticsSummary, AnalyticsGranularity } from "@/app/types";
import { buildShortUrl } from "@/lib/utils";

import StatCard from "@/components/analytics/StatCard";
import ChartContainer from "@/components/analytics/ChartContainer";
import GeoList from "@/components/analytics/GeoList";
import DeviceBreakdown from "@/components/analytics/DeviceBreakdown";
import ReferrerList from "@/components/analytics/ReferrerList";
import LiveActivity from "@/components/analytics/LiveActivity";
import AnalyticsSkeleton from "@/components/analytics/AnalyticsSkeleton";
import EmptyState from "@/components/analytics/EmptyState";

interface Props {
  link: LinkRow;
  onClose: () => void;
}

/* ── KPI helpers ─────────────────────────────────────────────────────────── */

/** Clicks recorded today (UTC day) */
function clicksToday(data: AnalyticsSummary): number {
  const todayPrefix = new Date().toISOString().slice(0, 10);
  return data.clicks_over_time
    .filter((b) => b.bucket.startsWith(todayPrefix))
    .reduce((s, b) => s + b.total_clicks, 0);
}

/** Clicks recorded yesterday (UTC day) */
function clicksYesterday(data: AnalyticsSummary): number {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  const prefix = d.toISOString().slice(0, 10);
  return data.clicks_over_time
    .filter((b) => b.bucket.startsWith(prefix))
    .reduce((s, b) => s + b.total_clicks, 0);
}

/** Growth % (today vs yesterday). Returns null when there's no yesterday data. */
function growthPct(today: number, yesterday: number): number | null {
  if (yesterday === 0) return today > 0 ? 100 : null;
  return Math.round(((today - yesterday) / yesterday) * 100);
}

/* ── Icons (inline SVG — no icon lib) ────────────────────────────────────── */

const IconClicks = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);
const IconUnique = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const IconToday = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const IconGrowth = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

/* ── Main component ──────────────────────────────────────────────────────── */

export default function AnalyticsPanel({ link, onClose }: Props) {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [granularity, setGranularity] = useState<AnalyticsGranularity>("day");
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(
    async (gran: AnalyticsGranularity) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/analytics/${link.id}?granularity=${gran}`);
        const json = await res.json();
        if (json.error) setError(json.error);
        else setData(json as AnalyticsSummary);
      } catch {
        setError("Failed to load analytics.");
      } finally {
        setLoading(false);
      }
    },
    [link.id]
  );

  useEffect(() => {
    fetchData(granularity);
  }, [fetchData, granularity]);

  async function handleCopy() {
    await navigator.clipboard.writeText(buildShortUrl(link.short_code)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleGranularityChange(g: AnalyticsGranularity) {
    setGranularity(g);
  }

  /* ─── Derived KPI values ─── */
  const today = data ? clicksToday(data) : 0;
  const yesterday = data ? clicksYesterday(data) : 0;
  const growth = data ? growthPct(today, yesterday) : null;

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* ── Panel Header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Analytics</h2>
            {data?.cached && (
              <span className="text-xs px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 font-medium">cached</span>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{link.long_url}</p>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
          {/* Copy link */}
          <button
            onClick={handleCopy}
            aria-label="Copy short URL"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              copied
                ? "bg-emerald-500 text-white"
                : "bg-[var(--bg-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {copied ? (
              <>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 6 5 9 10 3" /></svg>
                Copied
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                Copy
              </>
            )}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[var(--bg-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Close analytics"
          >
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="2" y1="2" x2="10" y2="10" /><line x1="10" y1="2" x2="2" y2="10" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="p-5">
        {/* Loading skeleton */}
        {loading && <AnalyticsSkeleton />}

        {/* Error state */}
        {!loading && error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-12 text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Failed to load</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">{error}</p>
            <button
              onClick={() => fetchData(granularity)}
              className="mt-4 px-4 py-2 rounded-xl bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition-colors"
            >
              Retry
            </button>
          </motion.div>
        )}

        {/* Data loaded */}
        {!loading && !error && data && (
          <div className="space-y-5">

            {/* ── 1. KPI Row ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                label="Total Clicks"
                value={data.total_clicks}
                icon={<IconClicks />}
                color="blue"
                delay={0}
              />
              <StatCard
                label="Unique Visitors"
                value={data.unique_clicks}
                icon={<IconUnique />}
                color="violet"
                delay={0.07}
              />
              <StatCard
                label="Clicks Today"
                value={today}
                icon={<IconToday />}
                color="cyan"
                delay={0.14}
              />
              <StatCard
                label="vs Yesterday"
                value={growth !== null ? `${growth > 0 ? "+" : ""}${growth}%` : "—"}
                icon={<IconGrowth />}
                color={growth !== null && growth >= 0 ? "emerald" : "rose"}
                trend={
                  growth !== null
                    ? { value: growth, label: `${yesterday} clicks yesterday` }
                    : null
                }
                delay={0.21}
              />
            </div>

            {/* ── Empty state (no clicks at all) ── */}
            {data.total_clicks === 0 && (
              <EmptyState shortCode={link.short_code} />
            )}

            {/* ── Content shown only when there are clicks ── */}
            {data.total_clicks > 0 && (
              <>
                {/* ── 2. Time-series chart ── */}
                <ChartContainer
                  data={data}
                  granularity={granularity}
                  onGranularityChange={handleGranularityChange}
                />

                {/* ── 3. Geo + Devices row ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <GeoList countries={data.top_countries} />
                  <DeviceBreakdown
                    devices={data.device_breakdown}
                    browsers={data.browser_breakdown}
                  />
                </div>

                {/* ── 4. Referrers + Live Activity row ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <ReferrerList referrers={data.top_referrers} />
                  <LiveActivity linkId={link.id} initialClicks={data.recent_clicks} />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
