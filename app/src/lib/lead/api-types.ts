/** Wire contract of the lead API, shared by the route handlers and the browser client. */

export const LEAD_API_PATH = "/api/lead";
export const LEAD_COMPLETE_API_PATH = "/api/lead/complete";

/** httpOnly cookie holding the secret lead token (never readable by JS). */
export const LEAD_COOKIE = "versus_lead";
/** httpOnly cookie holding the furthest step_reached, used to keep the step forward-only. */
export const LEAD_STEP_COOKIE = "versus_lead_step";
/** Cookie lifetime: one comparison session. */
export const LEAD_COOKIE_MAX_AGE_SEC = 24 * 60 * 60;

export type LeadApiErrorCode =
  | "invalid_body" // 400: not JSON / not an object / wrong content type
  | "privacy_consent_required" // 400: create without privacy_consent === true
  | "no_lead" // 401: no lead cookie
  | "forbidden_origin" // 403: cross-origin request
  | "lead_not_found" // 404: cookie token unknown / lead already completed
  | "payload_too_large" // 413
  | "validation" // 422: see `fields`
  | "rate_limited" // 429: see Retry-After
  | "server_error" // 500
  | "network_error"; // client only: fetch failed / no response

export interface LeadApiSuccess {
  ok: true;
}

export interface LeadApiFailure {
  ok: false;
  error: LeadApiErrorCode;
  /** Only for "validation": field → error code (see schemas.ts). */
  fields?: Record<string, string>;
}

export type LeadApiResponse = LeadApiSuccess | LeadApiFailure;
