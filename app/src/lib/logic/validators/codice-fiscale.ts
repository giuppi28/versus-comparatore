import { fail, ok, type ValidationResult } from "./types";

export type CodiceFiscaleError =
  | "empty"
  | "length"
  | "format"
  | "checksum"
  | "surname_mismatch"
  | "name_mismatch";

export interface CodiceFiscaleNames {
  firstName?: string | null;
  lastName?: string | null;
}

/** Digit positions (0-based) that may carry an omocodia letter. */
const OMOCODIA_POSITIONS = [6, 7, 9, 10, 12, 13, 14];
const OMOCODIA_LETTERS = "LMNPQRSTUV"; // index = the digit it replaces
const MONTH_LETTERS = "ABCDEHLMPRST";

const FORMAT_RE = /^[A-Z]{6}[0-9LMNP-V]{2}[A-Z][0-9LMNP-V]{2}[A-Z][0-9LMNP-V]{3}[A-Z]$/;

/** Official check-character tables (value of a character in odd / even position, 1-based). */
const ODD_VALUES: Record<string, number> = {
  "0": 1, "1": 0, "2": 5, "3": 7, "4": 9, "5": 13, "6": 15, "7": 17, "8": 19, "9": 21,
  A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21, K: 2, L: 4, M: 18,
  N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14, U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23,
};

function evenValue(ch: string): number {
  return ch >= "0" && ch <= "9" ? ch.charCodeAt(0) - 48 : ch.charCodeAt(0) - 65;
}

function checkChar(first15: string): string {
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    sum += i % 2 === 0 ? ODD_VALUES[first15[i]] : evenValue(first15[i]);
  }
  return String.fromCharCode(65 + (sum % 26));
}

/** Replaces omocodia letters with the digits they stand for (positions 6,7,9,10,12,13,14). */
function decodeOmocodia(cf: string): string {
  const chars = cf.split("");
  for (const p of OMOCODIA_POSITIONS) {
    const idx = OMOCODIA_LETTERS.indexOf(chars[p]);
    if (idx >= 0) chars[p] = String(idx);
  }
  return chars.join("");
}

/** Uppercase, accents removed, only A-Z kept (apostrophes, spaces, hyphens dropped). */
function lettersOnly(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

function splitLetters(text: string): { consonants: string[]; vowels: string[] } {
  const chars = text.split("");
  return {
    consonants: chars.filter((c) => !"AEIOU".includes(c)),
    vowels: chars.filter((c) => "AEIOU".includes(c)),
  };
}

function pad3(letters: string[]): string {
  return letters.concat(["X", "X", "X"]).slice(0, 3).join("");
}

/** 3-letter code of the surname: consonants, then vowels, then X. */
export function surnameCode(surname: string): string {
  const { consonants, vowels } = splitLetters(lettersOnly(surname));
  return pad3([...consonants, ...vowels]);
}

/**
 * 3-letter code of the first name: with 4+ consonants take the 1st, 3rd and 4th;
 * otherwise consonants, then vowels, then X.
 */
export function nameCode(name: string): string {
  const { consonants, vowels } = splitLetters(lettersOnly(name));
  if (consonants.length >= 4) return consonants[0] + consonants[2] + consonants[3];
  return pad3([...consonants, ...vowels]);
}

export function normalizeCodiceFiscale(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

/**
 * Validates a codice fiscale: 16 chars, format (omocodia letters allowed), month letter,
 * day range, check character and, when names are given, consistency of the first
 * 6 characters with surname and first name.
 * Returns the uppercase value without spaces.
 */
export function validateCodiceFiscale(
  value: string,
  names: CodiceFiscaleNames = {},
): ValidationResult<CodiceFiscaleError> {
  const cf = normalizeCodiceFiscale(value);
  if (cf === "") return fail("empty");
  if (cf.length !== 16) return fail("length");
  if (!FORMAT_RE.test(cf)) return fail("format");

  const decoded = decodeOmocodia(cf);
  const day = Number(decoded.slice(9, 11));
  if (!MONTH_LETTERS.includes(cf[8]) || !((day >= 1 && day <= 31) || (day >= 41 && day <= 71))) {
    return fail("format");
  }
  if (checkChar(cf.slice(0, 15)) !== cf[15]) return fail("checksum");

  const { firstName, lastName } = names;
  if (lastName && surnameCode(lastName) !== cf.slice(0, 3)) {
    return fail("surname_mismatch");
  }
  if (firstName && nameCode(firstName) !== cf.slice(3, 6)) {
    return fail("name_mismatch");
  }
  return ok(cf);
}

export const CODICE_FISCALE_MESSAGES: Record<CodiceFiscaleError, string> = {
  empty: "Inserisci il codice fiscale.",
  length: "Il codice fiscale deve essere di 16 caratteri.",
  format: "Il codice fiscale non è in un formato valido.",
  checksum: "Il codice fiscale non è valido: controlla di averlo scritto correttamente.",
  surname_mismatch: "Il codice fiscale non corrisponde al cognome inserito.",
  name_mismatch: "Il codice fiscale non corrisponde al nome inserito.",
};
