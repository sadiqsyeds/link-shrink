/**
 * app/types/index.ts
 * Shared TypeScript types for the LinkShrink application.
 */

/** Shape of a row in the "links" table */
export interface LinkRow {
  id: string;           // uuid
  long_url: string;
  short_code: string;
  custom_alias?: string | null;
  user_id?: string | null;
  click_count: number;
  created_at: string;
}

/** Shape of a successful shorten response */
export interface ShortenResponse {
  id: string;
  longUrl: string;
  shortUrl: string;       // the short code
  fullShortUrl: string;   // the full URL
}

/** Click analytics row */
export interface ClickRow {
  id: number;
  link_id: string;
  timestamp: string;
  country: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  referrer: string | null;
  is_unique: boolean;
  visitor_hash: string | null;
  ip_hash: string | null;
  created_at: string;
}

/** Payload sent to /api/track */
export interface TrackPayload {
  short_code: string;
  link_id: string;
  user_agent: string;
  ip: string;
  referrer: string;
  country?: string;
  city?: string;
}

/** Analytics summary returned by /api/analytics/[linkId] */
export interface AnalyticsSummary {
  total_clicks: number;
  unique_clicks: number;
  clicks_over_time: { day: string; clicks: number }[];
  top_countries: { country: string; clicks: number }[];
  top_referrers: { referrer: string; clicks: number }[];
  device_breakdown: { device: string; clicks: number }[];
  browser_breakdown: { browser: string; clicks: number }[];
  recent_clicks: ClickRow[];
}
