/**
 * Builds the "new lead" email for Aldo (PRD §5.1). Pure: no I/O, no env access.
 * Every user-supplied value is HTML-escaped in the HTML body; the plain-text body is
 * stripped of control characters (no markup is interpreted there).
 */
import { formatEuro } from "@/lib/logic/pricing";

export interface NewLeadEmailOffer {
  /** "Luce" | "Gas" */
  commodityLabel: string;
  /** "Supplier - Offer name" */
  name: string;
  /** Monthly cost (VAT excluded) for the customer's consumption, when computable. */
  monthlyCost: number | null;
}

export interface NewLeadEmailInput {
  leadId: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  /** Human labels, already resolved. */
  commodityLabel: string | null;
  customerTypeLabel: string | null;
  comuneLabel: string | null;
  offers: NewLeadEmailOffer[];
  /** Total monthly cost shown to the customer, when known. */
  totalMonthlyCost: number | null;
  completedAt: string;
  /** Absolute base URL without trailing slash; null = no link. */
  baseUrl: string | null;
}

export interface BuiltEmail {
  subject: string;
  text: string;
  html: string;
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

/** Single-line, control-character-free text (subject, list items). */
export function cleanLine(value: string | null | undefined, max = 200): string {
  return (value ?? "").replace(CONTROL_CHARS, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

const DASH = "—";

export function leadAdminUrl(baseUrl: string | null, leadId: string): string | null {
  if (!baseUrl) return null;
  return `${baseUrl.replace(/\/+$/, "")}/admin/leads/${encodeURIComponent(leadId)}`;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return cleanLine(iso);
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  }).format(d);
}

export function buildNewLeadEmail(input: NewLeadEmailInput): BuiltEmail {
  const fullName = cleanLine(`${input.firstName ?? ""} ${input.lastName ?? ""}`, 120);
  const rows: Array<[string, string]> = [
    ["Nome", fullName || DASH],
    ["Telefono", cleanLine(input.phone, 40) || DASH],
    ["Servizio", cleanLine(input.commodityLabel) || DASH],
    ["Tipo cliente", cleanLine(input.customerTypeLabel) || DASH],
    ["Comune", cleanLine(input.comuneLabel) || DASH],
    ["Completato il", formatWhen(input.completedAt)],
  ];
  const offers = input.offers.map((o) => ({
    label: cleanLine(o.commodityLabel, 20),
    name: cleanLine(o.name, 200),
    cost: o.monthlyCost === null ? null : `${formatEuro(o.monthlyCost)}/mese`,
  }));
  const total = input.totalMonthlyCost === null ? null : `${formatEuro(input.totalMonthlyCost)}/mese`;
  const link = leadAdminUrl(input.baseUrl, input.leadId);

  const subject = fullName ? `Nuovo lead completato: ${fullName}` : "Nuovo lead completato";

  const textLines = ["Nuovo lead completato", "", ...rows.map(([k, v]) => `${k}: ${v}`), "", "Offerte scelte:"];
  if (offers.length === 0) textLines.push("- nessuna");
  for (const o of offers) textLines.push(`- ${o.label}: ${o.name}${o.cost ? ` (${o.cost})` : ""}`);
  if (total && offers.length > 1) textLines.push(`Totale mensile mostrato: ${total}`);
  if (link) textLines.push("", `Apri il lead: ${link}`);
  const text = textLines.join("\n");

  const rowsHtml = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#555">${escapeHtml(k)}</td><td style="padding:4px 0"><strong>${escapeHtml(v)}</strong></td></tr>`,
    )
    .join("");
  const offersHtml =
    offers.length === 0
      ? "<li>nessuna</li>"
      : offers
          .map(
            (o) =>
              `<li>${escapeHtml(o.label)}: <strong>${escapeHtml(o.name)}</strong>${o.cost ? ` (${escapeHtml(o.cost)})` : ""}</li>`,
          )
          .join("");
  const totalHtml =
    total && offers.length > 1 ? `<p>Totale mensile mostrato: <strong>${escapeHtml(total)}</strong></p>` : "";
  const linkHtml = link
    ? `<p><a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 18px;background:#16a34a;color:#fff;text-decoration:none;border-radius:8px">Apri il lead</a></p>`
    : "";
  const html =
    `<!doctype html><html lang="it"><body style="font-family:Arial,Helvetica,sans-serif;color:#111;line-height:1.5">` +
    `<h2 style="margin:0 0 12px">Nuovo lead completato</h2>` +
    `<table style="border-collapse:collapse">${rowsHtml}</table>` +
    `<h3 style="margin:16px 0 4px">Offerte scelte</h3><ul style="margin:0;padding-left:20px">${offersHtml}</ul>` +
    `${totalHtml}${linkHtml}</body></html>`;

  return { subject, text, html };
}
