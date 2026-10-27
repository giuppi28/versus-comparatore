import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseRepository } from "./supabase-repository";
import {
  InvalidLeadDocumentError,
  LeadApiSecretError,
  LeadDocumentLimitError,
  LeadDocumentNotFoundError,
  LeadNotFoundError,
} from "../repository";

const SECRET = "s3cr3t-hex";
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const PDF = new TextEncoder().encode("%PDF-1.7 test");
const LEAD = "11111111-1111-4111-8111-111111111111";
const DOC = "22222222-2222-4222-8222-222222222222";
const PATH = `${LEAD}/${"a".repeat(32)}.jpg`;

type Result = { data?: unknown; error?: { message: string; code?: string } | null };

function builder(result: Result) {
  const calls: Array<[string, unknown[]]> = [];
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in", "order"]) {
    b[m] = (...args: unknown[]) => {
      calls.push([m, args]);
      return b;
    };
  }
  b.maybeSingle = () => Promise.resolve({ error: null, ...result });
  b.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
    Promise.resolve({ error: null, ...result }).then(res, rej);
  return { b, calls };
}

function setup(opts: { rpc?: Result[]; from?: Result[]; upload?: Result; signed?: Result; remove?: Result | Error } = {}) {
  const rpcQueue = [...(opts.rpc ?? [])];
  const rpc = vi.fn(() => Promise.resolve({ error: null, ...(rpcQueue.shift() ?? {}) }));
  const fromQueue = [...(opts.from ?? [])];
  const builders: Array<ReturnType<typeof builder> & { table: string }> = [];
  const from = vi.fn((table: string) => {
    const x = builder(fromQueue.shift() ?? {});
    builders.push({ ...x, table });
    return x.b;
  });
  const upload = vi.fn().mockResolvedValue({ data: { path: PATH }, error: null, ...opts.upload });
  const createSignedUrl = vi
    .fn()
    .mockResolvedValue({ data: { signedUrl: "https://x.supabase.co/sign/doc?token=t" }, error: null, ...opts.signed });
  const remove =
    opts.remove instanceof Error
      ? vi.fn().mockRejectedValue(opts.remove)
      : vi.fn().mockResolvedValue({ data: [{ name: PATH }], error: null, ...opts.remove });
  const fromBucket = vi.fn().mockReturnValue({ upload, createSignedUrl, remove });
  const client = { rpc, from, storage: { from: fromBucket } } as unknown as SupabaseClient;
  return { client, rpc, from, builders, upload, createSignedUrl, remove, fromBucket };
}

const withSecret = { leadSecret: () => SECRET };
const slot = { data: { id: DOC, lead_id: LEAD, path: PATH, bucket: "lead-documents", expires_at: "2026-10-23T10:05:00Z" } };
const confirmed = {
  data: { id: DOC, lead_id: LEAD, kind: "id_document", mime_type: "image/jpeg", size_bytes: JPEG.length, created_at: "2026-10-23T10:00:00Z" },
};

describe("uploadLeadDocument (register -> upload -> confirm)", () => {
  it("calls the RPCs with the secret + token and uploads exactly the issued path", async () => {
    const t = setup({ rpc: [slot, confirmed] });
    const doc = await createSupabaseRepository(t.client, withSecret).uploadLeadDocument("tok", { mime: "image/jpeg", bytes: JPEG });
    expect(doc).toEqual({ id: DOC, lead_id: LEAD, kind: "id_document", mime_type: "image/jpeg", size_bytes: JPEG.length, created_at: "2026-10-23T10:00:00Z" });
    expect(t.rpc).toHaveBeenNthCalledWith(1, "register_lead_document", {
      p_secret: SECRET,
      p_token: "tok",
      p_mime_type: "image/jpeg",
      p_size_bytes: JPEG.length,
    });
    expect(t.fromBucket).toHaveBeenCalledWith("lead-documents");
    expect(t.upload).toHaveBeenCalledWith(PATH, JPEG, { contentType: "image/jpeg", upsert: false });
    expect(t.rpc).toHaveBeenNthCalledWith(2, "confirm_lead_document", { p_secret: SECRET, p_token: "tok", p_document_id: DOC });
  });

  it("bill: sends p_kind, returns kind bill; id documents never send p_kind", async () => {
    const t = setup({ rpc: [{ data: { ...slot.data, kind: "bill" } }, { data: { ...confirmed.data, kind: "bill", mime_type: "application/pdf" } }] });
    const doc = await createSupabaseRepository(t.client, withSecret).uploadLeadDocument("tok", { mime: "application/pdf", bytes: PDF, kind: "bill" });
    expect(doc.kind).toBe("bill");
    expect(t.rpc).toHaveBeenNthCalledWith(1, "register_lead_document", {
      p_secret: SECRET,
      p_token: "tok",
      p_mime_type: "application/pdf",
      p_size_bytes: PDF.length,
      p_kind: "bill",
    });
    const id = setup({ rpc: [slot, confirmed] });
    await createSupabaseRepository(id.client, withSecret).uploadLeadDocument("tok", { mime: "image/jpeg", bytes: JPEG, kind: "id_document" });
    expect((id.rpc.mock.calls[0] as unknown[])[1]).not.toHaveProperty("p_kind");
  });

  it("bill rules are checked before any call (PDF only, 4 MiB); bill_limit_reached maps to a bill limit error", async () => {
    const t = setup();
    const repo = createSupabaseRepository(t.client, withSecret);
    await expect(repo.uploadLeadDocument("tok", { mime: "image/jpeg", bytes: JPEG, kind: "bill" })).rejects.toMatchObject({ reason: "type" });
    const big = new Uint8Array(4 * 1024 * 1024 + 1);
    big.set(PDF);
    await expect(repo.uploadLeadDocument("tok", { mime: "application/pdf", bytes: big, kind: "bill" })).rejects.toMatchObject({ reason: "size" });
    expect(t.rpc).not.toHaveBeenCalled();
    const full = setup({ rpc: [{ data: null, error: { message: "bill_limit_reached", code: "22023" } }] });
    await expect(
      createSupabaseRepository(full.client, withSecret).uploadLeadDocument("tok", { mime: "application/pdf", bytes: PDF, kind: "bill" }),
    ).rejects.toMatchObject({ code: "document_limit_reached", kind: "bill" });
    const idFull = setup({ rpc: [{ data: null, error: { message: "document_limit_reached", code: "22023" } }] });
    await expect(
      createSupabaseRepository(idFull.client, withSecret).uploadLeadDocument("tok", { mime: "image/jpeg", bytes: JPEG }),
    ).rejects.toMatchObject({ kind: "id_document" });
  });

  it("listLeadDocuments falls back to the legacy columns when `kind` does not exist yet", async () => {
    const legacy = { id: DOC, lead_id: LEAD, mime_type: "image/jpeg", size_bytes: 7, created_at: "2026-10-23T10:00:00Z" };
    const t = setup({ from: [{ data: null, error: { message: "column lead_documents.kind does not exist", code: "42703" } }, { data: [legacy] }] });
    expect(await createSupabaseRepository(t.client).listLeadDocuments(LEAD)).toEqual([{ ...legacy, kind: "id_document" }]);
  });

  it("validates the file before any call (type, size, magic bytes)", async () => {
    const t = setup();
    const repo = createSupabaseRepository(t.client, withSecret);
    await expect(repo.uploadLeadDocument("tok", { mime: "image/png" as never, bytes: JPEG })).rejects.toBeInstanceOf(InvalidLeadDocumentError);
    await expect(repo.uploadLeadDocument("tok", { mime: "application/pdf", bytes: JPEG })).rejects.toMatchObject({ reason: "content" });
    await expect(repo.uploadLeadDocument("tok", { mime: "application/pdf", bytes: new Uint8Array() })).rejects.toMatchObject({ reason: "size" });
    const big = new Uint8Array(5 * 1024 * 1024 + 1);
    big.set(PDF);
    await expect(repo.uploadLeadDocument("tok", { mime: "application/pdf", bytes: big })).rejects.toMatchObject({ reason: "size" });
    expect(t.rpc).not.toHaveBeenCalled();
    expect(t.upload).not.toHaveBeenCalled();
  });

  it("fails closed without the server secret", async () => {
    const t = setup();
    await expect(
      createSupabaseRepository(t.client, { leadSecret: () => undefined }).uploadLeadDocument("tok", { mime: "application/pdf", bytes: PDF }),
    ).rejects.toBeInstanceOf(LeadApiSecretError);
    expect(t.rpc).not.toHaveBeenCalled();
  });

  it("maps register errors and never uploads after a refusal", async () => {
    const cases: Array<[Result, unknown]> = [
      [{ error: { message: "document_limit_reached", code: "22023" } }, LeadDocumentLimitError],
      [{ error: { message: "lead_not_found", code: "P0002" } }, LeadNotFoundError],
      [{ error: { message: "invalid_secret", code: "28000" } }, LeadApiSecretError],
      [{ error: { message: "invalid_document", code: "22023" } }, InvalidLeadDocumentError],
    ];
    for (const [res, type] of cases) {
      const t = setup({ rpc: [res] });
      await expect(
        createSupabaseRepository(t.client, withSecret).uploadLeadDocument("tok", { mime: "application/pdf", bytes: PDF }),
      ).rejects.toBeInstanceOf(type as never);
      expect(t.upload).not.toHaveBeenCalled();
    }
  });

  it("storage failure: error thrown, slot not confirmed", async () => {
    const t = setup({ rpc: [slot], upload: { data: null, error: { message: "new row violates row-level security policy" } } });
    await expect(
      createSupabaseRepository(t.client, withSecret).uploadLeadDocument("tok", { mime: "image/jpeg", bytes: JPEG }),
    ).rejects.toThrow(/Document upload failed/);
    expect(t.rpc).toHaveBeenCalledTimes(1);
  });

  it("unexpected register response is rejected", async () => {
    const t = setup({ rpc: [{ data: { id: DOC } }] });
    await expect(
      createSupabaseRepository(t.client, withSecret).uploadLeadDocument("tok", { mime: "image/jpeg", bytes: JPEG }),
    ).rejects.toThrow(/Unexpected response/);
    expect(t.upload).not.toHaveBeenCalled();
  });
});

describe("admin document access", () => {
  it("listLeadDocuments: uploaded rows of the lead, oldest first", async () => {
    const t = setup({ from: [{ data: [confirmed.data] }] });
    expect(await createSupabaseRepository(t.client).listLeadDocuments(LEAD)).toEqual([confirmed.data]);
    expect(t.builders[0].table).toBe("lead_documents");
    expect(t.builders[0].calls).toEqual([
      ["select", ["id, lead_id, kind, mime_type, size_bytes, created_at"]],
      ["eq", ["lead_id", LEAD]],
      ["eq", ["status", "uploaded"]],
      ["order", ["created_at"]],
    ]);
  });

  it("listLeadDocuments: [] before the migration, other errors surfaced", async () => {
    const missing = setup({ from: [{ data: null, error: { message: "relation does not exist", code: "42P01" } }] });
    expect(await createSupabaseRepository(missing.client).listLeadDocuments(LEAD)).toEqual([]);
    const denied = setup({ from: [{ data: null, error: { message: "permission denied", code: "42501" } }] });
    await expect(createSupabaseRepository(denied.client).listLeadDocuments(LEAD)).rejects.toThrow("permission denied");
  });

  it("createLeadDocumentUrl: signed URL <= 300 s, download variant with a file name", async () => {
    const row = { data: { id: DOC, object_path: PATH, mime_type: "application/pdf" } };
    const t = setup({ from: [row, row, row, row] });
    const repo = createSupabaseRepository(t.client);
    expect(await repo.createLeadDocumentUrl(DOC)).toBe("https://x.supabase.co/sign/doc?token=t");
    await repo.createLeadDocumentUrl(DOC, { expiresIn: 3600 });
    await repo.createLeadDocumentUrl(DOC, { expiresIn: 60, download: true });
    await repo.createLeadDocumentUrl(DOC, { expiresIn: 0 });
    expect(t.createSignedUrl.mock.calls).toEqual([
      [PATH, 300, undefined],
      [PATH, 300, undefined],
      [PATH, 60, { download: "documento-22222222.pdf" }],
      [PATH, 1, undefined],
    ]);
    expect(t.builders[0].calls).toContainEqual(["eq", ["status", "uploaded"]]);
  });

  it("createLeadDocumentUrl: not found / malformed id / signing error", async () => {
    const none = setup({ from: [{ data: null }] });
    await expect(createSupabaseRepository(none.client).createLeadDocumentUrl(DOC)).rejects.toBeInstanceOf(LeadDocumentNotFoundError);
    const bad = setup({ from: [{ data: null, error: { message: "invalid input syntax for type uuid", code: "22P02" } }] });
    await expect(createSupabaseRepository(bad.client).createLeadDocumentUrl("x")).rejects.toBeInstanceOf(LeadDocumentNotFoundError);
    const sign = setup({
      from: [{ data: { id: DOC, object_path: PATH, mime_type: "image/jpeg" } }],
      signed: { data: null, error: { message: "Object not found" } },
    });
    await expect(createSupabaseRepository(sign.client).createLeadDocumentUrl(DOC)).rejects.toThrow(/Signed URL failed/);
  });
});

describe("getCallbackPhone", () => {
  it("returns the public RPC value, trimmed", async () => {
    const t = setup({ rpc: [{ data: " +39 02 1234567 " }] });
    expect(await createSupabaseRepository(t.client).getCallbackPhone()).toBe("+39 02 1234567");
    expect(t.rpc).toHaveBeenCalledWith("get_callback_phone");
  });

  it("falls back to the default (error, blank, wrong type, throw)", async () => {
    for (const res of [{ error: { message: "function not found", code: "PGRST202" } }, { data: "  " }, { data: null }, { data: 42 }]) {
      const t = setup({ rpc: [res] });
      expect(await createSupabaseRepository(t.client).getCallbackPhone()).toBe("+39 095 0000000");
    }
    const client = { rpc: vi.fn().mockRejectedValue(new Error("network")) } as unknown as SupabaseClient;
    expect(await createSupabaseRepository(client).getCallbackPhone()).toBe("+39 095 0000000");
  });
});

describe("lead rows: Phase 12 fields", () => {
  it("default to null when the DB has no such columns; mapped when present", async () => {
    const missing = setup({ from: [{ data: { id: "l1" } }] });
    expect(await createSupabaseRepository(missing.client).getLead("l1")).toMatchObject({
      iban: null,
      iban_holder_different: null,
      iban_holder_first_name: null,
      iban_holder_last_name: null,
      iban_holder_tax_code: null,
      document_type: null,
      document_number: null,
      document_expiry: null,
      document_issuer: null,
    });
    const row = {
      id: "l1",
      iban: "IT60X0542811101000000123456",
      iban_holder_different: false,
      document_type: "patente",
      document_number: "U1A12345B",
      document_expiry: "2030-01-31",
      document_issuer: "MIT-UCO",
    };
    const present = setup({ from: [{ data: row }] });
    expect(await createSupabaseRepository(present.client).getLead("l1")).toMatchObject(row);
  });
});

describe("removeLeadDocument (request -> Storage remove -> finish)", () => {
  const requested = { data: { id: DOC, path: PATH, bucket: "lead-documents" } };
  const removed = { data: { id: DOC, removed: true } };
  const kept = { data: { id: DOC, removed: false } };
  const args = { p_secret: SECRET, p_token: "tok", p_document_id: DOC };

  it("opens the removal window, removes exactly the returned path, then finishes", async () => {
    const t = setup({ rpc: [requested, removed] });
    await expect(createSupabaseRepository(t.client, withSecret).removeLeadDocument("tok", DOC)).resolves.toBeUndefined();
    expect(t.rpc).toHaveBeenNthCalledWith(1, "request_lead_document_removal", args);
    expect(t.fromBucket).toHaveBeenCalledWith("lead-documents");
    expect(t.remove).toHaveBeenCalledWith([PATH]);
    expect(t.rpc).toHaveBeenNthCalledWith(2, "finish_lead_document_removal", args);
    expect(t.rpc).toHaveBeenCalledTimes(2);
  });

  it("non-UUID id: LeadDocumentNotFoundError without any call; no secret: fails closed", async () => {
    const t = setup();
    await expect(createSupabaseRepository(t.client, withSecret).removeLeadDocument("tok", "../x.jpg")).rejects.toBeInstanceOf(
      LeadDocumentNotFoundError,
    );
    await expect(
      createSupabaseRepository(t.client, { leadSecret: () => undefined }).removeLeadDocument("tok", DOC),
    ).rejects.toBeInstanceOf(LeadApiSecretError);
    expect(t.rpc).not.toHaveBeenCalled();
    expect(t.remove).not.toHaveBeenCalled();
  });

  it("maps request errors and never touches Storage after a refusal", async () => {
    const cases: Array<[Result, unknown]> = [
      [{ error: { message: "document_not_found", code: "P0002" } }, LeadDocumentNotFoundError],
      [{ error: { message: "lead_not_found", code: "P0002" } }, LeadNotFoundError],
      [{ error: { message: "invalid_secret", code: "28000" } }, LeadApiSecretError],
    ];
    for (const [res, type] of cases) {
      const t = setup({ rpc: [res] });
      await expect(createSupabaseRepository(t.client, withSecret).removeLeadDocument("tok", DOC)).rejects.toBeInstanceOf(type as never);
      expect(t.remove).not.toHaveBeenCalled();
      expect(t.rpc).toHaveBeenCalledTimes(1);
    }
  });

  it("Storage error or rejection: still finishes (closes the window) and throws when the row is kept", async () => {
    for (const remove of [{ data: null, error: { message: "storage down" } }, new Error("fetch failed")]) {
      const t = setup({ rpc: [requested, kept], remove });
      await expect(createSupabaseRepository(t.client, withSecret).removeLeadDocument("tok", DOC)).rejects.toThrow(
        /Document removal failed/,
      );
      expect(t.rpc).toHaveBeenNthCalledWith(2, "finish_lead_document_removal", args);
    }
  });

  it("Storage error but the object is gone (finish removed it): success", async () => {
    const t = setup({ rpc: [requested, removed], remove: { data: null, error: { message: "timeout" } } });
    await expect(createSupabaseRepository(t.client, withSecret).removeLeadDocument("tok", DOC)).resolves.toBeUndefined();
  });

  it("silent Storage refusal (no error, object still present): throws, row kept", async () => {
    const t = setup({ rpc: [requested, kept], remove: { data: [], error: null } });
    await expect(createSupabaseRepository(t.client, withSecret).removeLeadDocument("tok", DOC)).rejects.toThrow(
      /object still present/,
    );
  });

  it("maps finish errors; unexpected request result is an error", async () => {
    const t = setup({ rpc: [requested, { error: { message: "document_not_found", code: "P0002" } }] });
    await expect(createSupabaseRepository(t.client, withSecret).removeLeadDocument("tok", DOC)).rejects.toBeInstanceOf(
      LeadDocumentNotFoundError,
    );
    const u = setup({ rpc: [{ data: { id: DOC } }] });
    await expect(createSupabaseRepository(u.client, withSecret).removeLeadDocument("tok", DOC)).rejects.toThrow(/Unexpected response/);
    expect(u.remove).not.toHaveBeenCalled();
  });
});
