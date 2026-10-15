interface HeaderReader {
  get(name: string): string | null;
}

/**
 * Best-effort client IP. Prefers Cloudflare's header (set by the edge, not
 * spoofable behind Cloudflare), then common proxy headers.
 */
export function getClientIp(headers: HeaderReader): string {
  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const fwd = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (fwd) return fwd;
  return "unknown";
}
