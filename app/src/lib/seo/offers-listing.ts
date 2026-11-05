import type { OfferWithSupplier } from "@/lib/data/types";

export const LISTING_CRITERION =
  "In questa pagina le offerte sono ordinate per prezzo crescente: prima quelle a prezzo fisso, poi quelle a prezzo variabile.";

/**
 * Only offers whose prices Aldo confirmed may appear on the SEO pages. Variable offers are luce-only
 * (SPEC decision #17: the spread is over PUN): a non-luce variable offer is dropped rather than shown
 * with a wrong index.
 */
export function verifiedOnly<T extends Pick<OfferWithSupplier, "price_verified" | "price_type" | "commodity">>(
  offers: readonly T[],
): T[] {
  return offers.filter((o) => o.price_verified === true && (o.price_type !== "variable" || o.commodity === "luce"));
}

/**
 * Fixed offers by price ascending, then variable offers by spread ascending; ties by supplier name
 * (Italian collation), then offer name, then id. Compares on millionths of a euro so float noise
 * cannot reorder equal displayed prices. Does not mutate the input.
 */
export function sortListingOffers<T extends Pick<OfferWithSupplier, "id" | "name" | "price_type" | "energy_price"> & { supplier: { name: string } }>(
  offers: readonly T[],
): T[] {
  const variable = (o: T) => (o.price_type === "variable" ? 1 : 0);
  return [...offers].sort((a, b) => {
    if (variable(a) !== variable(b)) return variable(a) - variable(b);
    const pa = Math.round(a.energy_price * 1e6);
    const pb = Math.round(b.energy_price * 1e6);
    if (pa !== pb) return pa - pb;
    return (
      a.supplier.name.localeCompare(b.supplier.name, "it") ||
      a.name.localeCompare(b.name, "it") ||
      a.id.localeCompare(b.id)
    );
  });
}

/** Most recent `updated_at` among the offers (ISO string), or null when there are none. Never "today". */
export function latestUpdate(offers: readonly Pick<OfferWithSupplier, "updated_at">[]): string | null {
  let best: string | null = null;
  let bestT = -Infinity;
  for (const o of offers) {
    const t = Date.parse(o.updated_at);
    if (!Number.isNaN(t) && t > bestT) {
      bestT = t;
      best = o.updated_at;
    }
  }
  return best;
}

export interface LoadedListing {
  heading: string;
  commodity: "luce" | "gas";
  /** Verified, sorted. */
  offers: OfferWithSupplier[];
}
