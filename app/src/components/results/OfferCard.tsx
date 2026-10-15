"use client";

import { useId, useState } from "react";
import { Button, CheckIcon, ChevronDownIcon, cn } from "@/components/ui";
import { formatEuro, formatPrice } from "@/lib/logic";
import type { Commodity, OfferWithSupplier } from "@/lib/data/types";
import { supplierLogoSrc } from "./logo-src";
import { toCents, unitFor } from "./results-logic";

export interface OfferCardProps {
  offer: OfferWithSupplier;
  commodity: Commodity;
  /** Unrounded monthly cost (VAT excluded) for the current consumption. */
  monthlyCost: number;
  /** The customer already picked this offer (Luce+Gas: coming back to a step). */
  chosen?: boolean;
  onActivate: () => void;
}

function monthsLabel(n: number): string {
  return n === 1 ? "1 mese" : `${n} mesi`;
}

/** "stima" tooltip: hover, keyboard focus and tap all open it. */
function EstimateTooltip() {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label="Cos'è la stima"
        aria-describedby={id}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        className="inline-flex h-5 items-center rounded-full border border-line-strong px-2 text-xs font-semibold text-ink-muted hover:border-brand-600 hover:text-brand-700"
        data-testid="offer-estimate-tooltip"
      >
        stima
      </button>
      <span
        id={id}
        role="tooltip"
        className={cn(
          "pointer-events-none absolute top-full left-0 z-10 mt-2 w-56 rounded-control bg-ink px-3 py-2 text-xs font-normal leading-snug text-white shadow-pop",
          open ? "block" : "hidden group-hover:block group-focus-within:block",
        )}
      >
        Stima calcolata sul tuo consumo mensile, IVA esclusa. L&apos;importo in bolletta può variare.
      </span>
    </span>
  );
}

export function OfferCard({ offer, commodity, monthlyCost, chosen = false, onActivate }: OfferCardProps) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const unit = unitFor(commodity);
  const logo = supplierLogoSrc(offer.supplier);
  const promo = offer.promo_text?.trim();
  const details = offer.details?.trim();
  const hasOtherVariable = offer.other_variable_costs > 0;

  return (
    <article
      data-testid="offer-card"
      data-offer-id={offer.id}
      data-supplier-id={offer.supplier_id}
      data-featured={offer.featured ? "true" : "false"}
      data-monthly-cost={toCents(monthlyCost)}
      data-chosen={chosen ? "true" : "false"}
      className={cn(
        "overflow-hidden rounded-card border bg-surface shadow-card",
        offer.featured ? "border-brand-600 ring-1 ring-brand-600" : "border-line",
      )}
    >
      {offer.featured && (
        <div
          data-testid="offer-featured-band"
          className="bg-brand-600 px-5 py-1.5 text-sm font-semibold text-white"
        >
          In evidenza
        </div>
      )}

      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-8">
        <div className="min-w-0 space-y-4">
          <div className="flex items-center gap-4">
            <div
              data-testid="offer-logo"
              className="flex h-12 w-24 shrink-0 items-center justify-center overflow-hidden rounded-control border border-line bg-surface px-2"
            >
              {logo ? (
                // Plain <img>: supplier logos are SVG files, no raster optimisation needed.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt={offer.supplier.name} className="max-h-full max-w-full object-contain py-1" />
              ) : (
                <span className="line-clamp-2 text-center text-xs font-semibold leading-tight tracking-tight text-ink">
                  {offer.supplier.name}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h3 data-testid="offer-name" className="text-lg font-bold leading-snug text-ink">
                {offer.name}
              </h3>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
                <span data-testid="offer-locked">Bloccato {monthsLabel(offer.locked_months)}</span>
                {chosen && (
                  <span
                    data-testid="offer-chosen-badge"
                    className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-800"
                  >
                    <CheckIcon width={12} height={12} /> Scelta
                  </span>
                )}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-ink-muted">Prezzo {commodity === "luce" ? "luce" : "gas"}</dt>
              <dd data-testid="offer-price" className="text-base font-semibold text-ink">
                {formatPrice(offer.energy_price, unit)}
              </dd>
              {hasOtherVariable && (
                <dd className="text-xs text-ink-subtle">
                  + altri costi {formatPrice(offer.other_variable_costs, unit)}
                </dd>
              )}
            </div>
            <div>
              <dt className="text-ink-muted">Quota fissa</dt>
              <dd data-testid="offer-fixed-fee" className="text-base font-semibold text-ink">
                {formatEuro(offer.fixed_fee_monthly)}
                <span className="text-sm font-normal text-ink-muted"> /mese</span>
              </dd>
            </div>
          </dl>

          {promo && (
            <p
              data-testid="offer-promo"
              className="rounded-control border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-900"
            >
              {promo}
            </p>
          )}

          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={detailsId}
            onClick={() => setExpanded((v) => !v)}
            data-testid="offer-details-toggle"
            className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
          >
            Vedi dettagli
            <ChevronDownIcon className={cn("transition-transform", expanded && "rotate-180")} />
          </button>
        </div>

        <div className="flex flex-col gap-4 border-t border-line pt-4 lg:w-72 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <div>
            <p className="flex items-center gap-2 text-sm text-ink-muted">
              Spesa mensile <EstimateTooltip />
            </p>
            <p data-testid="offer-monthly" className="text-4xl font-bold tracking-tight text-ink">
              {formatEuro(monthlyCost)}
            </p>
            <p className="text-xs text-ink-subtle">al mese, IVA esclusa</p>
          </div>
          <Button size="lg" fullWidth onClick={onActivate} data-testid="offer-cta">
            Attiva online in 1 minuto
          </Button>
        </div>
      </div>

      {expanded && (
        <div id={detailsId} data-testid="offer-details" className="border-t border-line bg-surface-muted px-5 py-4">
          <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            <Row label="Prezzo bloccato" value={monthsLabel(offer.locked_months)} />
            <Row label="Prezzo energia" value={formatPrice(offer.energy_price, unit)} />
            <Row label="Altri costi variabili" value={formatPrice(offer.other_variable_costs, unit)} />
            <Row label="Quota fissa mensile" value={formatEuro(offer.fixed_fee_monthly)} />
            {offer.other_fixed_costs_monthly > 0 && (
              <Row label="Altri costi fissi mensili" value={formatEuro(offer.other_fixed_costs_monthly)} />
            )}
            <Row label="Costo di attivazione" value={formatEuro(offer.activation_cost)} />
          </dl>
          {details && <p className="mt-3 whitespace-pre-line text-sm text-ink-muted">{details}</p>}
        </div>
      )}
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-semibold text-ink">{value}</dd>
    </div>
  );
}
