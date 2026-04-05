/**
 * app/types/index.ts
 * Shared TypeScript types for the LinkShrink application.
 */

/** A row from the links_master table */
export interface Link {
  id: number;
  long_link: string;
  short_link: string;
  created_at?: string;
  click_count?: number;
}

/** Shape of a successful shorten response */
export interface ShortenResponse {
  longUrl: string;
  shortUrl: string;   // the short code (e.g. "aB3x9kLm")
  fullShortUrl: string; // the full URL (e.g. "https://example.com/aB3x9kLm")
}

/** Body expected by POST /api/short */
export interface ShortenRequest {
  longUrl: string;
}

/** Generic API error envelope */
export interface ApiError {
  error: string;
}

/** Union used as a generic API response */
export type ApiResponse<T> = T | ApiError;
