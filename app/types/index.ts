/**
 * app/types/index.ts
 * Shared TypeScript types for the LinkShrink application.
 * Database: Supabase (PostgreSQL)
 * Table   : links
 */

/** Shape of a row in the "links" table */
export interface LinkRow {
  id: number;
  long_url: string;
  short_code: string;
  click_count: number;
  created_at: string;
}

/** Shape of a successful shorten response */
export interface ShortenResponse {
  longUrl: string;
  shortUrl: string;       // the short code (e.g. "aB3x9kLm")
  fullShortUrl: string;   // the full URL (e.g. "https://example.com/aB3x9kLm")
}

