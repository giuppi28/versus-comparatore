import { beforeEach, describe, expect, it } from "vitest";
import { createMockRepository } from "./mock-repository";
import {
  OfferNotFoundError,
  PlaceholderSupplierError,
  SupplierNotFoundError,
  type Repository,
} from "../repository";
import { LEAD_HISTORY_FIELDS, type LeadData } from "../types";

// Mock-layer parity with migration 20261015170000 (lead snapshots on delete).
const EDISON_LUCE = "offer-edison-luce-fissa-12";
const PLENITUDE_GAS = "offer-plenitude-gas-fisso-12";
const SORGENIA_LUCE = "offer-sorgenia-luce-sicura-24";

let repo: Repository;
beforeEach(() => {
  repo = createMockRepository();
});

async function lead(data: LeadData = {}) {
  const ref = await repo.createLead({ privacy_consent: true, ...data });
  return ref.id;
}

describe("lead history fields", () => {
  it("new leads start with null history fields", async () => {
    const l = await repo.getLead(await lead());
    for (const f of LEAD_HISTORY_FIELDS) expect(l?.[f]).toBeNull();
  });

  it("the customer flow can never write them", async () => {
    const forged = {
      chosen_offer_luce_snapshot: { offer_id: "x" },
      current_supplier_luce_name: "Forged",
    } as unknown as LeadData;
    const ref = await repo.createLead({ privacy_consent: true, ...forged });
    await repo.updateLead(ref.token, forged);
    await repo.completeLead(ref.token, forged);
    const l = await repo.getLead(ref.id);
    expect(l?.chosen_offer_luce_snapshot).toBeNull();
    expect(l?.current_supplier_luce_name).toBeNull();
  });
});

describe("deleteLeads", () => {
  it("deletes the given ids and returns the count", async () => {
    const a = await lead({ first_name: "A" });
    const b = await lead({ first_name: "B" });
    const c = await lead({ first_name: "C" });
    expect(await repo.deleteLeads([a, c, a, "unknown"])).toBe(2);
    expect((await repo.listLeads()).map((l) => l.id)).toEqual([b]);
    expect(await repo.getLead(a)).toBeNull();
  });

  it("empty array deletes nothing", async () => {
    await lead();
    expect(await repo.deleteLeads([])).toBe(0);
    expect(await repo.listLeads()).toHaveLength(1);
  });

  it("works with the filtered list (e.g. all 'contacted')", async () => {
    const a = await lead();
    const b = await lead();
    await repo.updateLeadAdmin(a, { status: "contacted" });
    const page = await repo.queryLeads({ status: "contacted" });
    expect(await repo.deleteLeads(page.items.map((l) => l.id))).toBe(1);
    expect((await repo.listLeads()).map((l) => l.id)).toEqual([b]);
  });
});

describe("deleteOffer", () => {
  it("stores a compact snapshot in leads that chose it and clears the reference", async () => {
    const id = await lead({ commodity: "dual", chosen_offer_luce: EDISON_LUCE, chosen_offer_gas: PLENITUDE_GAS });
    const other = await lead({ chosen_offer_luce: SORGENIA_LUCE });
    const before = (await repo.getLead(id))!.updated_at;
    await new Promise((r) => setTimeout(r, 2));

    await repo.deleteOffer(EDISON_LUCE);

    expect(await repo.getOffer(EDISON_LUCE)).toBeNull();
    const l = (await repo.getLead(id))!;
    expect(l.chosen_offer_luce).toBeNull();
    expect(l.chosen_offer_luce_snapshot).toEqual({
      offer_id: EDISON_LUCE,
      supplier_name: "Edison Energia",
      offer_name: "Edison Luce Fissa 12",
      commodity: "luce",
      price_type: "fixed",
      iban_required: false,
      energy_price: 0.129,
      other_variable_costs: 0.06,
      fixed_fee_monthly: 9,
      other_fixed_costs_monthly: 0,
      locked_months: 12,
      deleted_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
    expect(l.updated_at > before).toBe(true);
    // the gas side and other leads are untouched
    expect(l.chosen_offer_gas).toBe(PLENITUDE_GAS);
    expect(l.chosen_offer_gas_snapshot).toBeNull();
    const o = (await repo.getLead(other))!;
    expect(o.chosen_offer_luce).toBe(SORGENIA_LUCE);
    expect(o.chosen_offer_luce_snapshot).toBeNull();
  });

  it("keeps an existing snapshot of the same offer, replaces a stale one of another offer", async () => {
    const id = await lead({ chosen_offer_luce: EDISON_LUCE });
    await repo.deleteOffer(EDISON_LUCE);
    const first = (await repo.getLead(id))!.chosen_offer_luce_snapshot;
    // the in-progress customer then picks another offer, which is deleted too
    const ref = (await repo.listLeads()).find((l) => l.id === id)!;
    await repo.updateLead(ref.token, { chosen_offer_luce: SORGENIA_LUCE });
    await repo.deleteOffer(SORGENIA_LUCE);
    const l = (await repo.getLead(id))!;
    expect(first?.offer_id).toBe(EDISON_LUCE);
    expect(l.chosen_offer_luce_snapshot?.offer_id).toBe(SORGENIA_LUCE);
    expect(l.chosen_offer_luce_snapshot?.supplier_name).toBe("Sorgenia");
  });

  it("deleted offers disappear from the public results and the admin list", async () => {
    await repo.deleteOffer(EDISON_LUCE);
    expect((await repo.listActiveOffers("luce", "casa")).map((o) => o.id)).not.toContain(EDISON_LUCE);
    expect((await repo.listAllOffers()).map((o) => o.id)).not.toContain(EDISON_LUCE);
  });

  it("unknown id -> OfferNotFoundError", async () => {
    await expect(repo.deleteOffer("nope")).rejects.toBeInstanceOf(OfferNotFoundError);
  });
});

describe("deleteSupplier", () => {
  it("counts its offers", async () => {
    expect(await repo.countOffersBySupplier("edison-energia")).toBe(1);
    expect(await repo.countOffersBySupplier("enel-energia")).toBe(0);
    const extra = await repo.createOffer({
      ...(await repo.getOffer(EDISON_LUCE))!,
      name: "Edison Gas Extra",
      commodity: "gas",
      active: false,
    });
    expect(extra.supplier_id).toBe("edison-energia");
    expect(await repo.countOffersBySupplier("edison-energia")).toBe(2);
  });

  it("deletes its offers first (snapshots), then the supplier (names in leads)", async () => {
    await repo.createOffer({
      ...(await repo.getOffer(EDISON_LUCE))!,
      name: "Edison Gas Extra",
      commodity: "gas",
    });
    const edisonGas = (await repo.listAllOffers()).find((o) => o.name === "Edison Gas Extra")!.id;
    const id = await lead({
      commodity: "dual",
      chosen_offer_luce: EDISON_LUCE,
      chosen_offer_gas: edisonGas,
      current_supplier_luce: "edison-energia",
      current_supplier_gas: "enel-energia",
    });

    expect(await repo.deleteSupplier("edison-energia")).toEqual({ deletedOffers: 2, logoCleanupFailed: false });

    expect(await repo.getSupplier("edison-energia")).toBeNull();
    expect(await repo.countOffersBySupplier("edison-energia")).toBe(0);
    expect((await repo.listActiveSuppliers()).map((s) => s.id)).not.toContain("edison-energia");
    const l = (await repo.getLead(id))!;
    expect(l.chosen_offer_luce).toBeNull();
    expect(l.chosen_offer_gas).toBeNull();
    expect(l.chosen_offer_luce_snapshot).toMatchObject({ offer_id: EDISON_LUCE, supplier_name: "Edison Energia" });
    expect(l.chosen_offer_gas_snapshot).toMatchObject({ offer_name: "Edison Gas Extra", commodity: "gas" });
    expect(l.current_supplier_luce).toBeNull();
    expect(l.current_supplier_luce_name).toBe("Edison Energia");
    // other supplier untouched
    expect(l.current_supplier_gas).toBe("enel-energia");
    expect(l.current_supplier_gas_name).toBeNull();
  });

  it("deletes a supplier without offers", async () => {
    expect(await repo.deleteSupplier("enel-energia")).toEqual({ deletedOffers: 0, logoCleanupFailed: false });
    expect(await repo.getSupplier("enel-energia")).toBeNull();
  });

  it("rejects placeholders before touching anything", async () => {
    const id = await lead({ current_supplier_luce: "tutela" });
    for (const slug of ["tutela", "altro-fornitore", "non-lo-so"]) {
      const err = await repo.deleteSupplier(slug).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(PlaceholderSupplierError);
      expect((err as PlaceholderSupplierError).code).toBe("placeholder_supplier");
      expect(await repo.getSupplier(slug)).not.toBeNull();
    }
    const l = (await repo.getLead(id))!;
    expect(l.current_supplier_luce).toBe("tutela");
    expect(l.current_supplier_luce_name).toBeNull();
  });

  it("unknown id -> SupplierNotFoundError", async () => {
    await expect(repo.deleteSupplier("nope")).rejects.toBeInstanceOf(SupplierNotFoundError);
  });
});
