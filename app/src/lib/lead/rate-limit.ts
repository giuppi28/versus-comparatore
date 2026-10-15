/**
 * Simple in-memory sliding-window rate limiter (PRD §4.6). SERVER ONLY.
 *
 * LIMITATION: state is per server instance / per Worker isolate, so it is only a
 * first line of defence. At deploy time add a Cloudflare WAF rate-limiting rule on
 * /api/lead* (note for DEPLOY.md).
 */

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the next request would be allowed (0 when allowed). */
  retryAfterSec: number;
  remaining: number;
}

export interface RateLimiterOptions {
  limit: number;
  windowMs: number;
  /** Max tracked keys before old entries are swept (memory bound). */
  maxKeys?: number;
  now?: () => number;
}

export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly maxKeys: number;
  private readonly now: () => number;

  constructor(opts: RateLimiterOptions) {
    this.limit = opts.limit;
    this.windowMs = opts.windowMs;
    this.maxKeys = opts.maxKeys ?? 10_000;
    this.now = opts.now ?? Date.now;
  }

  /** Records a hit for `key` unless the limit is reached. */
  hit(key: string): RateLimitResult {
    const now = this.now();
    const cutoff = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > cutoff);

    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      const retryAfterMs = recent[0] + this.windowMs - now;
      return { allowed: false, retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)), remaining: 0 };
    }

    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > this.maxKeys) this.sweep(cutoff);
    return { allowed: true, retryAfterSec: 0, remaining: this.limit - recent.length };
  }

  /** Number of tracked keys (tests / diagnostics). */
  get size(): number {
    return this.hits.size;
  }

  private sweep(cutoff: number) {
    for (const [k, times] of this.hits) {
      if (times.length === 0 || times[times.length - 1] <= cutoff) this.hits.delete(k);
    }
    // Still too many keys (flood of distinct IPs): drop the oldest-inserted ones.
    const excess = this.hits.size - this.maxKeys;
    if (excess > 0) {
      let i = 0;
      for (const k of this.hits.keys()) {
        if (i++ >= excess) break;
        this.hits.delete(k);
      }
    }
  }
}

/**
 * Client IP: Cloudflare's `cf-connecting-ip`, then the first `x-forwarded-for` hop,
 * then `x-real-ip`. "unknown" when none is present (all such requests share a bucket).
 */
export function clientIp(headers: Headers): string {
  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const xff = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (xff) return xff;
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/** Per-route limits (per IP). */
export const LEAD_RATE_LIMITS = {
  create: { limit: 10, windowMs: 10 * 60_000 },
  update: { limit: 60, windowMs: 10 * 60_000 },
  complete: { limit: 10, windowMs: 10 * 60_000 },
  clear: { limit: 30, windowMs: 10 * 60_000 },
} as const;

export type LeadRouteKey = keyof typeof LEAD_RATE_LIMITS;
