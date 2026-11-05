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
