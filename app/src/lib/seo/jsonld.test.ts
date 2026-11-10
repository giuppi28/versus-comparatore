import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FAQ } from "@/components/page1/faq";
import { buildJsonLd, serializeJsonLd } from "./jsonld";

const URL = "https://versuscomparatorelucegas.it";

describe("buildJsonLd", () => {
  const graph = (buildJsonLd(URL)["@graph"] as Record<string, unknown>[]);

  it("has the five types with stable ids", () => {
    expect(graph.map((n) => n["@type"])).toEqual(["Organization", "WebSite", "Service", "FAQPage", "WebPage"]);
    expect(graph.map((n) => n["@id"])).toEqual([
      `${URL}/#organization`,
      `${URL}/#website`,
      `${URL}/#service`,
      `${URL}/#faq`,
      `${URL}/#webpage`,
    ]);
  });

  it("puts the same dateModified on WebSite and WebPage, defaulting to the home content date", () => {
    expect((graph[1] as { dateModified: string }).dateModified).toBe("2026-11-10");
    expect((graph[4] as { dateModified: string }).dateModified).toBe("2026-11-10");
    const custom = buildJsonLd(URL, "2026-12-03")["@graph"] as { dateModified?: string }[];
    expect(custom[1].dateModified).toBe("2026-12-03");
    expect(custom[4].dateModified).toBe("2026-12-03");
  });

  it("has a home WebPage linked to the website and the service", () => {
    expect(graph[4]).toMatchObject({
      url: `${URL}/`,
      name: "Comparatore luce e gas: confronta le offerte gratis | VERSUS",
      isPartOf: { "@id": `${URL}/#website` },
      about: { "@id": `${URL}/#service` },
      inLanguage: "it-IT",
    });
  });

  it("has an Organization description from the published llms.txt summary", () => {
    const org = graph[0] as { description: string };
    expect(org.description).toContain("comparatore luce e gas");
    expect(org.description).not.toMatch(/telefon|chiam|risparmi|migliore/i);
  });

  it("lists every FAQ item byte-identical", () => {
    const faq = graph[3] as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
    expect(faq.mainEntity).toHaveLength(FAQ.length);
    FAQ.forEach((item, i) => {
      expect(faq.mainEntity[i].name).toBe(item.q);
      expect(faq.mainEntity[i].acceptedAnswer.text).toBe(item.a);
    });
  });

  it("has the organization address and no telephone, sameAs, offers or ratings", () => {
    const org = graph[0] as { address: Record<string, string>; logo: string };
    expect(org.address.streetAddress).toBe("Via Umberto 326 B");
    const text = JSON.stringify(graph);
    for (const key of ["telephone", "sameAs", "offers", "aggregateRating", "review", "potentialAction"]) {
      expect(text).not.toContain(`"${key}"`);
    }
  });

  it("has alternateName on Organization and WebSite, WebSite name stays VERSUS", () => {
    const alt = ["VERSUS comparatore luce e gas", "Versus Comparatore", "VERSUS luce e gas"];
    const [org, site] = graph as { name: string; alternateName: string[] }[];
    expect(org.alternateName).toEqual(alt);
    expect(site.alternateName).toEqual(alt);
    expect(org.name).toBe("VERSUS");
    expect(site.name).toBe("VERSUS");
  });

  it("logo is a PNG ImageObject whose file exists with the declared size", () => {
    const logo = (graph[0] as { logo: { "@type": string; url: string; width: number; height: number } }).logo;
    expect(logo["@type"]).toBe("ImageObject");
    expect(logo.url).toBe(`${URL}/brand/versus_icona.png`);
    expect(logo.width).toBeGreaterThanOrEqual(112);
    expect(logo.height).toBeGreaterThanOrEqual(112);
    const png = readFileSync(join(process.cwd(), "public", new globalThis.URL(logo.url).pathname));
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(logo.width);
    expect(png.readUInt32BE(20)).toBe(logo.height);
  });

  it("serializes without a literal <", () => {
    const out = serializeJsonLd({ a: "</script><b>" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out).a).toBe("</script><b>");
    expect(serializeJsonLd(buildJsonLd(URL))).not.toContain("<");
  });
});
