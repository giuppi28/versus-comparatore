/**
 * Lead API route handlers (PRD §4, §5.1, §10). SERVER ONLY.
 *
 * Built as a factory over injectable dependencies so tests can run them against the
 * mock repository with plain `Request` objects. The route files in
 * src/app/api/lead/** only bind them to the default dependencies.
 *
 * Identity documents (POST /api/lead/document): multipart upload bound to the same cookie,
 * size-capped before the body is read, declared type + magic bytes checked, then stored by
 * Repository.uploadLeadDocument. DELETE /api/lead/document `{ id }` removes one of the
 * lead's documents (Repository.removeLeadDocument). Responses never contain the lead id
 * or storage path.
 *
 * Token handling: the secret lead token lives only in the httpOnly `versus_lead` cookie;
 * it is never put in a response body. On successful completion both lead cookies are
 * expired (the thank-you page reads its summary from the client flow state).
 */
import "server-only";
import { NextResponse } from "next/server";
import {
  getRepository,
  InvalidLeadDocumentError,
  isUuid,
  LeadDocumentLimitError,
  LeadDocumentNotFoundError,
  LeadNotFoundError,
  PrivacyConsentRequiredError,
} from "@/lib/data";
import { LeadApiSecretError } from "@/lib/data/repository";
import type { LeadData, LeadDocument, LeadStepReached, Repository } from "@/lib/data";
import {
  DOCUMENT_ALLOWED_MIMES,
  DOCUMENT_MAX_BYTES,
  sniffDocumentType,
  type DocumentMime,
} from "@/lib/logic/validators";
import {
  LEAD_COOKIE,
  LEAD_COOKIE_MAX_AGE_SEC,
  LEAD_DOCUMENT_FIELD,
  LEAD_STEP_COOKIE,
  type LeadApiErrorCode,
  type LeadApiResponse,
} from "./api-types";
import {
  checkCompletion,
  checkCompletionReferences,
  checkPatchActivation,
  italianToday,
} from "./completion";
import { notifyNewLead, type NotifyNewLead } from "./notify";
// Registers the server-only LEAD_API_SECRET reader used by the Supabase lead RPCs.
import "./secret";
import {
  clientIp,
  LEAD_RATE_LIMITS,
  SlidingWindowRateLimiter,
  type LeadRouteKey,
} from "./rate-limit";
import { STEP_ORDER, stepRank } from "./rules";
import {
  completeBodySchema,
  createBodySchema,
  patchBodySchema,
  zodFieldErrors,
  type FieldErrors,
} from "./schemas";

export const MAX_BODY_BYTES = 32 * 1024;
/** Upload request cap: one 5 MiB file + multipart overhead (boundaries, part headers). */
export const MAX_DOCUMENT_REQUEST_BYTES = DOCUMENT_MAX_BYTES + 64 * 1024;

export interface LeadHandlerDeps {
  getRepository: () => Repository;
  notify: NotifyNewLead;
  limiters: Record<LeadRouteKey, SlidingWindowRateLimiter>;
  /** Controls the cookie `Secure` flag. */
  isProduction: boolean;
  now?: () => Date;
}

export interface LeadHandlers {
  /** POST /api/lead */
  create(request: Request): Promise<Response>;
  /** PATCH /api/lead */
  update(request: Request): Promise<Response>;
  /** POST /api/lead/complete */
  complete(request: Request): Promise<Response>;
  /** DELETE /api/lead — forget the lead in this browser (expires the cookies). */
  clear(request: Request): Promise<Response>;
  /** POST /api/lead/document — identity document upload (multipart, field `file`). */
  uploadDocument(request: Request): Promise<Response>;
  /** DELETE /api/lead/document — removes an uploaded document (JSON `{ id }`). */
  removeDocument(request: Request): Promise<Response>;
}

export function createRateLimiters(): Record<LeadRouteKey, SlidingWindowRateLimiter> {
  return {
    create: new SlidingWindowRateLimiter(LEAD_RATE_LIMITS.create),
    update: new SlidingWindowRateLimiter(LEAD_RATE_LIMITS.update),
    complete: new SlidingWindowRateLimiter(LEAD_RATE_LIMITS.complete),
    clear: new SlidingWindowRateLimiter(LEAD_RATE_LIMITS.clear),
    document: new SlidingWindowRateLimiter(LEAD_RATE_LIMITS.document),
    documentRemove: new SlidingWindowRateLimiter(LEAD_RATE_LIMITS.documentRemove),
  };
}

export function defaultLeadDeps(): LeadHandlerDeps {
  return {
    getRepository,
    notify: notifyNewLead,
    limiters: createRateLimiters(),
    isProduction: process.env.NODE_ENV === "production",
  };
}

// ---------------------------------------------------------------------------

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: LeadApiErrorCode,
    readonly fields?: FieldErrors,
    readonly headers?: Record<string, string>,
  ) {
    super(code);
  }
}

const validationError = (fields: FieldErrors) => new HttpError(422, "validation", fields);

/**
 * `instanceof` plus a match on the error's explicit `name`. Needed because the repository
 * singleton is cached on globalThis (src/lib/data/index.ts) and may have been created by
 * another route bundle, whose copy of the error classes is a different class object.
 */
function isRepoError<T extends Error>(
  err: unknown,
  cls: abstract new (...args: never[]) => T,
  name: string,
): err is T {
  return err instanceof cls || (err instanceof Error && err.name === name);
}

const isLeadNotFound = (err: unknown) => isRepoError(err, LeadNotFoundError, "LeadNotFoundError");
const isLeadApiSecretError = (err: unknown) => isRepoError(err, LeadApiSecretError, "LeadApiSecretError");

function json(body: LeadApiResponse, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    const raw = part.slice(eq + 1).trim();
    try {
      return decodeURIComponent(raw) || null;
    } catch {
      return null;
    }
  }
  return null;
}

function readStep(request: Request): LeadStepReached {
  const v = readCookie(request, LEAD_STEP_COOKIE);
  return v && (STEP_ORDER as readonly string[]).includes(v) ? (v as LeadStepReached) : "page1";
}

/** Rejects cross-origin browser requests (defence in depth on top of SameSite=Lax). */
function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, "forbidden_origin");
  }
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).host;
  if (originHost !== host) throw new HttpError(403, "forbidden_origin");
}

async function readJson(request: Request): Promise<unknown> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.toLowerCase().includes("application/json")) throw new HttpError(400, "invalid_body");
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) throw new HttpError(413, "payload_too_large");
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, "payload_too_large");
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new HttpError(400, "invalid_body");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "invalid_body");
  return body;
}

/** Reads the request body, aborting as soon as it exceeds `max` bytes (→ 413 file_size). */
async function readBodyCapped(request: Request, max: number): Promise<Uint8Array> {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array(0);
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel().catch(() => {});
      throw new HttpError(413, "file_size");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

/** Parses a multipart body with exactly one part, `file`, holding a file. */
async function readDocumentFile(request: Request): Promise<File> {
  const type = request.headers.get("content-type") ?? "";
  if (!/^multipart\/form-data\s*;\s*boundary=/i.test(type)) throw new HttpError(400, "invalid_body");
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_DOCUMENT_REQUEST_BYTES) throw new HttpError(413, "file_size");
  const raw = await readBodyCapped(request, MAX_DOCUMENT_REQUEST_BYTES);
  let form: FormData;
  try {
    form = await new Response(raw as BodyInit, { headers: { "content-type": type } }).formData();
  } catch {
    throw new HttpError(400, "invalid_body");
  }
  const entries = form.getAll(LEAD_DOCUMENT_FIELD);
  if ([...form.keys()].some((k) => k !== LEAD_DOCUMENT_FIELD) || entries.length > 1) {
    throw new HttpError(400, "invalid_body");
  }
  const file = entries[0];
  if (!file || typeof file === "string") throw new HttpError(422, "file_missing");
  return file;
}

const isAllowedMime = (type: string): type is DocumentMime =>
  (DOCUMENT_ALLOWED_MIMES as readonly string[]).includes(type);

export function createLeadHandlers(deps: LeadHandlerDeps): LeadHandlers {
  const cookieBase = {
    httpOnly: true,
    secure: deps.isProduction,
    sameSite: "lax" as const,
    path: "/",
  };

  function setLeadCookies(res: NextResponse, token: string | null, step: LeadStepReached | null) {
    if (token) res.cookies.set(LEAD_COOKIE, token, { ...cookieBase, maxAge: LEAD_COOKIE_MAX_AGE_SEC });
    if (step) res.cookies.set(LEAD_STEP_COOKIE, step, { ...cookieBase, maxAge: LEAD_COOKIE_MAX_AGE_SEC });
  }

  function clearLeadCookies(res: NextResponse) {
    res.cookies.set(LEAD_COOKIE, "", { ...cookieBase, maxAge: 0 });
    res.cookies.set(LEAD_STEP_COOKIE, "", { ...cookieBase, maxAge: 0 });
  }

  function rateLimit(request: Request, route: LeadRouteKey) {
    const r = deps.limiters[route].hit(`${route}:${clientIp(request.headers)}`);
    if (!r.allowed) {
      throw new HttpError(429, "rate_limited", undefined, { "Retry-After": String(r.retryAfterSec) });
    }
  }

  function requireToken(request: Request): string {
    const token = readCookie(request, LEAD_COOKIE);
    if (!token) throw new HttpError(401, "no_lead");
    return token;
  }

  /** Wraps a handler: maps HttpError / repository errors to the JSON error contract. */
  function handle(route: LeadRouteKey, fn: (request: Request) => Promise<NextResponse>) {
    return async (request: Request): Promise<Response> => {
      try {
        assertSameOrigin(request);
        rateLimit(request, route);
        return await fn(request);
      } catch (err) {
        if (err instanceof HttpError) {
          const body: LeadApiResponse = err.fields
            ? { ok: false, error: err.code, fields: err.fields }
            : { ok: false, error: err.code };
          return json(body, err.status, err.headers);
        }
        if (isLeadNotFound(err)) {
          const res = json({ ok: false, error: "lead_not_found" }, 404);
          clearLeadCookies(res);
          return res;
        }
        if (isRepoError(err, PrivacyConsentRequiredError, "PrivacyConsentRequiredError")) {
          return json({ ok: false, error: "privacy_consent_required" }, 400);
        }
        if (isLeadApiSecretError(err)) {
          // Server misconfiguration (LEAD_API_SECRET missing / not matching the DB hash).
          // Never the client's fault; the secret itself is never logged.
          console.error(`[lead] ${route} failed: LEAD_API_SECRET ${err.reason} (server misconfiguration)`);
          return json({ ok: false, error: "server_error" }, 500);
        }
        console.error(`[lead] ${route} failed:`, err instanceof Error ? `${err.name}: ${err.message}` : err);
        return json({ ok: false, error: "server_error" }, 500);
      }
    };
  }

  return {
    create: handle("create", async (request) => {
      const body = await readJson(request);
      const data = (body as { data?: unknown }).data;
      if (!data || typeof data !== "object" || (data as { privacy_consent?: unknown }).privacy_consent !== true) {
        throw new HttpError(400, "privacy_consent_required");
      }
      const parsed = createBodySchema.safeParse(body);
      if (!parsed.success) throw validationError(zodFieldErrors(parsed.error, body));

      const repo = deps.getRepository();
      const existing = readCookie(request, LEAD_COOKIE);
      // Same browser session re-submitting Page 1: update the same lead instead of
      // creating a duplicate (PRD §5.1 "the same record is updated at each step").
      if (existing) {
        try {
          const { privacy_consent: _consent, ...patch } = parsed.data.data;
          void _consent;
          await repo.updateLead(existing, patch);
          const res = json({ ok: true });
          setLeadCookies(res, existing, null);
          return res;
        } catch (err) {
          if (!isLeadNotFound(err)) throw err;
        }
      }
      const ref = await repo.createLead(parsed.data.data);
      const res = json({ ok: true }, 201);
      setLeadCookies(res, ref.token, "page1");
      return res;
    }),

    update: handle("update", async (request) => {
      const token = requireToken(request);
      const body = await readJson(request);
      const parsed = patchBodySchema.safeParse(body);
      if (!parsed.success) throw validationError(zodFieldErrors(parsed.error, body));

      const today = italianToday(deps.now?.() ?? new Date());
      const checked = checkPatchActivation(parsed.data.data, today);
      if (Object.keys(checked.fields).length > 0) throw validationError(checked.fields);
      const patch: LeadData = checked.data;
      const current = readStep(request);
      let advancedTo: LeadStepReached | null = null;
      if (patch.step_reached) {
        // Forward only (page1 → results → offer_chosen); a backward step is ignored so
        // "Indietro" navigation never fails, the rest of the patch is still saved.
        if (stepRank(patch.step_reached) > stepRank(current)) advancedTo = patch.step_reached;
        else delete patch.step_reached;
      }

      await deps.getRepository().updateLead(token, patch);
      const res = json({ ok: true });
      setLeadCookies(res, null, advancedTo);
      return res;
    }),

    complete: handle("complete", async (request) => {
      const token = requireToken(request);
      const body = await readJson(request);
      const parsed = completeBodySchema.safeParse(body);
      if (!parsed.success) throw validationError(zodFieldErrors(parsed.error, body));

      const { fields, data } = checkCompletion(parsed.data.data, italianToday(deps.now?.() ?? new Date()));
      if (Object.keys(fields).length > 0) throw validationError(fields);
      const repo = deps.getRepository();
      const refFields = await checkCompletionReferences(repo, data);
      if (Object.keys(refFields).length > 0) throw validationError(refFields);

      const ref = await repo.completeLead(token, data);
      const completedAt = (deps.now?.() ?? new Date()).toISOString();
      try {
        await deps.notify({ id: ref.id, data, completedAt, notificationEmail: ref.notification_email });
      } catch (err) {
        // The lead is saved; a notification failure must not fail the customer's submit.
        console.error("[lead] notification failed:", err instanceof Error ? err.message : err);
      }
      const res = json({ ok: true });
      clearLeadCookies(res);
      return res;
    }),

    clear: handle("clear", async () => {
      const res = json({ ok: true });
      clearLeadCookies(res);
      return res;
    }),

    uploadDocument: handle("document", async (request) => {
      const token = requireToken(request);
      const file = await readDocumentFile(request);
      if (file.size === 0) throw new HttpError(422, "file_missing");
      const declaredType = file.type.toLowerCase();
      if (!isAllowedMime(declaredType)) throw new HttpError(415, "file_type");
      if (file.size > DOCUMENT_MAX_BYTES) throw new HttpError(413, "file_size");
      const bytes = new Uint8Array(await file.arrayBuffer());
      // A renamed file (e.g. a PNG saved as .jpg) is declared by the browser from its extension.
      if (sniffDocumentType(bytes) !== declaredType) throw new HttpError(422, "file_content");

      let doc: LeadDocument;
      try {
        doc = await deps.getRepository().uploadLeadDocument(token, { mime: declaredType, bytes });
      } catch (err) {
        if (isRepoError(err, InvalidLeadDocumentError, "InvalidLeadDocumentError")) {
          if (err.reason === "type") throw new HttpError(415, "file_type");
          if (err.reason === "size") throw new HttpError(413, "file_size");
          throw new HttpError(422, "file_content");
        }
        if (isRepoError(err, LeadDocumentLimitError, "LeadDocumentLimitError")) throw new HttpError(409, "too_many_files");
        // Mapped by `handle` (404 + cookies expired / 500 misconfiguration).
        if (isLeadNotFound(err) || isLeadApiSecretError(err)) throw err;
        console.error("[lead] document upload failed:", err instanceof Error ? `${err.name}: ${err.message}` : err);
        throw new HttpError(502, "upload_failed");
      }
      return json(
        { ok: true, document: { id: doc.id, mime_type: doc.mime_type, size_bytes: doc.size_bytes } },
        201,
      );
    }),

    removeDocument: handle("documentRemove", async (request) => {
      const token = requireToken(request);
      const body = await readJson(request);
      const keys = Object.keys(body as object);
      const id = (body as { id?: unknown }).id;
      if (keys.length !== 1 || !isUuid(id)) throw new HttpError(400, "invalid_body");
      try {
        await deps.getRepository().removeLeadDocument(token, id.toLowerCase());
      } catch (err) {
        if (isRepoError(err, LeadDocumentNotFoundError, "LeadDocumentNotFoundError")) {
          throw new HttpError(404, "document_not_found");
        }
        // Mapped by `handle` (404 + cookies expired / 500 misconfiguration).
        if (isLeadNotFound(err) || isLeadApiSecretError(err)) throw err;
        // Storage failure: the document is kept, the customer can retry.
        console.error("[lead] document removal failed:", err instanceof Error ? `${err.name}: ${err.message}` : err);
        throw new HttpError(500, "server_error");
      }
      return json({ ok: true });
    }),
  };
}

// Module-level singleton for the route files (rate-limiter state lives here).
let handlers: LeadHandlers | undefined;

export function getLeadHandlers(): LeadHandlers {
  handlers ??= createLeadHandlers(defaultLeadDeps());
  return handlers;
}
