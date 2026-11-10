# C-competitors: on-page comparison for "comparatore luce e gas" (read-only study, 2026-11-10)

Method: `curl` GET only, Chrome UA, zero JS, `--compressed`; one Googlebot-UA check per site; sitemaps counted one level deep; Wayback "available" API; one RDAP lookup (.com only). Pages are in `.../scratchpad/competitors/raw/`, per-page measurements in `.../competitors/an_*.txt` (appended at the end of this file). Nothing in the repo was touched, no `.env*` read, no git.

## 0. What was and was not measured (read this first)

- **Which URL ranks was not verified.** google.it / Bing / DuckDuckGo cannot be scraped with `curl` (empty or ignored `site:`), and `WebSearch` is US-only and returned nothing useful for the small sites. Positions come from `docs/geo/panel-2026-11-09.md` (one snapshot, pos. 1-9: Portale Offerte, Segugio, Billoo, Supermoney; pos. 10-19: Segugio, ProntoBolletta, Luce-Gas.it, puntienergia). I analysed the **most plausible URL per site and, where unsure, two**: Billoo home, ConfrontaTariffe home, Supermoney `/energia-luce-gas/` (the home is multi-vertical) and `/energia-luce-gas/elettricita-e-gas/`, ProntoBolletta `/comparatore/` (the 4,000-word page; `/comparatore-energia/` is a 474-word subentro page) , puntienergia `/offerte/comparatore-luce-gas`, Segugio `/luce-gas/`, Portale Offerte home, Luce-Gas.it `/confronto` (+ home), Clicca e Compara home and `/comparatore/confronta_offerte_energiagas.php`.
- **Backlinks, referring domains, traffic and keyword volume were NOT measured** (no Ahrefs / Similarweb access; both connectors need authorisation). Everything about "authority" below is inferred from domain age, site size, brand/press signals and the SERP itself.
- Googlebot-UA check: Supermoney, ProntoBolletta, ConfrontaTariffe and ours return identical title/H1/word count with the Chrome UA; Billoo and Clicca differ by about 1% in words (rotating blocks), same title and H1 (no cloaking seen). **puntienergia, Segugio, Portale Offerte and Luce-Gas.it answer 403 to a fake Googlebot UA** (they verify Googlebot by IP), so the check is void for those four.
- Raw HTML only: price widgets that load by JS are invisible to this study (affects Billoo/ConfrontaTariffe form tools, not the content comparison).
- Wayback "first capture" is not "operating since": Supermoney's 2009 capture is a "PlaceHolder for supermoney.it" parking page.
- Segugio's sitemap (hosted on img.mavriq.com) could not be read; the Portale Offerte has none (404).
- Word counts: "all" = visible text without script/style/svg; "main" = same minus `<nav>/<header>/<footer>`. Sitemap counts include tag/author/category URLs.

## 1. Comparison table

| Site (URL analysed) | Words all / main | Exact "comparatore luce e gas" | FAQ | Real-price table in raw HTML | Dated | JSON-LD types | Internal links (unique) | Sitemap URLs | First Wayback capture / age hint |
|---|---|---|---|---|---|---|---|---|---|
| **VERSUS home (ours, live today)** | 1,389 / 1,276 | title yes, desc yes, H1 yes; 4 in body; not in any H2/H3 | 12 (schema + 12 `<details>`) | **No** (one "€" in the page) | **No visible date**; `dateModified` 2026-11-07 in schema only | Organization, WebSite, Service, FAQPage | 8 (7 guides + privacy) | 8 | none; domain registered 2026-11-04 |
| Billoo home | 1,193 / 1,043 | **none anywhere** (title "Billoo \| Controlla la tua Bolletta e le migliori offerte luce e gas") | none on page (link to a FAQ) | No | No ("Black Friday", blog teasers); schema dateModified 2026-07 | WebPage, BreadcrumbList, WebSite+SearchAction, Organization | 32 (+13 external) | 99 | 2020 (Wayback); press quotes block |
| Supermoney `/energia-luce-gas/` | 1,931 / 1,465 | **none** (title "Offerte Luce e Gas: confronta le tariffe energia dei nostri partner"); "comparatore" x1 | none (3 question headings) | No (6 prices in the text, no table) | "dicembre 2026" x1 (news teaser) | Organization, Person | 110 (63 guide, 8 supplier pages, 12 news) | 14,520 (energia 2,010) | 2009 = parked placeholder; real since later |
| ProntoBolletta `/comparatore/` | 4,242 / 3,937 | title/H1 use the plural "Comparatori Luce e Gas"; exact phrase in 1 H2, 3 in body | 5 in schema + ~8 question headings | **Yes**: 21-row table, €/kWh, €/Smc, monthly cost, "ottobre 2026" | Table says "ottobre 2026", title says "del 2025", schema dateModified 2025-10-08 (inconsistent) | FAQPage, BreadcrumbList, WebPage, WebSite+SearchAction | 70 | 1,322 | 2021 |
| puntienergia `/offerte/comparatore-luce-gas` | 3,543 / 2,571 | **title, H1, H2, first 100 words, 6x body** (desc: "Confronta le offerte luce e gas") | 7 (schema + visible) | **Yes** (ranked list of 6 offers with prices; "novembre 2026"; "aggiornata il 06/11") | "aggiornato il 25 agosto 2026", dateModified 2026-08-25 | Article, WebPage, FAQPage, BreadcrumbList, ItemList, Product+Offer+AggregateRating x6, Person x2, Organization | 121 | 8,788 | 2014; domain registered 2013-12-16 (RDAP) |
| ConfrontaTariffe home | 2,301 / 2,015 | **none** (title "ConfrontaTariffe: scopri le migliori offerte luce e gas") | none | No (cards; 6 prices) | schema dateModified 2026-10-09 | WebPage, BreadcrumbList, WebSite+SearchAction, Organization, Person x23, ImageObject | 54 (26 supplier-offer pages, 15 review pages, glossary) | 407 | 2009 (real site "il portale della convenienza") |
| Segugio `/luce-gas/` | 5,218 / 4,624 | **none** (title "Offerte Luce e Gas: confronta le tariffe dual fuel \| Segugio.it"); "confronta le offerte luce e gas" x1 in first 100 words | ~15 question headings (no FAQPage schema) | **Yes** (3 tables, 92 prices) | "novembre 2026" in 5 headings + live kWh/Smc cost | WebSite, BreadcrumbList, Product+AggregateRating (4.8 / 4,230)+AggregateOffer+Offer x5, VideoObject | 108 (32 guide, 16 offer, 8 glossary) | not readable | 2013 (segugio.it 2000) |
| Portale Offerte (ARERA/AU) | 1,658 / 1,556 | **none** (title "Portale Offerte \| Trova le migliori tariffe e offerte di luce e gas") | 26 question headings (accordion), no schema | No (it is the calculator) | none | none | 36 | none (404) | 2019 (launched 2018) |
| Luce-Gas.it `/confronto` (Selectra) | 3,453 / 2,539 | title "Comparatore offerte luce e gas - Luce-gas.it", H1 "Comparatore luce e gas Selectra", first 100 words | FAQ section (H2) | Partly (2 tables, 40 rows, 8 prices; results built from the form) | "aggiornato novembre 2026" in the description | BreadcrumbList only | 161 (54 supplier, 32 guide) | 14,190 | 2013 |
| Clicca e Compara home | 2,465 / 2,057 | title "Miglior Comparatore Offerte Luce e Gas", no H1 match | 2 in schema | **Yes** (3 tables, 101 prices, "aggiornato il 31/03/2026") | stale (March) | WebPage, Organization, FAQPage, WebSite | 87 | 27 | none found (age unknown) |

Luce-Gas.it home (1,877 words, no phrase, Organization+ContactPoint+OpeningHours with 5 `sameAs` profiles) and Supermoney `/elettricita-e-gas/` (2,085 words, no phrase, no schema beyond Organization+Person) are in the appended raw files.

Trust and "E-E-A-T" blocks seen in raw HTML:

| Site | Seen |
|---|---|
| Billoo | company block (S.r.l. Società Benefit, address, P.IVA, REA, capital, PEC, phone), "Parlano di noi" with press quotes (including "oltre 150 mila iscritti" inside a quoted article), B Corp news, app + webapp promo, partners strip, blog |
| Supermoney | "Perché ti puoi fidare di noi" with counters (5 operators, 31 products, "175.000 clienti soddisfatti"), "Redazione" mentions, chi siamo link, 63 guide links |
| ProntoBolletta | Papernest ads ("Più di 1 Milione di clienti", "4,8/5 Trustpilot") inside a page that is otherwise editorial; testimonials on `/comparatore-energia/` |
| puntienergia | Selectra family: byline "Francesca Siani, Content Editor" and "Verificato da ...", "Note metodologiche", coverage disclosure ("non è il catalogo completo"), phone/callback CTA everywhere |
| ConfrontaTariffe | Trustpilot-style testimonials (3), 23 Person authors in schema, "Accueil srl" (a call-centre company) in the footer |
| Segugio | "Redazione Segugio Tariffe", 11 ARERA mentions, partner disclosure, rating 4.8 (4,230) |
| Portale Offerte | is the regulator's tool |
| ours | company block in the footer (legal name, P.IVA, REA, address, email), ARERA cited 9 times, no ratings, no `sameAs` |

## 2. What page 1-2 pages have that our home lacks

Starting point (important): **our home already matches or beats the ranking small comparators on exact-phrase placement.** It is one of only three analysed pages (with puntienergia and Luce-Gas.it) that has "comparatore luce e gas" in title, description and H1; Billoo, Supermoney, ConfrontaTariffe, Segugio and the Portale Offerte rank with none or one stray mention. It also has more FAQ (12) than anyone except the Portale and ProntoBolletta, and more words than Billoo. Note: Search Console (panel doc) still shows Google holding the **7 November version** of the home with the old title/H1, so the effect of the new title is **untested**; re-measure after the recrawl before concluding anything.

What the SERP pages have and we do not:

| What | Who has it | Ours |
|---|---|---|
| Real offer prices in raw HTML (€/kWh, €/Smc, monthly cost) | Segugio, ProntoBolletta, puntienergia, Clicca, Luce-Gas.it (after form) | none (prices only after the form) |
| A month-year or "aggiornato il ..." tied to those prices | Segugio (5 headings), puntienergia, ProntoBolletta (inconsistent), Luce-Gas.it | none visible |
| Depth (2,000-5,000 words) | all except Billoo and the Portale | 1,389 (competitive vs. Billoo/Portale, below the rest) |
| Site size / internal link graph | 99 to 14,500 URLs; 36 to 161 internal links per page | 8 URLs; 8 links |
| A named entity with history: press, reviews, social profiles, app | Billoo (press, B Corp, app), Segugio/Facile (ratings), Luce-Gas.it (5 `sameAs`) | company data only; no `sameAs`, no press, no reviews |
| Byline / editorial team / "verificato da" | puntienergia, ConfrontaTariffe (23 Person), Supermoney, Segugio | author = Organization |
| Supplier hub pages and per-supplier text | Supermoney (8+ supplier pages), ConfrontaTariffe (26), Luce-Gas.it (54) | none (offers pages are noindex by decision) |
| Glossary | ConfrontaTariffe, Segugio, Luce-Gas.it, ProntoBolletta | none |

### (a) On-page additions we could make truthfully

"Visible" = changes what a visitor sees (needs the owner's OK). "Invisible" = metadata/schema/sitemap/off-page.

1. **Dated reference table of the active offers, server-rendered** (supplier, offer name, fixed/variable, energy price €/kWh and €/Smc exactly as stored, "IVA esclusa", link-free). *Visible.* Highest impact because it is the one thing every content-rich ranking page has (Segugio, ProntoBolletta, puntienergia, Clicca) and we have nothing equivalent in HTML. Constraints: read from the DB at render time (never hard-code); use only fields Aldo confirmed (fees and the 12-month lock are marked unconfirmed in `canonical-facts.md`, so no "costo mensile" column unless it is the app's own labelled estimate for a stated profile); neutral order (alphabetical or "In evidenza" then price type, as the results footnote already states), **no "la più economica" badge**; check that placeholder offers with `price_verified = false` are excluded or labelled. The 4 SEO offers pages stay noindex, so this table is a new decision for the owner (it exposes on the home what those pages hold).
2. **A real date, once, tied to the data**: an H2/H3 such as "Offerte luce e gas a novembre 2026" and a line "Prezzi inseriti il <date of the last DB update>". *Visible* line; *invisible* companion: `WebPage` node with `dateModified` that equals the visible date and a real `lastmod` in the sitemap (today the home has `dateModified` only inside another node). Only claim what the DB timestamps support; ProntoBolletta shows what happens otherwise (title "2025", table "ottobre 2026", schema 2025-10).
3. **"Chi è VERSUS" paragraph without names**: KEHILA S.r.l.s., registered office, REA, "opera come agente ed è remunerato dai venditori", free for the customer, offers compared = sellers we work with. All ✅ in `canonical-facts.md`. *Visible.* Fills the entity/trust slot that Billoo, Supermoney and puntienergia fill (their blocks are bigger because they have history, which we cannot manufacture).
4. **Methodology block** ("Note metodologiche" style, as puntienergia): which consumption profile the estimate uses, IVA excluded, which fields of the offer are used, coverage disclosure, ordering rule, source of regulated facts (ARERA Portale Offerte / Scheda sintetica). We already have 70% of this in "Quali offerte confrontiamo" and "Come viene calcolata la stima"; the change is to gather it under one heading with the update date. *Visible.*
5. **People Also Ask answers, neutral**: "Qual è il miglior comparatore di luce e gas?" (answer = how to judge one: declared ordering, declared coverage, how it is paid, source; not "we are"), "Qual è la compagnia che fa pagare meno luce e gas?" (depends on consumption and price type; point to the table and to the Portale), "Dove posso trovare un comparatore del prezzo del gas?", "Perché due comparatori danno risultati diversi?" (puntienergia's strongest FAQ). The home already has 12 Q; these four are the missing PAA ones. *Visible* on the home, *invisible-to-UI* if placed in `/guida/come-funziona-comparatore-luce-gas`. Never a cheapest claim.
6. **Contextual internal links**: the home links 7 guides in the footer only; competitors have 36-161 links per page. Link from the body ("Le quattro situazioni più comuni" to the four situation guides, "Mercato libero e servizi di tutela" to the fine-tutela guide) and from each guide back to the home with the anchor "comparatore luce e gas". *Visible* (text links); cheap and passes link equity inside a tiny site.
7. **Supplier list as text, from the DB, plus a mirrored ItemList in schema**: names of suppliers that really have active offers (today 9 on 2026-11-05); do not name the 6 logo-only suppliers. *Visible* text, *invisible* ItemList; the ItemList must equal the visible list. No Product/AggregateRating.
8. **"Comparatore pubblico e privato" section**: ProntoBolletta and puntienergia both have it; ours is one paragraph. A few more lines on when to use the Portale Offerte (ARERA, wider market) and when a private comparator (partner sellers, online activation). *Visible.*

Invisible hygiene that costs nothing: `alternateName` "VERSUS comparatore luce e gas" in Organization; keep `llms.txt` and sitemap `lastmod` consistent with the visible date; keep the `Service` node; confirm Search Console recrawl.

Not on-page but cheap and independent of copy: a glossary hub (ConfrontaTariffe, Segugio, Luce-Gas.it all have one) as new indexable pages under `/guida/` or `/glossario/` (each new page needs the owner's OK). This grows the site from 8 URLs, which is the one on-site lever that scales.

### (b) Things that need off-site work (not fixable on the page)

- Backlinks and mentions (Billoo is quoted by national press and has an app and B Corp status; Segugio and Facile have tens of thousands of links; none of this is measurable here).
- Genuine reviews on an independent platform, and only then a rating (the T19.1 study already ruled out Product/AggregateRating without them).
- Social / Business Profile / Bing Places / directory `sameAs` profiles (Luce-Gas.it exposes five).
- Time: Bing still "discovered but not crawled", Google's report 0 indexed; brand-query presence (the domain query already ranks 1).
- Being cited by suppliers or consumer sites as a partner (allowed by the canonical-facts decision of 2026-11-07).
- A Wikipedia/Wikidata entry is not realistic for a 6-day-old company.

### (c) Things we must NOT copy

- `Product` + `AggregateRating` + `AggregateOffer` and any rating, "4,8/5 Trustpilot", "oltre 150 mila iscritti", "175.000 clienti soddisfatti", "1 Milione di clienti", testimonials ("Dicono di noi", "I nostri clienti sono sempre soddisfatti").
- Savings claims and snippet bait: "risparmia fino a 400 euro" (Segugio), "Scopri subito quanto puoi risparmiare", "Da 46,82 EUR".
- "La più economica" badges, "il miglior comparatore" self-claims (Clicca), "comparatore indipendente/imparziale" (Selectra family): we are an agent paid by the sellers, so "indipendente/imparziale" would contradict the disclosure we already publish.
- Everything phone-shaped: "Ti richiamiamo gratis", "Fatti richiamare", "Consulenza esperti", "Attivazione in chiamata", opening hours, phone numbers (banned before the thank-you page).
- Named authors, "verificato da <nome>", Person schema, a `/chi-siamo` page.
- Facile.it-style Club/points, "tariffa esclusiva", orange, "Parla con un esperto".
- "Aggiornato in tempo reale", "ottobre 2026" on a stale page: any date not backed by a DB timestamp.
- "ARERA-accredited" or "approved by ARERA" wording: the Portale Offerte is ARERA's own tool; a private comparator is not accredited by it.
- Indexing or linking the 4 SEO offers pages; hidden text or links.

## 3. On-page versus authority/age: honest estimate

My estimate: **roughly 20% on-page, 80% authority / age / index state**. This is a judgement from the evidence below, not a measurement, and the 20% is not zero because the table-and-date block is a real, cheap gap.

Evidence:
1. **Exact-phrase optimisation does not separate the SERP.** Billoo, Supermoney, ConfrontaTariffe, Segugio and the Portale Offerte sit on page 1-2 with the phrase absent from title and H1 (count in body: 0, 0, 0, 0, 0 for "comparatore luce e gas"). The two pages that are optimised to the letter (puntienergia, Luce-Gas.it `/confronto`) sit lower or at the same level (pos. 10-19).
2. **Content depth does not predict order either.** Billoo ranks in the top 9 with ~1,000 words, no table, no FAQ and no phrase; puntienergia has 2,500-3,500 words, a dated price table, 7 FAQ, methodology and bylines, and sits in 10-19. The page with the most prose (ProntoBolletta `/comparatore/`, ~4,000 words with a dated table) is also in 10-19; its sibling with 474 words is not a ranking page.
3. **Every ranking domain is old or press-backed**: Wayback first captures 2009 (ConfrontaTariffe), 2013 (puntienergia registered 2013-12-16, Segugio, Luce-Gas.it), 2019 (Portale), 2020 (Billoo), 2021 (ProntoBolletta); sites of 99 to 14,500 URLs. Ours: 6 days, 8 URLs. I found **no example of a young domain ranking on content alone** in this panel; the only unknown is Clicca e Compara (no Wayback capture, 27-URL sitemap, positions 20-59), whose age I could not establish.
4. **Two of the SERP's "independent" comparators are satellites of bigger groups** (puntienergia and Luce-Gas.it belong to the Selectra family by their own page text; ConfrontaTariffe is an Accueil call-centre project; ProntoBolletta carries Papernest ads), i.e. inherited authority and traffic channels rather than on-page merit.
5. **Our own index state is the binding constraint right now**: Search Console showed 0 indexed pages in the Pages report, the home still served from the 7 November crawl, Bing "discovered but not crawled". A page that Google has not recrawled cannot rank for the new title.

Reading for the owner: the on-page work above is worth doing because it is cheap, truthful and removes the one structural gap (no prices, no date, no linking), but it will not by itself put the home at position 1 for the head term; with the SERP held by the regulator, the national comparators and 5-15-year-old sites, the realistic first outcome of on-page work is entering the first 60 results and winning long-tail guide queries, which is where the T19.1 study already found the lower bar.

Not verified: the exact ranking URL per competitor; real current positions; backlinks; traffic; whether Google treats our new title/H1 differently once recrawled; Segugio's sitemap size; Clicca's age; any content behind JavaScript.

---

# Appendix: raw per-page measurements (output of the analysis script)


## RAW: ours
```
FILE ours.html bytes 121766
TITLE: Comparatore luce e gas: confronta le offerte gratis | VERSUS
DESC: Comparatore luce e gas gratuito per casa e partita IVA: rispondi a poche domande, confronta le offerte e attiva online quella che scegli.
CANON: https://versuscomparatorelucegas.it | ROBOTS: None
H1: ['Comparatore luce e gas']
WORDS all-visible: 1389 | excluding nav/header/footer: 1276
PHRASE "comparatore luce e gas": title=True desc=True h1=1 h2/h3=0 first100=True count_body=4
PHRASE "comparatore luce gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronta offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronto offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronta le offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore": title=True desc=True h1=1 h2/h3=0 first100=True count_body=6
H2 (8):
  - Cosa vuoi confrontare?
  - Per chi è la fornitura?
  - I tuoi dati
  - Di quale servizio hai bisogno?
  - Come funziona
  - Confrontiamo le offerte di
  - Domande frequenti
  - Come funziona il confronto luce e gas su VERSUS
H3 (9):
  - Confronta
  - Scegli
  - Attiva online
  - Quali offerte confrontiamo
  - Come viene calcolata la stima
  - Prezzo fisso o prezzo variabile
  - Mercato libero e servizi di tutela
  - Le quattro situazioni più comuni
  - Cosa controllare prima di firmare
JSONLD blocks 1 unparsable 0 | types: {'Organization': 1, 'ImageObject': 1, 'PostalAddress': 1, 'WebSite': 1, 'Service': 1, 'Country': 1, 'FAQPage': 1, 'Question': 12, 'Answer': 12}
FAQPage questions in schema: 12 | sameAs: [] | dates: [('dateModified', '2026-11-07')] | ratings: []
LINKS internal unique: 8 external unique: 0
internal link path hubs: {'guida': 7, 'fornitor': 1, 'offert': 1}
KEYWORD counts: {'aggiornat': 0, 'arera': 9, 'trustpilot': 0, 'recension': 0, 'stelle': 0, 'redazione': 0, 'faq': 0, 'domande frequenti': 1, 'glossario': 0, 'come funziona': 5, 'metodolog': 0, 'partner': 0, 'scarica l': 0, 'app store': 0, 'google play': 0, 'utenti': 0, 'clienti': 4, 'risparmi': 0, '
Month-2026 mentions: []
aggiornat… samples: []
priced items (€ amounts): 1 | tables: 0 rows: 0 | details: 12 | imgs: 15
QUESTIONS (h2/h3/text ending ?) in headings: 3
FIRST 100 WORDS (main): tipo di fornitura luce gas luce + gas tipo di cliente casa partita iva nome * cognome * cellulare * email * comune * inizia a digitare il nome e scegli dall'elenco. acconsento al trattamento dei miei dati personali come descritto nell' informativa sulla privacy . tipo di serv
```

## RAW: billoo_home
```
FILE billoo_home.html bytes 275842
TITLE: Billoo | Controlla la tua Bolletta e le migliori offerte luce e gas
DESC: Controlla subito la tua Bolletta con Billoo, bolletta troppo cara? Billoo trova l’offerta perfetta per te in pochi clic su luce e gas.
CANON: https://www.billoo.it/ | ROBOTS: index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1
H1: ['Il risparmio in bolletta ha un nuovo nome: Billoo!']
WORDS all-visible: 1193 | excluding nav/header/footer: 1043
PHRASE "comparatore luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore luce gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronta offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronto offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronta le offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
H2 (12):
  - Billoo è qui per combattere il caro energia per te.
  - Chi è Billoo?
  - Cosa fa Billoo?
  - Billoo è anche PASS!
  - Il risparmio a portata di azienda!
  - Parlano di noi
  - I nostri partner
  - I nostri partner
  - Billoo è anche App!
  - Billoo è anche Webapp!
  - Esperienze autentiche e affidabili
  - Scopri il blog di Billoo
H3 (26):
  - È il tuo asso nella manica per risparmiare in bolletta!
  - Controlla le bollette
  - Dà una pagella
  - Procede con ilreclamo
  - Trova le miglioriofferte luce e gasdel mercato
  - Cambia fornitore inun lampo
  - Propone soluzionidi risparmioenergetico
  - Controlla le bollette
  - Dà una pagella
  - Procede con ilreclamo
  - Trova le miglioriofferte luce e gas delmercato
  - Cambia fornitore inun lampo
  - Propone soluzioni dirisparmio energetico
  - Ehi, hai già visto la nuova Webapp per risparmiare sulle bollette?
  - Ehi, hai già visto la nuova App per risparmiare sulle bollette?
  - Sai mantenere un segreto? Vai ai Billoo Secrets
  - Billoo si rinnova per darti ancora più velocità!
  - Allerta Prezzi: Mercato Energetico fuori controllo
  - Attenzione agli scam telefonici nel mercato energia
  - Gestire le bollette durante un trasloco: guida pratica e senza stress
  - Staccare la spina: un invito al risparmio
  - BILLOO SRL SOCIETA’ BENEFIT OTTIENE LA CERTIFICAZIONE B CORP
  - Natale con Billoo: questo Natale regalati il risparmio!
  - Come riconoscere una bolletta falsa?
  - Black Friday con Billoo: il risparmio è doppio!
  - Come risparmiare sull’illuminazione della casa? La guida completa
JSONLD blocks 1 unparsable 0 | types: {'WebPage': 1, 'ReadAction': 1, 'ImageObject': 2, 'BreadcrumbList': 1, 'ListItem': 1, 'WebSite': 1, 'SearchAction': 1, 'EntryPoint': 1, 'PropertyValueSpecification': 1, 'Organization': 1}
FAQPage questions in schema: 0 | sameAs: [] | dates: [('datePublished', '2024-11-20T08:31:28+00:00'), ('dateModified', '2026-07-13T09:50:13+00:00')] | ratings: []
LINKS internal unique: 32 external unique: 13
internal link path hubs: {'faq': 1, 'blog': 1, 'chi-siamo': 1, 'recension': 1, 'guida': 1}
KEYWORD counts: {'aggiornat': 0, 'arera': 0, 'trustpilot': 0, 'recension': 3, 'stelle': 0, 'redazione': 0, 'faq': 4, 'domande frequenti': 0, 'glossario': 0, 'come funziona': 5, 'metodolog': 0, 'partner': 2, 'scarica l': 0, 'app store': 0, 'google play': 0, 'utenti': 2, 'clienti': 1, 'risparmi': 22, 
Month-2026 mentions: []
aggiornat… samples: []
priced items (€ amounts): 1 | tables: 0 rows: 0 | details: 0 | imgs: 67
QUESTIONS (h2/h3/text ending ?) in headings: 5
FIRST 100 WORDS (main): vai ai contenuti registrati accedi il risparmio in bolletta ha un nuovo nome: billoo! billoo è qui per combattere il caro energia per te. controlla le fatture, ti consiglia l'offerta migliore, cambia fornitore in un lampo. carica una bolletta, inizia la magia! billoo control
```

## RAW: supermoney_home
```
FILE supermoney_home.html bytes 232836
TITLE: Supermoney.it: Offerte Luce Gas, Adsl, RCA, Mutui e Prestiti
DESC: Confronta le migliori offerte luce e gas, ADSL, assicurazioni auto, mutui, prestiti e conto corrente. Risparmia ora con Supermoney!
CANON: None | ROBOTS: None
H1: ['Trova le offerte su misura per te']
WORDS all-visible: 966 | excluding nav/header/footer: 645
PHRASE "comparatore luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore luce gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronta offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronto offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronta le offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore": title=False desc=False h1=0 h2/h3=0 first100=False count_body=1
H2 (6):
  - Confronta le offerte dei nostri partner e scegli, tra quelle disponibili, la più adatta alle tue esigenze.
  - Ogni anno più di 2 milioni di persone scelgono i nostri servizi
  - Lavoriamo con i migliori partner del mercato
  - Come possiamo aiutarti
  - Vuoi scoprire di più sul mondo delle utility per la casa?
  - 4 cose da sapere:
H3 (17):
  - Velocità
  - Gratis
  - Sicuro
  - Analizziamo le tue esigenze:
  - Ricerchiamo le offerte:
  - Attendiamo la tua conferma:
  - Gestiamo tutte le pratiche:
  - Cambio fornitore luce in 24 ore: come funziona il nuovo switch
  - Fine Tutele Graduali Illumia: cosa cambia e cosa puoi fare
  - Fine Tutele Graduali E.ON Energia: cosa cambia e cosa puoi fare
  - Fine Tutele Graduali Edison Energia: cosa cambia e cosa puoi fare
  - Fine Tutele Graduali Hera Comm: cosa cambia e cosa puoi fare
  - Fine Tutele Graduali Iren: cosa cambia e cosa puoi fare
  - Fine Tutele Graduali A2A Energia: cosa cambia e cosa puoi fare
  - Fine Tutele Graduali Enel Energia: cosa cambia e cosa puoi fare
  - Comunicazione fine tutele graduali energia: cosa fare quando arriva
  - Servizio a Tutele Graduali energia: cos'è e cosa cambia nel 2027
JSONLD blocks 0 unparsable 0 | types: {}
FAQPage questions in schema: 0 | sameAs: [] | dates: [] | ratings: []
LINKS internal unique: 50 external unique: 2
internal link path hubs: {'fornitor': 9, 'guide': 4, 'news': 14, 'comuni': 1, 'contatt': 1, 'chi-siamo': 1}
KEYWORD counts: {'aggiornat': 0, 'arera': 0, 'trustpilot': 0, 'recension': 0, 'stelle': 0, 'redazione': 11, 'faq': 0, 'domande frequenti': 0, 'glossario': 0, 'come funziona': 2, 'metodolog': 0, 'partner': 7, 'scarica l': 0, 'app store': 0, 'google play': 0, 'utenti': 1, 'clienti': 7, 'risparmi': 1, 
Month-2026 mentions: [('dicembre 2026', 1)]
aggiornat… samples: []
priced items (€ amounts): 0 | tables: 0 rows: 0 | details: 0 | imgs: 39
QUESTIONS (h2/h3/text ending ?) in headings: 1
FIRST 100 WORDS (main): trova le offerte su misura per te confronta le offerte dei nostri partner e scegli, tra quelle disponibili, la più adatta alle tue esigenze. tariffe luce tariffe gas tariffe luce + gas internet casa assicurazioni casa e famiglia perchè sceglierci ogni anno più di 2 milioni
```

## RAW: sm_lg
```
FILE sm_lg.html bytes 187530
TITLE: Offerte Luce e Gas: confronta le tariffe energia dei nostri partner
DESC: Compara le tariffe dei nostri partner e scegli le offerte luce e gas giuste per te! Richiedi una consulenza gratuita sulla tua bolletta.
CANON: https://www.supermoney.it/energia-luce-gas/ | ROBOTS: index,follow
H1: ['Offerte luce e gas: confronta le tariffe di energia dei nostri partner']
WORDS all-visible: 1931 | excluding nav/header/footer: 1465
PHRASE "comparatore luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore luce gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronta offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronto offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronta le offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore": title=False desc=False h1=0 h2/h3=0 first100=False count_body=1
H2 (23):
  - Tariffe Gas
  - Tariffe Luce
  - Tariffe Luce Gas
  - Fornitori luce e gas confrontati
  - Hai la partita Iva?
  - Guide energia: scopri di più su come risparmiare sulle bollette
  - Con SuperMoney puoi trovare la tariffa più adatta a te tra quelle dei nostri partner
  - Tariffe luce e gas: a cosa fare attenzione?
  - Voltura e subentro luce e gas
  - Maggior Tutelao Libero Mercato?
  - Perché ti puoi fidare di noi
  - Confronta le tariffe di energia dei nostri partner
  - Le news di Energia
  - Cambio fornitore luce in 24 ore: come funziona il nuovo switch
  - Fine Tutele Graduali Illumia: cosa cambia e cosa puoi fare
  - Fine Tutele Graduali E.ON Energia: cosa cambia e cosa puoi fare
  - Fine Tutele Graduali Edison Energia: cosa cambia e cosa puoi fare
  - Fine Tutele Graduali Hera Comm: cosa cambia e cosa puoi fare
  - Fine Tutele Graduali Iren: cosa cambia e cosa puoi fare
  - Fine Tutele Graduali A2A Energia: cosa cambia e cosa puoi fare
  - Fine Tutele Graduali Enel Energia: cosa cambia e cosa puoi fare
  - Comunicazione fine tutele graduali energia: cosa fare quando arriva
  - Servizio a Tutele Graduali energia: cos'è e cosa cambia nel 2027
H3 (2):
  - Offerte Luce: le nostre tariffe più convenienti
  - Offerte Gas: le nostre tariffe più convenienti
JSONLD blocks 1 unparsable 0 | types: {'Organization': 1, 'Person': 1}
FAQPage questions in schema: 0 | sameAs: [] | dates: [] | ratings: []
LINKS internal unique: 110 external unique: 8
internal link path hubs: {'guide': 63, 'fornitor': 8, 'news': 12, 'contatt': 1, 'chi-siamo': 1, 'offert': 1, 'comuni': 1}
KEYWORD counts: {'aggiornat': 0, 'arera': 0, 'trustpilot': 0, 'recension': 0, 'stelle': 0, 'redazione': 11, 'faq': 0, 'domande frequenti': 0, 'glossario': 0, 'come funziona': 5, 'metodolog': 0, 'partner': 6, 'scarica l': 0, 'app store': 0, 'google play': 0, 'utenti': 1, 'clienti': 8, 'risparmi': 13,
Month-2026 mentions: [('dicembre 2026', 1)]
aggiornat… samples: []
priced items (€ amounts): 6 | tables: 0 rows: 0 | details: 0 | imgs: 54
QUESTIONS (h2/h3/text ending ?) in headings: 3
FIRST 100 WORDS (main): home energia offerte luce e gas: confronta le tariffe di energia dei nostri partner tariffe gas tariffe gas tariffe luce tariffe luce tariffe luce gas tariffe luce gas fornitori luce e gas confrontati acea energia iren mercato eni plenitude illumia edison energia hera comm al
```

## RAW: sm_dual
```
FILE sm_dual.html bytes 141774
TITLE: Offerte Luce e Gas: confronta le migliori tariffe
DESC: Compara le offerte luce e gas delle principali compagnie del libero mercato e risparmia sulla bolletta. Richiedi subito un preventivo gratuito.
CANON: https://www.supermoney.it/energia-luce-gas/elettricita-e-gas/ | ROBOTS: None
H1: ['Confronta le offerte e trova quella più adatta a te.']
WORDS all-visible: 2085 | excluding nav/header/footer: 2038
PHRASE "comparatore luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore luce gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronta offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronto offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronta le offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore": title=False desc=False h1=0 h2/h3=0 first100=False count_body=5
H2 (6):
  - Compilando il form confronti le offerte dei nostri partner e puoi ricevere una consulenza telefonica gratuita e senza impegno da un nostro e
  - Come funziona il servizio di comparazione luce & gas
  - Risparmia su luce e gas
  - Scegli l’offerta giusta e difenditi dal caro bollette luce e gas
  - Come funziona il cambio di fornitore energia?
  - Di quali informazioni ho bisogno per cambiare fornitore
H3 (2):
  - Cosa aspetti, è gratis!
  - Dunque come difendersi dal caro bollette?
JSONLD blocks 1 unparsable 0 | types: {'Organization': 1, 'Person': 1}
FAQPage questions in schema: 0 | sameAs: [] | dates: [] | ratings: []
LINKS internal unique: 6 external unique: 0
internal link path hubs: {'chi-siamo': 1}
KEYWORD counts: {'aggiornat': 1, 'arera': 0, 'trustpilot': 0, 'recension': 0, 'stelle': 0, 'redazione': 0, 'faq': 0, 'domande frequenti': 0, 'glossario': 0, 'come funziona': 4, 'metodolog': 0, 'partner': 9, 'scarica l': 0, 'app store': 0, 'google play': 0, 'utenti': 0, 'clienti': 0, 'risparmi': 3, '
Month-2026 mentions: []
aggiornat… samples: []
priced items (€ amounts): 0 | tables: 0 rows: 0 | details: 0 | imgs: 0
QUESTIONS (h2/h3/text ending ?) in headings: 2
FIRST 100 WORDS (main): la tua ricerca non ha prodotto risultati. modifica i parametri inseriti e riprova. confronta le offerte e trova quella più adatta a te. compilando il form confronti le offerte dei nostri partner e puoi ricevere una consulenza telefonica gratuita e senza impegno da un nostro 
```

## RAW: prontobolletta_home
```
FILE prontobolletta_home.html bytes 1053158
TITLE: PRONTOBOLLETTA.IT Tutto su Energia, Bollette e Offerte Luce e Gas
DESC: Informazioni e guide sul mercato energetico e sulla burocrazia delle utenze luce e gas. Assicurati il risparmio in bolletta.
CANON: https://www.prontobolletta.it/ | ROBOTS: index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1
H1: ['Attiva le migliori offerte luce e gas per te sul mercato con prontobolletta.it']
WORDS all-visible: 805 | excluding nav/header/footer: 637
PHRASE "comparatore luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore luce gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronta offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronto offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronta le offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore": title=False desc=False h1=0 h2/h3=1 first100=False count_body=1
H2 (7):
  - Personalizza i tuoi cookie
  - Ci occuperemo di trovare il miglior fornitore per te gratuitamente
  - Le offerte convenienti dei nostri partner
  - L'assistenza per la casa dei provider
  - Il PSV del Gas e il sistema del prezzo del gas
  - Scopri tutte le offerte per Aziende e Imprese
  - Ecco il Comparatore delle offerte!
H3 (19):
  - Energia VedoChiaro
  - Standard
  - IREN 10 PER TRE LUCE VARIABILE
  - Perché scegliere noi?
  - Vuoi risparmiare sulle tue bollette?
  - I vantaggi del nostro servizio
  - Cosa pensano i nostri clienti del nostro servizio
  - Andrea
  - Eddy Girardi
  - Antonio Blunda
  - Lorenzo Manfrini
  - Lucia
  - Articoli che ti possono interessare:
  - Domande e curiosità
  - Come posso risparmiare sulle utenze luce e gas?
  - Come capisco se un’offerta è più adatta alle mie esigenze?
  - Di cosa hai bisogno quando traslochi? Focus contatore luce.
  - Informazioni utili per il trasloco, focus sul Gas.
  - Risolvi tutti i tuoi dubbi sulle bollette.
JSONLD blocks 2 unparsable 0 | types: {'FAQPage': 1, 'Question': 19, 'Answer': 19, 'Organization': 1, 'ContactPoint': 1, 'OpeningHoursSpecification': 1, 'ImageObject': 1, 'WebSite': 1, 'SearchAction': 1, 'BreadcrumbList': 1, 'ListItem': 2, 'WebPage': 1, 'ReadAction': 1}
FAQPage questions in schema: 19 | sameAs: ['https://www.facebook.com/ProntoBolletta', 'https://x.com/PBolletta'] | dates: [('datePublished', '2021-04-19T14:37:48.000Z'), ('dateModified', '2025-08-28T12:52:26.000Z')] | ratings: []
LINKS internal unique: 58 external unique: 11
internal link path hubs: {'offert': 8, 'contatt': 6, 'glossari': 1, 'news': 1, 'fornitor': 3, 'blog': 1, 'chi-siamo': 1}
KEYWORD counts: {'aggiornat': 0, 'arera': 0, 'trustpilot': 0, 'recension': 1, 'stelle': 0, 'redazione': 0, 'faq': 0, 'domande frequenti': 0, 'glossario': 1, 'come funziona': 1, 'metodolog': 0, 'partner': 1, 'scarica l': 0, 'app store': 0, 'google play': 0, 'utenti': 0, 'clienti': 1, 'risparmi': 10, 
Month-2026 mentions: []
aggiornat… samples: []
priced items (€ amounts): 3 | tables: 0 rows: 0 | details: 0 | imgs: 29
QUESTIONS (h2/h3/text ending ?) in headings: 4
FIRST 100 WORDS (main): personalizza i tuoi cookie utilizziamo i cookie per garantire il corretto funzionamento del sito e per fornire i nostri servizi e, se sei d'accordo, a scopo di analisi per migliorare i nostri servizi e offrirti annunci personalizzati. per saperne di più, consulta la nostra p
```

## RAW: pronto_comp
```
FILE pronto_comp.html bytes 997340
TITLE: Confronta le migliori offerte per Subentro Luce e Gas - ProntoBolletta
DESC: Comparatore Offerte Energia: quali offerte sono più conveninenti, quali sono i migliori fornitori e come attivare le offerte velocemente.
CANON: https://www.prontobolletta.it/comparatore-energia/ | ROBOTS: index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1
H1: ['Effettua Subentro Luce e Gas']
WORDS all-visible: 642 | excluding nav/header/footer: 474
PHRASE "comparatore luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore luce gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronta offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronto offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronta le offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore": title=False desc=True h1=0 h2/h3=0 first100=False count_body=0
H2 (3):
  - Personalizza i tuoi cookie
  - Confronta le offerte per subentro luce e gas di diversi fornitori sul mercato
  - Le offerte subentro luce e gas consigliate da prontobolletta
H3 (16):
  - Trend Casa Luce (Base)
  - Irendi' Luce Verde
  - Energia alla fonte (Sconto intero)
  - Perchè scegliere il nostro servizio?
  - Pensi di pagare troppo in bolletta?
  - Tutti i vantaggi del nostro servizio
  - I nostri clienti sono sempre soddisfatti!
  - Lucia
  - Eddy Girardi
  - Andrea
  - Lorenzo Manfrini
  - Antonio Blunda
  - Tutto quello che ti serve sapere
  - Come funziona il processo di attivazione delle utenze luce e gas?
  - Quali procedure devo effettuare per l'attivazione del contatore quando mi trasferisco?
  - Cosa devo sapere per cambiare fornitore?
JSONLD blocks 2 unparsable 0 | types: {'FAQPage': 1, 'Question': 10, 'Answer': 10, 'WebSite': 1, 'SearchAction': 1, 'BreadcrumbList': 1, 'ListItem': 2, 'WebPage': 1, 'ReadAction': 1}
FAQPage questions in schema: 10 | sameAs: [] | dates: [('datePublished', '2022-04-27T12:13:11.000Z'), ('dateModified', '2025-03-13T15:05:13.000Z')] | ratings: []
LINKS internal unique: 46 external unique: 12
internal link path hubs: {'contatt': 6, 'glossari': 1, 'fornitor': 1, 'offert': 2, 'news': 1, 'blog': 1, 'chi-siamo': 1}
KEYWORD counts: {'aggiornat': 0, 'arera': 0, 'trustpilot': 0, 'recension': 0, 'stelle': 0, 'redazione': 0, 'faq': 0, 'domande frequenti': 0, 'glossario': 1, 'come funziona': 1, 'metodolog': 0, 'partner': 0, 'scarica l': 0, 'app store': 0, 'google play': 0, 'utenti': 0, 'clienti': 1, 'risparmi': 4, '
Month-2026 mentions: []
aggiornat… samples: []
priced items (€ amounts): 0 | tables: 0 rows: 0 | details: 0 | imgs: 27
QUESTIONS (h2/h3/text ending ?) in headings: 5
FIRST 100 WORDS (main): personalizza i tuoi cookie utilizziamo i cookie per garantire il corretto funzionamento del sito e per fornire i nostri servizi e, se sei d'accordo, a scopo di analisi per migliorare i nostri servizi e offrirti annunci personalizzati. per saperne di più, consulta la nostra p
```

## RAW: pronto_comp2
```
FILE pronto_comp2.html bytes 1231404
TITLE: Comparatori Luce e Gas : Confronta le Migliori Offerte del 2025
DESC: Con l'aumento delle offerte disponibili sul mercato energetico, scegliere la tariffa più conveniente per luce e gas può risultare complicato. Fortunat
CANON: https://www.prontobolletta.it/comparatore/ | ROBOTS: index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1
H1: ['Comparatori Luce e Gas: Scopri le Migliori Offerte e Confronta le Tariffe Energetiche Disponibili']
WORDS all-visible: 4242 | excluding nav/header/footer: 3937
PHRASE "comparatore luce e gas": title=False desc=False h1=0 h2/h3=1 first100=False count_body=3
PHRASE "comparatore luce gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=1
PHRASE "confronta offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronto offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronta le offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore": title=False desc=False h1=0 h2/h3=1 first100=True count_body=6
H2 (8):
  - Personalizza i tuoi cookie
  - Comparare offerte luce e gas: quali fattori considerare?
  - Comparatore luce e gas: quali sono le offerte disponibili sul mercato?
  - Le Migliori Tariffe Luce e Gas di ottobre 2026
  - Perché è importante confrontare i fornitori luce e gas?
  - Da cosa dipende la convenienza di un'offerta luce e gas rispetto a un'altra?
  - Come attivare un nuovo contatore o nuovo allaccio?
  - FAQ
H3 (20):
  - Comparatori pubblici e privati
  - Comparare le tariffe energetiche: quali sono le offerte green?
  - Comparare le offerte in base agli orari: tariffe monorarie e biorarie
  - Comparare le offerte dual fuel: che cosa sono e perché convengono
  - La fine del Mercato tutelato e il passaggio al Mercato libero
  - 5 Offerte luce e gas per cambio gestore
  - 5 Offerte luce e gas per la riattivazione contatore con il subentro
  - 5 Offerte luce e gas per nuovo allaccio
  - 10 consigli per il cambio fornitore gas e luce
  - Perché attivare un'offerta luce e gas insieme?
  - Qual è il miglior fornitore luce e gas?
  - Prezzo gas ed energia elettrica
  - Consumo di energia in un anno
  - Consumo per fasce orarie
  - Cosa serve per attivare un contratto o per cambiare fornitore
  - Qual è il gestore più economico per gas e luce?
  - Cosa succede se resto con il Servizio Elettrico Nazionale?
  - Come richiedere il bonus luce e gas?
  - Perché le tariffe luce e gas sono aumentate?
  - Come confrontare le tariffe luce e gas?
JSONLD blocks 1 unparsable 0 | types: {'WebSite': 1, 'SearchAction': 1, 'BreadcrumbList': 1, 'ListItem': 2, 'WebPage': 1, 'ReadAction': 1, 'FAQPage': 1, 'Question': 5, 'Answer': 5}
FAQPage questions in schema: 5 | sameAs: [] | dates: [('datePublished', '2022-03-21T08:41:34.000Z'), ('dateModified', '2025-10-08T09:42:29.000Z')] | ratings: []
LINKS internal unique: 70 external unique: 15
internal link path hubs: {'contatt': 6, 'offert': 11, 'blog': 1, 'chi-siamo': 1, 'fornitor': 3, 'news': 1, 'glossari': 1}
KEYWORD counts: {'aggiornat': 0, 'arera': 6, 'trustpilot': 4, 'recension': 0, 'stelle': 0, 'redazione': 0, 'faq': 1, 'domande frequenti': 0, 'glossario': 1, 'come funziona': 0, 'metodolog': 0, 'partner': 1, 'scarica l': 0, 'app store': 0, 'google play': 0, 'utenti': 3, 'clienti': 7, 'risparmi': 12, 
Month-2026 mentions: [('ottobre 2026', 3)]
aggiornat… samples: []
priced items (€ amounts): 71 | tables: 1 rows: 21 | details: 0 | imgs: 23
QUESTIONS (h2/h3/text ending ?) in headings: 13
FIRST 100 WORDS (main): personalizza i tuoi cookie utilizziamo i cookie per garantire il corretto funzionamento del sito e per fornire i nostri servizi e, se sei d'accordo, a scopo di analisi per migliorare i nostri servizi e offrirti annunci personalizzati. per saperne di più, consulta la nostra p
```

## RAW: puntienergia_home
```
FILE puntienergia_home.html bytes 363597
TITLE: Trova il tuo Punto Energia in Italia, Sportelli, Contatti e Guide
DESC: Cerca il punto energia più vicino a te. Trova contatti e indirizzi degli sportelli Enel, Eni, Hera e altri fornitori. Guide su voltura e allaccio.
CANON: https://puntienergia.com | ROBOTS: None
H1: ['Trova il Punto Energia più vicino a te']
WORDS all-visible: 1799 | excluding nav/header/footer: 836
PHRASE "comparatore luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore luce gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronta offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronto offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronta le offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
H2 (7):
  - Sportelli per regione
  - Cosa stai cercando?
  - Contatta il tuo fornitore
  - Guide pratiche
  - Le grandi città
  - Cosa dicono di noi
  - Domande frequenti sui punti energia in Italia
H3 (8):
  - Trasloco e contratti
  - Bollette e risparmio
  - Come trovo il punto Enel più vicino a casa mia?
  - Devo andare allo sportello per fare la voltura o il subentro?
  - Cos'è il codice POD e dove si trova?
  - Qual è il gestore più conveniente per luce e gas?
  - Differenza tra fornitore e distributore: chi devo contattare?
  - Ti richiamiamo gratis
JSONLD blocks 1 unparsable 0 | types: {'FAQPage': 1, 'Question': 5, 'Answer': 5}
FAQPage questions in schema: 5 | sameAs: [] | dates: [] | ratings: []
LINKS internal unique: 141 external unique: 8
internal link path hubs: {'contatt': 31, 'guida': 44, 'offert': 14, 'fornitor': 39, 'chi-siamo': 1}
KEYWORD counts: {'aggiornat': 0, 'arera': 4, 'trustpilot': 1, 'recension': 2, 'stelle': 0, 'redazione': 0, 'faq': 0, 'domande frequenti': 1, 'glossario': 0, 'come funziona': 0, 'metodolog': 0, 'partner': 0, 'scarica l': 0, 'app store': 0, 'google play': 0, 'utenti': 0, 'clienti': 1, 'risparmi': 1, '
Month-2026 mentions: []
aggiornat… samples: []
priced items (€ amounts): 0 | tables: 0 rows: 0 | details: 0 | imgs: 19
QUESTIONS (h2/h3/text ending ?) in headings: 6
FIRST 100 WORDS (main): vai al contenuto principale trova il punto energia più vicino a te indirizzi, orari e contatti degli sportelli luce e gas in tutta italia cerca non trovi la tua città? inserisci il nome o il cap di una città vicina o cerca per regione cliccando qui sotto ↓ sportelli per 
```

## RAW: punti_comp
```
FILE punti_comp.html bytes 437380
TITLE: Comparatore Luce e Gas: confronta le offerte aggiornate
DESC: Confronta le offerte luce e gas del mercato libero: come funziona un comparatore, quali dati servono, cosa cambia rispetto al Portale Offerte di ARERA e gli errori da evitare.
CANON: https://puntienergia.com/offerte/comparatore-luce-gas | ROBOTS: None
H1: ['Comparatore Luce e Gas: confronta le offerte aggiornate']
WORDS all-visible: 3543 | excluding nav/header/footer: 2571
PHRASE "comparatore luce e gas": title=True desc=False h1=1 h2/h3=1 first100=True count_body=6
PHRASE "comparatore luce gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronta offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronto offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronta le offerte luce e gas": title=False desc=True h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore": title=True desc=True h1=1 h2/h3=1 first100=True count_body=13
H2 (6):
  - Le offerte luce e gas a confronto oggi
  - Come funziona un comparatore luce e gas
  - Quando conviene parlare con un esperto
  - Oltre il cambio tariffa: ridurre i consumi
  - Approfondisci con le nostre guide tematiche
  - Domande frequenti sui comparatori luce e gas
H3 (2):
  - Le migliori offerte luce e gas di novembre 2026
  - Ti richiamiamo gratis
JSONLD blocks 4 unparsable 0 | types: {'FAQPage': 1, 'Question': 7, 'Answer': 7, 'Article': 1, 'WebPage': 1, 'Person': 2, 'Organization': 1, 'BreadcrumbList': 1, 'ListItem': 9, 'ItemList': 1, 'Product': 6, 'Brand': 6, 'Offer': 6, 'AggregateRating': 6}
FAQPage questions in schema: 7 | sameAs: [] | dates: [('datePublished', '2024-07-24T00:00:00+02:00'), ('dateModified', '2026-08-25T00:00:00+02:00')] | ratings: [{'@type': 'AggregateRating', 'ratingValue': '4.9', 'reviewCount': 32802, 'bestRating': '5', 'worstRating': '1'}, {'@type': 'AggregateRating
LINKS internal unique: 121 external unique: 17
internal link path hubs: {'guida': 40, 'offert': 15, 'fornitor': 23, 'contatt': 21, 'chi-siamo': 1}
KEYWORD counts: {'aggiornat': 10, 'arera': 6, 'trustpilot': 0, 'recension': 0, 'stelle': 0, 'redazione': 1, 'faq': 0, 'domande frequenti': 1, 'glossario': 0, 'come funziona': 2, 'metodolog': 1, 'partner': 2, 'scarica l': 0, 'app store': 0, 'google play': 0, 'utenti': 0, 'clienti': 0, 'risparmi': 1, 
Month-2026 mentions: [('agosto 2026', 1), ('novembre 2026', 1)]
aggiornat… samples: ['aggiornato il 25 agosto 2026 | 7 min di lettura condividi co', 'aggiornato', 'aggiornata il 06/11 next energy puntuale luce e gas prezzo i']
priced items (€ amounts): 31 | tables: 0 rows: 0 | details: 0 | imgs: 16
QUESTIONS (h2/h3/text ending ?) in headings: 0
FIRST 100 WORDS (main): vai al contenuto principale comparatore luce e gas: confronta le offerte aggiornate di francesca siani | verificato da valentina coppola | aggiornato il 25 agosto 2026 | 7 min di lettura condividi condividi l'articolo facebook whatsapp x linkedin telegram email segui selectra
```

## RAW: confronta_home
```
FILE confronta_home.html bytes 299933
TITLE: ConfrontaTariffe: scopri le migliori offerte luce e gas
DESC: Confronta le migliori offerte luce e gas, risparmia sulla bolletta e scopri consigli pratici per scegliere l’energia giusta per te.
CANON: https://www.confrontatariffe.it/ | ROBOTS: index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1
H1: ['Confronta tariffe', 'Luce, Gas e Internet']
WORDS all-visible: 2301 | excluding nav/header/footer: 2015
PHRASE "comparatore luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore luce gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronta offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronto offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronta le offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore": title=False desc=False h1=0 h2/h3=1 first100=False count_body=2
H2 (15):
  - Confronta le migliori offerte e risparmia sulla bolletta
  - Analisi gratuita e senza impegno
  - Fino a 200€
  - Attivazione assistita
  - Confronto tra i nostri migliori partner
  - Come funziona
  - Dicono di noi
  - Servizio super utile
  - Ottimo servizio
  - Ottimo comparatore
  - Scopri le offerte
  - Mercato Fornitori
  - Guide e Ultime notizie
  - Le nuove tendenze del mercato
  - Top 10 curiosità
H3 (21):
  - Luce e Gas
  - Fibra
  - Inserisci i tuoi dati o la bolletta
  - Confrontiamo le migliori offerte
  - Ti aiutiamo a risparmiare
  - Irene S.
  - Irene G.
  - Bruno D.
  - Smart Casa Luce e Gas
  - Energia Lunga Luce e Gas Easy
  - Trend Casa Luce e Gas
  - Come richiedere un allaccio temporaneo Enel
  - Consumo medio gas per 2 persone: al mese e all’anno
  - Quanto consuma la PS5 (PlayStation 5)
  - Cambio gestore energia elettrica: come fare, costi e tempistiche
  - Come effettuare il cambio intestatario della fornitura Enel
  - Costi e procedure per la voltura del Servizio Elettrico Nazionale
  - Più scelta per i consumatori
  - Servizi sempre più digitali
  - Offerte integrate
  - Maggiore competitività
JSONLD blocks 2 unparsable 0 | types: {'WebPage': 1, 'ReadAction': 1, 'ImageObject': 25, 'BreadcrumbList': 1, 'ListItem': 1, 'WebSite': 1, 'SearchAction': 1, 'EntryPoint': 1, 'PropertyValueSpecification': 1, 'Organization': 1, 'Person': 23}
FAQPage questions in schema: 0 | sameAs: [] | dates: [('datePublished', '2026-06-25T09:01:11+00:00'), ('dateModified', '2026-10-09T10:20:36+00:00')] | ratings: []
LINKS internal unique: 54 external unique: 5
internal link path hubs: {'offert': 26, 'recension': 15, 'contatt': 18, 'guide': 5, 'glossari': 3, 'chi-siamo': 1, 'fornitor': 3}
KEYWORD counts: {'aggiornat': 2, 'arera': 2, 'trustpilot': 2, 'recension': 1, 'stelle': 0, 'redazione': 0, 'faq': 0, 'domande frequenti': 0, 'glossario': 0, 'come funziona': 1, 'metodolog': 0, 'partner': 2, 'scarica l': 0, 'app store': 0, 'google play': 0, 'utenti': 1, 'clienti': 0, 'risparmi': 9, '
Month-2026 mentions: []
aggiornat… samples: ['aggiornato sulle novità del mercato energetico, le nuove tar']
priced items (€ amounts): 6 | tables: 0 rows: 0 | details: 0 | imgs: 13
QUESTIONS (h2/h3/text ending ?) in headings: 0
FIRST 100 WORDS (main): salta al contenuto confronta articoli aggiungi dei prodotti al gruppo di confronto o seleziona un gruppo che ne contenga già confronta tariffe luce, gas e internet confronta le migliori offerte e risparmia sulla bolletta inserisci pochi dati e ottieni subito le migliori offe
```

## RAW: segugio_lg
```
FILE segugio_lg.html bytes 1318111
TITLE: Offerte Luce e Gas: confronta le tariffe dual fuel | Segugio.it
DESC: Metti a confronto le offerte dual fuel luce e gas più convenienti e scegli la migliore per te. Con Segugio.it puoi risparmiare fino a 400 euro sulla bolletta luce e gas.
CANON: https://tariffe.segugio.it/luce-gas/ | ROBOTS: None
H1: ['Offerte Luce e Gas:\u200e \u200econfronta e risparmia, gratis!']
WORDS all-visible: 5218 | excluding nav/header/footer: 4624
PHRASE "comparatore luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore luce gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronta offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=1
PHRASE "confronto offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronta le offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=True count_body=1
PHRASE "comparatore": title=False desc=False h1=0 h2/h3=0 first100=False count_body=1
H2 (13):
  - Scopri subito quanto puoi risparmiare
  - Carica una bolletta e scopri il risparmio
  - Le migliori offerte luce e gas casa di oggi dei nostri partner a confronto
  - Le migliori offerte luce e gas a prezzo bloccato dei nostri partner di novembre 2026
  - Le migliori offerte luce e gas a prezzo indicizzato dei nostri partner di novembre 2026
  - I fornitori luce e gas più convenienti di novembre 2026 su Segugio.it
  - Informazioni Utili su gas e luce
  - Quale gestore è più conveniente per luce e gas?
  - Perché scegliere le offerte dual fuel per luce e gas?
  - Come risparmiare sulla bolletta?
  - Tutte le domande frequenti su Luce e Gas
  - News e approfondimenti
  - Ti potrebbe interessare anche
H3 (33):
  - I nostri partner luce e gas
  - Come confrontare le offerte gas e luce?
  - Come scegliere la tariffa gas e luce?
  - Come richiedere il bonus luce e gas?
  - Come risparmiare sulle bollette luce e gas?
  - Quale compagnia scegliere per luce e gas?
  - Perché aumentano le bollette luce e gas?
  - Quanto tempo ci vuole per attivare la fornitura luce e gas?
  - Cosa sono le offerte dual fuel?
  - I vantaggi di Segugio.it
  - Costo di un kWh di energia elettrica oggi, November 2026
  - Costo di un Smc di gas metano a November 2026
  - Servizio Elettrico Nazionale ed Enel Energia: qual è la differenza?
  - Quanto costa un condizionatore in bolletta?
  - Come calcolare il consumo degli elettrodomestici: formula, esempi e costi in bolletta
  - Quali sono i costi per attivare la fornitura elettrica?
  - Voltura e subentro: come si fa, quali sono i costi e quanto tempo ci vuole?
  - Cos’è il gas naturale: definizione, composizione e utilizzi
  - Decreto bollette, i conti non tornano: slitta ancora il tetto al prezzo del gas
  - Le migliori offerte luce a prezzo fisso di novembre 2026
  - Gas, ARERA interviene sul mercato all'ingrosso: cosa prevede il nuovo servizio di liquidità
  - Le migliori tariffe luce da 3 kW di novembre 2026
  - Nuovo decreto bollette slittato: ecco a quando e perché
  - Bollette luce e gas, ottobre 2026: tre novità che possono cambiare quanto paghi
  - Impenna la domanda di energia: +6,5% a settembre, è il dato più alto dal 2014, cosa significa per i prezzi
  - Petrolio e gas sono le fonti più esposte alle crisi: perché riguarda anche le bollette
  - Migliori tariffe luce da 6 kW: le 3 proposte di fine ottobre 2026
  - Nuovo decreto bollette in arrivo per fissare il tetto del gas: sconti a partire dal 2027
  - Bolletta luce più cara dopo il rinnovo? ARERA avvia nuovi controlli
  - Bollette luce, ARERA indica la strada per ridurre il PUN: servono più rinnovabili
  - Qatar, stop al GNL fino a dicembre: perché Edison deve comprare gas altrove
  - Energia, l’UE mette i prezzi al centro del dibattito: perché le bollette restano un problema
  - Gas caro fino al 2027? Perché l’Europa teme un altro anno di prezzi alti
JSONLD blocks 4 unparsable 0 | types: {'VideoObject': 1, 'Clip': 7, 'WebSite': 1, 'BreadcrumbList': 1, 'ListItem': 2, 'Product': 1, 'AggregateRating': 1, 'Brand': 1, 'AggregateOffer': 1, 'Offer': 5}
FAQPage questions in schema: 0 | sameAs: [] | dates: [] | ratings: [{'@type': 'AggregateRating', 'ratingValue': '4.8', 'reviewCount': '4230'}, {'@type': 'AggregateRating', 'ratingValue': '4.8', 'reviewCount': '4230'}]
LINKS internal unique: 108 external unique: 68
internal link path hubs: {'offert': 16, 'guide': 32, 'contatt': 1, 'glossari': 8, 'news': 2, 'fornitor': 1, 'chi-siamo': 1, 'comuni': 1}
KEYWORD counts: {'aggiornat': 1, 'arera': 11, 'trustpilot': 0, 'recension': 2, 'stelle': 0, 'redazione': 2, 'faq': 0, 'domande frequenti': 8, 'glossario': 6, 'come funziona': 3, 'metodolog': 0, 'partner': 13, 'scarica l': 0, 'app store': 0, 'google play': 0, 'utenti': 1, 'clienti': 9, 'risparmi': 16
Month-2026 mentions: [('novembre 2026', 5), ('ottobre 2026', 3), ('settembre 2026', 1)]
aggiornat… samples: []
priced items (€ amounts): 92 | tables: 3 rows: 18 | details: 0 | imgs: 124
QUESTIONS (h2/h3/text ending ?) in headings: 15
FIRST 100 WORDS (main): offerte luce e gas: ‎ ‎ confronta e risparmia, gratis! analisi bolletta gratuita scopri subito quanto puoi risparmiare carica una bolletta carica una bolletta ti conviene cambiare offerta? carica una bolletta e scopri il risparmio carica la bolletta carica una bolletta o 
```

## RAW: portale_home
```
FILE portale_home.html bytes 60794
TITLE: Portale Offerte | Trova le migliori tariffe e offerte di luce e gas
DESC: Portale Offerte, previsto dalla Legge Concorrenza del 2017, ti permette di confrontare le tariffe e le offerte di luce e gas con semplicità ed immediatezza.
CANON: None | ROBOTS: None
H1: ['Portale Offerte luce e gas']
WORDS all-visible: 1658 | excluding nav/header/footer: 1556
PHRASE "comparatore luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore luce gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronta offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronto offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronta le offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
H2 (8):
  - Submenu
  - Un confronto semplice e affidabile tra le offerte luce e gas. Come vuole la legge.
  - Confronta le offerte
  - #facciamoluce
  - Accedi al Portale Offerte
  - Offerte PLACET
  - Scopri
  - Domande frequenti
H3 (28):
  - Mercato Libero
  - Servizi di Tutela
  - Ho bisogno di supporto, chi posso contattare?
  - Da cosa è composto il Prezzo finale nella bolletta gas?
  - Da cosa è composta la spesa finale del cliente riportata nel Portale Offerte?
  - Cosa si intende per Attivazione?
  - Cosa si intende per Allacciamento?
  - Quanto costa cambiare venditore di energia elettrica?
  - Cosa devo fare per cambiare venditore di elettricità o gas?
  - Cosa sono il POD e il PDR?
  - Come posso ricercare un’Offerta di energia pulita?
  - Cosa sono le Offerte Dual Fuel?
  - Cosa sono le Offerte senza il calcolo della spesa?
  - Che si intende per Sconto? Che differenza c’è tra “Sconto sul Prezzo di Tutela”, “Sconto Una tantum” e “Sconto qualsiasi
  - Quali offerte sono presenti sul Portale Offerte?
  - Ho bisogno di supporto, chi posso contattare?
  - Da cosa è composto il Prezzo finale nella bolletta gas?
  - Da cosa è composta la spesa finale del cliente riportata nel Portale Offerte?
  - Cosa si intende per Attivazione?
  - Cosa si intende per Allacciamento?
  - Quanto costa cambiare venditore di energia elettrica?
  - Cosa devo fare per cambiare venditore di elettricità o gas?
  - Cosa sono il POD e il PDR?
  - Come posso ricercare un’Offerta di energia pulita?
  - Cosa sono le Offerte Dual Fuel?
  - Cosa sono le Offerte senza il calcolo della spesa?
  - Che si intende per Sconto? Che differenza c’è tra “Sconto sul Prezzo di Tutela”, “Sconto Una tantum” e “Sconto qualsiasi
  - Quali offerte sono presenti sul Portale Offerte?
JSONLD blocks 0 unparsable 0 | types: {}
FAQPage questions in schema: 0 | sameAs: [] | dates: [] | ratings: []
LINKS internal unique: 36 external unique: 4
internal link path hubs: {'fornitor': 1, 'offert': 36, 'contatt': 1, 'chi-siamo': 1}
KEYWORD counts: {'aggiornat': 0, 'arera': 2, 'trustpilot': 0, 'recension': 0, 'stelle': 0, 'redazione': 0, 'faq': 0, 'domande frequenti': 3, 'glossario': 0, 'come funziona': 0, 'metodolog': 0, 'partner': 0, 'scarica l': 0, 'app store': 0, 'google play': 0, 'utenti': 0, 'clienti': 4, 'risparmi': 0, '
Month-2026 mentions: []
aggiornat… samples: []
priced items (€ amounts): 0 | tables: 0 rows: 0 | details: 0 | imgs: 17
QUESTIONS (h2/h3/text ending ?) in headings: 26
FIRST 100 WORDS (main): un confronto semplice e affidabile tra le offerte luce e gas. come vuole la legge. il portale offerte, previsto dalla legge concorrenza del 2017, mette a disposizione le offerte di energia elettrica e gas per confrontarle con semplicità e immediatezza. per saperne di più co
```

## RAW: lucegas_home
```
FILE lucegas_home.html bytes 427059
TITLE: Offerte Luce e Gas: confronta e risparmia in bolletta | Luce-Gas.it
DESC: Confronta gratis le offerte luce e gas dei migliori fornitori, gestisci il trasloco e fatti analizzare la bolletta. Luce-Gas.it, il comparatore indipendente.
CANON: https://luce-gas.it | ROBOTS: index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1
H1: ['Quale offerta luce e gas conviene oggi?']
WORDS all-visible: 1877 | excluding nav/header/footer: 1004
PHRASE "comparatore luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore luce gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronta offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronto offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=1
PHRASE "confronta le offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore": title=False desc=True h1=0 h2/h3=0 first100=False count_body=1
H2 (8):
  - Perché scegliere Selectra
  - Confrontiamo i principali fornitori di luce e gas
  - Non ci conosci ancora? Ascolta chi ci ha già scelto
  - Confronta ora le migliori tariffe energia
  - Esplora Luce-Gas.it
  - La missione di Selectra? Bollette senza stress
  - Le ultime notizie sull'energia
  - Resta aggiornato sulle offerte e le novità del mercato
H3 (14):
  - Gratuito
  - Servizio personalizzato
  - Affidabile
  - Veloce
  - Numeri di servizio clienti
  - Offerte
  - Trasloco
  - Guide
  - Parliamo di
  - Servizi utili
  - Contatti
  - Selectra
  - Eni Energy Store
  - Un consulente di Selectra ti richiama gratis
JSONLD blocks 2 unparsable 0 | types: {'Organization': 2, 'ContactPoint': 1, 'OpeningHoursSpecification': 1, 'PostalAddress': 1, 'WebSite': 1}
FAQPage questions in schema: 0 | sameAs: ['https://www.facebook.com/selectra.it', 'https://www.instagram.com/selectra_it/', 'https://www.linkedin.com/company/selectra', 'https://www.youtube.com/@Selectranet', 'https://x.com/selectra_net'] | dates: [] | ratings: []
LINKS internal unique: 147 external unique: 19
internal link path hubs: {'fornitor': 54, 'guida': 31, 'recension': 7, 'offert': 18, 'news': 1, 'chi-siamo': 1, 'glossari': 1, 'contatt': 1}
KEYWORD counts: {'aggiornat': 1, 'arera': 1, 'trustpilot': 0, 'recension': 18, 'stelle': 2, 'redazione': 1, 'faq': 0, 'domande frequenti': 0, 'glossario': 1, 'come funziona': 1, 'metodolog': 0, 'partner': 0, 'scarica l': 0, 'app store': 0, 'google play': 0, 'utenti': 0, 'clienti': 7, 'risparmi': 0, 
Month-2026 mentions: []
aggiornat… samples: ['aggiornato sulle offerte e le novità del mercato iscriviti a']
priced items (€ amounts): 0 | tables: 0 rows: 0 | details: 0 | imgs: 21
QUESTIONS (h2/h3/text ending ?) in headings: 0
FIRST 100 WORDS (main): vai al contenuto principale quale offerta luce e gas conviene oggi? ci pensa selectra! siamo esperti nella comparazione delle tariffe energia dal 2015 . più richiesto cambia o confronta vuoi trovare l'offerta più conveniente? confronta gratis le tariffe di tutti i fornitori
```

## RAW: lucegas_conf
```
FILE lucegas_conf.html bytes 903497
TITLE: Comparatore offerte luce e gas - Luce-gas.it
DESC: Confronta le migliori offerte luce e gas in base ai tuoi consumi reali. Strumento gratuito e imparziale aggiornato novembre 2026.
CANON: https://luce-gas.it/confronto | ROBOTS: index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1
H1: ['Comparatore luce e gas Selectra']
WORDS all-visible: 3453 | excluding nav/header/footer: 2539
PHRASE "comparatore luce e gas": title=False desc=False h1=1 h2/h3=0 first100=True count_body=1
PHRASE "comparatore luce gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore offerte luce e gas": title=True desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronta offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronto offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=1
PHRASE "confronta le offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore": title=True desc=False h1=1 h2/h3=1 first100=True count_body=5
H2 (21):
  - Scopri subito quanto puoi risparmiare.
  - Cosa vuoi confrontare?
  - Come vuoi procedere?
  - Cosa vuoi confrontare?
  - Ogni quanto ricevi la bolletta?
  - La tua spesa
  - Hai la residenza?
  - Dove ti trovi?
  - La tua abitazione
  - Chi è il tuo fornitore attuale?
  - 
  - Cosa è più importante per te?
  - 
  - 
  - Le migliori scelte per il tuo profilo
  - offerte adatte al tuo profilo
  - Selectra confronta i migliori fornitori luce e gas in Italia
  - I clienti soddisfatti di Selectra
  - Come funziona il comparatore?
  - Domande frequenti sul confronto delle tariffe di energia
  - Confronto offerte Enel, Eni, Sorgenia, Iren e Acea
H3 (17):
  - 
  - 
  - Come confrontare i prezzi luce e gas?
  - Avere un unico fornitore conviene?
  - Da cosa dipende la convenienza di un'offerta luce o gas?
  - Che cos'è il Portale offerte di ARERA?
  - Come cambiare fornitore?
  - Come richiedere il bonus luce e gas?
  - Offerte
  - Trasloco
  - Guide
  - Parliamo di
  - Servizi utili
  - Contatti
  - Selectra
  - Eni Energy Store
  - Un consulente di Selectra ti richiama gratis
JSONLD blocks 1 unparsable 0 | types: {'BreadcrumbList': 1, 'ListItem': 2}
FAQPage questions in schema: 0 | sameAs: [] | dates: [] | ratings: []
LINKS internal unique: 161 external unique: 22
internal link path hubs: {'guida': 32, 'glossari': 1, 'fornitor': 54, 'offert': 16, 'recension': 7, 'chi-siamo': 1, 'contatt': 1}
KEYWORD counts: {'aggiornat': 1, 'arera': 2, 'trustpilot': 1, 'recension': 20, 'stelle': 2, 'redazione': 1, 'faq': 0, 'domande frequenti': 1, 'glossario': 1, 'come funziona': 1, 'metodolog': 2, 'partner': 0, 'scarica l': 0, 'app store': 0, 'google play': 0, 'utenti': 0, 'clienti': 12, 'risparmi': 6,
Month-2026 mentions: []
aggiornat… samples: ['aggiornata in tempo reale ↻ indietro continua cosa è più imp']
priced items (€ amounts): 8 | tables: 2 rows: 40 | details: 0 | imgs: 30
QUESTIONS (h2/h3/text ending ?) in headings: 15
FIRST 100 WORDS (main): vai al contenuto principale comparatore luce e gas selectra i nostri clienti sono soddisfatti ★★★★★ su 5 scopri subito quanto puoi risparmiare . confrontiamo le offerte e calcoliamo il massimo risparmio rispetto alla tua bolletta. risparmio stimato 1.180 €/anno fi
```

## RAW: clicca_home
```
FILE clicca_home.html bytes 285964
TITLE: Miglior Comparatore Offerte Luce e Gas | Clicca e ComparaClicca e Compara: Il Miglior Comparatore Bollette Luce e Gas 2026clicca e compara headerClicca e Compara - Menu
DESC: Scopri il miglior comparatore bollette del 2026. Clicca e compara gratis le offerte luce e gas, confronta le tariffe e taglia i costi in bolletta in 1 minuto.
CANON: https://www.cliccaecompara.it/ | ROBOTS: index, follow
H1: ["Confronta con l'IA e Risparmia sulle Tue Bollette!", 'FAMILY LUCE ML', 'Octopus Flex', 'Fastweb Casa', 'E.ON Luce Insieme', 'Enel Fix Business Luce']
WORDS all-visible: 2465 | excluding nav/header/footer: 2057
PHRASE "comparatore luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore luce gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore offerte luce e gas": title=True desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronta offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronto offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronta le offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore": title=True desc=True h1=0 h2/h3=0 first100=False count_body=0
H2 (17):
  - Offerte Luce e Gas in Evidenza
  - Sky TV + Sport
  - Sky TV & Netflix
  - Sky Wifi + Sky TV (Aree Open Fiber)
  - Sky Wifi + Sky TV + Cinema (Nazionale)
  - Sky TV & Netflix + Cinema
  - Sky Wifi + Sky TV (Rete Nazionale)
  - L'Area Clienti a portata di tap.
  - Italy Red
  - Kena 5.99 €/mese
  - Fastweb Mobile Pro5G
  - 150 Giga in 5G
  - 150 Giga 6,95€
  - Dove Trovarci
  - Hai bisogno di aiuto immediato?
  - Prima di continuare
  - Ecco come funziona!
H3 (20):
  - Monitoraggio Utenze
  - Assistenza Prioritaria
  - LA TUADASHBOARD
  - Dettaglio Pratica
  - CENTROASSISTENZA
  - Le Migliori Offerte del Giorno
  - Confronta le Tariffe nel Dettaglio
  - Ultime dal Magazine
  - Unisciti alla Community!
  - Call Center
  - Menu Principale
  - Confronta & Risparmia
  - Risorse e Legale
  - Area Personale
  - Necessari
  - Misurazione
  - Marketing
  - 1. Confronta Gratis
  - 2. Prezzo Bloccato
  - 3. Attiva Online
JSONLD blocks 2 unparsable 0 | types: {'WebPage': 1, 'Organization': 2, 'ImageObject': 2, 'FAQPage': 1, 'Question': 2, 'Answer': 2, 'WebSite': 1, 'SearchAction': 1}
FAQPage questions in schema: 2 | sameAs: ['https://www.facebook.com/cliccaecompara'] | dates: [] | ratings: []
LINKS internal unique: 87 external unique: 18
internal link path hubs: {'contatt': 1, 'faq': 1, 'offert': 10, 'guida': 4, 'news': 2}
KEYWORD counts: {'aggiornat': 2, 'arera': 0, 'trustpilot': 0, 'recension': 0, 'stelle': 2, 'redazione': 0, 'faq': 2, 'domande frequenti': 0, 'glossario': 0, 'come funziona': 3, 'metodolog': 0, 'partner': 3, 'scarica l': 1, 'app store': 0, 'google play': 0, 'utenti': 0, 'clienti': 3, 'risparmi': 11, 
Month-2026 mentions: []
aggiornat… samples: ["aggiornato il 31/03/2026 top 5 dell'ora italy red giga: 450 "]
priced items (€ amounts): 101 | tables: 3 rows: 21 | details: 0 | imgs: 133
QUESTIONS (h2/h3/text ending ?) in headings: 1
FIRST 100 WORDS (main): personaggio ruolo chat generata da ia • guida e sicurezza × 👋 ciao! posso aiutarti a confrontare le tariffe ? chatta con noi! confronta con l'ia e risparmia sulle tue bollette! trova con l'intelligenza artificiale in pochi step le migliori offerte di energia, gas e inte
```

## RAW: clicca_conf
```
FILE clicca_conf.html bytes 230193
TITLE: Compara Bollette Luce e Gas 2026: Confronta e Risparmia Gratisclicca e compara headerClicca e Compara - Menu
DESC: Usa il miglior comparatore bollette del 2026. Confronta gratis le offerte luce e gas per casa o azienda. Clicca, compara e taglia i costi in 1 minuto!
CANON: https://www.cliccaecompara.it/comparatore/confronta_offerte_energiagas.php | ROBOTS: index, follow
H1: []
WORDS all-visible: 1362 | excluding nav/header/footer: 953
PHRASE "comparatore luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore luce gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronta offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronto offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "confronta le offerte luce e gas": title=False desc=False h1=0 h2/h3=0 first100=False count_body=0
PHRASE "comparatore": title=False desc=True h1=0 h2/h3=0 first100=False count_body=0
H2 (2):
  - Consensi e Privacy
  - Prima di continuare
H3 (11):
  - Analisi Bolletta Automatica
  - Menu Principale
  - Confronta & Risparmia
  - Risorse e Legale
  - Area Personale
  - Necessari
  - Misurazione
  - Marketing
  - Info Potenza Contatore
  - Info Consumi Annuì
  - Info Status Residenza
JSONLD blocks 1 unparsable 0 | types: {'Service': 1, 'Organization': 1, 'Country': 1, 'Audience': 3, 'Person': 1, 'Offer': 1}
FAQPage questions in schema: 0 | sameAs: [] | dates: [] | ratings: []
LINKS internal unique: 60 external unique: 7
internal link path hubs: {'offert': 10, 'faq': 1, 'guida': 4, 'contatt': 1, 'news': 1}
KEYWORD counts: {'aggiornat': 0, 'arera': 0, 'trustpilot': 0, 'recension': 0, 'stelle': 0, 'redazione': 0, 'faq': 2, 'domande frequenti': 0, 'glossario': 0, 'come funziona': 1, 'metodolog': 0, 'partner': 3, 'scarica l': 0, 'app store': 0, 'google play': 0, 'utenti': 0, 'clienti': 0, 'risparmi': 8, '
Month-2026 mentions: []
aggiornat… samples: []
priced items (€ amounts): 2 | tables: 0 rows: 0 | details: 0 | imgs: 89
QUESTIONS (h2/h3/text ending ?) in headings: 0
FIRST 100 WORDS (main): personaggio ruolo chat generata da ia • guida e sicurezza × 👋 ciao! posso aiutarti a confrontare le tariffe ? chatta con noi! ciao, sono suri , il tuo consulente info ai scanner analisi bolletta automatica zero moduli da compilare. carica il tuo pdf e l'intelligenza art
```
