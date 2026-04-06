/**
 * app/api/short/route.ts
 *
 * POST /api/short  — Shorten a long URL (Supabase / PostgreSQL)
 * GET  /api/short  — Returns 405 (no unauthenticated data dump)
 *
 * Database : Supabase (PostgreSQL)
 * Table    : links
 * Columns  : id, long_url, short_code, click_count, created_at
 */

import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { supabase, dbErrorMessage } from "@/lib/db";
import { isValidUrl, normaliseUrl, buildShortUrl } from "@/lib/utils";
import type { ShortenResponse } from "@/app/types";

/** POST /api/short — Shorten a URL */
export async function POST(req: Request): Promise<NextResponse> {
  // 1. Parse request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rawUrl =
    body && typeof body === "object" && "longUrl" in body
      ? (body as Record<string, unknown>).longUrl
      : undefined;

  // 2. Validate URL (must be http:// or https://)
  if (!isValidUrl(rawUrl)) {
    return NextResponse.json(
      { error: "A valid http:// or https:// URL is required." },
      { status: 400 }
    );
  }

  const longUrl = normaliseUrl(rawUrl);

  try {
    // 3. Deduplication — return existing short code if URL was already shortened
    const { data: existing, error: findError } = await supabase
      .from("links")
      .select("short_code")
      .eq("long_url", longUrl)
      .limit(1)
      .maybeSingle();

    if (findError) {
      console.error("[POST /api/short] lookup error:", findError);
      return NextResponse.json(
        { error: dbErrorMessage(findError) },
        { status: 500 }
      );
    }

    if (existing) {
      const response: ShortenResponse = {
        longUrl,
        shortUrl: existing.short_code,
        fullShortUrl: buildShortUrl(existing.short_code),
      };
      return NextResponse.json(response, { status: 200 });
    }

    // 4. Generate unique short code and insert
    const shortCode = nanoid(8);

    const { error: insertError } = await supabase
      .from("links")
      .insert({ long_url: longUrl, short_code: shortCode });

    if (insertError) {
      console.error("[POST /api/short] insert error:", insertError);
      return NextResponse.json(
        { error: dbErrorMessage(insertError) },
        { status: 500 }
      );
    }

    const response: ShortenResponse = {
      longUrl,
      shortUrl: shortCode,
      fullShortUrl: buildShortUrl(shortCode),
    };
    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    console.error("[POST /api/short] unexpected error:", err);
    return NextResponse.json(
      { error: dbErrorMessage(err) },
      { status: 500 }
    );
  }
}

/** Block GET — no unauthenticated data dump */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
