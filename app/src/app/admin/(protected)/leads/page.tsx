import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getAdminRepository } from "@/lib/data/admin";
import { LeadFilters } from "./LeadFilters";
import { LeadList } from "./LeadList";
import { LEAD_ROW_FIELDS, type LeadRowData } from "./row-data";
import { deletedMessage, parseCleanupParam, parseDeletedParam } from "./delete-notice";
import { fetchLeadList, listHref, parseListParams } from "./list-params";

export const metadata: Metadata = { title: "Lead — Area riservata VERSUS" };

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const rawParams = await searchParams;
  const params = parseListParams(rawParams);
  const deleted = parseDeletedParam(rawParams.deleted);
  const cleanupFailed = deleted !== null && deleted > 0 && parseCleanupParam(rawParams.cleanup);
  const repo = await getAdminRepository();
  const result = await fetchLeadList(repo, params);

  // Resolve comune names for the visible rows only.
  const istats = [...new Set(result.items.map((l) => l.comune_istat).filter((x): x is string => !!x))];
  const comuni = new Map(
    await Promise.all(istats.map(async (i) => [i, (await repo.getComune(i))?.name ?? null] as const)),
  );
  const rows = result.items.map((lead) => ({
    // Whitelist: the client component must never receive the lead token.
    lead: Object.fromEntries(LEAD_ROW_FIELDS.map((k) => [k, lead[k]])) as LeadRowData,
    comune: lead.comune_istat ? (comuni.get(lead.comune_istat) ?? null) : null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="heading-wide text-title break-words">Lead</h1>
      <LeadFilters params={params} />
      <p className="text-sm text-ink-muted" data-testid="lead-total" aria-live="polite">
        {result.total === 1 ? "1 lead" : `${result.total} lead`}
      </p>
      {/* Keyed by filters + page: changing them clears the selection and any notice. */}
      <LeadList
        key={listHref(params)}
        rows={rows}
        initialNotice={deleted === null ? null : deletedMessage(deleted, cleanupFailed)}
        initialNoticeWarning={cleanupFailed}
      />
      {result.pageCount > 1 && (
        <nav aria-label="Pagine" className="flex items-center justify-between gap-3">
          {result.page > 1 ? (
            <a
              rel="prev"
              href={listHref({ ...params, page: result.page - 1 })}
              className="inline-flex min-h-11 items-center rounded-control border border-control bg-surface px-4 font-semibold text-ink transition-colors hover:border-ink"
            >
              ← Precedente
            </a>
          ) : (
            <span />
          )}
          <span className="text-sm text-ink-muted">
            Pagina {result.page} di {result.pageCount}
          </span>
          {result.page < result.pageCount ? (
            <a
              rel="next"
              href={listHref({ ...params, page: result.page + 1 })}
              className="inline-flex min-h-11 items-center rounded-control border border-control bg-surface px-4 font-semibold text-ink transition-colors hover:border-ink"
            >
              Successiva →
            </a>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
