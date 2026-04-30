"use client";

import { motion } from "framer-motion";

interface DeviceEntry { device: string; clicks: number; }
interface BrowserEntry { browser: string; clicks: number; }

interface Props {
  devices: DeviceEntry[];
  browsers: BrowserEntry[];
}

function DeviceIcon({ device }: { device: string }) {
  const d = device.toLowerCase();
  if (d.includes("mobile") || d.includes("phone")) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (d.includes("tablet")) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  // Desktop / default
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function BrowserIcon({ browser }: { browser: string }) {
  const b = browser.toLowerCase();
  if (b.includes("chrome")) return <span className="text-sm">🌐</span>;
  if (b.includes("firefox")) return <span className="text-sm">🦊</span>;
  if (b.includes("safari")) return <span className="text-sm">🧭</span>;
  if (b.includes("edge")) return <span className="text-sm">🔷</span>;
  if (b.includes("opera")) return <span className="text-sm">🅾️</span>;
  if (b.includes("samsung")) return <span className="text-sm">📱</span>;
  return <span className="text-sm">🌐</span>;
}

const DEVICE_COLORS = ["bg-blue-500", "bg-violet-500", "bg-cyan-500", "bg-emerald-500"];
const BROWSER_COLORS = ["bg-amber-500", "bg-rose-500", "bg-indigo-500", "bg-teal-500", "bg-pink-500", "bg-orange-500"];

function BreakdownRow({
  icon, label, clicks, total, colorClass, delay,
}: {
  icon: React.ReactNode;
  label: string;
  clicks: number;
  total: number;
  colorClass: string;
  delay: number;
}) {
  const pct = total > 0 ? Math.round((clicks / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay }}
      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--bg-raised)] transition-colors group"
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0 ${colorClass}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-[var(--text-primary)] truncate">{label}</span>
          <span className="text-xs text-[var(--text-muted)] ml-2 flex-shrink-0 tabular-nums">{pct}%</span>
        </div>
        <div className="h-1.5 bg-[var(--bg-raised)] rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${colorClass}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, delay: delay + 0.1, ease: "easeOut" }}
          />
        </div>
      </div>
      <span className="text-xs font-semibold text-[var(--text-secondary)] flex-shrink-0 w-10 text-right tabular-nums">
        {clicks.toLocaleString()}
      </span>
    </motion.div>
  );
}

export default function DeviceBreakdown({ devices, browsers }: Props) {
  const deviceTotal = devices.reduce((s, d) => s + d.clicks, 0);
  const browserTotal = browsers.reduce((s, b) => s + b.clicks, 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Devices */}
      {devices.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">📱</span>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Devices</h3>
          </div>
          <div className="space-y-0.5">
            {devices.slice(0, 5).map((d, i) => (
              <BreakdownRow
                key={d.device}
                icon={<DeviceIcon device={d.device} />}
                label={d.device || "Unknown"}
                clicks={d.clicks}
                total={deviceTotal}
                colorClass={DEVICE_COLORS[i % DEVICE_COLORS.length]}
                delay={0.4 + i * 0.06}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Browsers */}
      {browsers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">🧭</span>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Browsers</h3>
          </div>
          <div className="space-y-0.5">
            {browsers.slice(0, 5).map((b, i) => (
              <BreakdownRow
                key={b.browser}
                icon={<BrowserIcon browser={b.browser} />}
                label={b.browser || "Unknown"}
                clicks={b.clicks}
                total={browserTotal}
                colorClass={BROWSER_COLORS[i % BROWSER_COLORS.length]}
                delay={0.45 + i * 0.06}
              />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
