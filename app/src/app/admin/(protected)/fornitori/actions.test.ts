import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlaceholderSupplierError, SupplierHasOffersError, createMockRepository, type Repository } from "@/lib/data";
import { MOCK_OFFERS } from "@/lib/data/mock/data";

const requireAdmin = vi.fn();
const revalidatePath = vi.fn();
let repo: Repository = createMockRepository();
vi.mock("@/lib/auth", () => ({ requireAdmin: () => requireAdmin() }));
vi.mock("next/cache", () => ({ revalidatePath: (...a: unknown[]) => revalidatePath(...a) }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/data/admin", () => ({
  getAdminRepository: async () => {
    await requireAdmin();
    return repo;
  },
}));

import { deleteSupplierAction } from "./actions";

const baseSupplier = {
  logo_path: null,
  sells_luce: true,
  sells_gas: true,
  show_in_dropdown: false,
  sort_order: 500,
  active: true,
};

beforeEach(() => {
  repo = createMockRepository();
  requireAdmin.mockReset().mockResolvedValue({ id: "admin" });
  revalidatePath.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

async function supplierWithOffers(n: number) {
  const s = await repo.createSupplier({ ...baseSupplier, name: `Prova ${n}`, slug: `prova-${n}-${Math.random()}` });
  const template = MOCK_OFFERS[0];
  for (let i = 0; i < n; i++) {
    const rest: Record<string, unknown> = { ...template };
    delete rest.id;
    delete rest.updated_at;
    await repo.createOffer({ ...(rest as Omit<typeof template, "id" | "updated_at">), supplier_id: s.id, name: `Offerta ${i}` });
  }
  return s;
}

describe("deleteSupplierAction", () => {
  it("checks the admin session first: unauthenticated deletes nothing", async () => {
    const s = await supplierWithOffers(1);
    requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(deleteSupplierAction(s.id)).rejects.toThrow("NEXT_REDIRECT");
    expect(await repo.getSupplier(s.id)).not.toBeNull();
    expect(await repo.countOffersBySupplier(s.id)).toBe(1);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects malformed ids without touching the repository", async () => {
    const spy = vi.spyOn(repo, "deleteSupplier");
    for (const bad of ["", "   ", "../etc", "a b", "x".repeat(200), "ID;DROP", null as unknown as string]) {
      expect(await deleteSupplierAction(bad)).toEqual({ status: "error", message: "Fornitore non valido." });
    }
    expect(spy).not.toHaveBeenCalled();
  });

  it("deletes the supplier and its offers, then revalidates the list and offers", async () => {
    const s = await supplierWithOffers(2);
    const result = await deleteSupplierAction(s.id);
    expect(result).toEqual({ status: "success", name: s.name, deletedOffers: 2, logoCleanupFailed: false });
    expect(await repo.getSupplier(s.id)).toBeNull();
    expect(await repo.countOffersBySupplier(s.id)).toBe(0);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/fornitori");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/offerte", "layout");
  });

  it("removes the supplier and its offers from the public queries too", async () => {
    const s = await supplierWithOffers(2);
    const own = (await repo.listActiveOffers("luce", "casa")).filter((o) => o.supplier_id === s.id);
    expect(own.length).toBeGreaterThan(0);
    await deleteSupplierAction(s.id);
    expect((await repo.listActiveOffers("luce", "casa")).some((o) => o.supplier_id === s.id)).toBe(false);
    expect((await repo.listActiveSuppliers()).some((x) => x.id === s.id)).toBe(false);
    expect((await repo.listAllOffers()).some((o) => o.supplier_id === s.id)).toBe(false);
  });

  it("deletes a supplier without offers (0 offers deleted)", async () => {
    const s = await supplierWithOffers(0);
    expect(await deleteSupplierAction(s.id)).toMatchObject({ status: "success", deletedOffers: 0 });
  });

  it("passes on a logo cleanup failure as a warning, still a success", async () => {
    const s = await supplierWithOffers(0);
    vi.spyOn(repo, "deleteSupplier").mockResolvedValue({ deletedOffers: 0, logoCleanupFailed: true });
    expect(await deleteSupplierAction(s.id)).toMatchObject({ status: "success", logoCleanupFailed: true });
  });

  it("refuses placeholder suppliers server-side, leaving everything untouched", async () => {
    const placeholders = (await repo.listAllSuppliers()).filter((s) => s.is_placeholder);
    expect(placeholders.length).toBeGreaterThanOrEqual(2);
    const spy = vi.spyOn(repo, "deleteSupplier");
    for (const p of placeholders) {
      const result = await deleteSupplierAction(p.id);
      expect(result.status).toBe("error");
      expect(result).toMatchObject({ message: expect.stringContaining("non può essere eliminato") });
      expect(await repo.getSupplier(p.id)).not.toBeNull();
    }
    expect(spy).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("reports an unknown supplier", async () => {
    expect(await deleteSupplierAction("00000000-0000-4000-8000-000000000000")).toMatchObject({
      status: "error",
      message: expect.stringContaining("non trovato"),
    });
  });

  it("maps the typed errors to Italian messages", async () => {
    const s = await supplierWithOffers(0);
    const spy = vi.spyOn(repo, "deleteSupplier");

    spy.mockRejectedValueOnce(new PlaceholderSupplierError());
    expect(await deleteSupplierAction(s.id)).toMatchObject({ status: "error", message: expect.stringContaining("voce di sistema") });

    spy.mockRejectedValueOnce(new SupplierHasOffersError());
    expect(await deleteSupplierAction(s.id)).toMatchObject({ status: "error", message: expect.stringContaining("ancora delle offerte") });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/offerte", "layout");

    spy.mockRejectedValueOnce(new Error("connection reset"));
    expect(await deleteSupplierAction(s.id)).toEqual({
      status: "error",
      message: "Impossibile eliminare il fornitore. Riprova tra qualche istante.",
    });
    expect(console.error).toHaveBeenCalled(); // never swallowed silently
  });
});
