import { fail, ok, type ValidationResult } from "./types";

export type PdrError = "empty" | "format" | "length";

/** PDR: exactly 14 digits (spaces and hyphens are ignored). */
export function validatePdr(value: string): ValidationResult<PdrError> {
  const v = value.replace(/[\s-]+/g, "");
  if (v === "") return fail("empty");
  if (!/^\d+$/.test(v)) return fail("format");
  if (v.length !== 14) return fail("length");
  return ok(v);
}

export const PDR_MESSAGES: Record<PdrError, string> = {
  empty: "Inserisci il codice PDR.",
  format: "Il PDR deve contenere solo cifre.",
  length: "Il PDR deve essere di 14 cifre.",
};
