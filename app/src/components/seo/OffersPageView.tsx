import { SeoPageTemplate } from "./SeoPageTemplate";
import { OffersListing } from "./OffersListing";
import { getOffersPage } from "@/lib/seo/pages";
import { loadListings } from "@/lib/seo/load-listings";
import { buildOffersJsonLd } from "@/lib/seo/pages-jsonld";
import { SITE_URL } from "@/lib/seo/site";

/** One of the four offers pages: template + live verified offers (read on every request). */
export async function OffersPageView({ path }: { path: string }) {
  const page = getOffersPage(path);
  const listings = await loadListings(page);
  const shown = (listings ?? []).flatMap((l) => l.offers);
  return (
    <SeoPageTemplate
      page={page}
      jsonLd={buildOffersJsonLd(page, SITE_URL, shown)}
      listings={<OffersListing listings={listings} />}
    />
  );
}
