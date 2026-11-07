# Bozze round 2 di VERSUS (T19.4d)

Testi per l'approvazione di Giuseppe. Nessun codice è stato toccato. Dopo l'OK si costruiscono in T19.4e.

Notes (English, for Giuseppe and the builder):
- Customer copy is Italian and sits between `<!-- copy:start -->` and `<!-- copy:end -->`. Everything else in this file is notes. Word counts are for the copy only.
- Facts come only from `docs/geo/canonical-facts.md` (CF, only the confirmed rows) and VERIFIED entries of `docs/geo/fonti-guide.md` (FG, entry numbers). Three sentences come from the live product and are tagged `APP`: the live FAQ (`app/src/components/page1/faq.ts`), the estimate formula (PRD §8 and `app/src/lib/logic/pricing.ts`) and wording already approved in `bozze-pagine.md` (`BOZZE`). Giuseppe: please confirm the `APP` lines when you read the "facts used" tables.
- The two market-coverage and agent sentences are copied byte-identical from the live code (`COVERAGE` and `AGENT` constants in `app/src/content/seo/guides.ts`, same text as the CF rows):
  - "Confrontiamo le offerte dei venditori con cui collaboriamo, non tutte quelle disponibili sul mercato."
  - "VERSUS opera come agente ed è remunerato dai venditori."
- Dates in the regulation (1 July 2024, 1 April 2027, January 2024) come from ARERA pages that carry no date (FG header). Before building T19.4e, re-read the ARERA pages cited in each block, and re-check at every later update. The builder sets `reviewedOn` / `dateModified` to the real check date.
- Not in the copy on purpose: ARERA helpline number (FG 1.18, phone wording rule, see section 5), euro amounts, percentages, IVA rates, PUN/PSV values, the 24-hour luce switch (FG 1.10 UNVERIFIED), supplier names, personal names, phone, "migliore" claims, `sameAs`.
- Optional, needs your OK: links from the home block to the two new guides. Not written into the copy.

---

## 1. Home: testo sotto le FAQ

Placement: after the "Domande frequenti" section, same column and style as the other sections (`LandingSections`). One H2, five H3.

<!-- copy:start -->

## Come funziona il confronto luce e gas su VERSUS

VERSUS è un comparatore di offerte luce e gas per la casa e per la partita IVA. Scegli se confrontare luce, gas o luce e gas, indichi il tipo di fornitura e i consumi, e vedi le offerte dei venditori con cui collaboriamo, con una stima della spesa mensile IVA esclusa. Il confronto è gratuito. Se un'offerta fa per te, puoi attivarla online: cambio fornitore, subentro, voltura o primo allaccio.

### Quali offerte confrontiamo

Confrontiamo le offerte dei venditori con cui collaboriamo, non tutte quelle disponibili sul mercato. VERSUS opera come agente ed è remunerato dai venditori. Per te il confronto non ha costi.

Per avere una vista più ampia del mercato esiste il Portale Offerte, il sito gratuito e indipendente di ARERA, previsto dalla Legge Concorrenza del 2017, per confrontare le offerte di luce, gas e luce più gas: comprende offerte PLACET, di mercato libero e servizi di tutela.

### Come viene calcolata la stima

La stima parte dal consumo annuo. Per le abitazioni lo ricaviamo da persone in casa, elettrodomestici, usi del gas e zona climatica del comune; se conosci già il tuo consumo puoi inserirlo tu. Per la partita IVA lo indichi direttamente.

Per un'offerta a prezzo fisso la spesa mensile stimata è il consumo di un mese moltiplicato per il prezzo dell'energia dell'offerta, più le eventuali quote fisse mensili previste dall'offerta. È una stima, non una bolletta: per la luce la guida di ARERA distingue quattro voci (materia energia, trasporto e gestione del contatore, oneri di sistema, imposte) e il prezzo dell'offerta riguarda l'energia. Quanto paghi davvero dipende dai tuoi consumi reali. Tutte le stime sono IVA esclusa, così le offerte si confrontano sulla stessa base.

### Prezzo fisso o prezzo variabile

Con un'offerta a prezzo fisso il prezzo dell'energia resta invariato per un periodo stabilito dal contratto. Con un'offerta a prezzo variabile cambia in automatico a intervalli prestabiliti, seguendo un indice. Nelle offerte standard PLACET, ARERA usa come riferimento il PUN per la luce (indice che il GME definisce PUN Index GME) e la media mensile del PSV giorno prima per il gas.

Per le offerte variabili la Scheda sintetica deve indicare come funziona l'indicizzazione e il prezzo più alto dei 12 mesi precedenti, con il periodo. Né il prezzo fisso né il variabile sono giusti in assoluto: dipende da come vuoi gestire il rischio di variazioni.

### Mercato libero e servizi di tutela

Secondo ARERA, per la luce dal 1 luglio 2024 la maggior tutela è riservata ai clienti vulnerabili, mentre i clienti non vulnerabili che non avevano scelto il mercato libero sono passati al Servizio a Tutele Graduali, che dal 1 aprile 2027 non sarà più disponibile. Per il gas, dal gennaio 2024 il servizio di tutela è riservato ai clienti vulnerabili. Passare al mercato libero per la luce è gratuito, non richiede la sostituzione del contatore e non interrompe la fornitura.

### Le quattro situazioni più comuni

- Cambio fornitore: passi a un nuovo venditore, che avvia la procedura. Per il gas, secondo ARERA, il cambio non interrompe la fornitura.
- Subentro: attivi una fornitura il cui contatore era stato disattivato dopo la chiusura del contratto precedente.
- Voltura: cambia l'intestatario di un contratto già attivo. Per il gas, ARERA precisa che il venditore resta lo stesso e la fornitura non si interrompe.
- Primo allaccio: serve per una nuova fornitura e comprende il collegamento alla rete, fatto dal distributore, e l'attivazione della fornitura.

### Cosa controllare prima di firmare

Prima di firmare il venditore deve consegnarti la Scheda sintetica, con le condizioni principali e la spesa annua stimata. Per la luce, nei contratti a prezzo fisso e durata determinata può esserci una penale per il recesso anticipato: deve essere scritta nel contratto, firmata in modo specifico e riportata nella Scheda sintetica.

Per confrontare le offerte servono il consumo annuo in kWh e la potenza impegnata in kW, che trovi in bolletta. Lo storico dei consumi è consultabile sul Portale Consumi di ARERA con SPID o CIE.

<!-- copy:end -->

### Facts used (home block)

| Claim in the copy | Source ID |
|---|---|
| VERSUS compares luce, gas, luce + gas; casa and partita IVA; the four procedures; online activation | CF "Service" |
| Comparison is free; "Per te il confronto non ha costi" | CF "Cost to the customer" |
| Estimates shown IVA esclusa | CF "Estimates" |
| Coverage sentence, byte-identical | CF "Market coverage" |
| "VERSUS opera come agente ed è remunerato dai venditori." | CF "How VERSUS is paid" |
| Portale Offerte: official, covers PLACET, free-market offers, tutela services | FG 5.9 |
| Consumption from people, appliances, gas uses, climate zone; manual entry; partita IVA entered directly | APP (live FAQ "Come viene stimato il mio consumo?") |
| Fixed-price estimate = monthly consumption x energy price + monthly fixed fees, IVA excluded | APP (PRD §8, `pricing.ts`) |
| "Così le offerte si confrontano sulla stessa base" | BOZZE (`/offerte-luce-gas-partita-iva`, approved 2026-11-05) |
| Luce bill has four items; offer price concerns energy; real spend depends on consumption | FG 5.19 |
| Fixed price: invariant for the contract period; variable: automatic change at set intervals following an index | FG 5.10 (PLACET page), 5.11 |
| PLACET variable reference: PUN (luce), monthly average PSV day-ahead (gas); GME publishes PUN as PUN Index GME | FG 5.10, 5.14, 5.12, 5.15 |
| Variable offers: Scheda sintetica states the indexing and the highest price of the previous 12 months with the period | FG 5.11 |
| "Né fisso né variabile sono giusti in assoluto: dipende da come gestisci il rischio" | BOZZE (`/offerte-luce-gas`, approved); not a factual claim |
| Luce: maggior tutela only for vulnerable since 1 July 2024; non-vulnerable non-choosers moved to STG; STG not available from 1 April 2027 | FG 5.1, 5.2, 5.3 |
| Gas: tutela reserved to vulnerable customers since January 2024 | FG 5.6 |
| Switching to the free market (luce) is free, no meter replacement, no interruption | FG 1.7 |
| Cambio fornitore: incoming seller starts the procedure; gas: no interruption | FG 1.1, 1.6 |
| Subentro definition | FG 3.1 |
| Voltura: same seller, no interruption (gas) | FG 2.1 |
| Primo allaccio = connection by the distributor + activation of supply | FG 4.1, 4.10 (mapping; FG 4.0 notes "primo allaccio" is a commercial label, so the copy does not say ARERA uses the term) |
| Scheda sintetica before signing with main terms and estimated annual spend | FG 1.12 |
| Luce early-termination fee: fixed-price, fixed-term; stated in contract, specifically signed, in the Scheda sintetica | FG 1.4 |
| kWh and kW from the bill; Portale Consumi with SPID or CIE | FG 1.13 |
| [omitted: no verified source] gas bill items, IVA rates, savings, supplier names | not written |

---

## 2. Home: nuove righe FAQ

Five rows to add after the existing seven in `app/src/components/page1/faq.ts` (the FAQPage JSON-LD reads the same list, so the schema grows with them). None repeats an existing row: the live questions are free comparison, consumption estimate, the four procedures, IVA, ordering, market coverage, remuneration. Question 1 mirrors the People Also Ask wording of T19.1 on purpose and gives no verdict; if you dislike "più conveniente" in a question, use the alternative below the table.

<!-- copy:start -->

**Qual è l'offerta luce e gas più conveniente?**

Dipende dai tuoi consumi, dal tipo di prezzo (fisso o variabile) e dalle altre voci della bolletta, quindi non c'è una risposta valida per tutti. Su VERSUS inserisci i tuoi consumi e vedi una stima della spesa mensile, IVA esclusa, per le offerte dei venditori con cui collaboriamo, non per tutte quelle disponibili sul mercato.

**Meglio il prezzo fisso o il prezzo variabile?**

Dipende da come vuoi gestire il rischio. Il prezzo fisso resta invariato per il periodo di contratto; il variabile segue un indice e può salire o scendere. Nella Scheda sintetica di un'offerta variabile trovi come funziona l'indicizzazione e il prezzo più alto degli ultimi 12 mesi.

**Che cosa sono le offerte PLACET?**

Sono offerte standard che ogni venditore deve includere per famiglie e piccole imprese, a prezzo fisso e variabile, con durata indeterminata e condizioni economiche rinnovate ogni 12 mesi, con il venditore che informa il cliente delle nuove condizioni entro tre mesi dalla scadenza. ARERA ne fissa i termini contrattuali, e luce e gas non possono stare nello stesso contratto PLACET.

**Cosa succede il 1 aprile 2027 se non scelgo un'offerta?**

Secondo ARERA, dal 1 aprile 2027 il Servizio a Tutele Graduali per la luce non sarà più disponibile. I clienti non vulnerabili che non scelgono vengono spostati, senza interruzioni, su un'offerta di mercato libero del loro venditore, con durata minima di 12 mesi e senza penale per il recesso anticipato.

**Cos'è la Scheda sintetica?**

È il documento che il venditore deve consegnarti prima della firma, con le condizioni principali del contratto e la spesa annua stimata. Riporta anche le modalità e gli oneri per il recesso, e per le offerte variabili il meccanismo di indicizzazione. È il documento pensato per confrontare le offerte.

<!-- copy:end -->

Alternative to question 1, if you prefer: "Come capisco quale offerta luce e gas fa per me?" (same answer).

### Facts used (FAQ rows)

| Row | Claim | Source ID |
|---|---|---|
| 1 | Cost depends on consumption, price type, other bill items | FG 5.19, 5.11 (general), no claim of "cheapest" |
| 1 | Estimate IVA esclusa; coverage wording (first half is the CF sentence adapted; the second half repeats the CF clause) | CF "Estimates", CF "Market coverage" |
| 2 | Fixed vs variable; indexing mechanism and highest price of 12 months in the Scheda sintetica | FG 5.10, 5.11 |
| 2 | "Dipende da come vuoi gestire il rischio" | BOZZE (approved), not a factual claim |
| 3 | PLACET: every seller must include them for households and small businesses; fixed and variable; indefinite term; renewed every 12 months with at least three months' notice; ARERA fixes terms; luce and gas not bundled | FG 5.10 |
| 4 | STG ends 1 April 2027; non-vulnerable non-choosers moved without interruption to a free-market offer of their STG seller; minimum 12 months; no early-termination fee | FG 5.3 (FG notes that 5.3 describes households: the answer says "clienti non vulnerabili" as ARERA does and does not mention businesses) |
| 4 | [omitted: no verified source] what happens to businesses after 1 April 2027 | FG 5.5, "not verified" item 10 |
| 5 | Scheda sintetica given before signing, main terms and estimated annual spend | FG 1.12 |
| 5 | Section "Modalità e oneri per il recesso" | FG 1.4 |
| 5 | Indexing mechanism for variable offers | FG 5.11 |
| 5 | "Pensato per confrontare" | BOZZE (`/guida/cambio-fornitore-luce-gas`, approved) |

---

## 3. Guida /guida/come-scegliere-offerta-luce-gas

<!-- copy:start -->

**Titolo Google:** Come scegliere un'offerta luce e gas: guida | VERSUS

**Descrizione Google:** Come scegliere un'offerta luce e gas: dati da avere, prezzo fisso o variabile, PLACET, Scheda sintetica e controlli prima di firmare. Guida basata su ARERA.

# Come scegliere un'offerta luce e gas

Per scegliere un'offerta luce o gas guarda il tipo di prezzo (fisso o variabile), i tuoi consumi, le altre voci della bolletta e le condizioni del contratto, che trovi nella Scheda sintetica. Non esiste un'offerta giusta per tutti: dipende dai consumi e da come vuoi gestire il rischio di variazioni di prezzo.

### I dati da avere in mano

Per confrontare le offerte luce servono il consumo annuo in kWh e la potenza impegnata in kW, che trovi in bolletta. Per il gas il consumo si misura in Smc, gli standard metri cubi usati in fattura. Se non hai la bolletta, lo storico dei consumi è consultabile sul Portale Consumi di ARERA con SPID o CIE.

### Che cosa comprende il prezzo di un'offerta

Il prezzo di un'offerta riguarda l'energia: per la luce in €/kWh, per il gas in €/Smc. Non è la bolletta intera. Per la luce la guida di ARERA indica quattro voci:

- materia energia: l'attività di fornitura del venditore, con una parte fissa annua e una parte legata ai kWh consumati;
- trasporto e gestione del contatore: una tariffa fissata da ARERA con criteri uguali in tutta Italia;
- oneri di sistema: costi di interesse generale pagati da tutti i clienti;
- imposte: l'accisa sull'energia consumata e l'IVA sul totale della bolletta.

Molte voci sono aggiornate periodicamente da ARERA, anche ogni trimestre: per questo qui non trovi i loro valori.

### Prezzo fisso o prezzo variabile

Con un'offerta a prezzo fisso il prezzo dell'energia resta invariato per un periodo stabilito dal contratto. Con un'offerta a prezzo variabile il prezzo cambia in automatico a intervalli prestabiliti, seguendo un indice, e può salire o scendere.

Nessuna delle due è giusta in assoluto: la scelta dipende da quanto vuoi poter prevedere la spesa. Per le offerte variabili la Scheda sintetica deve indicare il meccanismo di indicizzazione e il prezzo più alto dei 12 mesi precedenti, con il periodo a cui si riferisce.

### Cosa sono le offerte PLACET

PLACET significa Prezzo Libero A Condizioni Equiparate di Tutela. Sono offerte standard che ogni venditore deve includere per famiglie e piccole imprese, in una versione a prezzo fisso e in una a prezzo variabile. Hanno durata indeterminata, con condizioni economiche rinnovate ogni 12 mesi, con il venditore che informa il cliente delle nuove condizioni entro tre mesi dalla scadenza. ARERA ne fissa i termini contrattuali, e luce e gas non possono stare nello stesso contratto PLACET.

### PUN e PSV: gli indici delle offerte variabili

Nel PLACET a prezzo variabile ARERA usa come riferimento il PUN per la luce e la media mensile del PSV giorno prima per il gas.

Il GME, il gestore del mercato elettrico, definisce il PUN Index GME come il prezzo di riferimento dell'energia elettrica scambiata sul mercato del giorno prima (MGP); nelle pagine di ARERA per le offerte PLACET luce l'indice è ancora indicato come PUN. Il PSV, Punto di Scambio Virtuale, è il punto virtuale in cui si scambia e si trasferisce il gas. Non riportiamo i loro valori, che cambiano di continuo.

### I controlli prima di firmare

- Scheda sintetica: prima di firmare il venditore deve consegnartela, con le condizioni principali e la spesa annua stimata.
- Recesso anticipato: per la luce, nei contratti a prezzo fisso e durata determinata può esserci una penale. Deve essere scritta nel contratto, firmata in modo specifico e riportata nella Scheda sintetica, alla voce «Modalità e oneri per il recesso».
- Costi alla firma: di norma cambiare venditore non costa nulla, ma possono esserci imposta di bollo e deposito cauzionale, se previsti.
- Ripensamento: per i clienti domestici dura 14 giorni se il contratto è firmato a distanza o fuori dai locali del venditore, 30 giorni in caso di visita a domicilio non richiesta.

### Casa o partita IVA

Le regole per leggere un'offerta sono le stesse. I prezzi e le stime di VERSUS sono IVA esclusa, anche per la partita IVA. Aliquote e trattamento fiscale dipendono dalla tua attività e vanno chiariti con il tuo commercialista. Le offerte PLACET sono previste anche per le piccole imprese.

### Se sei ancora in un servizio di tutela

Secondo ARERA, la maggior tutela per la luce (dal 1 luglio 2024) e il servizio di tutela per il gas (dal gennaio 2024) sono riservati ai clienti vulnerabili, e il Servizio a Tutele Graduali dal 1 aprile 2027 non sarà più disponibile. Trovi i dettagli nella guida «Fine della tutela e passaggio al mercato libero».

### Un confronto più ampio

Il Portale Offerte è il sito gratuito e indipendente di ARERA, previsto dalla Legge Concorrenza del 2017, per confrontare le offerte di luce, gas e luce più gas: comprende offerte PLACET, di mercato libero e servizi di tutela.

### Confronta le offerte su VERSUS

Su VERSUS scegli luce, gas o luce e gas, indichi se sei una casa o una partita IVA e inserisci i consumi: vedi le offerte in elenco con una stima della spesa mensile, IVA esclusa, e la scelta resta tua. Confrontiamo le offerte dei venditori con cui collaboriamo, non tutte quelle disponibili sul mercato. VERSUS opera come agente ed è remunerato dai venditori. Per te il confronto è gratuito.

### Domande frequenti

**Qual è l'offerta luce e gas più conveniente?**

Dipende dai consumi, dal tipo di prezzo e dalle altre voci della bolletta, quindi non c'è una risposta valida per tutti. Confronta la spesa annua stimata nella Scheda sintetica di più offerte e leggi le condizioni, compresa la durata e il recesso.

**Il prezzo che vedo è quanto pagherò in bolletta?**

No. È il prezzo dell'energia. La bolletta comprende anche trasporto e gestione del contatore, oneri di sistema e imposte, e dipende da quanto consumi davvero.

**Meglio il prezzo fisso o il prezzo variabile?**

Dipende da come vuoi gestire il rischio. Il prezzo fisso resta invariato per il periodo di contratto; il variabile segue un indice e può salire o scendere.

**Posso ripensarci dopo aver firmato?**

Secondo le pagine di ARERA, per i clienti domestici il ripensamento dura 14 giorni se il contratto è firmato a distanza o fuori dai locali del venditore, e 30 giorni in caso di visita a domicilio non richiesta.

### Fonti

- [ARERA, guida alla lettura delle voci di spesa](https://www.arera.it/bolletta/guida-alla-lettura-delle-voci-di-spesa)
- [ARERA, spesa per il trasporto e la gestione del contatore](https://www.arera.it/atlante-per-il-consumatore/elettricita/la-bolletta/cosa-si-paga/cosa-e-la-spesa-per-il-trasporto-e-la-gestione-del-contatore)
- [ARERA, offerte standard PLACET](https://www.arera.it/consumatori/offerte-standard-per-i-clienti-finali-placet)
- [ARERA, cosa sono le offerte a prezzo variabile](https://www.arera.it/atlante-per-il-consumatore/gas/il-mercato-dellenergia/le-offerte-commerciali/cosa-sono-le-offerte-a-prezzo-variabile)
- [ARERA, il coefficiente di correzione dei volumi C](https://www.arera.it/en/atlante-per-il-consumatore/gas/la-bolletta/letture-e-consumi/che-cose-il-coefficiente-di-correzione-dei-volumi-denominato-c)
- [ARERA, cambiare venditore ha un costo (luce)](https://www.arera.it/atlante-per-il-consumatore/elettricita/il-mercato-dellenergia/il-mercato-libero/cambiare-venditore-ha-un-costo)
- [ARERA, quanto tempo serve per passare dal vecchio al nuovo venditore (gas)](https://www.arera.it/atlante-per-il-consumatore/gas/il-mercato-dellenergia/il-mercato-libero/quanto-tempo-serve-per-passare-dal-vecchio-al-nuovo-venditore)
- [ARERA, clienti vulnerabili e Servizio a Tutele Graduali](https://www.arera.it/consumatori/clienti-vulnerabili-e-servizio-tutele-graduali-1)
- [ARERA, fine della tutela per la luce](https://www.arera.it/consumatori/fine-tutela-ele)
- [ARERA, fine della tutela per il gas](https://www.arera.it/consumatori/fine-tutela-gas-cosa-fare)
- [GME, PUN Index GME](https://www.mercatoelettrico.org/it-it/Home/Pubblicazioni/Indici-GME/PUNIndexGme)
- [GME, glossario](https://www.mercatoelettrico.org/Home/Glossario)
- [Portale Offerte di ARERA](https://www.ilportaleofferte.it)

<!-- copy:end -->

### Facts used (guide A)

| Claim in the copy | Source ID |
|---|---|
| Choose by price type, consumption, other bill items, contract terms in the Scheda sintetica | FG 5.19, 5.11, 1.12 |
| "Non esiste un'offerta giusta per tutti" / "nessuna offerta come la migliore" | editorial stance, no factual claim (matches canonical ⚠ "savings claims") |
| kWh and kW from the bill; Portale Consumi with SPID or CIE | FG 1.13 |
| Gas billed in Smc (standard cubic metres) | FG 5.17 |
| Price in €/kWh (luce) and €/Smc (gas); not the whole bill | BOZZE (`/offerte-luce-gas`, `/offerte-gas`, approved), FG 5.19 |
| Four luce bill items, content of each | FG 5.19, 5.20 |
| Items updated periodically, some quarterly; no values published | FG 5.19, 5.22 |
| [omitted: no verified source] gas bill structure (FG 5.21), euro or percentage values (FG publishing rule 1), IVA rates (FG 5.24, 5.25) | not written |
| Fixed: invariant for the contract period; variable: automatic change at set intervals following an index; highest price of 12 months in the Scheda sintetica | FG 5.10, 5.11 |
| "Può salire o scendere"; "la scelta dipende da quanto vuoi poter prevedere la spesa" | logical consequence of the FG 5.11 definitions, no number |
| [omitted: no verified source] the "at least 12 months" length of a fixed price | FG 5.11 UNVERIFIED part |
| PLACET: meaning of the acronym, every seller, households and small businesses, fixed and variable versions, indefinite term, 12 months renewal with three months' notice, ARERA fixes terms, no luce + gas bundle | FG 5.10 |
| PLACET variable references: PUN (luce), monthly average PSV day-ahead (gas) | FG 5.10, 5.14, 5.15 |
| GME defines PUN; published as PUN Index GME; still often written PUN in ARERA pages | FG 5.12, 5.14 |
| [omitted: no verified source] that PUN Index GME has replaced PUN since 1 January 2025 | FG 5.13 UNVERIFIED |
| PSV: virtual trading point, exchanges and transfers of gas | FG 5.15 |
| No PUN/PSV values published | FG 5.16 |
| Scheda sintetica before signing, main terms and estimated annual spend | FG 1.12 |
| Luce early-termination penalty rules and "Modalità e oneri per il recesso" | FG 1.4 |
| Costs at signing: bollo, deposito cauzionale if applicable; switching normally free | FG 1.3, 1.5 |
| Ripensamento 14 and 30 days for domestic customers | FG 1.11 (the ARERA page is in the gas section, so the FAQ says "pagine di ARERA") |
| [omitted: no verified source] whether ripensamento covers business customers | FG 5.30 UNVERIFIED |
| Estimates IVA esclusa, also for partita IVA; fiscal treatment to be clarified with the commercialista | CF "Estimates", FG 5.26, BOZZE (`/offerte-luce-gas-partita-iva`, approved) |
| PLACET also for small businesses | FG 5.10 |
| Luce maggior tutela only for vulnerable since 1 July 2024; gas tutela since January 2024; STG not available from 1 April 2027 | FG 5.1, 5.2, 5.3, 5.6 |
| Portale Offerte description | FG 5.9 |
| VERSUS flow, IVA esclusa, coverage, agent, free comparison | CF rows (byte-identical sentences) |

---

## 4. Guida /guida/fine-tutela-mercato-libero

<!-- copy:start -->

**Titolo Google:** Fine della tutela e mercato libero: cosa cambia | VERSUS

**Descrizione Google:** Fine della maggior tutela e del Servizio a Tutele Graduali per luce e gas: date, clienti vulnerabili e cosa fare prima del 1 aprile 2027. Guida basata su ARERA.

# Fine della tutela e passaggio al mercato libero

Per la luce, dal 1 luglio 2024 la maggior tutela è riservata ai clienti vulnerabili. I clienti non vulnerabili che non avevano scelto il mercato libero sono nel Servizio a Tutele Graduali, che dal 1 aprile 2027 non sarà più disponibile. Per il gas, dal gennaio 2024 il servizio di tutela è riservato ai clienti vulnerabili. Le date sono quelle indicate da ARERA a novembre 2026: ricontrollale sul sito di ARERA.

### Cosa è cambiato per la luce

Secondo ARERA, dal 1 luglio 2024 la maggior tutela per la luce può essere scelta solo dai clienti vulnerabili. Rientrano:

- chi ha 75 anni o più;
- chi riceve il bonus sociale elettrico;
- chi riceve il bonus per gravi condizioni di salute;
- chi ha una disabilità riconosciuta dalla legge 104 del 1992;
- chi vive in un'abitazione di emergenza dopo un evento calamitoso;
- chi è servito su isole minori non interconnesse.

I clienti non vulnerabili che non avevano scelto un contratto di mercato libero sono passati dal 1 luglio 2024 al Servizio a Tutele Graduali, con il venditore assegnato alla loro zona.

### Cosa succede il 1 aprile 2027

Dal 1 aprile 2027 il Servizio a Tutele Graduali non è più disponibile: resta per i clienti senza venditore. I clienti non vulnerabili che non scelgono un'offerta sono spostati, senza interruzioni e senza un nuovo contratto da firmare, su un'offerta di mercato libero del loro venditore del servizio.

Secondo ARERA quell'offerta ha durata minima di 12 mesi e nessuna penale per il recesso anticipato, ed è quella con la spesa annua stimata più bassa tra le offerte che il venditore rende disponibili ai clienti del servizio a dicembre 2026. A dicembre 2026 il cliente riceve una sintesi dell'offerta; i documenti completi possono arrivare entro il 31 marzo 2027.

I clienti vulnerabili ancora nel Servizio a Tutele Graduali passano dal 1 aprile 2027 al Servizio di Maggior Tutela. Chi non è stato ancora identificato come vulnerabile può dichiararlo con un modulo allegato alle bollette da settembre 2026.

### Cosa è cambiato per il gas

Secondo ARERA, dal gennaio 2024 il servizio di tutela per il gas può essere scelto solo dai clienti vulnerabili. I clienti domestici non vulnerabili sono passati al mercato libero, e chi non ha fatto nulla è passato a un'offerta PLACET. Sono vulnerabili, per il gas:

- gli intestatari con 75 anni o più;
- chi riceve il bonus sociale gas;
- chi ha una disabilità riconosciuta dalla legge 104 del 1992;
- chi vive in un'abitazione di emergenza dopo un evento calamitoso.

### Partita IVA e microimprese

ARERA distingue le microimprese (meno di 10 dipendenti e fatturato fino a 2 milioni di euro) dalle piccole imprese (da 10 a 50 dipendenti e/o fatturato tra 2 e 10 milioni di euro, con punti di prelievo in bassa tensione). Conta la dimensione, non la sola partita IVA.

Il Servizio a Tutele Graduali ha riguardato le microimprese e gli altri clienti non domestici con punti di prelievo fino a 15 kW dal 1 aprile 2023, le piccole imprese dal 1 luglio 2024. Le liste di questi clienti arrivano fino al 31 marzo 2027. Per sapere cosa accade a un'attività dopo quella data, verifica sulle pagine di ARERA o chiedilo al tuo venditore attuale.

### Passare al mercato libero: cosa c'è da sapere

Per la luce, passare al mercato libero è gratuito, non richiede la sostituzione del contatore e non interrompe la fornitura. Per il gas il cambio di venditore non causa interruzioni né interventi sul contatore o sugli impianti. Alla firma possono esserci imposta di bollo e deposito cauzionale, se previsti.

Prima di firmare il venditore deve consegnarti la Scheda sintetica, con le condizioni principali e la spesa annua stimata. Per confrontare le offerte servono il consumo annuo in kWh e la potenza impegnata in kW, che trovi in bolletta; lo storico dei consumi è sul Portale Consumi di ARERA con SPID o CIE. Come leggere le offerte lo spieghiamo nella guida «Come scegliere un'offerta luce e gas».

### Un confronto più ampio

Il Portale Offerte è il sito gratuito e indipendente di ARERA, previsto dalla Legge Concorrenza del 2017, per confrontare le offerte di luce, gas e luce più gas: comprende offerte PLACET, di mercato libero e servizi di tutela.

### Confronta le offerte su VERSUS

Se vuoi scegliere tu, apri il confronto di VERSUS: indichi luce, gas o luce e gas, il tipo di cliente e i consumi, e vedi le offerte in elenco con una stima IVA esclusa. Confrontiamo le offerte dei venditori con cui collaboriamo, non tutte quelle disponibili sul mercato. VERSUS opera come agente ed è remunerato dai venditori. Per te il confronto è gratuito.

### Domande frequenti

**Cosa succede il 1 aprile 2027 se non scelgo un'offerta?**

Per la luce, secondo ARERA, il cliente non vulnerabile che non sceglie viene spostato, senza interruzioni, su un'offerta di mercato libero del venditore del servizio, con durata minima di 12 mesi e senza penale per il recesso anticipato.

**Chi può restare in maggior tutela per la luce?**

Solo i clienti vulnerabili: per esempio chi ha 75 anni o più, chi riceve il bonus sociale elettrico o chi ha una disabilità riconosciuta dalla legge 104 del 1992.

**La tutela del gas esiste ancora?**

Sì, ma dal gennaio 2024 solo per i clienti vulnerabili, secondo ARERA. Gli altri clienti domestici sono passati al mercato libero.

**Passare al mercato libero interrompe la luce o il gas?**

No. Per la luce passare al mercato libero è gratuito, non richiede la sostituzione del contatore e non interrompe la fornitura; per il gas il cambio non causa interruzioni né interventi sul contatore.

**Sono un cliente vulnerabile e non l'ho ancora dichiarato: cosa posso fare?**

Secondo ARERA, i clienti non ancora identificati possono dichiarare la vulnerabilità con un modulo allegato alle bollette da settembre 2026. Per la tua situazione, rivolgiti al tuo venditore.

### Fonti

- [ARERA, fine della tutela per la luce](https://www.arera.it/consumatori/fine-tutela-ele)
- [ARERA, clienti vulnerabili e Servizio a Tutele Graduali](https://www.arera.it/consumatori/clienti-vulnerabili-e-servizio-tutele-graduali-1)
- [ARERA, il Servizio a Tutele Graduali](https://www.arera.it/consumatori/il-servizio-a-tutele-graduali)
- [ARERA, fine della tutela per il gas](https://www.arera.it/consumatori/fine-tutela-gas-cosa-fare)
- [ARERA, offerte standard PLACET](https://www.arera.it/consumatori/offerte-standard-per-i-clienti-finali-placet)
- [ARERA, se cambio venditore può interrompersi la fornitura (gas)](https://www.arera.it/atlante-per-il-consumatore/gas/il-mercato-dellenergia/il-mercato-libero/se-cambio-venditore-puo-interrompersi-fornitura)
- [ARERA, cambiare venditore ha un costo (luce)](https://www.arera.it/atlante-per-il-consumatore/elettricita/il-mercato-dellenergia/il-mercato-libero/cambiare-venditore-ha-un-costo)
- [Portale Offerte di ARERA](https://www.ilportaleofferte.it)

<!-- copy:end -->

### Facts used (guide B)

| Claim in the copy | Source ID |
|---|---|
| Luce: maggior tutela chosen only by vulnerable customers since 1 July 2024; the six vulnerability criteria | FG 5.1 |
| Non-vulnerable non-choosers in STG from 1 July 2024 with the seller assigned to their zone | FG 5.2 |
| STG not available from 1 April 2027 (reserved to customers without a seller); non-vulnerable non-choosers moved without interruption or new contract to a free-market offer of their STG seller; minimum 12 months; no early-termination fee; the lowest estimated annual spend among the seller's STG-available offers in December 2026; summary in December 2026; full documents possibly by 31 March 2027 | FG 5.3 |
| Vulnerable customers in STG go to Servizio di Maggior Tutela from 1 April 2027; undeclared can declare with a form attached to bills from September 2026 | FG 5.4 (ARERA wording kept; the decree wording "servizio di vulnerabilità" in FG 5.4 is UNVERIFIED and not used) |
| Gas: tutela only for vulnerable since January 2024; non-vulnerable domestic customers to the free market, non-choosers to PLACET; the four vulnerability criteria | FG 5.6 |
| [not used, to save space] gas vulnerability service price mechanism and CMEM,m | FG 5.7, 5.8 |
| Microimpresa and small business definitions | FG 5.29 |
| STG scope for microimprese and non-domestic customers up to 15 kW from 1 April 2023, small businesses from 1 July 2024, lists to 31 March 2027 | FG 5.5 |
| [omitted: no verified source] what happens to businesses on 1 April 2027 (the copy sends the reader to ARERA or the seller) | FG 5.5, "not verified" item 10 |
| Switching to the free market (luce): free, no meter replacement, no interruption | FG 1.7 |
| Gas: switching causes no interruption and no technical intervention | FG 1.6 |
| Bollo and deposito cauzionale at signing, if applicable | FG 1.3, 1.5 |
| Scheda sintetica | FG 1.12 |
| kWh, kW, Portale Consumi | FG 1.13 |
| Portale Offerte description | FG 5.9 |
| "Le date sono quelle indicate da ARERA a novembre 2026: ricontrollale sul sito" | editorial hedge required by FG header (pages are undated); the builder keeps the month equal to the real check date |
| [omitted: no verified source] ARERA toll-free helpline (FG 1.18 is VERIFIED but the number and hours can change, and the project rule bans phone wording before the thank-you page: your call whether to allow an ARERA number in a guide) | not written |
| [omitted: no verified source] CMEM,m monthly values and the 0,038520 GJ/Smc figure | FG 5.8, 5.18 (not published by FG rule) |
| VERSUS flow, IVA esclusa, coverage, agent, free comparison | CF rows (byte-identical sentences) |

---

## 5. Open points for Giuseppe

1. Question 1 of the FAQ and of guide A contains "più conveniente" (to match the People Also Ask questions) but answers without a verdict. Approve or use the alternative wording.
2. Three `APP` lines (consumption inputs, estimate formula for fixed offers, "così le offerte si confrontano sulla stessa base") come from the live product, not from CF. Confirm them.
3. ARERA helpline number: left out. Say if you want it in guide B.
4. The ARERA dates in blocks 2, 3, 4 were read on 2026-11-05 (FG). Re-read the ARERA pages the day before building T19.4e.
5. Optional internal links from the home block to the two new guides, and from each new guide to the four existing ones: not written, your OK needed.
