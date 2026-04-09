"use client";

import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import type { LinkRow, AnalyticsSummary } from "@/app/types";

const COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#22c55e", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6"];

interface Props {
  link: LinkRow;
  onClose: () => void;
}

export default function AnalyticsPanel({ link, onClose }: Props) {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/analytics/${link.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d as AnalyticsSummary);
      })
      .catch(() => setError("Failed to load analytics."))
      .finally(() => setLoading(false));
  }, [link.id]);

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-default)]">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Analytics</h2>
          <p className="text-xs text-[var(--text-muted)] truncate">{link.long_url}</p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 ml-3 p-1.5 rounded-lg bg-[var(--bg-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          aria-label="Close analytics"
        >
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="2" y1="2" x2="10" y2="10" /><line x1="10" y1="2" x2="2" y2="10" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="p-5">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin text-blue-500" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          </div>
        )}

        {error && (
          <div className="py-8 text-center text-sm text-red-500">{error}</div>
        )}

        {!loading && !error && data && (
          <div className="space-y-8">
            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-4">
              <KpiCard label="Total Clicks" value={data.total_clicks} color="blue" />
              <KpiCard label="Unique Visitors" value={data.unique_clicks} color="violet" />
            </div>

            {/* Clicks over time */}
            {data.clicks_over_time.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold text-[var(--text-secondary)] mb-3 uppercase tracking-wide">Clicks over time (30d)</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={data.clicks_over_time} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--text-muted)" }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: "var(--bg-raised)", border: "1px solid var(--border-default)", borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: "var(--text-primary)" }}
                    />
                    <Line type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </section>
            )}

            {/* Device + Browser row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {data.device_breakdown.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-[var(--text-secondary)] mb-3 uppercase tracking-wide">Devices</h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={data.device_breakdown} dataKey="clicks" nameKey="device" cx="50%" cy="50%" outerRadius={60} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                        {data.device_breakdown.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "var(--bg-raised)", border: "1px solid var(--border-default)", borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </section>
              )}

              {data.browser_breakdown.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-[var(--text-secondary)] mb-3 uppercase tracking-wide">Browsers</h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={data.browser_breakdown.slice(0, 6)} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <XAxis dataKey="browser" tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                      <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: "var(--bg-raised)", border: "1px solid var(--border-default)", borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="clicks" radius={[4, 4, 0, 0]}>
                        {data.browser_breakdown.slice(0, 6).map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </section>
              )}
            </div>

            {/* Top countries */}
            {data.top_countries.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold text-[var(--text-secondary)] mb-3 uppercase tracking-wide">Top Countries</h3>
                <div className="space-y-2">
                  {data.top_countries.slice(0, 8).map((c, i) => {
                    const max = data.top_countries[0].clicks;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-[var(--text-muted)] w-24 truncate">{c.country || "Unknown"}</span>
                        <div className="flex-1 bg-[var(--bg-raised)] rounded-full h-1.5 overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(c.clicks / max) * 100}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-[var(--text-primary)] w-8 text-right">{c.clicks}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Top referrers */}
            {data.top_referrers.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold text-[var(--text-secondary)] mb-3 uppercase tracking-wide">Top Referrers</h3>
                <div className="space-y-2">
                  {data.top_referrers.slice(0, 6).map((r, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-[var(--text-muted)] truncate flex-1">{r.referrer || "Direct"}</span>
                      <span className="font-semibold text-[var(--text-primary)] flex-shrink-0">{r.clicks}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Recent clicks */}
            {data.recent_clicks.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold text-[var(--text-secondary)] mb-3 uppercase tracking-wide">Recent Clicks</h3>
                <div className="overflow-x-auto rounded-xl border border-[var(--border-default)]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[var(--bg-subtle)] border-b border-[var(--border-default)]">
                        {["Time", "Country", "Device", "Browser", "OS"].map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-default)]">
                      {data.recent_clicks.map((c) => (
                        <tr key={c.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                          <td className="px-3 py-2 text-[var(--text-muted)]">{new Date(c.created_at).toLocaleString()}</td>
                          <td className="px-3 py-2 text-[var(--text-primary)]">{c.country || "—"}</td>
                          <td className="px-3 py-2 text-[var(--text-primary)]">{c.device || "—"}</td>
                          <td className="px-3 py-2 text-[var(--text-primary)]">{c.browser || "—"}</td>
                          <td className="px-3 py-2 text-[var(--text-primary)]">{c.os || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {data.total_clicks === 0 && (
              <p className="text-center text-sm text-[var(--text-muted)] py-6">No clicks recorded yet. Share your link to start tracking!</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: number; color: "blue" | "violet" }) {
  const gradient = color === "blue"
    ? "from-blue-500/10 to-blue-500/5 border-blue-500/20"
    : "from-violet-500/10 to-violet-500/5 border-violet-500/20";
  const text = color === "blue" ? "text-blue-500" : "text-violet-500";
  return (
    <div className={`rounded-2xl p-5 bg-gradient-to-br border ${gradient}`}>
      <p className={`text-2xl font-bold ${text}`}>{value.toLocaleString()}</p>
      <p className="text-xs text-[var(--text-muted)] mt-1">{label}</p>
    </div>
  );
}
