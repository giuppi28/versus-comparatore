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

import { deleteLeadAndRedirectAction, deleteLeadsAction, updateLeadAction } from "./actions";

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
    const spy = vi.spyOn(repo, "deleteLeads");
    requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(deleteLeadsAction([ref.id])).rejects.toThrow("NEXT_REDIRECT");
    await expect(deleteLeadAndRedirectAction(ref.id)).rejects.toThrow("NEXT_REDIRECT");
    expect(spy).not.toHaveBeenCalled();
    expect(await repo.getLead(ref.id)).not.toBeNull();
  });

  it("rejects non-UUID, empty and oversized lists without deleting", async () => {
    const spy = vi.spyOn(repo, "deleteLeads");
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
    expect(result).toEqual({ ok: true, deleted: 0 });
  });

  it("deletes the given leads (deduped), keeps the others and revalidates", async () => {
    const a = await repo.createLead(page1Data());
    const b = await repo.createLead(page1Data());
    const c = await repo.createLead(page1Data());
    const spy = vi.spyOn(repo, "deleteLeads");
    const result = await deleteLeadsAction([a.id, a.id, c.id]);
    expect(result).toEqual({ ok: true, deleted: 2 });
    expect(spy).toHaveBeenCalledWith([a.id, c.id]);
    expect(await repo.getLead(a.id)).toBeNull();
    expect(await repo.getLead(c.id)).toBeNull();
    expect(await repo.getLead(b.id)).not.toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith("/admin/leads");
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/leads/${a.id}`);
  });

  it("returns a generic error message when the repository fails", async () => {
    const ref = await repo.createLead(page1Data());
    vi.spyOn(repo, "deleteLeads").mockRejectedValue(new Error("boom"));
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
