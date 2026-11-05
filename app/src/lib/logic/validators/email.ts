import { isValidEmail, MAX_EMAIL_LENGTH } from "@/lib/notify/email-address";
import { fail, ok, type ValidationResult } from "./types";

export type EmailError = "empty" | "format";

/**
 * Customer email: trimmed and lower-cased (the stored value), single address,
 * at most 254 characters, same pragmatic format as the notification recipient.
 */
export function validateEmail(value: string): ValidationResult<EmailError> {
  const v = value.trim().toLowerCase();
  if (v === "") return fail("empty");
  if (v.length > MAX_EMAIL_LENGTH || !isValidEmail(v)) return fail("format");
  return ok(v);
}

export const EMAIL_MESSAGES: Record<EmailError, string> = {
  empty: "Inserisci la tua email.",
  format: "Inserisci un indirizzo email valido (es. nome@esempio.it).",
};
