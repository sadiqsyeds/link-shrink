import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

/* ─── Fonts ──────────────────────────────────────────────────────────────── */
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

/* ─── Metadata ───────────────────────────────────────────────────────────── */
export const metadata: Metadata = {
  title: {
    default: "LinkShrink — Free URL Shortener",
    template: "%s | LinkShrink",
  },
  description:
    "LinkShrink is a fast, free, and modern URL shortener. Paste any long link and get a clean short URL in seconds.",
  keywords: [
    "url shortener",
    "link shortener",
    "short url",
    "free url shortener",
    "link shrink",
  ],
  authors: [{ name: "LinkShrink" }],
  creator: "LinkShrink",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"
  ),
  openGraph: {
    title: "LinkShrink — Free URL Shortener",
    description:
      "Paste any long link and get a clean short URL in seconds. Fast, free, and modern.",
    url: process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000",
    siteName: "LinkShrink",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LinkShrink — Free URL Shortener",
    description: "Paste any long link and get a clean short URL in seconds.",
    creator: "@linkshrink",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

/* ─── Viewport ───────────────────────────────────────────────────────────── */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0f1e" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

/* ─── Root Layout ────────────────────────────────────────────────────────── */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/*
        suppressHydrationWarning is required because ThemeToggle adds/removes
        the "dark" class on <html> client-side to avoid a flash of wrong theme.
      */}
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
