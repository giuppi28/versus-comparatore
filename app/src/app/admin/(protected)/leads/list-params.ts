import {
  LEAD_PAGE_SIZE_DEFAULT,
  type Lead,
  type LeadStatus,
  type LeadStepReached,
} from "@/lib/data/types";
import type { Repository } from "@/lib/data/repository";
import { LEAD_STATUSES, PARTIAL_STEPS } from "./labels";

export const LEAD_TABS = ["completati", "parziali", "tutti"] as const;
export type LeadTab = (typeof LEAD_TABS)[number];
export const DEFAULT_TAB: LeadTab = "completati";
export const TAB_LABELS: Record<LeadTab, string> = {
  completati: "Completati",
  parziali: "Parziali",
  tutti: "Tutti",
};

export interface LeadListParams {
  tab: LeadTab;
  /** Only meaningful for "parziali" (partial steps) and "tutti". */
  step: LeadStepReached | null;
  status: LeadStatus | null;
  q: string;
  page: number;
}

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Parses (and sanitises) the URL query string; unknown values fall back to defaults. */
export function parseListParams(raw: RawParams): LeadListParams {
  const tabRaw = first(raw.tab);
  const tab = (LEAD_TABS as readonly string[]).includes(tabRaw ?? "") ? (tabRaw as LeadTab) : DEFAULT_TAB;

  const stepRaw = first(raw.step);
  const allowedSteps: readonly string[] =
    tab === "completati" ? [] : tab === "parziali" ? PARTIAL_STEPS : [...PARTIAL_STEPS, "completed"];
  const step = allowedSteps.includes(stepRaw ?? "") ? (stepRaw as LeadStepReached) : null;

  const statusRaw = first(raw.status);
  const status = (LEAD_STATUSES as readonly string[]).includes(statusRaw ?? "")
    ? (statusRaw as LeadStatus)
    : null;

  const q = (first(raw.q) ?? "").trim().slice(0, 100);
  const pageNum = Number.parseInt(first(raw.page) ?? "1", 10);
  const page = Number.isFinite(pageNum) && pageNum >= 1 ? Math.min(pageNum, 10_000) : 1;
  return { tab, step, status, q, page };
}

/** Builds the shareable URL for a given state (defaults are omitted). */
export function listHref(params: Partial<LeadListParams>): string {
  const sp = new URLSearchParams();
  if (params.tab && params.tab !== DEFAULT_TAB) sp.set("tab", params.tab);
  if (params.step) sp.set("step", params.step);
  if (params.status) sp.set("status", params.status);
  if (params.q) sp.set("q", params.q);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return qs ? `/admin/leads?${qs}` : "/admin/leads";
}

export interface LeadListResult {
  items: Lead[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

/**
 * Runs the list query for a tab. The repository filters on a single step, so
 * "parziali" without a specific step merges one query per partial step.
 */
export async function fetchLeadList(
  repo: Pick<Repository, "queryLeads">,
  params: LeadListParams,
  pageSize = LEAD_PAGE_SIZE_DEFAULT,
): Promise<LeadListResult> {
  const base = { search: params.q || undefined, status: params.status ?? undefined };
  let result: { items: Lead[]; total: number; page: number };

  if (params.tab === "completati" || params.step || params.tab === "tutti") {
    const step = params.tab === "completati" ? "completed" : (params.step ?? undefined);
    const p = await repo.queryLeads({ ...base, step_reached: step, page: params.page, pageSize });
    result = p;
  } else {
    // "parziali", all partial steps: merge, newest first, paginate in memory.
    const all: Lead[] = [];
    for (const step of PARTIAL_STEPS) {
      for (let page = 1; ; page++) {
        const p = await repo.queryLeads({ ...base, step_reached: step, page, pageSize: 100 });
        all.push(...p.items);
        if (page * p.pageSize >= p.total) break;
      }
    }
    all.sort((a, b) => b.created_at.localeCompare(a.created_at));
    result = {
      items: all.slice((params.page - 1) * pageSize, params.page * pageSize),
      total: all.length,
      page: params.page,
    };
  }
  return {
    items: result.items,
    total: result.total,
    page: result.page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(result.total / pageSize)),
  };
}

/** Name shown in the list: company for business leads, otherwise first + last name. */
export function leadDisplayName(l: Pick<Lead, "company_name" | "first_name" | "last_name">): string {
  const person = [l.first_name, l.last_name].filter(Boolean).join(" ");
  return l.company_name?.trim() || person || "Senza nome";
}
