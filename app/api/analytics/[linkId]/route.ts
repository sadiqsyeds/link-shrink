/**
 * app/api/analytics/[linkId]/route.ts
 *
 * GET /api/analytics/:linkId — Returns aggregated analytics for a link.
 *
 * Improvements over v1:
 *  - Reads from materialized views (country_stats, device_stats, referrer_stats,
 *    daily_click_stats, hourly_click_stats) instead of scanning raw clicks rows.
 *  - Supports ?granularity=hour|day time-series param.
 *  - Classifies referrers into categories (search / social / direct / other).
 *  - Per-invocation in-memory cache (TTL 60s) — serverless-safe.
 *  - Only 4 DB round-trips instead of 8.
 *
 * Constraints:
 *  - Vercel free tier (serverless, no persistent memory, no external cache)
 *  - Supabase PostgreSQL only
 *  - Does NOT modify existing tables
 */

import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { supabase } from "@/lib/db";
import type { AnalyticsSummary, AnalyticsGranularity, ReferrerCategory } from "@/app/types";

/* ── In-process cache (survives within a single warm Lambda, resets on cold start) ── */
interface CacheEntry {
  data: AnalyticsSummary;
  expiresAt: number;
}

const _g = globalThis as unknown as { _analyticsCache?: Map<string, CacheEntry> };
if (!_g._analyticsCache) _g._analyticsCache = new Map();
const cache = _g._analyticsCache;

const CACHE_TTL_MS = 60_000; // 60 seconds

function getCached(key: string): AnalyticsSummary | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  return entry.data;
}

function setCached(key: string, data: AnalyticsSummary): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

/* ── Referrer categorization ────────────────────────────────────────────────── */
const SEARCH_ENGINES = ["google", "bing", "yahoo", "duckduckgo", "baidu", "yandex", "ecosia"];
const SOCIAL_NETWORKS = ["twitter", "x.com", "linkedin", "facebook", "instagram", "tiktok", "reddit", "youtube", "whatsapp", "telegram", "pinterest"];

function categorizeReferrer(referrer: string | null): ReferrerCategory {
  if (!referrer || referrer === "direct") return "direct";
  const lower = referrer.toLowerCase();
  if (SEARCH_ENGINES.some((s) => lower.includes(s))) return "search";
  if (SOCIAL_NETWORKS.some((s) => lower.includes(s))) return "social";
  return "other";
}

/* ── Main handler ────────────────────────────────────────────────────────────── */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ linkId: string }> }
): Promise<NextResponse> {
  const { linkId } = await context.params;

  if (!linkId) {
    return NextResponse.json({ error: "linkId is required." }, { status: 400 });
  }

  // Parse ?granularity=hour|day (default: day)
  const granularity: AnalyticsGranularity =
    req.nextUrl.searchParams.get("granularity") === "hour" ? "hour" : "day";

  // ── Auth check ──
  let userId: string | null = null;
  try {
    const cookieStore = await cookies();
    const authClient = createServerClient(cookieStore);
    const { data: { user } } = await authClient.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // not authenticated
  }

  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  // ── Cache check ──
  const cacheKey = `${linkId}:${granularity}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, cached: true }, { status: 200 });
  }

  // ── Verify link ownership (single query) ──
  const { data: link, error: linkErr } = await supabase
    .from("links")
    .select("id, user_id, short_code, long_url, click_count, created_at")
    .eq("id", linkId)
    .maybeSingle();

  if (linkErr || !link) {
    return NextResponse.json({ error: "Link not found." }, { status: 404 });
  }

  if (link.user_id !== userId) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  // ── Run 4 parallel queries on aggregated views ──
  const [timeSeriesResult, dimensionsResult, recentResult] = await Promise.all([

    // ① Time-series from materialized view (daily or hourly)
    granularity === "hour"
      ? supabase
          .from("hourly_click_stats")
          .select("hour, total_clicks, unique_clicks")
          .eq("link_id", linkId)
          .gte("hour", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()) // last 48h
          .order("hour", { ascending: true })
      : supabase
          .from("daily_click_stats")
          .select("day, total_clicks, unique_clicks")
          .eq("link_id", linkId)
          .gte("day", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // last 30 days
          .order("day", { ascending: true }),

    // ② Country + device + referrer from their materialized views (3 sub-queries in one Promise.all)
    Promise.all([
      supabase
        .from("country_stats")
        .select("country, clicks")
        .eq("link_id", linkId)
        .order("clicks", { ascending: false })
        .limit(10),

      supabase
        .from("device_stats")
        .select("device, clicks")
        .eq("link_id", linkId)
        .order("clicks", { ascending: false })
        .limit(10),

      supabase
        .from("referrer_stats")
        .select("referrer, clicks")
        .eq("link_id", linkId)
        .order("clicks", { ascending: false })
        .limit(10),

      supabase
        .from("clicks")
        .select("browser")
        .eq("link_id", linkId)
        .not("browser", "is", null),
    ]),

    // ③ Recent 10 raw clicks (small, bounded query)
    supabase
      .from("clicks")
      .select("*")
      .eq("link_id", linkId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const [countriesResult, devicesResult, referrersResult, browsersResult] = dimensionsResult;

  // ── Build time-series buckets ──
  const clicks_over_time = (timeSeriesResult.data ?? []).map((row) => ({
    bucket: granularity === "hour"
      ? (row as { hour: string }).hour
      : (row as { day: string }).day,
    total_clicks: Number((row as { total_clicks: number }).total_clicks),
    unique_clicks: Number((row as { unique_clicks: number }).unique_clicks),
  }));

  // ── Aggregate totals from time-series (avoids extra COUNT query) ──
  const total_clicks = link.click_count ?? clicks_over_time.reduce((s, r) => s + r.total_clicks, 0);
  const unique_clicks = clicks_over_time.reduce((s, r) => s + r.unique_clicks, 0);

  // ── Browser breakdown (still from raw — no browser_stats view yet) ──
  const browserMap = new Map<string, number>();
  for (const row of browsersResult.data ?? []) {
    const b = (row.browser as string) || "Unknown";
    browserMap.set(b, (browserMap.get(b) ?? 0) + 1);
  }
  const browser_breakdown = Array.from(browserMap.entries())
    .map(([browser, clicks]) => ({ browser, clicks }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);

  // ── Referrers with category classification ──
  const top_referrers = (referrersResult.data ?? []).map((row) => ({
    referrer: (row.referrer as string) || "direct",
    clicks: Number(row.clicks),
    category: categorizeReferrer(row.referrer as string | null),
  }));

  // ── Build summary ──
  const summary: AnalyticsSummary = {
    total_clicks,
    unique_clicks,
    clicks_over_time,
    granularity,
    top_countries: (countriesResult.data ?? []).map((r) => ({
      country: (r.country as string) || "Unknown",
      clicks: Number(r.clicks),
    })),
    top_referrers,
    device_breakdown: (devicesResult.data ?? []).map((r) => ({
      device: (r.device as string) || "Unknown",
      clicks: Number(r.clicks),
    })),
    browser_breakdown,
    recent_clicks: recentResult.data ?? [],
    cached: false,
  };

  // ── Store in cache ──
  setCached(cacheKey, summary);

  return NextResponse.json(summary, { status: 200 });
}
