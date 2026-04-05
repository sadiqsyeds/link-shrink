/**
 * app/api/short/route.ts
 *
 * POST /api/short  — Shorten a long URL
 * GET  /api/short  — (removed public dump; now returns 405)
 *
 * Security improvements over original:
 *  • URL validation before any DB work
 *  • Uses connection pool (not a new connection per request)
 *  • Deduplication: returns existing short code for already-shortened URLs
 *  • No unauthenticated full-table dump
 */

import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { pool } from "@/lib/db";
import { isValidUrl, normaliseUrl, buildShortUrl } from "@/lib/utils";
import type { Link, ShortenResponse } from "@/app/types";

/** POST /api/short — Shorten a URL */
export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawUrl =
    body && typeof body === "object" && "longUrl" in body
      ? (body as Record<string, unknown>).longUrl
      : undefined;

  // Validate URL
  if (!isValidUrl(rawUrl)) {
    return NextResponse.json(
      { error: "A valid http:// or https:// URL is required." },
      { status: 400 }
    );
  }

  const longUrl = normaliseUrl(rawUrl);

  try {
    // Deduplication: if this URL was already shortened, return the existing code
    const [existing] = await pool.execute<Link[] & mysql.RowDataPacket[]>(
      "SELECT short_link FROM links_master WHERE long_link = ? LIMIT 1",
      [longUrl]
    );

    if (existing.length > 0) {
      const shortCode = existing[0].short_link;
      const response: ShortenResponse = {
        longUrl,
        shortUrl: shortCode,
        fullShortUrl: buildShortUrl(shortCode),
      };
      return NextResponse.json(response, { status: 200 });
    }

    // Generate a new unique short code
    const shortCode = nanoid(8);

    await pool.execute(
      "INSERT INTO links_master (long_link, short_link) VALUES (?, ?)",
      [longUrl, shortCode]
    );

    const response: ShortenResponse = {
      longUrl,
      shortUrl: shortCode,
      fullShortUrl: buildShortUrl(shortCode),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    console.error("[POST /api/short] DB error:", err);
    return NextResponse.json(
      { error: "Internal server error. Please try again." },
      { status: 500 }
    );
  }
}

/** Block all other methods */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

// Required to avoid TS errors when importing the mysql type inline
import type mysql from "mysql2/promise";
