/**
 * Customer FLOW STATE: one typed object holding every choice of the public flow
 * (Page 1 → results → offer modal → activation A/B → thank-you), persisted in
 * sessionStorage so a refresh mid-flow keeps the data (TASKS T7.2).
 *
 * Framework-free (store + pure mappers); the React binding is flow-context.tsx.
 * Mappers turn the state into lead API payloads (client.ts).
 */
import type { ApplianceId, GasUseId } from "@/config/consumption";
import type {
  ClimateZone,
  Commodity,
  DocumentType,
  HousingTitle,
  LeadCommodity,
  LeadCustomerType,
  OfferWithSupplier,
  ServiceType,
  SqmRange,
  Voltage,
} from "@/lib/data/types";
import { validatePhone } from "@/lib/logic/validators";
import type { UploadedLeadDocument } from "./api-types";
import { monthlyCost } from "@/lib/logic/pricing";
import {
  effectiveServiceType,
  includesGas,
  includesLuce,
  needsCurrentSupplier,
  needsMeterCode,
} from "./rules";
import type { LeadCompleteData, LeadCreateData, LeadPatchData } from "./schemas";

export const FLOW_STORAGE_KEY = "versus.flow.v1";
export const FLOW_STATE_VERSION = 1;

/** The comune chosen on Page 1 (subset of data `Comune`). */
export interface FlowComune {
  istat: string;
  name: string;
  /** Province code, e.g. "MI". */
  province: string;
  caps: string[];
  climate_zone: ClimateZone | null;
}

/** Snapshot of a chosen offer: everything the sticky summary / thank-you page shows. */
export interface ChosenOfferSnapshot {
  offer_id: string;
  commodity: Commodity;
  offer_name: string;
  supplier_id: string;
  supplier_name: string;
  supplier_logo_path: string | null;
  energy_price: number;
  other_variable_costs: number;
  fixed_fee_monthly: number;
  other_fixed_costs_monthly: number;
  locked_months: number | null;
  activation_cost: number;
  promo_text: string | null;
  /** Unrounded monthly cost shown to the customer when choosing (VAT excluded). */
  monthly_cost: number;
}

/** Activation form data (PRD §10). Strings are raw user input ("" = empty). */
export interface ActivationData {
  // Step A
  taxCode: string;
  vatNumber: string;
  housingTitle: HousingTitle | null;
  // Step B
  cap: string;
  address: string;
  streetNumber: string;
  isResident: boolean | null;
  pod: string;
  /** Potenza impegnata (kW); null = "Altro". Default 3 (PRD §10). */
  powerKw: number | null;
  voltage: Voltage | null;
  pdr: string;
  /** "Usi del gas" edited in Step B; null = not edited, use Page 1 `gasUses`. */
  gasUses: GasUseId[] | null;
  // Step B, optional (Phase 12)
  /** IBAN for direct debit ("" = not given). */
  iban: string;
  /** "L'intestatario del conto è diverso dal titolare" (only sent with an IBAN). */
  ibanHolderDifferent: boolean;
  ibanHolderFirstName: string;
  ibanHolderLastName: string;
  ibanHolderTaxCode: string;
  /** Identity document data: all four or none. */
  documentType: DocumentType | null;
  documentNumber: string;
  /** ISO date "YYYY-MM-DD" (value of an <input type="date">), "" = empty. */
  documentExpiry: string;
  documentIssuer: string;
  /** Documents already uploaded for this lead (POST /api/lead/document), max 2. */
  documents: FlowUploadedDocument[];
}

/** An uploaded identity document as remembered by the flow (server metadata + file name). */
export interface FlowUploadedDocument extends UploadedLeadDocument {
  /** Original file name, for display only (never sent to the server again). */
  name: string;
}

export interface FlowState {
  version: typeof FLOW_STATE_VERSION;

  // ---- Page 1 (PRD §6) ----
  /** Block A. */
  commodity: LeadCommodity | null;
  /** Block B. */
  customerType: LeadCustomerType | null;
  /** Block C (raw input). */
  firstName: string;
  lastName: string;
  phone: string;
  /** Ragione sociale, Partita IVA only. */
  companyName: string;
  comune: FlowComune | null;
  privacyConsent: boolean;
  /** Block D. */
  serviceType: ServiceType | null;
  /** Block E: supplier ids (shown only for Cambio fornitore / Voltura). */
  currentSupplierLuce: string | null;
  currentSupplierGas: string | null;
  /** "Hai già il Gas a casa?"; false forces gas service to Primo allaccio. */
  hasGas: boolean | null;
  /** Block F (Casa). 1..5 ("5+" = 5). */
  people: number | null;
  appliances: ApplianceId[];
  gasUses: GasUseId[];
  sqmRange: SqmRange | null;
  /** Live estimates computed on Page 1 (kWh/Smc per year). */
  estimatedKwhYear: number | null;
  estimatedSmcYear: number | null;
  /** "Conosco il mio consumo" (Casa) — always true for Partita IVA (direct entry). */
  manualConsumption: boolean;
  manualKwhYear: number | null;
  manualSmcYear: number | null;

  // ---- Results (PRD §8): editable monthly consumption ----
  finalKwhMonth: number | null;
  finalSmcMonth: number | null;

  // ---- Offer choice (PRD §8–9) ----
  chosenOffers: { luce: ChosenOfferSnapshot | null; gas: ChosenOfferSnapshot | null };

  // ---- Activation (PRD §10) ----
  activation: ActivationData;

  // ---- Lead lifecycle ----
  /** POST /api/lead succeeded in this session (then use PATCH). */
  leadCreated: boolean;
  /** POST /api/lead/complete succeeded (thank-you page may render). */
  leadCompleted: boolean;
}

export const INITIAL_ACTIVATION: ActivationData = Object.freeze({
  taxCode: "",
  vatNumber: "",
  housingTitle: null,
  cap: "",
  address: "",
  streetNumber: "",
  isResident: null,
  pod: "",
  powerKw: 3,
  voltage: null,
  pdr: "",
  gasUses: null,
  iban: "",
  ibanHolderDifferent: false,
  ibanHolderFirstName: "",
  ibanHolderLastName: "",
  ibanHolderTaxCode: "",
  documentType: null,
  documentNumber: "",
  documentExpiry: "",
  documentIssuer: "",
  documents: Object.freeze([]) as unknown as FlowUploadedDocument[],
}) as ActivationData;

export const INITIAL_FLOW_STATE: FlowState = Object.freeze({
  version: FLOW_STATE_VERSION,
  commodity: null,
  customerType: null,
  firstName: "",
  lastName: "",
  phone: "",
  companyName: "",
  comune: null,
  privacyConsent: false,
  serviceType: null,
  currentSupplierLuce: null,
  currentSupplierGas: null,
  hasGas: null,
  people: null,
  appliances: [],
  gasUses: [],
  sqmRange: null,
  estimatedKwhYear: null,
  estimatedSmcYear: null,
  manualConsumption: false,
  manualKwhYear: null,
  manualSmcYear: null,
  finalKwhMonth: null,
  finalSmcMonth: null,
  chosenOffers: Object.freeze({ luce: null, gas: null }),
  activation: INITIAL_ACTIVATION,
  leadCreated: false,
  leadCompleted: false,
}) as FlowState;

/** A partial update; `activation` / `chosenOffers` are merged one level deep. */
export type FlowPatch = Partial<Omit<FlowState, "version" | "activation" | "chosenOffers">> & {
  activation?: Partial<ActivationData>;
  chosenOffers?: Partial<FlowState["chosenOffers"]>;
};

export function applyFlowPatch(state: FlowState, patch: FlowPatch): FlowState {
  const { activation, chosenOffers, ...rest } = patch;
  return {
    ...state,
    ...rest,
    version: FLOW_STATE_VERSION,
    activation: activation ? { ...state.activation, ...activation } : state.activation,
    chosenOffers: chosenOffers ? { ...state.chosenOffers, ...chosenOffers } : state.chosenOffers,
  };
}

// ---------------------------------------------------------------------------
// Persistence

/** sessionStorage, or null when unavailable (SSR, privacy mode, blocked storage). */
export function getSessionStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    const s = window.sessionStorage;
    const probe = "__versus_probe__";
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

/** Reads the saved state; anything missing/corrupt/old-version falls back to the initial state. */
export function loadFlowState(storage: Storage | null): FlowState {
  if (!storage) return INITIAL_FLOW_STATE;
  try {
    const raw = storage.getItem(FLOW_STORAGE_KEY);
    if (!raw) return INITIAL_FLOW_STATE;
    const parsed = JSON.parse(raw) as Partial<FlowState> | null;
    if (!parsed || typeof parsed !== "object" || parsed.version !== FLOW_STATE_VERSION) {
      return INITIAL_FLOW_STATE;
    }
    return {
      ...INITIAL_FLOW_STATE,
      ...parsed,
      activation: loadActivation(parsed.activation),
      chosenOffers: { ...INITIAL_FLOW_STATE.chosenOffers, ...(parsed.chosenOffers ?? {}) },
    };
  } catch {
    return INITIAL_FLOW_STATE;
  }
}

/** Saved activation data merged over the defaults (older saves lack the Phase 12 fields). */
function loadActivation(saved: Partial<ActivationData> | undefined): ActivationData {
  const activation = { ...INITIAL_ACTIVATION, ...(saved && typeof saved === "object" ? saved : {}) };
  if (!Array.isArray(activation.documents)) activation.documents = INITIAL_ACTIVATION.documents;
  return activation;
}

export function saveFlowState(storage: Storage | null, state: FlowState): void {
  if (!storage) return;
  try {
    storage.setItem(FLOW_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded / storage blocked: the flow keeps working in memory.
  }
}

export function clearFlowState(storage: Storage | null): void {
  if (!storage) return;
  try {
    storage.removeItem(FLOW_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export interface FlowStore {
  getState(): FlowState;
  /** Merges a patch (or the result of an updater) and persists it. */
  update(patch: FlowPatch | ((state: FlowState) => FlowPatch)): void;
  /** Back to the initial state and removes the saved copy. */
  reset(): void;
  subscribe(listener: () => void): () => void;
}

export function createFlowStore(storage: Storage | null = getSessionStorage()): FlowStore {
  let state = loadFlowState(storage);
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());
  return {
    getState: () => state,
    update(patch) {
      const p = typeof patch === "function" ? patch(state) : patch;
      state = applyFlowPatch(state, p);
      saveFlowState(storage, state);
      emit();
    },
    reset() {
      state = INITIAL_FLOW_STATE;
      clearFlowState(storage);
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

// ---------------------------------------------------------------------------
// Selectors

/** Annual consumption used for pricing: manual entry when chosen, otherwise the estimate. */
export function annualKwh(state: FlowState): number | null {
  return state.manualConsumption ? state.manualKwhYear : state.estimatedKwhYear;
}

export function annualSmc(state: FlowState): number | null {
  return state.manualConsumption ? state.manualSmcYear : state.estimatedSmcYear;
}

/** Service type that applies to `commodity` (gas forced to Primo allaccio when hasGas = false). */
export function serviceTypeFor(state: FlowState, commodity: Commodity): ServiceType | null {
  return effectiveServiceType(commodity, state.serviceType, state.hasGas);
}

/** Total monthly cost of the chosen offer(s) (dual: luce + gas), or null if none chosen. */
export function totalMonthlyCost(state: FlowState): number | null {
  const { luce, gas } = state.chosenOffers;
  if (!luce && !gas) return null;
  return (luce?.monthly_cost ?? 0) + (gas?.monthly_cost ?? 0);
}

/** Builds the snapshot stored when the customer picks an offer. */
export function snapshotOffer(offer: OfferWithSupplier, annualConsumption: number): ChosenOfferSnapshot {
  return {
    offer_id: offer.id,
    commodity: offer.commodity,
    offer_name: offer.name,
    supplier_id: offer.supplier.id,
    supplier_name: offer.supplier.name,
    supplier_logo_path: offer.supplier.logo_path,
    energy_price: offer.energy_price,
    other_variable_costs: offer.other_variable_costs,
    fixed_fee_monthly: offer.fixed_fee_monthly,
    other_fixed_costs_monthly: offer.other_fixed_costs_monthly,
    locked_months: offer.locked_months,
    activation_cost: offer.activation_cost,
    promo_text: offer.promo_text,
    monthly_cost: monthlyCost(offer, annualConsumption),
  };
}

// ---------------------------------------------------------------------------
// Lead payload mappers (only filled and valid values are sent)

const trimmed = (v: string) => {
  const t = v.trim();
  return t === "" ? undefined : t;
};

function validOrUndefined(
  value: string,
  validator: (v: string) => { ok: true; value: string } | { ok: false },
): string | undefined {
  if (!value.trim()) return undefined;
  const r = validator(value);
  return r.ok ? r.value : undefined;
}

function definedOnly<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

/** Page 1 + results fields that are known so far. */
function page1Data(state: FlowState): Omit<LeadPatchData, "step_reached"> {
  const luce = includesLuce(state.commodity);
  const gas = includesGas(state.commodity);
  const business = state.customerType === "business";
  const kwh = annualKwh(state);
  const smc = annualSmc(state);
  const total = totalMonthlyCost(state);
  return definedOnly({
    commodity: state.commodity ?? undefined,
    customer_type: state.customerType ?? undefined,
    first_name: trimmed(state.firstName),
    last_name: trimmed(state.lastName),
    phone: validOrUndefined(state.phone, validatePhone),
    company_name: business ? trimmed(state.companyName) : undefined,
    comune_istat: state.comune?.istat,
    service_type: state.serviceType ?? undefined,
    current_supplier_luce:
      luce && needsCurrentSupplier(serviceTypeFor(state, "luce"))
        ? (state.currentSupplierLuce ?? undefined)
        : undefined,
    current_supplier_gas:
      gas && needsCurrentSupplier(serviceTypeFor(state, "gas"))
        ? (state.currentSupplierGas ?? undefined)
        : undefined,
    has_gas: gas ? (state.hasGas ?? undefined) : undefined,
    people: state.people ?? undefined,
    appliances: luce ? state.appliances : undefined,
    gas_uses: gas ? state.gasUses : undefined,
    sqm_range: gas && state.gasUses.includes("riscaldamento") ? (state.sqmRange ?? undefined) : undefined,
    estimated_kwh_year: luce && kwh != null ? kwh : undefined,
    estimated_smc_year: gas && smc != null ? smc : undefined,
    manual_consumption: state.commodity ? state.manualConsumption : undefined,
    final_kwh_month: luce ? (state.finalKwhMonth ?? undefined) : undefined,
    final_smc_month: gas ? (state.finalSmcMonth ?? undefined) : undefined,
    chosen_offer_luce: luce ? state.chosenOffers.luce?.offer_id : undefined,
    chosen_offer_gas: gas ? state.chosenOffers.gas?.offer_id : undefined,
    monthly_cost_shown: total != null ? Math.round(total * 100) / 100 : undefined,
  });
}

/** POST /api/lead payload (Page 1, on privacy consent). */
export function toLeadCreateData(state: FlowState): LeadCreateData {
  const { chosen_offer_luce: _l, chosen_offer_gas: _g, monthly_cost_shown: _m, ...data } = page1Data(state);
  void _l;
  void _g;
  void _m;
  return { ...data, privacy_consent: true };
}

/** PATCH /api/lead payload with the current Page 1 / results / offer data (+ optional step). */
export function toLeadPatchData(
  state: FlowState,
  step?: "results" | "offer_chosen",
): LeadPatchData {
  return step ? { ...page1Data(state), step_reached: step } : page1Data(state);
}

/**
 * POST /api/lead/complete payload: the full lead. Values are sent as typed by the
 * customer (the server validates and normalises them and returns field errors).
 */
export function toLeadCompleteData(state: FlowState): LeadCompleteData {
  const a = state.activation;
  const luce = includesLuce(state.commodity);
  const gas = includesGas(state.commodity);
  const business = state.customerType === "business";
  const base = page1Data(state);
  return definedOnly({
    ...base,
    // Step A values are sent as typed so the server reports precise field errors.
    first_name: trimmed(state.firstName),
    last_name: trimmed(state.lastName),
    phone: trimmed(state.phone),
    tax_code: trimmed(a.taxCode),
    vat_number: business ? trimmed(a.vatNumber) : undefined,
    housing_title: a.housingTitle ?? undefined,
    cap: trimmed(a.cap),
    address: trimmed(a.address),
    street_number: trimmed(a.streetNumber),
    is_resident: a.isResident ?? undefined,
    pod: luce ? trimmed(a.pod) : undefined,
    power_kw: luce ? a.powerKw : undefined,
    voltage: luce ? (a.voltage ?? undefined) : undefined,
    pdr: gas ? trimmed(a.pdr) : undefined,
    gas_uses: gas ? (a.gasUses ?? state.gasUses) : undefined,
    ...activationExtras(a),
  });
}

/**
 * Optional IBAN + identity document fields of the complete payload. Blank values are
 * omitted (the server stores them as null); holder fields only with an IBAN and the box
 * ticked. Formats and requirements are checked by the server (field error codes).
 */
function activationExtras(a: ActivationData): Partial<LeadCompleteData> {
  const iban = trimmed(a.iban);
  const holder = iban !== undefined && a.ibanHolderDifferent;
  return {
    iban,
    iban_holder_different: iban !== undefined ? a.ibanHolderDifferent : undefined,
    iban_holder_first_name: holder ? trimmed(a.ibanHolderFirstName) : undefined,
    iban_holder_last_name: holder ? trimmed(a.ibanHolderLastName) : undefined,
    iban_holder_tax_code: holder ? trimmed(a.ibanHolderTaxCode) : undefined,
    document_type: a.documentType ?? undefined,
    document_number: trimmed(a.documentNumber),
    document_expiry: trimmed(a.documentExpiry),
    document_issuer: trimmed(a.documentIssuer),
  };
}

/** Client-side pre-check mirroring the server rules for POD/PDR requirement (UI helper). */
export function meterCodeRequired(state: FlowState, commodity: Commodity): boolean {
  return needsMeterCode(serviceTypeFor(state, commodity));
}

