/**
 * Admin auth entry point (server only).
 * - getAuth(): the active provider (mock in tests, Supabase otherwise).
 * - requireAdmin(): call at the top of every admin page / server action.
 */
import { redirect } from "next/navigation";
import { cache } from "react";
import { ADMIN_LOGIN_PATH, ADMIN_MFA_PATH, ADMIN_REJECT_PATH } from "./constants";
import { getAuthMode } from "./env";
import { createMockAuthProvider } from "./providers/mock";
import { createSupabaseAuthProvider } from "./providers/supabase";
import type { AdminState, AdminUser, AuthProvider } from "./providers/types";

export type { AdminState, AdminUser, AuthProvider, SignInResult, TotpEnrollment } from "./providers/types";
export type { AdminAccess } from "./access";
export * from "./constants";
export { createSupabaseServerClient } from "./supabase-server";

export function getAuth(): AuthProvider {
  return getAuthMode() === "mock" ? createMockAuthProvider() : createSupabaseAuthProvider();
}

/** Admin state, memoised per request. */
export const getAdminState = cache(async (): Promise<AdminState> => getAuth().getState());

/**
 * Returns the admin user or redirects: anonymous -> login, aal1 with TOTP -> MFA,
 * authenticated non-admin -> sign-out route.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const state = await getAdminState();
  switch (state.access) {
    case "ok":
      return state.user!;
    case "mfa_required":
      redirect(ADMIN_MFA_PATH);
    case "forbidden":
      redirect(ADMIN_REJECT_PATH);
    default:
      redirect(ADMIN_LOGIN_PATH);
  }
}
