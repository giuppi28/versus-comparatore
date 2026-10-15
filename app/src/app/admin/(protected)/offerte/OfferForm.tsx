"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { Button, Card, CheckIcon, Input, Select } from "@/components/ui";
import { renderBold } from "@/components/offer-modal/formatBold";
import { formatEuro, monthlyCost } from "@/lib/logic";
import { saveOfferAction } from "./actions";
import {
  INITIAL_OFFER_FORM_STATE,
  MAX_ADVANTAGES,
  MAX_ADVANTAGE_LENGTH,
  MAX_DETAILS_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PROMO_LENGTH,
  parseDecimal,
  roundTo,
  type SupplierChoice,
  yearlyToMonthly,
  type FeePeriod,
  type OfferFormValues,
} from "./offer-form-schema";

/** Sample yearly consumption used by the live cost preview. */
export const PREVIEW_CONSUMPTION = { luce: 2700, gas: 1400 } as const;

const COMMODITY_OPTIONS = [
  { value: "luce", label: "Luce" },
  { value: "gas", label: "Gas" },
];
const CUSTOMER_OPTIONS = [
  { value: "casa", label: "Casa" },
  { value: "business", label: "Partita IVA" },
  { value: "both", label: "Entrambi" },
];
const PERIOD_OPTIONS = [
  { value: "month", label: "al mese" },
  { value: "year", label: "all'anno" },
];

interface AdvantageItem {
  key: number;
  text: string;
}

function monthlyFromField(raw: string, period: FeePeriod): number | null {
  const parsed = parseDecimal(raw);
  if (!parsed) return null;
  return period === "year" ? yearlyToMonthly(parsed.value) : roundTo(parsed.value, 4);
}

export function OfferForm({
  initial,
  suppliers,
  offerId,
}: {
  initial: OfferFormValues;
  suppliers: SupplierChoice[];
  /** Present when editing. */
  offerId?: string;
}) {
  const [state, formAction, pending] = useActionState(saveOfferAction, INITIAL_OFFER_FORM_STATE);
  const [v, setV] = useState<OfferFormValues>({ ...initial, advantages: [] });
  const nextKey = useRef(initial.advantages.length);
  const [advantages, setAdvantages] = useState<AdvantageItem[]>(() =>
    initial.advantages.map((text, key) => ({ key, text })),
  );
  const set = <K extends keyof OfferFormValues>(key: K, value: OfferFormValues[K]) =>
    setV((prev) => ({ ...prev, [key]: value }));

  const unit = v.commodity === "luce" ? "kWh" : "Smc";
  const errors = state.errors;

  const energy = parseDecimal(v.energy_price)?.value ?? null;
  const otherVar = parseDecimal(v.other_variable_costs)?.value ?? null;
  const feeMonthly = monthlyFromField(v.fixed_fee, v.fixed_fee_period);
  const otherFixedMonthly = monthlyFromField(v.other_fixed_costs, v.other_fixed_costs_period);
  const previewAnnual = PREVIEW_CONSUMPTION[v.commodity === "gas" ? "gas" : "luce"];
  const previewReady =
    energy !== null && otherVar !== null && feeMonthly !== null && otherFixedMonthly !== null;
  const previewCost = previewReady
    ? monthlyCost(
        {
          energy_price: energy,
          other_variable_costs: otherVar,
          fixed_fee_monthly: feeMonthly,
          other_fixed_costs_monthly: otherFixedMonthly,
        },
        previewAnnual,
      )
    : null;

  const moveAdvantage = (index: number, delta: -1 | 1) =>
    setAdvantages((list) => {
      const target = index + delta;
      if (target < 0 || target >= list.length) return list;
      const copy = [...list];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });

  const yearlyHint = (raw: string, period: FeePeriod) => {
    if (period !== "year") return undefined;
    const monthly = monthlyFromField(raw, period);
    return monthly === null ? "Verrà salvata come importo mensile (÷ 12)." : `Verrà salvata come ${formatEuro(monthly)} al mese (÷ 12).`;
  };

  return (
    <form action={formAction} noValidate className="flex flex-col gap-6" data-testid="offer-form" data-attempt={state.attempt}>
      {offerId && <input type="hidden" name="id" value={offerId} />}
      {state.message && (
        <p role="alert" data-testid="form-error" className="rounded-control bg-danger-soft px-4 py-3 font-medium text-danger">
          {state.message}
        </p>
      )}

      <Card padding="lg" className="flex flex-col gap-5">
        <h2 className="heading-section">Offerta</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <Select
            label="Fornitore"
            name="supplier_id"
            required
            placeholder="Seleziona un fornitore"
            value={v.supplier_id}
            onChange={(e) => set("supplier_id", e.target.value)}
            options={suppliers.map((s) => ({
              value: s.id,
              label: `${s.name}${s.placeholder ? " (segnaposto)" : ""}${s.active ? "" : " (non attivo)"}`,
            }))}
            error={errors.supplier_id}
          />
          <Input
            label="Nome offerta"
            name="name"
            required
            maxLength={MAX_NAME_LENGTH}
            value={v.name}
            onChange={(e) => set("name", e.target.value)}
            error={errors.name}
          />
          <Select
            label="Commodity"
            name="commodity"
            required
            value={v.commodity}
            onChange={(e) => set("commodity", e.target.value as OfferFormValues["commodity"])}
            options={COMMODITY_OPTIONS}
            error={errors.commodity}
          />
          <Select
            label="Tipo di cliente"
            name="customer_type"
            required
            value={v.customer_type}
            onChange={(e) => set("customer_type", e.target.value as OfferFormValues["customer_type"])}
            options={CUSTOMER_OPTIONS}
            error={errors.customer_type}
          />
        </div>
        <p className="text-sm text-ink-muted" data-testid="price-type-info">
          Tipo di prezzo: <strong>Prezzo fisso monorario</strong> (l&apos;unico disponibile).
        </p>
      </Card>

      <Card padding="lg" className="flex flex-col gap-5">
        <h2 className="heading-section">Prezzi (IVA esclusa)</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <Input
            label={`Prezzo energia (€/${unit})`}
            name="energy_price"
            required
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,1290"
            hint="Fino a 6 decimali, virgola o punto."
            value={v.energy_price}
            onChange={(e) => set("energy_price", e.target.value)}
            error={errors.energy_price}
          />
          <Input
            label={`Altri costi variabili (€/${unit})`}
            name="other_variable_costs"
            required
            inputMode="decimal"
            autoComplete="off"
            hint="Es. trasporto e oneri; 0 se non presenti."
            value={v.other_variable_costs}
            onChange={(e) => set("other_variable_costs", e.target.value)}
            error={errors.other_variable_costs}
          />
          <div className="grid grid-cols-[1fr_9rem] items-start gap-3">
            <Input
              label="Quota fissa (€)"
              name="fixed_fee"
              required
              inputMode="decimal"
              autoComplete="off"
              hint={yearlyHint(v.fixed_fee, v.fixed_fee_period)}
              value={v.fixed_fee}
              onChange={(e) => set("fixed_fee", e.target.value)}
              error={errors.fixed_fee}
            />
            <Select
              label="Periodo quota fissa"
              name="fixed_fee_period"
              value={v.fixed_fee_period}
              onChange={(e) => set("fixed_fee_period", e.target.value as FeePeriod)}
              options={PERIOD_OPTIONS}
            />
          </div>
          <div className="grid grid-cols-[1fr_9rem] items-start gap-3">
            <Input
              label="Altri costi fissi (€)"
              name="other_fixed_costs"
              required
              inputMode="decimal"
              autoComplete="off"
              hint={yearlyHint(v.other_fixed_costs, v.other_fixed_costs_period)}
              value={v.other_fixed_costs}
              onChange={(e) => set("other_fixed_costs", e.target.value)}
              error={errors.other_fixed_costs}
            />
            <Select
              label="Periodo altri costi fissi"
              name="other_fixed_costs_period"
              value={v.other_fixed_costs_period}
              onChange={(e) => set("other_fixed_costs_period", e.target.value as FeePeriod)}
              options={PERIOD_OPTIONS}
            />
          </div>
          <Input
            label="Prezzo bloccato per (mesi)"
            name="locked_months"
            required
            inputMode="numeric"
            autoComplete="off"
            value={v.locked_months}
            onChange={(e) => set("locked_months", e.target.value)}
            error={errors.locked_months}
          />
          <Input
            label="Costo di attivazione (€)"
            name="activation_cost"
            required
            inputMode="decimal"
            autoComplete="off"
            value={v.activation_cost}
            onChange={(e) => set("activation_cost", e.target.value)}
            error={errors.activation_cost}
          />
        </div>

        <div
          className="rounded-card border border-brand-200 bg-brand-50 p-4"
          data-testid="cost-preview"
          aria-live="polite"
        >
          <p className="text-sm font-semibold text-brand-800">
            Anteprima spesa mensile stimata
          </p>
          <p className="mt-1 text-2xl font-bold text-ink" data-testid="cost-preview-value">
            {previewCost === null ? "—" : formatEuro(previewCost)}
          </p>
          <p className="text-sm text-ink-muted">
            Consumo di esempio: {new Intl.NumberFormat("it-IT", { useGrouping: "always" }).format(previewAnnual)} {unit}/anno · IVA esclusa
          </p>
        </div>
      </Card>

      <Card padding="lg" className="flex flex-col gap-5">
        <h2 className="heading-section">Testi</h2>
        <Input
          label="Testo promo / sconto"
          name="promo_text"
          maxLength={MAX_PROMO_LENGTH}
          hint="Facoltativo. Es. «Fino a 60€ di sconto il primo anno»."
          value={v.promo_text}
          onChange={(e) => set("promo_text", e.target.value)}
          error={errors.promo_text}
        />

        <fieldset className="flex flex-col gap-3" data-testid="advantages-editor">
          <legend className="text-sm font-semibold text-ink">Vantaggi</legend>
          <p className="text-sm text-ink-muted">
            Elenco ordinato mostrato con la spunta nella scheda dell&apos;offerta. Per il grassetto
            racchiudi le parole tra due asterischi: <code>**parola**</code>.
          </p>
          {advantages.length === 0 && (
            <p className="text-sm text-ink-subtle" data-testid="advantages-empty">
              Nessun vantaggio.
            </p>
          )}
          <ol className="flex flex-col gap-3">
            {advantages.map((item, index) => (
              <li
                key={item.key}
                data-testid="advantage-item"
                className="flex flex-col gap-2 rounded-card border border-line p-3"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    name="advantages"
                    aria-label={`Vantaggio ${index + 1}`}
                    maxLength={MAX_ADVANTAGE_LENGTH}
                    value={item.text}
                    onChange={(e) =>
                      setAdvantages((list) =>
                        list.map((a) => (a.key === item.key ? { ...a, text: e.target.value } : a)),
                      )
                    }
                    className="min-h-11 w-full min-w-0 flex-1 rounded-control border border-control bg-surface px-3 text-base focus:border-brand-600 focus:outline-none focus:ring-[3px] focus:ring-brand-100"
                  />
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="secondary"
                      aria-label={`Sposta su il vantaggio ${index + 1}`}
                      disabled={index === 0}
                      onClick={() => moveAdvantage(index, -1)}
                    >
                      ↑
                    </Button>
                    <Button
                      variant="secondary"
                      aria-label={`Sposta giù il vantaggio ${index + 1}`}
                      disabled={index === advantages.length - 1}
                      onClick={() => moveAdvantage(index, 1)}
                    >
                      ↓
                    </Button>
                    <Button
                      variant="secondary"
                      aria-label={`Rimuovi il vantaggio ${index + 1}`}
                      onClick={() => setAdvantages((list) => list.filter((a) => a.key !== item.key))}
                    >
                      Rimuovi
                    </Button>
                  </div>
                </div>
                <p className="flex items-start gap-2 text-sm text-ink-muted" data-testid="advantage-preview">
                  <CheckIcon className="mt-0.5 shrink-0 text-brand-600" />
                  <span>{item.text.trim() ? renderBold(item.text) : <em>Anteprima vuota</em>}</span>
                </p>
              </li>
            ))}
          </ol>
          {errors.advantages && (
            <p role="alert" className="text-sm font-medium text-danger">
              {errors.advantages}
            </p>
          )}
          <div>
            <Button
              variant="secondary"
              disabled={advantages.length >= MAX_ADVANTAGES}
              onClick={() => {
                const key = nextKey.current++;
                setAdvantages((list) => [...list, { key, text: "" }]);
              }}
            >
              Aggiungi vantaggio
            </Button>
          </div>
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="offer-details" className="text-sm font-semibold text-ink">
            Dettagli e condizioni
          </label>
          <textarea
            id="offer-details"
            name="details"
            rows={6}
            maxLength={MAX_DETAILS_LENGTH}
            value={v.details}
            onChange={(e) => set("details", e.target.value)}
            aria-invalid={errors.details ? true : undefined}
            className="w-full rounded-control border border-control bg-surface px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-[3px] focus:ring-brand-100"
          />
          {errors.details && <p role="alert" className="text-sm font-medium text-danger">{errors.details}</p>}
        </div>
      </Card>

      <Card padding="lg" className="flex flex-col gap-4">
        <h2 className="heading-section">Stato</h2>
        <Toggle
          name="active"
          label="Attiva"
          hint="Visibile ai clienti (se anche il fornitore è attivo)."
          checked={v.active}
          onChange={(c) => set("active", c)}
        />
        <Toggle
          name="featured"
          label="In evidenza"
          hint="Mostrata per prima nei risultati."
          checked={v.featured}
          onChange={(c) => set("featured", c)}
        />
        <Toggle
          name="price_verified"
          label="Prezzo verificato"
          hint="Uso interno: i prezzi sono stati controllati. Serve per la messa online."
          checked={v.price_verified}
          onChange={(c) => set("price_verified", c)}
        />
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href="/admin/offerte"
          className="inline-flex min-h-11 items-center justify-center rounded-control border border-control bg-surface px-5 font-semibold text-ink transition-colors hover:border-ink"
        >
          Annulla
        </Link>
        <Button type="submit" loading={pending}>
          {offerId ? "Salva modifiche" : "Crea offerta"}
        </Button>
      </div>
    </form>
  );
}

function Toggle({
  name,
  label,
  hint,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-5 shrink-0 rounded border-2 border-control accent-brand-600"
      />
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="block text-sm text-ink-muted">{hint}</span>
      </span>
    </label>
  );
}
