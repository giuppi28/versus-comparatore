// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  TURNSTILE_TEST_SECRET_KEY,
  TURNSTILE_TEST_SITE_KEY,
  getTurnstileSecret,
  getTurnstileSiteKey,
  verifyTurnstile,
} from "./turnstile";

afterEach(() => vi.unstubAllEnvs());

const okFetch = (body: unknown, ok = true) =>
  vi.fn(async () => ({ ok, json: async () => body }) as Response) as unknown as typeof fetch;

describe("turnstile keys", () => {
  it("falls back to test keys outside production", () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    expect(getTurnstileSiteKey()).toBe(TURNSTILE_TEST_SITE_KEY);
    expect(getTurnstileSecret()).toBe(TURNSTILE_TEST_SECRET_KEY);
  });

  it("fails closed in production without a secret", () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(getTurnstileSecret()).toBeNull();
  });

  it("uses configured keys", () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    expect(getTurnstileSiteKey()).toBe("site");
    expect(getTurnstileSecret()).toBe("secret");
  });
});

describe("verifyTurnstile", () => {
  it("rejects a missing token", async () => {
    expect(await verifyTurnstile("", { secret: "s" })).toBe(false);
    expect(await verifyTurnstile(null, { secret: "s" })).toBe(false);
  });

  it("rejects when no secret is available", async () => {
    expect(await verifyTurnstile("tok", { secret: null })).toBe(false);
  });

  it("accepts any token with the always-pass test secret (no network)", async () => {
    const f = okFetch({ success: false });
    expect(await verifyTurnstile("tok", { secret: TURNSTILE_TEST_SECRET_KEY, fetchImpl: f })).toBe(true);
    expect(f).not.toHaveBeenCalled();
  });

  it("returns Cloudflare's verdict", async () => {
    expect(await verifyTurnstile("tok", { secret: "s", fetchImpl: okFetch({ success: true }), remoteIp: "1.2.3.4" })).toBe(true);
    expect(await verifyTurnstile("tok", { secret: "s", fetchImpl: okFetch({ success: false }) })).toBe(false);
    expect(await verifyTurnstile("tok", { secret: "s", fetchImpl: okFetch({ success: true }, false) })).toBe(false);
  });

  it("fails closed on network errors", async () => {
    const f = vi.fn(async () => {
      throw new Error("down");
    }) as unknown as typeof fetch;
    expect(await verifyTurnstile("tok", { secret: "s", fetchImpl: f })).toBe(false);
  });
});
