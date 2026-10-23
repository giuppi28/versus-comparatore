import { APPLIANCES, GAS_USES, SQM_RANGES } from "@/config/consumption";
import type {
  HousingTitle,
  LeadCommodity,
  LeadCustomerType,
  LeadStatus,
  LeadStepReached,
  ServiceType,
} from "@/lib/data/types";

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Nuovo",
  contacted: "Contattato",
  in_progress: "In lavorazione",
  closed: "Chiuso",
};
export const LEAD_STATUSES = Object.keys(STATUS_LABELS) as LeadStatus[];

/** Label of a step the lead stopped at (a "partial" lead). */
export const STEP_LABELS: Record<LeadStepReached, string> = {
  page1: "Dati iniziali",
  results: "Risultati",
  offer_chosen: "Offerta scelta",
  completed: "Completato",
};
export const PARTIAL_STEPS: LeadStepReached[] = ["page1", "results", "offer_chosen"];

export const COMMODITY_LABELS: Record<LeadCommodity, string> = {
  luce: "Luce",
  gas: "Gas",
  dual: "Luce + Gas",
};
export const CUSTOMER_TYPE_LABELS: Record<LeadCustomerType, string> = {
  casa: "Casa",
  business: "Partita IVA",
};
export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  cambio_fornitore: "Cambio fornitore",
  subentro: "Subentro",
  voltura: "Voltura",
  primo_allaccio: "Primo allaccio",
};
export const HOUSING_TITLE_LABELS: Record<HousingTitle, string> = {
  proprietario: "Proprietario",
  inquilino: "Inquilino",
  usufruttuario: "Usufruttuario",
  altro: "Altro",
};

const APPLIANCE_LABELS = new Map<string, string>(APPLIANCES.map((a) => [a.id, a.label]));
const GAS_USE_LABELS = new Map<string, string>(GAS_USES.map((g) => [g.id, g.label]));
const SQM_LABELS = new Map<string, string>(SQM_RANGES.map((r) => [r.id, r.label]));

export const applianceLabel = (id: string) => APPLIANCE_LABELS.get(id) ?? id;
export const gasUseLabel = (id: string) => GAS_USE_LABELS.get(id) ?? id;
export const sqmLabel = (id: string) => SQM_LABELS.get(id) ?? id;

const dateTime = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
});
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dateTime.format(d);
}

const euro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});
export const formatEuro = (n: number | null): string => (n === null ? "—" : euro.format(n));

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  carta_identita: "Carta d'identità",
  patente: "Patente",
  passaporto: "Passaporto",
};

/** IBAN grouped by 4 characters ("IT60 X054 2811 ..."). */
export const formatIban = (iban: string): string => iban.replace(/\s+/g, "").replace(/(.{4})(?=.)/g, "$1 ");

const dateOnly = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});
/** ISO `YYYY-MM-DD` (or full ISO) as it-IT date; "—" when unparseable. */
export function formatDate(iso: string): string {
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00Z` : iso);
  return Number.isNaN(d.getTime()) ? "—" : dateOnly.format(d);
}

const sizeFmt = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 });
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${sizeFmt.format(bytes / 1024)} KB`;
  return `${sizeFmt.format(bytes / (1024 * 1024))} MB`;
}

export const DOCUMENT_MIME_LABELS: Record<string, string> = {
  "image/jpeg": "Immagine JPEG",
  "application/pdf": "PDF",
};
