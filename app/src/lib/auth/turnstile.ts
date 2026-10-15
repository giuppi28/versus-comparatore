/** Cloudflare Turnstile helpers (server-side verification). */

/** Cloudflare test keys: always pass. Used only when env is missing outside production. */
export const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
export const TURNSTILE_TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";
export const TURNSTILE_RESPONSE_FIELD = "cf-turnstile-response";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function getTurnstileSiteKey(): string {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || TURNSTILE_TEST_SITE_KEY;
}

/** Secret from env; test secret outside production; null (fail closed) in production. */
export function getTurnstileSecret(): string | null {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") return null;
  return TURNSTILE_TEST_SECRET_KEY;
}

export interface VerifyTurnstileOptions {
  secret?: string | null;
  remoteIp?: string;
  fetchImpl?: typeof fetch;
}

/** True only when Cloudflare confirms the token. Any error fails closed. */
export async function verifyTurnstile(
  token: string | null | undefined,
  { secret = getTurnstileSecret(), remoteIp, fetchImpl = fetch }: VerifyTurnstileOptions = {},
): Promise<boolean> {
  if (!secret || !token || token.length > 2048) return false;
  // The always-pass test secret is deterministic: skip the network round trip.
  if (secret === TURNSTILE_TEST_SECRET_KEY && process.env.NODE_ENV !== "production") return true;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);
    const res = await fetchImpl(VERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
