# B - SERP / index snapshot, 2026-11-10

Snapshot window: 2026-11-10, about 10:23-10:35 CET, one machine (built-in browser pane, Italian locale, google.it `hl=it&gl=it&pws=0`), one run. Positions move daily and between loads (see "volatility"). Nothing was changed, no login, no form; only search queries typed in URLs. Google consent screen: "Rifiuta tutto" clicked once.

**BLOCKED: Google served the "unusual traffic" page (`google.com/sorry`, HTTP 429) after about 55 page loads.** Per the rules I stopped using Google at that point and did not retry or bypass. Google queries NOT done: `versuscomparatorelucegas`, `versuscomparatorelucegas.it`, `versus` (the three that hit the block), page 2 of the brand queries (`versus comparatore luce e gas`, `versus comparatore luce gas`, `versus luce gas`, `versus energia`, `versus comparatore energia`), all of section 5 (informational queries) and section 6 on Google (third-party mentions; done on Bing/Brave/DDG instead, see below). DuckDuckGo's main UI (`duckduckgo.com/?q=`) answered "Unexpected error" (418 page); I used its plain-HTML endpoint `html.duckduckgo.com/html/` instead (no CAPTCHA shown). Bing and Brave: no block.

Extraction note: Google result links are encrypted `/goto?url=` redirects, so the "visible URL" below is the breadcrumb Google prints (truncated with `...`, and for some results schema breadcrumbs rather than the real path). For the small comparators I resolved the real landing URL by following the result link (marked **[resolved]**).

---

## 1. Index probe (`site:`)

### Google: `site:versuscomparatorelucegas.it` -> 7 results (baseline 2026-11-09: 5)
Home + 6 guides. Missing: `/guida/come-funziona-comparatore-luce-gas` (the seventh guide).

| # | Title shown | Visible URL | Snippet (start) |
|---|---|---|---|
| 1 | **Comparatore luce e gas: confronta le offerte gratis \| VERSUS** (NEW title, old one is gone) | https://versuscomparatorelucegas.it | "Comparatore luce e gas gratuito per casa e partita IVA: rispondi a poche domande, confronta le offerte e attiva online quella che scegli." (no date prefix; this is the new meta description) |
| 2 | Voltura luce e gas: cos'è, documenti e tempi \| VERSUS | .../guida/voltura-luc... | "5 giorni fa — La voltura è il cambio di intestatario di un contratto già attivo..." |
| 3 | Subentro luce e gas: quando serve e come si fa \| VERSUS | .../guida/subentro-lu... | "5 giorni fa — Il subentro è l'attivazione di una fornitura da parte di un nuovo cliente..." |
| 4 | Cambio fornitore luce e gas: come funziona \| VERSUS | .../guida/cambio-for... | "5 giorni fa — Per cambiare fornitore di luce o gas firmi un nuovo contratto..." |
| 5 | Fine della tutela e mercato libero: cosa cambia \| VERSUS | .../guida/fine-tutela-... | "3 giorni fa — Fine della maggior tutela e del Servizio a Tutele Graduali per luce e gas: date, clienti vulnerabili e cosa fare prima del 1 aprile 2027." |
| 6 | Primo allaccio luce e gas: cos'è e come funziona \| VERSUS | .../guida/primo-allac... | "5 giorni fa — Con primo allaccio si intende, di solito, una fornitura nuova..." |
| 7 | Come scegliere un'offerta luce e gas: guida \| VERSUS | .../guida/come-scegli... | "3 giorni fa — Come scegliere un'offerta luce e gas: dati da avere, prezzo fisso o variabile, PLACET, Scheda sintetica..." |

Google also showed the "Prova la Google Search Console" promo box (it recognises the domain). (This first query ran before the consent screen appeared; it was not repeated.)

### Google: `site:versuscomparatorelucegas.it/guida/come-funziona-comparatore-luce-gas` -> **0 results** ("non ha prodotto risultati in nessun documento"). The new guide is not indexed yet.

### Bing: `site:versuscomparatorelucegas.it` -> 0 of ours (baseline 0)
Bing returns unrelated results (github.com, wikipedia, aranzulla.it, "Circa 241.000 risultati"): the site: operator found nothing for our domain.

### DuckDuckGo (html endpoint, kl=it-it): `site:versuscomparatorelucegas.it` -> "No results found" (baseline 0)
### Brave (country=it): `site:versuscomparatorelucegas.it` -> "Troppo poche corrispondenze trovate" = 0 (baseline 0)

---

## 2. Google `comparatore luce e gas` (pages 1-10, all read; we are **absent from all 10 pages, about 95-100 results**)

Page 1 (start=0): AI Overview present; 2 sponsored blocks; 9 organic items (no 10th item rendered). Lists below are as rendered on the load used for extraction.

### Positions 1-30 (organic order as shown; position = order of results)
| Pos | Domain | Title | Visible URL |
|---|---|---|---|
| 1 | ilportaleofferte.it | Confronto tariffe luce e gas | https://www.ilportaleofferte.it › confronta_offerte |
| 2 | arera.it | Il Portale Offerte | https://www.arera.it › consumatori › il-portale-offerte |
| 3 | tariffe.segugio.it | Offerte Luce e Gas: confronta le tariffe dual fuel \| Segugio.it | https://tariffe.segugio.it › tariffe (real: /luce-gas/ per Brave) |
| 4 | altroconsumo.it | Confronta le migliori offerte luce e gas | https://www.altroconsumo.it › calcola-risparmia › bollet... |
| 5 | billoo.it | Billoo \| Controlla la tua Bolletta e le migliori offerte luce e gas | https://www.billoo.it |
| 6 | facile.it | Offerte Luce e Gas: tariffe dual a prezzo fisso o variabile \| Facile.it | https://www.facile.it › energia-luce-gas |
| 7 | vivienergia.it | Comparatori Luce e Gas: Chi Sono e Come Funzionano \| VIVI energia | **[resolved]** https://www.vivienergia.it/casa/vivipedia/consigli-di-risparmio/comparatori-luce-e-gas |
| 8 | arera.it | Come posso confrontare le offerte disponibili? | https://www.arera.it › gas › le-offerte-commerciali › co... |
| 9 | supermoney.it | Offerte Luce e Gas: confronta le migliori tariffe \| Supermoney.it | **[resolved]** https://www.supermoney.it/energia-luce-gas/elettricita-e-gas/ (breadcrumb showed `/elettricita-e-gas`) |
| 10 | confrontatariffe.it | ConfrontaTariffe: scopri le migliori offerte luce e gas | **[resolved]** https://www.confrontatariffe.it/ |
| 11 | tariffe.segugio.it | Confronto tariffe: trova le offerte più convenienti \| Segugio.it | https://tariffe.segugio.it |
| 12 | vivienergia.it | Confronto Tariffe Luce con Portale Offerte ARERA \| VIVI energia | **[resolved]** https://www.vivienergia.it/casa/vivipedia/consigli-di-risparmio/confronto-tariffe-luce-comparatore-arera |
| 13 | luce-gas.it | Comparatore luce e gas Selectra \| Luce-Gas.it | **[resolved]** https://luce-gas.it/confronto |
| 14 | youtube.com | Come confrontare le offerte di luce e gas? #ARERA #shorts (ARERA) | video, 952K views |
| 15 | prontobolletta.it | Qual è la Migliore Offerta Luce e Gas del mese? \| ProntoBolletta | **[resolved]** https://www.prontobolletta.it/confronta-offerte-luce-gas/ |
| 16 | facile.it | Migliore offerta luce di oggi 09/11/2026 | https://www.facile.it › Luce e Gas › In evidenza |
| 17 | tariffe.ilsole24ore.com | Offerte luce e gas: le migliori tariffe dual fuel a novembre ... \| Il Sole 24 ORE | https://tariffe.ilsole24ore.com › energia-elettrica-gas |
| 18 | puntienergia.com | Offerte Luce e Gas: confronto tariffe e la più conveniente | **[resolved]** https://puntienergia.com/offerte |
| 19 | cliccaecompara.it | Clicca e Compara: Miglior Comparatore Offerte Luce e Gas | **[resolved]** https://cliccaecompara.it/ |
| 20 | irenlucegas.it | Offerte luce e gas casa a prezzo fisso o variabile \| Iren Luce e Gas | https://www.irenlucegas.it › casa |
| 21 | selectra.net | Confronto Offerte Luce e Gas: La Guida Completa su come fare | **[resolved]** https://selectra.net/energia/guida/confronto |
| 22 | abbassalebollette.it | Offerte Luce e Gas: le migliori Tariffe per la Casa a Confronto | **[resolved]** https://www.abbassalebollette.it/offerte-luce-gas/ |
| 23 | youtube.com | Ti spiego come trovare le TARIFFE più CONVENIENTI per le ... (Frank) | https://www.youtube.com/watch?v=vK9ms6o438o **[resolved]** |
| 24 | enel.it | Offerte Luce e Gas per la tua casa \| Enel Energia | **[resolved]** https://www.enel.it/it-it/offerte-luce-gas?category_uid=NDkz |
| 25 | sostariffe.it | Offerte Luce e Gas casa: le 10 migliori del 7 novembre 2026 \| SOStariffe | **[resolved]** https://www.sostariffe.it/energia-elettrica-gas/ (site answered 403 to the browser) |
| 26 | deentra.io | Comparatori Luce e Gas: Confronto Tariffe e Offerte Oggi \| Deentra | **[resolved]** https://www.deentra.io/blog-fotovoltaico/comparatori-luce-e-gas |
| 27 | comparasemplice.it | Confronto Offerte Luce e Gas 2026: tariffe mercato libero \| ComparaSemplice | **[resolved]** https://www.comparasemplice.it/adv/promo-energia |
| 28 | confrontatariffe.it | ConfrontaTariffe: scopri le migliori offerte luce e gas | https://www.confrontatariffe.it |
| 29 | engie.it | Offerte luce e gas: tariffe energia elettrica e fornitura gas \| ENGIE Italia | **[resolved]** https://www.engie.it/casa/offerte-luce-gas/ |
| 30 | a2a.it | Le migliori offerte luce e gas a mercato libero \| A2A | https://www.a2a.it › casa › offerte-luce-gas |

### Positions 31-100 (domains only, in order)
Page 4 (start=30): pulsee.it, tariffe.segugio.it, luce-gas.it (home), switcho.it (/risorse/luce-gas), comparafacile.com (/luce-e-gas), YouTube (Risparmio Intelligente), vuskoo.com (/energia, "Comparatore Luce e Gas"), edisonenergia.it, papernest.it.
Page 5 (start=40): fastweb.it, facile.it, offertenergia.it ("I comparatori luce e gas online"), abbassalebollette.it (/offerte-luce), YouTube (ADOCTorino), selectra.net (/energia, "Comparatore Luce e Gas Selectra"), pleg.it, altroconsumo.it, aranzulla.it, billding.it (/confronto-bollette-luce-gas).
Page 6 (start=50): Facebook (Facile.it), octopusenergy.it, tariffe.ilsole24ore.com, simulatore.copernicoitalia.it, comparasemplice.it (Offerte Luce e Gas), tariffe.segugio.it (migliori tariffe), convengo.it (/luce-gas), vivienergia.it, lucegasinternet.it (/confronto-offerte-luce-...), tariffe.it.
Page 7 (start=60): luce-gas.it (Confronto), supermoney.it (/energia-luce-gas), sinergylucegas.com, tariffe.libero.it, prontobolletta.it (/comparatore, "Comparatori Luce e Gas"), puntienergia.com (/Offerte, "Comparatore Luce e Gas: confronta le offerte aggiornate"), Facebook (Eureka Luce e Gas), bolletta-energia.it (/comparazione), scontify.net (Blog, "BollettaMigliore.it: comparatore gratuito luce e gas").
Page 8 (start=70): confrontoenergia.it, selectra.net, sostariffe.it (News), video.corriere.it, fullo.it, leggioggi.it, offertasuper.it, tariffe.segugio.it, fanpage.it.
Page 9 (start=80): tariffe.segugio.it, YouTube (Ministero Ambiente), orarisparmio.it, spendibeneonline.it, tariffe-energia.it, smartworld.it, bollettecasa.it, switcho.it (/risorse/luce), today.it.
Page 10 (start=90): today.it, ilsole24ore.com, cliccaecompara.it (/comparatore/confront...), vivienergia.it, YouTube (Bonus e Pagamenti), arera.it (comunicato), comparafacile.com, altroconsumo.it, fullo.it.

**Our position: not in the first 10 pages (about 95-100 results).** Baseline: not in first 60. No change.

### Page-1 extras
- **AI Overview: PRESENT today** (baseline: none). Text recommends the ARERA Portale Offerte, Segugio.it, Altroconsumo, Facile.it. Sources cited (chips): Arera (+1), Segugio.it (several times), www.altroconsumo.it, Facile.it, YouTube (Ministero Ambiente e Sicurezza Energetica, +1), YouTube (Andrea Cintia, +1). VERSUS not cited.
- **Ads: 2 sponsored blocks, 6 ads.** Top block: switcho.it ("Comparatore luce e gas", "Ti Consigliamo di NON Cambiare"), Segugio.it, facile.it, pulsee.it. Bottom block: switcho.it, facile.it.
- **People Also Ask (4):** "Qual è il miglior comparatore di luce e gas?"; "Qual è la compagnia che fa pagare meno luce e gas?"; "Dove posso trovare un comparatore di bollette della luce?"; "Qual è il fornitore di luce e gas più conveniente nel 2026?" (baseline had 4 different/overlapping ones).
- **Related searches (8):** Comparatore luce e gas ministero; ... Altroconsumo; ... ARERA; ... senza registrazione; Miglior comparatore luce e gas; Portale offerte luce e gas; Miglior gestore luce e gas prezzo fisso; Comparatore luce e gas lavora con noi.
- "Trova prodotti e servizi correlati" ad box: Miglior fornitore luce e gas 2026, Migliore offerta luce e gas prezzo fisso, etc.

### Volatility (important)
Two loads of page 3 (start=20) minutes apart gave different orders and sets (first load: Iren, Selectra, Abbassalebollette, YouTube Frank, Enel, SOStariffe, Deentra, ComparaSemplice, ConfrontaTariffe, ENGIE; second load: a news item "Come orientarsi tra offerte e rincaro bollette", ENGIE, Abbassalebollette, Deentra, Selectra, SOStariffe, Enel, YouTube Frank, a Komparatore-type "Offerte Luce: confronta le tariffe", ComparaSemplice). The tables above follow the first load; resolved URLs come from the second. Treat positions beyond page 1 as +/- a page.

### Small / independent comparators seen on pages 1-3: exact ranking URL and title (Google)
| Domain | Title (as shown) | Exact URL | Where |
|---|---|---|---|
| billoo.it | Billoo \| Controlla la tua Bolletta e le migliori offerte luce e gas | https://www.billoo.it | p1 pos 5 |
| supermoney.it | Offerte Luce e Gas: confronta le migliori tariffe \| Supermoney.it | https://www.supermoney.it/energia-luce-gas/elettricita-e-gas/ | p1 pos 9 (also p7 /energia-luce-gas "confronta le tariffe di energia dei nostri ...") |
| confrontatariffe.it | ConfrontaTariffe: scopri le migliori offerte luce e gas | https://www.confrontatariffe.it/ | p2 pos 10, p3 |
| luce-gas.it | Comparatore luce e gas Selectra \| Luce-Gas.it | https://luce-gas.it/confronto | p2 pos 13 |
| prontobolletta.it | Qual è la Migliore Offerta Luce e Gas del mese? \| ProntoBolletta | https://www.prontobolletta.it/confronta-offerte-luce-gas/ | p2 pos 15 |
| puntienergia.com | Offerte Luce e Gas: confronto tariffe e la più conveniente | https://puntienergia.com/offerte | p2 pos 18 |
| cliccaecompara.it | Clicca e Compara: Miglior Comparatore Offerte Luce e Gas | https://cliccaecompara.it/ | p2 pos 19 |
| vivienergia.it | Comparatori Luce e Gas: Chi Sono e Come Funzionano \| VIVI energia | https://www.vivienergia.it/casa/vivipedia/consigli-di-risparmio/comparatori-luce-e-gas | p1 pos 7 |
| vivienergia.it | Confronto Tariffe Luce con Portale Offerte ARERA \| VIVI energia | https://www.vivienergia.it/casa/vivipedia/consigli-di-risparmio/confronto-tariffe-luce-comparatore-arera | p2 pos 12 |
| selectra.net | Confronto Offerte Luce e Gas: La Guida Completa su come fare | https://selectra.net/energia/guida/confronto | p3 |
| abbassalebollette.it | Offerte Luce e Gas: le migliori Tariffe per la Casa a Confronto | https://www.abbassalebollette.it/offerte-luce-gas/ | p3 |
| sostariffe.it | Offerte Luce e Gas casa: le 10 migliori del 7 novembre 2026 | https://www.sostariffe.it/energia-elettrica-gas/ | p3 |
| deentra.io | Comparatori Luce e Gas: Confronto Tariffe e Offerte Oggi | https://www.deentra.io/blog-fotovoltaico/comparatori-luce-e-gas | p3 |
| comparasemplice.it | Confronto Offerte Luce e Gas 2026: tariffe mercato libero | https://www.comparasemplice.it/adv/promo-energia | p3 |
| switcho.it | Comparatore luce e gas (ad); organic "Offerte Luce e Gas: Confronta le Migliori Tariffe per Te" | https://www.switcho.it (ad); https://www.switcho.it/risorse/luce-gas/ (organic, p4) | ad p1; organic p4 |
| komparatore.it | Offerte Luce: confronta le tariffe | https://www.komparatore.it/luce (seen on `versus comparatore energia` p1; on p3 of the main query in the second load) | |
| Not on pages 1-3 this time (p4-10): comparafacile.com (/luce-e-gas, p4), vuskoo.com (/energia, p4), pleg.it (p5), convengo.it (/luce-gas, p6), lucegasinternet.it (p6), confrontoenergia.it (p8), scontify.net (p7), fullo.it (p8, p10) | | |

Big names also on pages 1-3: ilportaleofferte.it, arera.it, tariffe.segugio.it, altroconsumo.it, facile.it, tariffe.ilsole24ore.com, irenlucegas.it, engie.it, enel.it, a2a.it.

---

## 3. Google variants (pages 1-2). **VERSUS is absent from all.**
Common top of page 1 for all variants: ilportaleofferte.it, arera.it, tariffe.segugio.it, altroconsumo.it, facile.it, then vivienergia.it / enel.it / billoo.it / luce-gas.it, supermoney.it, confrontatariffe.it.

| Query | AIO | Ads | Page 1 (domains in order) | Page 2 (domains in order) | Our pos. |
|---|---|---|---|---|---|
| `comparatore luce gas` | no | 2 blocks | ilportaleofferte, arera, segugio, altroconsumo, facile, billoo, vivienergia, luce-gas.it, arera | supermoney, segugio, prontobolletta, tariffe.libero.it, YouTube (MASE), vivienergia, selectra.net, luce-gas.it, puntienergia, ilsole24ore | not in 19 |
| `comparatore offerte luce e gas` | yes | 2 | ilportaleofferte, arera, segugio, altroconsumo, facile, enel.it, vivienergia, segugio, supermoney | arera, luce-gas.it, YouTube (Frank), irenlucegas, confrontatariffe, engie, pulsee, ilportaleofferte (portaleOfferte page), ilsole24ore, selectra.net | not in 19 |
| `comparatore tariffe luce e gas` | yes | 2 | ilportaleofferte, arera, segugio, altroconsumo, facile, enel.it, vivienergia, segugio, confrontatariffe | engie, prontobolletta, irenlucegas, luce-gas.it, arera, ilsole24ore, puntienergia, a2a, pulsee, supermoney | not in 19 |
| `confronto offerte luce e gas` | yes | 2 | ilportaleofferte, arera, segugio, altroconsumo, facile, vivienergia, enel.it, segugio, confrontatariffe | supermoney, confrontatariffe, prontobolletta, arera, vivienergia, selectra.net, a2a, facile, engie, ilsole24ore | not in 19 |
| `miglior comparatore luce e gas` | yes | 2 | altroconsumo, segugio, arera, ilportaleofferte, facile, luce-gas.it ("Quale fornitore luce e gas conviene"), ilsole24ore, bolletta-energia.it, abbassalebollette | vivienergia, altroconsumo (classifica fornitori 2026), segugio, prontobolletta, supermoney, luce-gas.it, selectra.net, YouTube (Bonus e Pagamenti), comparasemplice, facile | not in 19 |

Titles/URLs of the full top 10 for each variant are as in section 2 (same pages recur); per-variant full lists were captured in the browser but the repeated entries are not duplicated here.

---

## 4. Brand queries on Google (page 1 only; page 2 only where noted). **VERSUS is absent from every brand query that was read.**

### `versus comparatore` (pages 1 and 2 read; Google serves only 2 pages here, about 16 results)
Page 1:
1. **versus.com** - "Versus | Confronta di tutto" (https://versus.com › ...) **with 5 sitelinks** ("Confronto smartphone", "Categorie", "Confronto tablets", "Migliori smartphone del 2026", "Categories"; "Altri risultati in versus.com").
   (Between 1 and 2: a Google Shopping carousel "Siti comparativi" with *mechanical dial comparators* - Mitutoyo, MIRSTORE, Fervi, KS Tools etc. - because "comparatore" also means the measuring tool.)
2. Google Play - "Versus - App su Google Play"
3. versus.com - "Versus, the global comparison platform | About us" (https://versus.com › about-us)
4. hdblog.it - "Compara" (https://www.hdblog.it › compara)
5. global.techradar.com - "Versus" (https://global.techradar.com › it-it › versus)
6. YouTube - "Versus" channel (@versus_com, 585K followers)
Related searches: HDblog compara; Vs versus; Compara telefoni; Versus confronto smartphone; Versus telefoni; Miglior sito confronto smartphone; Versus significato; Confronta Samsung.
No knowledge panel (no right-hand panel). No AI Overview. No ads.
Page 2: kimovil.com (confronta-cellulari), aranzulla.it (confronto cellulari), TikTok (Arsenio Lupiani, "Confronta Prezzi e Risparmia con Versus.com"), Instagram (versus_comparisons, 61K followers), it.trustpilot.com (versus.com reviews), puntocellulare.it, tuttoandroid.net, phonesdata.com, kimovil.com, unsitoalgiorno.it (versus.com).
**Confirmed: the "Versus" brand space is versus.com (global product-comparison platform, app, YouTube, Instagram, TikTok, Trustpilot), plus phone-comparison sites. Sitelinks: only for versus.com. Knowledge panel: none.**

### Other brand phrases, page 1 read
| Query | OURS | Page 1 (9 items) |
|---|---|---|
| `versus comparatore luce e gas` | **absent** (page 2 not read, blocked) | 1 ilportaleofferte.it (Confronto tariffe luce e gas); 2 altroconsumo.it; 3 puntienergia.com (/offerte); 4 billoo.it; 5 vivienergia.it (Comparatori Luce e Gas); 6 papernest.it (Confronto tariffe luce e gas: le classifiche di Papernest); 7 prontobolletta.it (/confronta-offerte-luce-gas); 8 luce-gas.it (Quale fornitore luce e gas conviene); 9 arera.it (Come posso confrontare le offerte disponibili?) |
| `versus comparatore luce gas` | **absent** (1 ad) | 1 facile.it; 2 arera.it; 3 ilportaleofferte.it; 4 tariffe.segugio.it; 5 altroconsumo.it; 6 billoo.it; 7 vivienergia.it; 8 prontobolletta.it; 9 luce-gas.it |
| `versus luce gas` | **absent** (1 ad) | 1 facile.it; 2 tariffe.segugio.it; 3 ilportaleofferte.it; 4 altroconsumo.it; 5 switchlucegas.it (Switch Luce e Gas); 6 eon-energia.com (Prezzo fisso o indicizzato); 7 in-energy.it (Prezzo fisso o variabile); 8 vivienergia.it (/prodotti); 9 eniplenitude.com (Tariffa fissa o variabile) |
| `versus energia` | **absent** | 1-2 vsb.energy (VSB Energia Verde Italia, home + Società); 3 Facebook VSB Italia; 4 vsb.energy (Contatto); 5 vsenergy.com (Vector Sustainable Energy); 6 easy4green.it; 7 absolute-energy.it; 8 espazium.ch (Energia versus architettura?) |
| `versus comparatore energia` | **absent** (1 ad) | 1 tariffe.segugio.it (Offerte Luce Casa); 2 arera.it; 3 facile.it; 4 billoo.it; 5 ilportaleofferte.it; 6 vivienergia.it; 7 altroconsumo.it; 8 komparatore.it (/luce); 9 luce-gas.it |
| `versuscomparatorelucegas` | **NOT READ - Google 429** | - (baseline 2026-11-09: position 1) |
| `versuscomparatorelucegas.it` | **NOT READ - Google 429** | - |
| `versus` | **NOT READ - Google 429** | - |

---

## 5. Informational queries on Google
NOT READ - Google 429 (`come funziona un comparatore luce e gas`, `i comparatori luce e gas sono affidabili`, `comparatore luce e gas affidabile`, `differenza voltura subentro`, `cambio fornitore luce come funziona`, `fine tutela mercato libero`, `come scegliere offerta luce e gas`). Not substituted with other engines: Bing, Brave and DuckDuckGo hold 0 pages of ours, so our position there is trivially absent.

## 6. Third-party mentions
- Google: not run (429).
- Bing `"versuscomparatorelucegas.it" -site:versuscomparatorelucegas.it`: unrelated look-alike domains only (comparatorelucegas.it, comparatoreenergia.it, confrontolucegas.it, comparabolletteinunclick.it, comparatoregaseluce.it, rapidocomparatore.com, bolletta-energia.it, komparatore.it, luce-gas.it); nothing about us.
- DuckDuckGo (html endpoint), same query: "No results found".
- Brave, same query: 2 results, both on **github.com/giuppi28/versus-comparatore** (Pull Request #7 "Phase 17: SEO/GEO pack, 4 indexable guides, favicon" and Pull Request #6 "Dev"). These are our own repository pages, not independent mentions. **Flag: the GitHub repo pages (PR text includes the production domain) are indexed by Brave, so the repo looks publicly visible; CLAUDE.md says the repo is private. Worth checking.**
- Brave `"versus comparatore luce e gas" -site:...`: 20 generic comparator results (Segugio, VIVI, Tariffe 24 Ore, Luce-Gas.it, greenplanner.it, Altroconsumo ...), none about us.
- Real third-party mentions of VERSUS found: **0**.

---

## 7. Bing (setlang=it, cc=IT)
- `site:versuscomparatorelucegas.it`: 0 of ours (unrelated GitHub/Wikipedia results).
- `comparatore luce e gas` ("Circa 92.800 risultati"; we read page 1 and `first=11`, which returned only 6 more items; Bing showed about 16 items in total, so "top 20" was not reachable):
  1 comparatore.it (Comparatore); 2 idealo.it; 3 komparatore.it (Confronta Offerte Fibra, Mobile, Luce e Gas); 4 it.wikipedia.org (Comparatore); 5 altroconsumo.it/confronta-tariffe; 6 **versus.com/it**; 7 sniffaprezzi.it; 8 il-comparatore.com; 9 comparor.com/it; 10 comparatore.it/migliore_tariffa.php; then supermoney.it, confrontatariffe.it/confronta-tariffe, luce-gas.it, switcho.it/risorse/luce-gas, facile.it/energia-luce-gas, luce-gas.it/confronto. **Our position: absent.** (Bing's list differs a lot from the 2026-11-09 read: today it is dominated by generic "comparatore" tools.)
- `versus comparatore luce e gas`: selectra.net, bolletta-energia.it, luce-gas.it/confronto, luce-gas.it, confrontatariffe.it, altroconsumo.it, mercato-libero.it, confrontoenergia.it, comparatoreenergia.it. **Absent.**
- `versus comparatore`: versus.com/it, versus.com/en, Treccani (x2), versus.com (cpu, phone, graphics-card, de), unibo.it, corriere.it dictionary. **Absent.**
- `versuscomparatorelucegas.it`: look-alike domains (comparatorelucegas.it, comparatoreenergia.it, confrontolucegas.it, comparabolletteinunclick.it ...). **Absent**, same as baseline.
- Copilot/AI answer box: none appeared on any of these Bing pages (Italian locale, built-in browser, not signed in).

## 8. DuckDuckGo (html endpoint, kl=it-it) and Brave (country=it)
- `site:versuscomparatorelucegas.it`: DDG 0, Brave 0.
- `versus comparatore luce e gas`: DDG 12 results (facile.it, sorgenia.it, selectra.net, bolletta-energia.it, confrontatariffe.it, altroconsumo.it, luce-gas.it, cliccaecompara.it, luce-gas.it/confronto, bolletta-energia.it/comparazione, mercato-libero.it/comparazione, confrontoenergia.it). **Absent.**
  Brave 20 results (Segugio, VIVI energia, luce-gas.it/confronto, luce-gas.it/guida/mercato/comparatori-energia, greenplanner.it/2026/11/02/comparatori-online-luce-gas/, Altroconsumo, Tariffe 24 Ore, Facile.it, ConfrontoEnergia, Libero Tariffe, puntienergia.com/offerte/comparatore-luce-gas, Papernest, luce-gas.it/confronto/quale-fornitore-scegliere, SuperMoney, Segugio, Portale Offerte, Altroconsumo, bolletta-energia.it/comparazione, Segugio, Switcho). **Absent.**
- Brave real hrefs (useful exact URLs, but these are Brave rankings, not Google): puntienergia.com/offerte/comparatore-luce-gas, luce-gas.it/guida/mercato/comparatori-energia, luce-gas.it/confronto/quale-fornitore-scegliere, switcho.it/risorse/luce-gas/, supermoney.it/energia-luce-gas/elettricita-e-gas/, bolletta-energia.it/comparazione.

---

## Changes vs the 2026-11-09 baseline
| Item | 2026-11-09 | 2026-11-10 |
|---|---|---|
| Google indexed URLs (`site:`) | 5 (home + 4 guides), home with OLD title | **7** (home + 6 guides), home shows NEW title "Comparatore luce e gas: confronta le offerte gratis \| VERSUS"; only the 7th guide (come-funziona-comparatore-luce-gas) missing |
| Bing / Brave / DDG indexed | 0 / 0 / 0 | 0 / 0 / 0 (unchanged) |
| Google `comparatore luce e gas` | not in first 60 | not in first about 100 (10 pages) |
| AI Overview on `comparatore luce e gas` | none | **present** (cites ARERA, Segugio, Altroconsumo, Facile.it, YouTube); also on 4 of the 5 variants |
| Page-1 organic list | ilportaleofferte, arera, segugio, altroconsumo, billoo, facile, vivienergia, arera, supermoney | identical set and order |
| Brand `versus comparatore luce e gas` page 1 | absent | absent |
| Domain query `versuscomparatorelucegas` | position 1 | not re-measured (Google 429) |
| Third-party mentions | 0 | 0 (only own GitHub PR pages in Brave) |

One snapshot, one machine, one day, built-in browser, no Search Console data: do not read this as a trend.
