"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Card, Stepper } from "@/components/ui";
import { TurnstileWidget } from "@/app/admin/login/TurnstileWidget";
import type { Supplier } from "@/lib/data/types";
import { useFlow } from "@/lib/lead/flow-context";
import { totalMonthlyCost } from "@/lib/lead/flow-state";
import { completeLead, LeadApiError } from "@/lib/lead/client";
import { getTurnstileSiteKey } from "@/lib/lead/turnstile-config";
import { ActivationSummary } from "./ActivationSummary";
import {
  activationRedirect,
  buildSubmitPayload,
  firstStepWithErrors,
  normalizeActivation,
  serverFieldErrors,
  splitFormErrors,
  validateStepA,
  validateStepB,
  type ActivationStep,
  type FieldErrors,
} from "./logic";
import { clearActivationStep, setActivationStep, useActivationStep } from "./step-store";
import { StepA } from "./StepA";
import { StepB } from "./StepB";

const STEPS = ["Dati intestatario", "Fornitura"];

/** Message for a failed submit (not a field validation problem). */
export function submitErrorMessage(err: unknown): string {
  if (!(err instanceof LeadApiError)) return "Si è verificato un problema. Riprova tra poco.";
  switch (err.code) {
    case "rate_limited":
      return err.retryAfterSec
        ? `Hai effettuato troppi tentativi. Riprova tra circa ${Math.max(1, Math.ceil(err.retryAfterSec / 60))} minuti.`
        : "Hai effettuato troppi tentativi. Riprova tra qualche minuto.";
    case "turnstile_failed":
      return "Verifica di sicurezza non riuscita. Riprova.";
    case "network_error":
      return "Connessione non riuscita. Controlla la rete e riprova.";
    case "no_lead":
    case "lead_not_found":
      return "La tua sessione è scaduta. Ricomincia il confronto per inviare la richiesta.";
    case "payload_too_large":
    case "invalid_body":
    case "forbidden_origin":
    case "privacy_consent_required":
      return "Non è stato possibile inviare la richiesta. Ricarica la pagina e riprova.";
    default:
      return "Si è verificato un problema. Riprova tra poco.";
  }
}

export function ActivationForm({ suppliers }: { suppliers: Supplier[] }) {
  const router = useRouter();
  const { state, hydrated, update } = useFlow();
  const storedStep = useActivationStep();

  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  const [attempted, setAttempted] = useState<Record<ActivationStep, boolean>>({ A: false, B: false });
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [generalErrors, setGeneralErrors] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);

  const redirectTo = hydrated ? activationRedirect(state) : null;
  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  // Step B is only reachable once step A is valid (e.g. after a refresh with edited data).
  const stepAValid = Object.keys(validateStepA(state)).length === 0;
  const step: ActivationStep = storedStep === "B" && stepAValid ? "B" : "A";

  const clientErrors = step === "A" ? validateStepA(state) : validateStepB(state);

  const errorFor = useCallback(
    (field: string): string | undefined =>
      serverErrors[field] ?? (attempted[step] || touched.has(field) ? clientErrors[field] : undefined),
    [serverErrors, attempted, step, touched, clientErrors],
  );
  const touch = useCallback((field: string) => {
    setTouched((prev) => (prev.has(field) ? prev : new Set(prev).add(field)));
  }, []);
  const edited = useCallback((field: string) => {
    setServerErrors((prev) => {
      if (!(field in prev)) return prev;
      const { [field]: _removed, ...rest } = prev;
      void _removed;
      return rest;
    });
  }, []);

  function goTo(next: ActivationStep) {
    setSubmitError(null);
    setActivationStep(next);
    window.scrollTo({ top: 0 });
  }

  function focusFirstInvalid() {
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>('[data-testid^="activation-step-"] [aria-invalid="true"]')
        ?.focus();
    });
  }

  function onNextA() {
    setAttempted((p) => ({ ...p, A: true }));
    if (Object.keys(validateStepA(state)).length > 0) {
      focusFirstInvalid();
      return;
    }
    goTo("B");
  }

  async function onSubmit() {
    setSubmitError(null);
    setGeneralErrors([]);
    const errorsA = validateStepA(state);
    if (Object.keys(errorsA).length > 0) {
      setAttempted((p) => ({ ...p, A: true }));
      goTo("A");
      focusFirstInvalid();
      return;
    }
    setAttempted((p) => ({ ...p, B: true }));
    if (Object.keys(validateStepB(state)).length > 0) {
      focusFirstInvalid();
      return;
    }
    if (!captchaToken) {
      setSubmitError("Completa la verifica di sicurezza per continuare.");
      return;
    }

    setSubmitting(true);
    // Persist the normalised values (CF upper-case, POD cut to 14 ...) and send them.
    update({
      firstName: state.firstName.trim(),
      lastName: state.lastName.trim(),
      phone: state.phone.trim(),
      companyName: state.companyName.trim(),
      activation: normalizeActivation(state),
    });
    try {
      await completeLead(buildSubmitPayload(state), captchaToken);
    } catch (err) {
      setSubmitting(false);
      // A Turnstile token is single use: get a new one for the next attempt.
      setCaptchaToken(null);
      setCaptchaKey((k) => k + 1);
      if (err instanceof LeadApiError && err.code === "validation") {
        const { fields, general } = splitFormErrors(serverFieldErrors(err.fields));
        setServerErrors(fields);
        setGeneralErrors(general);
        const target = firstStepWithErrors(fields);
        if (target && target !== step) goTo(target);
        if (target) focusFirstInvalid();
        if (!target && general.length === 0) setSubmitError(submitErrorMessage(err));
        return;
      }
      setSessionExpired(
        err instanceof LeadApiError && (err.code === "no_lead" || err.code === "lead_not_found"),
      );
      setSubmitError(submitErrorMessage(err));
      return;
    }
    // Success: the thank-you page requires leadCompleted (set BEFORE navigating).
    update({ leadCompleted: true });
    clearActivationStep();
    router.push("/grazie");
  }

  if (!hydrated || redirectTo) {
    return (
      <p data-testid="activation-loading" className="py-section text-center text-ink-muted" role="status">
        Caricamento&hellip;
      </p>
    );
  }

  const total = totalMonthlyCost(state) ?? 0;
  const stepProps = { state, update, errorFor, touch, edited };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-10">
      <aside className="lg:order-2 lg:sticky lg:top-6 lg:self-start">
        <ActivationSummary luce={state.chosenOffers.luce} gas={state.chosenOffers.gas} total={total} />
      </aside>

      <div className="space-y-6 lg:order-1">
        <Stepper steps={STEPS} current={step === "A" ? 0 : 1} aria-label="Passaggi dell'attivazione" />
        <Card padding="lg" className="space-y-6">
          {generalErrors.length > 0 && (
            <div
              role="alert"
              data-testid="activation-general-error"
              className="rounded-control border border-danger bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
            >
              {generalErrors.map((m) => (
                <p key={m}>{m}</p>
              ))}
              <p className="mt-2 flex flex-wrap gap-x-4">
                <Link href="/offerte" className="underline">
                  Torna alle offerte
                </Link>
                <Link href="/" className="underline">
                  Ricomincia dall&apos;inizio
                </Link>
              </p>
            </div>
          )}

          {step === "A" ? (
            <StepA {...stepProps} onBack={() => router.push("/offerte")} onNext={onNextA} />
          ) : (
            <StepB
              {...stepProps}
              suppliers={suppliers}
              submitting={submitting}
              onBack={() => goTo("A")}
              onNext={onSubmit}
              captcha={
                <div className="space-y-3">
                  <TurnstileWidget
                    key={captchaKey}
                    siteKey={getTurnstileSiteKey()}
                    action="lead_complete"
                    onToken={setCaptchaToken}
                  />
                  {submitError && (
                    <p
                      role="alert"
                      data-testid="activation-error"
                      className="rounded-control border border-danger bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
                    >
                      {submitError}
                      {sessionExpired && (
                        <>
                          {" "}
                          <Link href="/" className="underline">
                            Ricomincia
                          </Link>
                        </>
                      )}
                    </p>
                  )}
                </div>
              }
            />
          )}
        </Card>
      </div>
    </div>
  );
}
