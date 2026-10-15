import { describe, expect, it } from "vitest";
import { LeadApiError } from "@/lib/lead/client";
import { applyFlowPatch, INITIAL_FLOW_STATE, type FlowPatch, type FlowState } from "@/lib/lead/flow-state";
import {
  computeEstimates,
  firstErrorKey,
  formatCount,
  isGasServiceForced,
  isLeadMissingError,
  isServiceTypeLocked,
  mapApiError,
  parseWholeNumber,
  reduceChange,
  showCurrentSupplierBlock,
  showGasSupplier,
  showLuceSupplier,
  usesManualEntry,
  validatePage1,
  type SupplierOption,
} from "./logic";

const SUPPLIERS: SupplierOption[] = [
  { id: "enel", name: "Enel Energia", sellsLuce: true, sellsGas: true },
  { id: "gasonly", name: "Solo Gas", sellsLuce: false, sellsGas: true },
];

const MILANO = { istat: "015146", name: "Milano", province: "MI", caps: ["20121"], climate_zone: "E" as const };

/** Applies edits one by one through reduceChange, like the form does. */
function edit(state: FlowState, ...patches: FlowPatch[]): FlowState {
  return patches.reduce<FlowState>((s, p) => applyFlowPatch(s, reduceChange(s, p)), state);
}

function validCasaLuce(): FlowState {
  return edit(INITIAL_FLOW_STATE, {
    commodity: "luce",
    customerType: "casa",
    firstName: "Mario",
    lastName: "Rossi",
    phone: "333 123 4567",
    comune: MILANO,
    privacyConsent: true,
    serviceType: "subentro",
    people: 3,
  });
}

describe("formatCount", () => {
  it("uses the it-IT thousands separator also for 4-digit numbers", () => {
    expect(formatCount(2100)).toBe("2.100");
    expect(formatCount(200)).toBe("200");
    expect(formatCount(1365)).toBe("1.365");
  });
});

describe("parseWholeNumber", () => {
  it("keeps digits only", () => {
    expect(parseWholeNumber("1.200")).toBe(1200);
    expect(parseWholeNumber(" 2 700 ")).toBe(2700);
    expect(parseWholeNumber("abc")).toBeNull();
    expect(parseWholeNumber("")).toBeNull();
  });
});

describe("computeEstimates", () => {
  it("luce: 3 people + frigorifero + lavatrice = 1600 + 300 + 200", () => {
    const s = edit(INITIAL_FLOW_STATE, {
      commodity: "luce",
      customerType: "casa",
      people: 3,
      appliances: ["frigorifero", "lavatrice"],
    });
    expect(s.estimatedKwhYear).toBe(2100);
    expect(s.estimatedSmcYear).toBeNull();
  });

  it("scaldabagno counts per person", () => {
    const s = edit(INITIAL_FLOW_STATE, {
      commodity: "luce",
      customerType: "casa",
      people: 4,
      appliances: ["scaldabagno"],
    });
    expect(s.estimatedKwhYear).toBe(1900 + 600 * 4);
  });

  it("gas: 2 people cucina + acqua calda = 60 + 140", () => {
    const s = edit(INITIAL_FLOW_STATE, {
      commodity: "gas",
      customerType: "casa",
      people: 2,
      gasUses: ["cucina", "acqua_calda"],
    });
    expect(s.estimatedSmcYear).toBe(200);
  });

  it("riscaldamento is incomplete without m², then 105 m² in zone E = 105 x 13", () => {
    let s = edit(INITIAL_FLOW_STATE, {
      commodity: "gas",
      customerType: "casa",
      people: 2,
      comune: MILANO,
      gasUses: ["riscaldamento"],
    });
    expect(s.estimatedSmcYear).toBeNull();
    s = edit(s, { sqmRange: "90_120" });
    expect(s.estimatedSmcYear).toBe(105 * 13);
  });

  it("the climate zone follows the comune; unknown zone falls back to the province capital's zone", () => {
    const base = edit(INITIAL_FLOW_STATE, {
      commodity: "gas",
      customerType: "casa",
      people: 1,
      gasUses: ["riscaldamento"],
      sqmRange: "lt60",
    });
    expect(edit(base, { comune: { ...MILANO, climate_zone: "A" } }).estimatedSmcYear).toBe(50 * 2);
    expect(edit(base, { comune: { ...MILANO, climate_zone: null } }).estimatedSmcYear).toBe(50 * 13);
    // Null-zone comune in a non-E province (BL capital = zone F).
    const borgo = { istat: "025074", name: "Borgo Valbelluna", province: "BL", caps: ["32030"], climate_zone: null };
    expect(edit(base, { comune: borgo }).estimatedSmcYear).toBe(50 * 16);
  });

  it("dual computes both; Partita IVA has no estimate", () => {
    const dual = edit(INITIAL_FLOW_STATE, {
      commodity: "dual",
      customerType: "casa",
      people: 2,
      gasUses: ["cucina"],
    });
    expect(dual.estimatedKwhYear).toBe(1300);
    expect(dual.estimatedSmcYear).toBe(60);
    expect(computeEstimates({ ...dual, customerType: "business" })).toEqual({
      estimatedKwhYear: null,
      estimatedSmcYear: null,
    });
  });
});

describe("reduceChange", () => {
  it("Partita IVA switches to manual entry and forgets the gas question", () => {
    const casa = edit(INITIAL_FLOW_STATE, { commodity: "gas", customerType: "casa", hasGas: true });
    const biz = edit(casa, { customerType: "business" });
    expect(biz.manualConsumption).toBe(true);
    expect(biz.hasGas).toBeNull();
    expect(usesManualEntry(biz)).toBe(true);
    expect(edit(biz, { customerType: "casa" }).manualConsumption).toBe(false);
  });

  it("gas-only + no gas at home forces Primo allaccio and hides the gas supplier", () => {
    const s = edit(INITIAL_FLOW_STATE, {
      commodity: "gas",
      customerType: "casa",
      serviceType: "cambio_fornitore",
      currentSupplierGas: "enel",
    });
    expect(showGasSupplier(s)).toBe(true);
    const forced = edit(s, { hasGas: false });
    expect(isServiceTypeLocked(forced)).toBe(true);
    expect(forced.serviceType).toBe("primo_allaccio");
    expect(forced.currentSupplierGas).toBeNull();
    expect(showGasSupplier(forced)).toBe(false);
    // Back to "Sì": the forced value is released so the customer picks again.
    const released = edit(forced, { hasGas: true });
    expect(released.serviceType).toBeNull();
  });

  it("dual + no gas keeps the luce service type and only hides the gas supplier", () => {
    const s = edit(INITIAL_FLOW_STATE, {
      commodity: "dual",
      customerType: "casa",
      serviceType: "voltura",
      hasGas: false,
    });
    expect(isGasServiceForced(s)).toBe(true);
    expect(isServiceTypeLocked(s)).toBe(false);
    expect(s.serviceType).toBe("voltura");
    expect(showLuceSupplier(s)).toBe(true);
    expect(showGasSupplier(s)).toBe(false);
  });

  it("supplier block: only Cambio fornitore and Voltura; dual shows both", () => {
    const base = { commodity: "dual" as const, customerType: "casa" as const };
    for (const service of ["subentro", "primo_allaccio"] as const) {
      expect(showCurrentSupplierBlock(edit(INITIAL_FLOW_STATE, base, { serviceType: service }))).toBe(false);
    }
    for (const service of ["cambio_fornitore", "voltura"] as const) {
      const s = edit(INITIAL_FLOW_STATE, base, { serviceType: service });
      expect(showLuceSupplier(s) && showGasSupplier(s)).toBe(true);
    }
    const luceOnly = edit(INITIAL_FLOW_STATE, { commodity: "luce", serviceType: "cambio_fornitore" });
    expect(showLuceSupplier(luceOnly)).toBe(true);
    expect(showGasSupplier(luceOnly)).toBe(false);
  });

  it("dropping Riscaldamento clears the m² range", () => {
    const s = edit(INITIAL_FLOW_STATE, {
      commodity: "gas",
      customerType: "casa",
      gasUses: ["riscaldamento"],
      sqmRange: "60_90",
    });
    expect(edit(s, { gasUses: ["cucina"] }).sqmRange).toBeNull();
  });

  it("an edit that changes the results invalidates chosen offers; a name edit does not", () => {
    const chosen = {
      luce: { offer_id: "x" } as unknown as FlowState["chosenOffers"]["luce"],
      gas: null,
    };
    const s = { ...validCasaLuce(), chosenOffers: chosen, finalKwhMonth: 200 };
    const renamed = applyFlowPatch(s, reduceChange(s, { firstName: "Luigi" }));
    expect(renamed.chosenOffers.luce).not.toBeNull();
    expect(renamed.finalKwhMonth).toBe(200);
    const resized = applyFlowPatch(s, reduceChange(s, { people: 4 }));
    expect(resized.chosenOffers).toEqual({ luce: null, gas: null });
    expect(resized.finalKwhMonth).toBeNull();
    // Re-selecting the same value is not a change.
    const same = applyFlowPatch(s, reduceChange(s, { people: 3 }));
    expect(same.chosenOffers.luce).not.toBeNull();
  });
});

describe("validatePage1", () => {
  it("an empty form reports the basics, in page order", () => {
    const errors = validatePage1(INITIAL_FLOW_STATE, SUPPLIERS);
    expect(Object.keys(errors)).toEqual(
      expect.arrayContaining(["commodity", "customerType", "firstName", "lastName", "phone", "comune", "privacy", "serviceType"]),
    );
    expect(firstErrorKey(errors)).toBe("commodity");
    expect(errors.commodity).toBe("Scegli cosa vuoi confrontare.");
  });

  it("a complete Casa/Luce form is valid", () => {
    expect(validatePage1(validCasaLuce(), SUPPLIERS)).toEqual({});
  });

  it("appliances are optional", () => {
    expect(validatePage1(edit(validCasaLuce(), { appliances: [] }), SUPPLIERS)).toEqual({});
  });

  it("phone uses the shared validator messages", () => {
    const bad = edit(validCasaLuce(), { phone: "12345" });
    expect(validatePage1(bad, SUPPLIERS).phone).toMatch(/cellulare italiano valido/);
    expect(validatePage1(edit(validCasaLuce(), { phone: "" }), SUPPLIERS).phone).toMatch(/Inserisci il numero/);
    expect(validatePage1(edit(validCasaLuce(), { phone: "+39 333 123 4567" }), SUPPLIERS).phone).toBeUndefined();
  });

  it("Partita IVA requires the company name and direct consumption", () => {
    const biz = edit(validCasaLuce(), { customerType: "business" });
    const errors = validatePage1(biz, SUPPLIERS);
    expect(errors.companyName).toBeDefined();
    expect(errors.manualKwh).toBeDefined();
    expect(errors.people).toBeUndefined();
    const ok = edit(biz, { companyName: "ACME srl", manualKwhYear: 5000 });
    expect(validatePage1(ok, SUPPLIERS)).toEqual({});
  });

  it("manual values must be positive", () => {
    const s = edit(validCasaLuce(), { manualConsumption: true, manualKwhYear: 0 });
    expect(validatePage1(s, SUPPLIERS).manualKwh).toBe("Inserisci un valore maggiore di zero.");
    const missing = edit(validCasaLuce(), { manualConsumption: true, manualKwhYear: null });
    expect(validatePage1(missing, SUPPLIERS).manualKwh).toMatch(/kWh/);
    // Manual entry replaces people.
    expect(validatePage1(edit(s, { people: null, manualKwhYear: 2500 }), SUPPLIERS)).toEqual({});
  });

  it("current supplier is required only where it is shown, and must be listed for the commodity", () => {
    const s = edit(validCasaLuce(), { serviceType: "cambio_fornitore" });
    expect(validatePage1(s, SUPPLIERS).supplierLuce).toBeDefined();
    expect(validatePage1(edit(s, { currentSupplierLuce: "enel" }), SUPPLIERS).supplierLuce).toBeUndefined();
    expect(validatePage1(edit(s, { currentSupplierLuce: "gasonly" }), SUPPLIERS).supplierLuce).toBeDefined();
    expect(validatePage1(edit(s, { currentSupplierLuce: "unknown" }), SUPPLIERS).supplierLuce).toBeDefined();
    expect(validatePage1(edit(s, { serviceType: "subentro" }), SUPPLIERS).supplierLuce).toBeUndefined();
  });

  it("gas: hasGas, at least one use, and m² when Riscaldamento", () => {
    let s = edit(validCasaLuce(), { commodity: "gas", serviceType: "subentro" });
    let errors = validatePage1(s, SUPPLIERS);
    expect(errors.hasGas).toBeDefined();
    expect(errors.gasUses).toBeDefined();
    s = edit(s, { hasGas: true, gasUses: ["riscaldamento"] });
    errors = validatePage1(s, SUPPLIERS);
    expect(errors.hasGas).toBeUndefined();
    expect(errors.gasUses).toBeUndefined();
    expect(errors.sqmRange).toBeDefined();
    expect(validatePage1(edit(s, { sqmRange: "gt120" }), SUPPLIERS)).toEqual({});
  });

  it("gas-only with no gas at home does not ask for the service type or supplier", () => {
    const s = edit(validCasaLuce(), {
      commodity: "gas",
      serviceType: null,
      hasGas: false,
      gasUses: ["cucina"],
    });
    expect(s.serviceType).toBe("primo_allaccio");
    expect(validatePage1(s, SUPPLIERS)).toEqual({});
  });

  it("dual needs both consumptions when entered manually", () => {
    const s = edit(validCasaLuce(), {
      commodity: "dual",
      hasGas: true,
      gasUses: ["cucina"],
      manualConsumption: true,
      manualKwhYear: 2000,
    });
    const errors = validatePage1(s, SUPPLIERS);
    expect(errors.manualKwh).toBeUndefined();
    expect(errors.manualSmc).toBeDefined();
  });

  it("privacy consent is required", () => {
    const errors = validatePage1(edit(validCasaLuce(), { privacyConsent: false }), SUPPLIERS);
    expect(errors.privacy).toMatch(/privacy/);
  });
});

describe("API error mapping", () => {
  it("429 → Italian rate limit message", () => {
    expect(mapApiError(new LeadApiError(429, "rate_limited", {}, 30)).message).toBe(
      "Troppe richieste, riprova tra poco.",
    );
  });

  it("maps other codes and unknown errors", () => {
    expect(mapApiError(new LeadApiError(403, "turnstile_failed")).message).toMatch(/Verifica di sicurezza/);
    expect(mapApiError(new LeadApiError(0, "network_error")).message).toMatch(/Connessione/);
    expect(mapApiError(new LeadApiError(500, "server_error")).message).toMatch(/momentaneamente/);
    expect(mapApiError(new Error("boom")).message).toMatch(/imprevisto/);
  });

  it("validation errors point at the offending fields", () => {
    const mapped = mapApiError(
      new LeadApiError(422, "validation", { phone: "format", first_name: "required", unknown_thing: "invalid" }),
    );
    expect(mapped.fields.phone).toMatch(/cellulare/);
    expect(mapped.fields.firstName).toBeDefined();
    expect(Object.keys(mapped.fields)).toHaveLength(2);
  });

  it("detects a missing lead", () => {
    expect(isLeadMissingError(new LeadApiError(401, "no_lead"))).toBe(true);
    expect(isLeadMissingError(new LeadApiError(404, "lead_not_found"))).toBe(true);
    expect(isLeadMissingError(new LeadApiError(429, "rate_limited"))).toBe(false);
  });
});
