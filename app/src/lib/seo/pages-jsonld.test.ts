import { describe, expect, it } from "vitest";
import { GUIDE_PAGES } from "@/content/seo/guides";
import { OFFERS_PAGES } from "@/content/seo/offers-pages";
import type { OfferWithSupplier } from "@/lib/data/types";
import { serializeJsonLd } from "./jsonld";
import { buildGuideJsonLd, buildOfferNode, buildOffersJsonLd } from "./pages-jsonld";

const URL = "https://versuscomparatorelucegas.it";
const ORG = { "@type": "Organization", "@id": `${URL}/#organization`, name: "VERSUS", url: URL };
const SITE = { "@type": "WebSite", "@id": `${URL}/#website`, name: "VERSUS", url: URL };

const base = {
  id: "o1",
  name: "Casa Fix",
  commodity: "luce",
  price_type: "fixed",
  energy_price: 0.1234,
  supplier: { name: "Enel Energia" },
} as unknown as OfferWithSupplier;

const NEW_GUIDES = ["/guida/come-scegliere-offerta-luce-gas", "/guida/fine-tutela-mercato-libero"];
const graphOf = (data: Record<string, unknown>) => data["@graph"] as Record<string, unknown>[];

describe("guide JSON-LD", () => {
  for (const page of GUIDE_PAGES) {
    it(`${page.path}: Article + BreadcrumbList + FAQPage`, () => {
      const graph = graphOf(buildGuideJsonLd(page, URL));
      expect(graph.map((n) => n["@type"])).toEqual(["Article", "BreadcrumbList", "FAQPage"]);
      const article = graph[0];
      expect(article.headline).toBe(page.h1);
      expect(article.datePublished).toBe(NEW_GUIDES.includes(page.path) ? "2026-11-07" : "2026-11-05");
      expect(article.dateModified).toBe(page.reviewedOn);
      expect(article.author).toEqual(ORG);
      expect(article.publisher).toEqual(ORG);
      expect(article.inLanguage).toBe("it-IT");
      const faq = graph[2].mainEntity as { name: string; acceptedAnswer: { text: string } }[];
      expect(faq.map((q) => [q.name, q.acceptedAnswer.text])).toEqual(page.faq.map((f) => [f.q, f.a]));
    });
  }
});

describe("offers JSON-LD", () => {
  const page = OFFERS_PAGES[0];

  it("fixed offer: UnitPriceSpecification with the numeric price, VAT excluded", () => {
    const node = buildOfferNode(base);
    expect(node).toMatchObject({
      "@type": "Offer",
      name: "Casa Fix",
      seller: { "@type": "Organization", name: "Enel Energia" },
      priceCurrency: "EUR",
      priceSpecification: { "@type": "UnitPriceSpecification", price: 0.1234, unitText: "kWh", valueAddedTaxIncluded: false },
    });
  });

  it("gas unit is Smc", () => {
    const node = buildOfferNode({ ...base, commodity: "gas" });
    expect((node.priceSpecification as Record<string, unknown>).unitText).toBe("Smc");
  });

  it("variable offer: no numeric price, spread in the description", () => {
    const node = buildOfferNode({ ...base, price_type: "variable", energy_price: 0.01 });
    expect((node.priceSpecification as Record<string, unknown>).price).toBeUndefined();
    expect(node.description).toContain("PUN + 0,01");
  });

  it("WebPage + ItemList + Breadcrumb + FAQ; duplicated offers listed once", () => {
    const graph = graphOf(buildOffersJsonLd(page, URL, [base, base, { ...base, id: "o2" }]));
    expect(graph.map((n) => n["@type"])).toEqual(["WebPage", "ItemList", "BreadcrumbList", "FAQPage"]);
    expect(graph[1].numberOfItems).toBe(2);
    expect(graph[0].publisher).toEqual(ORG);
    expect(graph[0].isPartOf).toEqual(SITE);
  });

  it("no offers: no ItemList", () => {
    const graph = graphOf(buildOffersJsonLd(page, URL, []));
    expect(graph.map((n) => n["@type"])).toEqual(["WebPage", "BreadcrumbList", "FAQPage"]);
  });

  it("never emits Product, ratings, reviews, telephone or sameAs", () => {
    const text = serializeJsonLd(buildOffersJsonLd(page, URL, [base]));
    expect(text).not.toMatch(/Product|AggregateRating|Review|telephone|sameAs/);
  });

  it("serialization escapes < so no string can close the script tag", () => {
    expect(serializeJsonLd({ a: "</script>" })).not.toContain("</script>");
  });
});
