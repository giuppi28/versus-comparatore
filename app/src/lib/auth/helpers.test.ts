import { describe, expect, it } from "vitest";
import { decideAdminAccess } from "./access";
import { getClientIp } from "./client-ip";
import { isProtectedAdminPath } from "./paths";

const h = (o: Record<string, string>) => new Headers(o);

describe("getClientIp", () => {
  it("uses x-real-ip, then the first x-forwarded-for; ignores cf-connecting-ip", () => {
    expect(getClientIp(h({ "cf-connecting-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2" }))).toBe("2.2.2.2");
    expect(getClientIp(h({ "cf-connecting-ip": "1.1.1.1" }))).toBe("unknown");
    expect(getClientIp(h({ "x-real-ip": "3.3.3.3", "x-forwarded-for": "2.2.2.2" }))).toBe("3.3.3.3");
    expect(getClientIp(h({ "x-forwarded-for": " 2.2.2.2 , 9.9.9.9" }))).toBe("2.2.2.2");
    expect(getClientIp(h({}))).toBe("unknown");
  });
});

describe("isProtectedAdminPath", () => {
  it.each([
    ["/admin", true],
    ["/admin/", true],
    ["/admin/leads", true],
    ["/admin/offerte/1", true],
    ["/admin/login", false],
    ["/admin/login/", false],
    ["/admin/login/mfa", false],
    ["/admin/loginx", true],
    ["/administrator", false],
    ["/", false],
  ])("%s -> %s", (p, expected) => {
    expect(isProtectedAdminPath(p)).toBe(expected);
  });
});

describe("decideAdminAccess", () => {
  const base = { authenticated: true, isAdmin: true, currentLevel: "aal1", nextLevel: "aal1" };
  it("anonymous when not signed in", () => {
    expect(decideAdminAccess({ ...base, authenticated: false })).toBe("anonymous");
  });
  it("forbidden for non-admin users", () => {
    expect(decideAdminAccess({ ...base, isAdmin: false })).toBe("forbidden");
  });
  it("requires MFA when a verified factor exists and the session is aal1", () => {
    expect(decideAdminAccess({ ...base, nextLevel: "aal2" })).toBe("mfa_required");
    expect(decideAdminAccess({ ...base, currentLevel: null, nextLevel: "aal2" })).toBe("mfa_required");
  });
  it("ok for admin without MFA or with aal2", () => {
    expect(decideAdminAccess(base)).toBe("ok");
    expect(decideAdminAccess({ ...base, currentLevel: "aal2", nextLevel: "aal2" })).toBe("ok");
  });
});
