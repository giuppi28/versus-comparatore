// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_SESSION_COOKIE } from "./constants";
import { signMockSession } from "./mock-session";
import { handleAdminRequest } from "./proxy";

const SECRET = "proxy-test-secret-0123456789abcdef0123";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "mock");
  vi.stubEnv("ADMIN_MOCK_EMAIL", "admin@versus.test");
  vi.stubEnv("ADMIN_MOCK_PASSWORD", "pw");
  vi.stubEnv("ADMIN_MOCK_SESSION_SECRET", SECRET);
});
afterEach(() => vi.unstubAllEnvs());

function req(path: string, cookie?: string) {
  return new NextRequest(`http://localhost${path}`, {
    headers: cookie ? { cookie: `${MOCK_SESSION_COOKIE}=${cookie}` } : {},
  });
}

const validToken = () =>
  signMockSession({ sub: "a", email: "admin@versus.test", exp: Math.floor(Date.now() / 1000) + 60 }, SECRET);

describe("handleAdminRequest (mock mode)", () => {
  it("redirects anonymous requests for protected paths to the login page", async () => {
    for (const path of ["/admin", "/admin/leads", "/admin/offerte/123"]) {
      const res = await handleAdminRequest(req(path));
      expect(res.status).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname).toBe("/admin/login");
    }
  });

  it("lets the login pages through", async () => {
    for (const path of ["/admin/login", "/admin/login/mfa"]) {
      const res = await handleAdminRequest(req(path));
      expect(res.headers.get("location")).toBeNull();
      expect(res.headers.get("x-middleware-next")).toBe("1");
    }
  });

  it("lets a valid session through with no-store headers", async () => {
    const res = await handleAdminRequest(req("/admin", await validToken()));
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });

  it("rejects a tampered session cookie", async () => {
    const token = await validToken();
    const res = await handleAdminRequest(req("/admin", token.slice(0, -2) + "xx"));
    expect(res.status).toBe(307);
  });

  it("fails closed in production (mock auth refused)", async () => {
    const token = await validToken();
    vi.stubEnv("NODE_ENV", "production");
    const res = await handleAdminRequest(req("/admin", token));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/admin/login");
  });
});
