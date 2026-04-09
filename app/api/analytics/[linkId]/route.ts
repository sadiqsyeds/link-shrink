/**
 * app/api/analytics/[linkId]/route.ts
 *
 * GET /api/analytics/:linkId — Returns aggregated analytics for a link.
 * Requires the requesting user to own the link (checked via Supabase Auth).
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { supabase } from "@/lib/db";
import type { AnalyticsSummary } from "@/app/types";

export async function GET(
  _req: Request,
  context: { params: Promise<{ linkId: string }> }
): Promise<NextResponse> {
  const { linkId } = await context.params;

  if (!linkId) {
    return NextResponse.json({ error: "linkId is required." }, { status: 400 });
  }

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

  // ── Verify link ownership ──
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

  // ── Run analytics queries in parallel ──
  const [
    totalResult,
    uniqueResult,
    overTimeResult,
    countriesResult,
    referrersResult,
    devicesResult,
    browsersResult,
    recentResult,
  ] = await Promise.all([
    // Total clicks
    supabase
      .from("clicks")
      .select("id", { count: "exact", head: true })
      .eq("link_id", linkId),

    // Unique clicks
    supabase
      .from("clicks")
      .select("id", { count: "exact", head: true })
      .eq("link_id", linkId)
      .eq("is_unique", true),

    // Clicks over time (last 30 days, grouped by day via raw SQL)
    supabase
      .from("clicks")
      .select("timestamp")
      .eq("link_id", linkId)
      .gte("timestamp", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order("timestamp", { ascending: true }),

    // Top countries
    supabase
      .from("clicks")
      .select("country")
      .eq("link_id", linkId)
      .not("country", "is", null),

    // Top referrers
    supabase
      .from("clicks")
      .select("referrer")
      .eq("link_id", linkId)
      .not("referrer", "is", null),

    // Device breakdown
    supabase
      .from("clicks")
      .select("device")
      .eq("link_id", linkId)
      .not("device", "is", null),

    // Browser breakdown
    supabase
      .from("clicks")
      .select("browser")
      .eq("link_id", linkId)
      .not("browser", "is", null),

    // Recent 10 clicks
    supabase
      .from("clicks")
      .select("*")
      .eq("link_id", linkId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  // ── Aggregate clicks over time by day ──
  const dayMap = new Map<string, number>();
  for (const row of overTimeResult.data ?? []) {
    const day = (row.timestamp as string).slice(0, 10);
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
  }
  const clicks_over_time = Array.from(dayMap.entries())
    .map(([day, clicks]) => ({ day, clicks }))
    .sort((a, b) => a.day.localeCompare(b.day));

  // ── Aggregate helper ──
  function aggregate(rows: Record<string, string | null>[], key: string): { [k: string]: number; clicks: number }[] {
    const map = new Map<string, number>();
    for (const row of rows) {
      const val = (row[key] as string) || "Unknown";
      map.set(val, (map.get(val) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([k, clicks]) => ({ [key]: k, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10) as { [k: string]: number; clicks: number }[];
  }

  const summary: AnalyticsSummary = {
    total_clicks: totalResult.count ?? 0,
    unique_clicks: uniqueResult.count ?? 0,
    clicks_over_time,
    top_countries: aggregate(countriesResult.data ?? [], "country") as unknown as { country: string; clicks: number }[],
    top_referrers: aggregate(referrersResult.data ?? [], "referrer") as unknown as { referrer: string; clicks: number }[],
    device_breakdown: aggregate(devicesResult.data ?? [], "device") as unknown as { device: string; clicks: number }[],
    browser_breakdown: aggregate(browsersResult.data ?? [], "browser") as unknown as { browser: string; clicks: number }[],
    recent_clicks: recentResult.data ?? [],
  };

  return NextResponse.json(summary, { status: 200 });
}
