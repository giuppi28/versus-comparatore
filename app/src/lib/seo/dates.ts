const MONTHS = [
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
];

/** "2026-11-05" (or a full ISO timestamp, read in Europe/Rome) -> "5 novembre 2026". Empty string if unparseable. */
export function formatItalianDate(value: string): string {
  const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (plain) return `${Number(plain[3])} ${MONTHS[Number(plain[2]) - 1] ?? ""} ${plain[1]}`;
  const t = Date.parse(value);
  if (Number.isNaN(t)) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(new Date(t));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return `${get("day")} ${MONTHS[get("month") - 1]} ${get("year")}`;
}

/** First publication of the guides (T19.4a). */
export const GUIDES_PUBLISHED_ON = "2026-11-05";

/** Floor for every "last updated" date shown or published (T19.4a/T19.4c): nothing earlier than the public launch of the freshness signals. */
export const UPDATED_FLOOR = "2026-11-07";

/** Calendar day (YYYY-MM-DD, Europe/Rome) of a timestamp; null if unparseable. */
function romeDay(value: string): string | null {
  const t = Date.parse(value);
  if (Number.isNaN(t)) return null;
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(t));
  return /^\d{4}-\d{2}-\d{2}$/.test(p) ? p : null;
}

/** An offer's `updated_at` as a YYYY-MM-DD day, never earlier than UPDATED_FLOOR (no DB write). */
export function flooredUpdateDay(updatedAt: string | null | undefined): string {
  const day = updatedAt ? romeDay(updatedAt) : null;
  return day && day > UPDATED_FLOOR ? day : UPDATED_FLOOR;
}

/** Home `dateModified`: the latest `updated_at` among the given offers, floored at UPDATED_FLOOR. */
export function latestUpdateDay(updatedAts: readonly (string | null | undefined)[]): string {
  return updatedAts.reduce<string>((best, v) => {
    const d = flooredUpdateDay(v);
    return d > best ? d : best;
  }, UPDATED_FLOOR);
}

/** "Aggiornata il 7 novembre 2026" for an offer card. */
export function offerUpdatedLabel(updatedAt: string | null | undefined): string {
  return `Aggiornata il ${formatItalianDate(flooredUpdateDay(updatedAt))}`;
}
