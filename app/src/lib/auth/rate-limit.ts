/**
 * Fixed-window in-memory rate limiter.
 * NOTE: state is per server instance (each Vercel Function instance keeps its own counters).
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Milliseconds until the window resets. */
  retryAfterMs: number;
}

export interface RateLimiter {
  /** Records one attempt for `key` and tells whether it is allowed. */
  consume(key: string): RateLimitResult;
  /** Clears the counter for `key` (e.g. after a successful login). */
  reset(key: string): void;
}

export interface RateLimiterOptions {
  limit: number;
  windowMs: number;
  now?: () => number;
  /** Shared map, so dev hot reloads keep counters. */
  store?: Map<string, { count: number; resetAt: number }>;
}

const MAX_KEYS = 10_000;

export function createRateLimiter({
  limit,
  windowMs,
  now = Date.now,
  store = new Map(),
}: RateLimiterOptions): RateLimiter {
  function prune(t: number) {
    if (store.size < MAX_KEYS) return;
    for (const [k, v] of store) if (v.resetAt <= t) store.delete(k);
  }

  return {
    consume(key) {
      const t = now();
      prune(t);
      let entry = store.get(key);
      if (!entry || entry.resetAt <= t) {
        entry = { count: 0, resetAt: t + windowMs };
        store.set(key, entry);
      }
      entry.count += 1;
      const allowed = entry.count <= limit;
      return {
        allowed,
        remaining: Math.max(0, limit - entry.count),
        retryAfterMs: Math.max(0, entry.resetAt - t),
      };
    },
    reset(key) {
      store.delete(key);
    },
  };
}

const globalStore = globalThis as unknown as {
  __versusAuthLimiters?: Record<string, RateLimiter>;
};

/** Process-wide named limiter (survives Next.js dev module reloads). */
export function getSharedRateLimiter(
  name: string,
  options: Pick<RateLimiterOptions, "limit" | "windowMs">,
): RateLimiter {
  globalStore.__versusAuthLimiters ??= {};
  globalStore.__versusAuthLimiters[name] ??= createRateLimiter(options);
  return globalStore.__versusAuthLimiters[name];
}
