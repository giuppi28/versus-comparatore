import { describe, expect, it } from "vitest";
import {
  DEFAULT_OFFER_VALUES,
  offerToFormValues,
  parseDecimal,
  parseOfferForm,
  toInputDecimal,
  yearlyToMonthly,
  type OfferFormValues,
} from "./offer-form-schema";
import { isVisibleToCustomers } from "./visibility";
import { MOCK_OFFERS } from "@/lib/data/mock/data";

const valid = (patch: Partial<OfferFormValues> = {}): OfferFormValues => ({
  ...DEFAULT_OFFER_VALUES,
  supplier_id: "iren",
  name: "Iren Luce Test",
  energy_price: "0,1290",
  fixed_fee: "9",
  locked_months: "12",
  advantages: ["  Prezzo **bloccato**  ", "", "Tariffa monoraria"],
  ...patch,
});

describe("parseDecimal", () => {
  it.each([
    ["0,129", 0.129, 3],
    ["0.129", 0.129, 3],
    ["1.234,56", 1234.56, 2],
    [" 12 ", 12, 0],
    ["0,123456", 0.123456, 6],
  ])("parses %s", (raw, value, decimals) => {
    expect(parseDecimal(raw)).toEqual({ value, decimals });
  });
  it.each(["", "abc", "-1", "1,2,3", "1e3", "0,1x"])("rejects %j", (raw) => {
    expect(parseDecimal(raw)).toBeNull();
  });
});

describe("yearly/monthly conversion", () => {
  it("divides by 12 and rounds to 4 decimals", () => {
    expect(yearlyToMonthly(99)).toBe(8.25);
    expect(yearlyToMonthly(100)).toBe(8.3333);
  });
  it("formats numbers with an Italian comma, trimming zeros down to the minimum", () => {
    expect(toInputDecimal(8.25)).toBe("8,25");
    expect(toInputDecimal(9)).toBe("9,00");
    expect(toInputDecimal(0.129, 4)).toBe("0,1290");
    expect(toInputDecimal(8.3333)).toBe("8,3333");
    expect(toInputDecimal(0, 2, 2)).toBe("0,00");
  });
});

describe("parseOfferForm", () => {
  it("builds the repository input and stores yearly fees monthly", () => {
    const r = parseOfferForm(
      valid({ fixed_fee: "99", fixed_fee_period: "year", other_fixed_costs: "24", other_fixed_costs_period: "year" }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toMatchObject({
      supplier_id: "iren",
      price_type: "fixed",
      energy_price: 0.129,
      fixed_fee_monthly: 8.25,
      other_fixed_costs_monthly: 2,
      locked_months: 12,
      activation_cost: 0,
      promo_text: null,
      details: null,
      active: true,
      featured: false,
      price_verified: false,
    });
    expect(r.data.advantages).toEqual(["Prezzo **bloccato**", "Tariffa monoraria"]);
  });

  it("keeps monthly fees as entered", () => {
    const r = parseOfferForm(valid({ fixed_fee: "9,5" }));
    expect(r.ok && r.data.fixed_fee_monthly).toBe(9.5);
  });

  it("reports an error per invalid field", () => {
    const r = parseOfferForm(
      valid({
        supplier_id: "",
        name: "  ",
        energy_price: "abc",
        other_variable_costs: "0,1234567",
        fixed_fee: "",
        locked_months: "0",
        activation_cost: "1,234",
        other_fixed_costs: "100000",
        advantages: Array.from({ length: 31 }, (_, i) => `v${i}`),
      }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).sort()).toEqual(
      [
        "activation_cost",
        "advantages",
        "energy_price",
        "fixed_fee",
        "locked_months",
        "name",
        "other_fixed_costs",
        "other_variable_costs",
        "supplier_id",
      ].sort(),
    );
  });

  it("rejects out-of-range months and non-integers", () => {
    expect(parseOfferForm(valid({ locked_months: "121" })).ok).toBe(false);
    expect(parseOfferForm(valid({ locked_months: "12,5" })).ok).toBe(false);
    expect(parseOfferForm(valid({ locked_months: "120" })).ok).toBe(true);
  });

  it("rejects an invalid commodity / customer type", () => {
    expect(parseOfferForm(valid({ commodity: "acqua" as never })).ok).toBe(false);
    expect(parseOfferForm(valid({ customer_type: "x" as never })).ok).toBe(false);
  });

  it("round-trips an existing offer through the form values", () => {
    const offer = MOCK_OFFERS[0];
    const r = parseOfferForm(offerToFormValues(offer));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const rest: Record<string, unknown> = { ...offer };
    delete rest.id;
    delete rest.updated_at;
    expect(r.data).toEqual(rest);
  });
});

describe("isVisibleToCustomers", () => {
  it("requires both the offer and its supplier to be active", () => {
    expect(isVisibleToCustomers({ active: true, supplier: { active: true } })).toBe(true);
    expect(isVisibleToCustomers({ active: false, supplier: { active: true } })).toBe(false);
    expect(isVisibleToCustomers({ active: true, supplier: { active: false } })).toBe(false);
  });
});
