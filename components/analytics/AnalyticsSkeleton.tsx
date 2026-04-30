"use client";

export default function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* KPI row skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl p-5 border border-[var(--border-default)] bg-[var(--bg-subtle)]">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--bg-raised)]" />
              <div className="w-14 h-5 rounded-full bg-[var(--bg-raised)]" />
            </div>
            <div className="w-20 h-7 rounded-lg bg-[var(--bg-raised)] mb-2" />
            <div className="w-24 h-3 rounded-md bg-[var(--bg-raised)]" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="w-32 h-4 rounded-md bg-[var(--bg-raised)]" />
          <div className="flex gap-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-16 h-7 rounded-lg bg-[var(--bg-raised)]" />
            ))}
          </div>
        </div>
        <div className="h-48 rounded-xl bg-[var(--bg-raised)]" />
      </div>

      {/* Bottom row skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-5">
            <div className="w-24 h-4 rounded-md bg-[var(--bg-raised)] mb-4" />
            <div className="space-y-3">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--bg-raised)]" />
                  <div className="flex-1">
                    <div className="w-full h-2 rounded-full bg-[var(--bg-raised)]" />
                  </div>
                  <div className="w-8 h-3 rounded-md bg-[var(--bg-raised)]" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Live activity skeleton */}
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-5">
        <div className="w-28 h-4 rounded-md bg-[var(--bg-raised)] mb-4" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-raised)]">
              <div className="w-8 h-8 rounded-lg bg-[var(--bg-muted)]" />
              <div className="flex-1 space-y-1.5">
                <div className="w-28 h-3 rounded-md bg-[var(--bg-muted)]" />
                <div className="w-16 h-2.5 rounded-md bg-[var(--bg-muted)]" />
              </div>
              <div className="w-14 h-3 rounded-md bg-[var(--bg-muted)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
