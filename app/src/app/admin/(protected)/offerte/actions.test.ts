import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRepository } from "@/lib/data";

const requireAdmin = vi.fn();
const revalidatePath = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
let repo = createMockRepository();
vi.mock("@/lib/auth", () => ({ requireAdmin: () => requireAdmin() }));
vi.mock("next/cache", () => ({ revalidatePath: (p: string, t?: string) => revalidatePath(p, t) }));
vi.mock("next/navigation", () => ({ redirect: (u: string) => redirect(u) }));
vi.mock("@/lib/data/admin", () => ({
  getAdminRepository: async () => {
    await requireAdmin();
    return repo;
  },
}));

import { deleteOfferAction } from "./actions";

const EDISON_LUCE = "offer-edison-luce-fissa-12";

beforeEach(() => {
  repo = createMockRepository();
  requireAdmin.mockReset().mockResolvedValue({ id: "admin" });
  revalidatePath.mockReset();
  redirect.mockClear();
});

describe("deleteOfferAction", () => {
  it("checks the admin session first: without a session nothing is deleted", async () => {
    requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT:/admin/login"));
    await expect(deleteOfferAction(EDISON_LUCE)).rejects.toThrow("NEXT_REDIRECT:/admin/login");
    expect(await repo.getOffer(EDISON_LUCE)).not.toBeNull();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each(["", "../etc", "a b", "x;drop table offers", "o".repeat(101)])(
    "rejects the malformed id %j without touching the repository",
    async (bad) => {
      const spy = vi.spyOn(repo, "deleteOffer");
      await expect(deleteOfferAction(bad)).resolves.toEqual({
        ok: false,
        error: "Identificativo offerta non valido.",
      });
      expect(spy).not.toHaveBeenCalled();
      expect(redirect).not.toHaveBeenCalled();
    },
  );

  it("deletes the offer, revalidates and redirects to the list with a notice", async () => {
    await expect(deleteOfferAction(EDISON_LUCE)).rejects.toThrow("NEXT_REDIRECT:/admin/offerte?esito=eliminata");
    expect(await repo.getOffer(EDISON_LUCE)).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith("/admin/offerte", "layout");
  });

  it("keeps the 'tutte' view in the redirect", async () => {
    await expect(deleteOfferAction(EDISON_LUCE, { vista: "tutte" })).rejects.toThrow(
      "NEXT_REDIRECT:/admin/offerte?vista=tutte&esito=eliminata",
    );
  });

  it("works with a UUID id and keeps a snapshot for the leads that chose it", async () => {
    const created = await repo.createOffer({ ...(await repo.getOffer(EDISON_LUCE))!, name: "Da eliminare", active: false });
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    await expect(deleteOfferAction(created.id)).rejects.toThrow("NEXT_REDIRECT");
    expect(await repo.getOffer(created.id)).toBeNull();
    expect(await repo.getOffer(EDISON_LUCE)).not.toBeNull();
  });

  it("reports an unknown offer without redirecting", async () => {
    await expect(deleteOfferAction("00000000-0000-4000-8000-000000000000")).resolves.toEqual({
      ok: false,
      error: "Offerta non trovata: potrebbe essere già stata eliminata.",
      gone: true,
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("returns a generic error when the repository fails", async () => {
    vi.spyOn(repo, "deleteOffer").mockRejectedValue(new Error("db down"));
    const result = await deleteOfferAction(EDISON_LUCE);
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/non riuscita/) });
    expect(redirect).not.toHaveBeenCalled();
  });
});
