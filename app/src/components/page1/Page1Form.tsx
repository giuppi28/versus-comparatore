"use client";

import { useCallback, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { TurnstileWidget } from "@/app/admin/login/TurnstileWidget";
import type { ComuneSuggestion, ComuniResponse } from "@/app/api/comuni/types";
import {
  Autocomplete,
  Button,
  Input,
  Select,
  SelectCardGroup,
  type AutocompleteOption,
} from "@/components/ui";
import type { LeadCommodity, LeadCustomerType, ServiceType } from "@/lib/data/types";
import { getTurnstileSiteKey } from "@/lib/lead/turnstile-config";
import { updateLead } from "@/lib/lead/client";
import { useFlow } from "@/lib/lead/flow-context";
import {
  toLeadPatchData,
  type FlowComune,
  type FlowPatch,
} from "@/lib/lead/flow-state";
import { ConsumptionBlock } from "./ConsumptionBlock";
import {
  BoltFlameIcon,
  BoltIcon,
  BuildingIcon,
  FlameIcon,
  HomeIcon,
  KeyIcon,
  PlugIcon,
  SwitchIcon,
  UserSwapIcon,
} from "./icons";
import {
  anchorId,
  Anchor,
  Block,
  CheckboxField,
  Choice,
  errorId,
  FieldError,
  FieldGroup,
  legendId,
} from "./parts";
import {
  firstErrorKey,
  isGasServiceForced,
  isLeadMissingError,
  isServiceTypeLocked,
  mapApiError,
  reduceChange,
  showCurrentSupplierBlock,
  showGasSupplier,
  showLuceSupplier,
  validatePage1,
  type FieldKey,
  type Page1Errors,
  type SupplierOption,
} from "./logic";
import { useLeadCreation } from "./useLeadCreation";

const COMMODITIES: { value: LeadCommodity; title: string; icon: ReactNode }[] = [
  { value: "luce", title: "Luce", icon: <BoltIcon /> },
  { value: "gas", title: "Gas", icon: <FlameIcon /> },
  { value: "dual", title: "Luce + Gas", icon: <BoltFlameIcon /> },
];

const CUSTOMER_TYPES: { value: LeadCustomerType; title: string; icon: ReactNode }[] = [
  { value: "casa", title: "Casa", icon: <HomeIcon /> },
  { value: "business", title: "Partita IVA", icon: <BuildingIcon /> },
];

const SERVICES: { value: ServiceType; testId: string; title: string; description: string; icon: ReactNode }[] = [
  { value: "cambio_fornitore", testId: "service-cambio", title: "Cambio fornitore", description: "Passo a un nuovo fornitore", icon: <SwitchIcon /> },
  { value: "subentro", testId: "service-subentro", title: "Subentro", description: "Riattivo un contatore spento", icon: <KeyIcon /> },
  { value: "voltura", testId: "service-voltura", title: "Voltura", description: "Cambio l'intestatario", icon: <UserSwapIcon /> },
  { value: "primo_allaccio", testId: "service-primo-allaccio", title: "Primo allaccio", description: "Nuova fornitura", icon: <PlugIcon /> },
];

/** Scrolls to a field and moves the focus to its first control. */
function scrollToField(key: FieldKey | "form-error") {
  const el = document.getElementById(key === "form-error" ? key : anchorId(key));
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  el.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea, button:not(:disabled)")?.focus({
    preventScroll: true,
  });
}

function toOption(c: ComuneSuggestion): AutocompleteOption<ComuneSuggestion> {
  return {
    value: c.istat,
    label: c.name,
    description: `Provincia di ${c.provinceName} (${c.province})`,
    data: c,
  };
}

async function searchComuni(query: string): Promise<AutocompleteOption<ComuneSuggestion>[]> {
  const res = await fetch(`/api/comuni?q=${encodeURIComponent(query)}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`comuni search failed (${res.status})`);
  const body = (await res.json()) as ComuniResponse;
  return body.comuni.map(toOption);
}

export interface Page1FormProps {
  /** Active suppliers listed in the "Fornitore attuale" dropdowns, ordered by sort_order. */
  suppliers: SupplierOption[];
}

export function Page1Form({ suppliers }: Page1FormProps) {
  const router = useRouter();
  const { state, hydrated, update } = useFlow();
  const lead = useLeadCreation({ state, hydrated, update });

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Page1Errors>({});

  /** User edit → consistent flow patch (estimates, forced Primo allaccio, ...). */
  const change = useCallback(
    (patch: FlowPatch) => {
      setServerErrors({});
      setSubmitError(null);
      update((prev) => reduceChange(prev, patch));
    },
    [update],
  );

  const clientErrors = useMemo(
    () => (submitted ? validatePage1(state, suppliers) : {}),
    [submitted, state, suppliers],
  );
  const errors: Page1Errors = { ...serverErrors, ...clientErrors };

  const comuneOption = useMemo(
    () =>
      state.comune
        ? {
            value: state.comune.istat,
            label: state.comune.name,
            description: `Provincia: ${state.comune.province}`,
          }
        : null,
    [state.comune],
  );

  const luceSuppliers = useMemo(
    () => suppliers.filter((s) => s.sellsLuce).map((s) => ({ value: s.id, label: s.name })),
    [suppliers],
  );
  const gasSuppliers = useMemo(
    () => suppliers.filter((s) => s.sellsGas).map((s) => ({ value: s.id, label: s.name })),
    [suppliers],
  );

  const business = state.customerType === "business";
  const dual = state.commodity === "dual";
  const locked = isServiceTypeLocked(state);

  function onComuneChange(option: AutocompleteOption<ComuneSuggestion> | null) {
    if (!option?.data) {
      change({ comune: null });
      return;
    }
    const c = option.data;
    const comune: FlowComune = {
      istat: c.istat,
      name: c.name,
      province: c.province,
      caps: c.caps,
      climate_zone: c.climateZone,
    };
    change({ comune });
  }

  function onConsentChange(checked: boolean) {
    change({ privacyConsent: checked });
    lead.onConsentChange(checked);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitted(true);
    setSubmitError(null);
    setServerErrors({});

    const firstError = firstErrorKey(validatePage1(state, suppliers));
    if (firstError) {
      setTimeout(() => scrollToField(firstError), 0);
      return;
    }

    setSubmitting(true);
    try {
      await lead.ensureLead();
      const patch = toLeadPatchData(state);
      try {
        await updateLead(patch);
      } catch (err) {
        if (!isLeadMissingError(err)) throw err;
        // The lead cookie expired: create the lead again, then save everything.
        lead.markLeadLost();
        await lead.ensureLead();
        await updateLead(patch);
      }
      router.push("/offerte");
    } catch (err) {
      const mapped = mapApiError(err);
      setSubmitError(mapped.message);
      setServerErrors(mapped.fields);
      setSubmitting(false);
      const key = firstErrorKey(mapped.fields);
      setTimeout(() => scrollToField(key ?? "form-error"), 0);
    }
  }

  const showConsumption = state.commodity != null && state.customerType != null;

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      data-hydrated={hydrated}
      data-testid="page1-form"
      className="flex flex-col gap-6"
    >
      <Block id="commodity" title="Cosa vuoi confrontare?" testId="block-commodity">
        <FieldGroup fieldKey="commodity" legend="Tipo di fornitura" error={errors.commodity}>
          <SelectCardGroup
            type="radio"
            aria-labelledby={legendId("commodity")}
            value={state.commodity}
            onValueChange={(v) => change({ commodity: v as LeadCommodity })}
            className="grid grid-cols-3 gap-2 sm:gap-3"
          >
            {COMMODITIES.map((c) => (
              <Choice
                key={c.value}
                testId={`commodity-${c.value}`}
                selected={state.commodity === c.value}
                value={c.value}
                title={c.title}
                icon={c.icon}
              />
            ))}
          </SelectCardGroup>
        </FieldGroup>
      </Block>

      <Block id="customer" title="Per chi è la fornitura?" testId="block-customer">
        <FieldGroup fieldKey="customerType" legend="Tipo di cliente" error={errors.customerType}>
          <SelectCardGroup
            type="radio"
            aria-labelledby={legendId("customerType")}
            value={state.customerType}
            onValueChange={(v) => change({ customerType: v as LeadCustomerType })}
            className="grid grid-cols-2 gap-3"
          >
            {CUSTOMER_TYPES.map((c) => (
              <Choice
                key={c.value}
                testId={`customer-${c.value}`}
                selected={state.customerType === c.value}
                value={c.value}
                title={c.title}
                icon={c.icon}
              />
            ))}
          </SelectCardGroup>
        </FieldGroup>
      </Block>

      <Block id="personal" title="I tuoi dati" testId="block-personal">
        {business && (
          <Anchor fieldKey="companyName">
            <Input
              id="p1-company"
              data-testid="company-name"
              label="Ragione sociale"
              autoComplete="organization"
              required
              value={state.companyName}
              onChange={(e) => change({ companyName: e.target.value })}
              error={errors.companyName}
            />
          </Anchor>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <Anchor fieldKey="firstName">
            <Input
              id="p1-first-name"
              data-testid="first-name"
              label="Nome"
              autoComplete="given-name"
              required
              value={state.firstName}
              onChange={(e) => change({ firstName: e.target.value })}
              error={errors.firstName}
            />
          </Anchor>
          <Anchor fieldKey="lastName">
            <Input
              id="p1-last-name"
              data-testid="last-name"
              label="Cognome"
              autoComplete="family-name"
              required
              value={state.lastName}
              onChange={(e) => change({ lastName: e.target.value })}
              error={errors.lastName}
            />
          </Anchor>
        </div>
        <Anchor fieldKey="phone">
          <Input
            id="p1-phone"
            data-testid="phone"
            label="Cellulare"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="Es. 333 123 4567"
            required
            value={state.phone}
            onChange={(e) => change({ phone: e.target.value })}
            error={errors.phone}
          />
        </Anchor>
        <Anchor fieldKey="comune">
          <Autocomplete<ComuneSuggestion>
            id="p1-comune"
            label="Comune"
            placeholder="Cerca il tuo comune"
            hint="Inizia a digitare il nome e scegli dall'elenco."
            required
            search={searchComuni}
            value={comuneOption}
            onChange={onComuneChange}
            error={errors.comune}
            emptyText="Nessun comune trovato"
          />
        </Anchor>

        <div id={anchorId("privacy")} className="scroll-mt-6 flex flex-col gap-3 border-t border-line pt-5">
          <CheckboxField
            id="p1-privacy"
            testId="privacy-consent"
            checked={state.privacyConsent}
            onChange={onConsentChange}
            describedBy={errors.privacy ? errorId("privacy") : undefined}
            invalid={!!errors.privacy}
          >
            <span className="text-sm text-ink-muted">
              Acconsento al trattamento dei miei dati personali come descritto nell&apos;
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand-700 underline underline-offset-2"
              >
                informativa sulla privacy
              </a>
              .
            </span>
          </CheckboxField>
          {errors.privacy && <FieldError id={errorId("privacy")}>{errors.privacy}</FieldError>}
          {lead.error && (
            <p role="alert" data-testid="consent-error" className="text-sm font-medium text-danger">
              {lead.error}
            </p>
          )}
          {hydrated && state.privacyConsent && !state.leadCreated && (
            <TurnstileWidget
              key={lead.widgetKey}
              siteKey={getTurnstileSiteKey()}
              action="lead-create"
              onToken={lead.onToken}
            />
          )}
        </div>
      </Block>

      <Block id="service" title="Di quale servizio hai bisogno?" testId="block-service">
        <FieldGroup fieldKey="serviceType" legend="Tipo di servizio" error={errors.serviceType}>
          <SelectCardGroup
            type="radio"
            aria-labelledby={legendId("serviceType")}
            value={state.serviceType}
            onValueChange={(v) => change({ serviceType: v as ServiceType })}
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            {SERVICES.map((s) => (
              <Choice
                key={s.value}
                testId={s.testId}
                selected={state.serviceType === s.value}
                value={s.value}
                title={s.title}
                description={s.description}
                icon={s.icon}
                disabled={locked}
              />
            ))}
          </SelectCardGroup>
          {(locked || (dual && isGasServiceForced(state))) && (
            <p data-testid="service-note" className="mt-3 text-sm text-ink-muted">
              {locked
                ? "Senza una fornitura gas attiva il servizio è Primo allaccio."
                : "Per il Gas, senza una fornitura attiva, il servizio è Primo allaccio."}
            </p>
          )}
        </FieldGroup>
      </Block>

      {showCurrentSupplierBlock(state) && (
        <Block id="supplier" title="Il tuo fornitore attuale" testId="block-supplier">
          {showLuceSupplier(state) && (
            <Anchor fieldKey="supplierLuce">
              <Select
                id="p1-supplier-luce"
                data-testid="supplier-luce"
                label={dual ? "Fornitore attuale della Luce" : "Fornitore attuale"}
                placeholder="Seleziona il fornitore"
                required
                options={luceSuppliers}
                value={luceSuppliers.some((o) => o.value === state.currentSupplierLuce) ? (state.currentSupplierLuce ?? "") : ""}
                onChange={(e) => change({ currentSupplierLuce: e.target.value })}
                error={errors.supplierLuce}
              />
            </Anchor>
          )}
          {showGasSupplier(state) && (
            <Anchor fieldKey="supplierGas">
              <Select
                id="p1-supplier-gas"
                data-testid="supplier-gas"
                label={dual ? "Fornitore attuale del Gas" : "Fornitore attuale"}
                placeholder="Seleziona il fornitore"
                required
                options={gasSuppliers}
                value={gasSuppliers.some((o) => o.value === state.currentSupplierGas) ? (state.currentSupplierGas ?? "") : ""}
                onChange={(e) => change({ currentSupplierGas: e.target.value })}
                error={errors.supplierGas}
              />
            </Anchor>
          )}
        </Block>
      )}

      {showConsumption && <ConsumptionBlock state={state} change={change} errors={errors} />}

      <div className="flex flex-col gap-3">
        {submitError && (
          <p
            id="form-error"
            tabIndex={-1}
            role="alert"
            data-testid="form-error"
            className="rounded-control border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
          >
            {submitError}
          </p>
        )}
        <Button type="submit" size="lg" fullWidth loading={submitting} data-testid="submit">
          Confronta le offerte
        </Button>
      </div>
    </form>
  );
}
