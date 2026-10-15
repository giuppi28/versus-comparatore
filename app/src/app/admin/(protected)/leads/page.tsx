import type { Metadata } from "next";
import { Card } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getAdminRepository } from "@/lib/data/admin";
import { LeadFilters } from "./LeadFilters";
import { LeadList } from "./LeadList";
import { fetchLeadList, listHref, parseListParams } from "./list-params";

export const metadata: Metadata = { title: "Lead — Area riservata VERSUS" };

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = parseListParams(await searchParams);
  const repo = await getAdminRepository();
  const result = await fetchLeadList(repo, params);

  // Resolve comune names for the visible rows only.
  const istats = [...new Set(result.items.map((l) => l.comune_istat).filter((x): x is string => !!x))];
  const comuni = new Map(
    await Promise.all(istats.map(async (i) => [i, (await repo.getComune(i))?.name ?? null] as const)),
  );
  const rows = result.items.map((lead) => ({
    lead,
    comune: lead.comune_istat ? (comuni.get(lead.comune_istat) ?? null) : null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Lead</h1>
      <LeadFilters params={params} />
      <p className="text-sm text-ink-muted" data-testid="lead-total" aria-live="polite">
        {result.total === 1 ? "1 lead" : `${result.total} lead`}
      </p>
      {rows.length === 0 ? (
        <Card data-testid="lead-empty" className="text-center text-ink-muted">
          Nessun lead corrisponde ai filtri selezionati.
        </Card>
      ) : (
        <LeadList rows={rows} />
      )}
      {result.pageCount > 1 && (
        <nav aria-label="Pagine" className="flex items-center justify-between gap-3">
          {result.page > 1 ? (
            <a rel="prev" href={listHref({ ...params, page: result.page - 1 })} className="rounded-control border border-line-strong px-4 py-2 font-semibold hover:border-brand-600 hover:bg-brand-50">
              ← Precedente
            </a>
          ) : (
            <span />
          )}
          <span className="text-sm text-ink-muted">
            Pagina {result.page} di {result.pageCount}
          </span>
          {result.page < result.pageCount ? (
            <a rel="next" href={listHref({ ...params, page: result.page + 1 })} className="rounded-control border border-line-strong px-4 py-2 font-semibold hover:border-brand-600 hover:bg-brand-50">
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
