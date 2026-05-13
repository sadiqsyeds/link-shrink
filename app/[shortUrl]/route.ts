import { NextResponse, type NextRequest } from "next/server";
import { getLinksCollection, dbErrorMessage } from "@/lib/db";
import { isValidUrl } from "@/lib/utils";

/* ── In-process LRU-style cache (survives hot reloads via globalThis) ── */
const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  id: string;
  longUrl: string;
  expiresAt: number;
}

const _global = globalThis as unknown as { _lsCache?: Map<string, CacheEntry> };
if (!_global._lsCache) _global._lsCache = new Map();
const cache = _global._lsCache;

function getCached(code: string): CacheEntry | null {
  const entry = cache.get(code);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(code); return null; }
  return entry;
}

function setCached(code: string, id: string, longUrl: string) {
  cache.set(code, { id, longUrl, expiresAt: Date.now() + CACHE_TTL_MS });
}

/* ── Bot detection ─────────────────────────────────────────────────── */
const BOT_RE = /bot|crawler|spider|slurp|mediapartners|googlebot|bingbot|yandex|baidu|duckduck|facebot|twitterbot|linkedinbot|whatsapp|telegrambot|applebot|semrush|ahrefsbot|mj12bot|dotbot|rogerbot|exabot|ia_archiver/i;

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ shortUrl: string }> }
): Promise<NextResponse> {
  const { shortUrl } = await context.params;
  const shortCode = shortUrl?.trim();

  if (!shortCode) {
    return NextResponse.json({ error: "Short URL code is required." }, { status: 400 });
  }

  let linkId: string;
  let longUrl: string;

  const cached = getCached(shortCode);
  if (cached) {
    linkId = cached.id;
    longUrl = cached.longUrl;
  } else {
    try {
      const links = await getLinksCollection();
      const data = await links.findOne({ short_code: shortCode });

      if (!data) {
        return NextResponse.json({ error: "Short URL not found." }, { status: 404 });
      }

      linkId = data._id.toString();
      longUrl = data.long_url as string;
      setCached(shortCode, linkId, longUrl);
    } catch (err) {
      console.error("[redirect] lookup error:", err);
      return NextResponse.json({ error: dbErrorMessage(err) }, { status: 500 });
    }
  }

  if (!isValidUrl(longUrl)) {
    console.error(`[redirect] Invalid stored URL for code "${shortCode}": ${longUrl}`);
    return NextResponse.json({ error: "Invalid redirect target." }, { status: 500 });
  }

  const ua = req.headers.get("user-agent") ?? "";
  const isBot = BOT_RE.test(ua);

  if (!isBot) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    const referrer = req.headers.get("referer") ?? "";
    const country = req.headers.get("x-vercel-ip-country") ?? req.headers.get("cf-ipcountry") ?? "";
    const city = req.headers.get("x-vercel-ip-city") ?? req.headers.get("cf-ipcity") ?? "";

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

    void fetch(`${baseUrl}/api/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ short_code: shortCode, link_id: linkId, user_agent: ua, ip, referrer, country, city }),
      keepalive: true,
    }).catch(() => { /* swallow */ });
  }

  return NextResponse.redirect(longUrl, { status: 307 });
}
