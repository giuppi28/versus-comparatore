"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button, Card, CheckIcon } from "@/components/ui";
import { useFlow } from "@/lib/lead/flow-context";
import type { ChosenOfferSnapshot } from "@/lib/lead/flow-state";
import { formatEuro, formatPrice } from "@/lib/logic";
import { thankYouSummary, type ThankYouSummary } from "./summary";

/**
 * Thank-you page (PRD §11). The only place where the callback is mentioned.
 *
 * The flow is reset as soon as the summary is copied into local state, so a new
 * comparison starts clean. A refresh afterwards finds no data and redirects to "/".
 */
export default function GraziePage() {
  const { state, hydrated, reset } = useFlow();
  const router = useRouter();
  const live = hydrated ? thankYouSummary(state) : null;
  const [snapshot, setSnapshot] = useState<ThankYouSummary | null>(null);

  // Copy the summary on the first render that has data (render-phase state derivation).
  if (snapshot === null && live !== null) setSnapshot(live);

  // Once copied, clear the flow so a new comparison starts clean.
  useEffect(() => {
    if (snapshot !== null) reset();
  }, [snapshot, reset]);

  // Nothing to show after hydration: back to the home page.
  useEffect(() => {
    if (hydrated && live === null && snapshot === null) router.replace("/");
  }, [hydrated, live, snapshot, router]);

  const view = snapshot ?? live;
  if (!view) return null;

  const dual = view.offers.length > 1;

  return (
    <main className="flex flex-1 flex-col items-center bg-gradient-to-b from-brand-50 to-surface px-5 py-10 sm:py-16">
      <Image
        src="/brand/versus_logo_nero.svg"
        alt="VERSUS"
        width={286}
        height={90}
        className="mb-8 h-auto w-44 sm:w-56"
      />
      <Card padding="lg" className="w-full max-w-xl">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-brand-600 text-white">
            <CheckIcon width={32} height={32} />
          </span>
          <h1 data-testid="thankyou-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
            Grazie, {view.firstName}!
          </h1>
          <p className="text-base text-ink-muted">
            Sarai ricontattato a breve da un nostro consulente per confermare l&apos;attivazione della
            tua offerta.
          </p>
        </div>

        <section
          data-testid="thankyou-summary"
          aria-label="Riepilogo offerta scelta"
          className="mt-8 flex flex-col gap-4"
        >
          {view.offers.map((offer) => (
            <OfferSummary key={offer.commodity} offer={offer} />
          ))}
        </section>

        {dual && view.totalMonthly !== null && (
          <div
            data-testid="thankyou-total"
            className="mt-4 flex items-center justify-between rounded-control bg-brand-50 px-5 py-4"
          >
            <span className="font-semibold">Spesa mensile totale stimata</span>
            <span className="text-xl font-bold text-brand-700">{formatEuro(view.totalMonthly)}</span>
          </div>
        )}

        <p className="mt-4 text-sm text-ink-subtle">Stima IVA esclusa.</p>

        <Button
          fullWidth
          size="lg"
          className="mt-8"
          onClick={() => {
            reset();
            router.push("/");
          }}
        >
          Torna alla home
        </Button>
      </Card>
    </main>
  );
}

function OfferSummary({ offer }: { offer: ChosenOfferSnapshot }) {
  const isLuce = offer.commodity === "luce";
  const commodityLabel = isLuce ? "Luce" : "Gas";
  const unit = isLuce ? "kWh" : "Smc";
  return (
    <article
      data-testid={`thankyou-offer-${offer.commodity}`}
      className="rounded-card border border-line bg-surface-muted p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold uppercase tracking-wide text-brand-700">
          {commodityLabel}
        </span>
        <span className="rounded-full border border-line-strong bg-surface px-3 py-1 text-sm font-semibold">
          {offer.supplier_name}
        </span>
      </div>
      <p className="mt-2 text-lg font-semibold">{offer.offer_name}</p>

      <div className="mt-3 flex items-baseline justify-between gap-4 border-b border-line pb-3">
        <span className="text-ink-muted">Spesa mensile stimata</span>
        <span className="text-2xl font-bold">{formatEuro(offer.monthly_cost)}</span>
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-ink-subtle">Bloccato</dt>
          <dd className="font-semibold">
            {offer.locked_months} {offer.locked_months === 1 ? "mese" : "mesi"}
          </dd>
        </div>
        <div>
          <dt className="text-ink-subtle">Prezzo</dt>
          <dd className="font-semibold">{formatPrice(offer.energy_price, unit)}</dd>
        </div>
        <div>
          <dt className="text-ink-subtle">Quota fissa</dt>
          <dd className="font-semibold">{formatEuro(offer.fixed_fee_monthly)}/mese</dd>
        </div>
      </dl>
    </article>
  );
}
