import { fail, ok, type ValidationResult } from "./types";

export type IbanError = "empty" | "format" | "country" | "length" | "checksum";

/** IBAN length per country (ISO 13616 registry): Italy and the SEPA countries. */
export const IBAN_LENGTHS: Record<string, number> = {
  AD: 24, AT: 20, BE: 16, BG: 22, CH: 21, CY: 28, CZ: 24, DE: 22, DK: 18, EE: 20,
  ES: 24, FI: 18, FR: 27, GB: 22, GI: 23, GR: 27, HR: 21, HU: 28, IE: 22, IS: 26,
  IT: 27, LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MT: 31, NL: 18, NO: 15, PL: 28,
  PT: 25, RO: 24, SE: 24, SI: 19, SK: 24, SM: 27, VA: 22,
};

/** Uppercases and removes spaces, dots and hyphens. */
export function normalizeIban(value: string): string {
  return value.replace(/[\s.-]+/g, "").toUpperCase();
}

/** ISO 7064 mod-97 over the rearranged IBAN, chunked (no BigInt needed). */
function mod97(iban: string): number {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const digits = ch >= "A" && ch <= "Z" ? String(ch.charCodeAt(0) - 55) : ch;
    for (const d of digits) remainder = (remainder * 10 + Number(d)) % 97;
  }
  return remainder;
}

export function validateIban(value: string): ValidationResult<IbanError> {
  const v = normalizeIban(value);
  if (v === "") return fail("empty");
  if (!/^[A-Z0-9]+$/.test(v) || !/^[A-Z]{2}\d{2}/.test(v)) return fail("format");
  const expected = IBAN_LENGTHS[v.slice(0, 2)];
  if (expected === undefined) return fail("country");
  if (v.length !== expected) return fail("length");
  if (mod97(v) !== 1) return fail("checksum");
  return ok(v);
}

export const IBAN_MESSAGES: Record<IbanError, string> = {
  empty: "Inserisci l'IBAN.",
  format: "IBAN non valido: usa solo lettere e numeri, a partire dal codice paese (es. IT).",
  country: "IBAN non valido: paese non riconosciuto.",
  length: "IBAN non valido: la lunghezza non è corretta (gli IBAN italiani hanno 27 caratteri).",
  checksum: "IBAN non valido: controlla le cifre.",
};
