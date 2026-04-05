# ⚡ LinkShrink — Modern URL Shortener

> A fast, free, and beautifully designed URL shortener built with Next.js 15, MySQL, and Framer Motion.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Database Setup](#-database-setup)
- [API Reference](#-api-reference)
- [Deployment](#-deployment)
- [Project Structure](#-project-structure)
- [What Was Improved](#-what-was-improved)

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
| ⚡ **Instant shortening** | Short codes generated with nanoid in < 5 ms |
| 🔁 **Smart deduplication** | Same long URL always returns the same short code |
| 📋 **One-click copy** | Copy the short URL to clipboard with visual feedback |
| 🕐 **Recent links** | Last 5 shortened links persisted in localStorage |
| 🌙 **Dark / Light mode** | Manual toggle + system preference fallback |
| 📊 **Click tracking** | Each redirect increments a click counter |
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
| Database | MySQL 8+ (via `mysql2`) |
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
  │                         └─ lib/db.ts (pool) → MySQL
  │
  └─ GET  /:shortCode     → app/[shortUrl]/route.ts
                                └─ lib/db.ts (pool) → MySQL → 301 redirect
```

**Key design decisions:**
- **Server Components** for the shell/layout (zero JS shipped for static parts)
- **Client Components** only for interactive elements (form, toggle, recent links)
- **Singleton pool** (`lib/db.ts`) — one MySQL connection pool per server process, not per request
- **Deduplication** — inserting an already-shortened URL returns the existing short code instantly
- **Click counter** — fire-and-forget `UPDATE` so it never slows down the redirect

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm / pnpm
- MySQL 8+ (local or remote)

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

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in your MySQL credentials and base URL (see [Environment Variables](#-environment-variables)).

### 4. Set up the database

```bash
# Connect to MySQL
mysql -u root -p

# Run the schema
CREATE DATABASE IF NOT EXISTS linkshrink;
USE linkshrink;

CREATE TABLE IF NOT EXISTS links_master (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  long_link   TEXT            NOT NULL,
  short_link  VARCHAR(16)     NOT NULL UNIQUE,
  click_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_short_link (short_link),
  INDEX idx_long_link  (long_link(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_BASE_URL` | ✅ | `http://localhost:3000` | Public base URL (used to build full short URLs) |
| `DB_HOST` | ✅ | — | MySQL host |
| `DB_PORT` | ❌ | `3306` | MySQL port |
| `DB_USER` | ✅ | — | MySQL username |
| `DB_PASSWORD` | ✅ | — | MySQL password |
| `DB_NAME` | ✅ | — | MySQL database name |

---

## 🗄 Database Setup

The app expects a single table `links_master` with this schema:

```sql
CREATE TABLE links_master (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  long_link   TEXT            NOT NULL,
  short_link  VARCHAR(16)     NOT NULL UNIQUE,
  click_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_short_link (short_link),
  INDEX idx_long_link  (long_link(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Indexes explained:**
- `idx_short_link` — used by every redirect lookup (most frequent query)
- `idx_long_link` — used by deduplication check on insert

---

## 📡 API Reference

### `POST /api/short` — Shorten a URL

**Request body:**
```json
{ "longUrl": "https://example.com/very/long/path" }
```

**Success response (201 Created):**
```json
{
  "longUrl": "https://example.com/very/long/path",
  "shortUrl": "aB3x9kLm",
  "fullShortUrl": "http://localhost:3000/aB3x9kLm"
}
```

**If already shortened (200 OK):**
Returns the same shape with the existing `shortUrl`.

**Error responses:**
| Status | Reason |
|--------|--------|
| `400` | Missing or invalid URL (not http/https) |
| `500` | Database error |

---

### `GET /:shortCode` — Redirect

Visiting `http://localhost:3000/aB3x9kLm` performs a **301 redirect** to the original long URL. Returns `404` if the code doesn't exist.

---

## 🚢 Deployment

### Vercel (recommended)

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add all environment variables in the Vercel dashboard
4. Deploy — done ✅

### Self-hosted (Node.js)

```bash
npm run build
npm start
```

Set `PORT` if you need a custom port. Make sure your MySQL is reachable from the server.

### Docker (optional)

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
│   ├── db.ts                 # MySQL connection pool singleton
│   └── utils.ts              # URL validation + helpers
├── public/                   # Static assets
├── .env.example              # Environment variable template
├── next.config.ts            # Next.js config + security headers
├── tailwind.config.ts        # Tailwind config with dark mode
└── tsconfig.json             # TypeScript config
```

---

## 🔧 What Was Improved

This project was fully modernized from a stub. Here's a summary of every change:

### 🔴 Critical Fixes
- **Built the actual UI** — `app/page.tsx` was `return null`; completely rebuilt
- **Connection pooling** — replaced per-request `createConnection()` with a singleton `createPool()` in `lib/db.ts`
- **URL validation** — all inputs validated with `new URL()` before any DB operations
- **Secure redirects** — stored URLs re-validated before following (prevents open-redirect attacks)
- **Removed public DB dump** — `GET /api/short` no longer exposes all rows to anyone

### 🟠 Security
- Security headers added via `next.config.ts` (`X-Frame-Options`, `X-Content-Type-Options`, etc.)
- Only `http://` and `https://` protocols are accepted as long URLs
- Redirect target validated again at redirect time

### 🟡 Code Quality
- Converted `app/[shortUrl]/route.js` → `.ts` (full TypeScript)
- Proper types in `app/types/index.ts` (`Link`, `ShortenResponse`, `ApiError`, etc.)
- `lib/utils.ts` for shared, testable utility functions

### 🟢 Features Added
- **Smart deduplication** — re-shortening the same URL returns the existing code
- **Click counter** — every redirect increments `click_count` (fire-and-forget)
- **Dark/light mode toggle** — persisted in `localStorage`
- **Recent links** — last 5 links persisted in `localStorage` with clear button
- **One-click copy** — with animated feedback
- **404, Error, Loading pages** — proper Next.js error boundaries
- **Framer Motion animations** — stagger entrance, button feedback, mode transitions
- **Feature grid** — server-rendered with zero client JS

---

## 📄 License

MIT © [LinkShrink](https://github.com/sadiqsyeds/link-shrink)
