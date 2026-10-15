/**
 * Server-side business rules for the final submit (PRD §10 "On submit").
 * Runs after `completeDataSchema` (types + formats) has passed.
 */
import type { Commodity, LeadData, Repository } from "@/lib/data";
import { validateCodiceFiscale } from "@/lib/logic/validators";
import type { FieldErrors, ParsedCompleteData } from "./schemas";
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

/** Synchronous rules: required fields per flow, CF ↔ name consistency, hidden fields cleared. */
export function checkCompletion(input: ParsedCompleteData): CompletionCheck {
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

  return { fields, data };
}

/**
 * Integrity checks against the data source (anon-readable data only): chosen offers
 * must be active and visible for the customer type; comune must exist.
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
      if (!offers.some((o) => o.id === id)) fields[key] = "not_available";
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
