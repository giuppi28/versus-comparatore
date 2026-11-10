# D — Content and internal-linking analysis (read-only), 2026-11-10

Scope: nothing in the repo was changed. Sources read: `docs/geo/T19.2-keyword-map.md`, `T19.1-serp-study.md`, `fonti-guide.md`, `canonical-facts.md`, `panel-2026-11-09.md`, `bozze-brand.md`, `bozze-comparatore.md`, `docs/TASKS.md` Phases 19, 21, 22, `app/src/content/seo/guides.ts`, `app/src/components/page1/{faq,explainer}.ts`, `SeoPageTemplate.tsx`, `RelatedPages.tsx`, and the live HTML of the home and the 7 guides (GET only, saved in the scratchpad `live/`). I also re-read two ARERA/portal pages by `curl` (see section 4) to settle the "indipendente" question. Labels: **visible** = changes what a visitor sees, needs Giuseppe's OK; **invisible** = schema, metadata, sitemap, llms, off-site.

Honest framing first. None of the content candidates below moves the home for "comparatore luce e gas" directly. The panel of 2026-11-09 says the break is retrieval and authority (Bing/Brave/DDG 0 pages, Google not in the first 60, 0 third-party mentions), not content. More guides add topical breadth, long-tail entry points and link surfaces to the home; they do not replace T21.4 (profiles, Business Profile, listings) or the 2026-11-12 index probe. Read each ranking below as "cheap and safe", not as "will rank".

---

## 1. Coverage map

### 1a. The 7 guides as live today (slug, title, H1, size, related, dates, FAQ)

Words = rough count of `<main>` text in the live HTML (includes FAQ, sources list, breadcrumb, CTA, footer row), so real article body is about 10-15% lower.

| # | Slug (`/guida/...`) | `<title>` | H1 | ~Words | `related` (in source) | publishedOn / reviewedOn | FAQ |
|---|---|---|---|---|---|---|---|
| 1 | `cambio-fornitore-luce-gas` | Cambio fornitore luce e gas: come funziona \| VERSUS | Cambio fornitore di luce e gas: come funziona | 1,082 | voltura, subentro, **/offerte-luce-gas**, **/offerte-luce-gas-partita-iva** | 2026-11-05 / 2026-11-07 | 5 |
| 2 | `voltura-luce-gas` | Voltura luce e gas: cos'è, documenti e tempi \| VERSUS | Voltura di luce e gas: cos'è e come si fa | 1,021 | subentro, cambio-fornitore, primo-allaccio, **/offerte-luce-gas** | 2026-11-05 / 2026-11-07 | 5 |
| 3 | `subentro-luce-gas` | Subentro luce e gas: quando serve e come si fa \| VERSUS | Subentro di luce e gas: quando serve | 979 | voltura, primo-allaccio, cambio-fornitore, **/offerte-luce-gas** | 2026-11-05 / 2026-11-07 | 5 |
| 4 | `primo-allaccio-luce-gas` | Primo allaccio luce e gas: cos'è e come funziona \| VERSUS | Primo allaccio di luce e gas: allacciamento e attivazione | 1,001 | subentro, voltura, cambio-fornitore, **/offerte-luce-gas** | 2026-11-05 / 2026-11-07 | 5 |
| 5 | `come-scegliere-offerta-luce-gas` | Come scegliere un'offerta luce e gas: guida \| VERSUS | Come scegliere un'offerta luce e gas | 1,197 | fine-tutela, cambio-fornitore, voltura, subentro | 2026-11-07 / 2026-11-07 | 4 |
| 6 | `fine-tutela-mercato-libero` | Fine della tutela e mercato libero: cosa cambia \| VERSUS | Fine della tutela e passaggio al mercato libero | 1,115 | come-scegliere, cambio-fornitore, voltura, primo-allaccio | 2026-11-07 / 2026-11-07 | 5 |
| 7 | `come-funziona-comparatore-luce-gas` | Come funziona un comparatore luce e gas \| VERSUS | Come funziona un comparatore luce e gas | 1,337 | come-scegliere, fine-tutela, cambio-fornitore | 2026-11-10 / 2026-11-10 | 6 |

Home (live): `<title>` "Comparatore luce e gas: confronta le offerte gratis | VERSUS"; H1 "Comparatore / luce e gas" (two lines, second green); about 1,314 words in `<main>`; JSON-LD Organization, WebSite, Service, FAQPage (12 Q); `dateModified` 2026-11-07; sitemap `lastmod` 2026-11-07.

### 1b. Home FAQ (12 questions, `app/src/components/page1/faq.ts`)
1 Il confronto è gratuito? 2 Come viene stimato il mio consumo? 3 Cosa cambia tra cambio fornitore, subentro, voltura e primo allaccio? 4 Le stime comprendono l'IVA? 5 Come ordinate le offerte? 6 Confrontate tutte le offerte del mercato? 7 Come viene remunerato VERSUS? 8 Qual è l'offerta luce e gas più conveniente? 9 Meglio il prezzo fisso o il variabile? 10 Che cosa sono le offerte PLACET? 11 Cosa succede il 1 aprile 2027 se non scelgo? 12 Cos'è la Scheda sintetica?
Home explainer (`explainer.ts`): intro (first sentence "VERSUS è un comparatore luce e gas per la casa e per la partita IVA.") plus 6 blocks: Quali offerte confrontiamo; Come viene calcolata la stima; Prezzo fisso o variabile; Mercato libero e servizi di tutela; Le quattro situazioni più comuni; Cosa controllare prima di firmare.

### 1c. People Also Ask and query clusters vs. what answers them

| Query / PAA | Answered today by | Gap |
|---|---|---|
| "Qual è il miglior comparatore di luce e gas?" (panel 2026-11-09) | Guide 7 FAQ row 1 (neutral: no single best, Portale Offerte is the widest public tool, checklist). Not on the home | Home has no row. The PAA box is a *home-phrase* query, so the answer lives on a page that is not the commercial target |
| "Qual è un buon comparatore di energia elettrica?" | Guide 7 FAQ row 2 | Same; also "energia elettrica" wording appears nowhere else |
| "Dove posso trovare un comparatore del prezzo del gas?" | Guide 7 FAQ row 3 (Portale Offerte, Smc, VERSUS "gas") | Not on the home; gas-only wording ("prezzo del gas") is absent from the home |
| "Qual è la compagnia che fa pagare meno luce e gas?" | Closest: home FAQ 8 and guide 5 FAQ 1 ("Qual è l'offerta luce e gas più conveniente?", neutral) | The question word "compagnia / fa pagare meno" is not mirrored; neutral answer exists but under a different question text |
| T19.1 head-term PAA: "gestore più economico", "offerta più conveniente", "fornitore più conveniente nel 2026", "migliore offerta oggi" | Home FAQ 8, guide 5 FAQ 1 | "fornitore ... nel 2026" and "gestore" wordings not mirrored; nothing may claim a winner (savings is ⚠) |
| comparatore luce e gas, confronto tariffe (T19.2 §1) | Home (H1, title, description, explainer intro); guide 7 (informational side) | "confronto tariffe" wording does not appear on the home. Home has no ARERA/Portale mention above the FAQ |
| VERSUS comparatore luce e gas (brand) | Home, 6 guide intros, schema | See section 5 |
| offerte luce / gas single commodity | none (home secondary, P3 in T19.2) | by design |
| offerte luce e gas partita IVA | Home (selector), guide 6 section "Partita IVA e microimprese", guide 5 section "Casa o partita IVA" | No dedicated Q on the home |
| cambio fornitore (+ tempi, costi, ripensamento) | Guide 1 (5 FAQ; ripensamento FG 1.5/1.6/1.11) | none on content; "cambio fornitore 24 ore" blocked (FG 1.10) |
| voltura; differenza voltura subentro | Guides 2, 3 (section "Differenza tra voltura e subentro", FAQ "Qual è la differenza..."), home FAQ 3 | Only prose. No table |
| subentro (+ contatore spento, costo) | Guide 3 | Costs: ARERA 23 euro item UNVERIFIED (FG 2.9, 3.6), so no euro amount |
| allaccio / primo allaccio | Guide 4 | No euro amounts (FG facts-not-verified 5) |
| POD / PDR | One section + one FAQ in guide 1 ("Cambiano POD e PDR quando cambio venditore?"), definitions FG 5.27-5.28 | No page on "cos'è il POD", "dove trovo il POD/PDR" |
| PUN, PSV, Smc, kWh glossary | Scattered inside guide 5 and the home explainer | No glossary page |
| fine tutela, STG, 1 aprile 2027 | Guide 6, home FAQ 11 | Business scope after 1 April 2027 UNVERIFIED |
| Portale Offerte official / vs. private | Guide 7 (FAQ rows 4-6) | none |
| local (Catania/Sicilia) | none | no local facts; do not build (T19.2 F) |

Net: 3 of the 4 panel PAA questions are answered, but only on guide 7. The 4th ("compagnia che fa pagare meno") is answered neutrally under another wording. None of the four exists as a question on the home.

---

## 2. Candidates not built

T19.2 candidates that are already done: A (`come-scegliere`), B (`fine-tutela`), and the comparatore guide (T22.7). E `/chi-siamo` is refused by Giuseppe (no `/chi-siamo`, no names). F local pages: no local facts, do not build.

### Ranking (value for the "comparatore luce e gas" goal x readiness x risk)

| Rank | Candidate | Readiness | Class |
|---|---|---|---|
| 1 | Home FAQ rows, PAA-style (3 or 4 rows) | **Ready** (all facts canonical or already published copy) | visible |
| 2 | Glossary `/guida/glossario-luce-gas` (G), without kWh definition and without unit conversions | **Ready with caveats** | new indexable page, footer row = visible |
| 3 | Table "differenza voltura / subentro" in one existing guide | **Facts ready**, needs a template feature (table) | visible |
| 4 | Guide "Come leggere la bolletta della luce" (extra, not in T19.2 as a page; T19.2 A bundles it) | Ready for luce only (FG 5.19-5.20); gas bill FG 5.21 UNVERIFIED | new indexable page, footer row = visible |
| 5 | C `/guida/pod-pdr-dove-trovarli` | **Blocked**: the core question "dove lo trovo in bolletta" has no primary source. Fold into the glossary instead | n/a |
| 6 | D `/guida/luce-gas-partita-iva` | **Blocked**: FG 5.25, 5.30, 5.31, 5.32 and "not verified" 10 are UNVERIFIED; the verified part already lives in guides 5 and 6. Use a home FAQ row instead | n/a |

### Rank 1 — Home FAQ rows (PAA-style)
- Target queries: the four panel PAA questions, plus "comparatore luce e gas" informational variants. Home FAQPage JSON-LD grows with the list (12 -> 15/16).
- Facts: canonical-facts rows (free, market coverage wording, agent sentence, estimates excluding IVA, ordering, online activation); FG 5.9/6.1 (Portale Offerte exists, free, covers luce, gas, dual fuel; wording in section 4); FG 5.10, 5.11, 5.19 for "depends on consumption, price type and bill items". No new fact needed: the answers can reuse the guide 7 / home FAQ 8 copy that Giuseppe already approved.
- Proposed rows (Italian, for his approval; keep answers short so they do not duplicate guide 7 word-for-word):
  1. "Qual è il miglior comparatore di luce e gas?" — "Non c'è un comparatore adatto a tutti: cambiano venditori inclusi, ordine dei risultati e servizi dopo la scelta. Il Portale Offerte di ARERA è lo strumento pubblico, gratuito, con la copertura più ampia. VERSUS confronta le offerte dei venditori con cui collaboriamo, non tutte quelle disponibili sul mercato." (CF coverage sentence byte-identical; Portale Offerte per FG 6.1/5.9.)
  2. "Qual è la compagnia che fa pagare meno luce e gas?" — "Dipende dai tuoi consumi, dal tipo di prezzo (fisso o variabile) e dalle altre voci della bolletta, quindi non c'è una compagnia più economica per tutti. Su VERSUS inserisci i consumi e vedi una stima della spesa mensile, IVA esclusa, per le offerte dei venditori con cui collaboriamo." (same logic as live FAQ 8, no verdict, no savings.)
  3. "Dove posso trovare un comparatore del prezzo del gas?" — "Puoi usare il Portale Offerte di ARERA, che copre luce, gas e luce più gas, oppure un comparatore privato come VERSUS: scegli «gas» e inserisci il consumo annuo in Smc, che trovi in bolletta." (guide 7 copy, FG 6.1, 5.17.)
  4. (optional) "Le offerte per partita IVA sono diverse da quelle per la casa?" — facts: PLACET exists for small businesses (FG 5.10), ARERA distinguishes microimprese/small businesses by size and power, not by partita IVA alone (FG 5.29), VERSUS estimates are IVA esclusa for both (FG 5.26). Do not add rates (FG 5.25 UNVERIFIED) or ripensamento for businesses (FG 5.30 UNVERIFIED).
- Size: 40-70 words per row, about +200 words on the home.
- How it supports the home: the phrase "comparatore" lands on the commercial page itself, in a Q/A shape assistants quote. No anchor needed (same page).
- Risks: (a) duplicate Q/A between home and guide 7: keep home answers shorter and different. (b) Google restricted FAQ rich results to a narrow set of sites in 2023 (general knowledge, not from the repo), so the benefit is retrieval by assistants and long-tail, not a SERP feature. (c) Tests: `guides.test.ts` and `e2e/seo-pages.spec.ts` ban `migliore`, `chiam`, `club`, `call`, `+39` in guide text; the PAA wording "miglior" does not match the regex (guide 7 already uses it), but a builder must check the home FAQ test counts (12 -> n) in `seo.spec.ts`/`page1.spec.ts`.

### Rank 2 — G Glossary `/guida/glossario-luce-gas`
- Target queries: "cos'è il POD", "cos'è il PDR", "cos'è il PUN", "cos'è il PSV", "cos'è Smc", "cosa significa PLACET", "cos'è la Scheda sintetica", "glossario bolletta luce gas". Difficulty L-M in T19.2; ARERA's own glossary and suppliers rank first for single terms, so realistic value is long tail plus assistants.
- Verified entries available: POD (FG 5.27), PDR (5.28), PUN Index GME (5.12, 5.13; use "PUN Index GME", note 5.14 mixed wording), PSV (5.15), Smc/mc and coefficiente C (5.17, **no kWh/Smc conversion**), PLACET (5.10), Scheda sintetica (1.12 + 5.11), maggior tutela (5.1), STG (5.2, 5.3), tutela vulnerabilità gas (5.6, 5.7), microimpresa and piccola impresa (5.29), Portale Offerte (5.9, 6.1; wording in section 4), dual fuel (6.1).
- Missing or UNVERIFIED: a one-line definition of kWh and the reference conditions of Smc (FG 5.17), PUN "in force since 1 January 2025" as accomplished fact (5.13). So leave out the kWh/kW definitions and any conversion; the page may still use "consumo in kWh" as ARERA does. I re-read ARERA's POD glossary page today: it has the definition only, nothing on where the code sits in the bill, which confirms FG 5.27 and why POD alone cannot be a "dove trovarlo" page.
- Size: 12-14 entries x 50-70 words = 700-900 words, 4 FAQ rows (guide template needs 4-6). Slug `/guida/glossario-luce-gas`; title within 60 chars, e.g. "Glossario luce e gas: POD, PDR, PUN, PSV, Smc | VERSUS" (about 53).
- How it supports the home: intro's one brand sentence "VERSUS, comparatore luce e gas" (test requires it exactly once, intro at most 95 words), CTA button to `/` top and bottom (template), `related` to 3-4 guides, footer row label "Glossario". It cannot carry the phrase "comparatore luce e gas" in the title or H1 and should not (the home owns it).
- Risks: restates facts already in guides 1, 5, 6 (low cannibalisation because intent differs, but keep sentences different); thin dictionary-style page if entries are under 40 words; needs Giuseppe's OK (new indexable page plus a new footer label, which lengthens the 3-line footer row on mobile; guide 7 already made it 3 lines at 375 px).

### Rank 3 — Table "differenza voltura / subentro"
- Target query: "differenza voltura subentro" (T19.2 §2, difficulty M, "clear comparison table rare").
- Facts, all VERIFIED: voltura = same supply stays active, holder changes, same seller for gas (FG 2.1, 2.13); subentro = new activation after the previous contract ended and the meter was deactivated, equals a reactivation (3.1); who requests (2.3, 3.2, 3.3); documents: title to the property, self-declaration accepted (2.4, 3.4); timing luce voltura about 5 working days without seller change (2.6), gas about 4 (2.7), subentro seller to distributor within 2 working days then distributor 5 (luce) or 10 (gas) (3.2, 3.3); arrears of the previous holder (2.12, 3.7); cost luce in free market "depends on the individual contract" (2.8).
- Not usable: the 23 euro (FG 2.9, 3.6 UNVERIFIED), subentro after disconnection for arrears of another person (3.9), reactivation cost (3.10). Omit the "costo" row or write "dipende dal contratto e dal distributore" only.
- Size: 6 rows x 2 columns, about 120-150 words. Needs a new `table` field in `SeoSection` (`types.ts` has only `paragraphs` and `bullets`), accessible markup, 390 px layout (stack rows into cards), and the same table in `llms-full.ts` so crawlers see it. Put it in `/guida/voltura-luce-gas` (the section "Differenza tra voltura e subentro" already exists) and have the subentro guide link there; do not duplicate it on both.
- Home support: indirect (the two procedure guides already link the home via CTA). Visible, needs OK.
- Risk: low on facts; effort is the template; benefit limited to one query. Note guides 2 and 3 already answer the question in prose and FAQ.

### Rank 4 — "Come leggere la bolletta della luce" (extra)
- Queries: "voci in bolletta luce", "spesa per la materia energia", "oneri di sistema". Facts: FG 5.19, 5.20 VERIFIED; gas structure FG 5.21 UNVERIFIED so luce only; IVA 10% (5.23) not to be published. Competitors: ARERA, suppliers, comparators (hard). Size 900 words. Overlaps with guide 5 and the home explainer "Come viene calcolata la stima". Low priority; only if the owner wants more breadth.

### Rank 5 — C POD/PDR (blocked)
Only FG 5.27-5.28 exist (two definitions) and the existing guide 1 already covers them. The title promise "dove trovarli" cannot be answered (no primary page on where the codes print on the bill; FG says UNVERIFIED, my ARERA glossary re-read confirms nothing more). A 350-word page would be thin and would compete with guide 1. Unblock only with a primary source (ARERA bolletta 2.0 glossary was unreachable in the earlier session). Better: two entries in the glossary.

### Rank 6 — D partita IVA (blocked)
Verified: FG 5.5 (STG scope for businesses, lists to 31 March 2027), 5.10 (PLACET for small businesses), 5.29 (size definitions), 5.26. Missing: 5.25 IVA rates, 5.30 ripensamento for businesses, 5.31 Codice di condotta scope, 5.32 other protections, and the fate of businesses on 1 April 2027 (facts-not-verified item 10). The verified part is already in guide 6 ("Partita IVA e microimprese") and guide 5 ("Casa o partita IVA"). A new page would be a rewrite plus an unanswered tail. Ship the FAQ row (rank 1, row 4) and a fact-check pass for 5.25/5.30/5.32 first; then reconsider, aiming at "offerte luce e gas partita iva" only if the home cannot carry it.

Also blocked, unchanged: "cambio fornitore 24 ore" angle (FG 1.10 start date UNVERIFIED).

---

## 3. Internal linking

### 3a. Confirmed: the newest guide is not in any `related`
- Source: `grep` over `app/src/content/seo/guides.ts` finds the slug `/guida/come-funziona-comparatore-luce-gas` only in its own `path`; no `related:` array contains it (also true in the tests: only `guides.test.ts` and `pages-jsonld.test.ts` mention it).
- Live HTML: on each of the 6 older guides the link to it appears **only** in the footer "Guide" row (label "Come funziona un comparatore"), never in the "Continua a leggere" block.
- The "Continua a leggere" link text is the target's H1 (`RelatedPages.tsx` prints `p.h1`). For this guide the H1 is "Come funziona un comparatore luce e gas", a descriptive anchor containing the target phrase.

### 3b. Every internal link that points to the home (live HTML, all 7 guides)

| Where | Anchor text | Count per guide |
|---|---|---|
| Header logo (`aria-label` "VERSUS comparatore luce e gas, torna alla home"; visible text = wordmark "Versus Comparatore luce e gas") | wordmark | 1 |
| Breadcrumb first item | "Home" | 1 |
| CTA button under the intro | "Confronta le offerte" | 1 |
| CTA button at the bottom | "Confronta le offerte" | 1 |
| Footer | none (footer has Privacy + "Guide" row only) | 0 |
| Body text | none (the brand phrase "VERSUS, comparatore luce e gas" in each intro is plain text, not a link) | 0 |

Total 28 links into the home from 7 guides, 3 distinct anchors, **none contextual and none with the target phrase as visible anchor text** (the logo link has it via the accessible name and wordmark only). The home has no link to itself and 0 links to guides outside the footer row (7 footer links, anchors "Cambio fornitore", "Voltura", "Subentro", "Primo allaccio", "Come scegliere", "Fine tutela", "Come funziona un comparatore"); the home body links only to `/privacy`.

### 3c. Side finding: the 4 older guides link to the noindex offers pages
Guide 1: `/offerte-luce-gas` and `/offerte-luce-gas-partita-iva`; guides 2, 3, 4: `/offerte-luce-gas` — both in `related` (and the anchor "Offerte luce e gas" appears in the live HTML). SPEC #35 only says the offers pages are unlinked "from the home, header, footer, form and flow", so this was allowed, but it conflicts with the rule as written in this brief ("the 4 offers pages stay noindex and unlinked") and wastes 5 link slots on `noindex, follow` pages. The guides test explicitly allows `/offerte*` in `related`. Giuseppe should confirm which reading he wants.

### 3d. Minimal link changes (proposed, none applied)

| # | Change | Class | Why |
|---|---|---|---|
| L1 | Add `/guida/come-funziona-comparatore-luce-gas` to `related` of the other guides. Slots exist if the `/offerte*` entries are replaced: guide 1 (replace both offers pages with guide 7 and guide 5), guides 2, 3, 4 (replace `/offerte-luce-gas` with guide 7). Guides 5 and 6 are full (4): swap one (for example guide 5: `subentro` -> guide 7; guide 6: `primo-allaccio` -> guide 7). Test allows it; `types.ts` says 3 or 4 | visible (small block) | Contextual link with anchor "Come funziona un comparatore luce e gas" from every guide; also stops sending link slots to noindex pages. Needs Giuseppe's OK twice (new links; removing the offers links) |
| L2 | In each guide intro, make the existing phrase "VERSUS, comparatore luce e gas" a link to `/` (inline, normal link style). Needs the intro renderer to accept the link (today `intro` is a string; the test requires the phrase exactly once) | visible (underlined text in the intro) | The only change that gives the home a contextual anchor with the exact target phrase on 7 URLs, without hidden text and without new copy. Highest value of the list |
| L3 | CTA button text "Confronta le offerte" -> keep as is; optionally the bottom CTA only: "Apri il comparatore luce e gas" (fits at 390 px with wrapping) | visible | Third anchor variant; modest value, optional. Do not change both buttons to the same long text (boilerplate repetition) |
| L4 | Home explainer, block "Quali offerte confrontiamo", second paragraph: inline link to guide 7 on "Portale Offerte"/"come funziona un comparatore" | visible | Home -> guide (not guide -> home); helps guide 7 only. Lower priority for the goal "concentrate on the home" |
| L5 | JSON-LD `Article`: add `isPartOf` -> `{"@id": ".../#website"}` and `about` -> `{"@id": ".../#service"}` (both ids exist on the home graph) | invisible | Machine-readable tie of guides to the entity "VERSUS comparatore luce e gas" without extra text |
| L6 | Sitemap `lastmod` and home `dateModified` still say 2026-11-07 although the home changed on 2026-11-09 (title, H1, explainer sentence) and 2026-11-10 (footer row); set to the real day, per the project's own "only when it really changed" rule | invisible | Freshness signal is honest here: content did change. `llms.txt` header date is 2026-11-09 although guide 7 was added 2026-11-10 (same nit) |

Not proposed: any link from the offers pages, hidden or off-screen links, a link row on the home that is not in the footer, "Guide" mega-block. The footer "Guide" row stays the accepted pattern.

---

## 4. Home content, and the word "indipendente"

### 4a. What the home says vs. the target phrase and variants
- Title: "Comparatore luce e gas: confronta le offerte gratis | VERSUS". Description: "Comparatore luce e gas gratuito per casa e partita IVA: ...". H1: "Comparatore / luce e gas". Subtitle: "Rispondi a poche domande: ti mostriamo le offerte più convenienti per la tua casa o la tua attività." Explainer H2: "Come funziona il confronto luce e gas su VERSUS"; first sentence "VERSUS è un comparatore luce e gas per la casa e per la partita IVA."
- Variants present: "confronto luce e gas", "confrontare luce, gas o luce e gas". Absent on the home: "confronto tariffe", "comparatore gas", "comparatore luce", "comparatore energia elettrica", "comparatore prezzi", "compagnia"/"gestore". Do not stuff them; they can enter through the FAQ rows of section 2, rank 1.
- The home does not mention that it is not the only comparator or what a comparator is; that sits in guide 7. The explainer's second paragraph under "Quali offerte confrontiamo" is the only mention of the Portale Offerte.
- Observation: the subtitle says "le offerte più convenienti" while the FAQ says no offer is cheapest for all and the SERP study warns against "più conveniente" claims. It is an existing approved sentence; flag for Giuseppe only, not a new proposal.

### 4b. "indipendente" — what each source literally supports
Where it appears (source and live HTML): home explainer (`explainer.ts` line 19), guides 1 to 6 (one sentence each, text "il sito gratuito e indipendente di ARERA, previsto dalla Legge Concorrenza del 2017"), the 4 noindex offers pages. Guide 7 does not use the word.

- **FG 5.9** (VERIFIED, 2026-11-05): "ARERA describes it as free and independent". I re-fetched the cited ARERA page today with `curl`: `https://www.arera.it/consumatori/clienti-vulnerabili-e-servizio-tutele-graduali-1` contains the sentence "Per un confronto personalizzato è possibile utilizzare il Portale Offerte, il sito gratuito e indipendente di ARERA". So the phrase is **ARERA's own wording about the portal, on ARERA's site**. Supported, as an attribution to ARERA.
- **FG 6.11** (UNVERIFIED for the portal): the portal's own pages do not call the portal independent. My check agrees: 0 hits for "indipendente" on `ilportaleofferte.it` home, its "informazioni legali" page, and ARERA's `il-portale-offerte` page; the only hit on the portal domain is the "chi siamo" page, where **Acquirente Unico** is called "soggetto terzo, pubblico ed indipendente" (a statement about the company that builds and runs it). So FG 6.11 is also correct: the adjective is not on the portal's pages.
- The two entries therefore do not contradict each other: 5.9 = ARERA says it on its own page; 6.11 = the portal does not say it about itself. The risk is only the unattributed form, "Il Portale Offerte è il sito gratuito e indipendente...", which states it in VERSUS's own voice.

**Safe wording (true under both), two options:**
1. Drop the adjective (cleanest, no claim): "Per avere una vista più ampia del mercato esiste il Portale Offerte, il sito gratuito di ARERA, realizzato e gestito da Acquirente Unico in attuazione della legge 124/2017, per confrontare le offerte di luce, gas e luce più gas: comprende offerte PLACET, di mercato libero e servizi di tutela." (Supported by FG 6.1 for builder, year, free, law; FG 5.9 for the scope.)
2. Keep the adjective but attribute it: "...il Portale Offerte, che ARERA stessa presenta come sito gratuito e indipendente, ..." (supported by FG 5.9 and the page above; not an assertion by VERSUS).
Recommendation: option 1 for all 7+ occurrences (home, guides 1-6, offers pages) in one edit; this is a visible text change on 7 indexable pages, so it needs Giuseppe's OK (it also touches the 12-month review in `reviewedOn`; do not change the dates unless the facts are re-read, which this read counts as for FG 5.9).
Bonus, not yet in `fonti-guide.md`: the same ARERA page says that, with Comune, price type, power and annual consumption, the portal shows "offerte ordinate in base alla stima della spesa annua personalizzata". This is the first primary evidence for FG 6.8 (portal ordering), limited to that search; a fact-check agent should add it as an entry before any copy uses it.

### 4c. PAA-style FAQ rows for the home
See section 2, rank 1 (4 rows, all from canonical facts or approved guide 7 / home FAQ 8 copy). Each is visible and needs the owner's OK on the text first (decision 2026-11-07: new FAQ rows OK once the text is approved).

---

## 5. Brand query "versus comparatore"

### 5a. What ties the bare word VERSUS to "comparatore" on-site today (live)
| Surface | Today |
|---|---|
| Home `<title>` | "Comparatore luce e gas: confronta le offerte gratis | VERSUS" (both words, not adjacent) |
| Guide titles | "<topic> | VERSUS" only (suffix change rejected by Giuseppe 2026-11-09; do not re-propose) |
| Home first sentence | "VERSUS è un comparatore luce e gas per la casa e per la partita IVA." (T21.2, approved) |
| Guide intros | one closing sentence each with "VERSUS, comparatore luce e gas" (approved) |
| Header | link `aria-label` "VERSUS comparatore luce e gas, torna alla home"; wordmark text "Versus Comparatore luce e gas"; logo `role=img` label "VERSUS — comparatore luce e gas" |
| JSON-LD | Organization and WebSite `name` "VERSUS"; `alternateName` ["VERSUS comparatore luce e gas", "Versus Comparatore", "VERSUS luce e gas"]; Service `name` "VERSUS — comparatore luce e gas"; PNG logo 512 px; Article author/publisher = same Organization node; no `sameAs` |
| Social cards | `og:image:alt` and `twitter:image:alt` "VERSUS — comparatore luce e gas" |
| `llms.txt` | H1 "VERSUS — comparatore luce e gas" and summary line "VERSUS è un comparatore luce e gas online e gratuito...", home labelled "Home: comparatore luce e gas" |

### 5b. What is still missing (excluding decided items)
Decided and not repeated: suffix on guide titles (rejected), `alternateName` (done), brand sentence in home and 6 guide intros (done; guide 7 has it too), WebSite `name` stays "VERSUS", full-name rule for all off-site profiles (T21.4).

| # | Gap | Proposal | Class |
|---|---|---|---|
| B1 | `og:site_name` is the bare "VERSUS" on every page | Set to "VERSUS — comparatore luce e gas" (WebSite `name` stays "VERSUS" for Google's site-name rule) | invisible |
| B2 | Footer line "© VERSUS 2026" uses the bare word on every page | "© 2026 VERSUS — comparatore luce e gas" or add the phrase after the company data | visible (one line) |
| B3 | Home meta description starts with the topic, no brand | e.g. "VERSUS, comparatore luce e gas gratuito per casa e partita IVA: ..." (metadata; tell Giuseppe like the title). Low value (Google rewrites snippets) | invisible |
| B4 | No `sameAs` and no off-site profile that repeats the full name (T21.4/T21.5 pending). This is the largest brand gap, but it is off-site | Giuseppe/Aldo: Business Profile, Facebook/Instagram/LinkedIn, Bing Places, directories, SiteXP "realizzato da" link; then `sameAs` | off-site / invisible |
| B5 | Guide 7 is not reachable from `related` or from other guides' text, so the guide most likely to match "comparatore" + "VERSUS" gets only footer links | L1 above | visible |
| B6 | No web manifest (`/manifest.webmanifest` returns 404); not a ranking factor, only completeness | skip unless wanted | invisible |
| B7 | Breadcrumb root is "Home" (HTML and JSON-LD) | Optional: name it "VERSUS comparatore luce e gas" in both places (must stay identical). Marginal; Google replaces it with the site name | visible |
| B8 | `llms.txt` header date says 2026-11-09 although guide 7 is listed (live since 2026-11-10); sitemap home `lastmod` 2026-11-07 | align dates (L6) | invisible |

Reminder from the panel: Google position 1 for the bare domain query is already met; "VERSUS comparatore luce e gas" on page 1 is not. The remaining levers are indexing (check 2026-11-12) and the off-site profiles; B1-B3 add little by themselves.

---

## 6. Constraints check of everything proposed
- Facts only from `canonical-facts.md` or VERIFIED FG entries: yes; every UNVERIFIED item (FG 1.10, 2.9, 3.6, 5.13 accomplished start, 5.17 conversions, 5.21, 5.25, 5.30-5.32, 6.8-6.11) is listed as excluded.
- No personal names, no `/chi-siamo`, no phone/call-center/callback: yes (the test regex `chiam|call|+39` also guards guide text).
- No Facile.it-style elements, no ratings, no "demo": yes.
- Offers pages stay noindex: yes; section 3c proposes removing guide links to them, which needs Giuseppe's decision.
- No hidden text or links: all link proposals are visible links in body/related; JSON-LD proposals mirror visible content.
