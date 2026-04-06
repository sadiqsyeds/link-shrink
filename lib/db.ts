/**
 * lib/db.ts
 * Supabase client singleton.
 *
 * The @supabase/supabase-js client is safe to share across the entire
 * application — it manages its own connection pool internally.
 * We cache it on globalThis to survive Next.js hot-reloads in development.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "[db] ❌ Missing Supabase environment variables.\n" +
      "     Make sure your .env.local contains:\n" +
      "       NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co\n" +
      "       NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_...\n" +
      "     Get these from: Supabase Dashboard → Project → Settings → API"
  );
}

/* ── Global cache to survive Next.js hot-reloads ─────────────────────────── */
const globalForSupabase = globalThis as unknown as {
  supabase: SupabaseClient | undefined;
};

export const supabase: SupabaseClient =
  globalForSupabase.supabase ??
  (globalForSupabase.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY));

/**
 * Returns a human-readable message for common Supabase / PostgreSQL errors.
 */
export function dbErrorMessage(err: unknown): string {
  if (!err || typeof err !== "object") return "Database error.";

  const e = err as Record<string, unknown>;

  // Supabase returns { message, code, details, hint } on errors
  const message = (e.message as string | undefined) ?? "";
  const code = (e.code as string | undefined) ?? "";

  if (message.includes("fetch failed") || message.includes("ECONNREFUSED")) {
    return "Cannot reach the database. Check your SUPABASE_URL.";
  }
  if (message.includes("Invalid API key") || message.includes("JWT")) {
    return "Invalid Supabase API key. Check NEXT_PUBLIC_SUPABASE_ANON_KEY.";
  }
  if (code === "23505") {
    return "A link with this short code already exists. Please try again.";
  }
  if (code === "42P01") {
    return "Database table not found. Run the setup SQL in Supabase SQL Editor.";
  }
  if (message.includes("timeout")) {
    return "Database request timed out. Please try again.";
  }

  return "An unexpected database error occurred.";
}
