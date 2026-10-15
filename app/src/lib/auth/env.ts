import { getDataSource } from "@/lib/data";

export type AuthMode = "mock" | "supabase";

export class MockAuthInProductionError extends Error {
  constructor() {
    super("Mock admin auth must never be enabled when NODE_ENV=production");
    this.name = "MockAuthInProductionError";
  }
}

/** Hard guard: throws whenever the mock auth provider would run in production. */
export function assertMockAuthAllowed(): void {
  if (process.env.NODE_ENV === "production") throw new MockAuthInProductionError();
}

/**
 * Auth mode follows NEXT_PUBLIC_DATA_SOURCE. "mock" is refused in production
 * (fails closed: the admin area becomes unreachable instead of insecure).
 */
export function getAuthMode(): AuthMode {
  const source = getDataSource();
  if (source === "mock") {
    assertMockAuthAllowed();
    return "mock";
  }
  return "supabase";
}

export interface MockAuthConfig {
  email: string;
  password: string;
  secret: string;
}

/** Reads mock credentials. Returns null when incomplete (login then always fails). */
export function getMockAuthConfig(): MockAuthConfig | null {
  assertMockAuthAllowed();
  const email = process.env.ADMIN_MOCK_EMAIL?.trim().toLowerCase() ?? "";
  const password = process.env.ADMIN_MOCK_PASSWORD ?? "";
  const secret = process.env.ADMIN_MOCK_SESSION_SECRET ?? "";
  if (!email || !password || secret.length < 32) return null;
  return { email, password, secret };
}

export interface SupabasePublicConfig {
  url: string;
  key: string;
}

export function getSupabasePublicConfig(): SupabasePublicConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase auth requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }
  return { url, key };
}
