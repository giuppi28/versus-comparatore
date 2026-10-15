import { describe, expect, it } from "vitest";
import { getClientIp } from "./client-ip";

const h = (o: Record<string, string>) => new Headers(o);

describe("getClientIp (Vercel headers only)", () => {
  it("prefers x-real-ip, then the first x-forwarded-for value", () => {
    expect(getClientIp(h({ "x-real-ip": "3.3.3.3", "x-forwarded-for": "2.2.2.2" }))).toBe("3.3.3.3");
    expect(getClientIp(h({ "x-forwarded-for": " 2.2.2.2 , 9.9.9.9" }))).toBe("2.2.2.2");
    expect(getClientIp(h({ "x-real-ip": "  ", "x-forwarded-for": "2.2.2.2" }))).toBe("2.2.2.2");
  });

  it("ignores cf-connecting-ip and other spoofable CDN headers", () => {
    expect(getClientIp(h({ "cf-connecting-ip": "1.1.1.1" }))).toBe("unknown");
    expect(getClientIp(h({ "cf-connecting-ip": "1.1.1.1", "true-client-ip": "4.4.4.4", "x-real-ip": "3.3.3.3" }))).toBe(
      "3.3.3.3",
    );
    expect(getClientIp(h({ "cf-connecting-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2" }))).toBe("2.2.2.2");
  });

  it("ignores values that cannot be an IP (too long) and falls back to unknown", () => {
    expect(getClientIp(h({ "x-real-ip": "x".repeat(46), "x-forwarded-for": "2.2.2.2" }))).toBe("2.2.2.2");
    expect(getClientIp(h({ "x-forwarded-for": `${"y".repeat(100)}, 2.2.2.2` }))).toBe("unknown");
    expect(getClientIp(h({}))).toBe("unknown");
    expect(getClientIp(h({ "x-real-ip": "2001:0db8:85a3:0000:0000:8a2e:0370:7334" }))).toBe(
      "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
    );
  });
});
