# LinkShrink — Technical Documentation

<!-- SECTION: TOC -->
## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Database Schema](#4-database-schema)
5. [TypeScript Types](#5-typescript-types)
6. [API Reference](#6-api-reference)
7. [Authentication](#7-authentication)
8. [Redirect & Caching](#8-redirect--caching)
9. [Analytics Pipeline](#9-analytics-pipeline)
10. [Frontend Components](#10-frontend-components)
11. [Utility Libraries](#11-utility-libraries)
12. [Environment Variables](#12-environment-variables)
13. [Data Flow Diagrams](#13-data-flow-diagrams)
14. [Security Considerations](#14-security-considerations)

---

<!-- SECTION: 1 -->
## 1. Project Overview

**LinkShrink** is a full-stack URL shortening web application built with Next.js 15 and Supabase. It allows both anonymous and authenticated users to shorten long URLs, share them via QR codes and social media, and (for authenticated users) track click analytics with geographic, device, and referrer breakdowns.

### Core Capabilities

| Feature | Anonymous | Authenticated |
|---|---|---|
| Shorten URLs | ✅ | ✅ |
| Custom alias | ❌ | ✅ |
| QR Code generation | ✅ | ✅ |
| Share to Twitter / LinkedIn | ✅ | ✅ |
| View click analytics | ❌ | ✅ |
| Dashboard with link history | ❌ | ✅ |

### Key Design Decisions

- **Zero-latency redirects** — short URL resolution uses an in-process LRU cache (1-minute TTL) so most redirects never hit the database.
- **Fire-and-forget analytics** — analytics ingestion (`POST /api/track`) is called non-blocking (`keepalive: true`) after the `307` redirect is already sent to the user.
- **Privacy-first analytics** — raw IPs are never stored; only SHA-256 hashes of `ip` and `ip + user-agent` are persisted.
- **Deduplication** — if an anonymous user shortens the same URL twice, the existing record is returned rather than creating a duplicate.
- **Bot filtering** — a regex list of ~20 known bot user-agents prevents bots from inflating click counts at both the redirect and track layers.

<!-- SECTION: 2 -->
## 2. Technology Stack

### Runtime & Framework

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 15.0.7 |
| Runtime | React | 19.2.4 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS | ^3.4.1 |

### Backend & Database

| Layer | Technology | Version |
|---|---|---|
| Database | Supabase (PostgreSQL) | — |
| Supabase JS client | `@supabase/supabase-js` | ^2.101.1 |
| Supabase SSR helpers | `@supabase/ssr` | ^0.10.0 |
| Short code generation | `nanoid` | ^5.1.7 |

### Frontend Libraries

| Library | Purpose | Version |
|---|---|---|
| `framer-motion` | Animations / transitions | ^11.18.2 |
| `qrcode.react` | QR code rendering (canvas) | ^4.2.0 |
| `recharts` | Analytics charts | ^3.8.1 |
| `ua-parser-js` | User-agent parsing | ^2.0.9 |

<!-- SECTION: 3 -->
## 3. Project Structure

```
link-shrink/
├── app/
│   ├── [shortUrl]/
│   │   └── route.ts          # Dynamic redirect handler (GET /:shortCode)
│   ├── api/
│   │   ├── short/
│   │   │   └── route.ts      # POST /api/short — URL shortening
│   │   ├── track/
│   │   │   └── route.ts      # POST /api/track — analytics ingestion
│   │   └── analytics/
│   │       └── [linkId]/
│   │           └── route.ts  # GET /api/analytics/:linkId — analytics query
│   ├── auth/
│   │   ├── actions.ts        # Server Actions: signUp, signIn, signOut
│   │   ├── login/page.tsx    # Login page UI
│   │   └── signup/page.tsx   # Sign-up page UI
│   ├── dashboard/
│   │   ├── page.tsx          # Server component — fetches user's links
│   │   ├── DashboardClient.tsx # Client component — renders links table
│   │   ├── AnalyticsPanel.tsx  # Client component — renders analytics charts
│   │   └── SignOutButton.tsx   # Sign out button
│   ├── types/
│   │   └── index.ts          # Shared TypeScript interfaces
│   ├── globals.css           # Global styles + CSS variables
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Home page
├── components/
│   ├── Hero.tsx              # Landing page hero section
│   ├── Navbar.tsx            # Top navigation bar
│   ├── Footer.tsx            # Footer
│   ├── UrlShortener.tsx      # Main shortening form + result display
│   ├── ResultCard.tsx        # Shortened link result card (QR, share, copy)
│   ├── RecentLinks.tsx       # Recent links stored in localStorage
│   └── ThemeToggle.tsx       # Dark/light mode toggle
├── lib/
│   ├── db.ts                 # Supabase client singleton
│   └── utils.ts              # URL validation, normalisation, buildShortUrl
├── utils/supabase/
│   ├── client.ts             # Browser Supabase client
│   ├── server.ts             # Server-side Supabase client (cookies)
│   └── middleware.ts         # Middleware Supabase client
├── supabase/
│   └── schema.sql            # Full PostgreSQL schema (run in Supabase SQL Editor)
├── .env.example              # Template for required environment variables
└── next.config.ts            # Next.js config
```

<!-- SECTION: 4 -->
## 4. Database Schema

The database is hosted on Supabase (PostgreSQL). The schema is defined in `supabase/schema.sql`.

### Tables

#### `public.links`

Stores every shortened URL.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Unique identifier |
| `short_code` | `text` | UNIQUE, NOT NULL | The short code used in the URL |
| `long_url` | `text` | NOT NULL | The original destination URL |
| `custom_alias` | `text` | UNIQUE, nullable | Human-readable alias (authenticated users only) |
| `user_id` | `uuid` | FK → `auth.users(id)` ON DELETE SET NULL | Owner (null for anonymous) |
| `click_count` | `bigint` | NOT NULL, default `0` | Denormalized total click count |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Creation timestamp |

#### `public.clicks`

Stores every click event for analytics.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `bigserial` | PK | Auto-increment ID |
| `link_id` | `uuid` | FK → `links(id)` ON DELETE CASCADE | Parent link |
| `timestamp` | `timestamptz` | NOT NULL, default `now()` | Click timestamp |
| `country` | `text` | nullable | ISO country code |
| `city` | `text` | nullable | City name |
| `device` | `text` | nullable | `mobile` \| `tablet` \| `desktop` |
| `browser` | `text` | nullable | Browser name (from UA parser) |
| `os` | `text` | nullable | OS name (from UA parser) |
| `referrer` | `text` | nullable | Cleaned referrer URL (no query params) |
| `is_unique` | `boolean` | NOT NULL, default `false` | True if first visit in 24h window |
| `visitor_hash` | `text` | nullable | SHA-256(`ip + user-agent`) |
| `ip_hash` | `text` | nullable | SHA-256(`ip`) |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Insert timestamp |

### Indexes

| Index | Table | Columns | Purpose |
|---|---|---|---|
| `idx_links_short_code` | `links` | `short_code` | Fast redirect lookup |
| `idx_links_user_id` | `links` | `user_id` | Dashboard queries |
| `idx_clicks_link_id` | `clicks` | `link_id` | Analytics queries |
| `idx_clicks_timestamp` | `clicks` | `timestamp` | Time-range queries |
| `idx_clicks_link_ts` | `clicks` | `(link_id, timestamp)` | Combined analytics queries |
| `idx_clicks_visitor` | `clicks` | `visitor_hash` | Unique visitor dedup |

### Row-Level Security (RLS)

| Policy | Table | Operation | Rule |
|---|---|---|---|
| `links_select_all` | `links` | SELECT | Everyone (needed for redirect) |
| `links_insert_all` | `links` | INSERT | Everyone (anon shortening) |
| `links_update_own` | `links` | UPDATE | `auth.uid() = user_id` |
| `links_delete_own` | `links` | DELETE | `auth.uid() = user_id` |
| `clicks_insert_all` | `clicks` | INSERT | Everyone (API route inserts) |
| `clicks_select_own` | `clicks` | SELECT | Owner of the parent link |

### Functions & Views

#### `public.increment_click_count(p_short_code text)`
An atomic `SECURITY DEFINER` RPC function that increments `click_count` on the `links` table. Called by `/api/track` after recording a click row.

#### Materialized View: `public.daily_click_stats`
Pre-aggregates clicks grouped by `(link_id, day)` with `total_clicks` and `unique_clicks`. Refreshed via `public.refresh_daily_stats()`.

```sql
SELECT
  link_id,
  date_trunc('day', timestamp) AS day,
  count(*)                     AS total_clicks,
  count(*) FILTER (WHERE is_unique) AS unique_clicks
FROM public.clicks
GROUP BY link_id, date_trunc('day', timestamp);
```

<!-- SECTION: 5 -->
## 5. TypeScript Types

All shared types live in `app/types/index.ts`.

### `LinkRow`
Maps directly to a row in the `public.links` table.
```ts
interface LinkRow {
  id: string;           // uuid
  long_url: string;
  short_code: string;
  custom_alias?: string | null;
  user_id?: string | null;
  click_count: number;
  created_at: string;
}
```

### `ShortenResponse`
Returned by `POST /api/short` on success.
```ts
interface ShortenResponse {
  id: string;
  longUrl: string;
  shortUrl: string;       // the short code only
  fullShortUrl: string;   // full URL e.g. https://linkshrink.app/abc12345
}
```

### `ClickRow`
Maps to a row in `public.clicks`.
```ts
interface ClickRow {
  id: number;
  link_id: string;
  timestamp: string;
  country: string | null;
  city: string | null;
  device: string | null;    // "mobile" | "tablet" | "desktop"
  browser: string | null;
  os: string | null;
  referrer: string | null;
  is_unique: boolean;
  visitor_hash: string | null;
  ip_hash: string | null;
  created_at: string;
}
```

### `TrackPayload`
Body sent from the redirect route to `POST /api/track`.
```ts
interface TrackPayload {
  short_code: string;
  link_id: string;
  user_agent: string;
  ip: string;
  referrer: string;
  country?: string;
  city?: string;
}
```

### `AnalyticsSummary`
Response shape from `GET /api/analytics/:linkId`.
```ts
interface AnalyticsSummary {
  total_clicks: number;
  unique_clicks: number;
  clicks_over_time: { day: string; clicks: number }[];
  top_countries:    { country: string; clicks: number }[];
  top_referrers:    { referrer: string; clicks: number }[];
  device_breakdown: { device: string; clicks: number }[];
  browser_breakdown:{ browser: string; clicks: number }[];
  recent_clicks: ClickRow[];
}
```

<!-- SECTION: 6 -->
## 6. API Reference

### `POST /api/short` — Shorten a URL

**File:** `app/api/short/route.ts`

**Request body:**
```json
{
  "longUrl": "https://example.com/very/long/path",
  "customAlias": "my-brand"   // optional, authenticated users only
}
```

**Processing steps:**
1. Validate and normalise the URL (must be `http://` or `https://`).
2. Optionally resolve the caller's Supabase session to get `userId`.
3. If `customAlias` provided but user is not authenticated → `401`.
4. Validate alias format: `/^[a-zA-Z0-9_-]{3,32}$/`; reject reserved paths (`api`, `auth`, `dashboard`, `login`, `signup`, `logout`).
5. **Deduplication** (no alias only): if the same `long_url` already exists with no alias, return the existing record (`200`).
6. Check alias uniqueness against both `short_code` and `custom_alias` columns → `409` if taken.
7. Generate `shortCode = customAlias ?? nanoid(8)`, insert row, return `201`.

**Success response (`201`):**
```json
{
  "id": "uuid",
  "longUrl": "https://example.com/very/long/path",
  "shortUrl": "abc12345",
  "fullShortUrl": "https://linkshrink.app/abc12345"
}
```

**Error responses:**

| Status | Condition |
|---|---|
| `400` | Invalid JSON, missing/invalid URL, bad alias format |
| `401` | Custom alias requested but user not signed in |
| `405` | GET request |
| `409` | Custom alias already taken |
| `500` | Database error |

---

### `GET /:shortCode` — Redirect

**File:** `app/[shortUrl]/route.ts`

Resolves the short code and returns a `307 Temporary Redirect`. See [Section 8](#8-redirect--caching) for full details.

---

### `POST /api/track` — Record a Click

**File:** `app/api/track/route.ts`

**Called internally** (fire-and-forget from the redirect route). Not a public-facing endpoint.

**Request body:** `TrackPayload`
```json
{
  "short_code": "abc12345",
  "link_id": "uuid",
  "user_agent": "Mozilla/5.0 ...",
  "ip": "1.2.3.4",
  "referrer": "https://twitter.com/",
  "country": "IN",
  "city": "Bengaluru"
}
```

**Processing:** Parses UA → determines device/browser/OS → hashes IP → checks uniqueness (24h window) → inserts click row → calls `increment_click_count` RPC.

**Success response (`200`):**
```json
{ "ok": true, "unique": true }
```

---

### `GET /api/analytics/:linkId` — Analytics Summary

**File:** `app/api/analytics/[linkId]/route.ts`

**Auth required:** Yes. The requesting user must own the link.

**Response:** `AnalyticsSummary`

Runs 8 Supabase queries in parallel via `Promise.all`:
- Total click count
- Unique click count
- Timestamps for last 30 days (aggregated into daily buckets by the API)
- Country distribution (top 10)
- Referrer distribution (top 10)
- Device breakdown (top 10)
- Browser breakdown (top 10)
- 10 most recent click rows

**Error responses:**

| Status | Condition |
|---|---|
| `400` | Missing `linkId` |
| `401` | Not authenticated |
| `403` | Link exists but owned by another user |
| `404` | Link not found |

<!-- SECTION: 7 -->
## 7. Authentication

LinkShrink uses **Supabase Auth** (email + password) via the `@supabase/ssr` package for cookie-based session management in Next.js App Router.

### Supabase Client Variants

| File | Usage | Cookie access |
|---|---|---|
| `utils/supabase/client.ts` | Browser components (`"use client"`) | `localStorage` / cookies (browser) |
| `utils/supabase/server.ts` | Server components & API routes | `cookies()` from `next/headers` |
| `utils/supabase/middleware.ts` | Next.js middleware | Request cookies, refreshes session |
| `lib/db.ts` | API routes (data operations) | Anon key, no user context |

### Server Actions (`app/auth/actions.ts`)

All auth mutations are Next.js **Server Actions** (marked `"use server"`):

| Action | Description |
|---|---|
| `signUp(formData)` | Calls `supabase.auth.signUp({ email, password })`; on success redirects to `/auth/login?message=...` for email confirmation. On error redirects back to signup with `?error=`. |
| `signIn(formData)` | Calls `supabase.auth.signInWithPassword({ email, password })`; on success redirects to `/dashboard`. |
| `signOut()` | Calls `supabase.auth.signOut()`; redirects to `/`. |

### Session Flow

```
Browser → Login form → signIn() Server Action
  → supabase.auth.signInWithPassword()
  → Supabase sets session cookie
  → redirect("/dashboard")
  → Dashboard page reads cookie via createServerClient
  → Renders user's links
```

### Auth Guards in API Routes

API routes that require authentication (e.g., custom alias, analytics) use the server client:
```ts
const cookieStore = await cookies();
const authClient = createServerClient(cookieStore);
const { data: { user } } = await authClient.auth.getUser();
if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
```

### Auth Guards in UI

The `UrlShortener` component subscribes to auth state changes at mount:
```ts
supabase.auth.onAuthStateChange((_e, session) => {
  setIsAuthed(!!session?.user);
});
```
This reactively shows/hides the custom alias input field without a page reload.

<!-- SECTION: 8 -->
## 8. Redirect & Caching

**File:** `app/[shortUrl]/route.ts`

### Request Flow

```
GET /:shortCode
  │
  ├─ 1. Check in-process cache (globalThis._lsCache)
  │       hit  → use cached { id, longUrl }
  │       miss → query Supabase: links WHERE short_code = :shortCode
  │                └─ not found → 404
  │                └─ found    → store in cache (TTL 60s)
  │
  ├─ 2. Validate the stored longUrl is http/https → 500 if not
  │
  ├─ 3. Bot detection (User-Agent regex)
  │       is bot → skip analytics
  │       not bot → fire-and-forget POST /api/track (keepalive: true)
  │
  └─ 4. Return NextResponse.redirect(longUrl, { status: 307 })
```

### In-Process Cache

The cache is stored on `globalThis._lsCache` (a `Map<string, CacheEntry>`) to survive Next.js hot reloads in development. Each entry holds:

```ts
interface CacheEntry {
  id: string;       // link UUID (needed for tracking)
  longUrl: string;  // destination URL
  expiresAt: number; // Date.now() + 60_000 ms
}
```

Cache entries are lazily expired on read (if `Date.now() > expiresAt`, the entry is deleted and a fresh DB query is made).

### Why `307` (Temporary Redirect)?

`307` is used instead of `301` to ensure browsers always revalidate the short URL with the server, maintaining analytics accuracy and allowing future URL changes. `301` would cause browsers to cache the redirect permanently and bypass the server on repeat visits.

### Geographic Data Extraction

Country and city are extracted from edge-layer headers before the fire-and-forget call:
- `x-vercel-ip-country` / `cf-ipcountry` → country
- `x-vercel-ip-city` / `cf-ipcity` → city

IP is extracted from `x-forwarded-for` (first IP in list) or `x-real-ip`.

<!-- SECTION: 9 -->
## 9. Analytics Pipeline

**File:** `app/api/track/route.ts`

### Ingestion Steps

```
POST /api/track (fire-and-forget, keepalive: true)
  │
  ├─ 1. Parse JSON body → TrackPayload
  ├─ 2. Secondary bot guard (User-Agent regex) → early 200 if bot
  │
  ├─ 3. UA Parsing (ua-parser-js)
  │       → device: "mobile" | "tablet" | "desktop"
  │       → browser: "Chrome", "Safari", etc.
  │       → os: "Windows", "iOS", etc.
  │
  ├─ 4. Privacy hashing (Node crypto)
  │       ip_hash      = SHA-256(ip)
  │       visitor_hash = SHA-256(ip + "::" + user_agent)
  │
  ├─ 5. Uniqueness check
  │       SELECT count FROM clicks
  │         WHERE link_id = :link_id
  │           AND visitor_hash = :visitor_hash
  │           AND timestamp >= now() - 24h
  │       is_unique = (count === 0)
  │
  ├─ 6. Referrer sanitization
  │       Strip query params: keep only protocol + host + pathname
  │
  ├─ 7. INSERT into public.clicks
  │
  └─ 8. RPC: increment_click_count(short_code)
           → UPDATE links SET click_count = click_count + 1
```

### Unique Visitor Logic

A visitor is considered "unique" for a given link if no row exists in `clicks` with the same `visitor_hash` within the past 24 hours. This provides a reasonable privacy-preserving approximation of unique visitors without cookies or persistent identifiers.

### Analytics Query (Dashboard)

When a user opens the analytics panel for a link, the client calls `GET /api/analytics/:linkId`, which runs 8 queries in parallel:

| Query | Data |
|---|---|
| Total count | `SELECT count(*) FROM clicks WHERE link_id = ?` |
| Unique count | `SELECT count(*) FROM clicks WHERE link_id = ? AND is_unique = true` |
| Over time | Timestamps for last 30 days, grouped by day in application layer |
| Countries | All `country` values → top 10 by frequency |
| Referrers | All `referrer` values → top 10 by frequency |
| Devices | All `device` values → top 10 by frequency |
| Browsers | All `browser` values → top 10 by frequency |
| Recent | Last 10 click rows ordered by `created_at DESC` |

<!-- SECTION: 10 -->
## 10. Frontend Components

### `UrlShortener` (`components/UrlShortener.tsx`)

The primary user-facing form. Client component (`"use client"`).

**State:**
| State | Type | Purpose |
|---|---|---|
| `url` | `string` | Current URL input value |
| `alias` | `string` | Custom alias input (auth'd users only) |
| `status` | `"idle" \| "loading" \| "success" \| "error"` | Form state machine |
| `result` | `ShortenResponse \| null` | Successful shorten result |
| `errorMessage` | `string` | Error text to display |
| `isAuthed` | `boolean` | Whether user is signed in |

**Key behaviours:**
- **Clipboard paste button** — appears in the URL input when empty; reads clipboard via `navigator.clipboard.readText()` and populates the field.
- **Clear button** — appears when URL field has text; resets input and status.
- **Custom alias row** — animated with `framer-motion`, only shown when `isAuthed = true`.
- On submit: calls `POST /api/short`, saves result to `localStorage` via `saveToRecent()`, dispatches `linkshrink:saved` event.

---

### `ResultCard` (`components/ResultCard.tsx`)

Displays the shortened URL result with actions.

**Sub-components:**
| Component | Purpose |
|---|---|
| `SuccessHeader` | Green checkmark + "Link shortened successfully!" |
| `UrlRow` | Short URL link + Copy button (clipboard icon → checkmark on copied) |
| `OriginalUrl` | Truncated display of the original long URL |
| `ActionBar` | QR toggle, Twitter share, LinkedIn share, native share button |
| QR Panel | Animated expand/collapse; renders `<QRCodeCanvas>` at 160×160px |

**Sharing:**
- **Copy** — writes `fullShortUrl` to clipboard; shows "Copied!" for 2s.
- **QR Code** — toggle panel; download as PNG via canvas `toDataURL`.
- **Twitter** — opens `twitter.com/intent/tweet?url=...` in new tab.
- **LinkedIn** — opens `linkedin.com/sharing/share-offsite/?url=...` in new tab.
- **Native Share** — `navigator.share()` with QR file if supported, falls back to URL share, then clipboard copy.

---

### `DashboardClient` (`app/dashboard/DashboardClient.tsx`)

Renders the authenticated user's link management UI.

**Features:**
- **Stat cards** — Total links, total clicks, custom aliases count.
- **Links table** — Each row shows short URL (with "custom" badge if aliased), original URL, click count, copy button, analytics toggle.
- **Analytics panel** — Inline `<AnalyticsPanel>` expands below the selected link row.

---

### `AnalyticsPanel` (`app/dashboard/AnalyticsPanel.tsx`)

Fetches and renders analytics for a selected link. Calls `GET /api/analytics/:linkId` on mount.

**Charts rendered (via `recharts`):**
- Line chart: clicks over time (last 30 days)
- Bar chart or list: top countries
- Device breakdown
- Browser breakdown
- Top referrers
- Recent 10 clicks table

---

### `RecentLinks` (`components/RecentLinks.tsx`)

Reads recent shortened links from `localStorage` (key: `linkshrink_recent`) and displays them. Updates reactively on the custom `linkshrink:saved` window event. Stores up to the most recent N entries.

---

### `Navbar` (`components/Navbar.tsx`)
Top navigation with brand logo, theme toggle, and auth-conditional links (Login / Dashboard).

### `ThemeToggle` (`components/ThemeToggle.tsx`)
Toggles `dark` class on `<html>`. Persists preference to `localStorage`.

<!-- SECTION: 11 -->
## 11. Utility Libraries

### `lib/db.ts` — Supabase Singleton

Creates and caches a single `SupabaseClient` on `globalThis` using the anon public key. This client is used for all data operations in API routes (not for auth, which uses the SSR client with session cookies).

```ts
export const supabase: SupabaseClient =
  globalForSupabase.supabase ??
  (globalForSupabase.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY));
```

Also exports `dbErrorMessage(err)` which maps common PostgreSQL/Supabase error codes to user-friendly strings:

| Code / pattern | Message |
|---|---|
| `ECONNREFUSED` / `fetch failed` | Cannot reach the database |
| `Invalid API key` / `JWT` | Invalid API key |
| PostgreSQL `23505` | Duplicate short code |
| PostgreSQL `42P01` | Table not found (schema not run) |
| `timeout` | Request timed out |

---

### `lib/utils.ts` — URL Helpers

| Function | Signature | Description |
|---|---|---|
| `isValidUrl` | `(value: unknown) => value is string` | Returns `true` only if value is a non-empty string that parses as an absolute `http:` or `https:` URL. Used to prevent open-redirect attacks. |
| `normaliseUrl` | `(raw: string) => string` | Trims whitespace, lower-cases scheme + host, preserves path/query/hash casing. Ensures consistent deduplication in the database. |
| `buildShortUrl` | `(shortCode: string) => string` | Prepends `NEXT_PUBLIC_BASE_URL` (or `http://localhost:3000`) to the short code. Used everywhere a full URL is needed. |

<!-- SECTION: 12 -->
## 12. Environment Variables

Copy `.env.example` to `.env.local` and fill in the values before running the app.

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL (`https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | ✅ | Supabase anon/publishable key (safe for browser) |
| `NEXT_PUBLIC_BASE_URL` | ✅ | Public base URL of the app (e.g. `https://linkshrink.app`). Used to construct full short URLs and fire-and-forget analytics calls. |

> **Note:** The `NEXT_PUBLIC_` prefix exposes variables to the browser bundle. Never store secret keys with this prefix. The Supabase **service role key** (if needed for admin tasks) must be stored as a server-only variable without the `NEXT_PUBLIC_` prefix.

### Getting Supabase credentials

1. Go to [supabase.com](https://supabase.com) → your project
2. **Settings → API**
3. Copy **Project URL** and **anon / public** key
4. Run `supabase/schema.sql` in the SQL Editor to create tables and policies

<!-- SECTION: 13 -->
## 13. Data Flow Diagrams

### Flow 1 — Shortening a URL

```
User types URL → UrlShortener (client)
  │
  └─ POST /api/short
       ├─ Validate URL (isValidUrl + normaliseUrl)
       ├─ Resolve auth session (optional)
       ├─ Dedup check (if no alias)
       ├─ Alias uniqueness check (if alias)
       ├─ INSERT links row
       └─ Return ShortenResponse
            │
            └─ ResultCard renders:
                 ├─ Short URL + copy button
                 ├─ QR code
                 └─ Share buttons
```

### Flow 2 — Clicking a Short URL

```
Browser → GET /:shortCode (Next.js Route Handler)
  │
  ├─ Cache hit? → use { id, longUrl }
  │   Cache miss → SELECT FROM links WHERE short_code = ?
  │                  └─ 404 if not found
  │
  ├─ Bot? → skip tracking
  │
  ├─ 307 Redirect → longUrl (user arrives at destination)
  │
  └─ (async, non-blocking) POST /api/track
       ├─ Parse UA → device / browser / os
       ├─ Hash IP → ip_hash, visitor_hash
       ├─ Check uniqueness (24h window)
       ├─ INSERT clicks row
       └─ RPC increment_click_count
```

### Flow 3 — Viewing Analytics

```
Dashboard → user clicks analytics icon on a link
  │
  └─ GET /api/analytics/:linkId
       ├─ Auth check (must own link)
       ├─ Promise.all → 8 parallel Supabase queries
       └─ Return AnalyticsSummary
            │
            └─ AnalyticsPanel renders:
                 ├─ Clicks over time (line chart)
                 ├─ Countries (bar/list)
                 ├─ Devices (breakdown)
                 ├─ Browsers (breakdown)
                 ├─ Referrers (list)
                 └─ Recent clicks (table)
```

### Flow 4 — Authentication

```
/auth/signup or /auth/login
  │
  └─ Server Action (signUp / signIn)
       ├─ supabase.auth.signUp / signInWithPassword
       ├─ Supabase sets HttpOnly session cookie
       └─ redirect("/dashboard")
            │
            └─ Dashboard page (server component)
                 ├─ createServerClient reads cookie
                 ├─ getUser() → userId
                 └─ SELECT * FROM links WHERE user_id = userId
```

<!-- SECTION: 14 -->
## 14. Security Considerations

### Open Redirect Prevention
All redirect targets are validated with `isValidUrl()` before being stored **and again** before the redirect is issued. Only `http:` and `https:` protocols are permitted; `javascript:`, `data:`, and other schemes are rejected at both insertion and redirect time.

### URL Normalisation
`normaliseUrl()` lower-cases the scheme and host to prevent trivial bypass attempts like `HTTP://EXAMPLE.COM` vs `http://example.com` creating two separate records.

### Custom Alias Sanitisation
Aliases are validated against `/^[a-zA-Z0-9_-]{3,32}$/` and checked against a reserved-paths blocklist (`api`, `auth`, `dashboard`, `login`, `signup`, `logout`) to prevent route hijacking.

### IP Privacy
Raw IP addresses are **never persisted**. Only SHA-256 hashes are stored:
- `ip_hash = SHA-256(ip)` — used if future dedup by IP alone is needed
- `visitor_hash = SHA-256(ip + "::" + user_agent)` — used for 24h uniqueness window

SHA-256 is a one-way hash; the original IP cannot be recovered from the stored value.

### Referrer Privacy
Query parameters are stripped from the referrer URL before storage to avoid leaking sensitive tokens (e.g., `?token=...`) that may appear in referrer headers.

### Bot Filtering
A dual-layer bot filter is applied:
1. **Redirect layer** (`app/[shortUrl]/route.ts`) — bot requests skip the fire-and-forget analytics call entirely.
2. **Track layer** (`app/api/track/route.ts`) — secondary check guards against direct calls to `/api/track`.

### Row-Level Security (RLS)
All Supabase tables have RLS enabled. Users can only read analytics for links they own. Unauthenticated users can insert links and clicks (by design) but cannot modify or delete any data.

### Auth Security
- Session management is handled entirely by Supabase Auth (JWT + refresh tokens in HttpOnly cookies via `@supabase/ssr`).
- Server Actions are used for auth mutations — form submissions never expose credentials to client-side JavaScript beyond the form element.
- The analytics API verifies link ownership server-side before returning any data (`link.user_id !== userId` → 403).

### Supabase Client Key Usage
The publicly exposed `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (anon key) is safe to use in the browser because RLS policies enforce data access rules at the database layer. The service role key (bypasses RLS) is never used in this codebase and should never be added to a `NEXT_PUBLIC_` variable.

### Deduplication Race Condition
The deduplication check (select existing before insert) is not atomic — two simultaneous requests for the same URL could both pass and insert duplicates. The `short_code` UNIQUE constraint on the `links` table acts as the final safety net; only one insert will succeed, and the other will receive a `23505` duplicate key error, which is caught and returned as a friendly message.

---

*Document generated from source: `TECHNICAL.md` — last updated with project state as of v0.1.0*
