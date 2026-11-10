# Drafts — home FAQ rows from People Also Ask (T23.3), 2026-11-10

Status: **approved by Giuseppe on 2026-11-10 ("Approvo tutte e 3")** (decision 2026-11-07: new FAQ rows are OK once the text is approved).

Source of the questions: People Also Ask box of google.it for "comparatore luce e gas" (`docs/geo/panel-2026-11-09.md`). Facts: `canonical-facts.md` (free, coverage sentence, estimates IVA esclusa) and VERIFIED entries FG 5.9, FG 6.1 (Portale Offerte: public, free, covers luce, gas and dual fuel), FG 5.10, 5.11, 5.19 (cost depends on consumption, price type, bill items). No new fact. Answers are shorter than, and worded differently from, the guide `/guida/come-funziona-comparatore-luce-gas`.

Rows go at the end of the home FAQ (`app/src/components/page1/faq.ts`), 12 → 15 rows; FAQPage JSON-LD and `/llms-full.txt` follow the list.

## Row 13
**Qual è il miglior comparatore di luce e gas?**
Non c'è un comparatore adatto a tutti: cambiano i venditori inclusi, l'ordine dei risultati e i servizi dopo la scelta. Il Portale Offerte di ARERA è lo strumento pubblico e gratuito, con la copertura più ampia. VERSUS confronta le offerte dei venditori con cui collaboriamo, non tutte quelle disponibili sul mercato.

## Row 14
**Qual è la compagnia che fa pagare meno luce e gas?**
Dipende dai tuoi consumi, dal tipo di prezzo (fisso o variabile) e dalle altre voci della bolletta: non c'è una compagnia più economica per tutti. Su VERSUS inserisci i consumi e vedi una stima della spesa mensile, IVA esclusa, per le offerte dei venditori con cui collaboriamo.

## Row 15
**Dove posso trovare un comparatore del prezzo del gas?**
Puoi usare il Portale Offerte di ARERA, che copre luce, gas e luce più gas, oppure un comparatore privato come VERSUS: scegli «Gas» e inserisci il consumo annuo in Smc, che trovi in bolletta.

Builder note: the coverage sentence ("le offerte dei venditori con cui collaboriamo, non tutte quelle disponibili sul mercato") must stay byte-identical to `canonical-facts.md`. No phone, no savings figure, no "migliore offerta" verdict.
