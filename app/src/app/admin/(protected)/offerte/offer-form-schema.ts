import { z } from "zod";
import { isRealSupplier } from "@/lib/data/types";
import type { Commodity, Offer, OfferCreateInput, OfferCustomerType, Supplier } from "@/lib/data/types";

/** Raw (string) values of the offer form: what the browser posts. */
export type FeePeriod = "month" | "year";

export interface OfferFormValues {
  supplier_id: string;
  name: string;
  commodity: Commodity;
  customer_type: OfferCustomerType;
  energy_price: string;
  other_variable_costs: string;
  fixed_fee: string;
  fixed_fee_period: FeePeriod;
  other_fixed_costs: string;
  other_fixed_costs_period: FeePeriod;
  locked_months: string;
  activation_cost: string;
  promo_text: string;
  advantages: string[];
  details: string;
  featured: boolean;
  active: boolean;
  price_verified: boolean;
}

export const MAX_ADVANTAGES = 30;
export const MAX_ADVANTAGE_LENGTH = 300;
export const MAX_NAME_LENGTH = 160;
export const MAX_PROMO_LENGTH = 500;
export const MAX_DETAILS_LENGTH = 10_000;

/** Limits mirror the CHECK constraints of the `offers` table. */
const PRICE_DECIMALS = 6;
const PRICE_MAX = 100; // exclusive
const FEE_DECIMALS = 4;
const FEE_MAX = 100_000; // exclusive
const ACTIVATION_DECIMALS = 2;
const LOCK_MIN = 1;
const LOCK_MAX = 120;

export const DEFAULT_OFFER_VALUES: OfferFormValues = {
  supplier_id: "",
  name: "",
  commodity: "luce",
  customer_type: "both",
  energy_price: "",
  other_variable_costs: "0",
  fixed_fee: "",
  fixed_fee_period: "month",
  other_fixed_costs: "0",
  other_fixed_costs_period: "month",
  locked_months: "12",
  activation_cost: "0,00",
  promo_text: "",
  advantages: [],
  details: "",
  featured: false,
  active: true,
  price_verified: false,
};

/**
 * Parses an Italian-style decimal ("0,129", "1.234,56") or a plain one ("0.129").
 * Returns null when the text is not a non-negative decimal number.
 * With a comma present, dots are thousands separators; without it a dot is the decimal mark.
 */
export function parseDecimal(raw: string): { value: number; decimals: number } | null {
  const text = raw.trim().replace(/\s+/g, "");
  if (!text) return null;
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  const decimals = normalized.includes(".") ? normalized.split(".")[1].length : 0;
  return { value, decimals };
}

/** Rounds to `digits` decimals, float-noise tolerant. */
export function roundTo(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round((value + Number.EPSILON) * f) / f;
}

/** Yearly amount -> monthly amount as stored (÷ 12, 4 decimals). */
export function yearlyToMonthly(yearly: number): number {
  return roundTo(yearly / 12, FEE_DECIMALS);
}

/** Number -> Italian input text: comma, at least `minDecimals`, trailing zeros trimmed beyond. */
export function toInputDecimal(value: number, minDecimals = 2, maxDecimals = 6): string {
  let text = value.toFixed(maxDecimals);
  const [int, frac = ""] = text.split(".");
  let trimmed = frac;
  while (trimmed.length > minDecimals && trimmed.endsWith("0")) trimmed = trimmed.slice(0, -1);
  text = trimmed ? `${int},${trimmed}` : int;
  return text;
}

function decimalField(label: string, opts: { decimals: number; max: number }) {
  return z.string().transform((raw, ctx): number => {
    if (!raw.trim()) {
      ctx.addIssue({ code: "custom", message: `${label}: campo obbligatorio.` });
      return z.NEVER;
    }
    const parsed = parseDecimal(raw);
    if (!parsed) {
      ctx.addIssue({ code: "custom", message: `${label}: inserisci un numero (es. 0,1290).` });
      return z.NEVER;
    }
    if (parsed.decimals > opts.decimals) {
      ctx.addIssue({
        code: "custom",
        message: `${label}: al massimo ${opts.decimals} decimali.`,
      });
      return z.NEVER;
    }
    if (parsed.value >= opts.max) {
      ctx.addIssue({ code: "custom", message: `${label}: valore troppo alto.` });
      return z.NEVER;
    }
    return parsed.value;
  });
}

const trimmedOptional = (max: number, label: string) =>
  z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().max(max, `${label}: al massimo ${max} caratteri.`))
    .transform((s) => (s === "" ? null : s));

const offerSchema = z.object({
  supplier_id: z.string().trim().min(1, "Seleziona un fornitore."),
  name: z
    .string()
    .trim()
    .min(1, "Inserisci il nome dell'offerta.")
    .max(MAX_NAME_LENGTH, `Al massimo ${MAX_NAME_LENGTH} caratteri.`),
  commodity: z.enum(["luce", "gas"], { error: "Seleziona luce o gas." }),
  customer_type: z.enum(["casa", "business", "both"], { error: "Seleziona il tipo di cliente." }),
  energy_price: decimalField("Prezzo energia", { decimals: PRICE_DECIMALS, max: PRICE_MAX }),
  other_variable_costs: decimalField("Altri costi variabili", {
    decimals: PRICE_DECIMALS,
    max: PRICE_MAX,
  }),
  fixed_fee: decimalField("Quota fissa", { decimals: FEE_DECIMALS, max: FEE_MAX }),
  fixed_fee_period: z.enum(["month", "year"]),
  other_fixed_costs: decimalField("Altri costi fissi", { decimals: FEE_DECIMALS, max: FEE_MAX }),
  other_fixed_costs_period: z.enum(["month", "year"]),
  locked_months: z.string().transform((raw, ctx): number => {
    const text = raw.trim();
    if (!/^\d+$/.test(text)) {
      ctx.addIssue({ code: "custom", message: "Inserisci un numero intero di mesi." });
      return z.NEVER;
    }
    const n = Number(text);
    if (n < LOCK_MIN || n > LOCK_MAX) {
      ctx.addIssue({
        code: "custom",
        message: `I mesi di blocco devono essere tra ${LOCK_MIN} e ${LOCK_MAX}.`,
      });
      return z.NEVER;
    }
    return n;
  }),
  activation_cost: decimalField("Costo di attivazione", {
    decimals: ACTIVATION_DECIMALS,
    max: FEE_MAX,
  }),
  promo_text: trimmedOptional(MAX_PROMO_LENGTH, "Testo promo"),
  advantages: z
    .array(z.string())
    .transform((list) => list.map((s) => s.trim()).filter((s) => s !== ""))
    .pipe(
      z
        .array(z.string().max(MAX_ADVANTAGE_LENGTH, `Ogni vantaggio: al massimo ${MAX_ADVANTAGE_LENGTH} caratteri.`))
        .max(MAX_ADVANTAGES, `Al massimo ${MAX_ADVANTAGES} vantaggi.`),
    ),
  details: trimmedOptional(MAX_DETAILS_LENGTH, "Dettagli"),
  featured: z.boolean(),
  active: z.boolean(),
  price_verified: z.boolean(),
});

export type OfferFieldErrors = Partial<Record<keyof OfferFormValues, string>>;

export type OfferParseResult =
  | { ok: true; data: OfferCreateInput }
  | { ok: false; errors: OfferFieldErrors };

/** Validates the raw form values and builds the repository input (fees stored monthly). */
export function parseOfferForm(values: OfferFormValues): OfferParseResult {
  const result = offerSchema.safeParse(values);
  if (!result.success) {
    const errors: OfferFieldErrors = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "") as keyof OfferFormValues;
      if (key && !errors[key]) errors[key] = issue.message;
    }
    return { ok: false, errors };
  }
  const v = result.data;
  const monthly = (amount: number, period: FeePeriod) =>
    period === "year" ? yearlyToMonthly(amount) : roundTo(amount, FEE_DECIMALS);
  return {
    ok: true,
    data: {
      supplier_id: v.supplier_id,
      name: v.name,
      commodity: v.commodity,
      customer_type: v.customer_type,
      price_type: "fixed",
      energy_price: v.energy_price,
      other_variable_costs: v.other_variable_costs,
      fixed_fee_monthly: monthly(v.fixed_fee, v.fixed_fee_period),
      other_fixed_costs_monthly: monthly(v.other_fixed_costs, v.other_fixed_costs_period),
      locked_months: v.locked_months,
      activation_cost: v.activation_cost,
      promo_text: v.promo_text,
      advantages: v.advantages,
      details: v.details,
      featured: v.featured,
      // iban_required / featured_audience are deliberately not sent: the DB trigger
      // offers_sync_featured derives the audience and edits keep IBAN/audience.
      // T14.9 adds the real fields to this form.
      active: v.active,
      price_verified: v.price_verified,
    },
  };
}

/** Form values for an existing offer (fees shown per month, as stored). */
export function offerToFormValues(offer: Offer): OfferFormValues {
  return {
    supplier_id: offer.supplier_id,
    name: offer.name,
    commodity: offer.commodity,
    customer_type: offer.customer_type,
    energy_price: toInputDecimal(offer.energy_price, 4),
    other_variable_costs: toInputDecimal(offer.other_variable_costs, 4),
    fixed_fee: toInputDecimal(offer.fixed_fee_monthly),
    fixed_fee_period: "month",
    other_fixed_costs: toInputDecimal(offer.other_fixed_costs_monthly),
    other_fixed_costs_period: "month",
    locked_months: String(offer.locked_months),
    activation_cost: toInputDecimal(offer.activation_cost, 2, 2),
    promo_text: offer.promo_text ?? "",
    advantages: [...offer.advantages],
    details: offer.details ?? "",
    featured: offer.featured,
    active: offer.active,
    price_verified: offer.price_verified,
  };
}

/** Reads the posted FormData into raw form values (unknown/missing fields get safe defaults). */
export function formDataToValues(formData: FormData): OfferFormValues {
  const str = (key: string) => {
    const v = formData.get(key);
    return typeof v === "string" ? v : "";
  };
  const period = (key: string): FeePeriod => (str(key) === "year" ? "year" : "month");
  return {
    supplier_id: str("supplier_id"),
    name: str("name"),
    commodity: str("commodity") as Commodity,
    customer_type: str("customer_type") as OfferCustomerType,
    energy_price: str("energy_price"),
    other_variable_costs: str("other_variable_costs"),
    fixed_fee: str("fixed_fee"),
    fixed_fee_period: period("fixed_fee_period"),
    other_fixed_costs: str("other_fixed_costs"),
    other_fixed_costs_period: period("other_fixed_costs_period"),
    locked_months: str("locked_months"),
    activation_cost: str("activation_cost"),
    promo_text: str("promo_text"),
    advantages: formData.getAll("advantages").filter((v): v is string => typeof v === "string"),
    details: str("details"),
    featured: formData.get("featured") === "on",
    active: formData.get("active") === "on",
    price_verified: formData.get("price_verified") === "on",
  };
}

export interface OfferFormState {
  errors: OfferFieldErrors;
  /** Form-level error (not tied to a field). */
  message?: string;
  /** Incremented on every failed submit. */
  attempt: number;
}

export const INITIAL_OFFER_FORM_STATE: OfferFormState = { errors: {}, attempt: 0 };

export const PLACEHOLDER_SUPPLIER_ERROR =
  "Questo fornitore è un segnaposto e non può avere offerte. Scegli un fornitore reale.";

export interface SupplierChoice {
  id: string;
  name: string;
  active: boolean;
  /** Placeholder (Tutela / Altro fornitore / Non lo so): only listed when it is the offer's current supplier. */
  placeholder: boolean;
}

/**
 * Suppliers offered by the offer form's select: real suppliers only, plus the supplier the
 * offer already references (even a placeholder) so the form never silently changes it.
 */
export function buildSupplierChoices(suppliers: Supplier[], currentSupplierId?: string | null): SupplierChoice[] {
  return suppliers
    .filter((s) => isRealSupplier(s) || s.id === currentSupplierId)
    .map((s) => ({ id: s.id, name: s.name, active: s.active, placeholder: !isRealSupplier(s) }));
}

/**
 * Server-side rule: a placeholder supplier cannot be assigned to an offer, unless the offer
 * already references it (an unchanged assignment on edit). Returns the Italian error or null.
 */
export function placeholderAssignmentError(
  chosen: Pick<Supplier, "id" | "is_placeholder"> | null,
  currentSupplierId: string | null,
): string | null {
  if (!chosen || isRealSupplier(chosen)) return null;
  return chosen.id === currentSupplierId ? null : PLACEHOLDER_SUPPLIER_ERROR;
}
