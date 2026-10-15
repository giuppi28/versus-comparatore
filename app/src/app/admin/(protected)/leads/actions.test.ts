import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRepository } from "@/lib/data";
import { page1Data } from "@/lib/lead/test-fixtures";
import { INITIAL_LEAD_ADMIN_STATE, NOTES_MAX_LENGTH } from "./schema";

const requireAdmin = vi.fn();
const revalidatePath = vi.fn();
let repo = createMockRepository();
vi.mock("@/lib/auth", () => ({ requireAdmin: () => requireAdmin() }));
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => revalidatePath(p) }));
vi.mock("@/lib/data/admin", () => ({
  getAdminRepository: async () => {
    await requireAdmin();
    return repo;
  },
}));

import { updateLeadAction } from "./actions";

function form(fields: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

beforeEach(() => {
  repo = createMockRepository();
  requireAdmin.mockReset().mockResolvedValue({ id: "admin" });
  revalidatePath.mockReset();
});

describe("updateLeadAction", () => {
  it("checks the admin session first and stops when it redirects", async () => {
    requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(updateLeadAction(INITIAL_LEAD_ADMIN_STATE, form({ id: "x", status: "new", notes: "" }))).rejects.toThrow(
      "NEXT_REDIRECT",
    );
  });

  it("saves status and trimmed notes, then revalidates the list and detail", async () => {
    const ref = await repo.createLead(page1Data());
    const state = await updateLeadAction(
      INITIAL_LEAD_ADMIN_STATE,
      form({ id: ref.id, status: "contacted", notes: "  Richiamare lunedì  " }),
    );
    expect(state).toMatchObject({ status: "success", values: { status: "contacted", notes: "Richiamare lunedì" }, attempt: 1 });
    const saved = await repo.getLead(ref.id);
    expect(saved).toMatchObject({ status: "contacted", notes: "Richiamare lunedì" });
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
      form({ id: ref.id, status: "new", notes: "x".repeat(NOTES_MAX_LENGTH + 1) }),
    );
    expect(long.fieldErrors?.notes).toMatch(/al massimo/);
    expect(long.values?.notes).toHaveLength(NOTES_MAX_LENGTH + 1);
    expect(revalidatePath).not.toHaveBeenCalled();
    expect((await repo.getLead(ref.id))?.status).toBe("new");
  });

  it("reports an unknown lead", async () => {
    const state = await updateLeadAction(INITIAL_LEAD_ADMIN_STATE, form({ id: "nope", status: "new", notes: "" }));
    expect(state).toMatchObject({ status: "error", message: "Lead non trovato." });
  });
});
