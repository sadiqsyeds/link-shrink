"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { ShortenResponse } from "@/app/types";

interface ResultCardProps {
  result: ShortenResponse;
}

export default function ResultCard({ result }: ResultCardProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(result.fullShortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = result.fullShortUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="glass-card rounded-2xl p-5 space-y-4"
    >
      {/* Success header */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
          <svg
            width="10"
            height="10"
            viewBox="0 0 12 12"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="2 6 5 9 10 3" />
          </svg>
        </div>
        <span className="text-sm font-medium text-[var(--text-primary)]">
          Link shortened successfully!
        </span>
      </div>

      {/* Short URL display + copy button */}
      <div className="flex items-center gap-2 bg-[var(--bg-muted)] rounded-xl px-4 py-3">
        <a
          href={result.fullShortUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-blue-500 font-medium text-sm truncate hover:underline"
        >
          {result.fullShortUrl}
        </a>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={handleCopy}
          aria-label="Copy short URL"
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
            copied
              ? "bg-green-500 text-white"
              : "bg-[var(--bg-raised)] text-[var(--text-primary)] hover:bg-blue-500 hover:text-white"
          }`}
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="2 6 5 9 10 3" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy
            </>
          )}
        </motion.button>
      </div>

      {/* Original URL */}
      <div className="flex items-start gap-2 text-xs text-[var(--text-muted)]">
        <svg
          className="flex-shrink-0 mt-0.5"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <span className="truncate">Original: {result.longUrl}</span>
      </div>
    </motion.div>
  );
}
