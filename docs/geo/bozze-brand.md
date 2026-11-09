# Brand words in visible copy — drafts for approval (T21.2)

Proposal only. Nothing in `app/` is changed. Each item below is a before/after pair for Giuseppe to approve or reject on its own. Written 2026-11-09. Facts used: only the ✅ rows of `docs/geo/canonical-facts.md` (free comparison, casa and partita IVA, a few questions, estimate of the monthly cost excluding IVA, online activation, offers of the suppliers VERSUS works with, not the whole market). No savings claims, no ratings, no phone wording, no names, none of the six logo-only brands.

## Recommendation (read this first)

| # | Item | Verdict | Why |
|---|---|---|---|
| 1 | Home explainer, one-word edit | **Do it** | The explainer already opens with "VERSUS è un comparatore di offerte luce e gas…". Deleting "di offerte" makes the exact string "comparatore luce e gas" appear in the first sentence. Zero new text, zero risk. |
| 2 | Six guide intros, one sentence each | **Worth doing, but the cost is real** | Each guide is a different entry point (voltura, subentro…) where the page is about a procedure, not about VERSUS. One brand sentence per page gives Google and the AI assistants a clean "this page belongs to the site called VERSUS comparatore luce e gas" association on six more URLs, with no new fact. Cost: every intro grows by 21-28 words (see "Word count" below) and the sentence sits before the first section. Marginal gain if Giuseppe wants the guides to stay pure answer-first. |
| 3 | Guide `<title>` suffix "\| VERSUS luce e gas" | **Marginal, do only if 1 and 2 are approved, and only in the shortened form below** | Appending the suffix as is gives 62-68 characters on all six, so every title would be truncated in the results. The only way to stay at 60 or less is to drop "luce e gas" from the left part (the suffix carries it). That moves the topic keyword ("voltura luce e gas") away from the title start and Google often rewrites titles anyway. The brand benefit is real (every guide result would read "… \| VERSUS luce e gas") but small. |

Risk of over-repeating. The phrase already shows twice at the top of the home (header wordmark "VERSUS COMPARATORE luce e gas", H1 "Comparatore / luce e gas") plus the home `<title>`, the `alternateName` in JSON-LD, the header link's accessible name and `llms.txt`. Six more occurrences across the guides (one per text, each in a different sentence shape) are fine for a brand name, but it must not grow beyond that: no repetition in guide section headings, FAQs, footers or meta descriptions, and no second occurrence inside the same page text. The six guide sentences are deliberately worded differently from each other so they do not read as a template. Mind that the guide pages already contain the section "Confronta le offerte su VERSUS" with the coverage and agent sentences: the new intro sentence must stay short and must not repeat what that section says.

Not proposed: the guide meta `description` (already at 140-160 characters with a fixed ARERA wording), the offers pages (noindex; their titles share the type comment "ends with | VERSUS" and stay as they are), the home `<title>` (already "… | VERSUS" with the phrase at its start).

---

## 1. Home explainer

File: `app/src/components/page1/explainer.ts`, line 12 (the `EXPLAINER_INTRO` constant that starts on line 11). Rendered at `app/src/components/page1/LandingSections.tsx:111`, also copied into `/llms-full.txt` (`app/src/lib/seo/llms-full.ts:32`) and asserted in `e2e/seo-pages.spec.ts:153` through the import, so no test text needs editing.

**What the explainer says today about the name.** Its first sentence is already an equivalent: "VERSUS è un comparatore di offerte luce e gas per la casa e per la partita IVA." The block title is "Come funziona il confronto luce e gas su VERSUS". So the name is present, but as "comparatore di offerte luce e gas", not the exact form "comparatore luce e gas". Smallest edit: remove "di offerte" (the sentence two lines later already says "vedi le offerte…", so no meaning is lost).

Current (first sentence only, exact quote):

> VERSUS è un comparatore di offerte luce e gas per la casa e per la partita IVA.

Proposed (rest of the paragraph unchanged):

> VERSUS è un comparatore luce e gas per la casa e per la partita IVA.

Reason: puts the exact search phrase in the grammatical form "VERSUS è un comparatore luce e gas" with a one-word-pair deletion, no new sentence.

(The block title stays as is: "Come funziona il confronto luce e gas su VERSUS".)

---

## 2. Guide intros

Where: one sentence appended at the end of each guide's `intro` string, after the existing direct answer (answer-first is kept: the first sentences still answer the page question). The intro is rendered as the lead paragraph of the guide and copied into `/llms-full.txt` (`app/src/lib/seo/llms-full.ts:14`), so the text is the same for users and crawlers.

Word count. `app/src/content/seo/types.ts:27` says "max 60 words" for `intro`; no test enforces it (guides.test.ts checks only title and description lengths). Today: cambio 60, voltura 56, subentro 52, primo allaccio 52, come scegliere 52, fine tutela 71 (already above). With the proposed sentence: 82, 81, 80, 73, 76, 92. If approved, the comment in `types.ts` should be relaxed (for example "about 60 words for the direct answer, plus one brand sentence") or the sentences shortened further. This is the main trade-off of item 2.

### 2.1 Cambio fornitore
File `app/src/content/seo/guides.ts`, line 149 (path `/guida/cambio-fornitore-luce-gas`).

Current (exact):
> Per cambiare fornitore di luce o gas firmi un nuovo contratto con il venditore scelto. Per il gas il venditore entrante avvia la procedura e chiude il vecchio rapporto; per la luce invia il recesso al vecchio venditore con una tua procura. Di norma non resti senza energia. Per il gas, secondo ARERA, servono di norma uno o due mesi.

Proposed (append):
> Prima di cambiare puoi confrontare gratis le offerte con VERSUS, comparatore luce e gas, che mostra quelle dei venditori con cui collaboriamo.

Reason: ties the brand to the moment before switching; states the coverage limit ("venditori con cui collaboriamo", canonical-facts ✅).

### 2.2 Voltura
File `guides.ts`, line 239 (`/guida/voltura-luce-gas`).

Current (exact):
> La voltura è il cambio di intestatario di un contratto già attivo. Per il gas, ARERA la definisce come passaggio senza interruzione della fornitura e con lo stesso venditore. Per la luce la chiede il nuovo cliente. Secondo ARERA servono circa 5 giorni lavorativi per la luce, se non cambi venditore, e 4 per il gas.

Proposed (append):
> Questa guida è pubblicata da VERSUS, comparatore luce e gas, che ti fa confrontare gratis le offerte per la casa e per la partita IVA.

Reason: a "who publishes this" sentence fits a procedural guide where the reader wonders about the author; casa and partita IVA are ✅. It deliberately does not talk about the voltura itself, so it does not repeat the later section "Confronta le offerte su VERSUS" (line 298).

### 2.3 Subentro
File `guides.ts`, line 339 (`/guida/subentro-luce-gas`).

Current (exact):
> Il subentro è l'attivazione di una fornitura da parte di un nuovo cliente dopo che il precedente ha chiuso il contratto e il contatore è stato disattivato. Lo chiedi al venditore che scegli. Per la luce il distributore attiva di norma entro 5 giorni lavorativi, per il gas entro 10, secondo ARERA.

Proposed (append):
> Per il subentro puoi partire da VERSUS, comparatore luce e gas: indichi il tipo di fornitura e i consumi e vedi una stima della spesa mensile, IVA esclusa.

Reason: the intro says "lo chiedi al venditore che scegli", so the next step is choosing; the sentence describes the real flow (type of supply, consumption, monthly estimate excluding IVA, all ✅).

### 2.4 Primo allaccio
File `guides.ts`, line 434 (`/guida/primo-allaccio-luce-gas`).

Current (exact):
> “Primo allaccio” è un'etichetta commerciale: nelle pagine di ARERA si parla di allacciamento, il collegamento fisico fatto dal distributore, e di attivazione, l'avvio della fornitura. Per la luce puoi chiedere entrambi a un venditore, che inoltra la richiesta al distributore entro 2 giorni lavorativi. I tempi dei lavori dipendono dalla loro complessità.

Proposed (append):
> Se ti serve una nuova fornitura, VERSUS, comparatore luce e gas, ti aiuta a scegliere l'offerta e a richiederne l'attivazione online.

Reason: stays on the "attivazione" side only; the physical allacciamento is the distributor's job and the sentence does not claim VERSUS does it (online activation is ✅).

### 2.5 Come scegliere
File `guides.ts`, line 535 (`/guida/come-scegliere-offerta-luce-gas`).

Current (exact):
> Per scegliere un'offerta luce o gas guarda il tipo di prezzo (fisso o variabile), i tuoi consumi, le altre voci della bolletta e le condizioni del contratto, che trovi nella Scheda sintetica. Non esiste un'offerta giusta per tutti: dipende dai consumi e da come vuoi gestire il rischio di variazioni di prezzo.

Proposed (append):
> Per confrontare le offerte con questi criteri c'è VERSUS, comparatore luce e gas: è gratuito e mostra una stima della spesa mensile IVA esclusa.

Reason: connects the criteria listed in the answer to the tool that applies them; free and the IVA-excluded monthly estimate are ✅. No "migliore" (the guide test forbids it for the new guides).

### 2.6 Fine tutela
File `guides.ts`, line 658 (`/guida/fine-tutela-mercato-libero`).

Current (exact):
> Per la luce, dal 1 luglio 2024 la maggior tutela è riservata ai clienti vulnerabili. I clienti non vulnerabili che non avevano scelto il mercato libero sono nel Servizio a Tutele Graduali, che dal 1 aprile 2027 non sarà più disponibile. Per il gas, dal gennaio 2024 il servizio di tutela è riservato ai clienti vulnerabili. Le date sono quelle indicate da ARERA a novembre 2026: ricontrollale sul sito di ARERA.

Proposed (append):
> Se vuoi passare al mercato libero, puoi cercare l'offerta con VERSUS, comparatore luce e gas, indicando consumi e tipo di cliente.

Reason: placed after the ARERA date disclaimer so the facts stay first; describes only the input (consumption and customer type), with no claim about the right to switch or about savings.

---

## 3. Guide `<title>` suffix

Where it is built: there is no shared builder. The suffix is a literal in each guide's `title` field in `app/src/content/seo/guides.ts`, and `buildSeoMetadata` (`app/src/lib/seo/pages.ts:27-42`) reuses the same string for `<title>`, Open Graph and Twitter titles. Two places would need an edit if approved: the six `title` lines, and the assertion `g.title.endsWith("| VERSUS")` in `app/src/content/seo/guides.test.ts:12` (to `"| VERSUS luce e gas"`), plus the type comment in `app/src/content/seo/types.ts:22` (offers pages keep "| VERSUS", so the comment should say "ends with | VERSUS, or | VERSUS luce e gas for guides").

Appending the suffix to the current text exceeds 60 on all six (the left part already contains "luce e gas", which would also be duplicated). Proposed titles drop "luce e gas" from the left part, because the suffix now carries it.

| Guide | Line | Current title (chars) | Literal append (chars) | Proposed title (chars) |
|---|---|---|---|---|
| Cambio fornitore | 144 | Cambio fornitore luce e gas: come funziona \| VERSUS (51) | ...\| VERSUS luce e gas (62, over 60) | Cambio fornitore: come funziona \| VERSUS luce e gas (**51**) |
| Voltura | 234 | Voltura luce e gas: cos'è, documenti e tempi \| VERSUS (53) | 64, over 60 | Voltura: cos'è, documenti e tempi \| VERSUS luce e gas (**53**) |
| Subentro | 334 | Subentro luce e gas: quando serve e come si fa \| VERSUS (55) | 66, over 60 | Subentro: quando serve e come si fa \| VERSUS luce e gas (**55**) |
| Primo allaccio | 429 | Primo allaccio luce e gas: cos'è e come funziona \| VERSUS (57) | 68, over 60 | Primo allaccio: cos'è e come funziona \| VERSUS luce e gas (**57**) |
| Come scegliere | 530 | Come scegliere un'offerta luce e gas: guida \| VERSUS (52) | 63, over 60 | Come scegliere un'offerta: guida \| VERSUS luce e gas (**52**) |
| Fine tutela | 653 | Fine della tutela e mercato libero: cosa cambia \| VERSUS (56) | 67, over 60 | Fine della tutela e mercato libero \| VERSUS luce e gas (**54**) |

Flags:
- All six literal appends (62-68) are above 60 and are not proposed.
- All six proposed titles are at most 57 characters, so none needs a further alternative for length. Optional shorter variants: "Voltura: documenti e tempi | VERSUS luce e gas" (46), "Subentro: quando serve | VERSUS luce e gas" (42).
- Trade-off to decide: the left part no longer carries "luce e gas" next to the procedure name ("voltura luce e gas" would appear only as "Voltura" plus the suffix, in two separate word groups). A middle option is to keep the current titles unchanged and not do item 3.
- Fine tutela: the proposed title drops "cosa cambia". Alternative with it, 50 characters: "Fine della tutela: cosa cambia \| VERSUS luce e gas" (loses "mercato libero").

## Doubts on facts

- None of the 7 sentences uses a ⚠ fact. "Online activation" is ✅ (service row); "a few questions" is not used; "venditori con cui collaboriamo" is the approved coverage wording (SPEC #31).
- 2.4 (primo allaccio): "richiederne l'attivazione online" is the only wording that touches an operational claim for this procedure; the service row of canonical-facts lists primo allaccio among the online-activation cases, so it is ✅, but Giuseppe may want to confirm it matches the real flow before approving.
- The home explainer edit changes text that Giuseppe approved on 2026-11-07 (`docs/geo/bozze-round2.md` section 1); `llms.txt` line 11 still says "comparatore online gratuito di offerte luce e gas" (separate, invisible file; align it only if item 1 is approved).
