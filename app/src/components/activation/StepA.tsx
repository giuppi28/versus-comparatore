"use client";

import type { FormEvent, ReactNode } from "react";
import {
  Button,
  Input,
  OtherIcon,
  OwnerIcon,
  SelectCard,
  SelectCardGroup,
  TenantIcon,
  UsufructuaryIcon,
} from "@/components/ui";
import type { HousingTitle } from "@/lib/data/types";
import { normalizeCodiceFiscale } from "@/lib/logic/validators";
import { GroupError, GroupLabel } from "./FieldError";
import type { StepProps } from "./types";

const HOUSING_OPTIONS: ReadonlyArray<{
  value: HousingTitle;
  label: string;
  icon: ReactNode;
}> = [
  { value: "proprietario", label: "Proprietario", icon: <OwnerIcon /> },
  { value: "inquilino", label: "Inquilino", icon: <TenantIcon /> },
  { value: "usufruttuario", label: "Usufruttuario", icon: <UsufructuaryIcon /> },
  { value: "altro", label: "Altro", icon: <OtherIcon /> },
];

/** Step A — "Dati intestatario" (PRD §10). */
export function StepA({
  state,
  update,
  errorFor,
  touch,
  edited,
  onBack,
  onNext,
}: StepProps & { onNext: () => void }) {
  const business = state.customerType === "business";
  const a = state.activation;

  function submit(e: FormEvent) {
    e.preventDefault();
    onNext();
  }

  return (
    <form noValidate onSubmit={submit} data-testid="activation-step-a" className="space-y-8">
      <div>
        <h2 className="heading-section text-ink">Dati intestatario</h2>
        <p className="mt-1 text-base text-ink-muted">
          Controlla i tuoi dati e completa quelli mancanti.
        </p>
      </div>

      {business && (
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Ragione sociale"
            name="company_name"
            required
            autoComplete="organization"
            value={state.companyName}
            error={errorFor("company_name")}
            onChange={(e) => {
              edited("company_name");
              update({ companyName: e.target.value });
            }}
            onBlur={() => touch("company_name")}
          />
          <Input
            label="Partita IVA"
            name="vat_number"
            required
            inputMode="numeric"
            autoComplete="off"
            maxLength={16}
            value={a.vatNumber}
            error={errorFor("vat_number")}
            onChange={(e) => {
              edited("vat_number");
              update({ activation: { vatNumber: e.target.value } });
            }}
            onBlur={() => touch("vat_number")}
          />
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Nome"
          name="first_name"
          required
          autoComplete="given-name"
          value={state.firstName}
          error={errorFor("first_name")}
          onChange={(e) => {
            edited("first_name");
            edited("tax_code");
            update({ firstName: e.target.value });
          }}
          onBlur={() => touch("first_name")}
        />
        <Input
          label="Cognome"
          name="last_name"
          required
          autoComplete="family-name"
          value={state.lastName}
          error={errorFor("last_name")}
          onChange={(e) => {
            edited("last_name");
            edited("tax_code");
            update({ lastName: e.target.value });
          }}
          onBlur={() => touch("last_name")}
        />
        <Input
          label="Telefono cellulare"
          name="phone"
          type="tel"
          required
          inputMode="tel"
          autoComplete="tel-national"
          value={state.phone}
          error={errorFor("phone")}
          onChange={(e) => {
            edited("phone");
            update({ phone: e.target.value });
          }}
          onBlur={() => touch("phone")}
        />
        <Input
          label="Codice fiscale"
          name="tax_code"
          required
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={20}
          value={a.taxCode}
          error={errorFor("tax_code")}
          onChange={(e) => {
            edited("tax_code");
            update({ activation: { taxCode: e.target.value.toUpperCase() } });
          }}
          onBlur={() => {
            touch("tax_code");
            update({ activation: { taxCode: normalizeCodiceFiscale(a.taxCode) } });
          }}
        />
      </div>

      <div>
        <GroupLabel id="housing-title-label" required>
          Nell&apos;alloggio in cui vivi sei&hellip;?
        </GroupLabel>
        <SelectCardGroup
          type="radio"
          aria-labelledby="housing-title-label"
          value={a.housingTitle}
          onValueChange={(v) => {
            edited("housing_title");
            touch("housing_title");
            update({ activation: { housingTitle: v as HousingTitle } });
          }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {HOUSING_OPTIONS.map((o) => (
            <div key={o.value} data-testid={`housing_title-${o.value}`}>
              <SelectCard value={o.value} title={o.label} icon={o.icon} />
            </div>
          ))}
        </SelectCardGroup>
        <GroupError id="housing-title-error" message={errorFor("housing_title")} />
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button variant="secondary" size="lg" data-testid="activation-back" onClick={onBack}>
          Indietro
        </Button>
        <Button type="submit" size="lg" data-testid="activation-next">
          Prosegui
        </Button>
      </div>
    </form>
  );
}
