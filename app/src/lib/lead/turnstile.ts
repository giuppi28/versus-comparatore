/**
 * Cloudflare Turnstile server-side verification (PRD §4.6). SERVER ONLY.
 *
 * Secret resolution:
 * - TURNSTILE_SECRET_KEY when set;
 * - otherwise, outside production, Cloudflare's official always-pass test secret
 *   `1x0000000000000000000000000000000AA` (pair it with the test site key
 *   `1x00000000000000000000AA` on the client, see turnstile-config.ts);
 * - in production with no secret: fail closed ("missing-input-secret").
 *
 * Cloudflare's documented TEST secrets are resolved locally (no network call), so dev,
 * Vitest and Playwright run offline and deterministically:
 *   1x0000000000000000000000000000000AA → always passes
 *   2x0000000000000000000000000000000AA → always fails
 *   3x0000000000000000000000000000000AA → fails with "timeout-or-duplicate"
 * Real secrets never match these values.
 */

export const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
export const TURNSTILE_TEST_SECRET_PASS = "1x0000000000000000000000000000000AA";
export const TURNSTILE_TEST_SECRET_FAIL = "2x0000000000000000000000000000000AA";
export const TURNSTILE_TEST_SECRET_SPENT = "3x0000000000000000000000000000000AA";

export interface TurnstileResult {
  success: boolean;
  errorCodes: string[];
}

export interface TurnstileOptions {
  secret?: string | undefined;
  isProduction?: boolean;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export type TurnstileVerifier = (token: string, remoteIp?: string | null) => Promise<TurnstileResult>;

export function resolveTurnstileSecret(
  secret: string | undefined,
  isProduction: boolean,
): string | null {
  const s = secret?.trim();
  if (s) return s;
  return isProduction ? null : TURNSTILE_TEST_SECRET_PASS;
}

export async function verifyTurnstile(
  token: string,
  remoteIp: string | null | undefined,
  opts: TurnstileOptions = {},
): Promise<TurnstileResult> {
  const isProduction = opts.isProduction ?? process.env.NODE_ENV === "production";
  const secret = resolveTurnstileSecret(
    "secret" in opts ? opts.secret : process.env.TURNSTILE_SECRET_KEY,
    isProduction,
  );
  if (!secret) {
    console.error("[turnstile] TURNSTILE_SECRET_KEY is not set: rejecting (fail closed)");
    return { success: false, errorCodes: ["missing-input-secret"] };
  }
  if (!token || token.length > 2048) {
    return { success: false, errorCodes: [token ? "invalid-input-response" : "missing-input-response"] };
  }

  if (secret === TURNSTILE_TEST_SECRET_PASS) return { success: true, errorCodes: [] };
  if (secret === TURNSTILE_TEST_SECRET_FAIL) {
    return { success: false, errorCodes: ["invalid-input-response"] };
  }
  if (secret === TURNSTILE_TEST_SECRET_SPENT) {
    return { success: false, errorCodes: ["timeout-or-duplicate"] };
  }

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);
  const doFetch = opts.fetchImpl ?? fetch;
  try {
    const res = await doFetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(opts.timeoutMs ?? 5000),
    });
    if (!res.ok) return { success: false, errorCodes: [`http-${res.status}`] };
    const json = (await res.json()) as { success?: unknown; "error-codes"?: unknown };
    const errorCodes = Array.isArray(json["error-codes"])
      ? json["error-codes"].filter((c): c is string => typeof c === "string")
      : [];
    return { success: json.success === true, errorCodes };
  } catch (err) {
    console.error("[turnstile] verification request failed:", err);
    return { success: false, errorCodes: ["internal-error"] };
  }
}

/** Default verifier bound to process.env (used by the route handlers). */
export const defaultTurnstileVerifier: TurnstileVerifier = (token, remoteIp) =>
  verifyTurnstile(token, remoteIp);
