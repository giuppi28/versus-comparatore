// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resolveTurnstileSecret,
  TURNSTILE_TEST_SECRET_FAIL,
  TURNSTILE_TEST_SECRET_PASS,
  TURNSTILE_TEST_SECRET_SPENT,
  TURNSTILE_VERIFY_URL,
  verifyTurnstile,
} from "./turnstile";
import { getTurnstileSiteKey, TURNSTILE_TEST_SITE_KEY } from "./turnstile-config";

const REAL = "0x4AAAAAAAreal-secret";

function mockFetch(response: unknown, status = 200) {
  return vi.fn<typeof fetch>(async () => new Response(JSON.stringify(response), { status }));
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("resolveTurnstileSecret", () => {
  it("uses the configured secret, else the test secret outside production, else null", () => {
    expect(resolveTurnstileSecret(" abc ", true)).toBe("abc");
    expect(resolveTurnstileSecret(undefined, false)).toBe(TURNSTILE_TEST_SECRET_PASS);
    expect(resolveTurnstileSecret("", false)).toBe(TURNSTILE_TEST_SECRET_PASS);
    expect(resolveTurnstileSecret(undefined, true)).toBeNull();
  });
});

describe("verifyTurnstile", () => {
  it("posts secret, response and remoteip to siteverify", async () => {
    const f = mockFetch({ success: true, "error-codes": [] });
    const r = await verifyTurnstile("tok", "1.2.3.4", { secret: REAL, fetchImpl: f });
    expect(r).toEqual({ success: true, errorCodes: [] });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe(TURNSTILE_VERIFY_URL);
    expect(init?.method).toBe("POST");
    const body = init?.body as URLSearchParams;
    expect(body.get("secret")).toBe(REAL);
    expect(body.get("response")).toBe("tok");
    expect(body.get("remoteip")).toBe("1.2.3.4");
  });

  it("returns Cloudflare error codes on failure", async () => {
    const f = mockFetch({ success: false, "error-codes": ["invalid-input-response", 3] });
    expect(await verifyTurnstile("tok", null, { secret: REAL, fetchImpl: f })).toEqual({
      success: false,
      errorCodes: ["invalid-input-response"],
    });
  });

  it("fails closed on HTTP errors, network errors and odd payloads", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await verifyTurnstile("t", null, { secret: REAL, fetchImpl: mockFetch({}, 500) })).success).toBe(false);
    const boom = vi.fn<typeof fetch>(async () => {
      throw new Error("offline");
    });
    expect(await verifyTurnstile("t", null, { secret: REAL, fetchImpl: boom })).toEqual({
      success: false,
      errorCodes: ["internal-error"],
    });
    expect((await verifyTurnstile("t", null, { secret: REAL, fetchImpl: mockFetch({ success: "yes" }) })).success).toBe(false);
  });

  it("rejects empty / oversized tokens without calling Cloudflare", async () => {
    const f = mockFetch({ success: true });
    expect((await verifyTurnstile("", null, { secret: REAL, fetchImpl: f })).errorCodes).toEqual([
      "missing-input-response",
    ]);
    expect((await verifyTurnstile("x".repeat(2049), null, { secret: REAL, fetchImpl: f })).success).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });

  it("production without a secret fails closed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const f = mockFetch({ success: true });
    const r = await verifyTurnstile("tok", null, { secret: undefined, isProduction: true, fetchImpl: f });
    expect(r).toEqual({ success: false, errorCodes: ["missing-input-secret"] });
    expect(f).not.toHaveBeenCalled();
  });

  it("dev/test without a secret uses the always-pass test secret, offline", async () => {
    const f = mockFetch({ success: false });
    expect(await verifyTurnstile("XXXX.DUMMY.TOKEN.XXXX", null, { secret: undefined, isProduction: false, fetchImpl: f }))
      .toEqual({ success: true, errorCodes: [] });
    expect(f).not.toHaveBeenCalled();
  });

  it("resolves Cloudflare's documented failing test secrets locally", async () => {
    expect((await verifyTurnstile("t", null, { secret: TURNSTILE_TEST_SECRET_FAIL })).success).toBe(false);
    expect(await verifyTurnstile("t", null, { secret: TURNSTILE_TEST_SECRET_SPENT })).toEqual({
      success: false,
      errorCodes: ["timeout-or-duplicate"],
    });
  });

  it("reads TURNSTILE_SECRET_KEY from the environment", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", TURNSTILE_TEST_SECRET_FAIL);
    expect((await verifyTurnstile("t", null)).success).toBe(false);
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    expect((await verifyTurnstile("t", null, { isProduction: false })).success).toBe(true);
  });
});

describe("getTurnstileSiteKey", () => {
  it("falls back to Cloudflare's test site key", () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    expect(getTurnstileSiteKey()).toBe(TURNSTILE_TEST_SITE_KEY);
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "0x4AAA-site");
    expect(getTurnstileSiteKey()).toBe("0x4AAA-site");
  });
});
