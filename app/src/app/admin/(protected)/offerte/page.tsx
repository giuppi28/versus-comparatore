import Link from "next/link";
import { Card, cn } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getAdminRepository } from "@/lib/data/admin";
import { formatEuro, formatPrice } from "@/lib/logic";
import { toggleOfferFlagAction } from "./actions";
import { DeleteOfferButton } from "./DeleteOfferButton";
import { isVisibleToCustomers } from "./visibility";

export const dynamic = "force-dynamic";

const CUSTOMER_LABEL = { casa: "Casa", business: "Partita IVA", both: "Casa e Partita IVA" } as const;

function Badge({ children, tone, testId }: { children: string; tone: "green" | "grey" | "amber"; testId?: string }) {
  return (
    <span
      data-testid={testId}
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tone === "green" && "bg-brand-100 text-brand-800",
        tone === "grey" && "bg-surface-muted text-ink-muted ring-1 ring-line",
        tone === "amber" && "bg-warning-soft text-warning",
      )}
    >
      {children}
    </span>
  );
}

function ToggleButton({
  offerId,
  flag,
  value,
  label,
}: {
  offerId: string;
  flag: "active" | "featured" | "price_verified";
  value: boolean;
  label: string;
}) {
  return (
    <form action={toggleOfferFlagAction}>
      <input type="hidden" name="id" value={offerId} />
      <input type="hidden" name="flag" value={flag} />
      <input type="hidden" name="value" value={String(value)} />
      <button
        type="submit"
        data-testid={`toggle-${flag}`}
        className="min-h-10 rounded-control border border-control bg-surface px-3 text-sm font-semibold text-ink transition-colors hover:border-ink"
      >
        {label}
      </button>
    </form>
  );
}

export default async function AdminOffersPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; esito?: string }>;
}) {
  await requireAdmin();
  const { vista, esito } = await searchParams;
  const showAll = vista === "tutte";
  const repo = await getAdminRepository();
  const all = await repo.listAllOffers();
  const visible = all.filter(isVisibleToCustomers);
  const rows = showAll ? all : visible;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="heading-wide text-title break-words">Offerte</h1>
        <Link
          href="/admin/offerte/nuova"
          data-testid="new-offer"
          className="inline-flex min-h-11 items-center justify-center rounded-control bg-brand-600 px-5 font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          Nuova offerta
        </Link>
      </div>

      {esito === "eliminata" && (
        <p role="status" data-testid="deleted-notice" className="rounded-control bg-success-soft px-4 py-3 font-medium text-success">
          Offerta eliminata.
        </p>
      )}

      <nav aria-label="Filtro offerte" className="flex gap-1 self-start rounded-control bg-disabled p-1">
        {[
          { href: "/admin/offerte", label: `Visibili ai clienti (${visible.length})`, current: !showAll, id: "filter-visible" },
          { href: "/admin/offerte?vista=tutte", label: `Tutte (${all.length})`, current: showAll, id: "filter-all" },
        ].map((f) => (
          <Link
            key={f.id}
            href={f.href}
            data-testid={f.id}
            aria-current={f.current ? "page" : undefined}
            className={cn(
              "inline-flex items-center whitespace-nowrap rounded-[0.4rem] border px-3 py-1.5 text-sm font-semibold sm:px-4",
              f.current
                ? "border-line bg-surface text-ink shadow-card"
                : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      <p className="text-sm text-ink-muted">
        {showAll
          ? "Tutte le offerte, comprese quelle disattivate."
          : "Le offerte attive dei fornitori attivi: esattamente quelle che vedono i clienti."}
      </p>

      {rows.length === 0 ? (
        <Card>
          <p data-testid="offers-empty" className="text-ink-muted">
            Nessuna offerta da mostrare.
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3" data-testid="offers-list">
          {rows.map((o) => (
            <li
              key={o.id}
              data-testid="offer-row"
              data-offer-id={o.id}
              data-active={String(o.active)}
              data-featured={String(o.featured)}
              data-verified={String(o.price_verified)}
              data-visible={String(isVisibleToCustomers(o))}
            >
              <Card className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/offerte/${o.id}`}
                      className="text-lg font-bold hover:text-brand-700 hover:underline"
                      data-testid="offer-name"
                    >
                      {o.name}
                    </Link>
                    {o.active ? <Badge tone="green" testId="badge-active">Attiva</Badge> : <Badge tone="grey" testId="badge-active">Disattivata</Badge>}
                    {o.featured && <Badge tone="green" testId="badge-featured">In evidenza</Badge>}
                    {o.price_verified ? (
                      <Badge tone="green" testId="badge-verified">Prezzo verificato</Badge>
                    ) : (
                      <Badge tone="amber" testId="badge-verified">Da verificare</Badge>
                    )}
                    {o.active && !o.supplier.active && <Badge tone="amber">Fornitore disattivato: non visibile</Badge>}
                  </div>
                  <p className="text-sm text-ink-muted">
                    {o.supplier.name} · {o.commodity === "luce" ? "Luce" : "Gas"} · {CUSTOMER_LABEL[o.customer_type]}
                  </p>
                  <p className="text-sm">
                    <span data-testid="offer-price">
                      {formatPrice(o.energy_price, o.commodity === "luce" ? "kWh" : "Smc")}
                    </span>
                    {" · quota fissa "}
                    <span data-testid="offer-fee">{formatEuro(o.fixed_fee_monthly)}</span>/mese
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ToggleButton offerId={o.id} flag="active" value={!o.active} label={o.active ? "Disattiva" : "Attiva"} />
                  <ToggleButton offerId={o.id} flag="featured" value={!o.featured} label={o.featured ? "Togli da In evidenza" : "Metti in evidenza"} />
                  <ToggleButton offerId={o.id} flag="price_verified" value={!o.price_verified} label={o.price_verified ? "Da verificare" : "Segna verificato"} />
                  <Link
                    href={`/admin/offerte/${o.id}`}
                    className="inline-flex min-h-10 items-center rounded-control bg-brand-50 px-3 text-sm font-semibold text-brand-700 hover:bg-brand-100"
                  >
                    Modifica
                  </Link>
                  <DeleteOfferButton
                    offerId={o.id}
                    offerName={o.name}
                    active={o.active}
                    vista={showAll ? "tutte" : undefined}
                  />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
