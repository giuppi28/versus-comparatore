import type { Offer } from "@/lib/data/types";

/** The offer fields the cost formula needs. */
export type PricedOffer = Pick<
  Offer,
  "energy_price" | "other_variable_costs" | "fixed_fee_monthly" | "other_fixed_costs_monthly"
>;

/**
 * PRD §8, VAT excluded:
 *   monthly = (annual / 12) × (energy_price + other_variable_costs)
 *             + fixed_fee_monthly + other_fixed_costs_monthly
 * Returns the unrounded value (round only for display, see formatEuro).
 * Negative/NaN consumption is treated as 0.
 */
export function monthlyCost(offer: PricedOffer, annualConsumption: number): number {
  const annual = Number.isFinite(annualConsumption) && annualConsumption > 0 ? annualConsumption : 0;
  return (
    (annual / 12) * (offer.energy_price + offer.other_variable_costs) +
    offer.fixed_fee_monthly +
    offer.other_fixed_costs_monthly
  );
}

export interface RankedOffer<T> {
  offer: T;
  /** Unrounded monthly cost for the given consumption. */
  monthlyCost: number;
}

export interface RankOptions {
  /** Supplier whose offers must be removed (the customer's current supplier, per commodity). */
  excludeSupplierId?: string | null;
}

/**
 * PRD §8 order: drop the current supplier's offers, then featured first, then
 * monthly cost ascending; ties broken by offer name (Italian collation), then id,
 * so the order is fully deterministic. Does not mutate the input.
 */
export function rankOffers<T extends PricedOffer & Pick<Offer, "supplier_id" | "name" | "featured" | "id">>(
  offers: readonly T[],
  annualConsumption: number,
  options: RankOptions = {},
): RankedOffer<T>[] {
  const { excludeSupplierId } = options;
  return offers
    .filter((o) => !excludeSupplierId || o.supplier_id !== excludeSupplierId)
    .map((offer) => ({ offer, monthlyCost: monthlyCost(offer, annualConsumption) }))
    .sort((a, b) => {
      if (a.offer.featured !== b.offer.featured) return a.offer.featured ? -1 : 1;
      // Compare on cents so float noise cannot reorder equal displayed prices.
      const ca = Math.round(a.monthlyCost * 100);
      const cb = Math.round(b.monthlyCost * 100);
      if (ca !== cb) return ca - cb;
      const byName = a.offer.name.localeCompare(b.offer.name, "it");
      if (byName !== 0) return byName;
      return a.offer.id.localeCompare(b.offer.id);
    });
}

/** Prefill for the editable monthly consumption: annual / 12, rounded to a whole unit. */
export function monthlyFromAnnual(annual: number): number {
  return Math.round(annual / 12);
}

/** Inverse of monthlyFromAnnual: monthly × 12. */
export function annualFromMonthly(monthly: number): number {
  return monthly * 12;
}

/** Rounds to cents (half away from zero, float-noise tolerant). */
export function roundCents(value: number): number {
  return Math.sign(value) * Math.round((Math.abs(value) + Number.EPSILON) * 100) / 100;
}

const NBSP = " ";

function formatDecimal(value: number, digits: number): string {
  return new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    useGrouping: "always",
  }).format(value);
}

/** "12,34 €" (non-breaking space before the symbol), Italian locale, 2 decimals. */
export function formatEuro(value: number): string {
  return `${formatDecimal(roundCents(value), 2)}${NBSP}€`;
}

/** Unit price with 4 decimals: "0,1290 €/kWh". */
export function formatPrice(value: number, unit: "kWh" | "Smc"): string {
  return `${formatDecimal(value, 4)}${NBSP}€/${unit}`;
}
