import { beforeEach, describe, expect, it } from "vitest";
import { createMockRepository } from "./mock-repository";
import {
  assertLeadDocument,
  detectLeadDocumentMime,
  InvalidLeadDocumentError,
  LeadDocumentLimitError,
  LeadDocumentNotFoundError,
  leadDocumentFileName,
  leadDocumentUrlSeconds,
  LeadNotFoundError,
  type Repository,
} from "../repository";
import { DEFAULT_CALLBACK_PHONE, MAX_LEAD_DOCUMENT_BYTES, MAX_LEAD_DOCUMENT_SLOTS } from "../types";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 9, 9]);
const PDF = new TextEncoder().encode("%PDF-1.4\n%test");

describe("document helpers", () => {
  it("detects JPEG / PDF by magic bytes only", () => {
    expect(detectLeadDocumentMime(JPEG)).toBe("image/jpeg");
    expect(detectLeadDocumentMime(PDF)).toBe("application/pdf");
    expect(detectLeadDocumentMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull(); // PNG
    expect(detectLeadDocumentMime(new TextEncoder().encode("%PDF"))).toBeNull();
    expect(detectLeadDocumentMime(new Uint8Array([0xff, 0xd8]))).toBeNull();
    expect(detectLeadDocumentMime(new TextEncoder().encode("<svg/>"))).toBeNull();
  });

  it("assertLeadDocument: type, size, content", () => {
    expect(() => assertLeadDocument({ mime: "image/jpeg", bytes: JPEG })).not.toThrow();
    expect(() => assertLeadDocument({ mime: "image/png" as never, bytes: JPEG })).toThrow(InvalidLeadDocumentError);
    expect(() => assertLeadDocument({ mime: "image/jpeg", bytes: PDF })).toThrow(/content/);
    expect(() => assertLeadDocument({ mime: "image/jpeg", bytes: new Uint8Array() })).toThrow(/size/);
    const max = new Uint8Array(MAX_LEAD_DOCUMENT_BYTES);
    max.set(PDF);
    expect(() => assertLeadDocument({ mime: "application/pdf", bytes: max })).not.toThrow();
    const over = new Uint8Array(MAX_LEAD_DOCUMENT_BYTES + 1);
    over.set(PDF);
    expect(() => assertLeadDocument({ mime: "application/pdf", bytes: over })).toThrow(/size/);
  });

  it("signed URL lifetime is clamped to 1..300 s; file names", () => {
    expect(leadDocumentUrlSeconds()).toBe(300);
    expect(leadDocumentUrlSeconds({ expiresIn: 120.9 })).toBe(120);
    expect(leadDocumentUrlSeconds({ expiresIn: 9999 })).toBe(300);
    expect(leadDocumentUrlSeconds({ expiresIn: -5 })).toBe(1);
    expect(leadDocumentUrlSeconds({ expiresIn: Number.NaN })).toBe(300);
    expect(leadDocumentFileName({ id: "abcdef12-0000", mime_type: "image/jpeg" })).toBe("documento-abcdef12.jpg");
    expect(leadDocumentFileName({ id: "abcdef12-0000", mime_type: "application/pdf" })).toBe("documento-abcdef12.pdf");
  });
});

describe("mock lead documents", () => {
  let repo: Repository;
  beforeEach(() => {
    repo = createMockRepository();
  });

  it("upload by token, list, data: URL, max 2 per lead", async () => {
    const ref = await repo.createLead({ privacy_consent: true });
    const a = await repo.uploadLeadDocument(ref.token, { mime: "image/jpeg", bytes: JPEG });
    const b = await repo.uploadLeadDocument(ref.token, { mime: "application/pdf", bytes: PDF });
    expect(a).toMatchObject({ lead_id: ref.id, mime_type: "image/jpeg", size_bytes: JPEG.length });
    expect(a).not.toHaveProperty("bytes");
    await expect(repo.uploadLeadDocument(ref.token, { mime: "image/jpeg", bytes: JPEG })).rejects.toBeInstanceOf(
      LeadDocumentLimitError,
    );
    expect((await repo.listLeadDocuments(ref.id)).map((d) => d.id)).toEqual([a.id, b.id]);
    expect(await repo.listLeadDocuments("other")).toEqual([]);
    const url = await repo.createLeadDocumentUrl(b.id, { download: true });
    expect(url).toBe(`data:application/pdf;base64,${Buffer.from(PDF).toString("base64")}`);
    await expect(repo.createLeadDocumentUrl("missing")).rejects.toBeInstanceOf(LeadDocumentNotFoundError);
  });

  it("refuses unknown tokens, completed leads and invalid files", async () => {
    await expect(repo.uploadLeadDocument("nope", { mime: "image/jpeg", bytes: JPEG })).rejects.toBeInstanceOf(LeadNotFoundError);
    const ref = await repo.createLead({ privacy_consent: true });
    await expect(repo.uploadLeadDocument(ref.token, { mime: "application/pdf", bytes: JPEG })).rejects.toBeInstanceOf(
      InvalidLeadDocumentError,
    );
    await repo.completeLead(ref.token, {});
    await expect(repo.uploadLeadDocument(ref.token, { mime: "image/jpeg", bytes: JPEG })).rejects.toBeInstanceOf(LeadNotFoundError);
    expect(await repo.listLeadDocuments(ref.id)).toEqual([]);
  });

  it("deleting a lead deletes its files (single + bulk), other leads untouched", async () => {
    const a = await repo.createLead({ privacy_consent: true });
    const b = await repo.createLead({ privacy_consent: true });
    const c = await repo.createLead({ privacy_consent: true });
    const docA = await repo.uploadLeadDocument(a.token, { mime: "image/jpeg", bytes: JPEG });
    await repo.uploadLeadDocument(b.token, { mime: "application/pdf", bytes: PDF });
    const docC = await repo.uploadLeadDocument(c.token, { mime: "application/pdf", bytes: PDF });
    expect(await repo.deleteLeadsAndDocuments([a.id])).toEqual({ deleted: 1, documentCleanupFailed: false });
    await expect(repo.createLeadDocumentUrl(docA.id)).rejects.toBeInstanceOf(LeadDocumentNotFoundError);
    expect(await repo.deleteLeads([b.id, "unknown"])).toBe(1);
    expect(await repo.listLeadDocuments(b.id)).toEqual([]);
    expect((await repo.listLeadDocuments(c.id)).map((d) => d.id)).toEqual([docC.id]);
  });
});

describe("mock lead document removal (Phase 12b)", () => {
  let repo: Repository;
  beforeEach(() => {
    repo = createMockRepository();
  });

  it("removes a document of the token's lead: slot freed, gone from the admin list and URLs", async () => {
    const ref = await repo.createLead({ privacy_consent: true });
    const a = await repo.uploadLeadDocument(ref.token, { mime: "image/jpeg", bytes: JPEG });
    const b = await repo.uploadLeadDocument(ref.token, { mime: "application/pdf", bytes: PDF });
    await repo.removeLeadDocument(ref.token, a.id);
    expect((await repo.listLeadDocuments(ref.id)).map((d) => d.id)).toEqual([b.id]);
    await expect(repo.createLeadDocumentUrl(a.id)).rejects.toBeInstanceOf(LeadDocumentNotFoundError);
    const c = await repo.uploadLeadDocument(ref.token, { mime: "image/jpeg", bytes: JPEG });
    expect((await repo.listLeadDocuments(ref.id)).map((d) => d.id)).toEqual([b.id, c.id]);
    await expect(repo.uploadLeadDocument(ref.token, { mime: "image/jpeg", bytes: JPEG })).rejects.toBeInstanceOf(
      LeadDocumentLimitError,
    );
    await expect(repo.removeLeadDocument(ref.token, a.id)).rejects.toBeInstanceOf(LeadDocumentNotFoundError);
  });

  it("refuses another lead's document, unknown tokens and completed leads", async () => {
    const a = await repo.createLead({ privacy_consent: true });
    const b = await repo.createLead({ privacy_consent: true });
    const docB = await repo.uploadLeadDocument(b.token, { mime: "image/jpeg", bytes: JPEG });
    await expect(repo.removeLeadDocument(a.token, docB.id)).rejects.toBeInstanceOf(LeadDocumentNotFoundError);
    await expect(repo.removeLeadDocument("nope", docB.id)).rejects.toBeInstanceOf(LeadNotFoundError);
    await repo.completeLead(b.token, {});
    await expect(repo.removeLeadDocument(b.token, docB.id)).rejects.toBeInstanceOf(LeadNotFoundError);
    expect(await repo.listLeadDocuments(b.id)).toHaveLength(1);
  });

  it("removals count toward the 20 upload slots per lead", async () => {
    const ref = await repo.createLead({ privacy_consent: true });
    for (let i = 0; i < MAX_LEAD_DOCUMENT_SLOTS; i++) {
      const d = await repo.uploadLeadDocument(ref.token, { mime: "image/jpeg", bytes: JPEG });
      await repo.removeLeadDocument(ref.token, d.id);
    }
    await expect(repo.uploadLeadDocument(ref.token, { mime: "image/jpeg", bytes: JPEG })).rejects.toBeInstanceOf(
      LeadDocumentLimitError,
    );
    expect(await repo.listLeadDocuments(ref.id)).toEqual([]);
  });
});

describe("mock Phase 12 lead fields + callback phone", () => {
  it("stores IBAN / holder / document fields with the DB normalization", async () => {
    const repo = createMockRepository();
    const ref = await repo.createLead({ privacy_consent: true });
    expect(await repo.getLead(ref.id)).toMatchObject({ iban: null, document_type: null, document_expiry: null });
    await repo.updateLead(ref.token, {
      iban: " it60 x054 2811 1010 0000 0123 456 ",
      iban_holder_different: true,
      iban_holder_first_name: "Mario",
      iban_holder_last_name: "Rossi",
      iban_holder_tax_code: " rssmra80a01h501u ",
      document_type: "passaporto",
      document_number: "ya 1234567",
      document_expiry: "2031-05-31",
      document_issuer: "Questura di Catania",
    });
    expect(await repo.getLead(ref.id)).toMatchObject({
      iban: "IT60X0542811101000000123456",
      iban_holder_different: true,
      iban_holder_tax_code: "RSSMRA80A01H501U",
      document_type: "passaporto",
      document_number: "YA1234567",
      document_expiry: "2031-05-31",
      document_issuer: "Questura di Catania",
    });
    await repo.updateLead(ref.token, { iban: "  ", document_expiry: "" });
    expect(await repo.getLead(ref.id)).toMatchObject({ iban: null, document_expiry: null });
  });

  it("seeded settings keep the default callback number unless given", async () => {
    expect(await createMockRepository({ settings: { notification_email: "a@b.it" } }).getSettings()).toEqual({
      notification_email: "a@b.it",
      callback_phone: DEFAULT_CALLBACK_PHONE,
    });
    const custom = createMockRepository({ settings: { notification_email: null, callback_phone: "+39 06 7654321" } });
    expect(await custom.getCallbackPhone()).toBe("+39 06 7654321");
  });
});
