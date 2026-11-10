# A. Crawler-view audit, live site https://versuscomparatorelucegas.it, 2026-11-10

Method: `curl` GET/HEAD only, zero JS, 7 user-agents (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Googlebot smartphone, bingbot, Chrome 130), local parsing in Python. Raw files and scripts: `/private/tmp/claude-502/-Users-pippo-Desktop-versus-comparatore/f39da607-0e33-4248-8c7d-2e31098010dd/scratchpad/crawler/` (pg-*.html, hd-*.txt, res.pkl, lh/*.json). Nothing was changed, submitted or POSTed. Time of run: ~09:20-09:35 UTC.

## 1. Scorecard vs baseline panel-2026-11-09 (A1-A12, B1-B3)

| ID | Check | Today | Evidence |
|---|---|---|---|
| A1 | All bot UAs get 200 + full page | PASS | 8 URLs x 7 UAs = 56 requests, all 200. Bytes identical across UAs on all 7 guides (e.g. 85573 B cambio-fornitore for all 7). Home 121,971 B for 6 UAs, 121,898 B for bingbot (-73 B: the `<!--$--><!--/$-->` pair and head ordering differ, same as baseline) |
| A2 | Content in HTML without JS | PASS | Visible words (tags/scripts stripped): home 1,389; guides 1,054-1,412 |
| A3 | robots.txt allows AI + search bots | PASS | `User-Agent: *` / `Allow: /` / `Disallow: /admin` / `Disallow: /api/` / `Sitemap: https://versuscomparatorelucegas.it/sitemap.xml` (114 B). No bot-specific blocks |
| A4 | Sitemap | PASS (8 URLs) | home + 7 guides, see section 2. Home `lastmod` stale, see 5c |
| A5 | Canonical + redirects | PASS | self-canonical on all 8; http, www, vercel.app all 308 to apex (section 5) |
| A6 | noindex where decided | PASS | 4 offers pages `noindex, follow`; `/offerte`, `/grazie`, `/privacy` = `noindex, nofollow` |
| A7 | Structured data | PASS | home @graph: Organization, WebSite, Service, FAQPage (12 Q); each guide @graph: Article, BreadcrumbList, FAQPage (4-6 Q). All JSON parses; every FAQ question appears verbatim in visible text and in a `<details>` |
| A8 | No unconfirmed fact | PASS | no `tel:`/`mailto:` link, no phone-number pattern, no rating/stars, no savings figure in the 8 pages or llms.txt. Only "100% online" and legal capital "€ 1.500,00" matched my regex |
| A9 | Images | PASS | home 15 `<img>`, 0 missing alt. Guides have 0 `<img>`. (width/height missing, see 5f) |
| A10 | llms.txt | PASS (stale by 1 day) | 200, 2,791 B, lists all 7 guides + 4 offers pages + privacy + llms-full link. "Ultimo aggiornamento: 2026-11-09" while the newest guide is 2026-11-10 |
| A11 | Social card | PASS | `og:title/description/url/site_name/locale/image(1200x630)/image:alt/type`, `twitter:card=summary_large_image` on all 8 |
| A12 | Internal links | PASS | every page links the 7 others (section 3) |
| B1 | Title + H1 match target phrase | PASS (was FAIL) | Home `<title>Comparatore luce e gas: confronta le offerte gratis | VERSUS</title>`, `<h1>Comparatore luce e gas</h1>` |
| B2 | IndexNow | PASS on-site part | key file `/13c9ca36d41ae0f71e7b908d4a06848e.txt` -> 200, `text/plain`, body = the key (32 B), key in `app/scripts/indexnow.mjs`. Bing's crawl status NOT verifiable from here |
| B3 | llms-full.txt | PASS (was FAIL) | 200, 63,670 B, starts `# VERSUS — comparatore luce e gas`, has `URL:` for all 7 guides (lines 152, 239, 330, 417, 509, 604, 694) |

**Score: 15 of 15 baseline checks pass.** Minor items from the baseline: Organization `alternateName` now present (3 values); 404 still English (see 5b); home still `no-store` (see 5a).

## 2. The 8 sitemap URLs (from the Chrome-UA copy)

Sitemap (1,052 B, `content-type: application/xml`):
```
https://versuscomparatorelucegas.it/                                         2026-11-07
.../guida/cambio-fornitore-luce-gas                                          2026-11-07
.../guida/voltura-luce-gas                                                   2026-11-07
.../guida/subentro-luce-gas                                                  2026-11-07
.../guida/primo-allaccio-luce-gas                                            2026-11-07
.../guida/come-scegliere-offerta-luce-gas                                    2026-11-07
.../guida/fine-tutela-mercato-libero                                         2026-11-07
.../guida/come-funziona-comparatore-luce-gas                                 2026-11-10
```

| Page | Title (len) | Desc len | H1 | Words | "comparatore luce e gas" | "offerte luce e gas" | VERSUS (case-sens.) | "comparatore" | Article datePublished / dateModified | Visible date |
|---|---|---|---|---|---|---|---|---|---|---|
| home | Comparatore luce e gas: confronta le offerte gratis \| VERSUS (60) | 137 | Comparatore luce e gas | 1,389 | 4 | 0 | 8 | 6 | WebSite dateModified 2026-11-07 (no Article) | none |
| cambio-fornitore | Cambio fornitore luce e gas: come funziona \| VERSUS (51) | 142 | Cambio fornitore di luce e gas: come funziona | 1,157 | 3 | 2 | 5 | 5 | 2026-11-05 / 2026-11-07 | "Ultima verifica delle fonti: 7 novembre 2026" |
| voltura | Voltura luce e gas: cos'è, documenti e tempi \| VERSUS (53) | 138 | Voltura di luce e gas: cos'è e come si fa | 1,096 | 3 | 1 | 5 | 5 | 2026-11-05 / 2026-11-07 | 7 novembre 2026 |
| subentro | Subentro luce e gas: quando serve e come si fa \| VERSUS (55) | 135 | Subentro di luce e gas: quando serve | 1,054 | 3 | 1 | 5 | 5 | 2026-11-05 / 2026-11-07 | 7 novembre 2026 |
| primo-allaccio | Primo allaccio luce e gas: cos'è e come funziona \| VERSUS (57) | 127 | Primo allaccio di luce e gas: allacciamento e attivazione | 1,076 | 3 | 1 | 5 | 5 | 2026-11-05 / 2026-11-07 | 7 novembre 2026 |
| come-scegliere | Come scegliere un'offerta luce e gas: guida \| VERSUS (52) | 156 | Come scegliere un'offerta luce e gas | 1,272 | 3 | 0 | 6 | 5 | 2026-11-07 / 2026-11-07 | 7 novembre 2026 |
| fine-tutela | Fine della tutela e mercato libero: cosa cambia \| VERSUS (56) | 160 | Fine della tutela e passaggio al mercato libero | 1,190 | 3 | 0 | 5 | 5 | 2026-11-07 / 2026-11-07 | 7 novembre 2026 |
| come-funziona-comparatore | Come funziona un comparatore luce e gas \| VERSUS (48) | 148 | Come funziona un comparatore luce e gas | 1,412 | 6 | 0 | 11 | 21 | 2026-11-10 / 2026-11-10 | 10 novembre 2026 |

Common to all 8 (raw grep): `<html lang="it"`, exactly 1 `<title>`, exactly 1 `<h1>`, self-canonical, no `robots` meta (= indexable), no `hreflang`, `og:image = https://versuscomparatorelucegas.it/opengraph-image` -> 200 `image/png` 30,521 B, `PNG image data, 1200 x 630` (matches og:image:width/height), `twitter:card=summary_large_image`. All 8 titles are unique. Home canonical is `https://versuscomparatorelucegas.it` (no trailing slash) while the sitemap `<loc>` and the guides' breadcrumb "Home" item use `.../` (equivalent URL, cosmetic).

Headings (home): H2 = Cosa vuoi confrontare? / Per chi è la fornitura? / I tuoi dati / Di quale servizio hai bisogno? / Come funziona / Confrontiamo le offerte di / Domande frequenti / Come funziona il confronto luce e gas su VERSUS. H3 = Confronta, Scegli, Attiva online, Quali offerte confrontiamo, Come viene calcolata la stima, Prezzo fisso o prezzo variabile, Mercato libero e servizi di tutela, Le quattro situazioni più comuni, Cosa controllare prima di firmare.
Headings (guides): every guide has H2s only (no H3), e.g. cambio-fornitore: Come si cambia fornitore... / Cambiare fornitore costa qualcosa? / Resto senza luce o gas... / Quanto tempo... / Cos'è il diritto di ripensamento... / Cosa serve per cambiare... / Confronta le offerte su VERSUS / Domande frequenti / Fonti / Continua a leggere. Full lists are in `res.pkl`.

JSON-LD (one `<script type="application/ld+json">` per page, `@context https://schema.org`, `@graph`):
- Home Organization: `name "VERSUS"`, `alternateName ["VERSUS comparatore luce e gas","Versus Comparatore","VERSUS luce e gas"]`, `legalName KEHILA S.r.l.s.`, `vatID 06237360877`, email, PostalAddress, `logo ImageObject https://versuscomparatorelucegas.it/brand/versus_icona.png 512x512` -> 200 `image/png` 10,942 B (`PNG image data, 512 x 512`). No `sameAs`, no `description`, no `telephone` (correct, none confirmed).
- Home WebSite: `dateModified 2026-11-07`, `inLanguage it-IT`, publisher `@id #organization`, no `potentialAction`. Service `#service`, FAQPage `#faq` = 12 Q.
- Guides: Article (`headline`, `datePublished`, `dateModified`, author + publisher = full Organization incl. alternateName, `mainEntityOfPage`, `inLanguage it-IT`; **no `image`, no `about`/`citation`**), BreadcrumbList (Home > guide, 2 items), FAQPage 5/5/5/5/4/5/6 Q.
- No Article on the home, no `sameAs` anywhere.

Images: home 15 `<img>` (all supplier SVG logos, all `alt` present, all `loading="lazy"`, 0 with `width`/`height`); guides 0 `<img>`.

## 3. Internal link graph

Every one of the 8 pages links all 7 others (7/7 each; verified by href extraction). **No guide is missing the newest guide**: `/guida/come-funziona-comparatore-luce-gas` is linked from the home footer (anchor "Come funziona un comparatore") and from all 6 other guides (anchor "Come funziona un comparatore"). The newest guide links back to every sibling.

Home footer anchors: Cambio fornitore, Voltura, Subentro, Primo allaccio, Come scegliere, Fine tutela, Come funziona un comparatore (+ /privacy).

Anchors pointing at the home from each guide (identical on all 7): "Versus Comparatore luce e gas" (header logo link, `aria-label="VERSUS comparatore luce e gas, torna alla home"`), "Home" (breadcrumb), "Confronta le offerte" (x2, in the body CTA and the bottom CTA). **One of the four home anchors contains "comparatore luce e gas"** (the logo link visible text "Versus Comparatore luce e gas"); the contextual body anchors are generic ("Confronta le offerte", "Home").

**DEFECT (rule says none): 4 guides link to the offers pages.** In the "Continua a leggere" `<ul>` at the bottom:
```
cambio-fornitore : <a href="/offerte-luce-gas">Offerte luce e gas</a> and <a href="/offerte-luce-gas-partita-iva">Offerte luce e gas per partita IVA</a>
voltura          : <a href="/offerte-luce-gas">Offerte luce e gas</a>
subentro         : <a href="/offerte-luce-gas">Offerte luce e gas</a>
primo-allaccio   : <a href="/offerte-luce-gas">Offerte luce e gas</a>
```
Total 5 links. The home, come-scegliere, fine-tutela and come-funziona have none. Effect: the guides pass link equity into 2 noindex pages (follow), and users reach "offers" pages that the project memory says should be unlinked. (They are visible links, so removal changes the guide footer list.)

Offers pages (URLs from llms.txt), all HTTP 200:
| URL | robots meta | canonical | in sitemap | title |
|---|---|---|---|---|
| /offerte-luce-gas | `noindex, follow` | none | no | Offerte luce e gas per casa e partita IVA: prezzi \| VERSUS |
| /offerte-luce | `noindex, follow` | none | no | Offerte luce per casa e partita IVA: prezzi \| VERSUS |
| /offerte-gas | `noindex, follow` | none | no | Offerte gas per casa e partita IVA: prezzi \| VERSUS |
| /offerte-luce-gas-partita-iva | `noindex, follow` | none | no | Offerte luce e gas per partita IVA \| VERSUS |
Others: /offerte `noindex, nofollow` ("Le tue offerte — VERSUS"), /grazie `noindex, nofollow` (title "VERSUS — comparatore luce e gas"), /privacy `noindex, nofollow` ("Informativa sulla privacy | VERSUS"). No `X-Robots-Tag` header on any of them.
Note: `llms.txt` (and llms-full) DO list the 4 noindex offers pages and /privacy (noindex) as "Pagine principali". An AI crawler is told to read pages Google is told to drop; not a defect for indexing, but contradicts the "unlinked" intent.

No orphan pages (all 8 reachable from the home). No thin pages (min 1,054 words).

## 4. Redirects and URL variants

| Request | Status | Location |
|---|---|---|
| http://versuscomparatorelucegas.it/ | 308 | https://versuscomparatorelucegas.it/ |
| http://versuscomparatorelucegas.it/guida/voltura-luce-gas | 308 | https://versuscomparatorelucegas.it/guida/voltura-luce-gas |
| https://www.versuscomparatorelucegas.it/ (+ guide) | 308 | https://versuscomparatorelucegas.it/ (+ guide) |
| http://www.versuscomparatorelucegas.it/ | 308 | https://www.versuscomparatorelucegas.it/ (then a 2nd 308 to the apex: 2 hops) |
| https://versus-comparatore.vercel.app/ (+ guide) | 308 | https://versuscomparatorelucegas.it/ (+ guide) |
| /guida/voltura-luce-gas/ (trailing slash) | 308 | `/guida/voltura-luce-gas`; canonical after redirect = no slash |
| /guida/Voltura-Luce-Gas (uppercase) | 404 | `<meta name="robots" content="noindex"/>` |
| /Offerte-Luce-Gas, /index.html | 404 | - |
| /?utm_source=x | 200 | canonical `https://versuscomparatorelucegas.it` (clean) |
| /guida/voltura-luce-gas?utm_source=x&fbclid=1 | 200 | canonical `.../guida/voltura-luce-gas` (clean) |

No duplicate-content leak through parameters or case.

## 5. Known leftovers, measured

**(a) Caching / rendering.** Source: `app/src/app/(public)/page.tsx:37 export const dynamic = "force-dynamic";` ("Supplier list is editable from the admin area").
```
HOME   : cache-control: private, no-cache, no-store, max-age=0, must-revalidate | x-vercel-cache: MISS | age: 0 | x-matched-path: /   (no x-nextjs-prerender)
GUIDE  : cache-control: public, max-age=0, must-revalidate | x-vercel-cache: HIT | age: 134 (727 on the newest) | x-nextjs-prerender: 1 | x-nextjs-stale-time: 300
```
TTFB (s, 5 samples, br): home 0.249 0.230 0.256 0.227 0.281 (mean 0.248) | voltura 0.192 0.151 0.179 0.221 0.225 (mean 0.194) | newest guide 0.207 0.146 0.158 0.238 0.154 (mean 0.181). Home is ~55-65 ms slower per request, every request hits the origin; with `?cb=` busting the home was 0.26/0.25/0.33 s. Not a crawler blocker.

**(b) 404 page** `/pagina-che-non-esiste`: HTTP 404 (correct), 12,370 B, `<meta name="robots" content="noindex"/>`, **two `<title>` tags**: `<title>VERSUS — comparatore luce e gas</title>` and `<title>404: This page could not be found.</title>`; body text "404 This page could not be found." (English default Next page) inside `<html lang="it">`; meta description of the home is injected ("Confronta le offerte luce e gas per la tua casa..."). Header `cache-control: public, max-age=0, must-revalidate`.

**(c) Home dates.** Sitemap home `lastmod 2026-11-07` = home JSON-LD WebSite `dateModified "2026-11-07"`: they agree, but both are wrong in substance: `app/src/lib/seo/dates.ts` floors the day at `UPDATED_FLOOR = "2026-11-07"` and the sitemap uses the latest active-offer update (`sitemap.ts` line 10), so the home retarget of 2026-11-09 (new title, H1, alternateName) is not reflected. Date soup today: sitemap home 11-07 / llms.txt and llms-full "Ultimo aggiornamento" 11-09 / newest guide 11-10 / other guides 11-07.

**(d) "indipendente"** (never refers to VERSUS; always ARERA's Portale Offerte):
- home: "Per avere una vista più ampia del mercato esiste il Portale Offerte, il sito gratuito e indipendente di ARERA, previsto dalla Legge Concorrenza del 2017..."
- cambio-fornitore, voltura, subentro, primo-allaccio: "Il Portale Offerte è il sito gratuito e indipendente di ARERA, previsto dalla Legge Concorrenza del 2017, per confrontare le offerte."
- come-scegliere, fine-tutela: "Un confronto più ampio. Il Portale Offerte è il sito gratuito e indipendente di ARERA, ... comprende offerte PLACET, di mercato libero e servizi di tutela."
- come-funziona-comparatore: 0. llms.txt: 0. llms-full.txt: 7 (the same sentences).
No page calls VERSUS "indipendente". Counts of the string in raw HTML = 3 per page (1 visible, 2 in the RSC payload / FAQ copy).

**(e) Security / compression.** `strict-transport-security: max-age=63072000` (no includeSubDomains/preload). Response header list on the home is only: age, cache-control, content-type, date, link, server, strict-transport-security, vary, x-matched-path, x-vercel-cache, x-vercel-id. **No** `x-content-type-options`, `x-frame-options`/CSP `frame-ancestors`, `referrer-policy`, `permissions-policy`, CSP. Compression: br works. Home wire size: identity 121,971 B, gzip 21,426 B, **br 17,211 B**; voltura br 12,736 B (86,710 raw); newest guide br 13,565 B (90,947 raw).

**(f) Assets.** Images: the only `<img>` are 15 SVG supplier logos (`/logos/black/*.svg`, e.g. enel-energia.svg 7,562 B), all lazy, none with width/height (CLS is nonetheless 0-0.005). OG image is PNG (1200x630, 30.5 KB), logo icon PNG (512x512, 10.9 KB). Fonts: 2 woff2 preloaded via `Link` header (`rel=preload; as="font"; crossorigin; type="font/woff2"`): 90,096 B + 48,432 B. CSS: 1 file, 56,401 B raw / 11,717 B br, preloaded. JS on the home: 10 `<script src>` chunks, **637 KB raw / 204 KB brotli** (largest: 12hvveunfuz00.js 230 KB raw/73 KB br, 3mh4l8cv0ltjh.js 168 KB raw/47 KB br, 0c0hxoamwjsbw.js 113 KB raw/41 KB br) + 4 inline scripts. External hosts referenced in HTML: only schema.org and w3.org. Guides: no `<img>`.

## 6. Performance lab

PageSpeed Insights API (no key): **HTTP 429** on all 4 calls and on a retry after 20 s: "Quota exceeded for quota metric 'Queries' and limit 'Queries per day'". So **CrUX field data (`loadingExperience`) was not obtained**. Search Console on 2026-11-09 already said "Core Web Vitals: no data".
Local Lighthouse 13.6.0 (headless Chrome, simulated throttling, one run each, lab only):

| Page | Form | Perf | SEO | A11y | BP | LCP | CLS | TBT | FCP | SI |
|---|---|---|---|---|---|---|---|---|---|---|
| home | mobile | 100 | 100 | 100 | 100 | 1.1 s | 0 | 40 ms | 1.1 s | 2.3 s |
| home | desktop | 99 | 100 | 100 | 100 | 0.3 s | 0.005 | 0 ms | 0.3 s | 1.2 s |
| come-funziona-comparatore | mobile | 100 | 100 | 100 | 100 | 1.0 s | 0 | 10 ms | 1.0 s | 1.0 s |
| come-funziona-comparatore | desktop | 100 | 100 | 100 | 100 | 0.3 s | 0 | 0 ms | 0.3 s | 0.4 s |

Raw JSON: `.../crawler/lh/{home,guide}-{mobile,desktop}.json`.

## 7. Other findings a crawler would notice

1. Guide to offers-page links (section 3): contradicts the "unlinked offers pages" rule.
2. llms.txt and llms-full.txt advertise the 4 noindex offers pages + noindex /privacy.
3. Date inconsistency (5c). Home sitemap lastmod and WebSite dateModified frozen at 11-07 although the home's title/H1/schema changed 11-09; llms.txt dated 11-09 does not include the 11-10 guide date.
4. Article schema lacks `image` (Google's Article rich-result recommends one; the og image `/opengraph-image` could be reused). Organization has no `sameAs` (no profiles exist yet) and no `description`.
5. Home FAQPage: Google restricts FAQ rich results to government/health sites since 2023, so no SERP benefit; useful for AI retrieval only. No harm.
6. Home logo strip shows 15 supplier logos (Enel, Eni Plenitude, Edison, A2A, Hera Comm, Iren, Acea, Sorgenia, Engie, E.ON, Iberdrola, Sentra, Estra, Enegan, Asti), while llms.txt "Fornitori con offerte attive" lists 9 (Enel, Eni Plenitude, Edison, A2A, Iren, Sentra, Estra, Enegan, Asti). 6 logos (Hera Comm, Acea, Sorgenia, Engie, E.ON, Iberdrola) appear on the home but not in the active-supplier list. I could not check the DB to see whether those 6 have active offers; if not, the strip implies a relationship the page text ("offerte dei venditori con cui collaboriamo") may not support.
7. Titles: all 8 under 61 chars; meta descriptions 127-160 chars (fine-tutela at 160 and come-scegliere at 156 may be truncated on mobile). No duplicate titles/descriptions.
8. Brand query ("versus comparatore"): home body text contains the lower-cased string "versus comparatore" 2 times (header wordmark "Versus Comparatore luce e gas" + footer); guides also 2 (+1 "VERSUS, comparatore luce e gas" in the byline). Organization `alternateName` carries "Versus Comparatore". The home H1 does not contain the brand word; the `<title>` does (suffix).
9. Security headers beyond HSTS missing (5e), 404 page double `<title>` + English copy (5b), `http://www.` takes 2 hops (section 4).
10. No `hreflang` (fine, single language). No `X-Robots-Tag` anywhere. No `sitemap` entry for `/privacy` (noindex, correct).

## Not verified
- Bing/Google index state, Search Console/Bing Webmaster data (not reachable via curl).
- CrUX/field Core Web Vitals (PSI API 429); lab Lighthouse is a single run per page.
- Whether the 6 extra logos on the home correspond to active offers in the DB.
- IndexNow acceptance by Bing (only the key file and the script were checked, no POST made).
- Googlebot-from-Google-IP behaviour (UA spoofed from my IP; Vercel firewall could treat verified bots differently).
