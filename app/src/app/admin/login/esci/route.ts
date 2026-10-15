import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@/lib/auth";
import { ADMIN_LOGIN_PATH } from "@/lib/auth/constants";

/**
 * Target of requireAdmin() for authenticated NON-admin users: signs them out
 * (cookies can't be cleared from a Server Component) and returns to login.
 * Admin sessions are left untouched, so this GET cannot be abused to log Aldo out.
 */
export async function GET(request: NextRequest) {
  const auth = getAuth();
  const state = await auth.getState();
  const url = new URL(ADMIN_LOGIN_PATH, request.url);
  if (state.access === "forbidden") {
    await auth.signOut();
    url.searchParams.set("errore", "accesso");
  }
  const res = NextResponse.redirect(url);
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
