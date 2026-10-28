import { describe, expect, it } from "vitest";
import { MOCK_OFFERS } from "@/lib/data";
import type { Offer } from "@/lib/data/types";
import {
  annualFromMonthly,
  featuredBadgeIds,
  formatEuro,
  formatPrice,
  formatVariablePrice,
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

describe("monthlyCost, variable offers", () => {
  it("returns null for a variable offer whatever the consumption", () => {
    const v = offer({ id: "v", price_type: "variable", energy_price: 0.01, locked_months: null });
    expect(monthlyCost(v, 2400)).toBeNull();
    expect(monthlyCost(v, 0)).toBeNull();
  });
  it("fixed offers are unchanged (explicit and missing price_type)", () => {
    const f = offer({ id: "f", energy_price: 0.1 });
    expect(monthlyCost(f, 1200)).toBeCloseTo(10, 10);
    expect(
      monthlyCost(
        { energy_price: 0.1, other_variable_costs: 0, fixed_fee_monthly: 0, other_fixed_costs_monthly: 0 },
        1200,
      ),
    ).toBeCloseTo(10, 10);
  });
});

describe("rankOffers", () => {
  const ids = (list: { offer: { id: string } }[]) => list.map((r) => r.offer.id);
  const offers = [
    offer({ id: "cheap", name: "Cheap", energy_price: 0.1 }),
    offer({ id: "mid", name: "Mid", energy_price: 0.15 }),
    offer({ id: "feat", name: "Featured", energy_price: 0.3, featured: true, featured_audience: "both" }),
    offer({ id: "other", name: "Other", supplier_id: "s2", energy_price: 0.05 }),
  ];
  it("forced-featured first, then cost ascending", () => {
    expect(ids(rankOffers(offers, "casa", 2400))).toEqual(["feat", "other", "cheap", "mid"]);
  });
  it("excludes the current supplier", () => {
    expect(ids(rankOffers(offers, "casa", 2400, { excludeSupplierId: "s1" }))).toEqual(["other"]);
    expect(rankOffers(offers, "casa", 2400, { excludeSupplierId: null }).length).toBe(4);
    expect(rankOffers(offers, "casa", 2400, { excludeSupplierId: "unknown" }).length).toBe(4);
  });
  it("excluding the current supplier removes a forced-featured offer too", () => {
    const list = [
      offer({ id: "feat", supplier_id: "s9", energy_price: 0.3, featured_audience: "both" }),
      offer({ id: "a", energy_price: 0.1 }),
    ];
    expect(ids(rankOffers(list, "casa", 1200, { excludeSupplierId: "s9" }))).toEqual(["a"]);
  });
  it("returns the monthly cost and does not mutate the input", () => {
    const copy = [...offers];
    const ranked = rankOffers(offers, "casa", 1200);
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
    expect(ids(rankOffers(tied, "casa", 1200))).toEqual(["1", "a", "b", "2"]);
  });
  it("ties among forced-featured offers are also by cost then name", () => {
    const f = [
      offer({ id: "f2", name: "B", featured_audience: "both", energy_price: 0.2 }),
      offer({ id: "f1", name: "A", featured_audience: "both", energy_price: 0.3 }),
      offer({ id: "f3", name: "C", featured_audience: "both", energy_price: 0.2 }),
    ];
    expect(ids(rankOffers(f, "casa", 1200))).toEqual(["f2", "f3", "f1"]);
  });
  it("empty input", () => {
    expect(rankOffers([], "casa", 1000)).toEqual([]);
  });

  describe("audience", () => {
    const list = [
      offer({ id: "plain", energy_price: 0.1 }),
      offer({ id: "casa-f", energy_price: 0.4, featured_audience: "casa" }),
      offer({ id: "biz-f", energy_price: 0.3, featured_audience: "business" }),
      offer({ id: "both-f", energy_price: 0.2, featured_audience: "both" }),
    ];
    it("casa: casa and both are forced on top, business-forced is a normal offer", () => {
      expect(ids(rankOffers(list, "casa", 1200))).toEqual(["both-f", "casa-f", "plain", "biz-f"]);
    });
    it("business: business and both are forced on top, casa-forced is a normal offer", () => {
      expect(ids(rankOffers(list, "business", 1200))).toEqual(["both-f", "biz-f", "plain", "casa-f"]);
    });
  });

  describe("variable offers", () => {
    const list = [
      offer({ id: "var-hi", price_type: "variable", energy_price: 0.03, locked_months: null }),
      offer({ id: "fix-expensive", energy_price: 0.5 }),
      offer({ id: "var-lo", price_type: "variable", energy_price: 0.01, locked_months: null }),
      offer({ id: "fix-cheap", energy_price: 0.1 }),
    ];
    it("come after every fixed offer, ordered by spread ascending", () => {
      const ranked = rankOffers(list, "casa", 2400);
      expect(ids(ranked)).toEqual(["fix-cheap", "fix-expensive", "var-lo", "var-hi"]);
      expect(ranked.filter((r) => r.offer.price_type === "variable").every((r) => r.monthlyCost === null)).toBe(true);
    });
    it("a variable offer is cheaper by spread than any fixed price but still last", () => {
      expect(ids(rankOffers(list, "casa", 0)).slice(-2)).toEqual(["var-lo", "var-hi"]);
    });
    it("a forced-featured variable offer is on top of the other normal offers but after forced fixed ones", () => {
      const l = [
        ...list,
        offer({ id: "forced-var", price_type: "variable", energy_price: 0.05, featured_audience: "both", locked_months: null }),
        offer({ id: "forced-fix", energy_price: 0.9, featured_audience: "casa" }),
      ];
      expect(ids(rankOffers(l, "casa", 2400))).toEqual([
        "forced-fix",
        "forced-var",
        "fix-cheap",
        "fix-expensive",
        "var-lo",
        "var-hi",
      ]);
      // for business the casa-forced fixed offer is a normal one
      expect(ids(rankOffers(l, "business", 2400)).slice(0, 2)).toEqual(["forced-var", "fix-cheap"]);
    });
    it("variable ties by spread are broken by name, then id", () => {
      const t = [
        offer({ id: "2", name: "Zeta", price_type: "variable", energy_price: 0.02, locked_months: null }),
        offer({ id: "1", name: "Alfa", price_type: "variable", energy_price: 0.02, locked_months: null }),
        offer({ id: "0", name: "Beta", price_type: "variable", energy_price: 0.0200000001, locked_months: null }),
      ];
      expect(ids(rankOffers(t, "casa", 1200))).toEqual(["1", "0", "2"]);
    });
    it("all-variable list is ordered by spread", () => {
      const l = list.filter((o) => o.price_type === "variable");
      expect(ids(rankOffers(l, "business", 1200))).toEqual(["var-lo", "var-hi"]);
    });
  });
});

describe("featuredBadgeIds", () => {
  const rank = (list: Offer[], audience: "casa" | "business", exclude?: string) =>
    rankOffers(list, audience, 2400, { excludeSupplierId: exclude });
  const fixed = [
    offer({ id: "b", energy_price: 0.2 }),
    offer({ id: "a", energy_price: 0.1 }),
  ];
  const variable = offer({ id: "v", price_type: "variable", energy_price: 0.01, locked_months: null });

  it("no forced offer: the cheapest displayed fixed offer", () => {
    expect([...featuredBadgeIds(rank(fixed, "casa"), "casa")]).toEqual(["a"]);
  });
  it("never a variable offer automatically, even when it comes first in the input", () => {
    expect([...featuredBadgeIds(rank([variable, ...fixed], "casa"), "casa")]).toEqual(["a"]);
  });
  it("all-variable list: no badge", () => {
    expect(featuredBadgeIds(rank([variable, { ...variable, id: "v2" }], "casa"), "casa").size).toBe(0);
  });
  it("empty list: no badge", () => {
    expect(featuredBadgeIds([], "casa").size).toBe(0);
  });
  it("forced offers get the badge (and replace the automatic one)", () => {
    const list = [...fixed, offer({ id: "f1", energy_price: 0.9, featured_audience: "casa" }), offer({ id: "f2", energy_price: 0.8, featured_audience: "both" })];
    expect([...featuredBadgeIds(rank(list, "casa"), "casa")].sort()).toEqual(["f1", "f2"]);
  });
  it("a forced variable offer gets the badge", () => {
    const forced = { ...variable, featured_audience: "both" as const };
    expect([...featuredBadgeIds(rank([forced, ...fixed], "casa"), "casa")]).toEqual(["v"]);
  });
  it("forcing for the other audience does not count: automatic badge instead", () => {
    const list = [...fixed, offer({ id: "biz", energy_price: 0.9, featured_audience: "business" })];
    expect([...featuredBadgeIds(rank(list, "casa"), "casa")]).toEqual(["a"]);
    expect([...featuredBadgeIds(rank(list, "business"), "business")]).toEqual(["biz"]);
  });
  it("the excluded current supplier's forced offer is not displayed, so the automatic badge applies", () => {
    const list = [...fixed, offer({ id: "f", supplier_id: "cur", energy_price: 0.9, featured_audience: "both" })];
    expect([...featuredBadgeIds(rank(list, "casa", "cur"), "casa")]).toEqual(["a"]);
  });
  it("is per commodity: luce and gas lists are independent", () => {
    const luce = rank([offer({ id: "l1", energy_price: 0.2, featured_audience: "both" }), offer({ id: "l2", energy_price: 0.1 })], "casa");
    const gas = rank([offer({ id: "g1", commodity: "gas", energy_price: 0.5 }), offer({ id: "g2", commodity: "gas", energy_price: 0.4 })], "casa");
    expect([...featuredBadgeIds(luce, "casa")]).toEqual(["l1"]);
    expect([...featuredBadgeIds(gas, "casa")]).toEqual(["g2"]);
  });
  it("works on the real mock data: luce casa has one badge, the cheapest fixed unless forced", () => {
    for (const audience of ["casa", "business"] as const) {
      const pool = MOCK_OFFERS.filter(
        (o) => o.commodity === "luce" && o.active && (o.customer_type === "both" || o.customer_type === audience),
      );
      const ranked = rank(pool, audience);
      const badge = featuredBadgeIds(ranked, audience);
      expect(badge.size).toBeGreaterThan(0);
      const forcedIds = ranked.filter((r) => r.offer.featured_audience === audience || r.offer.featured_audience === "both").map((r) => r.offer.id);
      if (forcedIds.length === 0) expect([...badge]).toEqual([ranked.find((r) => r.offer.price_type === "fixed")!.offer.id]);
      else expect([...badge].sort()).toEqual([...forcedIds].sort());
      // non-forced fixed offers precede variable ones in the real data too
      const rest = ranked.filter((r) => !forcedIds.includes(r.offer.id)).map((r) => r.offer.price_type);
      const firstVariable = rest.indexOf("variable");
      if (firstVariable >= 0) expect(rest.slice(firstVariable).includes("fixed")).toBe(false);
    }
  });
});

describe("formatVariablePrice", () => {
  it("formats the spread over PUN", () => {
    expect(formatVariablePrice(0.01)).toBe("PUN + 0,01\u00a0€/kWh");
    expect(formatVariablePrice(0.02)).toBe("PUN + 0,02\u00a0€/kWh");
  });
  it("keeps up to 4 decimals when needed, never pads beyond 2", () => {
    expect(formatVariablePrice(0.0125)).toBe("PUN + 0,0125\u00a0€/kWh");
    expect(formatVariablePrice(0.1)).toBe("PUN + 0,10\u00a0€/kWh");
    expect(formatVariablePrice(0)).toBe("PUN + 0,00\u00a0€/kWh");
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

describe("rankOffers, IBAN tie rule (SPEC decision #26)", () => {
  const ids = (list: { offer: { id: string } }[]) => list.map((r) => r.offer.id);
  const iban = offer({ id: "a-iban", name: "A", energy_price: 0.1, iban_required: true });
  const free = offer({ id: "z-free", name: "Z", energy_price: 0.1, iban_required: false });

  it("equal cost: IBAN-free first, in both input orders", () => {
    expect(ids(rankOffers([iban, free], "casa", 1200))).toEqual(["z-free", "a-iban"]);
    expect(ids(rankOffers([free, iban], "casa", 1200))).toEqual(["z-free", "a-iban"]);
  });
  it("different cost: IBAN does not matter", () => {
    const cheapIban = offer({ id: "ci", name: "Z", energy_price: 0.09, iban_required: true });
    expect(ids(rankOffers([free, cheapIban], "casa", 1200))).toEqual(["ci", "z-free"]);
  });
  it("same IBAN flag: still name then id", () => {
    const free2 = offer({ id: "b-free", name: "A", energy_price: 0.1 });
    expect(ids(rankOffers([free, free2], "casa", 1200))).toEqual(["b-free", "z-free"]);
  });
  it("forced-featured group is unaffected", () => {
    const f1 = offer({ id: "f-free", name: "Z", energy_price: 0.1, featured_audience: "casa" });
    const f2 = offer({ id: "f-iban", name: "A", energy_price: 0.1, featured_audience: "casa", iban_required: true });
    expect(ids(rankOffers([f1, f2], "casa", 1200))).toEqual(["f-iban", "f-free"]);
  });
  it("badge goes to the IBAN-free offer", () => {
    const ranked = rankOffers([iban, free], "casa", 1200);
    expect([...featuredBadgeIds(ranked, "casa")]).toEqual(["z-free"]);
  });
  it("mock data, gas casa: Sentra 0.34 before Iren Gas Revolution 0.34, with the badge", () => {
    const gas = MOCK_OFFERS.filter((o) => o.commodity === "gas" && o.customer_type === "casa" && o.active);
    const ranked = rankOffers(gas, "casa", 1200);
    const sentra = ranked.findIndex((r) => r.offer.name === "Offerta Sentra Energia");
    const iren = ranked.findIndex((r) => r.offer.name === "Gas Revolution Prezzo Fisso" && r.offer.energy_price === 0.34);
    expect(sentra).toBeGreaterThanOrEqual(0);
    expect(sentra).toBeLessThan(iren);
    expect(featuredBadgeIds(ranked, "casa").has(ranked[sentra].offer.id)).toBe(true);
  });
});
