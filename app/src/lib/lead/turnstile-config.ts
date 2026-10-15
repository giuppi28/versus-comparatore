/**
 * Client-side Turnstile configuration (safe for the browser).
 * Screens that render the Turnstile widget (Page 1 consent, activation submit) use
 * `getTurnstileSiteKey()`. Without NEXT_PUBLIC_TURNSTILE_SITE_KEY (dev/test) it returns
 * Cloudflare's official always-pass test site key.
 */
export const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";

export function getTurnstileSiteKey(): string {
  // Literal property access so Next inlines it in client bundles.
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  return key || TURNSTILE_TEST_SITE_KEY;
}
