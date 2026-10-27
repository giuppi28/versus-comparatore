// @vitest-environment node
/** POST /api/lead/document (Phase 12, E4) + the browser helper. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRepository, LeadDocumentLimitError, type Repository } from "@/lib/data";
import { DOCUMENT_MAX_BYTES } from "@/lib/logic/validators";
import { LEAD_COOKIE } from "./api-types";
import { LeadApiError, uploadLeadDocument } from "./client";
import { createLeadHandlers, createRateLimiters, MAX_DOCUMENT_REQUEST_BYTES, type LeadHandlers } from "./handlers";
import { SlidingWindowRateLimiter } from "./rate-limit";
import { completeData, page1Data } from "./test-fixtures";

const URL_BASE = "http://localhost:3000";
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const PDF = new TextEncoder().encode("%PDF-1.7\n%âãÏÓ\n1 0 obj\n");
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);

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

async function leadCookie(): Promise<string> {
  const res = await handlers.create(
    new Request(`${URL_BASE}/api/lead`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: page1Data() }),
    }),
  );
  expect(res.status).toBe(201);
  const token = res.headers.getSetCookie()[0].split(";")[0].split("=")[1];
  return `${LEAD_COOKIE}=${token}`;
}

function fileOf(bytes: Uint8Array, type: string, name = "documento.jpg") {
  return new File([bytes as BlobPart], name, { type });
}

function upload(
  form: FormData | null,
  opts: { cookie?: string; headers?: Record<string, string>; body?: BodyInit } = {},
): Request {
  return new Request(`${URL_BASE}/api/lead/document`, {
    method: "POST",
    headers: { ...(opts.cookie ? { cookie: opts.cookie } : {}), ...opts.headers },
    body: opts.body ?? form ?? undefined,
  });
}

function formWith(file: File | string): FormData {
  const f = new FormData();
  f.append("file", file);
  return f;
}

async function expectError(res: Response, status: number, error: string) {
  expect(res.status).toBe(status);
  expect(await res.json()).toEqual({ ok: false, error });
}

describe("POST /api/lead/document", () => {
  it("stores a JPEG and returns only id, mime_type, size_bytes (201)", async () => {
    const cookie = await leadCookie();
    const res = await handlers.uploadDocument(upload(formWith(fileOf(JPEG, "image/jpeg")), { cookie }));
    expect(res.status).toBe(201);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(["document", "ok"]);
    expect(Object.keys(body.document).sort()).toEqual(["id", "kind", "mime_type", "size_bytes"]);
    expect(body.document).toMatchObject({ kind: "id_document", mime_type: "image/jpeg", size_bytes: JPEG.length });

    const [lead] = await repo.listLeads();
    expect(JSON.stringify(body)).not.toContain(lead.id);
    expect(JSON.stringify(body)).not.toContain(lead.token);
    const docs = await repo.listLeadDocuments(lead.id);
    expect(docs.map((d) => d.id)).toEqual([body.document.id]);
  });

  it("stores a PDF", async () => {
    const cookie = await leadCookie();
    const res = await handlers.uploadDocument(upload(formWith(fileOf(PDF, "application/pdf", "ci.pdf")), { cookie }));
    expect(res.status).toBe(201);
    expect((await res.json()).document.mime_type).toBe("application/pdf");
  });

  it("401 no_lead without the lead cookie", async () => {
    await expectError(await handlers.uploadDocument(upload(formWith(fileOf(JPEG, "image/jpeg")))), 401, "no_lead");
  });

  it("404 lead_not_found for an unknown or completed lead", async () => {
    await expectError(
      await handlers.uploadDocument(upload(formWith(fileOf(JPEG, "image/jpeg")), { cookie: `${LEAD_COOKIE}=nope` })),
      404,
      "lead_not_found",
    );
    const cookie = await leadCookie();
    const done = await handlers.complete(
      new Request(`${URL_BASE}/api/lead/complete`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ data: completeData() }),
      }),
    );
    expect(done.status).toBe(200);
    await expectError(
      await handlers.uploadDocument(upload(formWith(fileOf(JPEG, "image/jpeg")), { cookie })),
      404,
      "lead_not_found",
    );
  });

  it("422 file_content for a PNG renamed to .jpg (declared image/jpeg)", async () => {
    const cookie = await leadCookie();
    await expectError(
      await handlers.uploadDocument(upload(formWith(fileOf(PNG, "image/jpeg", "foto.jpg")), { cookie })),
      422,
      "file_content",
    );
    // A PDF declared as JPEG is rejected too (type and bytes must agree).
    await expectError(
      await handlers.uploadDocument(upload(formWith(fileOf(PDF, "image/jpeg")), { cookie })),
      422,
      "file_content",
    );
  });

  it.each(["image/png", "application/octet-stream", "", "text/html"])("415 file_type for %j", async (type) => {
    const cookie = await leadCookie();
    await expectError(
      await handlers.uploadDocument(upload(formWith(fileOf(JPEG, type)), { cookie })),
      415,
      "file_type",
    );
  });

  it("413 file_size for a file over 5 MiB", async () => {
    const cookie = await leadCookie();
    const big = new Uint8Array(DOCUMENT_MAX_BYTES + 1);
    big.set(JPEG);
    await expectError(
      await handlers.uploadDocument(upload(formWith(fileOf(big, "image/jpeg")), { cookie })),
      413,
      "file_size",
    );
    // Body over the request cap: aborted while streaming.
    const huge = new Uint8Array(MAX_DOCUMENT_REQUEST_BYTES + 1);
    huge.set(JPEG);
    await expectError(
      await handlers.uploadDocument(upload(formWith(fileOf(huge, "image/jpeg")), { cookie })),
      413,
      "file_size",
    );
    expect(await repo.listLeadDocuments((await repo.listLeads())[0].id)).toEqual([]);
  });

  it("413 file_size from the declared Content-Length, before reading the body", async () => {
    const cookie = await leadCookie();
    const body = new ReadableStream({
      pull() {
        throw new Error("body must not be read");
      },
    });
    const req = new Request(`${URL_BASE}/api/lead/document`, {
      method: "POST",
      headers: {
        cookie,
        "content-type": "multipart/form-data; boundary=x",
        "content-length": String(MAX_DOCUMENT_REQUEST_BYTES + 1),
      },
      body,
      // @ts-expect-error Node fetch needs duplex for stream bodies.
      duplex: "half",
    });
    await expectError(await handlers.uploadDocument(req), 413, "file_size");
  });

  it("422 file_missing for an empty file, no parts or a text part; 400 for an unknown part", async () => {
    const cookie = await leadCookie();
    await expectError(
      await handlers.uploadDocument(upload(formWith(fileOf(new Uint8Array(0), "image/jpeg")), { cookie })),
      422,
      "file_missing",
    );
    await expectError(await handlers.uploadDocument(upload(new FormData(), { cookie })), 422, "file_missing");
    await expectError(await handlers.uploadDocument(upload(formWith("not a file"), { cookie })), 422, "file_missing");
    const noPart = new FormData();
    noPart.append("other", "x");
    await expectError(await handlers.uploadDocument(upload(noPart, { cookie })), 400, "invalid_body");
  });

  it("400 invalid_body for a non-multipart body or two files", async () => {
    const cookie = await leadCookie();
    await expectError(
      await handlers.uploadDocument(
        upload(null, { cookie, headers: { "content-type": "application/json" }, body: "{}" }),
      ),
      400,
      "invalid_body",
    );
    const two = formWith(fileOf(JPEG, "image/jpeg"));
    two.append("file", fileOf(JPEG, "image/jpeg"));
    await expectError(await handlers.uploadDocument(upload(two, { cookie })), 400, "invalid_body");
  });

  it("409 too_many_files after 2 documents", async () => {
    const cookie = await leadCookie();
    for (let i = 0; i < 2; i++) {
      expect((await handlers.uploadDocument(upload(formWith(fileOf(JPEG, "image/jpeg")), { cookie }))).status).toBe(201);
    }
    await expectError(
      await handlers.uploadDocument(upload(formWith(fileOf(PDF, "application/pdf")), { cookie })),
      409,
      "too_many_files",
    );
  });

  describe("kind", () => {
    const formKind = (file: File, kind?: string) => {
      const f = formWith(file);
      if (kind !== undefined) f.append("kind", kind);
      return f;
    };

    it("defaults to id_document and accepts it explicitly", async () => {
      const cookie = await leadCookie();
      for (const kind of [undefined, "id_document"]) {
        const res = await handlers.uploadDocument(upload(formKind(fileOf(JPEG, "image/jpeg"), kind), { cookie }));
        expect(res.status).toBe(201);
        expect((await res.json()).document.kind).toBe("id_document");
      }
    });

    it("stores a PDF bill (201, kind bill) next to two identity documents", async () => {
      const cookie = await leadCookie();
      for (let i = 0; i < 2; i++) {
        expect((await handlers.uploadDocument(upload(formWith(fileOf(JPEG, "image/jpeg")), { cookie }))).status).toBe(201);
      }
      const res = await handlers.uploadDocument(upload(formKind(fileOf(PDF, "application/pdf", "bolletta.pdf"), "bill"), { cookie }));
      expect(res.status).toBe(201);
      expect((await res.json()).document.kind).toBe("bill");
      const [lead] = await repo.listLeads();
      expect((await repo.listLeadDocuments(lead.id)).map((d) => d.kind)).toEqual(["id_document", "id_document", "bill"]);
    });

    it("415 file_type for a JPEG bill; 400 invalid_body for an unknown or repeated kind", async () => {
      const cookie = await leadCookie();
      await expectError(
        await handlers.uploadDocument(upload(formKind(fileOf(JPEG, "image/jpeg"), "bill"), { cookie })),
        415,
        "file_type",
      );
      await expectError(
        await handlers.uploadDocument(upload(formKind(fileOf(PDF, "application/pdf"), "selfie"), { cookie })),
        400,
        "invalid_body",
      );
      const twice = formKind(fileOf(PDF, "application/pdf"), "bill");
      twice.append("kind", "bill");
      await expectError(await handlers.uploadDocument(upload(twice, { cookie })), 400, "invalid_body");
    });

    it("409 too_many_bills for a second bill; identity documents are unaffected", async () => {
      const cookie = await leadCookie();
      const bill = () => upload(formKind(fileOf(PDF, "application/pdf"), "bill"), { cookie });
      expect((await handlers.uploadDocument(bill())).status).toBe(201);
      await expectError(await handlers.uploadDocument(bill()), 409, "too_many_bills");
      expect((await handlers.uploadDocument(upload(formWith(fileOf(JPEG, "image/jpeg")), { cookie }))).status).toBe(201);
    });

    it("a removed bill frees the slot", async () => {
      const cookie = await leadCookie();
      const bill = () => upload(formKind(fileOf(PDF, "application/pdf"), "bill"), { cookie });
      const { document } = await (await handlers.uploadDocument(bill())).json();
      await repo.removeLeadDocument(cookie.split("=")[1], document.id);
      expect((await handlers.uploadDocument(bill())).status).toBe(201);
    });

    it("413 file_size for a bill over 4 MiB", async () => {
      const cookie = await leadCookie();
      const big = new Uint8Array(DOCUMENT_MAX_BYTES + 1);
      big.set(PDF);
      await expectError(
        await handlers.uploadDocument(upload(formKind(fileOf(big, "application/pdf"), "bill"), { cookie })),
        413,
        "file_size",
      );
    });
  });

  it("403 forbidden_origin for cross-origin requests", async () => {
    const cookie = await leadCookie();
    await expectError(
      await handlers.uploadDocument(
        upload(formWith(fileOf(JPEG, "image/jpeg")), {
          cookie,
          headers: { origin: "https://evil.example", host: "localhost:3000" },
        }),
      ),
      403,
      "forbidden_origin",
    );
  });

  it("429 rate_limited per IP with Retry-After", async () => {
    const limiters = createRateLimiters();
    limiters.document = new SlidingWindowRateLimiter({ limit: 1, windowMs: 60_000 });
    setup({ limiters });
    const cookie = await leadCookie();
    const headers = { "x-real-ip": "9.9.9.9" };
    expect((await handlers.uploadDocument(upload(formWith(fileOf(JPEG, "image/jpeg")), { cookie, headers }))).status).toBe(201);
    const res = await handlers.uploadDocument(upload(formWith(fileOf(JPEG, "image/jpeg")), { cookie, headers }));
    expect(res.headers.get("retry-after")).toBeTruthy();
    await expectError(res, 429, "rate_limited");
  });

  it("502 upload_failed on a storage error, without leaking the message", async () => {
    const base = createMockRepository();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    setup({
      repo: {
        ...base,
        uploadLeadDocument: async () => {
          throw new Error("storage bucket lead-documents/abc secret path");
        },
      },
    });
    const cookie = await leadCookie();
    const res = await handlers.uploadDocument(upload(formWith(fileOf(JPEG, "image/jpeg")), { cookie }));
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ ok: false, error: "upload_failed" });
    expect(text).not.toContain("lead-documents");
    errorSpy.mockRestore();
  });

  it("maps repository errors from another module copy (repo cached on globalThis by another route)", async () => {
    const base = createMockRepository();
    class LeadDocumentLimitError extends Error {
      name = "LeadDocumentLimitError";
    }
    class LeadNotFoundError extends Error {
      name = "LeadNotFoundError";
    }
    let next: Error = new LeadDocumentLimitError();
    setup({
      repo: {
        ...base,
        uploadLeadDocument: async () => {
          throw next;
        },
      },
    });
    const cookie = await leadCookie();
    const send = () => handlers.uploadDocument(upload(formWith(fileOf(JPEG, "image/jpeg")), { cookie }));
    await expectError(await send(), 409, "too_many_files");
    next = new LeadNotFoundError();
    await expectError(await send(), 404, "lead_not_found");
  });

  it("maps the repository limit error even when raised by the data layer", async () => {
    const base = createMockRepository();
    setup({
      repo: {
        ...base,
        uploadLeadDocument: async () => {
          throw new LeadDocumentLimitError();
        },
      },
    });
    const cookie = await leadCookie();
    await expectError(
      await handlers.uploadDocument(upload(formWith(fileOf(JPEG, "image/jpeg")), { cookie })),
      409,
      "too_many_files",
    );
  });
});

describe("client uploadLeadDocument", () => {
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

  it("POSTs multipart field `file` same-origin and returns the metadata", async () => {
    const f = stubFetch(201, { ok: true, document: { id: "d1", mime_type: "image/jpeg", size_bytes: 10 } });
    const doc = await uploadLeadDocument(fileOf(JPEG, "image/jpeg"));
    expect(doc).toEqual({ id: "d1", kind: "id_document", mime_type: "image/jpeg", size_bytes: 10 });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("/api/lead/document");
    expect(init).toMatchObject({ method: "POST", credentials: "same-origin" });
    expect(init?.headers).toBeUndefined();
    expect((init?.body as FormData).get("file")).toBeInstanceOf(File);
  });

  it("sends `kind` only for bills and refuses a non-PDF bill before sending", async () => {
    const f = stubFetch(201, { ok: true, document: { id: "b1", kind: "bill", mime_type: "application/pdf", size_bytes: 10 } });
    const doc = await uploadLeadDocument(fileOf(PDF, "application/pdf"), "bill");
    expect(doc.kind).toBe("bill");
    expect((f.mock.calls[0][1]?.body as FormData).get("kind")).toBe("bill");
    await uploadLeadDocument(fileOf(PDF, "application/pdf"));
    expect((f.mock.calls[1][1]?.body as FormData).has("kind")).toBe(false);
    await expect(uploadLeadDocument(fileOf(JPEG, "image/jpeg"), "bill")).rejects.toMatchObject({ code: "file_type" });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("throws LeadApiError with the server code", async () => {
    stubFetch(409, { ok: false, error: "too_many_files" });
    await expect(uploadLeadDocument(fileOf(JPEG, "image/jpeg"))).rejects.toMatchObject({
      status: 409,
      code: "too_many_files",
    });
    stubFetch(413, "Request Entity Too Large", { "content-type": "text/plain" });
    await expect(uploadLeadDocument(fileOf(JPEG, "image/jpeg"))).rejects.toMatchObject({ code: "file_size" });
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("offline"))));
    await expect(uploadLeadDocument(fileOf(JPEG, "image/jpeg"))).rejects.toMatchObject({ code: "network_error" });
  });

  it("rejects obvious problems before sending", async () => {
    const f = stubFetch(201, {});
    await expect(uploadLeadDocument(fileOf(new Uint8Array(0), "image/jpeg"))).rejects.toMatchObject({ code: "file_missing" });
    await expect(uploadLeadDocument(fileOf(PNG, "image/png"))).rejects.toMatchObject({ code: "file_type" });
    await expect(uploadLeadDocument(fileOf(new Uint8Array(DOCUMENT_MAX_BYTES + 1), "image/jpeg"))).rejects.toBeInstanceOf(
      LeadApiError,
    );
    expect(f).not.toHaveBeenCalled();
  });
});
