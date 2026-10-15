/**
 * Normalizes text for search: lowercase, accents stripped, apostrophes/hyphens/dots
 * turned into spaces, whitespace collapsed. "Forlì" -> "forli", "L'Aquila" -> "l aquila".
 */
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’`´.\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
