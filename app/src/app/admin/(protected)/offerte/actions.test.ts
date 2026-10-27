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

import { deleteOfferAction, saveOfferAction } from "./actions";

const EDISON_LUCE = "offer-aldo-10";

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

describe("saveOfferAction (price type, IBAN, audience)", () => {
  const state = { errors: {}, attempt: 0 };
  const form = (fields: Record<string, string>) => {
    const fd = new FormData();
    const base: Record<string, string> = {
      supplier_id: "iren", name: "Test", commodity: "luce", customer_type: "casa", price_type: "fixed",
      energy_price: "0,03", other_variable_costs: "0", fixed_fee: "9", other_fixed_costs: "0",
      fixed_fee_period: "month", other_fixed_costs_period: "month", locked_months: "12", activation_cost: "0",
      featured_audience: "", ...fields,
    };
    for (const [k, v] of Object.entries(base)) fd.set(k, v);
    return fd;
  };
  const lastSavedId = async () => {
    const all = await repo.listAllOffers();
    return all.find((o) => o.name === "Test")!;
  };

  it("creates a variable luce offer: null months, IBAN, audience Casa -> featured", async () => {
    const fd = form({ price_type: "variable", locked_months: "", iban_required: "on", featured_audience: "casa" });
    await expect(saveOfferAction(state, fd)).rejects.toThrow("NEXT_REDIRECT");
    expect(await lastSavedId()).toMatchObject({
      price_type: "variable", locked_months: null, iban_required: true, featured_audience: "casa", featured: true,
    });
  });

  it("rejects variable gas without touching the repository", async () => {
    const spy = vi.spyOn(repo, "createOffer");
    const result = await saveOfferAction(state, form({ price_type: "variable", commodity: "gas" }));
    expect(result.errors.price_type).toMatch(/solo per la luce/);
    expect(spy).not.toHaveBeenCalled();
  });

  it("edit keeps what the form posts: audience Nessuno clears featured, IBAN off", async () => {
    await expect(saveOfferAction(state, form({ iban_required: "on", featured_audience: "both" }))).rejects.toThrow();
    const created = await lastSavedId();
    expect(created).toMatchObject({ iban_required: true, featured: true, featured_audience: "both" });
    await expect(saveOfferAction(state, form({ id: created.id }))).rejects.toThrow();
    expect(await repo.getOffer(created.id)).toMatchObject({ iban_required: false, featured: false, featured_audience: null });
  });
});

describe("mock repository parity with offers_sync_featured", () => {
  it("featured_audience drives featured; featured alone keeps current behaviour", async () => {
    const base = { ...(await repo.getOffer(EDISON_LUCE))!, active: false };
    const a = await repo.createOffer({ ...base, featured: false, featured_audience: "business" });
    expect(a).toMatchObject({ featured: true, featured_audience: "business" });
    const b = await repo.updateOffer(a.id, { featured_audience: null });
    expect(b).toMatchObject({ featured: false, featured_audience: null });
    const c = await repo.updateOffer(a.id, { featured: true });
    expect(c).toMatchObject({ featured: true, featured_audience: "both" });
    const d = await repo.updateOffer(a.id, { featured: false });
    expect(d).toMatchObject({ featured: false, featured_audience: null });
  });
});
