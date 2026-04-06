# ⚡ LinkShrink — Modern URL Shortener

> A fast, free, and beautifully designed URL shortener built with Next.js 15, Supabase, and Framer Motion.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?logo=supabase)](https://supabase.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Supabase Setup](#-supabase-setup)
- [API Reference](#-api-reference)
- [Deployment](#-deployment)
- [Project Structure](#-project-structure)

---

## 🌟 Overview

LinkShrink takes any long URL and returns a short, shareable link in milliseconds. Visit the short link and you're instantly redirected to the original. No account needed.

```
https://very-long-website.com/some/deep/nested/path?with=query&params=too
                              ↓
              http://localhost:3000/aB3x9kLm
```

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| ⚡ **Instant shortening** | Short codes generated with nanoid in milliseconds |
| 🔁 **Smart deduplication** | Same long URL always returns the same short code |
| 📋 **One-click copy** | Copy the short URL to clipboard with visual feedback |
| 🕐 **Recent links** | Last 5 shortened links persisted in localStorage |
| 🌙 **Dark / Light mode** | Manual toggle + system preference fallback |
| 📊 **Click tracking** | Each redirect atomically increments a click counter |
| 🔐 **Secure redirects** | Only valid `http://` / `https://` targets are stored and followed |
| 📱 **Fully responsive** | Mobile-first, works on all screen sizes |
| ♿ **Accessible** | Proper ARIA labels, focus states, keyboard navigation |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 15](https://nextjs.org) (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 |
| Animations | Framer Motion 11 |
| Database | [Supabase](https://supabase.com) (PostgreSQL) |
| DB Client | `@supabase/supabase-js` |
| ID generation | nanoid |
| Font | Geist (local, variable) |
| Deployment | Vercel / any Node.js host |

---

## 🏗 Architecture

```
Browser
  │
  ├─ GET  /               → app/page.tsx (Server Component)
  │       └─ <UrlShortener>  (Client Component)
  │              └─ POST /api/short → app/api/short/route.ts
  │                         └─ lib/db.ts (Supabase client) → Supabase PostgreSQL
  │                                                           Table: links
  │
  └─ GET  /:shortCode     → app/[shortUrl]/route.ts
                                └─ lib/db.ts → Supabase → 301 redirect
```

**Key design decisions:**
- **Server Components** for the shell/layout (zero JS shipped for static parts)
- **Client Components** only for interactive elements (form, toggle, recent links)
- **Supabase JS client** uses the REST API internally — no connection pool management needed
- **Deduplication** — re-shortening an already-stored URL returns the existing short code
- **Click counter** — fire-and-forget atomic `increment_click_count` RPC call

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- A free [Supabase](https://supabase.com) account

### 1. Clone the repository

```bash
git clone https://github.com/sadiqsyeds/link-shrink.git
cd link-shrink
```

### 2. Install dependencies

```bash
npm install
# or
pnpm install
```

### 3. Set up Supabase

See [Supabase Setup](#-supabase-setup) below for step-by-step instructions.

### 4. Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — paste a URL and shorten it!

---

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Your Supabase anon/public API key |
| `NEXT_PUBLIC_BASE_URL` | ✅ | Public base URL of your deployment |

---

## 🟢 Supabase Setup

### Step 1 — Create a free project

1. Go to [supabase.com](https://supabase.com) and sign in / register
2. Click **New Project**
3. Give it a name (e.g. `link-shrink`), choose a region, set a database password
4. Wait ~1 minute for the project to spin up

### Step 2 — Get your API keys

1. In your project sidebar, go to **Settings → API**
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Paste them into your `.env.local`

### Step 3 — Run the setup SQL

1. In the sidebar, go to **SQL Editor**
2. Click **New Query** and paste the following SQL, then click **Run**:

```sql
-- 1. Create the links table
CREATE TABLE IF NOT EXISTS links (
  id          BIGSERIAL    PRIMARY KEY,
  long_url    TEXT         NOT NULL,
  short_code  VARCHAR(16)  NOT NULL,
  click_count BIGINT       NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT links_short_code_key UNIQUE (short_code)
);

-- 2. Indexes for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_links_short_code ON links (short_code);
CREATE        INDEX IF NOT EXISTS idx_links_long_url   ON links (long_url);

-- 3. Atomic click counter function (used by the redirect route)
CREATE OR REPLACE FUNCTION increment_click_count(p_short_code TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE links SET click_count = click_count + 1 WHERE short_code = p_short_code;
END;
$$;

-- 4. Row Level Security — allow public reads & writes via the anon key
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read"
  ON links FOR SELECT USING (true);

CREATE POLICY "Allow public insert"
  ON links FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update"
  ON links FOR UPDATE USING (true);
```

### Step 4 — Done!

Your database is ready. The `links` table structure:

```
id          BIGSERIAL   — auto-incrementing primary key
long_url    TEXT        — the original long URL
short_code  VARCHAR(16) — the 8-character nanoid (unique)
click_count BIGINT      — redirect count (default 0)
created_at  TIMESTAMPTZ — row creation time
```

---

## 📡 API Reference

### `POST /api/short` — Shorten a URL

**Request body:**
```json
{ "longUrl": "https://example.com/very/long/path" }
```

**Success — new link (201 Created):**
```json
{
  "longUrl": "https://example.com/very/long/path",
  "shortUrl": "aB3x9kLm",
  "fullShortUrl": "http://localhost:3000/aB3x9kLm"
}
```

**Success — already shortened (200 OK):**
Returns the same shape with the existing `shortUrl`.

**Error responses:**
| Status | Reason |
|--------|--------|
| `400` | Missing or invalid URL (not http/https) |
| `500` | Database error |

---

### `GET /:shortCode` — Redirect

Visiting `http://localhost:3000/aB3x9kLm` performs a **301 redirect** to the original long URL. Returns `404` JSON if the code doesn't exist.

---

## 🚢 Deployment

### Vercel (recommended — works seamlessly with Supabase)

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add environment variables in the Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_BASE_URL` → your Vercel domain (e.g. `https://link-shrink.vercel.app`)
4. Deploy ✅

### Self-hosted (Node.js)

```bash
npm run build
npm start
```

### Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 📁 Project Structure

```
link-shrink/
├── app/
│   ├── [shortUrl]/
│   │   └── route.ts          # GET /:code → 301 redirect
│   ├── api/short/
│   │   └── route.ts          # POST /api/short — shorten a URL
│   ├── fonts/                # Geist variable fonts
│   ├── types/
│   │   └── index.ts          # Shared TypeScript interfaces
│   ├── error.tsx             # Error boundary page
│   ├── globals.css           # Design tokens + Tailwind base
│   ├── layout.tsx            # Root layout + metadata + SEO
│   ├── loading.tsx           # Loading skeleton
│   ├── not-found.tsx         # 404 page
│   └── page.tsx              # Homepage (server component shell)
├── components/
│   ├── Footer.tsx            # Site footer
│   ├── Hero.tsx              # Animated headline section
│   ├── Navbar.tsx            # Fixed top navbar with glass effect
│   ├── RecentLinks.tsx       # localStorage-persisted link history
│   ├── ResultCard.tsx        # Shortened URL result with copy button
│   ├── ThemeToggle.tsx       # Dark/light mode toggle
│   └── UrlShortener.tsx      # Main URL input form
├── lib/
│   ├── db.ts                 # Supabase client singleton
│   └── utils.ts              # URL validation + helpers
├── public/                   # Static assets
├── .env.example              # Environment variable template (with SQL setup)
├── next.config.ts            # Next.js config + security headers
├── tailwind.config.ts        # Tailwind config with dark mode
└── tsconfig.json             # TypeScript config
```

---

## 📄 License

MIT © [LinkShrink](https://github.com/sadiqsyeds/link-shrink)
