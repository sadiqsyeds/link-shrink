import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { nanoid } from "nanoid";
import { authOptions } from "@/lib/auth";
import { getLinksCollection, dbErrorMessage } from "@/lib/db";
import { isValidUrl, normaliseUrl, buildShortUrl } from "@/lib/utils";
import type { ShortenResponse } from "@/app/types";

const ALIAS_RE = /^[a-zA-Z0-9_-]{3,32}$/;

export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const rawUrl = raw.longUrl;
  const customAlias = typeof raw.customAlias === "string" ? raw.customAlias.trim() : null;

  if (!isValidUrl(rawUrl)) {
    return NextResponse.json(
      { error: "A valid http:// or https:// URL is required." },
      { status: 400 }
    );
  }

  const longUrl = normaliseUrl(rawUrl as string);

  let userId: string | null = null;
  try {
    const session = await getServerSession(authOptions);
    userId = session?.user?.id ?? null;
  } catch {
    // treat as anon
  }

  if (customAlias) {
    if (!userId) {
      return NextResponse.json({ error: "Sign in to use a custom alias." }, { status: 401 });
    }
    if (!ALIAS_RE.test(customAlias)) {
      return NextResponse.json(
        { error: "Alias must be 3–32 characters: letters, numbers, _ or -" },
        { status: 400 }
      );
    }
    const reserved = ["api", "auth", "dashboard", "login", "signup", "logout"];
    if (reserved.includes(customAlias.toLowerCase())) {
      return NextResponse.json({ error: "That alias is reserved." }, { status: 400 });
    }
  }

  try {
    const links = await getLinksCollection();

    if (!customAlias) {
      const existing = await links.findOne({ long_url: longUrl, custom_alias: null });
      if (existing) {
        const response: ShortenResponse = {
          id: existing._id.toString(),
          longUrl,
          shortUrl: existing.short_code as string,
          fullShortUrl: buildShortUrl(existing.short_code as string),
        };
        return NextResponse.json(response, { status: 200 });
      }
    }

    if (customAlias) {
      const aliasExists = await links.findOne({
        $or: [{ short_code: customAlias }, { custom_alias: customAlias }],
      });
      if (aliasExists) {
        return NextResponse.json(
          { error: "That custom alias is already taken. Try another." },
          { status: 409 }
        );
      }
    }

    const shortCode = customAlias ?? nanoid(8);
    const doc: Record<string, unknown> = {
      long_url: longUrl,
      short_code: shortCode,
      custom_alias: customAlias ?? null,
      user_id: userId,
      click_count: 0,
      created_at: new Date(),
    };

    const result = await links.insertOne(doc);

    const response: ShortenResponse = {
      id: result.insertedId.toString(),
      longUrl,
      shortUrl: shortCode,
      fullShortUrl: buildShortUrl(shortCode),
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
