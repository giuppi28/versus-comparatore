/**
 * Supabase keep-alive (free projects are paused after 7 days without activity).
 *
 * Does one cheap, public, RLS-compliant read with the PUBLISHABLE key (same one the browser
 * uses): `select istat_code from comuni limit 1`. No secret is involved.
 * Called from the Worker `scheduled()` handler (see cloudflare/worker.ts); the cron trigger
 * itself is commented out in wrangler.jsonc until Giuseppe enables it.
 */

export interface KeepAliveEnv {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  NEXT_PUBLIC_DATA_SOURCE?: string;
}

export interface KeepAliveResult {
  ok: boolean;
  /** HTTP status, or 0 when nothing was sent / the request failed. */
  status: number;
  reason?: "not_supabase_mode" | "missing_config" | "http_error" | "network_error" | "empty_response";
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
