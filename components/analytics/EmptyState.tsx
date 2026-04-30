"use client";

import { motion } from "framer-motion";
import { buildShortUrl } from "@/lib/utils";

interface Props {
  shortCode: string;
}

export default function EmptyState({ shortCode }: Props) {
  const shortUrl = buildShortUrl(shortCode);

  async function handleCopy() {
    await navigator.clipboard.writeText(shortUrl).catch(() => {});
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      {/* Illustration */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-blue-500/20 flex items-center justify-center mx-auto">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-blue-500"
          >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        {/* Decorative dots */}
        <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-violet-500/30 animate-pulse" />
        <div className="absolute -bottom-1 -left-1 w-3 h-3 rounded-full bg-blue-500/30 animate-pulse" style={{ animationDelay: "0.5s" }} />
      </div>

      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">
        No clicks yet
      </h3>
      <p className="text-sm text-[var(--text-muted)] max-w-xs mb-6 leading-relaxed">
        Share your link to start tracking clicks, countries, devices, and more in real time.
      </p>

      {/* Share prompt */}
      <div className="flex items-center gap-2 w-full max-w-sm">
        <div className="flex-1 bg-[var(--bg-raised)] rounded-xl px-3 py-2.5 text-xs text-blue-500 font-medium truncate border border-[var(--border-default)]">
          {shortUrl}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 active:scale-95 transition-all duration-150 flex-shrink-0"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copy
        </button>
      </div>

      <p className="text-xs text-[var(--text-muted)] mt-4">
        Analytics appear within seconds of the first click.
      </p>
    </motion.div>
  );
}
