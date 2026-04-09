/**
 * app/api/short/route.ts
 *
 * POST /api/short  — Shorten a long URL (supports custom alias for auth'd users)
 * GET  /api/short  — Returns 405
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { supabase, dbErrorMessage } from "@/lib/db";
import { isValidUrl, normaliseUrl, buildShortUrl } from "@/lib/utils";
import type { ShortenResponse } from "@/app/types";

const ALIAS_RE = /^[a-zA-Z0-9_-]{3,32}$/;

export async function POST(req: Request): Promise<NextResponse> {
  // 1. Parse request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const rawUrl = raw.longUrl;
  const customAlias = typeof raw.customAlias === "string" ? raw.customAlias.trim() : null;

  // 2. Validate URL
  if (!isValidUrl(rawUrl)) {
    return NextResponse.json(
      { error: "A valid http:// or https:// URL is required." },
      { status: 400 }
    );
  }

  const longUrl = normaliseUrl(rawUrl as string);

  // 3. Check auth session (optional — anon users still allowed)
  let userId: string | null = null;
  try {
    const cookieStore = await cookies();
    const authClient = createServerClient(cookieStore);
    const { data: { user } } = await authClient.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // auth check failed — treat as anon
  }

  // 4. Validate custom alias (only for authenticated users)
  if (customAlias) {
    if (!userId) {
      return NextResponse.json(
        { error: "Sign in to use a custom alias." },
        { status: 401 }
      );
    }
    if (!ALIAS_RE.test(customAlias)) {
      return NextResponse.json(
        { error: "Alias must be 3–32 characters: letters, numbers, _ or -" },
        { status: 400 }
      );
    }
    // Reserved paths
    const reserved = ["api", "auth", "dashboard", "login", "signup", "logout"];
    if (reserved.includes(customAlias.toLowerCase())) {
      return NextResponse.json({ error: "That alias is reserved." }, { status: 400 });
    }
  }

  try {
    // 5. Deduplication — if no custom alias and URL already shortened, return it
    if (!customAlias) {
      const { data: existing } = await supabase
        .from("links")
        .select("id, short_code")
        .eq("long_url", longUrl)
        .is("custom_alias", null)
        .limit(1)
        .maybeSingle();

      if (existing) {
        const response: ShortenResponse = {
          id: existing.id,
          longUrl,
          shortUrl: existing.short_code,
          fullShortUrl: buildShortUrl(existing.short_code),
        };
        return NextResponse.json(response, { status: 200 });
      }
    }

    // 6. Validate custom alias uniqueness
    if (customAlias) {
      const { data: aliasExists } = await supabase
        .from("links")
        .select("id")
        .or(`short_code.eq.${customAlias},custom_alias.eq.${customAlias}`)
        .limit(1)
        .maybeSingle();

      if (aliasExists) {
        return NextResponse.json(
          { error: "That custom alias is already taken. Try another." },
          { status: 409 }
        );
      }
    }

    // 7. Generate short code & insert
    const shortCode = customAlias ?? nanoid(8);

    const insertData: Record<string, unknown> = {
      long_url: longUrl,
      short_code: shortCode,
    };
    if (customAlias) insertData.custom_alias = customAlias;
    if (userId) insertData.user_id = userId;

    const { data: inserted, error: insertError } = await supabase
      .from("links")
      .insert(insertData)
      .select("id, short_code")
      .single();

    if (insertError || !inserted) {
      console.error("[POST /api/short] insert error:", insertError);
      return NextResponse.json(
        { error: dbErrorMessage(insertError) },
        { status: 500 }
      );
    }

    const response: ShortenResponse = {
      id: inserted.id,
      longUrl,
      shortUrl: inserted.short_code,
      fullShortUrl: buildShortUrl(inserted.short_code),
    };
    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    console.error("[POST /api/short] unexpected error:", err);
    return NextResponse.json({ error: dbErrorMessage(err) }, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
