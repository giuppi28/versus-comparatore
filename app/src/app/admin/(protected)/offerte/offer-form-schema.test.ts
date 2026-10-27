import { describe, expect, it } from "vitest";
import {
  buildSupplierChoices,
  DEFAULT_OFFER_VALUES,
  offerToFormValues,
  parseDecimal,
  parseOfferForm,
  PLACEHOLDER_SUPPLIER_ERROR,
  placeholderAssignmentError,
  toInputDecimal,
  yearlyToMonthly,
  type OfferFormValues,
} from "./offer-form-schema";
import { isVisibleToCustomers } from "./visibility";
import { MOCK_OFFERS, MOCK_SUPPLIERS } from "@/lib/data/mock/data";

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
    const offer = MOCK_OFFERS[1]; // first offer needs IBAN, not yet in the admin form (T14.9)
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

describe("supplier choices and placeholder suppliers", () => {
  const placeholders = MOCK_SUPPLIERS.filter((s) => s.is_placeholder);
  const real = MOCK_SUPPLIERS.filter((s) => !s.is_placeholder);

  it("has the three placeholder suppliers in the mock data", () => {
    expect(placeholders.map((s) => s.slug).sort()).toEqual(["altro-fornitore", "non-lo-so", "tutela"]);
  });

  it("create: lists real suppliers only", () => {
    const choices = buildSupplierChoices(MOCK_SUPPLIERS);
    expect(choices).toHaveLength(real.length);
    expect(choices.some((c) => c.placeholder)).toBe(false);
  });

  it("edit: keeps a current placeholder supplier, flagged, and no other placeholder", () => {
    const current = placeholders[0];
    const choices = buildSupplierChoices(MOCK_SUPPLIERS, current.id);
    expect(choices.filter((c) => c.placeholder).map((c) => c.id)).toEqual([current.id]);
    expect(choices).toHaveLength(real.length + 1);
  });

  it("edit: a current real supplier adds nothing extra", () => {
    expect(buildSupplierChoices(MOCK_SUPPLIERS, real[0].id)).toHaveLength(real.length);
  });

  it("rejects a placeholder for a new assignment (create, or edit changing supplier)", () => {
    const p = placeholders[0];
    expect(placeholderAssignmentError(p, null)).toBe(PLACEHOLDER_SUPPLIER_ERROR);
    expect(placeholderAssignmentError(p, real[0].id)).toBe(PLACEHOLDER_SUPPLIER_ERROR);
    expect(placeholderAssignmentError(p, placeholders[1].id)).toBe(PLACEHOLDER_SUPPLIER_ERROR);
  });

  it("allows keeping the placeholder already assigned, and any real supplier", () => {
    const p = placeholders[0];
    expect(placeholderAssignmentError(p, p.id)).toBeNull();
    expect(placeholderAssignmentError(real[0], null)).toBeNull();
    expect(placeholderAssignmentError(real[0], p.id)).toBeNull();
    expect(placeholderAssignmentError(null, null)).toBeNull();
  });
});
