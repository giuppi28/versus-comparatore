"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LoadingScreen, type LoadingSupplier } from "@/components/loading";
import { OfferModal, type OfferModalOffer } from "@/components/offer-modal";
import { Button, SpinnerIcon } from "@/components/ui";
import type { Commodity, LeadCustomerType, OfferWithSupplier } from "@/lib/data/types";
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
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
          <Link href="/" aria-label="VERSUS, torna all'inizio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/versus_logo_nero.svg" alt="VERSUS" className="h-8 w-auto" />
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col items-center gap-4 py-20 text-center text-ink-muted">{children}</div>;
}

export function ResultsView({ offers: serverOffers }: ResultsViewProps) {
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
      rankOffers(offers?.[step] ?? [], annual, {
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
        ? { chosenOffers: { [step]: { ...chosen, monthly_cost: monthlyCost(chosen, annualFromMonthly(value)) } } }
        : {}),
    });
  };

  // ---- loading screen ----
  const loadingMs = resolveLoadingMs({
    fast: searchParams.get("fast"),
    envMs: process.env.NEXT_PUBLIC_LOADING_MS ?? null,
  });

  const loadingSuppliers = useMemo<LoadingSupplier[]>(() => {
    const seen = new Map<string, LoadingSupplier>();
    for (const c of steps) {
      for (const o of offers?.[c] ?? []) {
        if (!seen.has(o.supplier_id)) {
          seen.set(o.supplier_id, { id: o.supplier_id, name: o.supplier.name, logoUrl: supplierLogoSrc(o.supplier) });
        }
      }
    }
    return [...seen.values()];
  }, [offers, steps]);

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
      <div className="mb-6 space-y-4">
        {isDual && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <DualStepIndicator
              active={step}
              luceDone={!!state.chosenOffers.luce}
              gasDone={!!state.chosenOffers.gas}
            />
            {step === "gas" && (
              <Button variant="ghost" onClick={() => setActiveStep("luce")} data-testid="dual-back">
                ← Torna alla Luce
              </Button>
            )}
          </div>
        )}
        <h1 data-testid="results-title" className="text-title font-bold tracking-tight text-ink">
          {isDual ? `Scegli l'offerta ${label}` : `Le migliori offerte ${label} per te`}
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
                monthlyCost={cost}
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
          monthlyCost={modalRanked.monthlyCost}
          onActivate={handleActivate}
          step={isDual ? `Offerta ${label}` : undefined}
        />
      )}
    </Shell>
  );
}

