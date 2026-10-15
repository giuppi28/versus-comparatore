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
    const [body, sig] = token.split(".");
    // Flip a middle char (all 6 bits significant) to one from a different 4-bit group.
    const i = sig.length - 10;
    const swapped = sig[i] === "A" ? "z" : "A";
    const tampered = `${body}.${sig.slice(0, i)}${swapped}${sig.slice(i + 1)}`;
    expect(await verifyMockSession(tampered, SECRET)).toBeNull();
  });

  it("rejects a non-canonical signature encoding (padding bits changed)", async () => {
    const token = await signMockSession(payload, SECRET);
    const [body, sig] = token.split(".");
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    // 32 bytes -> 43 chars: the last char carries 2 unused low bits.
    const last = alphabet.indexOf(sig.at(-1)!);
    const alias = alphabet[last ^ 1];
    expect(await verifyMockSession(`${body}.${sig.slice(0, -1)}${alias}`, SECRET)).toBeNull();
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
