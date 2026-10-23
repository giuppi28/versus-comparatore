import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRepository } from "@/lib/data";
import { page1Data } from "@/lib/lead/test-fixtures";
import { INITIAL_LEAD_ADMIN_STATE, NOTES_MAX_LENGTH } from "./schema";

const requireAdmin = vi.fn();
const revalidatePath = vi.fn();
let repo = createMockRepository();
vi.mock("@/lib/auth", () => ({ requireAdmin: () => requireAdmin() }));
const redirect = vi.fn((to: string) => {
  throw new Error(`NEXT_REDIRECT:${to}`);
});
vi.mock("next/navigation", () => ({ redirect: (to: string) => redirect(to) }));
vi.mock("next/cache", () => ({
  revalidatePath: (p: string) => revalidatePath(p),
}));
vi.mock("@/lib/data/admin", () => ({
  getAdminRepository: async () => {
    await requireAdmin();
    return repo;
  },
}));

import {
  createLeadDocumentUrlAction,
  deleteLeadAndRedirectAction,
  deleteLeadsAction,
  updateLeadAction,
} from "./actions";

function form(fields: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

beforeEach(() => {
  repo = createMockRepository();
  requireAdmin.mockReset().mockResolvedValue({ id: "admin" });
  revalidatePath.mockReset();
  redirect.mockClear();
});

describe("updateLeadAction", () => {
  it("checks the admin session first and stops when it redirects", async () => {
    requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(
      updateLeadAction(INITIAL_LEAD_ADMIN_STATE, form({ id: "x", status: "new", notes: "" })),
    ).rejects.toThrow("NEXT_REDIRECT");
  });

  it("saves status and trimmed notes, then revalidates the list and detail", async () => {
    const ref = await repo.createLead(page1Data());
    const state = await updateLeadAction(
      INITIAL_LEAD_ADMIN_STATE,
      form({ id: ref.id, status: "contacted", notes: "  Richiamare lunedì  " }),
    );
    expect(state).toMatchObject({
      status: "success",
      values: { status: "contacted", notes: "Richiamare lunedì" },
      attempt: 1,
    });
    const saved = await repo.getLead(ref.id);
    expect(saved).toMatchObject({
      status: "contacted",
      notes: "Richiamare lunedì",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/leads");
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/leads/${ref.id}`);
  });

  it("stores empty notes as null", async () => {
    const ref = await repo.createLead(page1Data());
    await updateLeadAction(INITIAL_LEAD_ADMIN_STATE, form({ id: ref.id, status: "closed", notes: "   " }));
    expect((await repo.getLead(ref.id))?.notes).toBeNull();
  });

  it("rejects an invalid status and over-long notes without writing", async () => {
    const ref = await repo.createLead(page1Data());
    const bad = await updateLeadAction(INITIAL_LEAD_ADMIN_STATE, form({ id: ref.id, status: "hacked", notes: "" }));
    expect(bad.status).toBe("error");
    expect(bad.fieldErrors?.status).toBeTruthy();
    const long = await updateLeadAction(
      INITIAL_LEAD_ADMIN_STATE,
      form({
        id: ref.id,
        status: "new",
        notes: "x".repeat(NOTES_MAX_LENGTH + 1),
      }),
    );
    expect(long.fieldErrors?.notes).toMatch(/al massimo/);
    expect(long.values?.notes).toHaveLength(NOTES_MAX_LENGTH + 1);
    expect(revalidatePath).not.toHaveBeenCalled();
    expect((await repo.getLead(ref.id))?.status).toBe("new");
  });

  it("reports an unknown lead", async () => {
    const state = await updateLeadAction(INITIAL_LEAD_ADMIN_STATE, form({ id: "nope", status: "new", notes: "" }));
    expect(state).toMatchObject({
      status: "error",
      message: "Lead non trovato.",
    });
  });
});

describe("deleteLeadsAction", () => {
  const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

  it("does nothing when the admin check redirects (unauthenticated)", async () => {
    const ref = await repo.createLead(page1Data());
    const spy = vi.spyOn(repo, "deleteLeadsAndDocuments");
    requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(deleteLeadsAction([ref.id])).rejects.toThrow("NEXT_REDIRECT");
    await expect(deleteLeadAndRedirectAction(ref.id)).rejects.toThrow("NEXT_REDIRECT");
    expect(spy).not.toHaveBeenCalled();
    expect(await repo.getLead(ref.id)).not.toBeNull();
  });

  it("rejects non-UUID, empty and oversized lists without deleting", async () => {
    const spy = vi.spyOn(repo, "deleteLeadsAndDocuments");
    const notUuid = await deleteLeadsAction(["abc"]);
    expect(notUuid).toMatchObject({ ok: false });
    const empty = await deleteLeadsAction([]);
    expect(empty).toMatchObject({
      ok: false,
      message: "Seleziona almeno un lead.",
    });
    const tooMany = await deleteLeadsAction(Array.from({ length: 201 }, (_, i) => uuid(i)));
    expect(tooMany).toMatchObject({
      ok: false,
      message: expect.stringContaining("200"),
    });
    expect(await deleteLeadsAction("not-an-array" as unknown as string[])).toMatchObject({ ok: false });
    expect(spy).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("accepts exactly 200 ids", async () => {
    const result = await deleteLeadsAction(Array.from({ length: 200 }, (_, i) => uuid(i)));
    expect(result).toEqual({ ok: true, deleted: 0, documentCleanupFailed: false });
  });

  it("deletes the given leads (deduped), keeps the others and revalidates", async () => {
    const a = await repo.createLead(page1Data());
    const b = await repo.createLead(page1Data());
    const c = await repo.createLead(page1Data());
    const spy = vi.spyOn(repo, "deleteLeadsAndDocuments");
    const result = await deleteLeadsAction([a.id, a.id, c.id]);
    expect(result).toEqual({ ok: true, deleted: 2, documentCleanupFailed: false });
    expect(spy).toHaveBeenCalledWith([a.id, c.id]);
    expect(await repo.getLead(a.id)).toBeNull();
    expect(await repo.getLead(c.id)).toBeNull();
    expect(await repo.getLead(b.id)).not.toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith("/admin/leads");
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/leads/${a.id}`);
  });

  it("returns a generic error message when the repository fails", async () => {
    const ref = await repo.createLead(page1Data());
    vi.spyOn(repo, "deleteLeadsAndDocuments").mockRejectedValue(new Error("boom"));
    expect(await deleteLeadsAction([ref.id])).toEqual({
      ok: false,
      message: "Impossibile eliminare i lead. Riprova.",
    });
  });

  it("detail variant deletes then redirects to the list", async () => {
    const ref = await repo.createLead(page1Data());
    await expect(deleteLeadAndRedirectAction(ref.id)).rejects.toThrow("NEXT_REDIRECT:/admin/leads?deleted=1");
    expect(await repo.getLead(ref.id)).toBeNull();
  });

  it("detail variant does not redirect on invalid input", async () => {
    expect(await deleteLeadAndRedirectAction("nope")).toMatchObject({
      ok: false,
    });
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("deletion with documents", () => {
  const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 9, 9]);

  it("removes the lead documents too and reports a clean result", async () => {
    const ref = await repo.createLead(page1Data());
    const doc = await repo.uploadLeadDocument(ref.token, { mime: "image/jpeg", bytes: JPEG });
    expect(await deleteLeadsAction([ref.id])).toEqual({ ok: true, deleted: 1, documentCleanupFailed: false });
    await expect(repo.createLeadDocumentUrl(doc.id)).rejects.toThrow();
  });

  it("surfaces documentCleanupFailed (bulk) and in the redirect query (detail)", async () => {
    const a = await repo.createLead(page1Data());
    vi.spyOn(repo, "deleteLeadsAndDocuments").mockResolvedValue({ deleted: 1, documentCleanupFailed: true });
    expect(await deleteLeadsAction([a.id])).toEqual({ ok: true, deleted: 1, documentCleanupFailed: true });
    await expect(deleteLeadAndRedirectAction(a.id)).rejects.toThrow(
      "NEXT_REDIRECT:/admin/leads?deleted=1&cleanup=failed",
    );
  });
});

describe("createLeadDocumentUrlAction", () => {
  const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 9, 9]);

  it("checks the admin session first and never touches the repository without it", async () => {
    const spy = vi.spyOn(repo, "createLeadDocumentUrl");
    requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(createLeadDocumentUrlAction("00000000-0000-4000-8000-000000000001", "preview")).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(spy).not.toHaveBeenCalled();
  });

  it("rejects malformed ids and modes", async () => {
    const spy = vi.spyOn(repo, "createLeadDocumentUrl");
    expect(await createLeadDocumentUrlAction("../../etc/passwd", "preview")).toEqual({
      ok: false,
      message: "Documento non valido.",
    });
    expect(await createLeadDocumentUrlAction("00000000-0000-4000-8000-000000000001", "evil")).toMatchObject({
      ok: false,
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it("unknown document id gives a friendly error", async () => {
    expect(await createLeadDocumentUrlAction("00000000-0000-4000-8000-000000000001", "preview")).toEqual({
      ok: false,
      message: "Documento non trovato.",
    });
  });

  it("asks for a short-lived URL (<= 300 s), download variant on request", async () => {
    const ref = await repo.createLead(page1Data());
    const doc = await repo.uploadLeadDocument(ref.token, { mime: "image/jpeg", bytes: JPEG });
    const spy = vi.spyOn(repo, "createLeadDocumentUrl");
    const preview = await createLeadDocumentUrlAction(doc.id, "preview");
    expect(preview).toMatchObject({ ok: true, url: expect.stringMatching(/^data:image\/jpeg;base64,/) });
    expect(spy).toHaveBeenLastCalledWith(doc.id, { download: false, expiresIn: 300 });
    await createLeadDocumentUrlAction(doc.id, "download");
    expect(spy).toHaveBeenLastCalledWith(doc.id, { download: true, expiresIn: 300 });
  });
});
