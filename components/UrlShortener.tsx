"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import ResultCard from "./ResultCard";
import { saveToRecent } from "./RecentLinks";
import type { ShortenResponse } from "@/app/types";

type Status = "idle" | "loading" | "success" | "error";

export default function UrlShortener() {
  const [url, setUrl] = useState("");
  const [alias, setAlias] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ShortenResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check auth state to conditionally show alias field
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setIsAuthed(!!data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsAuthed(!!session?.user);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const trimmed = url.trim();
    if (!trimmed) { inputRef.current?.focus(); return; }

    setStatus("loading");
    setResult(null);
    setErrorMessage("");

    try {
      const body: Record<string, string> = { longUrl: trimmed };
      if (isAuthed && alias.trim()) body.customAlias = alias.trim();

      const res = await fetch("/api/short", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data?.error ?? "Something went wrong. Please try again.");
        return;
      }

      setResult(data as ShortenResponse);
      setStatus("success");
      saveToRecent(data as ShortenResponse);
      window.dispatchEvent(new Event("linkshrink:saved"));
      setUrl("");
      setAlias("");
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please check your connection and try again.");
    }
  }

  const isLoading = status === "loading";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35, ease: "easeOut" }}
      className="w-full max-w-xl mx-auto space-y-4"
    >
      {/* Input form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        {/* URL input row */}
        <div className="gradient-border rounded-2xl">
          <div className="glass-card rounded-2xl p-2 flex items-center gap-2">
            <div className="flex-1 flex items-center gap-3 px-3">
              <svg className="flex-shrink-0 text-[var(--text-muted)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <input
                ref={inputRef}
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste your long URL here..."
                required
                disabled={isLoading}
                aria-label="Long URL to shorten"
                className="flex-1 bg-transparent py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none disabled:opacity-50"
              />
              <AnimatePresence>
                {url && !isLoading && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.15 }}
                    type="button"
                    onClick={() => { setUrl(""); setStatus("idle"); inputRef.current?.focus(); }}
                    aria-label="Clear input"
                    className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--bg-raised)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="2" y1="2" x2="10" y2="10" />
                      <line x1="10" y1="2" x2="2" y2="10" />
                    </svg>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              whileTap={!isLoading ? { scale: 0.95 } : undefined}
              type="submit"
              disabled={isLoading || !url.trim()}
              className="flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white text-sm font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:brightness-110 active:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Shrinking…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="13 17 18 12 13 7" />
                    <polyline points="6 17 11 12 6 7" />
                  </svg>
                  Shrink
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* Custom alias row (auth'd users only) */}
        <AnimatePresence>
          {isAuthed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="glass-card rounded-xl px-4 py-2.5 flex items-center gap-2">
                <svg className="flex-shrink-0 text-violet-500" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                <span className="text-xs text-[var(--text-muted)] flex-shrink-0">Custom alias</span>
                <input
                  type="text"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="my-brand (optional)"
                  disabled={isLoading}
                  maxLength={32}
                  pattern="[a-zA-Z0-9_\-]{3,32}"
                  aria-label="Custom alias"
                  className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none disabled:opacity-50"
                />
                <span className="text-xs px-1.5 py-0.5 rounded-md bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-medium flex-shrink-0">
                  Pro
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {/* Error message */}
      <AnimatePresence>
        {status === "error" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            role="alert"
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 text-sm text-red-600 dark:text-red-400"
          >
            <svg className="flex-shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result card */}
      <AnimatePresence>
        {status === "success" && result && <ResultCard result={result} />}
      </AnimatePresence>
    </motion.div>
  );
}
