import { fail, ok, type ValidationResult } from "./types";

export type PdrError = "empty" | "looksLikePod" | "format" | "length";

/** Uppercases and removes spaces, dots and hyphens. */
export function normalizePdr(value: string): string {
  return value.replace(/[\s.-]+/g, "").toUpperCase();
}

/** True when the value looks like an electricity POD (IT + 3 digits + E...) typed in the PDR field. */
export function looksLikePod(normalized: string): boolean {
  return /^IT\d{3}E/.test(normalized);
}

/** PDR: exactly 14 digits (spaces, dots and hyphens are ignored). */
export function validatePdr(value: string): ValidationResult<PdrError> {
  const v = normalizePdr(value);
  if (v === "") return fail("empty");
  if (looksLikePod(v)) return fail("looksLikePod");
  if (!/^\d+$/.test(v)) return fail("format");
  if (v.length !== 14) return fail("length");
  return ok(v);
}

export const PDR_MESSAGES: Record<PdrError, string> = {
  empty: "Inserisci il codice PDR.",
  looksLikePod: "Sembra un codice POD (luce): qui serve il PDR del gas, 14 cifre.",
  format: "Il PDR deve contenere solo cifre.",
  length: "Il PDR deve essere di 14 cifre.",
};
