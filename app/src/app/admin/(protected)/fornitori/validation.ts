import { z } from "zod";
import { MAX_LOGO_BYTES } from "@/lib/data";
import { SLUG_MAX, SLUG_PATTERN, slugify } from "./slug";

export type SupplierField = "name" | "slug" | "sort_order" | "logo";

export interface SupplierFormValues {
  name: string;
  slug: string;
  sells_luce: boolean;
  sells_gas: boolean;
  show_in_dropdown: boolean;
  active: boolean;
  sort_order: number;
}

export type ParsedSupplierForm =
  | { ok: true; values: SupplierFormValues; logo: File | null; removeLogo: boolean }
  | { ok: false; errors: Partial<Record<SupplierField, string>> };

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Inserisci il nome del fornitore.")
    .max(80, "Il nome può contenere al massimo 80 caratteri."),
  slug: z
    .string()
    .trim()
    .min(1, "Inserisci lo slug.")
    .max(SLUG_MAX, `Lo slug può contenere al massimo ${SLUG_MAX} caratteri.`)
    .regex(SLUG_PATTERN, "Lo slug può contenere solo lettere minuscole, numeri e trattini."),
  sort_order: z
    .number("Inserisci un numero intero.")
    .int("Inserisci un numero intero.")
    .min(0, "L'ordine deve essere compreso tra 0 e 9999.")
    .max(9999, "L'ordine deve essere compreso tra 0 e 9999."),
});

const isOn = (v: FormDataEntryValue | null) => v === "on" || v === "true";

/** Validates the supplier form (server side; the client only mirrors it for convenience). */
export function parseSupplierForm(fd: FormData): ParsedSupplierForm {
  const rawName = String(fd.get("name") ?? "");
  const rawSlug = String(fd.get("slug") ?? "").trim();
  const rawOrder = String(fd.get("sort_order") ?? "").trim();

  const parsed = schema.safeParse({
    name: rawName,
    // An empty slug is derived from the name; a typed one is normalised (spaces, accents, case).
    slug: rawSlug === "" ? slugify(rawName) : slugify(rawSlug),
    sort_order: rawOrder === "" ? Number.NaN : Number(rawOrder),
  });

  const errors: Partial<Record<SupplierField, string>> = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as SupplierField;
      errors[key] ??= issue.message;
    }
  }

  let logo: File | null = null;
  const file = fd.get("logo");
  if (file instanceof File && file.size > 0) {
    const looksSvg = /\.svg$/i.test(file.name) || file.type === "image/svg+xml";
    if (!looksSvg) errors.logo = "Carica un file in formato SVG.";
    else if (file.size > MAX_LOGO_BYTES) errors.logo = "Il file supera il limite di 200 KB.";
    else logo = file;
  }

  if (!parsed.success || Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    values: {
      ...parsed.data,
      sells_luce: isOn(fd.get("sells_luce")),
      sells_gas: isOn(fd.get("sells_gas")),
      show_in_dropdown: isOn(fd.get("show_in_dropdown")),
      active: isOn(fd.get("active")),
    },
    logo,
    removeLogo: logo === null && isOn(fd.get("remove_logo")),
  };
}
