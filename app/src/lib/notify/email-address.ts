/** Pragmatic email check for the notification recipient (RFC-lite, single address). */
const EMAIL_RE = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export const MAX_EMAIL_LENGTH = 254;

export function isValidEmail(value: string): boolean {
  return value.length <= MAX_EMAIL_LENGTH && EMAIL_RE.test(value);
}

/** Trims; returns null for empty/invalid input. */
export function normalizeEmail(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  return v && isValidEmail(v) ? v : null;
}
