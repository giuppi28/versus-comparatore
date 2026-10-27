import type { Offer } from "@/lib/data/types";

/** The offer fields the cost formula needs. `price_type` missing = fixed. */
export type PricedOffer = Pick<
  Offer,
  "energy_price" | "other_variable_costs" | "fixed_fee_monthly" | "other_fixed_costs_monthly"
> &
  Partial<Pick<Offer, "price_type">>;

/** Customer audience used by the ranking and the badge (lead customer type). */
export type Audience = "casa" | "business";

/** True when the offer is priced as a spread over PUN (no monthly cost can be computed). */
export function isVariableOffer(offer: { price_type?: Offer["price_type"] }): boolean {
  return offer.price_type === "variable";
}

/**
 * PRD §8, VAT excluded:
 *   monthly = (annual / 12) × (energy_price + other_variable_costs)
 *             + fixed_fee_monthly + other_fixed_costs_monthly
 * Returns the unrounded value (round only for display, see formatEuro).
 * Negative/NaN consumption is treated as 0.
 * Variable offers (SPEC decision #17: energy_price is a spread over PUN, no PUN value is
 * known) have no monthly cost: the result is null. Callers that pass an offer typed
 * `price_type: "fixed"` (or without price_type) get a plain number.
 */
export function monthlyCost(offer: PricedOffer & { price_type?: "fixed" }, annualConsumption: number): number;
export function monthlyCost(offer: PricedOffer, annualConsumption: number): number | null;
export function monthlyCost(offer: PricedOffer, annualConsumption: number): number | null {
  if (isVariableOffer(offer)) return null;
  const annual = Number.isFinite(annualConsumption) && annualConsumption > 0 ? annualConsumption : 0;
  return (
    (annual / 12) * (offer.energy_price + offer.other_variable_costs) +
    offer.fixed_fee_monthly +
    offer.other_fixed_costs_monthly
  );
}

export interface RankedOffer<T> {
  offer: T;
  /** Unrounded monthly cost for the given consumption; null for variable offers. */
  monthlyCost: number | null;
}

export interface RankOptions {
  /** Supplier whose offers must be removed (the customer's current supplier, per commodity). */
  excludeSupplierId?: string | null;
}

type RankableOffer = PricedOffer &
  Pick<Offer, "supplier_id" | "name" | "id" | "price_type" | "featured_audience">;

/** True when the admin forced this offer to the top for `audience` (Casa / Partita IVA / Entrambi). */
export function isForcedFeatured(offer: Pick<Offer, "featured_audience">, audience: Audience): boolean {
  return offer.featured_audience === audience || offer.featured_audience === "both";
}

/**
 * PRD §8 / SPEC decision #18 order, applied after dropping the current supplier's offers:
 *   1. offers forced-featured for `audience` (featured_audience = audience or "both"), fixed
 *      ones by monthly cost ascending, then variable ones by spread ascending;
 *   2. the other fixed offers by monthly cost ascending;
 *   3. the other variable offers by spread (energy_price) ascending.
 * Ties are broken by offer name (Italian collation), then id, so the order is fully
 * deterministic. Does not mutate the input.
 */
export function rankOffers<T extends RankableOffer>(
  offers: readonly T[],
  audience: Audience,
  annualConsumption: number,
  options: RankOptions = {},
): RankedOffer<T>[] {
  const { excludeSupplierId } = options;
  const group = (o: T) => (isForcedFeatured(o, audience) ? 0 : 1);
  const byVariable = (o: T) => (isVariableOffer(o) ? 1 : 0);
  return offers
    .filter((o) => !excludeSupplierId || o.supplier_id !== excludeSupplierId)
    .map((offer) => ({ offer, monthlyCost: monthlyCost(offer, annualConsumption) }))
    .sort((a, b) => {
      const ga = group(a.offer);
      const gb = group(b.offer);
      if (ga !== gb) return ga - gb;
      // Fixed offers always come before variable ones, inside the forced group too.
      const va = byVariable(a.offer);
      const vb = byVariable(b.offer);
      if (va !== vb) return va - vb;
      // Compare on cents (fixed) / millionths of a euro (spread) so float noise cannot
      // reorder equal displayed prices.
      const ka = a.monthlyCost !== null ? Math.round(a.monthlyCost * 100) : Math.round(a.offer.energy_price * 1e6);
      const kb = b.monthlyCost !== null ? Math.round(b.monthlyCost * 100) : Math.round(b.offer.energy_price * 1e6);
      if (ka !== kb) return ka - kb;
      const byName = a.offer.name.localeCompare(b.offer.name, "it");
      if (byName !== 0) return byName;
      return a.offer.id.localeCompare(b.offer.id);
    });
}

/**
 * Ids that get the "In evidenza" badge, for ONE commodity's displayed (already ranked and
 * current-supplier-filtered) list: the offers forced-featured for `audience`; if there are
 * none, the cheapest displayed fixed offer. A variable offer is never featured
 * automatically; an empty list or an all-variable list gives an empty set.
 */
export function featuredBadgeIds<T extends Pick<Offer, "id" | "price_type" | "featured_audience">>(
  ranked: readonly Pick<RankedOffer<T>, "offer">[],
  audience: Audience,
): Set<string> {
  const forced = ranked.filter((r) => isForcedFeatured(r.offer, audience));
  if (forced.length > 0) return new Set(forced.map((r) => r.offer.id));
  const cheapestFixed = ranked.find((r) => !isVariableOffer(r.offer));
  return new Set(cheapestFixed ? [cheapestFixed.offer.id] : []);
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

/**
 * Variable-price offers (luce only): the spread over PUN, "PUN + 0,01 €/kWh".
 * 2 to 4 decimals (0,01 stays "0,01", 0,0125 stays "0,0125"); NBSP before the euro sign.
 */
export function formatVariablePrice(spread: number): string {
  const text = new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
    useGrouping: "always",
  }).format(spread);
  return `PUN + ${text}${NBSP}€/kWh`;
}
