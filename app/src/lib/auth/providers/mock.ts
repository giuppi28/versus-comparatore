import { cookies } from "next/headers";
import { MOCK_SESSION_COOKIE, MOCK_SESSION_TTL_SECONDS } from "../constants";
import { assertMockAuthAllowed, getMockAuthConfig } from "../env";
import { safeEqual, signMockSession, verifyMockSession } from "../mock-session";
import type { AdminState, AuthProvider } from "./types";

const MOCK_ADMIN_ID = "00000000-0000-4000-8000-000000000001";

/**
 * MOCK provider for tests/local dev (NEXT_PUBLIC_DATA_SOURCE=mock).
 * Never usable in production: every entry point asserts it.
 */
export function createMockAuthProvider(): AuthProvider {
  assertMockAuthAllowed();
  return {
    mode: "mock",
    async getState(): Promise<AdminState> {
      const config = getMockAuthConfig();
      if (!config) return { access: "anonymous", user: null };
      const token = (await cookies()).get(MOCK_SESSION_COOKIE)?.value;
      const session = await verifyMockSession(token, config.secret);
      if (!session) return { access: "anonymous", user: null };
      return { access: "ok", user: { id: session.sub, email: session.email } };
    },
    async signIn(email, password) {
      const config = getMockAuthConfig();
      if (!config) return "invalid";
      const [emailOk, passwordOk] = await Promise.all([
        safeEqual(email.trim().toLowerCase(), config.email),
        safeEqual(password, config.password),
      ]);
      if (!emailOk || !passwordOk) return "invalid";
      const token = await signMockSession(
        {
          sub: MOCK_ADMIN_ID,
          email: config.email,
          exp: Math.floor(Date.now() / 1000) + MOCK_SESSION_TTL_SECONDS,
        },
        config.secret,
      );
      (await cookies()).set(MOCK_SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        path: "/",
        maxAge: MOCK_SESSION_TTL_SECONDS,
      });
      return "ok";
    },
    async signOut() {
      (await cookies()).delete(MOCK_SESSION_COOKIE);
    },
    mfa: null,
  };
}
