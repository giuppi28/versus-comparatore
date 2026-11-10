import type { OffersSeoPage, SeoPage } from "@/content/seo/types";
import type { OfferWithSupplier } from "@/lib/data/types";
import { formatVariablePrice } from "@/lib/logic/pricing";
import { BRAND_ALTERNATE_NAMES } from "./jsonld";

type Node = Record<string, unknown>;

const orgId = (siteUrl: string) => `${siteUrl}/#organization`;

/** Minimal inline nodes: the full Organization/WebSite live on the home graph only, so a page graph must be self-contained. */
function organizationNode(siteUrl: string): Node {
  return { "@type": "Organization", "@id": orgId(siteUrl), name: "VERSUS", alternateName: BRAND_ALTERNATE_NAMES, url: siteUrl };
}
function websiteNode(siteUrl: string): Node {
  return { "@type": "WebSite", "@id": `${siteUrl}/#website`, name: "VERSUS", alternateName: BRAND_ALTERNATE_NAMES, url: siteUrl };
}

export function buildBreadcrumb(page: SeoPage, siteUrl: string): Node {
  return {
    "@type": "BreadcrumbList",
    "@id": `${siteUrl}${page.path}#breadcrumb`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: page.h1, item: `${siteUrl}${page.path}` },
    ],
  };
}

/** Byte-identical to the visible FAQ. */
export function buildFaq(page: SeoPage, siteUrl: string): Node {
  return {
    "@type": "FAQPage",
    "@id": `${siteUrl}${page.path}#faq`,
    inLanguage: "it-IT",
    mainEntity: page.faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export function buildGuideJsonLd(page: SeoPage, siteUrl: string): Node {
  const url = `${siteUrl}${page.path}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: page.h1,
        description: page.description,
        url,
        mainEntityOfPage: url,
        datePublished: page.publishedOn ?? page.reviewedOn,
        dateModified: page.reviewedOn,
        inLanguage: "it-IT",
        image: `${siteUrl}/opengraph-image`,
        isPartOf: { "@id": `${siteUrl}/#website` },
        about: { "@id": `${siteUrl}/#service` },
        author: organizationNode(siteUrl),
        publisher: organizationNode(siteUrl),
      },
      buildBreadcrumb(page, siteUrl),
      buildFaq(page, siteUrl),
    ],
  };
}

export function buildOfferNode(offer: OfferWithSupplier): Node {
  const unitText = offer.commodity === "luce" ? "kWh" : "Smc";
  const spec: Node = { "@type": "UnitPriceSpecification", priceCurrency: "EUR", unitText, valueAddedTaxIncluded: false };
  const node: Node = {
    "@type": "Offer",
    name: offer.name,
    seller: { "@type": "Organization", name: offer.supplier.name },
    priceCurrency: "EUR",
    priceSpecification: spec,
  };
  if (offer.price_type === "variable") {
    node.description = `Prezzo variabile: ${formatVariablePrice(offer.energy_price)}, IVA esclusa.`;
  } else {
    spec.price = offer.energy_price;
  }
  return node;
}

/** `offers` = the shown (verified, sorted) offers of every listing, in page order; empty = no ItemList. */
export function buildOffersJsonLd(page: OffersSeoPage, siteUrl: string, shown: readonly OfferWithSupplier[]): Node {
  // An offer for "both" customer types appears in two listings: list it once.
  const offers = shown.filter((o, i) => shown.findIndex((x) => x.id === o.id) === i);
  const url = `${siteUrl}${page.path}`;
  const graph: Node[] = [
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: page.h1,
      description: page.description,
      inLanguage: "it-IT",
      dateModified: page.reviewedOn,
      isPartOf: websiteNode(siteUrl),
      publisher: organizationNode(siteUrl),
    },
  ];
  if (offers.length > 0) {
    graph.push({
      "@type": "ItemList",
      "@id": `${url}#offers`,
      name: page.h1,
      numberOfItems: offers.length,
      itemListElement: offers.map((o, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: buildOfferNode(o),
      })),
    });
  }
  graph.push(buildBreadcrumb(page, siteUrl), buildFaq(page, siteUrl));
  return { "@context": "https://schema.org", "@graph": graph };
}
