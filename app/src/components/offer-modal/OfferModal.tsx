"use client";

import type { ReactNode } from "react";
import { Button, CheckIcon, ChevronDownIcon, Modal } from "@/components/ui";
import { IBAN_REQUIRED_NOTICE, formatEuro, formatPrice, formatVariablePrice, isVariableOffer } from "@/lib/logic";
import type { Commodity, Offer, Supplier } from "@/lib/data/types";
import { renderBold } from "./formatBold";

/** Supplier as needed by the modal: the logo URL is resolved by the caller. */
export type OfferModalSupplier = Pick<Supplier, "name"> & {
  /** Ready-to-use image URL. Takes precedence over `logo_path`. */
  logoUrl?: string | null;
  /** Used only when it already is an absolute URL or an app path ("/..."). */
  logo_path?: string | null;
};

export type OfferModalOffer = Offer & { supplier: OfferModalSupplier };

export interface OfferModalProps {
  open: boolean;
  onClose: () => void;
  offer: OfferModalOffer;
  commodity: Commodity;
  /** Estimated monthly cost (VAT excluded), computed by the caller. */
  monthlyCost: number | null;
  onActivate: () => void;
  /** Luce + Gas flow only: "Offerta Luce" / "Offerta Gas". */
  step?: string;
}

function resolveLogo(supplier: OfferModalSupplier): string | null {
  if (supplier.logoUrl) return supplier.logoUrl;
  const p = supplier.logo_path;
  if (p && (p.startsWith("/") || /^https?:\/\//.test(p))) return p;
  return null;
}

function SupplierLogo({ supplier }: { supplier: OfferModalSupplier }) {
  const url = resolveLogo(supplier);
  return (
    <div
      data-testid="offer-modal-logo"
      className="flex h-12 w-24 shrink-0 items-center justify-center overflow-hidden rounded-control border border-line bg-surface px-2"
    >
      {url ? (
        // Plain <img>: supplier logos are SVG files, no raster optimisation needed.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={supplier.name} className="max-h-full max-w-full object-contain py-1" />
      ) : (
        <span className="line-clamp-2 text-center text-xs font-semibold leading-tight tracking-tight text-ink">
          {supplier.name}
        </span>
      )}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-right text-sm font-semibold text-ink">{children}</dd>
    </div>
  );
}

function monthsLabel(n: number | null): string {
  if (n === null) return "—";
  return n === 1 ? "1 mese" : `${n} mesi`;
}

export function OfferModal({
  open,
  onClose,
  offer,
  commodity,
  monthlyCost,
  onActivate,
  step,
}: OfferModalProps) {
  const unit = commodity === "luce" ? "kWh" : "Smc";
  const advantages = offer.advantages.filter((a) => a.trim().length > 0);
  const variable = isVariableOffer(offer);
  const priceText = variable ? formatVariablePrice(offer.energy_price) : formatPrice(offer.energy_price, unit);
  const promo = offer.promo_text?.trim();
  const details = offer.details?.trim();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={offer.name}
      header={<SupplierLogo supplier={offer.supplier} />}
      className="max-sm:h-dvh max-sm:max-h-dvh max-sm:rounded-none sm:max-w-xl [&>div:first-child]:items-center"
      footer={
        <Button size="lg" fullWidth onClick={onActivate} data-testid="offer-modal-cta">
          Attiva online in 1 minuto
        </Button>
      }
    >
      <div data-testid="offer-modal" className="space-y-7">
        {step && (
          <p
            data-testid="offer-modal-step"
            className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700"
          >
            {step}
          </p>
        )}

        {offer.iban_required && (
          <p
            data-testid="offer-modal-iban-notice"
            className="rounded-card bg-surface-muted px-4 py-3 text-sm font-medium text-ink"
          >
            {IBAN_REQUIRED_NOTICE}
          </p>
        )}

        {promo && (
          <p
            data-testid="offer-modal-promo"
            className="rounded-card border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-900"
          >
            {promo}
          </p>
        )}

        {advantages.length > 0 && (
          <section aria-labelledby="offer-modal-advantages-title">
            <h3 id="offer-modal-advantages-title" className="heading-section mb-3">
              I vantaggi dell&apos;offerta
            </h3>
            <ul data-testid="offer-modal-advantages" className="space-y-2.5">
              {advantages.map((adv, i) => (
                <li key={i} className="flex items-start gap-3 text-base text-ink">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                    <CheckIcon width={16} height={16} />
                  </span>
                  <span>{renderBold(adv)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="offer-modal-features-title">
          <h3 id="offer-modal-features-title" className="heading-section mb-3">
            Caratteristiche principali
          </h3>
          <div
            data-testid="offer-modal-monthly"
            className="mb-3 rounded-card bg-surface-muted px-4 py-4"
          >
            {monthlyCost === null ? (
              <>
                <p className="text-sm text-ink-muted">Spesa mensile</p>
                <p className="text-2xl font-bold text-ink">Varia con il PUN</p>
                <p className="text-xs text-ink-subtle">{priceText}</p>
              </>
            ) : (
              <>
                <p className="text-sm text-ink-muted">Spesa mensile stimata</p>
                <p className="text-3xl font-bold text-ink">{formatEuro(monthlyCost)}</p>
                <p className="text-xs text-ink-subtle">Stima IVA esclusa</p>
              </>
            )}
          </div>
          <dl data-testid="offer-modal-features" className="divide-y divide-line">
            {!variable && <Fact label="Prezzo bloccato">{monthsLabel(offer.locked_months)}</Fact>}
            <Fact label={variable ? "Prezzo" : "Prezzo energia"}>{priceText}</Fact>
            <Fact label="Altri costi variabili">{formatPrice(offer.other_variable_costs, unit)}</Fact>
            <Fact label="Quota fissa mensile">{formatEuro(offer.fixed_fee_monthly)}</Fact>
            {offer.other_fixed_costs_monthly > 0 && (
              <Fact label="Altri costi fissi mensili">
                {formatEuro(offer.other_fixed_costs_monthly)}
              </Fact>
            )}
            <Fact label="Costo di attivazione">{formatEuro(offer.activation_cost)}</Fact>
            <Fact label="Tipo di tariffa">
              {variable
                ? "Tariffa monoraria a prezzo variabile"
                : commodity === "luce"
                  ? "Tariffa monoraria a prezzo fisso"
                  : "Tariffa a prezzo fisso"}
            </Fact>
          </dl>
        </section>

        {details && (
          <details data-testid="offer-modal-details" className="group rounded-card border border-line">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
              Dettagli e condizioni
              <ChevronDownIcon className="shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <p className="whitespace-pre-line border-t border-line px-4 py-3 text-sm text-ink-muted">
              {details}
            </p>
          </details>
        )}
      </div>
    </Modal>
  );
}
