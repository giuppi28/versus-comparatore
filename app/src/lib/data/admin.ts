import "server-only";
import { createSupabaseServerClient, requireAdmin } from "@/lib/auth";
import { getDataSource, getRepository } from "./index";
import type { Repository } from "./repository";
import { createSupabaseRepository } from "./supabase/supabase-repository";

/**
 * Server-only entry point for ALL admin data access (pages, server actions,
 * route handlers under /admin).
 *
 * - Verifies the admin session first (`requireAdmin()` redirects otherwise), so
 *   the mock repository, which has no RLS, can never be reached by mistake.
 * - mock mode: the SAME process-wide singleton as `getRepository()`, so an admin
 *   change is visible on the public site served by the same server.
 * - supabase mode: a repository bound to the admin's cookie-session client, so
 *   every query runs as the authenticated admin under RLS. Created per call
 *   (cookies are per request) — never cache the result across requests.
 */
export async function getAdminRepository(): Promise<Repository> {
  await requireAdmin();
  if (getDataSource() === "mock") return getRepository();
  return createSupabaseRepository(await createSupabaseServerClient());
}
