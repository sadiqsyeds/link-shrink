import { NextResponse } from "next/server";
import { UAParser } from "ua-parser-js";
import { createHash } from "crypto";
import { getLinksCollection, getClicksCollection } from "@/lib/db";
import type { TrackPayload } from "@/app/types";

const BOT_RE = /bot|crawler|spider|slurp|mediapartners|googlebot|bingbot|yandex|baidu|duckduck|facebot|twitterbot|linkedinbot|whatsapp|telegrambot|applebot|semrush|ahrefsbot|mj12bot|dotbot|rogerbot|exabot|ia_archiver/i;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

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

  if (!link_id || !short_code) {
    return NextResponse.json({ error: "link_id and short_code are required." }, { status: 400 });
  }

  if (BOT_RE.test(user_agent)) {
    return NextResponse.json({ ok: true, bot: true }, { status: 200 });
  }

  const parser = new UAParser(user_agent);
  const uaResult = parser.getResult();

  const device = mapDevice(uaResult.device.type);
  const browser = uaResult.browser.name ?? "Unknown";
  const os = uaResult.os.name ?? "Unknown";

  const ipHash = sha256(ip);
  const visitorHash = sha256(`${ip}::${user_agent}`);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const clicks = await getClicksCollection();
  const recentCount = await clicks.countDocuments({
    link_id,
    visitor_hash: visitorHash,
    timestamp: { $gte: since },
  });

  const isUnique = recentCount === 0;

  let cleanReferrer = "";
  if (referrer) {
    try {
      const u = new URL(referrer);
      cleanReferrer = `${u.protocol}//${u.host}${u.pathname}`;
    } catch {
      cleanReferrer = referrer.slice(0, 200);
    }
  }

  const now = new Date();

  await clicks.insertOne({
    link_id,
    timestamp: now,
    country: country || null,
    city: city || null,
    device,
    browser,
    os,
    referrer: cleanReferrer || null,
    is_unique: isUnique,
    visitor_hash: visitorHash,
    ip_hash: ipHash,
    created_at: now,
  });

  // Increment click_count on the links document
  const links = await getLinksCollection();
  void links.updateOne({ short_code }, { $inc: { click_count: 1 } });

  return NextResponse.json({ ok: true, unique: isUnique }, { status: 200 });
}
