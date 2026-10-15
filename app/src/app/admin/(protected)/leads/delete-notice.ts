import { DELETE_LEADS_MAX } from "./schema";

/** "1 lead eliminato" / "N lead eliminati" (live-region feedback after a deletion). */
export function deletedMessage(count: number): string {
  if (count <= 0) return "Nessun lead eliminato";
  return count === 1 ? "1 lead eliminato" : `${count} lead eliminati`;
}

/** Confirm dialog title: "Eliminare N lead?". */
export const confirmTitle = (count: number) => `Eliminare ${count} lead?`;

/** Reads the `deleted` search param set by the redirect after a delete from the detail page. */
export function parseDeletedParam(raw: string | string[] | undefined): number | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v || !/^\d{1,3}$/.test(v)) return null;
  const n = Number.parseInt(v, 10);
  return n >= 0 && n <= DELETE_LEADS_MAX ? n : null;
}
