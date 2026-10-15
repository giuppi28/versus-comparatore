/**
 * Pure Page 1 logic (PRD §6): derived flow-state fields, visibility rules, validation and
 * API error mapping. No React here so everything is unit-testable.
 */
import { estimateGas, estimateLuce, PHONE_MESSAGES, validatePhone } from "@/lib/logic";
import { LeadApiError } from "@/lib/lead/client";
import {
  applyFlowPatch,
  type FlowPatch,
  type FlowState,
} from "@/lib/lead/flow-state";
import {
  includesGas,
  includesLuce,
  needsCurrentSupplier,
  effectiveServiceType,
} from "@/lib/lead/rules";

/** Supplier option for the "Fornitore attuale" dropdowns (already filtered and sorted). */
export interface SupplierOption {
  id: string;
  name: string;
  sellsLuce: boolean;
  sellsGas: boolean;
}

/** Largest manual annual consumption accepted (matches the API bound on estimated_*_year). */
export const MAX_MANUAL_CONSUMPTION = 10_000_000;

/** it-IT integer with thousands separator ("2.100"). */
export function formatCount(value: number): string {
  return new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 0,
    useGrouping: "always",
  }).format(value);
}

// ---------------------------------------------------------------------------
// Visibility rules

/** Casa customer who answered "Hai già il Gas a casa?" = No, with gas in the comparison. */
export function isGasServiceForced(state: FlowState): boolean {
  return includesGas(state.commodity) && state.customerType === "casa" && state.hasGas === false;
}

/** Gas-only comparison where the service type is forced to Primo allaccio (Block D is locked). */
export function isServiceTypeLocked(state: FlowState): boolean {
  return state.commodity === "gas" && isGasServiceForced(state);
}

export function showLuceSupplier(state: FlowState): boolean {
  return (
    includesLuce(state.commodity) &&
    needsCurrentSupplier(effectiveServiceType("luce", state.serviceType, state.hasGas))
  );
}

export function showGasSupplier(state: FlowState): boolean {
  return (
    includesGas(state.commodity) &&
    needsCurrentSupplier(effectiveServiceType("gas", state.serviceType, state.hasGas))
  );
}

export function showCurrentSupplierBlock(state: FlowState): boolean {
  return showLuceSupplier(state) || showGasSupplier(state);
}

/** Casa asks people/appliances/uses; Partita IVA always enters the annual consumption directly. */
export function usesManualEntry(state: FlowState): boolean {
  return state.customerType === "business" || state.manualConsumption;
}

// ---------------------------------------------------------------------------
// Estimates (client-side, PRD §6 Block F)

export interface Estimates {
  estimatedKwhYear: number | null;
  estimatedSmcYear: number | null;
}

/** Heating needs the m² range before the gas estimate is complete. */
function gasEstimateComplete(state: FlowState): boolean {
  if (state.gasUses.length === 0) return false;
  return !state.gasUses.includes("riscaldamento") || state.sqmRange != null;
}

/** Annual kWh / Smc estimate for a Casa customer; null while the inputs are incomplete. */
export function computeEstimates(state: FlowState): Estimates {
  if (state.customerType !== "casa" || state.people == null) {
    return { estimatedKwhYear: null, estimatedSmcYear: null };
  }
  const kwh = includesLuce(state.commodity)
    ? estimateLuce({ people: state.people, appliances: state.appliances })
    : null;
  const smc =
    includesGas(state.commodity) && gasEstimateComplete(state)
      ? estimateGas({
          people: state.people,
          uses: state.gasUses,
          sqmRange: state.sqmRange,
          climateZone: state.comune?.climate_zone ?? null,
          provinceCode: state.comune?.province ?? null,
        })
      : null;
  return { estimatedKwhYear: kwh, estimatedSmcYear: smc };
}

/** Fields that change the offers / prices shown later: editing them invalidates results data. */
const RESULT_AFFECTING_KEYS = [
  "commodity",
  "customerType",
  "comune",
  "serviceType",
  "currentSupplierLuce",
  "currentSupplierGas",
  "hasGas",
  "people",
  "appliances",
  "gasUses",
  "sqmRange",
  "manualConsumption",
  "manualKwhYear",
  "manualSmcYear",
] as const;

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Turns a user edit into the full flow patch: applies the edit, keeps the dependent fields
 * consistent (forced Primo allaccio, Partita IVA = manual entry, ...), recomputes the estimates
 * and drops anything downstream (chosen offers, edited monthly consumption) that the edit
 * made stale.
 */
export function reduceChange(prev: FlowState, patch: FlowPatch): FlowPatch {
  const out: FlowPatch = { ...patch };
  let next = applyFlowPatch(prev, out);

  // Customer type transitions.
  if (prev.customerType !== next.customerType) {
    if (next.customerType === "business") {
      out.manualConsumption = true;
      out.hasGas = null;
    } else if (prev.customerType === "business") {
      out.manualConsumption = false;
    }
    next = applyFlowPatch(prev, out);
  }

  // "Hai già il Gas a casa?" = No locks gas-only to Primo allaccio and hides the gas supplier.
  const wasLocked = isServiceTypeLocked(prev);
  const locked = isServiceTypeLocked(next);
  if (locked) {
    out.serviceType = "primo_allaccio";
    next = applyFlowPatch(prev, out);
  } else if (wasLocked && next.serviceType === "primo_allaccio") {
    out.serviceType = null;
    next = applyFlowPatch(prev, out);
  }
  if (isGasServiceForced(next) && next.currentSupplierGas !== null) {
    out.currentSupplierGas = null;
    next = applyFlowPatch(prev, out);
  }

  // Heating m² only matters while Riscaldamento is selected.
  if (!next.gasUses.includes("riscaldamento") && next.sqmRange !== null) {
    out.sqmRange = null;
    next = applyFlowPatch(prev, out);
  }

  Object.assign(out, computeEstimates(next));
  next = applyFlowPatch(prev, out);

  if (RESULT_AFFECTING_KEYS.some((k) => !sameValue(prev[k], next[k]))) {
    out.chosenOffers = { luce: null, gas: null };
    out.finalKwhMonth = null;
    out.finalSmcMonth = null;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Validation (PRD §6)

/** Ordered: the first key present in the error map is the one scrolled to on submit. */
export const FIELD_ORDER = [
  "commodity",
  "customerType",
  "firstName",
  "lastName",
  "phone",
  "companyName",
  "comune",
  "privacy",
  "serviceType",
  "supplierLuce",
  "supplierGas",
  "people",
  "hasGas",
  "gasUses",
  "sqmRange",
  "manualKwh",
  "manualSmc",
] as const;

export type FieldKey = (typeof FIELD_ORDER)[number];
export type Page1Errors = Partial<Record<FieldKey, string>>;

export const ERROR_MESSAGES = {
  commodity: "Scegli cosa vuoi confrontare.",
  customerType: "Indica se la fornitura è per la casa o per una Partita IVA.",
  firstName: "Inserisci il tuo nome.",
  lastName: "Inserisci il tuo cognome.",
  companyName: "Inserisci la ragione sociale.",
  comune: "Cerca e seleziona il tuo comune dall'elenco.",
  privacy: "Per proseguire devi accettare l'informativa sulla privacy.",
  serviceType: "Scegli il tipo di servizio.",
  supplier: "Seleziona il fornitore attuale.",
  people: "Indica quante persone vivono in casa.",
  hasGas: "Indica se hai già il gas a casa.",
  gasUses: "Seleziona almeno un utilizzo del gas.",
  sqmRange: "Indica la superficie della casa da riscaldare.",
  manualKwh: "Inserisci il consumo annuo di energia elettrica (kWh).",
  manualSmc: "Inserisci il consumo annuo di gas (Smc).",
  consumptionInvalid: "Inserisci un valore maggiore di zero.",
} as const;

function validManualAmount(value: number | null): "missing" | "invalid" | null {
  if (value == null) return "missing";
  if (!Number.isFinite(value) || value <= 0 || value > MAX_MANUAL_CONSUMPTION) return "invalid";
  return null;
}

/** Validates everything that is visible for the current choices. Empty object = valid. */
export function validatePage1(state: FlowState, suppliers: readonly SupplierOption[]): Page1Errors {
  const e: Page1Errors = {};
  const luce = includesLuce(state.commodity);
  const gas = includesGas(state.commodity);
  const business = state.customerType === "business";

  if (!state.commodity) e.commodity = ERROR_MESSAGES.commodity;
  if (!state.customerType) e.customerType = ERROR_MESSAGES.customerType;

  if (!state.firstName.trim()) e.firstName = ERROR_MESSAGES.firstName;
  if (!state.lastName.trim()) e.lastName = ERROR_MESSAGES.lastName;
  const phone = validatePhone(state.phone);
  if (!phone.ok) e.phone = PHONE_MESSAGES[phone.error];
  if (business && !state.companyName.trim()) e.companyName = ERROR_MESSAGES.companyName;
  if (!state.comune) e.comune = ERROR_MESSAGES.comune;
  if (!state.privacyConsent) e.privacy = ERROR_MESSAGES.privacy;

  if (!state.serviceType && !isServiceTypeLocked(state)) e.serviceType = ERROR_MESSAGES.serviceType;

  const supplierOk = (id: string | null, commodity: "luce" | "gas") =>
    id != null &&
    suppliers.some((s) => s.id === id && (commodity === "luce" ? s.sellsLuce : s.sellsGas));
  if (showLuceSupplier(state) && !supplierOk(state.currentSupplierLuce, "luce")) {
    e.supplierLuce = ERROR_MESSAGES.supplier;
  }
  if (showGasSupplier(state) && !supplierOk(state.currentSupplierGas, "gas")) {
    e.supplierGas = ERROR_MESSAGES.supplier;
  }

  if (state.customerType === "casa") {
    const manual = state.manualConsumption;
    if (!manual && state.people == null) e.people = ERROR_MESSAGES.people;
    if (gas) {
      if (state.hasGas == null) e.hasGas = ERROR_MESSAGES.hasGas;
      if (state.gasUses.length === 0) e.gasUses = ERROR_MESSAGES.gasUses;
      if (!manual && state.gasUses.includes("riscaldamento") && state.sqmRange == null) {
        e.sqmRange = ERROR_MESSAGES.sqmRange;
      }
    }
  }

  if (usesManualEntry(state) && state.customerType) {
    if (luce) {
      const r = validManualAmount(state.manualKwhYear);
      if (r) e.manualKwh = r === "missing" ? ERROR_MESSAGES.manualKwh : ERROR_MESSAGES.consumptionInvalid;
    }
    if (gas) {
      const r = validManualAmount(state.manualSmcYear);
      if (r) e.manualSmc = r === "missing" ? ERROR_MESSAGES.manualSmc : ERROR_MESSAGES.consumptionInvalid;
    }
  }
  return e;
}

export function firstErrorKey(errors: Page1Errors): FieldKey | null {
  return FIELD_ORDER.find((k) => errors[k] != null) ?? null;
}

// ---------------------------------------------------------------------------
// Numeric input

/** Digits-only parsing for the manual consumption inputs ("1.200" and "1 200" both → 1200). */
export function parseWholeNumber(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  if (digits === "") return null;
  const n = Number(digits);
  return Number.isSafeInteger(n) ? n : null;
}

// ---------------------------------------------------------------------------
// API errors

export interface MappedApiError {
  message: string;
  /** Field-level messages for validation errors reported by the server. */
  fields: Page1Errors;
}

const SERVER_FIELD_TO_KEY: Record<string, FieldKey> = {
  first_name: "firstName",
  last_name: "lastName",
  phone: "phone",
  company_name: "companyName",
  comune_istat: "comune",
};

/** Italian inline message for a failed lead API call (create / update). */
export function mapApiError(error: unknown): MappedApiError {
  if (!(error instanceof LeadApiError)) {
    return { message: "Si è verificato un errore imprevisto. Riprova.", fields: {} };
  }
  switch (error.code) {
    case "rate_limited":
      return { message: "Troppe richieste, riprova tra poco.", fields: {} };
    case "network_error":
      return { message: "Connessione non riuscita. Controlla la rete e riprova.", fields: {} };
    case "validation": {
      const fields: Page1Errors = {};
      for (const [field, code] of Object.entries(error.fields)) {
        const key = SERVER_FIELD_TO_KEY[field];
        if (!key) continue;
        fields[key] =
          key === "phone" && code === "empty"
            ? PHONE_MESSAGES.empty
            : key === "phone"
              ? PHONE_MESSAGES.format
              : "Controlla questo campo.";
      }
      return { message: "Alcuni dati non sono validi. Controlla i campi evidenziati.", fields };
    }
    case "server_error":
      return { message: "Servizio momentaneamente non disponibile. Riprova tra poco.", fields: {} };
    default:
      return { message: "Non è stato possibile salvare i dati. Riprova.", fields: {} };
  }
}

/** True when the PATCH failed because the lead cookie is gone/expired (the lead must be re-created). */
export function isLeadMissingError(error: unknown): boolean {
  return (
    error instanceof LeadApiError && (error.code === "no_lead" || error.code === "lead_not_found")
  );
}
