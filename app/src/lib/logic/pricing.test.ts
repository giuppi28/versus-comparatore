import { describe, expect, it } from "vitest";
import type { Offer } from "@/lib/data/types";
import {
  annualFromMonthly,
  formatEuro,
  formatPrice,
  monthlyCost,
  monthlyFromAnnual,
  rankOffers,
  roundCents,
} from "./pricing";

function offer(over: Partial<Offer> & { id: string }): Offer {
  return {
    supplier_id: "s1",
    name: over.id,
    commodity: "luce",
    customer_type: "casa",
    price_type: "fixed",
    energy_price: 0.1,
    other_variable_costs: 0,
    fixed_fee_monthly: 0,
    other_fixed_costs_monthly: 0,
    locked_months: 12,
    activation_cost: 0,
    promo_text: null,
    advantages: [],
    details: null,
    featured: false,
    iban_required: false,
    featured_audience: null,
    active: true,
    price_verified: false,
    updated_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

describe("monthlyCost (PRD §8)", () => {
  it("applies the formula", () => {
    const o = offer({ id: "a", energy_price: 0.12, other_variable_costs: 0.01, fixed_fee_monthly: 8, other_fixed_costs_monthly: 2 });
    // 2400/12 = 200 kWh * 0.13 = 26 + 8 + 2
    expect(monthlyCost(o, 2400)).toBeCloseTo(36, 10);
  });
  it("zero or invalid consumption gives only fixed costs", () => {
    const o = offer({ id: "a", fixed_fee_monthly: 5, other_fixed_costs_monthly: 1 });
    expect(monthlyCost(o, 0)).toBe(6);
    expect(monthlyCost(o, -100)).toBe(6);
    expect(monthlyCost(o, Number.NaN)).toBe(6);
  });
  it("is not rounded", () => {
    const o = offer({ id: "a", energy_price: 0.1234 });
    expect(monthlyCost(o, 1000)).toBeCloseTo((1000 / 12) * 0.1234, 10);
  });
});

describe("rankOffers", () => {
  const offers = [
    offer({ id: "cheap", name: "Cheap", energy_price: 0.1 }),
    offer({ id: "mid", name: "Mid", energy_price: 0.15 }),
    offer({ id: "feat", name: "Featured", energy_price: 0.3, featured: true }),
    offer({ id: "other", name: "Other", supplier_id: "s2", energy_price: 0.05 }),
  ];
  it("featured first, then cost ascending", () => {
    expect(rankOffers(offers, 2400).map((r) => r.offer.id)).toEqual(["feat", "other", "cheap", "mid"]);
  });
  it("excludes the current supplier", () => {
    expect(rankOffers(offers, 2400, { excludeSupplierId: "s1" }).map((r) => r.offer.id)).toEqual(["other"]);
    expect(rankOffers(offers, 2400, { excludeSupplierId: null }).length).toBe(4);
    expect(rankOffers(offers, 2400, { excludeSupplierId: "unknown" }).length).toBe(4);
  });
  it("returns the monthly cost and does not mutate the input", () => {
    const copy = [...offers];
    const ranked = rankOffers(offers, 1200);
    expect(offers).toEqual(copy);
    expect(ranked.find((r) => r.offer.id === "cheap")?.monthlyCost).toBeCloseTo(10, 10);
  });
  it("ties broken by name, then id", () => {
    const tied = [
      offer({ id: "2", name: "Zeta" }),
      offer({ id: "1", name: "Alfa" }),
      offer({ id: "b", name: "Alfa" }),
      offer({ id: "a", name: "Alfa" }),
    ];
    expect(rankOffers(tied, 1200).map((r) => r.offer.id)).toEqual(["1", "a", "b", "2"]);
  });
  it("ties among featured offers are also by cost then name", () => {
    const f = [
      offer({ id: "f2", name: "B", featured: true, energy_price: 0.2 }),
      offer({ id: "f1", name: "A", featured: true, energy_price: 0.3 }),
      offer({ id: "f3", name: "C", featured: true, energy_price: 0.2 }),
    ];
    expect(rankOffers(f, 1200).map((r) => r.offer.id)).toEqual(["f2", "f3", "f1"]);
  });
  it("empty input", () => {
    expect(rankOffers([], 1000)).toEqual([]);
  });
});

describe("monthly/annual helpers", () => {
  it("monthlyFromAnnual rounds to whole units, annualFromMonthly multiplies by 12", () => {
    expect(monthlyFromAnnual(2400)).toBe(200);
    expect(monthlyFromAnnual(2200)).toBe(183);
    expect(annualFromMonthly(200)).toBe(2400);
    expect(annualFromMonthly(monthlyFromAnnual(1900))).toBe(1896);
  });
});

describe("formatting", () => {
  it("roundCents", () => {
    expect(roundCents(1.005)).toBe(1.01);
    expect(roundCents(0)).toBe(0);
    expect(roundCents(-1.005)).toBe(-1.01);
    expect(roundCents(12.344)).toBe(12.34);
  });
  it("formatEuro: Italian locale, 2 decimals, nbsp before the symbol", () => {
    expect(formatEuro(12.34)).toBe("12,34 €");
    expect(formatEuro(0)).toBe("0,00 €");
    expect(formatEuro(7)).toBe("7,00 €");
    expect(formatEuro(12.345)).toBe("12,35 €");
    expect(formatEuro(1234.5)).toBe("1.234,50 €");
  });
  it("formatPrice: 4 decimals with unit", () => {
    expect(formatPrice(0.129, "kWh")).toBe("0,1290 €/kWh");
    expect(formatPrice(0.45678, "Smc")).toBe("0,4568 €/Smc");
  });
});
