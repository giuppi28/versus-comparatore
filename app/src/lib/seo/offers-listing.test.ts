import { describe, expect, it } from "vitest";
import type { OfferWithSupplier } from "@/lib/data/types";
import { formatItalianDate } from "./dates";
import { latestUpdate, sortListingOffers, verifiedOnly } from "./offers-listing";

function offer(id: string, over: Partial<OfferWithSupplier> & { supplierName?: string } = {}): OfferWithSupplier {
  const { supplierName = "Zeta", ...rest } = over;
  return {
    id,
    supplier_id: `s-${supplierName}`,
    name: `Offerta ${id}`,
    commodity: "luce",
    customer_type: "both",
    price_type: "fixed",
    energy_price: 0.12,
    other_variable_costs: 0,
    fixed_fee_monthly: 0,
    other_fixed_costs_monthly: 0,
    locked_months: null,
    activation_cost: 0,
    promo_text: null,
    advantages: [],
    details: null,
    featured: false,
    iban_required: false,
    featured_audience: null,
    active: true,
    price_verified: true,
    updated_at: "2026-10-27T10:00:00Z",
    supplier: { name: supplierName } as OfferWithSupplier["supplier"],
    ...rest,
  } as OfferWithSupplier;
}

describe("verifiedOnly", () => {
  it("drops offers whose price is not verified", () => {
    const list = [offer("a"), offer("b", { price_verified: false })];
    expect(verifiedOnly(list).map((o) => o.id)).toEqual(["a"]);
  });

  it("drops variable offers that are not luce, keeps variable luce and fixed gas", () => {
    const list = [
      offer("var-gas", { commodity: "gas", price_type: "variable" }),
      offer("var-luce", { price_type: "variable" }),
      offer("fix-gas", { commodity: "gas" }),
    ];
    expect(verifiedOnly(list).map((o) => o.id)).toEqual(["var-luce", "fix-gas"]);
  });
});

describe("sortListingOffers", () => {
  it("fixed first by price ascending, then variable by spread ascending", () => {
    const list = [
      offer("v-high", { price_type: "variable", energy_price: 0.03 }),
      offer("f-high", { energy_price: 0.15 }),
      offer("v-low", { price_type: "variable", energy_price: 0.01 }),
      offer("f-low", { energy_price: 0.1 }),
    ];
    expect(sortListingOffers(list).map((o) => o.id)).toEqual(["f-low", "f-high", "v-low", "v-high"]);
  });

  it("a variable offer with a tiny spread never precedes a fixed one", () => {
    const list = [offer("v", { price_type: "variable", energy_price: 0.001 }), offer("f", { energy_price: 0.5 })];
    expect(sortListingOffers(list).map((o) => o.id)).toEqual(["f", "v"]);
  });

  it("ties go to the supplier name (Italian collation), then offer name", () => {
    const list = [
      offer("1", { supplierName: "Sentra" }),
      offer("2", { supplierName: "Enel" }),
      offer("3", { supplierName: "Enel", name: "A prima" }),
    ];
    expect(sortListingOffers(list).map((o) => o.id)).toEqual(["3", "2", "1"]);
  });

  it("ignores float noise and does not mutate the input", () => {
    const list = [offer("b", { energy_price: 0.1 + 0.2 - 0.2, supplierName: "B" }), offer("a", { energy_price: 0.1, supplierName: "A" })];
    const copy = [...list];
    expect(sortListingOffers(list).map((o) => o.id)).toEqual(["a", "b"]);
    expect(list).toEqual(copy);
  });
});

describe("latestUpdate", () => {
  it("returns the most recent updated_at, null for an empty list", () => {
    const list = [
      offer("a", { updated_at: "2026-10-27T10:00:00Z" }),
      offer("b", { updated_at: "2026-11-02T09:00:00Z" }),
      offer("c", { updated_at: "2026-10-30T09:00:00Z" }),
    ];
    expect(latestUpdate(list)).toBe("2026-11-02T09:00:00Z");
    expect(latestUpdate([])).toBeNull();
  });
});

describe("formatItalianDate", () => {
  it("formats plain dates and timestamps in Italian", () => {
    expect(formatItalianDate("2026-11-05")).toBe("5 novembre 2026");
    expect(formatItalianDate("2026-03-01T12:00:00Z")).toBe("1 marzo 2026");
    expect(formatItalianDate("2026-12-31T23:30:00Z")).toBe("1 gennaio 2027"); // Europe/Rome
    expect(formatItalianDate("nope")).toBe("");
  });
});
