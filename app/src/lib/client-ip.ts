/**
 * Client IP used as the rate-limit key (lead routes, comuni search, admin login). SERVER ONLY
 * in practice (it only reads request headers, so it is safe to import anywhere).
 *
 * Hosting is Vercel: only the headers Vercel's edge sets are trusted.
 *   1. `x-real-ip`            (set by Vercel to the client IP);
 *   2. the FIRST value of `x-forwarded-for` (Vercel overwrites the header, so a client cannot
 *      prepend a spoofed hop).
 * Any other client-IP header (e.g. `true-client-ip` or other CDN-specific ones) is IGNORED:
 * no CDN in front sets them, so a client could send any value and get a fresh rate-limit bucket.
 * "unknown" when nothing usable is present (all such requests share one bucket).
 */

interface HeaderReader {
  get(name: string): string | null;
}

/** Longest textual IP (IPv4-mapped IPv6). Longer values are not an IP: ignored. */
const MAX_IP_LENGTH = 45;

function usable(value: string | null | undefined): string | null {
  const v = value?.trim();
  return v && v.length <= MAX_IP_LENGTH ? v : null;
}

export function getClientIp(headers: HeaderReader): string {
  return (
    usable(headers.get("x-real-ip")) ??
    usable(headers.get("x-forwarded-for")?.split(",")[0]) ??
    "unknown"
  );
}
