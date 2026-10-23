import { fail, ok, type ValidationResult } from "./types";

export type PodError = "empty" | "looksLikePdr" | "prefix" | "length" | "format";

/** Removes spaces, dots and hyphens, uppercases. */
export function normalizePod(value: string): string {
  return value.replace(/[\s.-]+/g, "").toUpperCase();
}

/**
 * POD: starts with "IT", 14 characters (letters/digits). 15 characters are accepted
 * and normalised to 14 by dropping the last one (PRD §10). Returns the 14-char value.
 */
export function validatePod(value: string): ValidationResult<PodError> {
  const v = normalizePod(value);
  if (v === "") return fail("empty");
  if (looksLikePdr(v)) return fail("looksLikePdr");
  if (!v.startsWith("IT")) return fail("prefix");
  if (v.length !== 14 && v.length !== 15) return fail("length");
  if (!/^IT[A-Z0-9]+$/.test(v)) return fail("format");
  return ok(v.slice(0, 14));
}

/** True when the value looks like a gas PDR (14 digits, optional IT prefix) typed in the POD field. */
export function looksLikePdr(normalized: string): boolean {
  return /^(IT)?\d{14}$/.test(normalized);
}

export const POD_MESSAGES: Record<PodError, string> = {
  empty: "Inserisci il codice POD.",
  looksLikePdr: "Sembra un codice PDR (gas): qui serve il POD della luce, che inizia con IT.",
  prefix: "Il POD deve iniziare con IT.",
  length: "Il POD deve essere di 14 caratteri.",
  format: "Il POD può contenere solo lettere e numeri.",
};
