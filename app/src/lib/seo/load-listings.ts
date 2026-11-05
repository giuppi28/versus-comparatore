import type { OffersSeoPage } from "@/content/seo/types";
import { getRepository } from "@/lib/data";
import { sortListingOffers, verifiedOnly, type LoadedListing } from "./offers-listing";

/**
 * Loads the verified, sorted offers of every listing of an offers page. Returns null when the
 * repository fails (the page then renders without the list, status 200).
 */
export async function loadListings(page: OffersSeoPage): Promise<LoadedListing[] | null> {
  try {
    const repo = getRepository();
    return await Promise.all(
      page.listings.map(async (l) => ({
        heading: l.heading,
        commodity: l.commodity,
        offers: sortListingOffers(verifiedOnly(await repo.listActiveOffers(l.commodity, l.customerType))),
      })),
    );
  } catch (error) {
    console.error("seo offers page: could not load the active offers", error);
    return null;
  }
}
