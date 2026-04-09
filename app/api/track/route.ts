/**
 * app/api/track/route.ts
 *
 * POST /api/track — Analytics ingestion endpoint.
 *
 * Called fire-and-forget from the redirect route.
 * Parses UA, detects device/browser/OS, generates visitor fingerprint,
 * determines uniqueness, and inserts into the clicks table.
 */

import { NextResponse } from "next/server";
import { UAParser } from "ua-parser-js";
import { createHash } from "crypto";
import { supabase } from "@/lib/db";
import type { TrackPayload } from "@/app/types";

/* ── Bot patterns (secondary check inside track route) ─────────────────────── */
const BOT_RE = /bot|crawler|spider|slurp|mediapartners|googlebot|bingbot|yandex|baidu|duckduck|facebot|twitterbot|linkedinbot|whatsapp|telegrambot|applebot|semrush|ahrefsbot|mj12bot|dotbot|rogerbot|exabot|ia_archiver/i;

/** SHA-256 hex of a string */
function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Map ua-parser device type to our simplified categories */
function mapDevice(type: string | undefined): string {
  if (!type) return "desktop";
  const t = type.toLowerCase();
  if (t === "mobile" || t === "tablet") return t;
  return "desktop";
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: Partial<TrackPayload>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const { link_id, short_code, user_agent = "", ip = "unknown", referrer = "", country = "", city = "" } = body;

  // Validate required fields
  if (!link_id || !short_code) {
    return NextResponse.json({ error: "link_id and short_code are required." }, { status: 400 });
  }

  // Secondary bot guard
  if (BOT_RE.test(user_agent)) {
    return NextResponse.json({ ok: true, bot: true }, { status: 200 });
  }

  // ── Parse user agent ──
  const parser = new UAParser(user_agent);
  const uaResult = parser.getResult();

  const device = mapDevice(uaResult.device.type);
  const browser = uaResult.browser.name ?? "Unknown";
  const os = uaResult.os.name ?? "Unknown";

  // ── Privacy-safe hashing ──
  const ipHash = sha256(ip);
  const visitorHash = sha256(`${ip}::${user_agent}`);

  // ── Unique visitor detection (check last 24h) ──
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("clicks")
    .select("id", { count: "exact", head: true })
    .eq("link_id", link_id)
    .eq("visitor_hash", visitorHash)
    .gte("timestamp", since)
    .then((r) => ({ count: r.count ?? 0 }));

  const isUnique = count === 0;

  // ── Clean referrer (strip query params from referrer for privacy) ──
  let cleanReferrer = "";
  if (referrer) {
    try {
      const u = new URL(referrer);
      cleanReferrer = `${u.protocol}//${u.host}${u.pathname}`;
    } catch {
      cleanReferrer = referrer.slice(0, 200);
    }
  }

  // ── Insert click ──
  const { error } = await supabase.from("clicks").insert({
    link_id,
    country: country || null,
    city: city || null,
    device,
    browser,
    os,
    referrer: cleanReferrer || null,
    is_unique: isUnique,
    visitor_hash: visitorHash,
    ip_hash: ipHash,
  });

  if (error) {
    console.error("[track] insert error:", error);
    return NextResponse.json({ error: "Failed to record click." }, { status: 500 });
  }

  // ── Also increment click_count on links table (atomic RPC) ──
  void supabase.rpc("increment_click_count", { p_short_code: short_code });

  return NextResponse.json({ ok: true, unique: isUnique }, { status: 200 });
}
