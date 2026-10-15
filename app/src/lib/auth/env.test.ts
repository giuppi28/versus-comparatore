// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MockAuthInProductionError,
  assertMockAuthAllowed,
  getAuthMode,
  getMockAuthConfig,
  getSupabasePublicConfig,
} from "./env";
import { createMockAuthProvider } from "./providers/mock";

afterEach(() => vi.unstubAllEnvs());

function stubMock() {
  vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "mock");
  vi.stubEnv("ADMIN_MOCK_EMAIL", " Admin@Versus.test ");
  vi.stubEnv("ADMIN_MOCK_PASSWORD", "pw");
  vi.stubEnv("ADMIN_MOCK_SESSION_SECRET", "x".repeat(32));
}

describe("production guard", () => {
  it("allows mock auth outside production", () => {
    stubMock();
    vi.stubEnv("NODE_ENV", "test");
    expect(getAuthMode()).toBe("mock");
    expect(() => createMockAuthProvider()).not.toThrow();
  });

  it("refuses mock auth when NODE_ENV=production", () => {
    stubMock();
    vi.stubEnv("NODE_ENV", "production");
    expect(() => assertMockAuthAllowed()).toThrow(MockAuthInProductionError);
    expect(() => getAuthMode()).toThrow(MockAuthInProductionError);
    expect(() => getMockAuthConfig()).toThrow(MockAuthInProductionError);
    expect(() => createMockAuthProvider()).toThrow(MockAuthInProductionError);
  });

  it("refuses the implicit mock default (empty data source) in production", () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => getAuthMode()).toThrow(MockAuthInProductionError);
  });

  it("uses Supabase auth when the data source is supabase", () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "supabase");
    vi.stubEnv("NODE_ENV", "production");
    expect(getAuthMode()).toBe("supabase");
  });
});

describe("getMockAuthConfig", () => {
  it("normalises the email", () => {
    stubMock();
    expect(getMockAuthConfig()).toEqual({ email: "admin@versus.test", password: "pw", secret: "x".repeat(32) });
  });

  it.each([
    ["ADMIN_MOCK_EMAIL", ""],
    ["ADMIN_MOCK_PASSWORD", ""],
    ["ADMIN_MOCK_SESSION_SECRET", "too-short"],
  ])("returns null when %s is %j", (name, value) => {
    stubMock();
    vi.stubEnv(name, value);
    expect(getMockAuthConfig()).toBeNull();
  });
});

describe("getSupabasePublicConfig", () => {
  it("throws when env is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(() => getSupabasePublicConfig()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });
  it("returns url and key", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");
    expect(getSupabasePublicConfig()).toEqual({ url: "https://x.supabase.co", key: "sb_publishable_x" });
  });
});
