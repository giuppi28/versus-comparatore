import { DEFAULT_CALLBACK_PHONE } from "@/lib/data";

/**
 * Normalizes the "Numero da cui chiamiamo": trims and collapses internal spaces. Valid = optional
 * leading +, then digits and spaces only, 6-20 characters. Empty input falls back to the default.
 * Returns null when invalid.
 */
export function normalizeCallbackPhone(value: string): string | null {
  const v = value.trim().replace(/\s+/g, " ");
  if (v === "") return DEFAULT_CALLBACK_PHONE;
  if (v.length < 6 || v.length > 20) return null;
  if (!/^\+?[0-9 ]+$/.test(v)) return null;
  return v;
}
