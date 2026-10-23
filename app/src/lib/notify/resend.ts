/**
 * Minimal Resend REST client (https://api.resend.com/emails) using fetch only, so it runs
 * in any runtime (Node or edge, no SDK). Never throws: returns a result object. Never logs the API key.
 */
export const RESEND_ENDPOINT = "https://api.resend.com/emails";

export interface ResendEmail {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}

export type ResendResult = { ok: true; id: string | null } | { ok: false; error: string };

export async function sendViaResend(
  apiKey: string,
  email: ResendEmail,
  fetchImpl: typeof fetch = fetch,
): Promise<ResendResult> {
  try {
    const res = await fetchImpl(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: email.from,
        to: [email.to],
        subject: email.subject,
        text: email.text,
        html: email.html,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { ok: false, error: `resend_http_${res.status}` };
    const body = (await res.json().catch(() => null)) as { id?: unknown } | null;
    return { ok: true, id: typeof body?.id === "string" ? body.id : null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.name : "unknown" };
  }
}

/** Raw outcome of a Resend call (used by the admin test email): HTTP status and body verbatim. */
export type ResendRawOutcome =
  | { kind: "response"; status: number; ok: boolean; body: string }
  | { kind: "network"; error: string };

/** Like sendViaResend but returns the status and body text as received instead of swallowing them. */
export async function sendViaResendRaw(
  apiKey: string,
  email: ResendEmail,
  fetchImpl: typeof fetch = fetch,
): Promise<ResendRawOutcome> {
  try {
    const res = await fetchImpl(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: email.from,
        to: [email.to],
        subject: email.subject,
        text: email.text,
        html: email.html,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const body = await res.text().catch(() => "");
    return { kind: "response", status: res.status, ok: res.ok, body };
  } catch (err) {
    return { kind: "network", error: err instanceof Error ? err.name : "unknown" };
  }
}
