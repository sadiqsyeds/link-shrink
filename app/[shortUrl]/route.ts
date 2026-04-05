/**
 * app/[shortUrl]/route.ts
 *
 * GET /:shortUrl — Redirects to the original long URL.
 *
 * Security improvements over original:
 *  • Converted from plain JS → TypeScript
 *  • Uses connection pool (not a new connection per request)
 *  • Validates the retrieved URL before redirecting (prevents stored open-redirect)
 *  • Increments a click counter when the row exists
 *  • Returns a proper Next.js 404 for unknown codes
 */

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { isValidUrl } from "@/lib/utils";
import type mysql from "mysql2/promise";
import type { Link } from "@/app/types";

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

  try {
    const [rows] = await pool.execute<Link[] & mysql.RowDataPacket[]>(
      "SELECT long_link FROM links_master WHERE short_link = ? LIMIT 1",
      [shortUrl.trim()]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Short URL not found." },
        { status: 404 }
      );
    }

    const longUrl = rows[0].long_link;

    // Safety: only redirect to valid http/https URLs (prevents stored open-redirect)
    if (!isValidUrl(longUrl)) {
      console.error(`[redirect] Invalid stored URL for code "${shortUrl}": ${longUrl}`);
      return NextResponse.json(
        { error: "Invalid redirect target." },
        { status: 500 }
      );
    }

    // Fire-and-forget click counter (best-effort, doesn't block the redirect)
    pool
      .execute(
        "UPDATE links_master SET click_count = COALESCE(click_count, 0) + 1 WHERE short_link = ?",
        [shortUrl.trim()]
      )
      .catch((err) =>
        console.error("[redirect] click_count update failed:", err)
      );

    return NextResponse.redirect(longUrl, { status: 301 });
  } catch (err) {
    console.error("[redirect] DB error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
