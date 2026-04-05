/**
 * lib/utils.ts
 * Shared utility functions for URL validation, sanitization, and helpers.
 */

/** Allowed protocols for redirect targets */
const ALLOWED_PROTOCOLS = ["http:", "https:"];

/**
 * Validates that a string is a well-formed, absolute HTTP/HTTPS URL.
 * Prevents open-redirect attacks and invalid entries.
 */
export function isValidUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.trim().length === 0) return false;

  try {
    const url = new URL(value);
    return ALLOWED_PROTOCOLS.includes(url.protocol);
  } catch {
    return false;
  }
}

/**
 * Normalises a URL: trims whitespace, lower-cases the scheme + host.
 * Preserves path/query/hash casing.
 */
export function normaliseUrl(raw: string): string {
  const url = new URL(raw.trim());
  return `${url.protocol}//${url.host}${url.pathname}${url.search}${url.hash}`;
}

/**
 * Builds the full public short URL from a short code.
 */
export function buildShortUrl(shortCode: string): string {
  const base =
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";
  return `${base}/${shortCode}`;
}

/**
 * Returns true when running in a Node.js / Edge server context
 * (i.e., not in the browser).
 */
export const isServer = typeof window === "undefined";
