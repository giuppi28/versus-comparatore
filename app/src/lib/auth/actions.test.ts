// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookieJar = new Map<string, string>();
let requestHeaders = new Headers();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined),
    getAll: () => [...cookieJar].map(([name, value]) => ({ name, value })),
    set: (name: string, value: string) => void cookieJar.set(name, value),
    delete: (name: string) => void cookieJar.delete(name),
  }),
  headers: async () => requestHeaders,
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  },
}));

const { loginAction, logoutAction } = await import("./actions");
const { AUTH_MESSAGES, MOCK_SESSION_COOKIE } = await import("./constants");
const { INITIAL_AUTH_STATE } = await import("./form-state");

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

let ipCounter = 0;
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "mock");
  vi.stubEnv("ADMIN_MOCK_EMAIL", "admin@versus.test");
  vi.stubEnv("ADMIN_MOCK_PASSWORD", "correct-password");
  vi.stubEnv("ADMIN_MOCK_SESSION_SECRET", "actions-test-secret-0123456789abcdef");
  cookieJar.clear();
  requestHeaders = new Headers({ "x-forwarded-for": `10.0.0.${++ipCounter}` });
});
afterEach(() => vi.unstubAllEnvs());

const creds = (password: string, email = "admin@versus.test") =>
  form({ email, password });

describe("loginAction", () => {
  it("returns a generic error for wrong password and unknown email", async () => {
    const a = await loginAction(INITIAL_AUTH_STATE, creds("wrong"));
    const b = await loginAction(INITIAL_AUTH_STATE, creds("correct-password", "nobody@versus.test"));
    expect(a.error).toBe(AUTH_MESSAGES.invalidCredentials);
    expect(b.error).toBe(a.error);
    expect(a.attempt).toBe(1);
    expect(cookieJar.size).toBe(0);
  });

  it("requires email and password", async () => {
    const s = await loginAction(INITIAL_AUTH_STATE, form({ email: "", password: "" }));
    expect(s.error).toBe(AUTH_MESSAGES.missingFields);
  });

  it("keys the rate limit on the Vercel client IP, ignoring cf-connecting-ip", async () => {
    requestHeaders = new Headers({ "x-real-ip": "10.9.9.9" });
    for (let i = 0; i < 5; i++) {
      requestHeaders.set("cf-connecting-ip", `172.16.0.${i}`);
      await loginAction(INITIAL_AUTH_STATE, creds("wrong"));
    }
    requestHeaders.set("cf-connecting-ip", "172.16.0.99");
    expect((await loginAction(INITIAL_AUTH_STATE, creds("correct-password"))).status).toBe(429);
  });

  it("signs in with correct credentials, sets the session cookie and redirects to /admin", async () => {
    await expect(loginAction(INITIAL_AUTH_STATE, creds("correct-password"))).rejects.toMatchObject({ url: "/admin" });
    expect(cookieJar.get(MOCK_SESSION_COOKIE)).toMatch(/\./);
  });

  it("rate limits after 5 attempts per IP+email (429)", async () => {
    for (let i = 0; i < 5; i++) {
      expect((await loginAction(INITIAL_AUTH_STATE, creds("wrong"))).status).toBeUndefined();
    }
    const blocked = await loginAction(INITIAL_AUTH_STATE, creds("correct-password"));
    expect(blocked).toMatchObject({ status: 429, error: "Troppi tentativi, riprova più tardi" });
    expect(cookieJar.size).toBe(0);
    // Another email from the same IP is not affected.
    expect((await loginAction(INITIAL_AUTH_STATE, creds("x", "other@versus.test"))).status).toBeUndefined();
  });

  it("refuses mock login in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const s = await loginAction(INITIAL_AUTH_STATE, creds("correct-password"));
    expect(s.error).toBeDefined();
    expect(cookieJar.size).toBe(0);
  });
});

describe("logoutAction", () => {
  it("clears the session and redirects to login", async () => {
    cookieJar.set(MOCK_SESSION_COOKIE, "x.y");
    await expect(logoutAction()).rejects.toMatchObject({ url: "/admin/login" });
    expect(cookieJar.has(MOCK_SESSION_COOKIE)).toBe(false);
  });
});
