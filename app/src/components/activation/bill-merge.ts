/**
 * Pure merge logic of the bill review dialog (SPEC decision #21).
 * The values read from the bill are only proposals: empty fields are filled, a field the customer
 * already typed with a different value is replaced only if the customer ticks "Sostituisci".
 */
import type { ParsedBill } from "@/lib/bill/parse";
import type { Supplier } from "@/lib/data/types";
import { validateCodiceFiscale } from "@/lib/logic/validators";

export const BILL_FIELDS = ["pod", "pdr", "taxCode", "supplierLuce", "supplierGas"] as const;
export type BillField = (typeof BILL_FIELDS)[number];
/** Value per field ("" = nothing). Suppliers are supplier ids (the select values). */
export type BillValues = Record<BillField, string>;

export const EMPTY_BILL_VALUES: BillValues = { pod: "", pdr: "", taxCode: "", supplierLuce: "", supplierGas: "" };

/** Which fields exist in the current flow (commodity / service type). */
export interface BillFieldAvailability {
  pod: boolean;
  pdr: boolean;
  supplierLuce: boolean;
  supplierGas: boolean;
}

export function isFieldAvailable(field: BillField, avail: BillFieldAvailability): boolean {
  return field === "taxCode" ? true : avail[field];
}

/** Draft shown in the dialog: parsed values restricted to the fields present in the flow. */
export function buildBillDraft(
  parsed: ParsedBill,
  suppliers: readonly Supplier[],
  avail: BillFieldAvailability,
): BillValues {
  const draft: BillValues = { ...EMPTY_BILL_VALUES };
  if (avail.pod && parsed.pod) draft.pod = parsed.pod;
  if (avail.pdr && parsed.pdr) draft.pdr = parsed.pdr;
  if (parsed.taxCode) draft.taxCode = parsed.taxCode;
  if (parsed.supplierSlug) {
    const s = suppliers.find((x) => x.slug === parsed.supplierSlug);
    if (s) {
      if (avail.supplierLuce && s.sells_luce && s.show_in_dropdown) draft.supplierLuce = s.id;
      if (avail.supplierGas && s.sells_gas && s.show_in_dropdown) draft.supplierGas = s.id;
    }
  }
  return draft;
}

/** True when at least one proposable value exists (otherwise: "inseriscili a mano"). */
export function hasBillValues(draft: BillValues): boolean {
  return BILL_FIELDS.some((f) => draft[f].trim() !== "");
}

/** Fields where the dialog value differs from what the customer already has. */
export function billConflicts(draft: BillValues, current: BillValues): BillField[] {
  return BILL_FIELDS.filter((f) => {
    const d = draft[f].trim();
    const c = current[f].trim();
    return d !== "" && c !== "" && d !== c;
  });
}

/** Values to write on confirm: empty fields filled, conflicts only when ticked. */
export function planBillMerge(
  draft: BillValues,
  current: BillValues,
  replace: Partial<Record<BillField, boolean>>,
): Partial<BillValues> {
  const out: Partial<BillValues> = {};
  const conflicts = new Set(billConflicts(draft, current));
  for (const f of BILL_FIELDS) {
    const d = draft[f].trim();
    if (d === "" || d === current[f].trim()) continue;
    if (conflicts.has(f) && !replace[f]) continue;
    out[f] = d;
  }
  return out;
}

/**
 * The bill holder may be someone else (Subentro / Voltura): a codice fiscale that fails the step-A
 * name check is not proposed, so it cannot block "Conferma" for POD / PDR / supplier.
 */
export function dropMismatchedTaxCode(
  draft: BillValues,
  names: { firstName: string; lastName: string },
): BillValues {
  if (draft.taxCode.trim() === "") return draft;
  return validateCodiceFiscale(draft.taxCode, names).ok ? draft : { ...draft, taxCode: "" };
}
