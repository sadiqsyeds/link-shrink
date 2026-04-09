-- ============================================================
-- LinkShrink — Full Analytics Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── links table (updated) ────────────────────────────────────
create table if not exists public.links (
  id          uuid primary key default gen_random_uuid(),
  short_code  text unique not null,
  long_url    text not null,
  custom_alias text unique,           -- only for auth'd users
  user_id     uuid references auth.users(id) on delete set null,
  click_count bigint not null default 0,
  created_at  timestamptz not null default now()
);

-- ── clicks table ─────────────────────────────────────────────
create table if not exists public.clicks (
  id            bigserial primary key,
  link_id       uuid not null references public.links(id) on delete cascade,
  timestamp     timestamptz not null default now(),
  country       text,
  city          text,
  device        text,        -- mobile | desktop | tablet
  browser       text,
  os            text,
  referrer      text,
  is_unique     boolean not null default false,
  visitor_hash  text,        -- SHA-256(ip + ua) — no raw IP stored
  ip_hash       text,        -- SHA-256(ip) alone for dedup
  created_at    timestamptz not null default now()
);

-- ── Indexes ───────────────────────────────────────────────────
create index if not exists idx_links_short_code  on public.links(short_code);
create index if not exists idx_links_user_id     on public.links(user_id);
create index if not exists idx_clicks_link_id    on public.clicks(link_id);
create index if not exists idx_clicks_timestamp  on public.clicks(timestamp);
create index if not exists idx_clicks_link_ts    on public.clicks(link_id, timestamp);
create index if not exists idx_clicks_visitor    on public.clicks(visitor_hash);

-- ── RLS ───────────────────────────────────────────────────────
alter table public.links  enable row level security;
alter table public.clicks enable row level security;

-- Links: anyone can read (needed for redirect lookup)
create policy "links_select_all"
  on public.links for select using (true);

-- Links: anyone can insert (anon shortening)
create policy "links_insert_all"
  on public.links for insert with check (true);

-- Links: only owner can update/delete their own links
create policy "links_update_own"
  on public.links for update using (auth.uid() = user_id);

create policy "links_delete_own"
  on public.links for delete using (auth.uid() = user_id);

-- Clicks: service role (API route) can insert
create policy "clicks_insert_all"
  on public.clicks for insert with check (true);

-- Clicks: users can read clicks for their own links
create policy "clicks_select_own"
  on public.clicks for select
  using (
    exists (
      select 1 from public.links
      where links.id = clicks.link_id
        and links.user_id = auth.uid()
    )
  );

-- ── RPC: increment click count ────────────────────────────────
create or replace function public.increment_click_count(p_short_code text)
returns void
language plpgsql
security definer
as $$
begin
  update public.links
  set click_count = click_count + 1
  where short_code = p_short_code;
end;
$$;

-- ── Materialized view: daily click stats ─────────────────────
create materialized view if not exists public.daily_click_stats as
select
  link_id,
  date_trunc('day', timestamp) as day,
  count(*)                     as total_clicks,
  count(*) filter (where is_unique) as unique_clicks
from public.clicks
group by link_id, date_trunc('day', timestamp);

create unique index if not exists idx_daily_stats_link_day
  on public.daily_click_stats(link_id, day);

-- Refresh function (call from a cron job or after inserts)
create or replace function public.refresh_daily_stats()
returns void language plpgsql security definer as $$
begin
  refresh materialized view concurrently public.daily_click_stats;
end;
$$;
