import { describe, expect, it } from "vitest";
import { createRateLimiter, getSharedRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows `limit` attempts then blocks until the window resets", () => {
    let t = 1_000;
    const rl = createRateLimiter({ limit: 5, windowMs: 15 * 60_000, now: () => t });
    for (let i = 0; i < 5; i++) expect(rl.consume("ip|a@b.it").allowed).toBe(true);
    const blocked = rl.consume("ip|a@b.it");
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterMs).toBe(15 * 60_000);
    t += 15 * 60_000;
    expect(rl.consume("ip|a@b.it").allowed).toBe(true);
  });

  it("keeps keys independent", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000, now: () => 0 });
    expect(rl.consume("a").allowed).toBe(true);
    expect(rl.consume("a").allowed).toBe(false);
    expect(rl.consume("b").allowed).toBe(true);
  });

  it("reset clears the counter", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000, now: () => 0 });
    rl.consume("a");
    expect(rl.consume("a").allowed).toBe(false);
    rl.reset("a");
    expect(rl.consume("a").allowed).toBe(true);
  });

  it("reports remaining attempts", () => {
    const rl = createRateLimiter({ limit: 3, windowMs: 1000, now: () => 0 });
    expect(rl.consume("k").remaining).toBe(2);
    expect(rl.consume("k").remaining).toBe(1);
  });

  it("prunes expired keys when the store is large", () => {
    let t = 0;
    const store = new Map<string, { count: number; resetAt: number }>();
    const rl = createRateLimiter({ limit: 1, windowMs: 10, now: () => t, store });
    for (let i = 0; i < 10_000; i++) rl.consume(`k${i}`);
    t = 100;
    rl.consume("fresh");
    expect(store.size).toBe(1);
  });
});

describe("getSharedRateLimiter", () => {
  it("returns the same instance for the same name", () => {
    const a = getSharedRateLimiter("test-shared", { limit: 1, windowMs: 1000 });
    expect(getSharedRateLimiter("test-shared", { limit: 1, windowMs: 1000 })).toBe(a);
  });
});
