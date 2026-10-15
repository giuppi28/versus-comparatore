// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { safeEqual, signMockSession, verifyMockSession } from "./mock-session";

const SECRET = "unit-test-secret-0123456789abcdef0123";
const now = Math.floor(Date.now() / 1000);
const payload = { sub: "admin-1", email: "admin@versus.test", exp: now + 3600 };

afterEach(() => vi.unstubAllEnvs());

describe("mock session signing", () => {
  it("round-trips a valid token", async () => {
    const token = await signMockSession(payload, SECRET);
    expect(await verifyMockSession(token, SECRET)).toEqual(payload);
  });

  it("rejects a tampered payload", async () => {
    const token = await signMockSession(payload, SECRET);
    const [, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...payload, email: "evil@x.it" })).toString("base64url");
    expect(await verifyMockSession(`${forged}.${sig}`, SECRET)).toBeNull();
  });

  it("rejects a tampered signature", async () => {
    const token = await signMockSession(payload, SECRET);
    const last = token.at(-1) === "A" ? "B" : "A";
    expect(await verifyMockSession(token.slice(0, -1) + last, SECRET)).toBeNull();
  });

  it("rejects a token signed with another secret", async () => {
    const token = await signMockSession(payload, "another-secret-0123456789abcdef0123");
    expect(await verifyMockSession(token, SECRET)).toBeNull();
  });

  it("rejects expired tokens", async () => {
    const token = await signMockSession({ ...payload, exp: now - 1 }, SECRET);
    expect(await verifyMockSession(token, SECRET)).toBeNull();
  });

  it.each([undefined, null, "", "abc", "a.b.c", "!!!.###", "e30.AAAA"])(
    "rejects malformed token %s",
    async (t) => {
      expect(await verifyMockSession(t, SECRET)).toBeNull();
    },
  );

  it("rejects a validly signed but malformed payload", async () => {
    const token = await signMockSession({ sub: 1 } as never, SECRET);
    expect(await verifyMockSession(token, SECRET)).toBeNull();
  });

  it("rejects when no secret is configured", async () => {
    const token = await signMockSession(payload, SECRET);
    expect(await verifyMockSession(token, "")).toBeNull();
  });

  it("refuses to sign or verify in production", async () => {
    const token = await signMockSession(payload, SECRET);
    vi.stubEnv("NODE_ENV", "production");
    await expect(signMockSession(payload, SECRET)).rejects.toThrow(/production/);
    await expect(verifyMockSession(token, SECRET)).rejects.toThrow(/production/);
  });
});

describe("safeEqual", () => {
  it("compares strings", async () => {
    expect(await safeEqual("abc", "abc")).toBe(true);
    expect(await safeEqual("abc", "abd")).toBe(false);
    expect(await safeEqual("abc", "abcd")).toBe(false);
  });
});
