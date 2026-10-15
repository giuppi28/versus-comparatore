/**
 * Admin route guard used by src/proxy.ts. Refreshes the Supabase session
 * cookies and redirects unauthenticated requests for protected /admin paths
 * to the login page. Authorization (admin role, MFA level) is re-checked
 * server-side by requireAdmin() in the admin layout/pages.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_LOGIN_PATH, MOCK_SESSION_COOKIE } from "./constants";
import { getAuthMode, getMockAuthConfig, getSupabasePublicConfig } from "./env";
import { verifyMockSession } from "./mock-session";
import { isProtectedAdminPath } from "./paths";

function noStore(res: NextResponse) {
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

function redirectToLogin(request: NextRequest, from?: NextResponse) {
  const res = NextResponse.redirect(new URL(ADMIN_LOGIN_PATH, request.url));
  // Keep any cookie changes (e.g. cleared expired Supabase session).
  from?.cookies.getAll().forEach((c) => res.cookies.set(c));
  return noStore(res);
}

async function isAuthenticatedSupabase(request: NextRequest, response: { current: NextResponse }) {
  const { url, key } = getSupabasePublicConfig();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(list, headers) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response.current = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.current.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.current.headers.set(k, v));
      },
    },
  });
  // Validates the JWT and refreshes the session if needed (writes cookies via setAll).
  const { data, error } = await supabase.auth.getClaims();
  return !error && !!data?.claims?.sub;
}

async function isAuthenticatedMock(request: NextRequest) {
  const config = getMockAuthConfig();
  if (!config) return false;
  const session = await verifyMockSession(request.cookies.get(MOCK_SESSION_COOKIE)?.value, config.secret);
  return session !== null;
}

export async function handleAdminRequest(request: NextRequest): Promise<NextResponse> {
  const response = { current: NextResponse.next({ request }) };
  const isProtected = isProtectedAdminPath(request.nextUrl.pathname);

  let authenticated = false;
  try {
    authenticated =
      getAuthMode() === "mock"
        ? await isAuthenticatedMock(request)
        : await isAuthenticatedSupabase(request, response);
  } catch {
    // Misconfiguration (or mock mode in production): fail closed.
    authenticated = false;
  }

  if (isProtected && !authenticated) return redirectToLogin(request, response.current);
  return noStore(response.current);
}
