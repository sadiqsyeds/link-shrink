"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LinkRow } from "@/app/types";
import { buildShortUrl } from "@/lib/utils";
import AnalyticsPanel from "./AnalyticsPanel";

interface Props {
  links: LinkRow[];
}

export default function DashboardClient({ links }: Props) {
  const [selectedLink, setSelectedLink] = useState<LinkRow | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleCopy(link: LinkRow) {
    const url = buildShortUrl(link.short_code);
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (links.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-12 flex flex-col items-center gap-3 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[var(--bg-raised)] flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </div>
        <p className="text-sm font-medium text-[var(--text-primary)]">No links yet</p>
        <p className="text-xs text-[var(--text-muted)]">Shorten a URL from the home page — it will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Total Links" value={links.length} />
        <StatCard label="Total Clicks" value={links.reduce((s, l) => s + (l.click_count ?? 0), 0)} />
        <StatCard label="Custom Aliases" value={links.filter((l) => l.custom_alias).length} className="col-span-2 sm:col-span-1" />
      </div>

      {/* Links table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-default)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Your Links</h2>
        </div>
        <div className="divide-y divide-[var(--border-default)]">
          {links.map((link) => (
            <motion.div
              key={link.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 px-5 py-4 hover:bg-[var(--bg-subtle)] transition-colors"
            >
              {/* Short URL */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <a
                    href={buildShortUrl(link.short_code)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-blue-500 hover:underline truncate"
                  >
                    {buildShortUrl(link.short_code)}
                  </a>
                  {link.custom_alias && (
                    <span className="text-xs px-1.5 py-0.5 rounded-md bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-medium">
                      custom
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{link.long_url}</p>
              </div>

              {/* Click count */}
              <div className="hidden sm:flex flex-col items-center px-4">
                <span className="text-sm font-bold text-[var(--text-primary)]">{link.click_count ?? 0}</span>
                <span className="text-xs text-[var(--text-muted)]">clicks</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Copy */}
                <button
                  onClick={() => handleCopy(link)}
                  aria-label="Copy short URL"
                  className={`p-2 rounded-lg text-xs transition-all duration-200 ${
                    copiedId === link.id
                      ? "bg-green-500 text-white"
                      : "bg-[var(--bg-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {copiedId === link.id ? (
                    <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 6 5 9 10 3" /></svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                  )}
                </button>

                {/* Analytics */}
                <button
                  onClick={() => setSelectedLink(selectedLink?.id === link.id ? null : link)}
                  aria-label="View analytics"
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    selectedLink?.id === link.id
                      ? "bg-blue-500 text-white"
                      : "bg-[var(--bg-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Analytics panel */}
      <AnimatePresence>
        {selectedLink && (
          <motion.div
            key={selectedLink.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.3 }}
          >
            <AnalyticsPanel link={selectedLink} onClose={() => setSelectedLink(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, className = "" }: { label: string; value: number; className?: string }) {
  return (
    <div className={`glass-card rounded-2xl p-5 ${className}`}>
      <p className="text-2xl font-bold text-[var(--text-primary)]">{value.toLocaleString()}</p>
      <p className="text-xs text-[var(--text-muted)] mt-1">{label}</p>
    </div>
  );
}
