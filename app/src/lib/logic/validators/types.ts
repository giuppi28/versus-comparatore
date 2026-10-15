/** Typed validation result shared by all validators. `value` is the normalised value to store. */
export type ValidationResult<E extends string> =
  | { ok: true; value: string }
  | { ok: false; error: E };

export function ok(value: string): { ok: true; value: string } {
  return { ok: true, value };
}

export function fail<E extends string>(error: E): { ok: false; error: E } {
  return { ok: false, error };
}
