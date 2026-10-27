/**
 * Browser helpers for the lead API. The lead token is held in an httpOnly cookie set by
 * the server, so these functions never see it: they just call same-origin routes.
 * Every failure throws a typed `LeadApiError`.
 */
import {
  DOCUMENT_ALLOWED_MIMES,
  DOCUMENT_MAX_BYTES,
} from "@/lib/logic/validators/file-type";
import {
  LEAD_API_PATH,
  LEAD_COMPLETE_API_PATH,
  LEAD_DOCUMENT_API_PATH,
  LEAD_DOCUMENT_FIELD,
  LEAD_DOCUMENT_KIND_FIELD,
  type LeadApiErrorCode,
  type LeadApiFailure,
  type LeadApiResponse,
  type LeadDocumentRemoveBody,
  type UploadedLeadDocument,
} from "./api-types";
import type { LeadDocumentKind } from "@/lib/data/types";
import type { LeadCompleteData, LeadCreateData, LeadPatchData } from "./schemas";

export type { LeadCompleteData, LeadCreateData, LeadPatchData } from "./schemas";
export type { UploadedLeadDocument } from "./api-types";

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
export function createLead(data: LeadCreateData): Promise<void> {
  return call(LEAD_API_PATH, "POST", { data });
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
export function completeLead(data: LeadCompleteData): Promise<void> {
  return call(LEAD_COMPLETE_API_PATH, "POST", { data });
}

/** Error code for a response without a JSON error body (e.g. a proxy 413). */
function uploadFallbackCode(status: number): LeadApiErrorCode {
  if (status === 413) return "file_size";
  if (status === 415) return "file_type";
  if (status === 429) return "rate_limited";
  if (status === 401) return "no_lead";
  if (status >= 500) return "upload_failed";
  return "invalid_body";
}

/**
 * Uploads an identity document (JPEG or PDF, max 5 MiB, max 2 per lead) for the current
 * lead. Obvious problems are rejected before sending (same codes as the server):
 * "file_missing" (empty), "file_type", "file_size". Server codes: "no_lead",
 * "lead_not_found", "file_content" (bytes are not a real JPEG/PDF), "too_many_files",
 * "rate_limited", "upload_failed", "forbidden_origin", "server_error"; "network_error"
 * when the request fails. Returns the stored document's metadata (keep `id` in the flow
 * state to show the uploaded file).
 */
export async function uploadLeadDocument(
  file: File,
  kind: LeadDocumentKind = "id_document",
): Promise<UploadedLeadDocument> {
  if (!file || file.size === 0) throw new LeadApiError(422, "file_missing");
  if (!(DOCUMENT_ALLOWED_MIMES as readonly string[]).includes(file.type.toLowerCase())) {
    throw new LeadApiError(415, "file_type");
  }
  // A bill is a PDF only (server: "file_type"); a second bill gives "too_many_bills".
  if (kind === "bill" && file.type.toLowerCase() !== "application/pdf") throw new LeadApiError(415, "file_type");
  if (file.size > DOCUMENT_MAX_BYTES) throw new LeadApiError(413, "file_size");

  const form = new FormData();
  form.append(LEAD_DOCUMENT_FIELD, file, file.name || "documento");
  if (kind === "bill") form.append(LEAD_DOCUMENT_KIND_FIELD, kind);
  let res: Response;
  try {
    // No Content-Type header: the browser sets the multipart boundary.
    res = await fetch(LEAD_DOCUMENT_API_PATH, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      body: form,
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
  if (res.ok && payload?.ok && "document" in payload) {
    const { id, mime_type, size_bytes } = payload.document;
    return { id, kind: payload.document.kind ?? kind, mime_type, size_bytes };
  }
  const failure = payload && payload.ok === false ? (payload as LeadApiFailure) : null;
  const retry = Number(res.headers.get("Retry-After"));
  throw new LeadApiError(
    res.status,
    failure ? failure.error : uploadFallbackCode(res.status),
    {},
    Number.isFinite(retry) && retry > 0 ? retry : null,
  );
}

/**
 * Removes an uploaded identity document of the current lead (`id` returned by
 * uploadLeadDocument); the freed slot can be used for another upload. Throws LeadApiError:
 * "document_not_found" (404: not a document of this lead / already removed), "no_lead",
 * "lead_not_found", "invalid_body", "rate_limited", "forbidden_origin", "server_error"
 * (the document is kept: retry later), "network_error".
 */
export function removeLeadDocument(id: string): Promise<void> {
  return call(LEAD_DOCUMENT_API_PATH, "DELETE", { id } satisfies LeadDocumentRemoveBody);
}

/** Forgets the lead in this browser (expires the cookie). Use with `reset()` of the flow state. */
export function clearLead(): Promise<void> {
  return call(LEAD_API_PATH, "DELETE");
}
