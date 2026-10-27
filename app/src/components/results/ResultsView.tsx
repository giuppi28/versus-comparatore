"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/brand";
import { LoadingScreen, type LoadingSupplier } from "@/components/loading";
import { OfferModal, type OfferModalOffer } from "@/components/offer-modal";
import { Button, SpinnerIcon } from "@/components/ui";
import type { Commodity, LeadCustomerType, OfferWithSupplier, Supplier } from "@/lib/data/types";
import { useFlow } from "@/lib/lead/flow-context";
import { updateLead } from "@/lib/lead/client";
import { annualKwh, annualSmc, applyFlowPatch, snapshotOffer, toLeadPatchData } from "@/lib/lead/flow-state";
import { annualFromMonthly, monthlyCost, monthlyFromAnnual, rankOffers } from "@/lib/logic";
import { ConsumptionPanel } from "./ConsumptionPanel";
import { EmptyState } from "./EmptyState";
import { DualStepIndicator } from "./DualStepIndicator";
import { OfferCard } from "./OfferCard";
import { supplierLogoSrc } from "./logo-src";
import {
  LOADED_SIGNATURE_KEY,
  audienceFor,
  buildLoadingSuppliers,
  buildOrbitSuppliers,
  commodityLabel,
  currentSupplierFor,
  currentSupplierIds,
  isPageOneIncomplete,
  loadingSignature,
  resolveLoadingMs,
  stepsFor,
} from "./results-logic";

type Phase = "loading" | "results";
/** Active offers loaded on the server, per commodity and customer type (see offerte/page.tsx). */
export type ServerOffers = Record<Commodity, Record<LeadCustomerType, OfferWithSupplier[]>>;

export interface ResultsViewProps {
  /** null when the server could not load the offers (the page shows a retry). */
  offers: ServerOffers | null;
  /**
   * Active suppliers for the loading marquee (all real ones with a logo). When null/omitted
   * (the server could not load them) the marquee falls back to the suppliers of the offers.
   */
  suppliers?: Supplier[] | null;
}

function readLoadedSignature(): string | null {
  try {
    return window.sessionStorage.getItem(LOADED_SIGNATURE_KEY);
  } catch {
    return null;
  }
}

function writeLoadedSignature(value: string) {
  try {
    window.sessionStorage.setItem(LOADED_SIGNATURE_KEY, value);
  } catch {
    // storage blocked: the animation may replay, nothing else.
  }
}

/** Lead updates are best-effort: the customer flow never blocks on them. */
function bestEffort(promise: Promise<void>) {
  promise.catch(() => {});
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-surface-muted">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col items-center gap-4 py-20 text-center text-ink-muted">{children}</div>;
}

export function ResultsView({ offers: serverOffers, suppliers: serverSuppliers = null }: ResultsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, hydrated, update } = useFlow();

  const incomplete = isPageOneIncomplete(state);
  const steps = useMemo(() => stepsFor(state), [state]);
  const isDual = steps.length === 2;
  const customerType = state.customerType;

  // ---- redirect when Page 1 data are missing ----
  useEffect(() => {
    if (hydrated && incomplete) router.replace("/");
  }, [hydrated, incomplete, router]);

  // ---- offers (loaded on the server so admin changes reach customers) ----
  const loadError = serverOffers === null;
  const [loadingDone, setLoadingDone] = useState(false);
  const offers = useMemo(() => {
    if (!serverOffers || !customerType) return null;
    const byCommodity: Partial<Record<Commodity, OfferWithSupplier[]>> = {};
    for (const c of steps) byCommodity[c] = serverOffers[c][customerType];
    return byCommodity;
  }, [serverOffers, customerType, steps]);

  // The loading animation plays unless this very comparison was already loaded in this
  // session (e.g. browser back from /attivazione). Safe to read storage here: before
  // `hydrated` the component renders a placeholder, so there is no SSR mismatch.
  const phase: Phase | null = !offers
    ? null
    : loadingDone || (hydrated && !incomplete && readLoadedSignature() === loadingSignature(state))
      ? "results"
      : "loading";

  // ---- step & consumption ----
  const [activeStep, setActiveStep] = useState<Commodity>("luce");
  const step: Commodity = steps.includes(activeStep) ? activeStep : (steps[0] ?? "luce");

  const monthlyFor = useCallback(
    (c: Commodity): number => {
      const stored = c === "luce" ? state.finalKwhMonth : state.finalSmcMonth;
      if (stored != null && stored > 0) return stored;
      const annual = c === "luce" ? annualKwh(state) : annualSmc(state);
      return Math.max(1, monthlyFromAnnual(annual ?? 0));
    },
    [state],
  );
  const monthly = monthlyFor(step);
  const annual = annualFromMonthly(monthly);

  const ranked = useMemo(
    () =>
      rankOffers(offers?.[step] ?? [], audienceFor(state), annual, {
        excludeSupplierId: currentSupplierFor(state, step),
      }),
    [offers, step, annual, state],
  );

  const handleConsumptionChange = (value: number) => {
    const chosen = state.chosenOffers[step];
    update({
      ...(step === "luce" ? { finalKwhMonth: value } : { finalSmcMonth: value }),
      // Keep an already chosen offer's cost in line with the consumption on screen.
      ...(chosen
        ? { chosenOffers: { [step]: { ...chosen, monthly_cost: monthlyCost(chosen, annualFromMonthly(value)) ?? 0 } } }
        : {}),
    });
  };

  // ---- loading screen ----
  const loadingMs = resolveLoadingMs({
    fast: searchParams.get("fast"),
    envMs: process.env.NEXT_PUBLIC_LOADING_MS ?? null,
  });

  const loadingSuppliers = useMemo<LoadingSupplier[]>(() => {
    if (serverSuppliers) {
      const all = buildLoadingSuppliers(serverSuppliers, currentSupplierIds(state), supplierLogoSrc);
      if (all.length > 0) return all;
    }
    return buildOrbitSuppliers(offers, steps, supplierLogoSrc);
  }, [serverSuppliers, state, offers, steps]);

  const handleLoadingStart = () => {
    const patch = {
      ...(steps.includes("luce") ? { finalKwhMonth: Math.max(1, monthlyFromAnnual(annualKwh(state) ?? 0)) } : {}),
      ...(steps.includes("gas") ? { finalSmcMonth: Math.max(1, monthlyFromAnnual(annualSmc(state) ?? 0)) } : {}),
    };
    update(patch);
    bestEffort(updateLead(toLeadPatchData(applyFlowPatch(state, patch), "results")));
  };

  const handleLoadingComplete = () => {
    writeLoadedSignature(loadingSignature(state));
    setLoadingDone(true);
  };

  // ---- offer choice ----
  const [modalOfferId, setModalOfferId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const modalRanked = ranked.find((r) => r.offer.id === modalOfferId) ?? null;

  const handleActivate = () => {
    if (!modalRanked || busy) return;
    const snapshot = snapshotOffer(modalRanked.offer, annual);
    const last = step === steps[steps.length - 1];
    const patch = { chosenOffers: { [step]: snapshot } };
    // Single commodity and the gas step of Luce+Gas finish the choice: step_reached = offer_chosen.
    bestEffort(updateLead(toLeadPatchData(applyFlowPatch(state, patch), last ? "offer_chosen" : undefined)));
    update(patch);
    setModalOfferId(null);
    if (last) {
      setBusy(true);
      router.push("/attivazione");
    } else {
      setActiveStep(steps[steps.indexOf(step) + 1]);
      window.scrollTo({ top: 0 });
    }
  };

  // ---- render ----
  if (!hydrated || incomplete) {
    return (
      <Shell>
        <Centered>
          <SpinnerIcon />
          <span>Caricamento…</span>
        </Centered>
      </Shell>
    );
  }

  if (loadError) {
    return (
      <Shell>
        <Centered>
          <p role="alert" data-testid="results-error" className="text-ink">
            Non siamo riusciti a caricare le offerte. Controlla la connessione e riprova.
          </p>
          <Button onClick={() => router.refresh()}>Riprova</Button>
        </Centered>
      </Shell>
    );
  }

  if (!offers || phase === null) {
    return (
      <Shell>
        <Centered>
          <SpinnerIcon />
          <span>Carichiamo le offerte…</span>
        </Centered>
      </Shell>
    );
  }

  if (phase === "loading") {
    return (
      <Shell>
        <LoadingScreen
          suppliers={loadingSuppliers}
          commodities={steps}
          excludeSupplierIds={currentSupplierIds(state)}
          durationMs={loadingMs}
          onStart={handleLoadingStart}
          onComplete={handleLoadingComplete}
        />
      </Shell>
    );
  }

  const label = commodityLabel(step);
  const modalOffer: OfferModalOffer | null = modalRanked
    ? { ...modalRanked.offer, supplier: { name: modalRanked.offer.supplier.name, logoUrl: supplierLogoSrc(modalRanked.offer.supplier) } }
    : null;

  return (
    <Shell>
      <div className="mx-auto mb-6 flex max-w-3xl flex-col items-center space-y-4 text-center sm:mb-10">
        {isDual && (
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 sm:gap-x-3">
            <DualStepIndicator
              active={step}
              luceDone={!!state.chosenOffers.luce}
              gasDone={!!state.chosenOffers.gas}
            />
            {step === "gas" && (
              <button
                type="button"
                onClick={() => setActiveStep("luce")}
                data-testid="dual-back"
                className="inline-flex h-10 items-center rounded-full border border-line bg-surface px-3 text-sm sm:px-4 font-semibold leading-none text-brand-700 transition-colors hover:border-brand-600 hover:bg-brand-50"
              >
                ← Torna alla Luce
              </button>
            )}
          </div>
        )}
        {/* Accent colour only on the closing phrase (brand-700: 5.9:1 on the page grey);
            the text content, and so the accessible name, is unchanged. */}
        <h1
          data-testid="results-title"
          className="heading-wide text-balance text-[clamp(1.5rem,1.2rem+1.4vw,2.5rem)] leading-[1.1] text-ink"
        >
          {`Le migliori offerte ${label} `}
          <span className="text-brand-700">per te</span>
        </h1>
        {isDual && step === "gas" && state.chosenOffers.luce && (
          <p data-testid="dual-luce-summary" className="text-sm text-ink-muted">
            Offerta Luce scelta: <strong className="text-ink">{state.chosenOffers.luce.offer_name}</strong>
          </p>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start lg:gap-8">
        <div className="lg:sticky lg:top-6">
          <ConsumptionPanel key={step} commodity={step} monthly={monthly} onChange={handleConsumptionChange} />
        </div>

        <section aria-label={`Offerte ${label}`} className="space-y-4">
          {ranked.length === 0 ? (
            <EmptyState commodityLabel={label} />
          ) : (
            ranked.map(({ offer, monthlyCost: cost }) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                commodity={step}
                monthlyCost={cost ?? 0}
                chosen={state.chosenOffers[step]?.offer_id === offer.id}
                onActivate={() => setModalOfferId(offer.id)}
              />
            ))
          )}
        </section>
      </div>

      {modalOffer && modalRanked && (
        <OfferModal
          open
          onClose={() => setModalOfferId(null)}
          offer={modalOffer}
          commodity={step}
          monthlyCost={modalRanked.monthlyCost ?? 0}
          onActivate={handleActivate}
          step={isDual ? `Offerta ${label}` : undefined}
        />
      )}
    </Shell>
  );
}

