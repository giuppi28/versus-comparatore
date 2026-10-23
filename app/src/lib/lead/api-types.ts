/** Wire contract of the lead API, shared by the route handlers and the browser client. */

export const LEAD_API_PATH = "/api/lead";
export const LEAD_COMPLETE_API_PATH = "/api/lead/complete";
export const LEAD_DOCUMENT_API_PATH = "/api/lead/document";
/** multipart/form-data field holding the uploaded file. */
export const LEAD_DOCUMENT_FIELD = "file";

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
  | "network_error" // client only: fetch failed / no response
  // POST /api/lead/document only:
  | "file_missing" // 422: no `file` part, or an empty file
  | "file_type" // 415: declared type not image/jpeg / application/pdf
  | "file_size" // 413: file > 5 MiB (or request body too large)
  | "file_content" // 422: magic bytes do not match the declared type
  | "too_many_files" // 409: the lead already has the maximum number of documents
  | "upload_failed" // 502: storage error, retry later
  // DELETE /api/lead/document only:
  | "document_not_found"; // 404: not a document of this lead, or already removed

export interface LeadApiSuccess {
  ok: true;
}

/** Metadata of an uploaded identity document (never the lead id or the storage path). */
export interface UploadedLeadDocument {
  id: string;
  mime_type: "image/jpeg" | "application/pdf";
  size_bytes: number;
}

/** 201 response of POST /api/lead/document. */
export interface LeadDocumentUploadSuccess {
  ok: true;
  document: UploadedLeadDocument;
}

/** JSON body of DELETE /api/lead/document (200 response: LeadApiSuccess). */
export interface LeadDocumentRemoveBody {
  /** `id` returned by the upload. */
  id: string;
}

export interface LeadApiFailure {
  ok: false;
  error: LeadApiErrorCode;
  /** Only for "validation": field → error code (see schemas.ts). */
  fields?: Record<string, string>;
}

export type LeadApiResponse = LeadApiSuccess | LeadDocumentUploadSuccess | LeadApiFailure;
