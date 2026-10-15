import { describe, expect, it } from "vitest";
import { checkCompletion } from "./completion";
import {
  completeBodySchema,
  completeDataSchema,
  createBodySchema,
  patchBodySchema,
  zodFieldErrors,
} from "./schemas";
import { completeData, page1Data, VALID_CF, VALID_PDR, VALID_POD } from "./test-fixtures";

function errors(schema: { safeParse: (v: unknown) => { success: boolean; error?: unknown } }, value: unknown) {
  const r = schema.safeParse(value);
  if (r.success) return {};
  return zodFieldErrors(r.error as Parameters<typeof zodFieldErrors>[0], value);
}

describe("createBodySchema", () => {
  it("accepts Page 1 data and normalises the phone", () => {
    const r = createBodySchema.safeParse({ data: page1Data({ phone: "+39 333-123.4567" }), turnstileToken: "t" });
    expect(r.success).toBe(true);
    expect(r.data?.data.phone).toBe("3331234567");
  });

  it("accepts consent only (all Page 1 fields optional)", () => {
    expect(createBodySchema.safeParse({ data: { privacy_consent: true }, turnstileToken: "t" }).success).toBe(true);
  });

  it("does not accept activation fields at creation", () => {
    expect(errors(createBodySchema, { data: page1Data({}), turnstileToken: "t", extra: 1 })).toEqual({
      extra: "unknown_field",
    });
    expect(errors(createBodySchema, { data: { ...page1Data(), tax_code: VALID_CF }, turnstileToken: "t" })).toEqual({
      tax_code: "unknown_field",
    });
  });

  it.each([
    [{ commodity: "acqua" }, "commodity"],
    [{ customer_type: "azienda" }, "customer_type"],
    [{ comune_istat: "15146" }, "comune_istat"],
    [{ people: 6 }, "people"],
    [{ people: 2.5 }, "people"],
    [{ appliances: ["tv"] }, "appliances"],
    [{ appliances: ["forno", "forno"] }, "appliances"],
    [{ gas_uses: ["sauna"] }, "gas_uses"],
    [{ sqm_range: "200" }, "sqm_range"],
    [{ estimated_kwh_year: -1 }, "estimated_kwh_year"],
    [{ final_kwh_month: Number.NaN }, "final_kwh_month"],
    [{ first_name: "   " }, "first_name"],
    [{ first_name: "x".repeat(81) }, "first_name"],
    [{ current_supplier_luce: "enel; drop table" }, "current_supplier_luce"],
    [{ has_gas: "si" }, "has_gas"],
  ])("rejects %j as invalid", (patch, key) => {
    expect(errors(createBodySchema, { data: { ...page1Data(), ...patch }, turnstileToken: "t" })).toEqual({
      [key]: "invalid",
    });
  });

  it("trims names", () => {
    const r = createBodySchema.safeParse({ data: page1Data({ first_name: "  Mario " }), turnstileToken: "t" });
    expect(r.data?.data.first_name).toBe("Mario");
  });
});

describe("patchBodySchema", () => {
  it("accepts activation fields with normalisation", () => {
    const r = patchBodySchema.safeParse({
      data: { tax_code: "rssmra85t10a562s", pod: "it001e12345678", pdr: "1234 5678 9012 34", voltage: 380 },
    });
    expect(r.success).toBe(true);
    expect(r.data?.data).toMatchObject({ tax_code: VALID_CF, pod: VALID_POD, pdr: VALID_PDR, voltage: 380 });
  });

  it("allows nulls to clear fields", () => {
    expect(patchBodySchema.safeParse({ data: { current_supplier_luce: null, pod: null } }).success).toBe(true);
  });

  it("rejects bad enums / formats", () => {
    expect(errors(patchBodySchema, { data: { voltage: 230 } })).toEqual({ voltage: "invalid" });
    expect(errors(patchBodySchema, { data: { housing_title: "ospite" } })).toEqual({ housing_title: "invalid" });
    expect(errors(patchBodySchema, { data: { cap: "2012" } })).toEqual({ cap: "invalid" });
    expect(errors(patchBodySchema, { data: { tax_code: "ABC" } })).toEqual({ tax_code: "length" });
    expect(errors(patchBodySchema, { data: { vat_number: "1234567890A" } })).toEqual({ vat_number: "format" });
    expect(errors(patchBodySchema, { data: { pdr: "" } })).toEqual({ pdr: "empty" });
    expect(errors(patchBodySchema, {})).toEqual({ data: "required" });
    expect(errors(patchBodySchema, { data: [] })).toEqual({ data: "invalid" });
  });
});

describe("completeBodySchema + checkCompletion", () => {
  it("valid luce/casa/cambio payload passes", () => {
    const r = completeBodySchema.safeParse({ data: completeData(), turnstileToken: "t" });
    expect(r.success).toBe(true);
    expect(checkCompletion(r.data!.data).fields).toEqual({});
  });

  it("voltura requires the current supplier", () => {
    const parsed = completeDataSchema.parse(completeData({ service_type: "voltura", current_supplier_luce: null }));
    expect(checkCompletion(parsed).fields).toEqual({ current_supplier_luce: "required" });
  });

  it("CF checked against the names", () => {
    const parsed = completeDataSchema.parse(completeData({ last_name: "Verdi" }));
    expect(checkCompletion(parsed).fields).toEqual({ tax_code: "surname_mismatch" });
  });

  it("gas uses required for gas", () => {
    const parsed = completeDataSchema.parse(
      completeData({ commodity: "dual", chosen_offer_gas: "g", has_gas: true, pdr: VALID_PDR, current_supplier_gas: "iren", gas_uses: [] }),
    );
    expect(checkCompletion(parsed).fields).toEqual({ gas_uses: "required" });
  });
});
