/**
 * Pure helpers of the activation form (PRD §10): client-side validation of Step A / B,
 * mapping of server field codes to Italian messages, submit normalisation, redirect rules.
 * Framework-free so they are unit-tested without rendering.
 */
import type { GasUseId } from "@/config/consumption";
import type { Commodity, Supplier } from "@/lib/data/types";
import { toLeadCompleteData, serviceTypeFor, type FlowState } from "@/lib/lead/flow-state";
import {
  DEFAULT_POWER_KW,
  includesGas,
  includesLuce,
  needsCurrentSupplier,
  needsMeterCode,
  POWER_KW_OPTIONS,
} from "@/lib/lead/rules";
import { italianToday } from "@/lib/lead/completion";
import { validateDocumentNumber, validateIsoDate } from "@/lib/lead/schemas";
import { podDistributorComuneWarning } from "@/lib/logic/distributors";
import {
  CODICE_FISCALE_MESSAGES,
  IBAN_MESSAGES,
  PARTITA_IVA_MESSAGES,
  PDR_MESSAGES,
  PHONE_MESSAGES,
  POD_MESSAGES,
  normalizeIban,
  validateCodiceFiscale,
  validateIban,
  validatePartitaIva,
  validatePdr,
  validatePhone,
  validatePod,
} from "@/lib/logic/validators";

export type FieldErrors = Record<string, string>;
export type ActivationStep = "A" | "B";

/** Field (API names) → step that shows it. */
const STEP_A_FIELDS = new Set([
  "first_name",
  "last_name",
  "phone",
  "tax_code",
  "vat_number",
  "company_name",
  "housing_title",
]);

export function stepOfField(field: string): ActivationStep {
  return STEP_A_FIELDS.has(field) ? "A" : "B";
}

/** First step (A before B) that contains an error, or null. */
export function firstStepWithErrors(errors: FieldErrors): ActivationStep | null {
  const keys = Object.keys(errors);
  if (keys.some((k) => stepOfField(k) === "A")) return "A";
  return keys.length > 0 ? "B" : null;
}

/** Message for a form-level "your chosen offer is gone" condition. */
export const OFFER_NOT_AVAILABLE_MESSAGE =
  "L'offerta scelta non è più disponibile. Torna alle offerte e scegline un'altra.";

const PAGE1_DATA_MESSAGE =
  "Alcuni dati del confronto non sono completi: ricomincia dall'inizio per ricontrollarli.";

const GENERIC_MESSAGES: Record<string, string> = {
  required: "Campo obbligatorio.",
  invalid: "Valore non valido.",
  unknown_field: "Valore non valido.",
  not_available: OFFER_NOT_AVAILABLE_MESSAGE,
  not_found: "Comune non riconosciuto: torna indietro e controlla i dati inseriti.",
};

/** Per-field tables for the codes produced by the shared validators. */
const VALIDATOR_MESSAGES: Record<string, Record<string, string>> = {
  phone: PHONE_MESSAGES,
  tax_code: CODICE_FISCALE_MESSAGES,
  vat_number: PARTITA_IVA_MESSAGES,
  pod: POD_MESSAGES,
  pdr: PDR_MESSAGES,
  iban: IBAN_MESSAGES,
  iban_holder_tax_code: CODICE_FISCALE_MESSAGES,
};

const DOCUMENT_REQUIRED_MESSAGE = "Completa i dati del documento.";
export const DOCUMENT_PAST_MESSAGE = "Il documento è scaduto: controlla la data di scadenza.";

const FIELD_REQUIRED_MESSAGES: Record<string, string> = {
  first_name: "Inserisci il nome.",
  last_name: "Inserisci il cognome.",
  phone: PHONE_MESSAGES.empty,
  tax_code: CODICE_FISCALE_MESSAGES.empty,
  vat_number: PARTITA_IVA_MESSAGES.empty,
  company_name: "Inserisci la ragione sociale.",
  housing_title: "Seleziona una risposta.",
  cap: "Inserisci il CAP.",
  address: "Inserisci l'indirizzo.",
  street_number: "Inserisci il numero civico.",
  is_resident: "Seleziona una risposta.",
  pod: POD_MESSAGES.empty,
  voltage: "Seleziona il livello di tensione.",
  pdr: PDR_MESSAGES.empty,
  gas_uses: "Seleziona almeno un uso del gas.",
  current_supplier_luce: "Seleziona il fornitore attuale.",
  current_supplier_gas: "Seleziona il fornitore attuale.",
  iban_holder_first_name: "Inserisci il nome dell'intestatario.",
  iban_holder_last_name: "Inserisci il cognome dell'intestatario.",
  iban_holder_tax_code: CODICE_FISCALE_MESSAGES.empty,
  document_type: DOCUMENT_REQUIRED_MESSAGE,
  document_number: DOCUMENT_REQUIRED_MESSAGE,
  document_expiry: DOCUMENT_REQUIRED_MESSAGE,
  document_issuer: DOCUMENT_REQUIRED_MESSAGE,
};

const DOCUMENT_FIELD_MESSAGES: Record<string, Record<string, string>> = {
  document_number: { format: "Il numero del documento deve avere da 5 a 20 lettere o cifre." },
  document_expiry: { invalid: "Inserisci una data di scadenza valida.", past: DOCUMENT_PAST_MESSAGE },
};

/** Italian message for one server (or client) field error code. */
export function messageForFieldCode(field: string, code: string): string {
  if (!FORM_FIELDS.has(field) && code !== "not_available" && code !== "not_found") {
    return PAGE1_DATA_MESSAGE;
  }
  if (code === "required" && FIELD_REQUIRED_MESSAGES[field]) return FIELD_REQUIRED_MESSAGES[field];
  const specific = VALIDATOR_MESSAGES[field]?.[code] ?? DOCUMENT_FIELD_MESSAGES[field]?.[code];
  if (specific) return specific;
  if (field === "cap" && code !== "required") return "Inserisci un CAP di 5 cifre.";
  return GENERIC_MESSAGES[code] ?? "Valore non valido.";
}

/** Server 422 `fields` (field → code) → Italian messages keyed by field. */
export function serverFieldErrors(fields: Record<string, string>): FieldErrors {
  const out: FieldErrors = {};
  for (const [field, code] of Object.entries(fields)) out[field] = messageForFieldCode(field, code);
  return out;
}

// ---------------------------------------------------------------------------
// Field groups

/** Fields that have an input in the form (everything else is a form-level error). */
const FORM_FIELDS = new Set([
  ...STEP_A_FIELDS,
  "cap",
  "address",
  "street_number",
  "is_resident",
  "pod",
  "power_kw",
  "voltage",
  "pdr",
  "gas_uses",
  "current_supplier_luce",
  "current_supplier_gas",
  "iban",
  "iban_holder_first_name",
  "iban_holder_last_name",
  "iban_holder_tax_code",
  "document_type",
  "document_number",
  "document_expiry",
  "document_issuer",
]);

/**
 * Splits errors into the ones shown under an input and the "general" ones
 * (chosen offer no longer available, unknown comune, Page 1 data...).
 */
export function splitFormErrors(errors: FieldErrors): { fields: FieldErrors; general: string[] } {
  const fields: FieldErrors = {};
  const general: string[] = [];
  for (const [k, v] of Object.entries(errors)) {
    if (FORM_FIELDS.has(k)) fields[k] = v;
    else if (!general.includes(v)) general.push(v);
  }
  return { fields, general };
}

// ---------------------------------------------------------------------------
// Derived values

/** CAP actually used: the typed/selected one, or the comune's only CAP. */
export function effectiveCap(state: FlowState): string {
  const caps = state.comune?.caps ?? [];
  const typed = state.activation.cap.trim();
  if (caps.length === 1) return caps[0];
  if (caps.length > 1) return caps.includes(typed) ? typed : "";
  return typed;
}

/** Gas uses shown/edited in Step B: the edited list, or the Page 1 one. */
export function effectiveGasUses(state: FlowState): GasUseId[] {
  return state.activation.gasUses ?? state.gasUses;
}

export interface SupplierOption {
  value: string;
  label: string;
}

/** Options of the "Attuale fornitore" dropdown for one commodity (Page 1 list order). */
export function supplierOptions(
  suppliers: readonly Supplier[],
  commodity: Commodity,
  currentId: string | null,
): SupplierOption[] {
  const list = suppliers
    .filter((s) => s.show_in_dropdown && (commodity === "luce" ? s.sells_luce : s.sells_gas))
    .sort((a, b) => a.sort_order - b.sort_order);
  const options = list.map((s) => ({ value: s.id, label: s.name }));
  if (currentId && !options.some((o) => o.value === currentId)) {
    const s = suppliers.find((x) => x.id === currentId);
    if (s) options.push({ value: s.id, label: s.name });
  }
  return options;
}

export const POWER_OTHER_VALUE = "altro";

export function powerOptions(): Array<{ value: string; label: string }> {
  return [
    ...POWER_KW_OPTIONS.map((kw) => ({
      value: String(kw),
      label: `${String(kw).replace(".", ",")} kW`,
    })),
    { value: POWER_OTHER_VALUE, label: "Altro" },
  ];
}

export function powerToSelectValue(kw: number | null): string {
  return kw === null ? POWER_OTHER_VALUE : String(kw);
}

export function powerFromSelectValue(value: string): number | null {
  if (value === POWER_OTHER_VALUE) return null;
  const n = Number(value);
  return POWER_KW_OPTIONS.includes(n) ? n : DEFAULT_POWER_KW;
}

// ---------------------------------------------------------------------------
// Validation

const filled = (v: string) => v.trim().length > 0;

function codeMessage(
  field: string,
  result: { ok: true; value: string } | { ok: false; error: string },
): string | null {
  return result.ok ? null : messageForFieldCode(field, result.error);
}

/** Step A: Dati intestatario. Returns Italian messages keyed by API field name. */
export function validateStepA(state: FlowState): FieldErrors {
  const errors: FieldErrors = {};
  const set = (field: string, message: string | null) => {
    if (message) errors[field] = message;
  };
  const a = state.activation;

  if (!filled(state.firstName)) errors.first_name = FIELD_REQUIRED_MESSAGES.first_name;
  if (!filled(state.lastName)) errors.last_name = FIELD_REQUIRED_MESSAGES.last_name;
  set("phone", codeMessage("phone", validatePhone(state.phone)));
  set(
    "tax_code",
    codeMessage(
      "tax_code",
      validateCodiceFiscale(a.taxCode, {
        firstName: state.firstName.trim(),
        lastName: state.lastName.trim(),
      }),
    ),
  );
  if (state.customerType === "business") {
    if (!filled(state.companyName)) errors.company_name = FIELD_REQUIRED_MESSAGES.company_name;
    set("vat_number", codeMessage("vat_number", validatePartitaIva(a.vatNumber)));
  }
  if (!a.housingTitle) errors.housing_title = FIELD_REQUIRED_MESSAGES.housing_title;
  return errors;
}

/** Step B: Fornitura. */
export function validateStepB(state: FlowState): FieldErrors {
  const errors: FieldErrors = {};
  const a = state.activation;
  const caps = state.comune?.caps ?? [];

  const cap = effectiveCap(state);
  if (caps.length > 1 && !cap) errors.cap = "Seleziona il CAP.";
  else if (!/^\d{5}$/.test(cap)) {
    errors.cap = cap ? "Inserisci un CAP di 5 cifre." : FIELD_REQUIRED_MESSAGES.cap;
  }
  if (!filled(a.address)) errors.address = FIELD_REQUIRED_MESSAGES.address;
  if (!filled(a.streetNumber)) errors.street_number = FIELD_REQUIRED_MESSAGES.street_number;
  if (a.isResident === null) errors.is_resident = FIELD_REQUIRED_MESSAGES.is_resident;

  if (includesLuce(state.commodity)) {
    const st = serviceTypeFor(state, "luce");
    if (needsCurrentSupplier(st) && !state.currentSupplierLuce) {
      errors.current_supplier_luce = FIELD_REQUIRED_MESSAGES.current_supplier_luce;
    }
    if (needsMeterCode(st) || filled(a.pod)) {
      const m = codeMessage("pod", validatePod(a.pod));
      if (m) errors.pod = m;
    }
    if (a.voltage === null) errors.voltage = FIELD_REQUIRED_MESSAGES.voltage;
  }

  if (includesGas(state.commodity)) {
    const st = serviceTypeFor(state, "gas");
    if (needsCurrentSupplier(st) && !state.currentSupplierGas) {
      errors.current_supplier_gas = FIELD_REQUIRED_MESSAGES.current_supplier_gas;
    }
    if (needsMeterCode(st) || filled(a.pdr)) {
      const m = codeMessage("pdr", validatePdr(a.pdr));
      if (m) errors.pdr = m;
    }
    if (effectiveGasUses(state).length === 0) errors.gas_uses = FIELD_REQUIRED_MESSAGES.gas_uses;
  }
  Object.assign(errors, validatePaymentAndDocument(state));
  return errors;
}

/** Optional IBAN (+ different holder) and identity document data of Step B. */
export function validatePaymentAndDocument(state: FlowState, today: string = italianToday()): FieldErrors {
  const errors: FieldErrors = {};
  const a = state.activation;

  if (filled(a.iban)) {
    const m = codeMessage("iban", validateIban(a.iban));
    if (m) errors.iban = m;
    if (a.ibanHolderDifferent) {
      if (!filled(a.ibanHolderFirstName)) errors.iban_holder_first_name = FIELD_REQUIRED_MESSAGES.iban_holder_first_name;
      if (!filled(a.ibanHolderLastName)) errors.iban_holder_last_name = FIELD_REQUIRED_MESSAGES.iban_holder_last_name;
      const cf = codeMessage(
        "iban_holder_tax_code",
        validateCodiceFiscale(a.ibanHolderTaxCode, {
          firstName: a.ibanHolderFirstName.trim(),
          lastName: a.ibanHolderLastName.trim(),
        }),
      );
      if (cf) errors.iban_holder_tax_code = cf;
    }
  }

  const anyDocument =
    a.documentType !== null || filled(a.documentNumber) || filled(a.documentExpiry) || filled(a.documentIssuer);
  if (anyDocument) {
    if (a.documentType === null) errors.document_type = DOCUMENT_REQUIRED_MESSAGE;
    if (!filled(a.documentNumber)) errors.document_number = DOCUMENT_REQUIRED_MESSAGE;
    else if (!validateDocumentNumber(a.documentNumber).ok) {
      errors.document_number = DOCUMENT_FIELD_MESSAGES.document_number.format;
    }
    if (!filled(a.documentExpiry)) errors.document_expiry = DOCUMENT_REQUIRED_MESSAGE;
    else if (!validateIsoDate(a.documentExpiry).ok) errors.document_expiry = DOCUMENT_FIELD_MESSAGES.document_expiry.invalid;
    else if (a.documentExpiry.trim() < today) errors.document_expiry = DOCUMENT_PAST_MESSAGE;
    if (!filled(a.documentIssuer)) errors.document_issuer = DOCUMENT_REQUIRED_MESSAGE;
    else if (a.documentIssuer.trim().length < 2) errors.document_issuer = "Inserisci l'ente di rilascio.";
  }
  return errors;
}

/** IBAN in groups of four for display ("IT60 X054 ..."). */
export function groupIban(value: string): string {
  return normalizeIban(value).replace(/(.{4})(?=.)/g, "$1 ");
}

/** Non-blocking POD/comune hint of Step B (null when nothing to say). */
export function podWarning(state: FlowState): string | null {
  const pod = validatePod(state.activation.pod);
  if (!pod.ok || !state.comune) return null;
  return podDistributorComuneWarning(pod.value, state.comune.istat);
}

export const UPLOAD_ERROR_MESSAGES: Record<string, string> = {
  file_type: "Formato non supportato: carica un file JPG o PDF.",
  file_size: "Il file supera il limite di 4 MB, anche dopo la riduzione. Prova con un file più leggero.",
  image_decode: "Formato immagine non supportato da questo browser. Carica una foto JPG o un PDF.",
  file_content: "Il file non sembra un JPG o PDF valido.",
  file_missing: "Il file è vuoto: scegline un altro.",
  too_many_files: "Puoi caricare al massimo 2 file.",
};

/** Italian message for a failed document upload (never blocks the submit). */
export function uploadErrorMessage(code: string): string {
  return UPLOAD_ERROR_MESSAGES[code] ?? "Caricamento non riuscito, riprova.";
}

/** Italian message for a failed document removal (the item stays in the list). */
export function removeErrorMessage(code: string): string {
  switch (code) {
    case "rate_limited":
      return "Troppe richieste: attendi qualche istante e riprova.";
    case "network_error":
      return "Connessione assente: controlla la rete e riprova.";
    case "lead_not_found":
    case "no_lead":
      return "Sessione scaduta: ricarica la pagina e riprova.";
    default:
      return "Non siamo riusciti a rimuovere il file, riprova.";
  }
}

/** "1,2 MB" / "340 KB" / "512 B". */
export function formatUploadSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

// ---------------------------------------------------------------------------
// Submit

/**
 * Activation data with the values the validators normalise (CF upper-case, POD cut to 14,
 * PDR without spaces, the comune's only CAP) so the stored state and the payload match.
 */
export function normalizeActivation(state: FlowState): FlowState["activation"] {
  const a = state.activation;
  const cf = validateCodiceFiscale(a.taxCode);
  const piva = validatePartitaIva(a.vatNumber);
  const pod = validatePod(a.pod);
  const pdr = validatePdr(a.pdr);
  const iban = validateIban(a.iban);
  const holderCf = validateCodiceFiscale(a.ibanHolderTaxCode);
  return {
    ...a,
    iban: iban.ok ? iban.value : normalizeIban(a.iban),
    ibanHolderTaxCode: holderCf.ok ? holderCf.value : a.ibanHolderTaxCode.trim(),
    ibanHolderFirstName: a.ibanHolderFirstName.trim(),
    ibanHolderLastName: a.ibanHolderLastName.trim(),
    documentNumber: a.documentNumber.trim(),
    documentIssuer: a.documentIssuer.trim(),
    taxCode: cf.ok ? cf.value : a.taxCode.trim(),
    vatNumber: piva.ok ? piva.value : a.vatNumber.trim(),
    pod: pod.ok ? pod.value : a.pod.trim(),
    pdr: pdr.ok ? pdr.value : a.pdr.trim(),
    cap: effectiveCap(state),
    address: a.address.trim(),
    streetNumber: a.streetNumber.trim(),
    gasUses: includesGas(state.commodity) ? effectiveGasUses(state) : a.gasUses,
  };
}

export function normalizeForSubmit(state: FlowState): FlowState {
  return {
    ...state,
    firstName: state.firstName.trim(),
    lastName: state.lastName.trim(),
    phone: state.phone.trim(),
    companyName: state.companyName.trim(),
    activation: normalizeActivation(state),
  };
}

/** Payload of POST /api/lead/complete for the current state. */
export function buildSubmitPayload(state: FlowState) {
  return toLeadCompleteData(normalizeForSubmit(state));
}

// ---------------------------------------------------------------------------
// Route guard

/**
 * Where to send the customer when the activation page cannot render:
 * "/" when Page 1 data is missing, "/offerte" when an offer is not chosen yet,
 * "/grazie" when the lead is already completed, null when the form can render.
 */
export function activationRedirect(state: FlowState): string | null {
  if (state.leadCompleted) return "/grazie";
  if (!state.commodity || !state.customerType || !state.comune || !state.serviceType) return "/";
  if (includesLuce(state.commodity) && !state.chosenOffers.luce) return "/offerte";
  if (includesGas(state.commodity) && !state.chosenOffers.gas) return "/offerte";
  return null;
}
