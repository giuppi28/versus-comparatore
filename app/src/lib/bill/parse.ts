/**
 * Pure parser for the text of an Italian electricity / gas bill (SPEC decision #21).
 * Finds POD, PDR, customer codice fiscale and current supplier. Every value found is only
 * a proposal: the UI shows it in a review dialog and never writes over what the customer typed.
 */
import {
  normalizePod,
  normalizePdr,
  validateCodiceFiscale,
  validatePdr,
  validatePod,
} from "@/lib/logic/validators";

export interface BillSupplier {
  slug: string;
  name: string;
  is_placeholder?: boolean;
}

export interface ParsedBill {
  pod?: string;
  pdr?: string;
  taxCode?: string;
  supplierSlug?: string;
}

/** Special dropdown options that are not real suppliers (never matched). */
const IGNORED_SLUGS = new Set(["tutela", "altro-fornitore", "non-lo-so"]);

/** Extra names under which a supplier is printed on bills, by slug (matched after normalisation). */
const SUPPLIER_ALIASES: Record<string, string[]> = {
  "enel-energia": ["Enel Energia"],
  "eni-plenitude": ["Eni Plenitude", "Plenitude"],
  "edison-energia": ["Edison Energia", "Edison"],
  "a2a-energia": ["A2A Energia", "A2A"],
  "hera-comm": ["Hera Comm", "Hera"],
  iren: ["Iren Mercato", "Iren"],
  "acea-energia": ["Acea Energia", "Acea"],
  sorgenia: ["Sorgenia"],
  engie: ["Engie"],
  "eon-energia": ["E.ON Energia", "E.ON", "Eon Energia"],
  iberdrola: ["Iberdrola"],
  "sentra-energia": ["Sentra Energia", "Sentra"],
  "estra-energia": ["Estra Energia", "Estra"],
  enegan: ["Enegan"],
  "asti-energia": ["Asti Energy", "Asti Energia", "Aenergy", "A Energy"],
};

const POD_RE = /(?<![A-Z0-9])IT[\s.-]?\d{3}[\s.-]?E[\s.-]?\d{8}(?!\d)/gi;
const POD_LABEL_RE = /\bPOD\b|punto\s+di\s+prelievo/i;

const PDR_LABEL_RE = /\bPDR\b|punto\s+di\s+riconsegna/gi;
const PDR_AFTER_LABEL_RE = /^[^\d]{0,80}?(?<!\d)(\d{14})(?!\d)/;
const PDR_ANY_RE = /(?<![\w.-])\d{14}(?![\w.-])/g;

const CF_RE = /(?<![A-Z0-9])[A-Z]{6}[0-9LMNP-V]{2}[A-Z][0-9LMNP-V]{2}[A-Z][0-9LMNP-V]{3}[A-Z](?![A-Z0-9])/gi;
const CF_LABEL_RE = /codice\s+fiscale|\bc\.?\s?f\.?(?=\s*[:.\s])/gi;

function cleanText(text: string): string {
  return text.replace(/[  ​]/g, " ").replace(/[\t\r]+/g, " ");
}

function findPod(text: string): string | undefined {
  const found: { value: string; labelled: boolean }[] = [];
  for (const m of text.matchAll(POD_RE)) {
    const res = validatePod(normalizePod(m[0]));
    if (!res.ok) continue;
    const before = text.slice(Math.max(0, (m.index ?? 0) - 40), m.index ?? 0);
    found.push({ value: res.value, labelled: POD_LABEL_RE.test(before) });
  }
  return (found.find((f) => f.labelled) ?? found[0])?.value;
}

function findPdr(text: string): string | undefined {
  for (const label of text.matchAll(PDR_LABEL_RE)) {
    const after = text.slice((label.index ?? 0) + label[0].length, (label.index ?? 0) + label[0].length + 100);
    const m = PDR_AFTER_LABEL_RE.exec(after);
    if (!m) continue;
    const res = validatePdr(normalizePdr(m[1]));
    if (res.ok) return res.value;
  }
  // No labelled PDR: accept a lone 14-digit number only (several would be ambiguous).
  const unique = new Set<string>();
  for (const m of text.matchAll(PDR_ANY_RE)) {
    const res = validatePdr(m[0]);
    if (res.ok) unique.add(res.value);
  }
  return unique.size === 1 ? [...unique][0] : undefined;
}

function findTaxCode(text: string): string | undefined {
  const labelEnds: number[] = [];
  for (const label of text.matchAll(CF_LABEL_RE)) {
    labelEnds.push((label.index ?? 0) + label[0].length);
  }
  const valid: { value: string; labelled: boolean }[] = [];
  for (const m of text.matchAll(CF_RE)) {
    const res = validateCodiceFiscale(m[0]);
    if (!res.ok) continue;
    const start = m.index ?? 0;
    const labelled = labelEnds.some((end) => {
      if (end > start) return false;
      const gap = text.slice(end, start);
      return gap.length <= 40 && !/\d{6,}/.test(gap);
    });
    valid.push({ value: res.value, labelled });
  }
  return (valid.find((v) => v.labelled) ?? valid[0])?.value;
}

/** Lowercase, accents and dots removed, other punctuation -> space, single spaces. */
function normalizeForMatch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findSupplier(text: string, suppliers: BillSupplier[]): string | undefined {
  const haystack = ` ${normalizeForMatch(text)} `;
  let best: { slug: string; count: number; first: number } | undefined;
  for (const s of suppliers) {
    if (s.is_placeholder || IGNORED_SLUGS.has(s.slug)) continue;
    const names = [...(SUPPLIER_ALIASES[s.slug] ?? []), s.name]
      .map(normalizeForMatch)
      .filter((n) => n !== "");
    if (names.length === 0) continue;
    const alternation = [...new Set(names)]
      .sort((a, b) => b.length - a.length)
      .map(escapeRe)
      .join("|");
    const re = new RegExp(`(?<=[^a-z0-9])(?:${alternation})(?=[^a-z0-9])`, "g");
    let count = 0;
    let first = Infinity;
    for (const m of haystack.matchAll(re)) {
      count++;
      first = Math.min(first, m.index ?? Infinity);
    }
    if (count === 0) continue;
    if (!best || count > best.count || (count === best.count && first < best.first)) {
      best = { slug: s.slug, count, first };
    }
  }
  return best?.slug;
}

/** Extracts POD, PDR, customer codice fiscale and supplier from bill text. Missing values are omitted. */
export function parseBillText(text: string, suppliers: BillSupplier[]): ParsedBill {
  const clean = cleanText(text ?? "");
  const out: ParsedBill = {};
  const pod = findPod(clean);
  if (pod) out.pod = pod;
  const pdr = findPdr(clean);
  if (pdr) out.pdr = pdr;
  const taxCode = findTaxCode(clean);
  if (taxCode) out.taxCode = taxCode;
  const supplierSlug = findSupplier(clean, suppliers);
  if (supplierSlug) out.supplierSlug = supplierSlug;
  return out;
}
