# Bozza guida "Come funziona un comparatore luce e gas" (informational side of the cluster)

Draft for Giuseppe's approval. No code was touched, nothing committed or pushed. After the OK it is built as the seventh guide in `app/src/content/seo/guides.ts`.

Notes (English, for Giuseppe and the builder):
- Customer copy is Italian and sits between `<!-- copy:start -->` and `<!-- copy:end -->`. Everything else is notes. Format copied from `bozze-round2.md` (section 3).
- Role in the cluster: the home owns the commercial phrase "comparatore luce e gas". This guide owns the informational queries (come funziona, affidabili, come guadagnano, comparatore ufficiale / Portale Offerte, tutte le offerte, People Also Ask of 2026-11-09). Title and H1 start with "Come funziona", never with the bare phrase.
- Facts only from `docs/geo/canonical-facts.md` (CF, confirmed rows) and VERIFIED entries of `docs/geo/fonti-guide.md` (FG). New entries FG 6.1 to 6.16 were added today (section 6 of that file). Coverage and agent sentences are byte-identical to the `COVERAGE` and `AGENT` constants in `guides.ts`.
- What is new compared with the home explainer and the six guides (no sentence copied): the Portale Offerte details (who builds it, since when, what it asks, which offers it publishes and which it currently excludes, sellers responsible for the data), the "same number, different base" trap (Portale spesa includes IVA, VERSUS estimates do not), the checklist, the two Codice del consumo rules on ranking, and the mapping of the checklist onto how VERSUS works.
- Proposed slug: `/guida/come-funziona-comparatore-luce-gas`. Proposed `footerLabel`: "Come funziona un comparatore" (or shorter "Comparatori").
- Proposed `related` (guides only, so `guides.test.ts` accepts them): `/guida/come-scegliere-offerta-luce-gas`, `/guida/fine-tutela-mercato-libero`, `/guida/cambio-fornitore-luce-gas`. The home link comes from the CTA the template already renders (`SeoPageTemplate` `CtaLink` to `/`); `/` cannot go in `related` because the test only allows guide paths and `/offerte*` paths. Optional, needs your OK: add this guide to the `related` of `come-scegliere-offerta-luce-gas` and a short footer link. No link to the four offers pages anywhere in the draft.
- Limits of `app/src/content/seo/guides.test.ts` and `types.ts` that I checked (figures in the table at the end of the copy section): title ends with "| VERSUS" and is at most 60 characters; description at most 160 (types.ts says 155, so I kept it at or below 155); 4 to 6 FAQ rows (6 here); intro contains "VERSUS, comparatore luce e gas" exactly once and has at most 95 words; coverage and agent sentences present byte-identical in the page object; none of `chiam|demo|club|\+39|numero verde|migliore` (case-insensitive, tested on the JSON of the whole object, so also on source labels and URLs) appears; every `related` path exists in the registry.
- Builder must also change the test (the draft cannot do it): `toHaveLength(6)` and `Set(...).size` to 7, add the new path to the `NEW` list (so it gets the forbidden-wording check) and set `publishedOn` accordingly (the test expects "2026-11-07" for `NEW` paths and "2026-11-05" otherwise, so either extend the rule with a third date or set the date to match). `reviewedOn` is asserted to be "2026-11-07"; the real check date of today is 2026-11-09, so that assertion needs the same update. Also the sitemap, `llms.txt`, the footer "Guide" row and any schema list of guides must include the new page: check where `GUIDE_PAGES` is consumed.
- Trap found while drafting: the word "migliore" is banned by the test. The FAQ answers therefore avoid it ("Non c'è un comparatore che vada bene per tutti"). The question text uses "miglior" (the People Also Ask wording), which the regex does not match.
- Not in the copy on purpose:
  - how other comparators are paid, which sellers they cover, how they order results, and whether the Portale has "no commercial agreements": no primary source (FG 6.14). The copy says what to check and how VERSUS works.
  - "il Portale è indipendente": not stated on the portal pages (FG 6.11); the older sentence in the home and guides ("sito gratuito e indipendente di ARERA") rests on FG 5.9 and should be re-checked by you when the guides are next reviewed.
  - "i venditori sono obbligati a pubblicare sul Portale" (FG 6.10), how the Portale orders results (FG 6.8), whether it activates contracts (FG 6.9).
  - freshness of VERSUS offers: no CF row says how often offers are updated, so the checklist item "quanto sono aggiornate le offerte" has no VERSUS answer in the "come risponde VERSUS" list. Add it only if Aldo/Giuseppe give a confirmed statement.
  - ARERA helpline (phone wording rule), euro amounts, percentages, IVA rates, supplier names, competitor names, personal names, ratings, "migliore/più conveniente/primo/unico" about VERSUS.
- The two Codice del consumo sentences (art. 22 c. 4-bis and art. 23 m-bis) were read on Normattiva through the fetch tool, which paraphrases and could not give the comma verbatim (FG 6.12, 6.13). **Orchestrator check 2026-11-09 (raw HTML via `curl`, no summary tool):** both commas read verbatim on Normattiva and the copy matches them; also re-read verbatim: ARERA page (online since 1 July 2018, "tutte le offerte presenti sul mercato di vendita al dettaglio", Acquirente Unico, law 124/2017), portal FAQ on published and excluded offers ("attualmente" → "per ora" in the copy), portal FAQ on taxes (accisa and IVA), portal legal notice (sellers "unici responsabili"). Not re-read by the orchestrator: the SPID/CIE login detail of FG 6.3 (the word SPID is in the portal HTML; the pre-fill behaviour was read only by the drafting agent).

---

## Guida /guida/come-funziona-comparatore-luce-gas

<!-- copy:start -->

**Titolo Google:** Come funziona un comparatore luce e gas: guida | VERSUS

**Descrizione Google:** Come funziona un comparatore luce e gas: dati richiesti, Portale Offerte di ARERA e controlli da fare prima di scegliere. Guida con fonti ufficiali.

# Come funziona un comparatore luce e gas

Un comparatore luce e gas raccoglie offerte di più venditori e le mostra in un elenco, con una stima della spesa calcolata sui dati che inserisci, di solito consumi e tipo di cliente. La stima non è la bolletta, e un comparatore può mostrare tutto il mercato o solo una parte: per questo conviene sapere quali venditori include e come ordina i risultati. Su VERSUS, comparatore luce e gas, il confronto è gratuito e le stime sono IVA esclusa.

### Che cosa chiede e che cosa mostra

Per confrontare servono pochi dati: se vuoi luce, gas o entrambi, se sei una casa o una partita IVA e quanto consumi in un anno. Per la luce trovi in bolletta il consumo in kWh e la potenza impegnata in kW, per il gas il consumo in Smc. Lo storico dei consumi è consultabile anche sul Portale Consumi di ARERA, con SPID o CIE.

Il risultato è un elenco di offerte con una stima della spesa. È una stima, non una bolletta: il prezzo di un'offerta riguarda l'energia, mentre la bolletta comprende anche trasporto e gestione del contatore, oneri di sistema e imposte, e dipende da quanto consumi davvero.

Controlla anche su quale base è calcolata la stima. Nel Portale Offerte, per esempio, le FAQ spiegano che la spesa finale comprende le imposte, cioè accisa e IVA, mentre le stime di VERSUS sono IVA esclusa. Due cifre prese da siti diversi possono quindi non essere confrontabili tra loro.

### Il comparatore pubblico: il Portale Offerte di ARERA

Il Portale Offerte è realizzato e gestito da Acquirente Unico su disposizione di ARERA, in attuazione della legge 124/2017. È online dal 1 luglio 2018 e permette a famiglie e piccole imprese di confrontare gratis le offerte di luce, gas e luce e gas insieme (dual fuel). Per cercare indichi il tipo di offerta e il comune o il CAP della fornitura; se vuoi, accedi con SPID o CIE per partire dal tuo storico dei consumi.

ARERA lo descrive come lo strumento che raccoglie e pubblica tutte le offerte presenti sul mercato di vendita al dettaglio di luce e gas. Le FAQ del portale precisano che sono pubblicate le offerte rivolte al pubblico, presentate sui siti o negli uffici dei venditori o su media almeno regionali, e che per ora sono escluse, tra le altre, quelle riservate a gruppi chiusi, trattate individualmente o proposte solo a clienti raggiunti direttamente dal venditore.

Per avere una vista d'insieme del mercato è il punto di partenza più ampio. Il portale ricorda però che le informazioni sulle offerte sono fornite dai venditori, che ne sono gli unici responsabili: prima di firmare, controlla le condizioni nella Scheda sintetica, che il venditore deve consegnarti prima della firma.

### I comparatori privati: che cosa guardare

Un comparatore privato è un sito gestito da un'azienda, che decide quali offerte mostrare, come ordinarle e quali servizi aggiungere. Per valutarlo ti servono dei criteri.

### Come valutare un comparatore: la lista di controllo

- Chi c'è dietro: ragione sociale, sede e partita IVA dovrebbero essere facili da trovare sul sito.
- Quali venditori confronta: il sito dovrebbe dire se mostra tutto il mercato o solo una parte, e come sceglie i venditori da includere.
- Come ordina i risultati: per spesa stimata, per accordi commerciali o con altri criteri. Cerca la sezione che lo spiega.
- Come è remunerato: il sito dovrebbe spiegare chi lo paga e se questo può influire sui risultati.
- Che cosa comprende la stima: IVA, imposte e quote fisse sono dentro o fuori? È una spesa mensile o annua?
- Quanto sono aggiornate le offerte: cerca una data di aggiornamento e verifica sempre le condizioni nella Scheda sintetica del venditore.
- Che cosa succede dopo la scelta: il sito si limita al confronto o raccoglie i tuoi dati per attivare l'offerta? Controlla a chi li affida e per quale scopo.

Sull'ordine dei risultati il Codice del consumo dà due indicazioni. Quando puoi cercare prodotti offerti da professionisti diversi, sono considerate rilevanti le informazioni sui principali parametri che determinano la classificazione dei risultati, in una sezione raggiungibile dalla pagina dei risultati (art. 22, comma 4-bis). Inoltre è in ogni caso ingannevole mostrare risultati di ricerca senza indicare chiaramente un annuncio a pagamento, o un pagamento specifico per ottenere una posizione più alta nei risultati (art. 23, lettera m-bis).

### Come risponde VERSUS alla lista di controllo

- Chi c'è dietro: KEHILA S.r.l.s., con sede in Via Umberto 326 B, 95055 San Pietro Clarenza (CT), partita IVA 06237360877.
- Quali venditori confronta: Confrontiamo le offerte dei venditori con cui collaboriamo, non tutte quelle disponibili sul mercato.
- Come ordina i risultati: prima le offerte «In evidenza», una scelta commerciale di VERSUS, poi le offerte a prezzo fisso, dalla spesa mensile stimata più bassa alla più alta, infine quelle a prezzo variabile.
- Come è remunerato: VERSUS opera come agente ed è remunerato dai venditori. Per te il confronto è gratuito.
- Che cosa comprende la stima: è una stima della spesa mensile, IVA esclusa.
- Che cosa succede dopo la scelta: se un'offerta fa per te, puoi richiedere l'attivazione online, per un cambio fornitore, un subentro, una voltura o un primo allaccio.

Su VERSUS scegli luce, gas o luce e gas, indichi se sei una casa o una partita IVA e inserisci i consumi: la scelta resta tua.

### Domande frequenti

**Qual è il miglior comparatore di luce e gas?**

Non c'è un comparatore che vada bene per tutti. Il Portale Offerte di ARERA è lo strumento pubblico e quello con la copertura più ampia, mentre i comparatori privati cambiano per venditori inclusi, criteri di ordinamento e servizi dopo la scelta. Usa la lista di controllo di questa guida per valutarli, VERSUS compreso.

**Qual è un buon comparatore di energia elettrica?**

Un buon comparatore dice chiaramente chi lo gestisce, quali venditori confronta, come ordina i risultati, come è remunerato e che cosa comprende la stima. Prima di firmare leggi sempre la Scheda sintetica del venditore.

**Dove posso trovare un comparatore del prezzo del gas?**

Puoi usare il Portale Offerte di ARERA, che copre luce, gas e offerte dual fuel, oppure un comparatore privato. Per il gas ti serve il consumo annuo in Smc, che trovi in bolletta. Su VERSUS scegli «gas» e vedi le offerte dei venditori con cui collaboriamo, con una stima della spesa mensile IVA esclusa.

**I comparatori mostrano tutte le offerte del mercato?**

Non necessariamente. Il Portale Offerte punta a raccogliere tutte le offerte rivolte al pubblico, con alcune esclusioni, per esempio quelle riservate a gruppi chiusi. Un comparatore privato può mostrarne solo una parte, e il sito dovrebbe dirlo. Confrontiamo le offerte dei venditori con cui collaboriamo, non tutte quelle disponibili sul mercato.

**I comparatori luce e gas sono affidabili?**

Dipende da come sono costruiti, non dal solo fatto di essere un comparatore. Una stima non è una bolletta, e anche il Portale Offerte ricorda che le informazioni sulle offerte sono fornite dai venditori. Controlla chi gestisce il sito, come ordina i risultati e come è remunerato: per VERSUS la risposta è nella sezione sopra.

**Il Portale Offerte è il comparatore ufficiale?**

È il portale pubblico previsto dalla legge 124/2017, realizzato e gestito da Acquirente Unico su disposizione di ARERA, gratuito per famiglie e piccole imprese. VERSUS è un servizio privato: non sostituisce il Portale, e puoi usare entrambi per farti un'idea del mercato.

### Fonti

- [ARERA, il Portale Offerte](https://www.arera.it/consumatori/il-portale-offerte)
- [Portale Offerte, domande frequenti](https://www.ilportaleofferte.it/portaleOfferte/it/domande_frequenti.page)
- [Portale Offerte, informazioni legali](https://www.ilportaleofferte.it/portaleOfferte/it/informazioni-legali.page)
- [Portale Offerte, confronta le offerte](https://www.ilportaleofferte.it/portaleOfferte/it/confronto-tariffe-prezzi-luce-gas.page)
- [ARERA, guida alla lettura delle voci di spesa](https://www.arera.it/bolletta/guida-alla-lettura-delle-voci-di-spesa)
- [ARERA, clienti vulnerabili e Servizio a Tutele Graduali](https://www.arera.it/consumatori/clienti-vulnerabili-e-servizio-tutele-graduali-1)
- [Codice del consumo, art. 22 (Normattiva)](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2005-09-06;206~art22)
- [Codice del consumo, art. 23 (Normattiva)](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2005-09-06;206~art23)

<!-- copy:end -->

### Facts used

| Claim in the copy | Source ID |
|---|---|
| What a comparator does (collects offers, shows a list, estimate from the data you enter) | editorial definition, no factual claim about named sites |
| "Un comparatore può mostrare tutto il mercato o solo una parte" | logical possibility; the Portale itself excludes some offers (FG 6.2) |
| Data needed: luce kWh and kW from the bill, gas Smc, history on Portale Consumi with SPID or CIE | FG 1.13, 5.17 |
| A price is not the bill: energy price versus transport and meter, system charges, taxes | FG 5.19 |
| Portale spesa finale includes taxes (accisa and IVA); VERSUS estimates are IVA esclusa | FG 6.5; CF "Estimates" |
| Portale built and managed by Acquirente Unico as directed by ARERA, law 124/2017; online since 1 July 2018; households and small businesses; free | FG 6.1 |
| Portale compares luce, gas and dual fuel | FG 6.1, 5.9, 6.3 (the portal pages name "Dual Fuel") |
| Portale search inputs: offer type, comune or CAP, optional SPID or CIE login to start from the consumption history | FG 6.3 |
| ARERA describes it as collecting and publishing all offers on the retail market | FG 6.1 |
| Offers published: those aimed at the general public, advertised on seller sites or branches or media of at least regional reach; current exclusions (closed groups, individually negotiated, offered only to customers directly reached by the seller) | FG 6.2 |
| Sellers are solely responsible for the offer information | FG 6.4 |
| Scheda sintetica is delivered by the seller before signing | FG 1.12 |
| Private comparator = a site run by a company that chooses offers, order and services | editorial definition, no claim about named sites (FG 6.14: no primary source on business models) |
| Checklist (7 points) | editorial advice, marked as such; each item is phrased as "il sito dovrebbe" / "controlla", no claim about other sites |
| Codice del consumo art. 22 c. 4-bis (ranking parameters) | FG 6.12 (re-read before publishing) |
| Codice del consumo art. 23 m-bis (paid placement must be clearly indicated) | FG 6.13 (re-read before publishing) |
| KEHILA S.r.l.s., Via Umberto 326 B, 95055 San Pietro Clarenza (CT), P.IVA 06237360877 | CF "Legal entity", "Registered office", "P.IVA" |
| Coverage sentence (byte-identical, used twice) | CF "Market coverage" |
| Agent sentence (byte-identical) | CF "How VERSUS is paid" |
| Ordering: "In evidenza" first (commercial choice), then fixed by estimated monthly cost, then variable | CF "Ordering" |
| Estimate of monthly spend, IVA esclusa | CF "Estimates", "Ordering" |
| Comparison is free for the customer | CF "Cost to the customer" |
| Choose luce, gas or luce e gas; casa or partita IVA; enter consumption | CF "Service"; wording as in the approved `/guida/come-scegliere-offerta-luce-gas` (BOZZE) |
| Activation request online for cambio fornitore, subentro, voltura, primo allaccio | CF "Service" |
| "La scelta resta tua" | wording of the approved guide `come-scegliere-offerta-luce-gas` (BOZZE) |
| Portale Offerte "è il portale pubblico previsto dalla legge 124/2017 ... gratuito" (FAQ 6) | FG 6.1 |
| "VERSUS non sostituisce il Portale, puoi usare entrambi" | editorial advice |
| [omitted: no primary source] how private comparators earn, which sellers they cover, how they order; Portale ordering, activation, per-seller obligation, "indipendente"; offers freshness of VERSUS | FG 6.7 to 6.11, 6.14 to 6.16 |

### Numbers checked against `guides.test.ts` (computed on the copy above, 2026-11-09)

| Item | Value | Limit | OK |
|---|---|---|---|
| Title option A (in the copy) | 55 characters | at most 60, ends with "| VERSUS" | yes |
| Title option B | 48 characters | same | yes |
| Description | 148 characters | at most 160 (types.ts comment: 155) | yes |
| Intro | 79 words, "VERSUS, comparatore luce e gas" once | at most 95 words, exactly once | yes |
| FAQ rows | 6 | 4 to 6 | yes |
| Forbidden wording `chiam|demo|club|\+39|numero verde|migliore` | 0 matches in the copy | 0 | yes |
| Coverage and agent sentences | present byte-identical (coverage twice, agent once) | at least once | yes |
| Copy length | about 1,216 words including headings, bullets, FAQ and H1 | brief: 900 to 1,200 | slightly over; trim the FAQ row 2 or the checklist if you want it shorter |

### Open points for Giuseppe

1. Title: two options, both within the length the other guides use. A: "Come funziona un comparatore luce e gas: guida | VERSUS". B: "Come funziona un comparatore luce e gas | VERSUS". A is the same pattern as the other new guide ("... : guida | VERSUS"); B is shorter and keeps the keyword block unbroken. My pick: B.
2. Legal sentences (art. 22 c. 4-bis, art. 23 m-bis): read both articles on Normattiva before approving (FG 6.12, 6.13). If you prefer not to quote law in a customer guide, delete the paragraph that starts "Sull'ordine dei risultati" and the two Normattiva sources; the rest stands.
3. "Il punto di partenza più ampio" / "copertura più ampia" for the Portale: grounded on ARERA's own wording "tutte le offerte presenti sul mercato" plus the exclusions in FG 6.2. If you want a more cautious tone, replace with "ampio".
4. VERSUS has no answer for "quanto sono aggiornate le offerte" (no confirmed fact). The checklist item stays as advice. Ask Aldo for a statement if you want the answer in the list.
5. The coverage sentence appears twice (section and FAQ row 4), byte-identical. Acceptable for the tests; say if you want it once.
6. Existing sentence "sito gratuito e indipendente di ARERA" in the home and three guides: the portal pages I read do not say "indipendente" (FG 6.11). Not touched here; worth a check at the next review of those pages.
7. Footer label for the new guide (proposed "Come funziona un comparatore") and whether to add the guide to the `related` of the two existing "come scegliere" and "fine tutela" guides.
