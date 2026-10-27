"use client";

import { useId, useState, type ReactNode } from "react";
import { Card, ChevronDownIcon, cn } from "@/components/ui";
import type { ChosenOfferSnapshot } from "@/lib/lead/flow-state";
import { resolveLogoUrl } from "@/lib/data/logo";
import { formatEuro, formatPrice } from "@/lib/logic";

export interface ActivationSummaryProps {
  luce: ChosenOfferSnapshot | null;
  gas: ChosenOfferSnapshot | null;
  /** Sum of the chosen offers' monthly costs (unrounded). */
  total: number;
}

function monthsLabel(n: number | null): string {
  if (n === null) return "—";
  return n === 1 ? "1 mese" : `${n} mesi`;
}

/** Supplier logo, or a neutral text chip when no logo is available. */
function SupplierChip({ offer }: { offer: ChosenOfferSnapshot }) {
  const url = resolveLogoUrl(offer.supplier_logo_path);
  return (
    <div
      data-testid="summary-logo"
      className="flex h-11 w-24 shrink-0 items-center justify-center overflow-hidden rounded-control border border-line bg-surface px-2"
    >
      {url ? (
        // Plain <img>: supplier logos are SVG files.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={offer.supplier_name} className="max-h-full max-w-full object-contain py-1" />
      ) : (
        <span className="line-clamp-2 text-center text-xs font-semibold leading-tight tracking-tight text-ink">
          {offer.supplier_name}
        </span>
      )}
    </div>
  );
}

function Row({ label, children, testId }: { label: string; children: ReactNode; testId?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd data-testid={testId} className="text-right text-sm font-semibold text-ink">
        {children}
      </dd>
    </div>
  );
}

function OfferBlock({ offer, label }: { offer: ChosenOfferSnapshot; label: string | null }) {
  const unit = offer.commodity === "luce" ? "kWh" : "Smc";
  const key = offer.commodity;
  return (
    <section data-testid={`summary-offer-${key}`} aria-label={label ?? "Offerta scelta"}>
      <div className="flex items-center gap-3">
        <SupplierChip offer={offer} />
        <div className="min-w-0">
          {label && (
            <p className="heading-section text-brand-700">{label}</p>
          )}
          <p className="text-sm font-semibold text-ink" data-testid={`summary-product-${key}`}>
            {offer.offer_name}
          </p>
        </div>
      </div>
      <dl className="mt-2 divide-y divide-line">
        <Row label="Attivazione" testId={`summary-activation-${key}`}>
          {formatEuro(offer.activation_cost)}
        </Row>
        <Row label="Cambio contatore">No</Row>
        <Row label="Prezzo bloccato" testId={`summary-locked-${key}`}>
          {monthsLabel(offer.locked_months)}
        </Row>
        <Row label="Prezzo energia" testId={`summary-price-${key}`}>
          {formatPrice(offer.energy_price, unit)}
        </Row>
        {offer.other_variable_costs > 0 && (
          <Row label="Altri costi variabili">{formatPrice(offer.other_variable_costs, unit)}</Row>
        )}
        <Row label="Quota fissa mensile" testId={`summary-fixed-${key}`}>
          {formatEuro(offer.fixed_fee_monthly + offer.other_fixed_costs_monthly)}
        </Row>
      </dl>
    </section>
  );
}

/**
 * "La tua offerta" summary (PRD §10). Desktop: always open, sticky in the right column
 * (the sticky positioning lives in the page layout). Mobile: compact card with the total
 * always visible and the details collapsed behind a toggle.
 */
export function ActivationSummary({ luce, gas, total }: ActivationSummaryProps) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const offers = [luce, gas].filter((o): o is ChosenOfferSnapshot => o !== null);
  const dual = offers.length > 1;

  return (
    <Card data-testid="activation-summary" aria-label="La tua offerta" className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="heading-section text-ink">La tua offerta</h2>
          {!dual && offers[0] && (
            <p className="mt-0.5 text-sm text-ink-muted">
              {offers[0].supplier_name} · {offers[0].offer_name}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-card bg-surface-muted px-4 py-3">
        <p className="text-sm text-ink-muted">Spesa mensile</p>
        <p data-testid="summary-total" className="text-3xl font-bold text-ink">
          {formatEuro(total)}
        </p>
        <p className="text-xs text-ink-subtle">Stima IVA esclusa</p>
        {dual && (
          <ul className="mt-2 space-y-0.5 text-sm text-ink-muted">
            {luce && (
              <li data-testid="summary-monthly-luce">
                Luce: <span className="font-semibold text-ink">{formatEuro(luce.monthly_cost)}</span>
              </li>
            )}
            {gas && (
              <li data-testid="summary-monthly-gas">
                Gas: <span className="font-semibold text-ink">{formatEuro(gas.monthly_cost)}</span>
              </li>
            )}
          </ul>
        )}
      </div>

      <button
        type="button"
        data-testid="summary-toggle"
        aria-expanded={open}
        aria-controls={detailsId}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center justify-between rounded-control px-1 text-sm font-semibold text-brand-700 hover:bg-brand-50 lg:hidden"
      >
        {open ? "Nascondi dettagli" : "Mostra dettagli dell'offerta"}
        <ChevronDownIcon className={cn("transition-transform", open && "rotate-180")} />
      </button>

      <div
        id={detailsId}
        data-testid="summary-details"
        className={cn("space-y-5", open ? "block" : "max-lg:hidden")}
      >
        {luce && <OfferBlock offer={luce} label={dual ? "Luce" : null} />}
        {gas && <OfferBlock offer={gas} label={dual ? "Gas" : null} />}
      </div>
    </Card>
  );
}
