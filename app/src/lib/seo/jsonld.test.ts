import { describe, expect, it } from "vitest";
import { FAQ } from "@/components/page1/faq";
import { buildJsonLd, serializeJsonLd } from "./jsonld";

const URL = "https://versuscomparatorelucegas.it";

describe("buildJsonLd", () => {
  const graph = (buildJsonLd(URL)["@graph"] as Record<string, unknown>[]);

  it("has the four types with stable ids", () => {
    expect(graph.map((n) => n["@type"])).toEqual(["Organization", "WebSite", "Service", "FAQPage"]);
    expect(graph.map((n) => n["@id"])).toEqual([
      `${URL}/#organization`,
      `${URL}/#website`,
      `${URL}/#service`,
      `${URL}/#faq`,
    ]);
  });

  it("puts dateModified on the WebSite node, floored at 2026-11-07 by default", () => {
    expect((graph[1] as { dateModified: string }).dateModified).toBe("2026-11-07");
    const custom = buildJsonLd(URL, "2026-12-03")["@graph"] as { dateModified?: string }[];
    expect(custom[1].dateModified).toBe("2026-12-03");
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
    expect(org.logo).toBe(`${URL}/brand/versus_icona.svg`);
    const text = JSON.stringify(graph);
    for (const key of ["telephone", "sameAs", "offers", "aggregateRating", "review", "potentialAction"]) {
      expect(text).not.toContain(`"${key}"`);
    }
  });

  it("serializes without a literal <", () => {
    const out = serializeJsonLd({ a: "</script><b>" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out).a).toBe("</script><b>");
    expect(serializeJsonLd(buildJsonLd(URL))).not.toContain("<");
  });
});
