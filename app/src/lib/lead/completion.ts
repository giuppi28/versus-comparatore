/**
 * Server-side business rules for the final submit (PRD §10 "On submit").
 * Runs after `completeDataSchema` (types + formats) has passed.
 */
import type { Commodity, DocumentType, LeadData, Repository } from "@/lib/data";
import { validateCodiceFiscale } from "@/lib/logic/validators";
import type { FieldErrors, ParsedCompleteData, ParsedPatchData } from "./schemas";
import {
  effectiveServiceType,
  includesGas,
  includesLuce,
  needsCurrentSupplier,
  needsMeterCode,
} from "./rules";

export interface CompletionCheck {
  fields: FieldErrors;
  /** Normalised data to store: fields hidden for this flow are forced to null. */
  data: LeadData;
}

const isBlank = (v: unknown) => v === undefined || v === null || v === "";

/** Today's date ("YYYY-MM-DD") in Italy, used for the document expiry check. */
export function italianToday(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

const IBAN_HOLDER_FIELDS = [
  "iban_holder_first_name",
  "iban_holder_last_name",
  "iban_holder_tax_code",
] as const;

/**
 * PATCH /api/lead: light consistency on a partial update (formats already checked by the
 * schema). Clearing the IBAN or unticking "intestatario diverso" also clears the holder
 * fields; a document expiry in the past is rejected. Requirements are enforced on complete.
 */
export function checkPatchActivation(
  input: ParsedPatchData,
  today: string,
): { fields: FieldErrors; data: LeadData } {
  const fields: FieldErrors = {};
  const data: LeadData = { ...input };
  if (input.iban === null) {
    data.iban_holder_different = null;
    for (const k of IBAN_HOLDER_FIELDS) data[k] = null;
  } else if (input.iban_holder_different === false) {
    for (const k of IBAN_HOLDER_FIELDS) data[k] = null;
  }
  if (input.document_expiry && input.document_expiry < today) fields.document_expiry = "past";
  return { fields, data };
}

/**
 * Complete: optional IBAN (+ different account holder) and identity document data.
 * Writes the normalised values into `data` (absent → null, so the final submit is
 * authoritative) and the errors into `fields`.
 */
function checkActivationExtras(
  input: ParsedCompleteData,
  data: LeadData,
  fields: FieldErrors,
) {
  // IBAN: optional. The holder fields only mean something with an IBAN and the box ticked.
  if (isBlank(input.iban)) {
    data.iban = null;
    data.iban_holder_different = null;
    for (const k of IBAN_HOLDER_FIELDS) data[k] = null;
  } else if (input.iban_holder_different === true) {
    data.iban_holder_different = true;
    for (const k of IBAN_HOLDER_FIELDS) {
      if (isBlank(input[k])) fields[k] ??= "required";
    }
    if (input.iban_holder_tax_code && input.iban_holder_first_name && input.iban_holder_last_name) {
      const cf = validateCodiceFiscale(input.iban_holder_tax_code, {
        firstName: input.iban_holder_first_name,
        lastName: input.iban_holder_last_name,
      });
      if (!cf.ok) fields.iban_holder_tax_code = cf.error;
    }
  } else {
    data.iban_holder_different = false;
    for (const k of IBAN_HOLDER_FIELDS) data[k] = null;
  }

  // Identity document: resolved by resolveIdentityDocument() once the uploaded count is known.
}

/**
 * Synchronous rules: required fields per flow, CF ↔ name consistency, hidden fields
 * cleared, optional IBAN rules. `_today` is unused (document rules: resolveIdentityDocument).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function checkCompletion(input: ParsedCompleteData, _today: string = italianToday()): CompletionCheck {
  const fields: FieldErrors = {};
  const data: LeadData = { ...input };
  const require = (key: keyof ParsedCompleteData) => {
    if (isBlank(input[key])) fields[key] ??= "required";
  };

  // Flow choices (Page 1) — needed to know which Step B fields apply.
  require("commodity");
  require("customer_type");
  require("service_type");

  // Step A — Dati intestatario.
  require("first_name");
  require("last_name");
  require("phone");
  require("tax_code");
  require("housing_title");
  if (input.tax_code && input.first_name && input.last_name) {
    const cf = validateCodiceFiscale(input.tax_code, {
      firstName: input.first_name,
      lastName: input.last_name,
    });
    if (!cf.ok) fields.tax_code = cf.error;
  }
  if (input.customer_type === "business") {
    require("company_name");
    require("vat_number");
  } else {
    data.company_name = null;
    data.vat_number = null;
  }

  // Step B — Fornitura.
  require("comune_istat");
  require("cap");
  require("address");
  require("street_number");
  if (input.is_resident === undefined || input.is_resident === null) fields.is_resident = "required";

  const luce = includesLuce(input.commodity);
  const gas = includesGas(input.commodity);

  if (luce) {
    const st = effectiveServiceType("luce", input.service_type, input.has_gas);
    require("chosen_offer_luce");
    if (needsCurrentSupplier(st)) require("current_supplier_luce");
    else data.current_supplier_luce = null;
    if (needsMeterCode(st)) require("pod");
    // power_kw: null means "Altro", so only a missing key is an error.
    if (input.power_kw === undefined) fields.power_kw = "required";
    require("voltage");
  } else {
    Object.assign(data, {
      chosen_offer_luce: null,
      current_supplier_luce: null,
      pod: null,
      power_kw: null,
      voltage: null,
    });
  }

  if (gas) {
    const st = effectiveServiceType("gas", input.service_type, input.has_gas);
    require("chosen_offer_gas");
    if (needsCurrentSupplier(st)) require("current_supplier_gas");
    else data.current_supplier_gas = null;
    if (needsMeterCode(st)) require("pdr");
    if (!input.gas_uses || input.gas_uses.length === 0) fields.gas_uses = "required";
  } else {
    Object.assign(data, { chosen_offer_gas: null, current_supplier_gas: null, pdr: null });
  }

  checkActivationExtras(input, data, fields);

  return { fields, data };
}

/**
 * Integrity checks against the data source (anon-readable data only): chosen offers
 * must be active and visible for the customer type, and an IBAN is required when one
 * of them has `iban_required`; comune must exist.
 */
export async function checkCompletionReferences(
  repo: Repository,
  data: LeadData,
): Promise<FieldErrors> {
  const fields: FieldErrors = {};
  const customerType = data.customer_type;
  if (customerType) {
    const checks: Array<[Commodity, "chosen_offer_luce" | "chosen_offer_gas"]> = [
      ["luce", "chosen_offer_luce"],
      ["gas", "chosen_offer_gas"],
    ];
    for (const [commodity, key] of checks) {
      const id = data[key];
      if (!id) continue;
      const offers = await repo.listActiveOffers(commodity, customerType);
      const chosen = offers.find((o) => o.id === id);
      if (!chosen) fields[key] = "not_available";
      // IBAN-only offer: payment by IBAN is mandatory (SPEC #16). Read from the DB, never from the client.
      else if (chosen.iban_required && isBlank(data.iban)) fields.iban ??= "required";
    }
  }
  if (data.comune_istat) {
    const comune = await repo.getComune(data.comune_istat);
    if (!comune) fields.comune_istat = "not_found";
    // CAP is format-checked only: CAP lists in the datasets can be incomplete for big
    // cities, and a false rejection would block a real customer.
  }
  return fields;
}

/**
 * Identity document is mandatory (SPEC #39): the type is required, then EITHER enough uploaded
 * files (passport = 1, carta d'identità / patente = 2; the server stores no side, files are only
 * counted) OR manual number + issuer + expiry (formats already checked by the schema, expiry
 * not in the past). With the photo path satisfied the manual values are dropped (stored null).
 * Writes the normalised values into `data` and returns the 422 field errors:
 * - `document_type` required: no type;
 * - manual path attempted (at least one manual field sent): `document_number` /
 *   `document_issuer` / `document_expiry` = "required" (missing) or "past" (expiry);
 * - nothing attempted (photos not enough and no manual field): `id_document` = "required".
 */
export function resolveIdentityDocument(
  data: LeadData,
  uploadedCount: number,
  today: string,
): FieldErrors {
  const type: DocumentType | null | undefined = data.document_type;
  if (!type) return { document_type: "required" };
  const needed = type === "passaporto" ? 1 : 2;
  if (uploadedCount >= needed) {
    data.document_number = null;
    data.document_issuer = null;
    data.document_expiry = null;
    return {};
  }
  const issuer = typeof data.document_issuer === "string" ? data.document_issuer.trim() : "";
  const manual = {
    document_number: !isBlank(data.document_number),
    document_issuer: issuer !== "",
    document_expiry: !isBlank(data.document_expiry),
  };
  data.document_issuer = issuer === "" ? null : issuer;
  if (!manual.document_number) data.document_number = null;
  if (!manual.document_expiry) data.document_expiry = null;
  if (!manual.document_number && !manual.document_issuer && !manual.document_expiry) {
    return { id_document: "required" };
  }
  const fields: FieldErrors = {};
  for (const k of ["document_number", "document_issuer", "document_expiry"] as const) {
    if (!manual[k]) fields[k] = "required";
  }
  if (manual.document_expiry && data.document_expiry && data.document_expiry < today) {
    fields.document_expiry = "past";
  }
  return fields;
}
