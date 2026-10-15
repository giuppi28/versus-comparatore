import type { OfferWithSupplier } from "@/lib/data/types";

/** Exactly what customers see: active offers of active suppliers. */
export function isVisibleToCustomers(offer: Pick<OfferWithSupplier, "active"> & { supplier: { active: boolean } }): boolean {
  return offer.active && offer.supplier.active;
}
