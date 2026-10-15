import { describe, expect, it } from "vitest";
import { MOCK_SUPPLIERS } from "@/lib/data";
import { INITIAL_FLOW_STATE, applyFlowPatch, type FlowPatch, type FlowState } from "@/lib/lead/flow-state";
import {
  VALID_CF,
  VALID_PDR,
  VALID_PIVA,
  VALID_POD,
} from "@/lib/lead/test-fixtures";
import {
  activationRedirect,
  buildSubmitPayload,
  effectiveCap,
  firstStepWithErrors,
  messageForFieldCode,
  normalizeActivation,
  powerFromSelectValue,
  powerOptions,
  powerToSelectValue,
  serverFieldErrors,
  splitFormErrors,
  stepOfField,
  supplierOptions,
  validateStepA,
  validateStepB,
} from "./logic";

const offer = (commodity: "luce" | "gas") => ({
  offer_id: `offer-${commodity}`,
  commodity,
  offer_name: "Offerta",
  supplier_id: "enel-energia",
  supplier_name: "Enel Energia",
  supplier_logo_path: null,
  energy_price: 0.13,
  other_variable_costs: 0,
  fixed_fee_monthly: 5,
  other_fixed_costs_monthly: 0,
  locked_months: 12,
  activation_cost: 0,
  promo_text: null,
  monthly_cost: 50,
});

/** Builds a state; an `activation` patch is merged over the one given by earlier spreads. */
function flow(patch: FlowPatch = {}): FlowState {
  return applyFlowPatch(INITIAL_FLOW_STATE, {
    commodity: "luce",
    customerType: "casa",
    firstName: "Mario",
    lastName: "Rossi",
    phone: "333 123 4567",
    comune: { istat: "015146", name: "Milano", province: "MI", caps: ["20121", "20122"], climate_zone: "E" },
    serviceType: "cambio_fornitore",
    currentSupplierLuce: "enel-energia",
    gasUses: ["cucina"],
    chosenOffers: { luce: offer("luce"), gas: null },
    ...patch,
  });
}

const filledA: FlowPatch = {
  activation: { taxCode: VALID_CF, housingTitle: "proprietario" },
};
const filledB: FlowPatch = {
  activation: {
    cap: "20121",
    address: "Via Roma",
    streetNumber: "1",
    isResident: true,
    pod: VALID_POD,
    voltage: 220,
  },
};

describe("validateStepA", () => {
  it("accepts a complete Casa step A", () => {
    expect(validateStepA(flow(filledA))).toEqual({});
  });

  it("requires every field with Italian messages", () => {
    const errors = validateStepA(flow({ firstName: "", lastName: "", phone: "" }));
    expect(Object.keys(errors).sort()).toEqual(["first_name", "housing_title", "last_name", "phone", "tax_code"]);
    expect(errors.first_name).toBe("Inserisci il nome.");
    expect(errors.tax_code).toBe("Inserisci il codice fiscale.");
  });

  it("flags a malformed, a bad-checksum and a name-mismatched codice fiscale", () => {
    const withCf = (taxCode: string) => validateStepA(flow({ activation: { taxCode, housingTitle: "altro" } }));
    expect(withCf("ABC").tax_code).toMatch(/16 caratteri/);
    expect(withCf("RSSMRA85T10A562X").tax_code).toMatch(/non è valido/);
    // Valid CF of Giulia Bianchi used with Mario Rossi.
    expect(withCf("BNCGLI90A41F205H").tax_code).toBe("Il codice fiscale non corrisponde al cognome inserito.");
    // Right surname, wrong name.
    expect(
      validateStepA(flow({ firstName: "Luca", activation: { taxCode: VALID_CF, housingTitle: "altro" } })).tax_code,
    ).toBe("Il codice fiscale non corrisponde al nome inserito.");
  });

  it("re-checks the codice fiscale when the name changes", () => {
    expect(validateStepA(flow({ ...filledA, lastName: "Bianchi" })).tax_code).toMatch(/cognome/);
  });

  it("business: requires ragione sociale and a valid partita IVA", () => {
    const base = flow({ ...filledA, customerType: "business", companyName: "" });
    expect(validateStepA(base)).toMatchObject({
      company_name: "Inserisci la ragione sociale.",
      vat_number: "Inserisci la partita IVA.",
    });
    const bad = applyFlowPatch(base, { companyName: "Acme Srl", activation: { vatNumber: "12345678900" } });
    expect(validateStepA(bad).vat_number).toMatch(/non è valida/);
    const ok = applyFlowPatch(base, { companyName: "Acme Srl", activation: { vatNumber: VALID_PIVA } });
    expect(validateStepA(ok)).toEqual({});
  });

  it("casa: never asks for P.IVA", () => {
    expect(validateStepA(flow(filledA))).not.toHaveProperty("vat_number");
  });
});

describe("validateStepB", () => {
  it("accepts a complete Luce / Cambio fornitore step B", () => {
    expect(validateStepB(flow(filledB))).toEqual({});
  });

  it("requires cap choice, address, civico, residency, POD, voltage", () => {
    const errors = validateStepB(flow());
    expect(Object.keys(errors).sort()).toEqual(["address", "cap", "is_resident", "pod", "street_number", "voltage"]);
    expect(errors.cap).toBe("Seleziona il CAP.");
  });

  it("validates POD: prefix, length, 15 chars accepted", () => {
    const withPod = (pod: string) => validateStepB(flow({ ...filledB, activation: { pod } })).pod;
    expect(withPod("XX001E12345678")).toBe("Il POD deve iniziare con IT.");
    expect(withPod("IT001E123")).toBe("Il POD deve essere di 14 caratteri.");
    expect(withPod("IT001E123456789")).toBeUndefined();
  });

  it("requires the current supplier only for Cambio fornitore / Voltura", () => {
    const missing = (serviceType: FlowState["serviceType"]) =>
      validateStepB(flow({ ...filledB, serviceType, currentSupplierLuce: null })).current_supplier_luce;
    expect(missing("cambio_fornitore")).toBeDefined();
    expect(missing("voltura")).toBeDefined();
    expect(missing("subentro")).toBeUndefined();
    expect(missing("primo_allaccio")).toBeUndefined();
  });

  it("Primo allaccio: POD is optional but must be valid when typed", () => {
    const base = flow({ ...filledB, serviceType: "primo_allaccio", activation: { ...filledB.activation, pod: "" } });
    expect(validateStepB(base)).toEqual({});
    expect(validateStepB(applyFlowPatch(base, { activation: { pod: "ZZ" } })).pod).toBeDefined();
  });

  it("gas: PDR 14 digits, at least one use, supplier per service type", () => {
    const gas = flow({
      ...filledB,
      commodity: "gas",
      currentSupplierGas: "iren",
      chosenOffers: { luce: null, gas: offer("gas") },
      activation: { ...filledB.activation, pdr: VALID_PDR, gasUses: null },
    });
    expect(validateStepB(gas)).toEqual({});
    expect(validateStepB(applyFlowPatch(gas, { activation: { pdr: "123" } })).pdr).toBe(
      "Il PDR deve essere di 14 cifre.",
    );
    expect(validateStepB(applyFlowPatch(gas, { activation: { pdr: "1234567890123A" } })).pdr).toMatch(/cifre/);
    expect(validateStepB(applyFlowPatch(gas, { activation: { gasUses: [] } })).gas_uses).toBe(
      "Seleziona almeno un uso del gas.",
    );
    expect(validateStepB(applyFlowPatch(gas, { currentSupplierGas: null })).current_supplier_gas).toBeDefined();
  });

  it("hasGas = false forces gas to Primo allaccio (no supplier, PDR optional)", () => {
    const gas = flow({
      ...filledB,
      commodity: "gas",
      hasGas: false,
      currentSupplierGas: null,
      chosenOffers: { luce: null, gas: offer("gas") },
      activation: { ...filledB.activation, pod: "", pdr: "" },
    });
    expect(validateStepB(gas)).toEqual({});
  });

  it("dual: validates luce and gas sections together", () => {
    const dual = flow({ ...filledB, commodity: "dual", chosenOffers: { luce: offer("luce"), gas: offer("gas") } });
    expect(Object.keys(validateStepB(dual)).sort()).toEqual(["current_supplier_gas", "pdr"]);
  });

  it("uses the comune's only CAP, or a typed one when the comune has none", () => {
    const one = flow({ ...filledB, comune: { istat: "1", name: "X", province: "AA", caps: ["10100"], climate_zone: null }, activation: { cap: "" } });
    expect(effectiveCap(one)).toBe("10100");
    expect(validateStepB(one).cap).toBeUndefined();
    const none = flow({ ...filledB, comune: { istat: "1", name: "X", province: "AA", caps: [], climate_zone: null }, activation: { cap: "12" } });
    expect(validateStepB(none).cap).toBe("Inserisci un CAP di 5 cifre.");
    // Stale CAP not in the list of a multi-CAP comune is ignored.
    expect(effectiveCap(flow({ activation: { cap: "99999" } }))).toBe("");
  });
});

describe("server error mapping", () => {
  it("maps validator codes to the shared Italian messages", () => {
    const errors = serverFieldErrors({
      tax_code: "surname_mismatch",
      pod: "prefix",
      pdr: "length",
      vat_number: "checksum",
      phone: "format",
      address: "required",
      cap: "invalid",
    });
    expect(errors.tax_code).toBe("Il codice fiscale non corrisponde al cognome inserito.");
    expect(errors.pod).toBe("Il POD deve iniziare con IT.");
    expect(errors.pdr).toBe("Il PDR deve essere di 14 cifre.");
    expect(errors.vat_number).toMatch(/non è valida/);
    expect(errors.phone).toMatch(/cellulare/);
    expect(errors.address).toBe("Inserisci l'indirizzo.");
    expect(errors.cap).toBe("Inserisci un CAP di 5 cifre.");
  });

  it("falls back to generic messages", () => {
    expect(messageForFieldCode("street_number", "invalid")).toBe("Valore non valido.");
    expect(messageForFieldCode("housing_title", "weird")).toBe("Valore non valido.");
  });

  it("routes fields without an input to general errors", () => {
    const { fields, general } = splitFormErrors(
      serverFieldErrors({ chosen_offer_luce: "not_available", service_type: "required", pod: "prefix" }),
    );
    expect(Object.keys(fields)).toEqual(["pod"]);
    expect(general).toHaveLength(2);
    expect(general[0]).toMatch(/non è più disponibile/);
  });

  it("finds the step to show first", () => {
    expect(stepOfField("tax_code")).toBe("A");
    expect(stepOfField("pod")).toBe("B");
    expect(firstStepWithErrors({ pod: "x", phone: "y" })).toBe("A");
    expect(firstStepWithErrors({ pod: "x" })).toBe("B");
    expect(firstStepWithErrors({})).toBeNull();
  });
});

describe("submit payload", () => {
  const ready = flow({
    ...filledA,
    ...filledB,
    activation: { ...filledA.activation, ...filledB.activation, taxCode: "rssmra85t10a562s", pod: "it001e123456789" },
  });

  it("normalises CF (upper-case), POD (cut to 14) and the comune's only CAP", () => {
    const a = normalizeActivation(
      applyFlowPatch(ready, {
        comune: { istat: "1", name: "X", province: "AA", caps: ["10100"], climate_zone: null },
        activation: { cap: "" },
      }),
    );
    expect(a.taxCode).toBe(VALID_CF);
    expect(a.pod).toBe("IT001E12345678");
    expect(a.cap).toBe("10100");
  });

  it("builds the luce payload with power 3 and no gas fields", () => {
    const p = buildSubmitPayload(ready);
    expect(p).toMatchObject({
      first_name: "Mario",
      tax_code: VALID_CF,
      housing_title: "proprietario",
      cap: "20121",
      pod: "IT001E12345678",
      power_kw: 3,
      voltage: 220,
      chosen_offer_luce: "offer-luce",
      is_resident: true,
    });
    expect(p).not.toHaveProperty("pdr");
    expect(p).not.toHaveProperty("vat_number");
  });

  it("sends power_kw null for 'Altro' and the edited gas uses", () => {
    const p = buildSubmitPayload(
      applyFlowPatch(ready, {
        commodity: "dual",
        chosenOffers: { luce: offer("luce"), gas: offer("gas") },
        activation: { powerKw: null, gasUses: ["riscaldamento", "cucina"], pdr: VALID_PDR },
      }),
    );
    expect(p.power_kw).toBeNull();
    expect(p.gas_uses).toEqual(["riscaldamento", "cucina"]);
    expect(p.pdr).toBe(VALID_PDR);
    expect(p.chosen_offer_gas).toBe("offer-gas");
  });
});

describe("helpers", () => {
  it("power select values round-trip, 'Altro' = null", () => {
    expect(powerOptions().map((o) => o.label)).toEqual([
      "1,5 kW", "3 kW", "3,5 kW", "4 kW", "4,5 kW", "5 kW", "6 kW", "10 kW", "15 kW", "Altro",
    ]);
    expect(powerToSelectValue(3)).toBe("3");
    expect(powerToSelectValue(null)).toBe("altro");
    expect(powerFromSelectValue("altro")).toBeNull();
    expect(powerFromSelectValue("4.5")).toBe(4.5);
    expect(powerFromSelectValue("bogus")).toBe(3);
  });

  it("supplier options follow the commodity and keep the current value", () => {
    const suppliers = MOCK_SUPPLIERS.map((s, i) => (i === 0 ? { ...s, sells_gas: false } : s));
    expect(supplierOptions(suppliers, "gas", null).some((o) => o.value === suppliers[0].id)).toBe(false);
    expect(supplierOptions(suppliers, "gas", suppliers[0].id).some((o) => o.value === suppliers[0].id)).toBe(true);
    expect(supplierOptions(suppliers, "luce", null).length).toBeGreaterThan(5);
  });

  it("redirects when the flow cannot reach activation", () => {
    expect(activationRedirect(INITIAL_FLOW_STATE)).toBe("/");
    expect(activationRedirect(flow({ chosenOffers: { luce: null, gas: null } }))).toBe("/offerte");
    expect(activationRedirect(flow({ commodity: "dual" }))).toBe("/offerte");
    expect(activationRedirect(flow())).toBeNull();
    expect(activationRedirect(flow({ leadCompleted: true }))).toBe("/grazie");
  });
});
