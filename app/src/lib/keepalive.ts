/**
 * Supabase keep-alive (free projects are paused after 7 days without activity). SERVER ONLY.
 *
 * A daily Vercel Cron Job (app/vercel.json) calls GET /api/cron/keepalive, which does one
 * cheap, public, RLS-compliant read with the PUBLISHABLE key (same one the browser uses):
 * `select istat_code from comuni limit 1`. No database secret is involved.
 *
 * The route is protected with Vercel's standard CRON_SECRET mechanism: when the CRON_SECRET
 * env var is set, Vercel sends `Authorization: Bearer <CRON_SECRET>` with every cron
 * invocation and any other request is refused (401). When CRON_SECRET is NOT set the route
 * refuses everything in production (fail closed) and is open only in development / tests.
 */
import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

export interface KeepAliveEnv {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  NEXT_PUBLIC_DATA_SOURCE?: string;
}

export interface KeepAliveResult {
  ok: boolean;
  /** HTTP status returned by Supabase, or 0 when nothing was sent / the request failed. */
  status: number;
  reason?:
    | "unauthorized"
    | "not_supabase_mode"
    | "missing_config"
    | "http_error"
    | "network_error"
    | "empty_response";
}

export async function pingSupabase(
  env: KeepAliveEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<KeepAliveResult> {
  if (env.NEXT_PUBLIC_DATA_SOURCE !== "supabase") {
    return { ok: false, status: 0, reason: "not_supabase_mode" };
  }
  const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!baseUrl || !key) return { ok: false, status: 0, reason: "missing_config" };

  try {
    const response = await fetchImpl(`${baseUrl}/rest/v1/comuni?select=istat_code&limit=1`, {
      method: "GET",
      headers: { apikey: key, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      await response.body?.cancel();
      return { ok: false, status: response.status, reason: "http_error" };
    }
    const rows: unknown = await response.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return { ok: false, status: response.status, reason: "empty_response" };
    }
    return { ok: true, status: response.status };
  } catch {
    return { ok: false, status: 0, reason: "network_error" };
  }
}

/** Constant-time string comparison (hashing first makes the lengths equal). */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * Vercel CRON_SECRET check.
 * - CRON_SECRET set: the request must carry exactly `Authorization: Bearer <CRON_SECRET>`.
 * - CRON_SECRET unset: refused in production (fail closed), allowed in development / tests.
 */
export function isAuthorizedCronRequest(
  authorization: string | null,
  opts: { cronSecret: string | undefined; isProduction: boolean },
): boolean {
  const secret = opts.cronSecret?.trim();
  if (!secret) return !opts.isProduction;
  if (!authorization) return false;
  return safeEqual(authorization, `Bearer ${secret}`);
}

export interface KeepAliveDeps {
  env: KeepAliveEnv & { CRON_SECRET?: string };
  isProduction: boolean;
  fetchImpl?: typeof fetch;
  log?: (message: string) => void;
}

/** GET /api/cron/keepalive handler: JSON `{ ok, status[, reason] }`, never cached. */
export function createKeepAliveHandler(deps: KeepAliveDeps) {
  return async (request: Request): Promise<Response> => {
    const headers = { "Cache-Control": "no-store" };
    const authorized = isAuthorizedCronRequest(request.headers.get("authorization"), {
      cronSecret: deps.env.CRON_SECRET,
      isProduction: deps.isProduction,
    });
    if (!authorized) {
      const body: KeepAliveResult = { ok: false, status: 0, reason: "unauthorized" };
      return Response.json(body, { status: 401, headers });
    }
    const result = await pingSupabase(deps.env, deps.fetchImpl);
    (deps.log ?? console.log)(`supabase-keepalive ${JSON.stringify(result)}`);
    // Non-2xx marks the run as failed in the Vercel cron logs.
    return Response.json(result, { status: result.ok ? 200 : 503, headers });
  };
}

/** Bound to process.env (literal accesses so Next inlines the NEXT_PUBLIC_* values). */
export function defaultKeepAliveDeps(): KeepAliveDeps {
  return {
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      NEXT_PUBLIC_DATA_SOURCE: process.env.NEXT_PUBLIC_DATA_SOURCE,
      CRON_SECRET: process.env.CRON_SECRET,
    },
    isProduction: process.env.NODE_ENV === "production",
  };
}
