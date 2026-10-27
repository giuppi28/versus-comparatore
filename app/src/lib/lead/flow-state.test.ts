import { beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_OFFERS, MOCK_SUPPLIERS, type OfferWithSupplier } from "@/lib/data";
import {
  annualKwh,
  annualSmc,
  applyFlowPatch,
  createFlowStore,
  FLOW_STORAGE_KEY,
  getSessionStorage,
  INITIAL_FLOW_STATE,
  loadFlowState,
  meterCodeRequired,
  serviceTypeFor,
  snapshotOffer,
  toLeadCompleteData,
  toLeadCreateData,
  toLeadPatchData,
  totalMonthlyCost,
  type FlowState,
} from "./flow-state";
import { completeBodySchema, createBodySchema, patchBodySchema } from "./schemas";
import { checkCompletion } from "./completion";
import { VALID_CF, VALID_PDR, VALID_PIVA, VALID_POD } from "./test-fixtures";

function offerWithSupplier(id: string): OfferWithSupplier {
  const o = MOCK_OFFERS.find((x) => x.id === id)!;
  return { ...o, supplier: MOCK_SUPPLIERS.find((s) => s.id === o.supplier_id)! };
}

const LUCE = offerWithSupplier("offer-aldo-10");
const GAS = offerWithSupplier("offer-aldo-26");

function filledState(overrides: Partial<FlowState> = {}): FlowState {
  return applyFlowPatch(INITIAL_FLOW_STATE, {
    commodity: "dual",
    customerType: "casa",
    firstName: " Mario ",
    lastName: "Rossi",
    phone: "333 123 4567",
    comune: { istat: "015146", name: "Milano", province: "MI", caps: ["20121"], climate_zone: "E" },
    privacyConsent: true,
    serviceType: "cambio_fornitore",
    currentSupplierLuce: "enel-energia",
    currentSupplierGas: "iren",
    hasGas: true,
    people: 2,
    appliances: ["frigorifero", "lavatrice"],
    gasUses: ["cucina", "riscaldamento"],
    sqmRange: "60_90",
    estimatedKwhYear: 1800,
    estimatedSmcYear: 1035,
    finalKwhMonth: 150,
    finalSmcMonth: 86.25,
    chosenOffers: { luce: snapshotOffer(LUCE, 1800), gas: snapshotOffer(GAS, 1035) },
    activation: {
      taxCode: VALID_CF.toLowerCase(),
      housingTitle: "inquilino",
      cap: "20121",
      address: "Via Roma",
      streetNumber: "1",
      isResident: true,
      pod: VALID_POD,
      voltage: 220,
      pdr: VALID_PDR,
    },
    ...overrides,
  });
}

class MemoryStorage implements Storage {
  private m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  clear() {
    this.m.clear();
  }
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
}

beforeEach(() => window.sessionStorage.clear());

describe("store + persistence", () => {
  it("persists every update and reloads it (refresh mid-flow)", () => {
    const storage = new MemoryStorage();
    const store = createFlowStore(storage);
    store.update({ commodity: "gas", firstName: "Anna" });
    store.update((s) => ({ activation: { taxCode: "X" }, people: s.people ?? 3 }));
    const reloaded = createFlowStore(storage).getState();
    expect(reloaded).toMatchObject({ commodity: "gas", firstName: "Anna", people: 3 });
    expect(reloaded.activation).toMatchObject({ taxCode: "X", powerKw: 3, address: "" });
  });

  it("notifies subscribers and supports unsubscribe", () => {
    const store = createFlowStore(new MemoryStorage());
    const fn = vi.fn();
    const off = store.subscribe(fn);
    store.update({ people: 2 });
    off();
    store.update({ people: 3 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("reset() clears memory and storage", () => {
    const storage = new MemoryStorage();
    const store = createFlowStore(storage);
    store.update({ commodity: "luce", leadCreated: true });
    store.reset();
    expect(store.getState()).toBe(INITIAL_FLOW_STATE);
    expect(storage.getItem(FLOW_STORAGE_KEY)).toBeNull();
  });

  it("merges activation / chosenOffers one level deep", () => {
    const s1 = applyFlowPatch(INITIAL_FLOW_STATE, { activation: { pod: "IT1" } });
    const s2 = applyFlowPatch(s1, { activation: { pdr: "1" }, chosenOffers: { gas: null } });
    expect(s2.activation).toMatchObject({ pod: "IT1", pdr: "1", powerKw: 3 });
    expect(s2.chosenOffers).toEqual({ luce: null, gas: null });
  });

  it("ignores corrupt, foreign-version or missing data", () => {
    const storage = new MemoryStorage();
    expect(loadFlowState(null)).toBe(INITIAL_FLOW_STATE);
    expect(loadFlowState(storage)).toBe(INITIAL_FLOW_STATE);
    storage.setItem(FLOW_STORAGE_KEY, "{oops");
    expect(loadFlowState(storage)).toBe(INITIAL_FLOW_STATE);
    storage.setItem(FLOW_STORAGE_KEY, JSON.stringify({ version: 99, commodity: "luce" }));
    expect(loadFlowState(storage)).toBe(INITIAL_FLOW_STATE);
    storage.setItem(FLOW_STORAGE_KEY, "null");
    expect(loadFlowState(storage)).toBe(INITIAL_FLOW_STATE);
  });

  it("keeps working when storage throws (quota / privacy mode)", () => {
    const broken = new MemoryStorage();
    broken.setItem = () => {
      throw new Error("QuotaExceeded");
    };
    broken.getItem = () => {
      throw new Error("SecurityError");
    };
    broken.removeItem = () => {
      throw new Error("SecurityError");
    };
    const store = createFlowStore(broken);
    store.update({ people: 4 });
    expect(store.getState().people).toBe(4);
    store.reset();
    expect(store.getState().people).toBeNull();
  });

  it("getSessionStorage returns window.sessionStorage in the browser", () => {
    expect(getSessionStorage()).toBe(window.sessionStorage);
    const store = createFlowStore();
    store.update({ firstName: "Eva" });
    expect(JSON.parse(window.sessionStorage.getItem(FLOW_STORAGE_KEY)!).firstName).toBe("Eva");
  });

  it("getSessionStorage returns null when storage is blocked", () => {
    const spy = vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(getSessionStorage()).toBeNull();
    spy.mockRestore();
  });
});

describe("selectors", () => {
  it("annual consumption: manual when chosen, else estimate", () => {
    const s = filledState();
    expect(annualKwh(s)).toBe(1800);
    expect(annualSmc(s)).toBe(1035);
    const m = applyFlowPatch(s, { manualConsumption: true, manualKwhYear: 2500, manualSmcYear: 700 });
    expect(annualKwh(m)).toBe(2500);
    expect(annualSmc(m)).toBe(700);
  });

  it("gas service forced to primo allaccio when hasGas = false", () => {
    const s = filledState({ hasGas: false });
    expect(serviceTypeFor(s, "gas")).toBe("primo_allaccio");
    expect(serviceTypeFor(s, "luce")).toBe("cambio_fornitore");
    expect(meterCodeRequired(s, "gas")).toBe(false);
    expect(meterCodeRequired(s, "luce")).toBe(true);
  });

  it("snapshot + total monthly cost", () => {
    const s = filledState();
    const luce = s.chosenOffers.luce!;
    expect(luce).toMatchObject({ offer_id: LUCE.id, supplier_name: "Edison Energia", locked_months: 12 });
    expect(luce.monthly_cost).toBeCloseTo((1800 / 12) * 0.2, 6);
    expect(totalMonthlyCost(s)).toBeCloseTo(luce.monthly_cost! + s.chosenOffers.gas!.monthly_cost!, 6);
    expect(totalMonthlyCost(INITIAL_FLOW_STATE)).toBeNull();
  });

  it("variable chosen offer: null monthly cost, no total, monthly_cost_shown = null", () => {
    const variable = { ...LUCE, price_type: "variable" as const, locked_months: null };
    const snap = snapshotOffer(variable, 1800);
    expect(snap).toMatchObject({ monthly_cost: null, price_type: "variable", locked_months: null });
    const s = filledState();
    const v = applyFlowPatch(s, { chosenOffers: { luce: snap } });
    expect(totalMonthlyCost(v)).toBeNull();
    expect(toLeadPatchData(v).monthly_cost_shown).toBeNull();
    // nothing chosen: the field is omitted rather than nulled
    expect("monthly_cost_shown" in toLeadPatchData(INITIAL_FLOW_STATE)).toBe(false);
  });
});

describe("lead payload mappers", () => {
  it("create payload: consent + only filled, valid Page 1 fields; passes the server schema", () => {
    const data = toLeadCreateData(filledState());
    expect(data).toMatchObject({
      privacy_consent: true,
      commodity: "dual",
      first_name: "Mario",
      phone: "3331234567",
      comune_istat: "015146",
      current_supplier_gas: "iren",
    });
    expect(data).not.toHaveProperty("chosen_offer_luce");
    expect(data).not.toHaveProperty("company_name");
    expect(createBodySchema.safeParse({ data }).success).toBe(true);
  });

  it("create payload omits invalid phone and empty strings", () => {
    const data = toLeadCreateData(applyFlowPatch(INITIAL_FLOW_STATE, { phone: "12", firstName: " " }));
    expect(data).toEqual({ privacy_consent: true });
  });

  it("hidden fields are not sent (subentro → no current supplier; luce → no gas fields)", () => {
    const data = toLeadCreateData(filledState({ commodity: "luce", serviceType: "subentro" }));
    expect(data).not.toHaveProperty("current_supplier_luce");
    expect(data).not.toHaveProperty("gas_uses");
    expect(data).not.toHaveProperty("has_gas");
  });

  it("patch payload with step passes the server schema", () => {
    const data = toLeadPatchData(filledState(), "offer_chosen");
    expect(data).toMatchObject({ step_reached: "offer_chosen", chosen_offer_luce: LUCE.id, chosen_offer_gas: GAS.id });
    expect(patchBodySchema.safeParse({ data }).success).toBe(true);
    expect(toLeadPatchData(filledState())).not.toHaveProperty("step_reached");
  });

  it("complete payload passes server schema and completion rules (dual)", () => {
    const data = toLeadCompleteData(filledState());
    const parsed = completeBodySchema.safeParse({ data });
    expect(parsed.success).toBe(true);
    expect(checkCompletion(parsed.data!.data).fields).toEqual({});
    expect(parsed.data!.data.tax_code).toBe(VALID_CF);
    expect(data.monthly_cost_shown).toBe(Math.round(totalMonthlyCost(filledState())! * 100) / 100);
  });

  it("complete payload: business sends P.IVA; activation gas uses override Page 1", () => {
    const s = filledState({
      customerType: "business",
      companyName: "Rossi Srl",
      activation: { ...filledState().activation, vatNumber: VALID_PIVA, gasUses: ["acqua_calda"] },
    });
    const data = toLeadCompleteData(s);
    expect(data).toMatchObject({ company_name: "Rossi Srl", vat_number: VALID_PIVA, gas_uses: ["acqua_calda"] });
  });

  it("complete payload sends raw invalid values so the server can report them", () => {
    const s = filledState({ phone: "12" });
    expect(toLeadCompleteData(s).phone).toBe("12");
  });
});
