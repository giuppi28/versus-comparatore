import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { resolveLogoUrl } from "@/lib/data";
import { getAdminRepository } from "@/lib/data/admin";
import { DeleteSupplierButton } from "./DeleteSupplierButton";

export const metadata: Metadata = { title: "Fornitori — Area riservata" };
export const dynamic = "force-dynamic";

function Badge({ on, children }: { on: boolean; children: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${on ? "bg-brand-100 text-brand-800" : "bg-surface-muted text-ink-subtle line-through"}`}
    >
      {children}
    </span>
  );
}

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ eliminato?: string; offerte?: string; logo?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const repo = await getAdminRepository();
  const [suppliers, offers] = await Promise.all([repo.listAllSuppliers(), repo.listAllOffers()]);
  const offerCounts = new Map<string, number>();
  for (const o of offers) offerCounts.set(o.supplier_id, (offerCounts.get(o.supplier_id) ?? 0) + 1);
  const deletedOffers = Number(query.offerte);
  const sorted = [...suppliers].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "it"));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="heading-wide text-title break-words">Fornitori</h1>
          <p className="text-ink-muted">{sorted.length} fornitori, inclusi quelli non attivi.</p>
        </div>
        <Link
          href="/admin/fornitori/nuovo"
          className="inline-flex min-h-11 items-center justify-center rounded-control bg-brand-600 px-5 font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          Nuovo fornitore
        </Link>
      </div>

      {query.eliminato && (
        <div
          role="status"
          data-testid="deleted-banner"
          className="rounded-control border border-success bg-success-soft px-4 py-3 text-sm font-medium text-brand-800"
        >
          Fornitore «{query.eliminato}» eliminato.
          {deletedOffers > 0 && (
            <>
              {" "}
              {deletedOffers === 1 ? "Eliminata anche 1 offerta." : `Eliminate anche ${deletedOffers} offerte.`}
            </>
          )}
          {query.logo === "errore" && " Il file del logo non è stato rimosso dall'archivio."}
        </div>
      )}

      {sorted.length === 0 ? (
        <Card>Nessun fornitore presente.</Card>
      ) : (
        <ul className="flex flex-col gap-3" data-testid="supplier-list">
          {sorted.map((s) => {
            const logo = resolveLogoUrl(s.logo_path);
            return (
              <li
                key={s.id}
                data-testid="supplier-row"
                data-slug={s.slug}
                data-active={s.active}
                data-offers={offerCounts.get(s.id) ?? 0}
                className="flex flex-col gap-2 sm:flex-row sm:items-center"
              >
                <Link href={`/admin/fornitori/${s.id}`} className="block min-w-0 sm:flex-1">
                  <Card
                    padding="none"
                    className={`flex flex-wrap items-center gap-x-4 gap-y-3 p-4 transition-colors hover:border-brand-600 ${s.active ? "" : "opacity-70"}`}
                  >
                    <div className="flex h-12 w-28 shrink-0 items-center justify-center rounded-control bg-surface-muted p-2">
                      {logo ? (
                        // eslint-disable-next-line @next/next/no-img-element -- Supabase public URL or data URL
                        <img src={logo} alt="" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <span className="truncate text-xs font-semibold text-ink-muted">{s.name}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 basis-48">
                      <p className="truncate font-bold">{s.name}</p>
                      <p className="truncate text-sm text-ink-muted">
                        {s.slug} · ordine {s.sort_order}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge on={s.sells_luce}>Luce</Badge>
                      <Badge on={s.sells_gas}>Gas</Badge>
                      <Badge on={s.show_in_dropdown}>In elenco</Badge>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${s.active ? "bg-success text-white" : "bg-ink-subtle text-white"}`}
                      >
                        {s.active ? "Attivo" : "Non attivo"}
                      </span>
                    </div>
                    <span className="font-semibold text-brand-700" aria-hidden="true">
                      Modifica
                    </span>
                  </Card>
                </Link>
                {!s.is_placeholder && (
                  <DeleteSupplierButton id={s.id} name={s.name} offerCount={offerCounts.get(s.id) ?? 0} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
