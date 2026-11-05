import { FAQ } from "@/components/page1/faq";
import { COMPANY, COMPANY_ADDRESS } from "@/lib/legal/company";

/** Facts only (docs/geo/canonical-facts.md): no prices, savings, ratings, reviews, telephone or sameAs. */
export function buildJsonLd(siteUrl: string): Record<string, unknown> {
  const orgId = `${siteUrl}/#organization`;
  const siteId = `${siteUrl}/#website`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": orgId,
        name: "VERSUS",
        legalName: COMPANY.ragioneSociale,
        url: siteUrl,
        logo: `${siteUrl}/brand/versus_icona.svg`,
        email: COMPANY.email,
        vatID: COMPANY.partitaIva,
        address: { "@type": "PostalAddress", ...COMPANY_ADDRESS },
      },
      {
        "@type": "WebSite",
        "@id": siteId,
        url: siteUrl,
        name: "VERSUS",
        inLanguage: "it-IT",
        publisher: { "@id": orgId },
      },
      {
        "@type": "Service",
        "@id": `${siteUrl}/#service`,
        name: "VERSUS — comparatore luce e gas",
        serviceType: "Confronto offerte luce e gas",
        provider: { "@id": orgId },
        areaServed: { "@type": "Country", name: "IT" },
        description:
          "Confronto gratuito online delle offerte luce, gas e luce + gas per casa e partita IVA, per cambio fornitore, subentro, voltura e primo allaccio, con attivazione online.",
      },
      {
        "@type": "FAQPage",
        "@id": `${siteUrl}/#faq`,
        inLanguage: "it-IT",
        mainEntity: FAQ.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
    ],
  };
}

/** JSON for an inline script: `<` is escaped so no string can close the tag. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
