import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { GUIDE_PAGES } from "../src/content/seo/guides";
import { OFFERS_PAGES } from "../src/content/seo/offers-pages";
import { SITE_URL } from "../src/lib/seo/site";
import type { SeoPage } from "../src/content/seo/types";

// Raw HTML via the request fixture: no JavaScript runs, like a crawler.
const ALL: SeoPage[] = [...OFFERS_PAGES, ...GUIDE_PAGES];
const GUIDE_BY_PATH = new Map(GUIDE_PAGES.map((g) => [g.path, g]));
const OFFER_PATHS = new Set(OFFERS_PAGES.map((p) => p.path));

function decode(s: string): string {
  return s
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function textOf(html: string): string {
  return decode(html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
}

function mainOf(html: string): string {
  const m = html.match(/<main[\s\S]*?<\/main>/);
  expect(m, "page has a <main>").not.toBeNull();
  return m![0];
}

function jsonLdOf(html: string): { "@graph": Record<string, unknown>[] }[] {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
}

test.describe("SEO pages (raw HTML)", () => {
  for (const page of ALL) {
    test.describe(page.path, () => {
      test("indexing, metadata, H1, intro, JSON-LD, sitemap", async ({ request }) => {
        const res = await request.get(page.path);
        expect(res.status()).toBe(200);
        const html = await res.text();

        expect(decode(html.match(/<title>([\s\S]*?)<\/title>/)![1])).toBe(page.title);
        expect(decode(html.match(/<meta name="description" content="([^"]*)"/)![1])).toBe(page.description);
        expect(html).toMatch(/<meta property="og:image" content="[^"]*opengraph-image/);
        expect(html).toMatch(/<meta name="twitter:image" content="[^"]*opengraph-image/);
        const guide = GUIDE_BY_PATH.get(page.path);
        const sitemap = await (await request.get("/sitemap.xml")).text();
        if (guide) {
          expect(html).not.toMatch(/<meta name="robots" content="[^"]*noindex/);
          const canonical = html.match(/<link rel="canonical" href="([^"]+)"/);
          expect(canonical, "guide has a canonical").not.toBeNull();
          expect(canonical![1]).toBe(`${SITE_URL}${page.path}`);
          expect(sitemap).toMatch(
            new RegExp(`<loc>${SITE_URL}${page.path}</loc>\\s*<lastmod>${guide.reviewedOn}[^<]*</lastmod>`),
          );
        } else {
          expect(html).toMatch(/<meta name="robots" content="noindex, follow"/);
          expect(html).not.toMatch(/<link rel="canonical"/);
          expect(sitemap).not.toContain(page.path);
        }

        const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => decode(m[1].replace(/<[^>]+>/g, "")));
        expect(h1s).toEqual([page.h1]);

        const body = textOf(mainOf(html));
        expect(body).toContain(page.intro);
        for (const f of page.faq) expect(body).toContain(f.a);
        expect(body).toMatch(/Ultima verifica delle fonti: \d{1,2} [a-z]+ \d{4}/);
        expect(html).toContain('href="/"');
        expect(body).toContain("Confronta le offerte");
        for (const s of page.sources) expect(html).toContain(`href="${s.url}"`);
        expect(html).toMatch(/rel="noopener"/);

        const blocks = jsonLdOf(html);
        expect(blocks.length).toBeGreaterThan(0);
        const types = blocks.flatMap((b) => b["@graph"].map((n) => n["@type"]));
        expect(types).toContain("BreadcrumbList");
        expect(types).toContain("FAQPage");
        expect(types).toContain(OFFER_PATHS.has(page.path) ? "WebPage" : "Article");
        expect(JSON.stringify(blocks)).not.toMatch(/Product|AggregateRating|Review|telephone|sameAs/);

        const robots = await (await request.get("/robots.txt")).text();
        expect(robots).not.toMatch(new RegExp(`Disallow:\\s*${page.path}`));
      });

      test("copy rules in <main>", async ({ request }) => {
        const text = textOf(mainOf(await (await request.get(page.path)).text()));
        expect(text).not.toMatch(/chiam/i);
        expect(text).not.toMatch(/demo/i);
        expect(text).not.toMatch(/club/i);
        expect(text).not.toMatch(/e-?mail/i);
        expect(text).not.toMatch(/\bcall\b/i);
        expect(text).not.toMatch(/\+39|\b\d{2,4}[ .]\d{3,4}[ .]\d{3,4}\b/);
        expect(text).not.toMatch(/In evidenza/);
      });
    });
  }

  for (const page of OFFERS_PAGES) {
    test(`${page.path}: verified offers in a real table, nothing forbidden`, async ({ request }) => {
      const html = await (await request.get(page.path)).text();
      const tables = html.match(/<table[\s\S]*?<\/table>/g) ?? [];
      expect(tables.length).toBeGreaterThan(0);
      const rows = tables.flatMap((t) => t.match(/<tr[\s\S]*?<\/tr>/g) ?? []).filter((r) => !r.includes("<th"));
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        const cells = [...row.matchAll(/<td[\s\S]*?<\/td>/g)].map((m) => textOf(m[0]).trim());
        expect(cells).toHaveLength(4);
        expect(cells[0].length).toBeGreaterThan(1); // supplier name as visible text
        expect(cells[2]).toMatch(/^Prezzo (fisso|variabile)$/);
        expect(cells[3]).toMatch(/^(PUN \+ )?\d+,\d{2,4}\s€\/(kWh|Smc)$/);
      }
      const tableText = textOf(tables.join(" "));
      expect(tableText).not.toMatch(/Bloccat|In evidenza|mesi|Quota|Attivazione|attivazione|\/mese|\/anno|stima/);
      const body = textOf(mainOf(html));
      expect(body).toContain(
        "In questa pagina le offerte sono ordinate per prezzo crescente: prima quelle a prezzo fisso, poi quelle a prezzo variabile.",
      );
      expect(body).toContain(
        "Confrontiamo le offerte dei venditori con cui collaboriamo, non tutte quelle disponibili sul mercato. VERSUS opera come agente ed è remunerato dai venditori. Prezzi al netto di IVA. I prezzi sono indicativi e possono variare al momento del contatto con il consulente.",
      );
      expect(body).toMatch(/Listino aggiornato al \d{1,2} [a-z]+ \d{4}/);
      // fixed offers always precede variable ones inside each table
      for (const t of tables) {
        const kinds = [...t.matchAll(/Prezzo (fisso|variabile)<\/td>/g)].map((m) => m[1]);
        expect(kinds.join(",")).toBe([...kinds].sort((a, b) => (a === b ? 0 : a === "fisso" ? -1 : 1)).join(","));
      }
    });
  }

  test("the home stays indexable with its canonical, the sitemap lists it with the 4 guides", async ({ request }) => {
    const html = await (await request.get("/")).text();
    expect(html).toMatch(/<link rel="canonical" href="https:\/\/[^"]+"/);
    expect(html).not.toMatch(/<meta name="robots" content="[^"]*noindex/);
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap.match(/<loc>/g)).toHaveLength(5);
  });

  test("unknown guide slug is a 404", async ({ request }) => {
    expect((await request.get("/guida/non-esiste")).status()).toBe(404);
  });

  test("public pages link the 4 guides from the footer row and never the 4 offers pages (T19.4b)", async ({ request }) => {
    for (const from of ["/", "/privacy", "/offerte", "/attivazione", "/grazie"]) {
      const html = await (await request.get(from)).text();
      expect(html, `${from} must have the footer guides row`).toContain('data-testid="footer-guides"');
      for (const p of ALL.map((x) => x.path)) {
        const linked = new RegExp(`href="[^"]*${p}(["?#/])`).test(html);
        expect(linked, `${from} -> ${p}`).toBe(!OFFER_PATHS.has(p));
      }
    }
  });

  test("the cluster links only to itself and to /", async ({ request }) => {
    for (const page of ALL) {
      const main = mainOf(await (await request.get(page.path)).text());
      const hrefs = [...main.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
      for (const h of hrefs) {
        if (h.startsWith("https://")) continue; // official sources
        expect(["/", ...ALL.map((x) => x.path)], `${page.path} -> ${h}`).toContain(h);
      }
    }
  });
});

test.describe("SEO pages (rendered)", () => {
  for (const page of ALL) {
    test(`${page.path}: no horizontal scroll, screenshot`, async ({ page: pw }, info) => {
      await pw.goto(page.path);
      await expect(pw.locator("h1")).toHaveText(page.h1);
      const { scrollWidth, innerWidth } = await pw.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
      const dir = join(tmpdir(), "versus-seo-shots");
      mkdirSync(dir, { recursive: true });
      await pw.screenshot({ path: join(dir, `${info.project.name}-${page.path.replace(/\//g, "_")}.png`), fullPage: true });
    });
  }
});
