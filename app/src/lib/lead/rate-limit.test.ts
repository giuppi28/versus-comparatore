import { describe, expect, it } from "vitest";
import { clientIp, SlidingWindowRateLimiter } from "./rate-limit";

describe("SlidingWindowRateLimiter", () => {
  it("allows `limit` hits per window, then blocks with retry-after", () => {
    let now = 0;
    const rl = new SlidingWindowRateLimiter({ limit: 3, windowMs: 10_000, now: () => now });
    expect(rl.hit("a")).toEqual({ allowed: true, retryAfterSec: 0, remaining: 2 });
    now = 1000;
    rl.hit("a");
    now = 2000;
    expect(rl.hit("a").remaining).toBe(0);
    now = 3000;
    const blocked = rl.hit("a");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBe(7); // first hit (t=0) leaves the window at t=10000
  });

  it("slides: old hits expire individually", () => {
    let now = 0;
    const rl = new SlidingWindowRateLimiter({ limit: 2, windowMs: 1000, now: () => now });
    rl.hit("k");
    now = 600;
    rl.hit("k");
    now = 900;
    expect(rl.hit("k").allowed).toBe(false);
    now = 1001; // the t=0 hit expired, the t=600 one did not
    expect(rl.hit("k").allowed).toBe(true);
    expect(rl.hit("k").allowed).toBe(false);
  });

  it("blocked attempts are not counted", () => {
    let now = 0;
    const rl = new SlidingWindowRateLimiter({ limit: 1, windowMs: 1000, now: () => now });
    rl.hit("k");
    for (let i = 0; i < 5; i++) rl.hit("k");
    now = 1001;
    expect(rl.hit("k").allowed).toBe(true);
  });

  it("keys are independent", () => {
    const rl = new SlidingWindowRateLimiter({ limit: 1, windowMs: 1000 });
    expect(rl.hit("a").allowed).toBe(true);
    expect(rl.hit("b").allowed).toBe(true);
    expect(rl.hit("a").allowed).toBe(false);
  });

  it("bounds memory: sweeps expired keys, then drops the oldest", () => {
    let now = 0;
    const rl = new SlidingWindowRateLimiter({ limit: 5, windowMs: 100, maxKeys: 3, now: () => now });
    rl.hit("1");
    rl.hit("2");
    rl.hit("3");
    now = 500;
    rl.hit("4"); // 1-3 expired → swept
    expect(rl.size).toBe(1);
    rl.hit("5");
    rl.hit("6");
    rl.hit("7"); // all live: oldest dropped
    expect(rl.size).toBe(3);
  });
});

describe("clientIp", () => {
  it("uses x-real-ip, then the first x-forwarded-for (Vercel); ignores cf-connecting-ip", () => {
    expect(clientIp(new Headers({ "cf-connecting-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2" }))).toBe("2.2.2.2");
    expect(clientIp(new Headers({ "cf-connecting-ip": "1.1.1.1" }))).toBe("unknown");
    expect(clientIp(new Headers({ "x-forwarded-for": "2.2.2.2, 10.0.0.1" }))).toBe("2.2.2.2");
    expect(clientIp(new Headers({ "x-real-ip": "3.3.3.3", "x-forwarded-for": "2.2.2.2" }))).toBe("3.3.3.3");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
