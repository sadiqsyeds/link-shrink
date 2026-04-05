"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ShortenResponse } from "@/app/types";

const STORAGE_KEY = "linkshrink_recent";
const MAX_RECENT = 5;

export function saveToRecent(entry: ShortenResponse): void {
  try {
    const existing: ShortenResponse[] = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "[]"
    );
    // Remove duplicate if same short URL already saved
    const filtered = existing.filter(
      (e) => e.shortUrl !== entry.shortUrl
    );
    const updated = [entry, ...filtered].slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage not available (SSR or private mode)
  }
}

export default function RecentLinks() {
  const [links, setLinks] = useState<ShortenResponse[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      setLinks(stored);
    } catch {
      setLinks([]);
    }
  }, []);

  // Listen for storage changes (e.g. new link saved from UrlShortener)
  useEffect(() => {
    function onStorage() {
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
        setLinks(stored);
      } catch {
        setLinks([]);
      }
    }
    window.addEventListener("linkshrink:saved", onStorage);
    return () => window.removeEventListener("linkshrink:saved", onStorage);
  }, []);

  async function copyLink(url: string, index: number) {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  function clearAll() {
    localStorage.removeItem(STORAGE_KEY);
    setLinks([]);
  }

  if (links.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="w-full max-w-xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)]">
          Recent links
        </h2>
        <button
          onClick={clearAll}
          className="text-xs text-[var(--text-muted)] hover:text-red-500 transition-colors duration-150"
        >
          Clear all
        </button>
      </div>

      {/* List */}
      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {links.map((link, i) => (
            <motion.li
              key={link.shortUrl}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12, height: 0 }}
              transition={{ duration: 0.22 }}
              className="flex items-center gap-3 bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-xl px-4 py-2.5"
            >
              {/* Short URL */}
              <a
                href={link.fullShortUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-sm text-blue-500 font-medium truncate hover:underline"
              >
                {link.fullShortUrl}
              </a>

              {/* Original URL (truncated) */}
              <span className="hidden sm:block text-xs text-[var(--text-muted)] truncate max-w-[180px]">
                {link.longUrl}
              </span>

              {/* Copy button */}
              <button
                onClick={() => copyLink(link.fullShortUrl, i)}
                aria-label="Copy link"
                className={`flex-shrink-0 p-1.5 rounded-lg transition-colors duration-150 ${
                  copiedIndex === i
                    ? "text-green-500"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {copiedIndex === i ? (
                  <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="2 6 5 9 10 3" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </motion.section>
  );
}
