import { blackLogo } from "@/components/page1/LandingSections";
import { resolveLogoUrl } from "@/lib/data/logo";
import type { OfferWithSupplier } from "@/lib/data/types";
import { IBAN_REQUIRED_NOTICE, formatPrice, formatVariablePrice } from "@/lib/logic/pricing";
import { formatItalianDate } from "@/lib/seo/dates";
import { LISTING_CRITERION, latestUpdate, type LoadedListing } from "@/lib/seo/offers-listing";

const NOTE =
  "Confrontiamo le offerte dei venditori con cui collaboriamo, non tutte quelle disponibili sul mercato. VERSUS opera come agente ed è remunerato dai venditori. Prezzi al netto di IVA. I prezzi sono indicativi e possono variare al momento del contatto con il consulente.";

const CELL = "sm:table-cell sm:px-4 sm:py-3 sm:align-middle";
const TH = "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted";

function SupplierLogoImg({ offer }: { offer: OfferWithSupplier }) {
  const url = resolveLogoUrl(offer.supplier.logo_path);
  if (!url) return null;
  const logo = blackLogo(url);
  return (
    <span aria-hidden="true" className="flex h-8 w-20 shrink-0 items-center justify-start sm:w-24">
      {/* Plain <img>: supplier logos are SVG files. The supplier name is visible text next to it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logo.src}
        alt=""
        loading="lazy"
        className={`max-h-full max-w-full object-contain opacity-80${logo.needsFilter ? " brightness-0" : ""}`}
      />
    </span>
  );
}

function OfferRow({ offer }: { offer: OfferWithSupplier }) {
  const variable = offer.price_type === "variable";
  const unit = offer.commodity === "luce" ? "kWh" : "Smc";
  return (
    <tr className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line px-4 py-4 first:border-t-0 sm:table-row sm:p-0">
      <td className={`col-span-2 ${CELL}`}>
        <div className="flex items-center gap-3">
          <SupplierLogoImg offer={offer} />
          <span className="min-w-0 font-semibold text-ink [overflow-wrap:anywhere] sm:whitespace-nowrap sm:[overflow-wrap:normal]">{offer.supplier.name}</span>
        </div>
      </td>
      <td className={`col-span-2 text-sm text-ink ${CELL}`}>
        <span className="[overflow-wrap:anywhere] sm:[overflow-wrap:normal]">{offer.name}</span>
        {offer.iban_required && <p className="mt-1 text-xs leading-snug text-ink-muted">{IBAN_REQUIRED_NOTICE}</p>}
      </td>
      <td className={`self-center text-sm text-ink-muted sm:whitespace-nowrap ${CELL}`}>{variable ? "Prezzo variabile" : "Prezzo fisso"}</td>
      <td className={`self-center text-right text-base font-semibold text-ink [overflow-wrap:anywhere] sm:whitespace-nowrap ${CELL}`}>
        {variable ? formatVariablePrice(offer.energy_price) : formatPrice(offer.energy_price, unit)}
      </td>
    </tr>
  );
}

function ListingTable({ listing, index }: { listing: LoadedListing; index: number }) {
  const id = `elenco-${index}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} className="heading-wide text-xl text-ink sm:text-2xl">
        {listing.heading}
      </h2>
      {listing.offers.length === 0 ? (
        <p className="rounded-card border border-line bg-surface px-5 py-4 text-sm text-ink-muted">
          Al momento non ci sono offerte da mostrare in questo elenco.
        </p>
      ) : (
        <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
          <table aria-labelledby={id} className="block w-full border-collapse text-left sm:table">
            <thead className="sr-only sm:not-sr-only sm:table-header-group sm:bg-surface-muted">
              <tr>
                <th scope="col" className={TH}>Venditore</th>
                <th scope="col" className={TH}>Offerta</th>
                <th scope="col" className={TH}>Tipo di prezzo</th>
                <th scope="col" className={`${TH} text-right`}>Prezzo (IVA esclusa)</th>
              </tr>
            </thead>
            <tbody className="block sm:table-row-group">
              {listing.offers.map((o) => (
                <OfferRow key={o.id} offer={o} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-sm text-ink-muted">{LISTING_CRITERION}</p>
    </section>
  );
}

/**
 * Verified offers of an offers page, as real tables (a stacked card layout below 640px).
 * Never shows fees, other costs, activation costs, locked months, estimates or the featured badge.
 * `listings` null = the repository failed: neutral sentence, no list.
 */
export function OffersListing({ listings }: { listings: LoadedListing[] | null }) {
  if (listings === null) {
    return (
      <p className="rounded-card border border-line bg-surface px-5 py-4 text-base text-ink-muted">
        L&apos;elenco delle offerte non è disponibile in questo momento. Puoi avviare il confronto dalla pagina iniziale.
      </p>
    );
  }
  const updated = latestUpdate(listings.flatMap((l) => l.offers));
  return (
    <div data-testid="offers-listing" className="flex flex-col gap-10 sm:gap-12">
      {listings.map((l, i) => (
        <ListingTable key={l.heading} listing={l} index={i} />
      ))}
      <div className="flex flex-col gap-1 text-xs leading-relaxed text-ink-subtle">
        <p>{NOTE}</p>
        {updated && <p>Listino aggiornato al {formatItalianDate(updated)}</p>}
      </div>
    </div>
  );
}
