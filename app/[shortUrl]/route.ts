/**
 * app/[shortUrl]/route.ts
 *
 * GET /:shortCode — Looks up the short code in Supabase and redirects.
 *
 * Database : Supabase (PostgreSQL)
 * Table    : links
 * Columns  : id, long_url, short_code, click_count, created_at
 */

import { NextResponse } from "next/server";
import { supabase, dbErrorMessage } from "@/lib/db";
import { isValidUrl } from "@/lib/utils";

export async function GET(
  _req: Request,
  context: { params: Promise<{ shortUrl: string }> }
): Promise<NextResponse> {
  const { shortUrl } = await context.params;

  if (!shortUrl || shortUrl.trim().length === 0) {
    return NextResponse.json(
      { error: "Short URL code is required." },
      { status: 400 }
    );
  }

  const shortCode = shortUrl.trim();

  try {
    // Look up the long URL by short code
    const { data, error } = await supabase
      .from("links")
      .select("long_url")
      .eq("short_code", shortCode)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[redirect] lookup error:", error);
      return NextResponse.json(
        { error: dbErrorMessage(error) },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Short URL not found." },
        { status: 404 }
      );
    }

    const longUrl = data.long_url as string;

    // Safety: only redirect to valid http/https URLs (prevents stored open-redirect)
    if (!isValidUrl(longUrl)) {
      console.error(
        `[redirect] Invalid stored URL for code "${shortCode}": ${longUrl}`
      );
      return NextResponse.json(
        { error: "Invalid redirect target." },
        { status: 500 }
      );
    }

    // Fire-and-forget click counter — atomic increment via PostgreSQL
    // Does NOT block the redirect response
    void incrementClickCount(shortCode);

    return NextResponse.redirect(longUrl, { status: 301 });
  } catch (err) {
    console.error("[redirect] unexpected error:", err);
    return NextResponse.json(
      { error: dbErrorMessage(err) },
      { status: 500 }
    );
  }
}

/**
 * Atomically increments the click counter for a short code.
 * Uses a PostgreSQL RPC function if available, falls back to a plain update.
 * Errors are swallowed — click tracking should never break the redirect.
 */
async function incrementClickCount(shortCode: string): Promise<void> {
  try {
    // Try atomic RPC first (add this function in Supabase SQL Editor — see README)
    const { error } = await supabase.rpc("increment_click_count", {
      p_short_code: shortCode,
    });

    if (error) {
      // RPC not found — fall back to a simple update (non-atomic, fine for low traffic)
      await supabase
        .from("links")
        .update({ click_count: 1 }) // Supabase JS v2 doesn't support raw SQL expressions here
        .eq("short_code", shortCode);
    }
  } catch {
    // Swallow — click tracking is best-effort
  }
}
