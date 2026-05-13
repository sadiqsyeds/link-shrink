import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import { getLinksCollection, getClicksCollection } from "@/lib/db";
import type { AnalyticsSummary, AnalyticsGranularity, ReferrerCategory } from "@/app/types";

/* ── In-process cache ─────────────────────────────────────────────── */
interface CacheEntry { data: AnalyticsSummary; expiresAt: number; }
const _g = globalThis as unknown as { _analyticsCache?: Map<string, CacheEntry> };
if (!_g._analyticsCache) _g._analyticsCache = new Map();
const analyticsCache = _g._analyticsCache;
const CACHE_TTL_MS = 60_000;

function getCached(key: string): AnalyticsSummary | null {
  const entry = analyticsCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { analyticsCache.delete(key); return null; }
  return entry.data;
}
function setCached(key: string, data: AnalyticsSummary): void {
  analyticsCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

/* ── Referrer categorization ─────────────────────────────────────── */
const SEARCH_ENGINES = ["google", "bing", "yahoo", "duckduckgo", "baidu", "yandex", "ecosia"];
const SOCIAL_NETWORKS = ["twitter", "x.com", "linkedin", "facebook", "instagram", "tiktok", "reddit", "youtube", "whatsapp", "telegram", "pinterest"];

function categorizeReferrer(referrer: string | null): ReferrerCategory {
  if (!referrer || referrer === "direct") return "direct";
  const lower = referrer.toLowerCase();
  if (SEARCH_ENGINES.some((s) => lower.includes(s))) return "search";
  if (SOCIAL_NETWORKS.some((s) => lower.includes(s))) return "social";
  return "other";
}

/* ── Main handler ────────────────────────────────────────────────── */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ linkId: string }> }
): Promise<NextResponse> {
  const { linkId } = await context.params;

  if (!linkId) {
    return NextResponse.json({ error: "linkId is required." }, { status: 400 });
  }

  const granularity: AnalyticsGranularity =
    req.nextUrl.searchParams.get("granularity") === "hour" ? "hour" : "day";

  // Auth check
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const cacheKey = `${linkId}:${granularity}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, cached: true }, { status: 200 });
  }

  // Validate linkId
  let objectId: ObjectId;
  try {
    objectId = new ObjectId(linkId);
  } catch {
    return NextResponse.json({ error: "Link not found." }, { status: 404 });
  }

  const linksCollection = await getLinksCollection();
  const link = await linksCollection.findOne({ _id: objectId });

  if (!link) {
    return NextResponse.json({ error: "Link not found." }, { status: 404 });
  }

  if (link.user_id !== session.user.id) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  const clicksCollection = await getClicksCollection();

  // Run aggregations in parallel
  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const fortyEightHoursAgo = new Date(now - 48 * 60 * 60 * 1000);

  const [timeSeriesData, countriesData, devicesData, referrersData, browsersData, recentData] =
    await Promise.all([
      // Time-series
      clicksCollection
        .aggregate([
          {
            $match: {
              link_id: linkId,
              timestamp: { $gte: granularity === "hour" ? fortyEightHoursAgo : thirtyDaysAgo },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: granularity === "hour" ? "%Y-%m-%dT%H:00:00.000Z" : "%Y-%m-%d",
                  date: "$timestamp",
                },
              },
              total_clicks: { $sum: 1 },
              unique_clicks: { $sum: { $cond: ["$is_unique", 1, 0] } },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray(),

      // Countries
      clicksCollection
        .aggregate([
          { $match: { link_id: linkId } },
          { $group: { _id: "$country", clicks: { $sum: 1 } } },
          { $sort: { clicks: -1 } },
          { $limit: 10 },
        ])
        .toArray(),

      // Devices
      clicksCollection
        .aggregate([
          { $match: { link_id: linkId } },
          { $group: { _id: "$device", clicks: { $sum: 1 } } },
          { $sort: { clicks: -1 } },
          { $limit: 10 },
        ])
        .toArray(),

      // Referrers
      clicksCollection
        .aggregate([
          { $match: { link_id: linkId } },
          { $group: { _id: "$referrer", clicks: { $sum: 1 } } },
          { $sort: { clicks: -1 } },
          { $limit: 10 },
        ])
        .toArray(),

      // Browsers
      clicksCollection
        .aggregate([
          { $match: { link_id: linkId } },
          { $group: { _id: "$browser", clicks: { $sum: 1 } } },
          { $sort: { clicks: -1 } },
          { $limit: 10 },
        ])
        .toArray(),

      // Recent clicks
      clicksCollection
        .find({ link_id: linkId })
        .sort({ created_at: -1 })
        .limit(10)
        .toArray(),
    ]);

  const clicks_over_time = timeSeriesData.map((row) => ({
    bucket: row._id as string,
    total_clicks: Number(row.total_clicks),
    unique_clicks: Number(row.unique_clicks),
  }));

  const total_clicks = (link.click_count as number) ?? clicks_over_time.reduce((s, r) => s + r.total_clicks, 0);
  const unique_clicks = clicks_over_time.reduce((s, r) => s + r.unique_clicks, 0);

  const summary: AnalyticsSummary = {
    total_clicks,
    unique_clicks,
    clicks_over_time,
    granularity,
    top_countries: countriesData.map((r) => ({
      country: (r._id as string) || "Unknown",
      clicks: Number(r.clicks),
    })),
    top_referrers: referrersData.map((r) => ({
      referrer: (r._id as string) || "direct",
      clicks: Number(r.clicks),
      category: categorizeReferrer(r._id as string | null),
    })),
    device_breakdown: devicesData.map((r) => ({
      device: (r._id as string) || "Unknown",
      clicks: Number(r.clicks),
    })),
    browser_breakdown: browsersData.map((r) => ({
      browser: (r._id as string) || "Unknown",
      clicks: Number(r.clicks),
    })),
    recent_clicks: recentData.map((r) => ({
      id: r._id.toString(),
      link_id: r.link_id as string,
      timestamp: (r.timestamp as Date).toISOString(),
      country: r.country as string | null,
      city: r.city as string | null,
      device: r.device as string | null,
      browser: r.browser as string | null,
      os: r.os as string | null,
      referrer: r.referrer as string | null,
      is_unique: r.is_unique as boolean,
      visitor_hash: r.visitor_hash as string | null,
      ip_hash: r.ip_hash as string | null,
      created_at: (r.created_at as Date).toISOString(),
    })),
    cached: false,
  };

  setCached(cacheKey, summary);
  return NextResponse.json(summary, { status: 200 });
}
