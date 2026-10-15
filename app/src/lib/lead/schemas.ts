/**
 * Request schemas for the lead API (zod). Every object is strict: unknown keys
 * (including server-managed columns such as id, token, status, notes) are rejected.
 *
 * Field error codes returned to the client (422 `fields`):
 * - "required"       missing / null where a value is mandatory
 * - "invalid"        wrong type, enum value, range or length
 * - "unknown_field"  key not accepted by this route
 * - validator codes  from src/lib/logic/validators (e.g. "format", "checksum",
 *                    "surname_mismatch", "name_mismatch", "prefix", "length")
 * - "not_available"  chosen offer not active / not visible for the customer type
 * - "not_found"      comune ISTAT code unknown
 */
import { z } from "zod";
import { APPLIANCES, GAS_USES, type ApplianceId, type GasUseId } from "@/config/consumption";
import {
  validateCodiceFiscale,
  validatePartitaIva,
  validatePdr,
  validatePhone,
  validatePod,
  type ValidationResult,
} from "@/lib/logic/validators";
import type { LeadData } from "@/lib/data/types";
import { POWER_KW_OPTIONS } from "./rules";

export type FieldErrors = Record<string, string>;

const APPLIANCE_IDS = APPLIANCES.map((a) => a.id) as [ApplianceId, ...ApplianceId[]];
const GAS_USE_IDS = GAS_USES.map((g) => g.id) as [GasUseId, ...GasUseId[]];

/** Turns a shared validator into a zod string schema that outputs the normalised value. */
function validated<E extends string>(validator: (v: string) => ValidationResult<E>) {
  return z.string().transform((value, ctx) => {
    const r = validator(value);
    if (!r.ok) {
      ctx.issues.push({ code: "custom", message: r.error, input: value });
      return z.NEVER;
    }
    return r.value;
  });
}

const text = (max: number) => z.string().trim().min(1).max(max);
/** Row ids (uuid in Supabase, slugs in the mock data). */
const rowId = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
const amount = (max: number) => z.number().finite().min(0).max(max);
const uniqueList = <T extends string>(values: [T, ...T[]]) =>
  z
    .array(z.enum(values))
    .max(values.length)
    .refine((a) => new Set(a).size === a.length);

/** Page 1 data (PRD §6) + results/offer choice. Writable on create, update and complete. */
const page1Fields = {
  commodity: z.enum(["luce", "gas", "dual"]).nullable(),
  customer_type: z.enum(["casa", "business"]).nullable(),
  first_name: text(80).nullable(),
  last_name: text(80).nullable(),
  phone: validated(validatePhone).nullable(),
  company_name: text(160).nullable(),
  comune_istat: z.string().regex(/^\d{6}$/).nullable(),
  service_type: z.enum(["cambio_fornitore", "subentro", "voltura", "primo_allaccio"]).nullable(),
  current_supplier_luce: rowId.nullable(),
  current_supplier_gas: rowId.nullable(),
  has_gas: z.boolean().nullable(),
  people: z.number().int().min(1).max(5).nullable(),
  appliances: uniqueList(APPLIANCE_IDS),
  gas_uses: uniqueList(GAS_USE_IDS),
  sqm_range: z.enum(["lt60", "60_90", "90_120", "gt120"]).nullable(),
  estimated_kwh_year: amount(10_000_000).nullable(),
  estimated_smc_year: amount(10_000_000).nullable(),
  manual_consumption: z.boolean().nullable(),
  final_kwh_month: amount(1_000_000).nullable(),
  final_smc_month: amount(1_000_000).nullable(),
  chosen_offer_luce: rowId.nullable(),
  chosen_offer_gas: rowId.nullable(),
  monthly_cost_shown: amount(1_000_000).nullable(),
  marketing_consent: z.boolean().nullable(),
};

/** Activation form data (PRD §10 Steps A + B). Format-validated with the shared validators. */
const activationFields = {
  tax_code: validated((v) => validateCodiceFiscale(v)).nullable(),
  vat_number: validated(validatePartitaIva).nullable(),
  housing_title: z.enum(["proprietario", "inquilino", "usufruttuario", "altro"]).nullable(),
  cap: z.string().regex(/^\d{5}$/).nullable(),
  address: text(200).nullable(),
  street_number: text(20).nullable(),
  is_resident: z.boolean().nullable(),
  pod: validated(validatePod).nullable(),
  /** One of POWER_KW_OPTIONS; null = "Altro". */
  power_kw: z
    .number()
    .refine((n) => POWER_KW_OPTIONS.includes(n))
    .nullable(),
  voltage: z.union([z.literal(220), z.literal(380)]).nullable(),
  pdr: validated(validatePdr).nullable(),
};

const leadFields = { ...page1Fields, ...activationFields };

/** POST /api/lead — data. privacy_consent must be literally true (checked first → 400). */
export const createDataSchema = z.strictObject({
  ...z.object(page1Fields).partial().shape,
  privacy_consent: z.literal(true),
});

/** PATCH /api/lead — data. step_reached may be "results" or "offer_chosen" (forward only). */
export const patchDataSchema = z
  .strictObject({
    ...leadFields,
    step_reached: z.enum(["results", "offer_chosen"]),
  })
  .partial();

/** POST /api/lead/complete — data (business rules checked by `checkCompletion`). */
export const completeDataSchema = z.strictObject(leadFields).partial();

export const createBodySchema = z.strictObject({ data: createDataSchema });
export const patchBodySchema = z.strictObject({ data: patchDataSchema });
export const completeBodySchema = z.strictObject({ data: completeDataSchema });

/** Client-facing input types (what the browser sends). */
export type LeadCreateData = z.input<typeof createDataSchema>;
export type LeadPatchData = z.input<typeof patchDataSchema>;
export type LeadCompleteData = z.input<typeof completeDataSchema>;

function valueAt(root: unknown, path: readonly PropertyKey[]): unknown {
  let cur: unknown = root;
  for (const key of path) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<PropertyKey, unknown>)[key];
  }
  return cur;
}

/**
 * Maps zod issues to `{ field: code }`; paths are reported relative to `data`.
 * `input` is the parsed value, used to tell "required" (missing) from "invalid".
 */
export function zodFieldErrors(error: z.ZodError, input?: unknown): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of error.issues) {
    if (issue.code === "unrecognized_keys") {
      const objPath = issue.path[0] === "data" ? issue.path.slice(1) : issue.path;
      const prefix = objPath.length ? `${objPath.map(String).join(".")}.` : "";
      for (const key of issue.keys) fields[`${prefix}${key}`] ??= "unknown_field";
      continue;
    }
    // `data.<field>` → "<field>"; a problem with `data` itself → "data".
    const path = issue.path[0] === "data" && issue.path.length > 1 ? issue.path.slice(1) : issue.path;
    const key = path.length ? String(path[0]) : "_body";
    let code = "invalid";
    if (issue.code === "custom" && issue.message && /^[a-z_]+$/.test(issue.message)) {
      code = issue.message;
    } else if (issue.code === "invalid_type" && valueAt(input, issue.path) === undefined) {
      code = "required";
    }
    fields[key] ??= code;
  }
  return fields;
}

export type ParsedCreateData = z.output<typeof createDataSchema>;
export type ParsedPatchData = z.output<typeof patchDataSchema>;
export type ParsedCompleteData = z.output<typeof completeDataSchema>;

/** Compile-time guard: every schema output is assignable to the repository's LeadData. */
type AssertLeadData<T extends LeadData> = T;
export type _CreateIsLeadData = AssertLeadData<ParsedCreateData>;
export type _PatchIsLeadData = AssertLeadData<ParsedPatchData>;
export type _CompleteIsLeadData = AssertLeadData<ParsedCompleteData>;
