import { fail, ok, type ValidationResult } from "./types";

export type PhoneError = "empty" | "format";

/**
 * Italian mobile number: starts with 3, 9–10 digits total. Spaces, dots, hyphens and
 * parentheses (and Unicode spaces such as NBSP) are stripped; an optional +39 / 0039 prefix is
 * accepted and removed, as is a bare 39 prefix when the rest is a full 10-digit mobile number
 * (browser autofill emits "+39 333 1234567", "393331234567", ...).
 * Returns the national number only (e.g. "3331234567").
 */
export function validatePhone(value: string): ValidationResult<PhoneError> {
  const stripped = value.replace(/[\s.\-()]+/g, "");
  if (stripped === "") return fail("empty");
  const national = stripped.replace(/^(?:\+39|0039|39(?=3\d{9}$))/, "");
  if (!/^3\d{8,9}$/.test(national)) return fail("format");
  return ok(national);
}

export const PHONE_MESSAGES: Record<PhoneError, string> = {
  empty: "Inserisci il numero di cellulare.",
  format: "Inserisci un numero di cellulare italiano valido (es. 333 123 4567).",
};
