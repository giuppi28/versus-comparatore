import { expect, test } from "@playwright/test";

// Raw HTML via the request fixture: no JavaScript runs, like a crawler.
const TITLE = "Offerte luce e gas: confronto gratuito online | VERSUS";
const DESCRIPTION =
  "Confronta gratis le offerte luce e gas per casa e partita IVA: rispondi a poche domande, scegli l'offerta e attivala online.";

test.describe("SEO (raw HTML)", () => {
  test("home metadata and JSON-LD", async ({ request }) => {
    const res = await request.get("/");
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain(`<title>${TITLE}</title>`);
    expect(html).toContain(`<meta name="description" content="${DESCRIPTION.replace("'", "&#x27;")}"`);
    expect(html).toMatch(/<link rel="canonical" href="https:\/\/[^"]+"/);
    expect(html).toMatch(/<meta property="og:image" content="[^"]*opengraph-image/);
    expect(html).toMatch(/<meta name="twitter:image" content="[^"]*opengraph-image/);
    expect(html).toContain('content="summary_large_image"');

    const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(m).not.toBeNull();
    const data = JSON.parse(m![1]);
    const types = data["@graph"].map((n: { "@type": string }) => n["@type"]);
    expect(types).toEqual(["Organization", "WebSite", "Service", "FAQPage"]);
    expect(m![1]).not.toContain("telephone");
  });

  for (const path of ["/offerte", "/grazie"]) {
    test(`${path} is noindex`, async ({ request }) => {
      const html = await (await request.get(path)).text();
      expect(html).toMatch(/<meta name="robots" content="noindex/);
    });
  }

  test("robots.txt", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("User-Agent: *");
    expect(body).toContain("Disallow: /admin");
    expect(body).toContain("Disallow: /api/");
    expect(body).not.toContain("Disallow: /offerte");
    expect(body).toMatch(/Sitemap: https:\/\/\S+\/sitemap\.xml/);
  });

  test("sitemap.xml lists the home only", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body.match(/<loc>/g)).toHaveLength(1);
    expect(body).not.toContain("lastmod");
  });

  test("llms.txt", async ({ request }) => {
    const res = await request.get("/llms.txt");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/plain");
    const body = await res.text();
    expect(body.startsWith("# VERSUS")).toBe(true);
    expect(body).toContain("Ultimo aggiornamento: 2026-11-05");
    expect(body).toContain("KEHILA S.r.l.s.");
    expect(body).not.toMatch(/\+39|\b0\d{1,3}[ .]\d{3,4}[ .]\d{3,4}\b/);
  });

  test("opengraph-image is a PNG", async ({ request }) => {
    const res = await request.get("/opengraph-image");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");
  });
});
