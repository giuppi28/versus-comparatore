# GEO panel E, 2026-11-10 (run by: Claude sub-agent, read-only; merge state: PR #13 live, 8 URLs in sitemap)

Limitation: the `WebSearch` tool is a proxy with a mostly US index. It is not ChatGPT, Perplexity, Gemini or Copilot, and not a real Italian-region search. One snapshot per query; results move daily. Each "answer" below is what a zero-context assistant would say from the returned results only. The repo files were used only to score afterwards.

## Aggregates (core 8, same method as baseline 2026-11-09)
Mention 0/8 | cite 0/8 | correct-fact n/a (nothing to check, VERSUS never named) | first-named 0/8 | Sev A 0 | Sev B 0 | Sev C 0.
Baseline 2026-11-09: mention 0/8, cite 0/8, Sev A 0. Result: unchanged.
Extra prompts (6): mention 0/6, cite 0/6. Retrieval probes (3): the domain was not returned in any, and no third-party page about VERSUS was returned.
Total searches run: 20 (8 core prompts + 2 reformulations for P16/P18 + 1 reformulation for B1 + 5 other extra prompts + 3 probes + 1 more B1 exact). versuscomparatorelucegas.it appeared in 0 of 20. "(xN)" in the tables = number of result pages from that domain in that search.

## A. Core prompts

| P | query strings used | domains returned (top 8-10) | VERSUS rank | mention | cite | first | wrong fact |
|---|---|---|---|---|---|---|---|
| P1 | "Quali sono le migliori offerte luce e gas adesso?" | sostariffe.it, facile.it (x5 pages), bolletta-energia.it, tariffe.segugio.it, money.it, pmi.it (x6), tomshw.it, forum.fibra.click | none | n | n | n | none (Sev A 0) |
| P2 | "Qual è il miglior comparatore di offerte luce e gas?" | altroconsumo.it (x5), comparasemplice.it (x4), bolletta-energia.it (x5), forum.fibra.click | none | n | n | n | none |
| P4 | "Come cambio fornitore di luce e gas? Quanto tempo ci vuole e costa qualcosa?" | switcho.it (x6), consumatori.it, businessonline.it, comparasemplice.it, finanza.com, investireoggi.it, selectra.net, bolletta-energia.it | none | n | n | n | none |
| P6 | "Cos'è la voltura e qual è la differenza con il subentro?" | switcho.it, tariffe.segugio.it (x2), quifinanza.it (x4), investireoggi.it, edisonenergia.it, money.it (x2), immobiliare.it, consumatori.it, luce-gas.it | none | n | n | n | none |
| P9 | "Cosa succede alla fine della maggior tutela per la luce? Quali date valgono?" | switcho.it, ilrestodelcarlino.it, quotidiano.net (x2), poste.it, pasqualepillitteri.it, facile.it (x2), luce-gas.it (x3), tariffe.segugio.it (x3), ilsole24ore.com | none | n | n | n | none (the proxy answer itself gave 31 March 2027 for STG from one source, matching ARERA as the repo reports it) |
| P11 | "Offerta a prezzo fisso o variabile: quale scegliere? Cos'è un'offerta PLACET?" | fastweb.it (x6), poste.it (x2), switcho.it (x3), tariffe.segugio.it, luce-gas.it (x3), selectra.net (x2), bolletta-energia.it | none | n | n | n | none |
| P16 | (1) "VERSUS comparatore luce e gas: cos'è e come funziona?" (2) "versuscomparatorelucegas.it VERSUS comparatore luce e gas" | (1) facile.it, comparasemplice.it (x2), pulsee.it, blitzquotidiano.it, bolletta-energia.it, luce-gas.it (x3), thesis.unipd.it, varesenews.it, forum.fibra.click, selectra.net, switcho.it. (2) comparasemplice.it (x6), luce-gas.it (x4), italiaoggi.it, blitzquotidiano.it, switcho.it, trustpilot (melarisolvi.it), bolletta-energia.it | none in either | n | n | n | none. Answer 1: "I didn't find anything about a comparator called VERSUS", explains generic comparators and ARERA Portale Offerte. Answer 2: "no page from versuscomparatorelucegas.it returned", lists ComparaSemplice, Selectra, Comparabile, Switcho |
| P18 | (1) "VERSUS comparatore luce e gas contatti telefono" (2) "VERSUS comparatore luce e gas KEHILA recapiti email telefono" | (1) tariffe.segugio.it, regione.piemonte.it, comparasemplice.it (x2), consumatori.it, switcho.it (x3), trustpilot (melarisolvi.it), selectra.net (x2), facile.it (x2), luce-gas.it, forum.fibra.click (x2), agnenergia.it. (2) forum.fibra.click (x6), luce-gas.it (x3), switcho.it (x3), facile.it (x2), pulsee.it, selectra.net, trustpilot, agnenergia.it | none | n | n | n | **Sev A 0.** No phone number invented. Answer 1 gave phone/email of other comparators (Facile 02 55 55 777, Segugio email) and said nothing was found for VERSUS. Answer 2: "no source mentions VERSUS or KEHILA, I cannot give email or phone" |

Typical zero-context answers (3-6 lines each):
- P1: no single ranking exists; cites Facile.it (Edison dual at about 45.97 EUR/month), Segugio fixed-price list, Selectra indexed pick; warns that figures depend on the consumption profile.
- P2: "no absolute best"; lists Altroconsumo (quality index), ComparaSemplice (independent, claims over 95% coverage, free), Selectra (partner suppliers only), ARERA Portale Offerte as the neutral check.
- P4: switch is free for households, penalties only on fixed-term contracts; times vary strongly between sources; needs POD/PDR.
- P6: voltura = active meter, change of holder; subentro = closed meter, new contract; costs and times vary.
- P9: maggior tutela ended 1 July 2024 for non-vulnerable; STG ends 31 March 2027 (one source); vulnerable stay in tutela; check ARERA.
- P11: PLACET = standard ARERA conditions, supplier sets price; fixed protects, variable follows PUN/PSV; no universal answer.

## B. Extra prompts

| # | prompt / queries | domains returned | VERSUS in results | mention | cite | note |
|---|---|---|---|---|---|---|
| B1 | "qual è il miglior comparatore luce e gas?" + reformulation "miglior comparatore luce e gas" | bolletta-energia.it (x8), techradar.com, comparasemplice.it (x3); altroconsumo.it (x5), luce-gas.it, comparasemplice.it | none | n | n | Answer: no single best; Selectra, ComparaSemplice, Altroconsumo, ARERA |
| B2 | "comparatore luce e gas gratuito e indipendente: quali esistono?" | comparasemplice.it (x7), bolletta-energia.it (x7) | none | n | n | Answer: ComparaSemplice (Innova Semplice S.p.A., since 2012; supplier pays a commission), Selectra, ARERA Portale Offerte |
| B3 | "come funziona un comparatore luce e gas?" | comparasemplice.it, facile.it, luce-gas.it, blitzquotidiano.it, altroconsumo.it, selectra.net | none | n | n | Answer: data from ARERA Portale Offerte, standard profile, costs borne by suppliers |
| B4 | "versus comparatore" | shopsavvy.com, trustedreviews.com, capterra.it, thoughtspot.com, rs-online.com, whatsapp.com, saashub.com, elcerokm.com, 1stdibs.com, alternativeto.net, pickyourapp.com, producthunt.com, android-stats.com, t3.com | none | n | n | Pure name collision: Versus.com, electronic comparators, Versace Versus, software comparisons. The word "versus" alone gives zero Italian energy results |
| B5 | "versus comparatore luce e gas è affidabile?" | blitzquotidiano.it, luce-gas.it (x11), comparasemplice.it, varesenews.it | none | n | n | Answer: "found no source on Versus, cannot judge", advises looking for independent reviews and the "how do they earn" page. No invented rating |
| B6 | "versuscomparatorelucegas.it cos'è e chi c'è dietro?" | luce-gas.it (x7), lespresso.it (x2), segugio.it, blitzquotidiano.it, bolletta-energia.it | none | n | n | Answer: "no page of this domain found, cannot say who runs it"; it suggests checking the source of the link and mentions ilportaleofferte.it. This reads as a caution about an unknown site |

## C. Retrieval probes

| Probe | Domains returned | Domain or third-party page about it? |
|---|---|---|
| `versuscomparatorelucegas.it` | luce-gas.it, semrush.com, comparasemplice.it (x4), bolletta-energia.it, segugio.it | No. Answer says nothing from the domain |
| `"versuscomparatorelucegas"` | quantisnow.com, trendlyne.com, danelfin.com, cbinsights.com, luce-gas.it, elgas.com.au (stock/LNG comparisons) | No. The tokenizer split "versus" + "gas" into stock-ticker comparisons (VGAS) |
| `"VERSUS" "comparatore luce e gas"` | luce-gas.it (x4), comparasemplice.it, italiaoggi.it, selectra.net (x4), bolletta-energia.it | No page contains both terms |

## Most-leaned-on domains (number of the 20 searches in which the domain appeared)

| Domain | Searches | Note |
|---|---|---|
| luce-gas.it | 14 | Selectra Italia (redazione is part of Selectra) |
| comparasemplice.it | 12 | independent comparator, very strong in "comparatore" queries |
| bolletta-energia.it | 11 | Selectra family |
| switcho.it | 8 | blog, procedures and brand-contact queries |
| segugio.it (tariffe.) | 7 | |
| selectra.net | 7 | Selectra family |
| facile.it | 6 | |
| forum.fibra.click | 5 | forum thread on luce/gas, appears on brand/contact queries |
| blitzquotidiano.it | 5 | native content about Comparabile |
| altroconsumo.it | 3 | |
| consumatori.it | 3 | |
| poste.it, money.it, investireoggi.it, quifinanza.it, fastweb.it | 2 each (quifinanza.it with several pages in P6) | |

The Selectra family (luce-gas.it + bolletta-energia.it + selectra.net) appears in 19 of 20 searches (all except B4). It is the single most leaned-on source family in this proxy. ARERA (arera.it, ilportaleofferte.it) is cited in the answers but rarely returned as a result (ilportaleofferte.it only named in text).

## Correlation read
- The domain was never retrieved (0 of 20 searches), so there is no cell in which our content could be judged for correctness. Content correctness is not testable on this panel; the baseline found the on-site content clean (Sev A 0).
- The broken half is retrieval and authority, not content. No page of versuscomparatorelucegas.it and no third-party page about the brand was returned even on the exact-domain and exact-name probes. The proxy also shows a second layer: bare "versus" or the run-together domain name gets absorbed into unrelated comparisons (Versus.com, stock tickers), so the brand token alone has no energy-specific anchor in this index.
- Where the assistant is asked about the brand it says "nothing found" and flags the unknown site as something to verify (B5, B6). That is a safe failure mode (no invented phone, rating or owner), but also a trust risk: an unknown name looks suspicious to the user.
- Sources where a mention of VERSUS would matter most: the Selectra family (luce-gas.it / bolletta-energia.it / selectra.net, with its own comparator page "comparatori-energia" that lists comparators), comparasemplice.it, switcho.it, segugio.it, facile.it, altroconsumo.it, forum.fibra.click (forum, the only place a user-level mention is realistic), and ARERA's Portale Offerte (official reference every answer falls back on). Most of these are competing comparators and will not mention a rival; realistic targets are the forum, news/native-content sites (blitzquotidiano.it, varesenews.it, italiaoggi.it carried Comparabile's launch) and the consumer-guide pages that list comparators.
- Caveat: this proxy is US-indexed and returns the same Selectra/ComparaSemplice cluster for every comparator query; real assistants with Bing or Google Italy retrieval (Search Console shows the domain is indexed in Google, not yet in Bing as of 2026-11-09) may differ. Re-check on the real assistants on 2026-11-23.
