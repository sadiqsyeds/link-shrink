-- ============================================================
-- LinkShrink — Analytics Upgrade (Vercel Free Tier Optimized)
-- Run this in Supabase SQL Editor AFTER schema.sql
-- Safe: does NOT modify existing tables (links, clicks)
-- ============================================================

-- ── New Indexes (safe to add; improve query speed) ──────────
CREATE INDEX IF NOT EXISTS idx_clicks_link_country
  ON public.clicks(link_id, country);

CREATE INDEX IF NOT EXISTS idx_clicks_link_device
  ON public.clicks(link_id, device);

CREATE INDEX IF NOT EXISTS idx_clicks_link_referrer
  ON public.clicks(link_id, referrer);

CREATE INDEX IF NOT EXISTS idx_clicks_link_browser
  ON public.clicks(link_id, browser);

-- ── Materialized View: hourly_click_stats ───────────────────
-- Used by analytics API when granularity=hour
CREATE MATERIALIZED VIEW IF NOT EXISTS public.hourly_click_stats AS
SELECT
  link_id,
  date_trunc('hour', timestamp)              AS hour,
  count(*)                                   AS total_clicks,
  count(*) FILTER (WHERE is_unique)          AS unique_clicks
FROM public.clicks
GROUP BY link_id, date_trunc('hour', timestamp);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hourly_stats_link_hour
  ON public.hourly_click_stats(link_id, hour);

-- ── Materialized View: country_stats ───────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS public.country_stats AS
SELECT
  link_id,
  coalesce(country, 'Unknown') AS country,
  count(*)                     AS clicks
FROM public.clicks
GROUP BY link_id, coalesce(country, 'Unknown');

CREATE UNIQUE INDEX IF NOT EXISTS idx_country_stats_link_country
  ON public.country_stats(link_id, country);

-- ── Materialized View: device_stats ────────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS public.device_stats AS
SELECT
  link_id,
  coalesce(device, 'Unknown') AS device,
  count(*)                    AS clicks
FROM public.clicks
GROUP BY link_id, coalesce(device, 'Unknown');

CREATE UNIQUE INDEX IF NOT EXISTS idx_device_stats_link_device
  ON public.device_stats(link_id, device);

-- ── Materialized View: referrer_stats ──────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS public.referrer_stats AS
SELECT
  link_id,
  coalesce(referrer, 'direct') AS referrer,
  count(*)                     AS clicks
FROM public.clicks
GROUP BY link_id, coalesce(referrer, 'direct');

CREATE UNIQUE INDEX IF NOT EXISTS idx_referrer_stats_link_referrer
  ON public.referrer_stats(link_id, referrer);

-- ── Refresh function: refresh all analytics views ───────────
-- Call this from a Vercel cron (once per hour max) or on-demand
CREATE OR REPLACE FUNCTION public.refresh_analytics_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.daily_click_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.hourly_click_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.country_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.device_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.referrer_stats;
END;
$$;

-- ── Optional: cleanup old raw clicks (>90 days) ─────────────
-- Call from /api/admin/cleanup (manual or daily cron)
CREATE OR REPLACE FUNCTION public.cleanup_old_clicks(days_to_keep integer DEFAULT 90)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count bigint;
BEGIN
  DELETE FROM public.clicks
  WHERE timestamp < now() - (days_to_keep || ' days')::interval;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
