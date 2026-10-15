/**
 * Browser helpers for the lead API. The lead token is held in an httpOnly cookie set by
 * the server, so these functions never see it: they just call same-origin routes.
 * Every failure throws a typed `LeadApiError`.
 */
import {
  LEAD_API_PATH,
  LEAD_COMPLETE_API_PATH,
  type LeadApiErrorCode,
  type LeadApiResponse,
} from "./api-types";
import type { LeadCompleteData, LeadCreateData, LeadPatchData } from "./schemas";

export type { LeadCompleteData, LeadCreateData, LeadPatchData } from "./schemas";

export class LeadApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: LeadApiErrorCode,
    /** For code "validation": field → error code. */
    readonly fields: Record<string, string> = {},
    /** For code "rate_limited": seconds to wait (Retry-After). */
    readonly retryAfterSec: number | null = null,
  ) {
    super(`Lead API error: ${code} (${status})`);
    this.name = "LeadApiError";
  }
}

async function call(path: string, method: string, body?: unknown): Promise<void> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      // Lets a PATCH sent right before navigation complete.
      keepalive: method === "PATCH",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new LeadApiError(0, "network_error");
  }

  let payload: LeadApiResponse | null = null;
  try {
    payload = (await res.json()) as LeadApiResponse;
  } catch {
    payload = null;
  }
  if (res.ok && payload?.ok) return;

  const code: LeadApiErrorCode =
    payload && payload.ok === false ? payload.error : res.status >= 500 ? "server_error" : "invalid_body";
  const fields = payload && payload.ok === false ? (payload.fields ?? {}) : {};
  const retry = Number(res.headers.get("Retry-After"));
  throw new LeadApiError(res.status, code, fields, Number.isFinite(retry) && retry > 0 ? retry : null);
}

/**
 * Page 1, on privacy consent: creates the lead (or updates the one already bound to this
 * browser session). `data.privacy_consent` must be true. Send only fields that are filled
 * and valid (see `toLeadCreateData` in flow-state.ts).
 */
export function createLead(data: LeadCreateData, turnstileToken: string): Promise<void> {
  return call(LEAD_API_PATH, "POST", { data, turnstileToken });
}

/**
 * Updates the current lead. `step_reached` may be "results" or "offer_chosen" and only
 * moves forward (a backward value is silently ignored by the server).
 * Throws code "no_lead" (401) / "lead_not_found" (404) when there is no lead to update.
 */
export function updateLead(patch: LeadPatchData): Promise<void> {
  return call(LEAD_API_PATH, "PATCH", { data: patch });
}

/**
 * Final submit of the activation form (step_reached = completed, status = new).
 * On success the server expires the lead cookie; keep the flow state for the thank-you page.
 */
export function completeLead(data: LeadCompleteData, turnstileToken: string): Promise<void> {
  return call(LEAD_COMPLETE_API_PATH, "POST", { data, turnstileToken });
}

/** Forgets the lead in this browser (expires the cookie). Use with `reset()` of the flow state. */
export function clearLead(): Promise<void> {
  return call(LEAD_API_PATH, "DELETE");
}
