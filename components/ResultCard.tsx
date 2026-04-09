"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeCanvas } from "qrcode.react";
import type { ShortenResponse } from "@/app/types";

interface ResultCardProps {
  result: ShortenResponse;
}

export default function ResultCard({ result }: ResultCardProps) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [shareTooltip, setShareTooltip] = useState("");
  const qrRef = useRef<HTMLDivElement>(null);

  // Copy short URL to clipboard
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(result.fullShortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
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

  // Download QR code as PNG
  function handleDownloadQr() {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${result.shortUrl}.png`;
    a.click();
  }

  // Get QR canvas as a Blob
  function getQrBlob(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const canvas = qrRef.current?.querySelector("canvas");
      if (!canvas) { resolve(null); return; }
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  }

  // Native share — shares the QR image file, falls back to URL share, then clipboard
  async function handleNativeShare() {
    // Ensure QR panel is visible so the canvas is mounted
    if (!showQr) {
      setShowQr(true);
      // Wait a tick for React to render the canvas
      await new Promise((r) => setTimeout(r, 100));
    }

    const blob = await getQrBlob();

    if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], "qr.png", { type: "image/png" })] })) {
      // Share the QR image as a file
      const file = new File([blob], `qr-${result.shortUrl}.png`, { type: "image/png" });
      try {
        await navigator.share({
          title: "Scan this QR code",
          text: `Open ${result.fullShortUrl} by scanning this QR code`,
          files: [file],
        });
      } catch {
        // user cancelled or error — silently ignore
      }
    } else if (navigator.share) {
      // File sharing not supported — fall back to URL share
      try {
        await navigator.share({
          title: "Check out this link",
          text: "Shared via LinkShrink",
          url: result.fullShortUrl,
        });
      } catch {
        // silently ignore
      }
    } else if (blob) {
      // No Web Share API — download the QR image as fallback
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-${result.shortUrl}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setShareTooltip("QR saved!");
      setTimeout(() => setShareTooltip(""), 2000);
    } else {
      // Last resort: copy URL to clipboard
      await handleCopy();
      setShareTooltip("Link copied!");
      setTimeout(() => setShareTooltip(""), 2000);
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
      <SuccessHeader />

      {/* Short URL display + copy button */}
      <UrlRow result={result} copied={copied} onCopy={handleCopy} />

      {/* Original URL */}
      <OriginalUrl url={result.longUrl} />

      {/* Divider */}
      <div className="border-t border-[var(--border-default)]" />

      {/* QR + Share action bar */}
      <ActionBar
        result={result}
        showQr={showQr}
        onToggleQr={() => setShowQr((v) => !v)}
        onDownloadQr={handleDownloadQr}
        onNativeShare={handleNativeShare}
        shareTooltip={shareTooltip}
      />

      {/* QR Code panel */}
      <AnimatePresence>
        {showQr && (
          <motion.div
            key="qr-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div ref={qrRef} className="flex flex-col items-center gap-3 pt-1">
              <div className="p-3 bg-white rounded-2xl shadow-md">
                <QRCodeCanvas
                  value={result.fullShortUrl}
                  size={160}
                  bgColor="#ffffff"
                  fgColor="#0f172a"
                  level="M"
                  includeMargin={false}
                />
              </div>
              <p className="text-xs text-[var(--text-muted)] text-center">
                Scan to open <span className="font-medium text-blue-500">{result.fullShortUrl}</span>
              </p>
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={handleDownloadQr}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--bg-raised)] text-[var(--text-primary)] hover:bg-blue-500 hover:text-white transition-all duration-200"
              >
                <DownloadIcon />
                Download PNG
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Sub-components ───────────────────────────────────────────────────────── */

function SuccessHeader() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="2 6 5 9 10 3" />
        </svg>
      </div>
      <span className="text-sm font-medium text-[var(--text-primary)]">Link shortened successfully!</span>
    </div>
  );
}

function UrlRow({
  result,
  copied,
  onCopy,
}: {
  result: ShortenResponse;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
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
        onClick={onCopy}
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
  );
}

function OriginalUrl({ url }: { url: string }) {
  return (
    <div className="flex items-start gap-2 text-xs text-[var(--text-muted)]">
      <svg className="flex-shrink-0 mt-0.5" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
      <span className="truncate">Original: {url}</span>
    </div>
  );
}

function ActionBar({
  result,
  showQr,
  onToggleQr,
  onNativeShare,
  shareTooltip,
}: {
  result: ShortenResponse;
  showQr: boolean;
  onToggleQr: () => void;
  onDownloadQr: () => void;
  onNativeShare: () => void;
  shareTooltip: string;
}) {
  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(result.fullShortUrl)}&text=${encodeURIComponent("Check out this link!")}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(result.fullShortUrl)}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* QR Code toggle */}
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={onToggleQr}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
          showQr
            ? "bg-blue-500 text-white shadow-md shadow-blue-500/30"
            : "bg-[var(--bg-raised)] text-[var(--text-primary)] hover:bg-blue-500 hover:text-white"
        }`}
      >
        <QrIcon />
        {showQr ? "Hide QR" : "QR Code"}
      </motion.button>

      {/* Twitter / X share */}
      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on Twitter / X"
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--bg-raised)] text-[var(--text-primary)] hover:bg-[#1d9bf0] hover:text-white transition-all duration-200"
      >
        <TwitterIcon />
        Twitter
      </a>

      {/* LinkedIn share */}
      <a
        href={linkedinUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on LinkedIn"
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--bg-raised)] text-[var(--text-primary)] hover:bg-[#0a66c2] hover:text-white transition-all duration-200"
      >
        <LinkedInIcon />
        LinkedIn
      </a>

      {/* Native share / copy fallback */}
      <div className="relative ml-auto">
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={onNativeShare}
          aria-label="Share link"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-500 to-violet-600 text-white shadow-md shadow-blue-500/25 hover:brightness-110 transition-all duration-200"
        >
          <ShareIcon />
          Share
        </motion.button>
        <AnimatePresence>
          {shareTooltip && (
            <motion.span
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[var(--bg-raised)] text-[var(--text-primary)] text-xs px-2 py-1 rounded-lg shadow"
            >
              {shareTooltip}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── Icon components ──────────────────────────────────────────────────────── */

function QrIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h2v2h-2z" />
      <path d="M18 14h3" />
      <path d="M14 18v3" />
      <path d="M18 18h3v3h-3z" />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
