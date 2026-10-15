import { fail, ok, type ValidationResult } from "./types";

export type PartitaIvaError = "empty" | "length" | "format" | "checksum";

/** Strips whitespace and an optional "IT" country prefix. */
export function normalizePartitaIva(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase().replace(/^IT(?=\d{11}$)/, "");
}

/** Official checksum: odd positions as-is, even positions doubled (-9 if > 9), sum % 10 === 0. */
function luhnOk(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    let d = digits.charCodeAt(i) - 48;
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

/** 11 digits with a valid checksum (an optional "IT" prefix is accepted and removed). */
export function validatePartitaIva(value: string): ValidationResult<PartitaIvaError> {
  const v = normalizePartitaIva(value);
  if (v === "") return fail("empty");
  if (!/^\d+$/.test(v)) return fail("format");
  if (v.length !== 11) return fail("length");
  if (/^0+$/.test(v) || !luhnOk(v)) return fail("checksum");
  return ok(v);
}

export const PARTITA_IVA_MESSAGES: Record<PartitaIvaError, string> = {
  empty: "Inserisci la partita IVA.",
  length: "La partita IVA deve essere di 11 cifre.",
  format: "La partita IVA deve contenere solo cifre.",
  checksum: "La partita IVA non è valida: controlla di averla scritta correttamente.",
};
