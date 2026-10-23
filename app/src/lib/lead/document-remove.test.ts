// @vitest-environment node
/** DELETE /api/lead/document (Phase 12b, T12b.1) + the browser helper. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRepository, LeadDocumentNotFoundError, type Repository } from "@/lib/data";
import { LEAD_COOKIE } from "./api-types";
import { LeadApiError, removeLeadDocument } from "./client";
import { createLeadHandlers, createRateLimiters, type LeadHandlers } from "./handlers";
import { SlidingWindowRateLimiter } from "./rate-limit";
import { completeData, page1Data } from "./test-fixtures";

const URL_BASE = "http://localhost:3000";
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const PDF = new TextEncoder().encode("%PDF-1.7\n%test\n");

let repo: Repository;
let handlers: LeadHandlers;

function setup(opts: { limiters?: ReturnType<typeof createRateLimiters>; repo?: Repository } = {}) {
  repo = opts.repo ?? createMockRepository();
  handlers = createLeadHandlers({
    getRepository: () => repo,
    notify: vi.fn(async () => {}),
    limiters: opts.limiters ?? createRateLimiters(),
    isProduction: false,
  });
}

beforeEach(() => setup());

/** Creates a lead through the API; returns the cookie header and the token. */
async function newLead(): Promise<{ cookie: string; token: string }> {
  const res = await handlers.create(
    new Request(`${URL_BASE}/api/lead`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: page1Data() }),
    }),
  );
  expect(res.status).toBe(201);
  const token = res.headers.getSetCookie()[0].split(";")[0].split("=")[1];
  return { cookie: `${LEAD_COOKIE}=${token}`, token };
}

async function uploadVia(cookie: string, bytes = JPEG, type = "image/jpeg"): Promise<Response> {
  const form = new FormData();
  form.append("file", new File([bytes as BlobPart], type === "image/jpeg" ? "doc.jpg" : "doc.pdf", { type }));
  return handlers.uploadDocument(
    new Request(`${URL_BASE}/api/lead/document`, { method: "POST", headers: { cookie }, body: form }),
  );
}

async function uploadedId(cookie: string, bytes = JPEG, type = "image/jpeg"): Promise<string> {
  const res = await uploadVia(cookie, bytes, type);
  expect(res.status).toBe(201);
  return (await res.json()).document.id as string;
}

function del(body: unknown, opts: { cookie?: string; headers?: Record<string, string>; raw?: string } = {}): Request {
  return new Request(`${URL_BASE}/api/lead/document`, {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      ...(opts.cookie ? { cookie: opts.cookie } : {}),
      ...opts.headers,
    },
    body: opts.raw ?? JSON.stringify(body),
  });
}

async function expectError(res: Response, status: number, error: string) {
  expect(res.status).toBe(status);
  expect(await res.json()).toEqual({ ok: false, error });
}

/** Lead id behind a token (mock only: the API never exposes it). */
async function leadIdOf(token: string): Promise<string> {
  const lead = (await repo.listLeads()).find((l) => l.token === token);
  expect(lead).toBeDefined();
  return lead!.id;
}

describe("DELETE /api/lead/document", () => {
  it("removes a document: 200 { ok: true }, the slot is free again (cap back to 1/2)", async () => {
    const { cookie, token } = await newLead();
    const first = await uploadedId(cookie);
    await uploadedId(cookie, PDF, "application/pdf");
    await expectError(await uploadVia(cookie), 409, "too_many_files");

    const res = await handlers.removeDocument(del({ id: first }, { cookie }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ ok: true });

    const leadId = await leadIdOf(token);
    expect((await repo.listLeadDocuments(leadId)).map((d) => d.mime_type)).toEqual(["application/pdf"]);
    // Re-upload into the freed slot, then the cap applies again.
    const replacement = await uploadedId(cookie);
    await expectError(await uploadVia(cookie), 409, "too_many_files");
    expect((await repo.listLeadDocuments(leadId)).map((d) => d.id)).toContain(replacement);
  });

  it("removed documents disappear from the admin lead detail (listLeadDocuments / signed URL)", async () => {
    const { cookie, token } = await newLead();
    const id = await uploadedId(cookie);
    const leadId = await leadIdOf(token);
    expect(await repo.listLeadDocuments(leadId)).toHaveLength(1);
    expect((await handlers.removeDocument(del({ id }, { cookie }))).status).toBe(200);
    expect(await repo.listLeadDocuments(leadId)).toEqual([]);
    await expect(repo.createLeadDocumentUrl(id)).rejects.toBeInstanceOf(LeadDocumentNotFoundError);
  });

  it("404 document_not_found for another lead's document, an unknown id or one already removed", async () => {
    const a = await newLead();
    const b = await newLead();
    const docB = await uploadedId(b.cookie);
    await expectError(await handlers.removeDocument(del({ id: docB }, { cookie: a.cookie })), 404, "document_not_found");
    expect(await repo.listLeadDocuments(await leadIdOf(b.token))).toHaveLength(1);

    await expectError(
      await handlers.removeDocument(del({ id: "00000000-0000-4000-8000-000000000000" }, { cookie: a.cookie })),
      404,
      "document_not_found",
    );
    expect((await handlers.removeDocument(del({ id: docB }, { cookie: b.cookie }))).status).toBe(200);
    await expectError(await handlers.removeDocument(del({ id: docB }, { cookie: b.cookie })), 404, "document_not_found");
  });

  it("404 lead_not_found (cookies expired) for a completed lead; its file is kept", async () => {
    const { cookie, token } = await newLead();
    const id = await uploadedId(cookie);
    const done = await handlers.complete(
      new Request(`${URL_BASE}/api/lead/complete`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ data: completeData() }),
      }),
    );
    expect(done.status).toBe(200);
    const res = await handlers.removeDocument(del({ id }, { cookie }));
    await expectError(res, 404, "lead_not_found");
    expect(res.headers.getSetCookie().join(";")).toContain(`${LEAD_COOKIE}=;`);
    expect(await repo.listLeadDocuments(await leadIdOf(token))).toHaveLength(1);
  });

  it("401 no_lead without the cookie; 404 lead_not_found for a forged token", async () => {
    const { cookie } = await newLead();
    const id = await uploadedId(cookie);
    await expectError(await handlers.removeDocument(del({ id })), 401, "no_lead");
    await expectError(
      await handlers.removeDocument(del({ id }, { cookie: `${LEAD_COOKIE}=${"0".repeat(64)}` })),
      404,
      "lead_not_found",
    );
    await expectError(await handlers.removeDocument(del({ id }, { cookie: `${LEAD_COOKIE}=nope` })), 404, "lead_not_found");
  });

  it("400 invalid_body for a non-JSON body, a missing / non-UUID id or extra keys", async () => {
    const { cookie } = await newLead();
    const id = await uploadedId(cookie);
    const bad: Request[] = [
      del(null, { cookie, raw: "not json" }),
      del(null, { cookie, raw: `{"id":"${id}"}`, headers: { "content-type": "text/plain" } }),
      del([id], { cookie }),
      del({}, { cookie }),
      del({ id: 42 }, { cookie }),
      del({ id: "../other-lead/file.jpg" }, { cookie }),
      del({ id: `${id}x` }, { cookie }),
      del({ id, path: "x" }, { cookie }),
    ];
    for (const req of bad) await expectError(await handlers.removeDocument(req), 400, "invalid_body");
    // Upper-case UUID text is the same document.
    expect((await handlers.removeDocument(del({ id: id.toUpperCase() }, { cookie }))).status).toBe(200);
  });

  it("403 forbidden_origin for cross-origin requests (nothing removed)", async () => {
    const { cookie, token } = await newLead();
    const id = await uploadedId(cookie);
    await expectError(
      await handlers.removeDocument(del({ id }, { cookie, headers: { origin: "https://evil.example", host: "localhost:3000" } })),
      403,
      "forbidden_origin",
    );
    expect(await repo.listLeadDocuments(await leadIdOf(token))).toHaveLength(1);
  });

  it("429 rate_limited per IP with Retry-After (own limiter, uploads unaffected)", async () => {
    const limiters = createRateLimiters();
    limiters.documentRemove = new SlidingWindowRateLimiter({ limit: 1, windowMs: 60_000 });
    setup({ limiters });
    const { cookie } = await newLead();
    const id = await uploadedId(cookie);
    const ip = { "x-real-ip": "203.0.113.9" };
    expect((await handlers.removeDocument(del({ id }, { cookie, headers: ip }))).status).toBe(200);
    const res = await handlers.removeDocument(del({ id }, { cookie, headers: ip }));
    await expectError(res, 429, "rate_limited");
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
    expect((await uploadVia(cookie)).status).toBe(201);
  });

  it("500 server_error on a storage failure, without leaking the message or path", async () => {
    const base = createMockRepository();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    setup({
      repo: {
        ...base,
        removeLeadDocument: async () => {
          throw new Error("Document removal failed: lead-documents/abc secret path");
        },
      },
    });
    const { cookie } = await newLead();
    const res = await handlers.removeDocument(del({ id: "11111111-1111-4111-8111-111111111111" }, { cookie }));
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ ok: false, error: "server_error" });
    expect(text).not.toContain("lead-documents");
    errorSpy.mockRestore();
  });

  it("maps repository errors from another module copy (repo cached on globalThis by another route)", async () => {
    const base = createMockRepository();
    class LeadDocumentNotFoundError extends Error {
      name = "LeadDocumentNotFoundError";
    }
    class LeadNotFoundError extends Error {
      name = "LeadNotFoundError";
    }
    let next: Error = new LeadDocumentNotFoundError();
    const calls: Array<[string, string]> = [];
    setup({
      repo: {
        ...base,
        removeLeadDocument: async (token, id) => {
          calls.push([token, id]);
          throw next;
        },
      },
    });
    const { cookie, token } = await newLead();
    const id = "22222222-2222-4222-8222-222222222222";
    await expectError(await handlers.removeDocument(del({ id }, { cookie })), 404, "document_not_found");
    next = new LeadNotFoundError();
    await expectError(await handlers.removeDocument(del({ id }, { cookie })), 404, "lead_not_found");
    // The token comes from the httpOnly cookie, never from the body.
    expect(calls).toEqual([
      [token, id],
      [token, id],
    ]);
  });
});

describe("client removeLeadDocument", () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
    const f = vi.fn<typeof fetch>(
      async () =>
        new Response(typeof body === "string" ? body : JSON.stringify(body), {
          status,
          headers: { "content-type": "application/json", ...headers },
        }),
    );
    vi.stubGlobal("fetch", f);
    return f;
  }

  it("sends DELETE /api/lead/document with JSON { id }, same-origin", async () => {
    const f = stubFetch(200, { ok: true });
    await expect(removeLeadDocument("d1")).resolves.toBeUndefined();
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("/api/lead/document");
    expect(init).toMatchObject({ method: "DELETE", credentials: "same-origin", cache: "no-store" });
    expect(init?.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(String(init?.body))).toEqual({ id: "d1" });
  });

  it("throws LeadApiError with the server code", async () => {
    stubFetch(404, { ok: false, error: "document_not_found" });
    await expect(removeLeadDocument("d1")).rejects.toMatchObject({ status: 404, code: "document_not_found" });
    stubFetch(429, { ok: false, error: "rate_limited" }, { "Retry-After": "30" });
    await expect(removeLeadDocument("d1")).rejects.toMatchObject({ code: "rate_limited", retryAfterSec: 30 });
    stubFetch(500, { ok: false, error: "server_error" });
    await expect(removeLeadDocument("d1")).rejects.toBeInstanceOf(LeadApiError);
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("offline"))));
    await expect(removeLeadDocument("d1")).rejects.toMatchObject({ code: "network_error" });
  });
});
