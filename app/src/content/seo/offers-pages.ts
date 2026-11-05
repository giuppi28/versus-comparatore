import type { OffersSeoPage } from "./types";

const COVERAGE =
  "Confrontiamo le offerte dei venditori con cui collaboriamo, non tutte quelle disponibili sul mercato.";
const AGENT = "VERSUS opera come agente ed è remunerato dai venditori.";
const REVIEWED = "2026-11-05";

const SRC_BILL = {
  label: "ARERA, guida alla lettura delle voci di spesa",
  url: "https://www.arera.it/bolletta/guida-alla-lettura-delle-voci-di-spesa",
};
const SRC_PLACET = {
  label: "ARERA, offerte standard PLACET",
  url: "https://www.arera.it/consumatori/offerte-standard-per-i-clienti-finali-placet",
};
const SRC_VARIABLE = {
  label: "ARERA, cosa sono le offerte a prezzo variabile",
  url: "https://www.arera.it/atlante-per-il-consumatore/gas/il-mercato-dellenergia/le-offerte-commerciali/cosa-sono-le-offerte-a-prezzo-variabile",
};
const SRC_PORTALE = {
  label: "Portale Offerte di ARERA",
  url: "https://www.ilportaleofferte.it",
};
const SRC_PUN = {
  label: "GME, PUN Index GME",
  url: "https://www.mercatoelettrico.org/it-it/Home/Pubblicazioni/Indici-GME/PUNIndexGme",
};
const SRC_GLOSSARY = {
  label: "GME, glossario",
  url: "https://www.mercatoelettrico.org/Home/Glossario",
};
const SRC_END_TUTELA_ELE = {
  label: "ARERA, fine della tutela per la luce",
  url: "https://www.arera.it/consumatori/fine-tutela-ele",
};
const SRC_END_TUTELA_GAS = {
  label: "ARERA, fine della tutela per il gas",
  url: "https://www.arera.it/consumatori/fine-tutela-gas-cosa-fare",
};
const SRC_STG_CLIENTS = {
  label: "ARERA, clienti vulnerabili e Servizio a Tutele Graduali",
  url: "https://www.arera.it/consumatori/clienti-vulnerabili-e-servizio-tutele-graduali-1",
};
const SRC_STG_BUSINESS = {
  label: "ARERA, il Servizio a Tutele Graduali",
  url: "https://www.arera.it/consumatori/il-servizio-a-tutele-graduali",
};
const SRC_SWITCH_COST_ELE = {
  label: "ARERA, cambiare venditore ha un costo (luce)",
  url: "https://www.arera.it/atlante-per-il-consumatore/elettricita/il-mercato-dellenergia/il-mercato-libero/cambiare-venditore-ha-un-costo",
};
const SRC_RECESSO_GAS = {
  label: "ARERA, il recesso ha un costo (gas)",
  url: "https://www.arera.it/atlante-per-il-consumatore/gas/il-contratto/recesso/il-recesso-ha-un-costo",
};
const SRC_GAS_C = {
  label: "ARERA, il coefficiente di correzione dei volumi C",
  url: "https://www.arera.it/en/atlante-per-il-consumatore/gas/la-bolletta/letture-e-consumi/che-cose-il-coefficiente-di-correzione-dei-volumi-denominato-c",
};
const SRC_CMEM = {
  label: "ARERA, valore CMEM,m per i clienti vulnerabili",
  url: "https://www.arera.it/area-operatori/prezzi-e-tariffe/valore-cmemm-vulnerabili",
};
const SRC_TRANSPORT = {
  label: "ARERA, spesa per il trasporto e la gestione del contatore",
  url: "https://www.arera.it/atlante-per-il-consumatore/elettricita/la-bolletta/cosa-si-paga/cosa-e-la-spesa-per-il-trasporto-e-la-gestione-del-contatore",
};

export const OFFERS_PAGES: OffersSeoPage[] = [
  // ---------------------------------------------------------------------
  {
    path: "/offerte-luce-gas",
    title: "Offerte luce e gas per casa e partita IVA: prezzi | VERSUS",
    description:
      "Le offerte luce e gas presenti su VERSUS per casa e partita IVA: come leggere il prezzo, fisso o variabile, e cosa controllare prima di firmare.",
    h1: "Offerte luce e gas",
    intro:
      "Qui trovi le offerte luce e gas presenti su VERSUS, per casa e per partita IVA. Il prezzo mostrato è quello dell'energia, al netto di IVA: la spesa finale dipende dai tuoi consumi e dalle altre voci della bolletta. Prima di scegliere guarda il tipo di prezzo, le condizioni e la Scheda sintetica.",
    listings: [
      { heading: "Offerte luce per la casa", commodity: "luce", customerType: "casa" },
      { heading: "Offerte gas per la casa", commodity: "gas", customerType: "casa" },
      { heading: "Offerte luce per partita IVA", commodity: "luce", customerType: "business" },
      { heading: "Offerte gas per partita IVA", commodity: "gas", customerType: "business" },
    ],
    sections: [
      {
        heading: "Cosa trovi in questa pagina",
        paragraphs: [
          "Questa pagina raccoglie le offerte luce e gas presenti su VERSUS in quattro elenchi: luce casa, gas casa, luce partita IVA e gas partita IVA. Gli elenchi sono letti dal nostro archivio e seguono le offerte.",
          "Non è il modulo di confronto: nel modulo inserisci i tuoi consumi e ottieni una stima personalizzata, qui dai un primo sguardo alle offerte senza lasciare dati.",
          `${COVERAGE} ${AGENT} Per te il confronto è gratuito.`,
        ],
      },
      {
        heading: "Come leggere il prezzo di un'offerta",
        paragraphs: [
          "Il prezzo accanto a ogni offerta è quello dell'energia: per la luce in €/kWh, per il gas in €/Smc, oppure, nelle offerte a prezzo variabile, lo spread da sommare a un indice di riferimento. Tutti i prezzi sono al netto di IVA.",
          "Quanto spenderai dipende dai consumi e dalle altre voci della bolletta. Per la luce la guida di ARERA ne indica quattro:",
        ],
        bullets: [
          "materia energia: l'attività di fornitura del venditore, con una parte fissa annua e una parte legata ai kWh consumati;",
          "trasporto e gestione del contatore: una tariffa fissata da ARERA con criteri uguali in tutta Italia;",
          "oneri di sistema: costi di interesse generale pagati da tutti i clienti;",
          "imposte: l'accisa sull'energia consumata e l'IVA sul totale della bolletta.",
        ],
      },
      {
        heading: "Prezzo fisso o prezzo variabile",
        paragraphs: [
          "Con un'offerta a prezzo fisso il prezzo dell'energia resta invariato per un periodo stabilito dal contratto. Con un'offerta a prezzo variabile cambia in automatico a intervalli prestabiliti, seguendo un indice. Per le offerte variabili la Scheda sintetica deve indicare il meccanismo di indicizzazione e il prezzo più alto dei 12 mesi precedenti, con il periodo a cui si riferisce.",
          "Le offerte standard PLACET (Prezzo Libero A Condizioni Equiparate di Tutela) sono un esempio: ogni venditore deve includerle per famiglie e piccole imprese, a prezzo fisso e variabile, con durata indeterminata e condizioni rinnovate ogni 12 mesi con almeno tre mesi di preavviso. ARERA ne fissa i termini e luce e gas non possono stare nello stesso contratto PLACET.",
          "Come riferimento all'ingrosso, nel PLACET variabile ARERA usa il PUN per la luce e la media mensile del PSV giorno prima per il gas. Il PUN è calcolato dal GME, che lo pubblica come PUN Index GME. Il PSV, Punto di Scambio Virtuale, è il punto in cui si scambia il gas.",
        ],
      },
      {
        heading: "Cosa controllare prima di firmare",
        paragraphs: [
          "Un'offerta si valuta con pochi controlli, da fare sulla documentazione del venditore e non solo sul prezzo.",
        ],
        bullets: [
          "Scheda sintetica: prima di firmare il venditore deve consegnarla, con le condizioni principali e la spesa annua stimata.",
          "Recesso anticipato: per la luce, nei contratti a prezzo fisso e durata determinata può esserci una penale, che deve essere scritta nel contratto, firmata in modo specifico e riportata nella Scheda sintetica.",
          "Costi alla firma: di norma cambiare venditore non costa nulla, ma possono esserci imposta di bollo e deposito cauzionale, se previsti.",
          "I tuoi dati: consumo annuo in kWh e potenza impegnata in kW li trovi in bolletta; lo storico dei consumi è sul Portale Consumi di ARERA, con SPID o CIE.",
        ],
      },
      {
        heading: "Mercato libero e servizi di tutela",
        paragraphs: [
          "Secondo ARERA, dal 1 luglio 2024 la maggior tutela per la luce è scelta solo dai clienti vulnerabili, mentre chi non aveva scelto il mercato libero è passato al Servizio a Tutele Graduali, che dal 1 aprile 2027 non sarà più disponibile. Chi non è vulnerabile e non sceglie verrà spostato, senza interruzioni, su un'offerta di mercato libero del venditore del servizio.",
          "Per il gas, sempre secondo ARERA, dal gennaio 2024 la tutela è riservata ai clienti vulnerabili; gli altri clienti domestici sono passati al mercato libero, e chi non ha scelto a un'offerta PLACET.",
        ],
      },
      {
        heading: "Il confronto ufficiale e il nostro",
        paragraphs: [
          "Il Portale Offerte di ARERA è lo strumento pubblico ufficiale per confrontare le offerte di luce, gas e luce più gas. Comprende offerte PLACET, di mercato libero e servizi di tutela. Su VERSUS vedi invece le offerte dei venditori con cui collaboriamo.",
        ],
      },
      {
        heading: "Confronta le offerte su VERSUS",
        paragraphs: [
          "Per vedere quali offerte si adattano a te, usa il confronto di VERSUS: scegli luce, gas o luce e gas, indica se sei una casa o una partita IVA e inserisci i consumi. Il risultato è una stima al netto di IVA e la scelta resta tua.",
        ],
      },
    ],
    faq: [
      {
        q: "Le offerte elencate sono tutte quelle del mercato?",
        a: `No. ${COVERAGE}`,
      },
      {
        q: "Il prezzo che vedo è quanto pagherò in bolletta?",
        a: "No. È il prezzo dell'energia, al netto di IVA. La spesa dipende dai consumi e dalle altre voci della bolletta, come trasporto, oneri di sistema e imposte.",
      },
      {
        q: "Usare VERSUS ha un costo?",
        a: `Il confronto è gratuito per te. ${AGENT}`,
      },
      {
        q: "Meglio il prezzo fisso o quello variabile?",
        a: "Dipende da come vuoi gestire il rischio. Il prezzo fisso resta invariato per il periodo di contratto; il variabile segue un indice e può salire o scendere. Nella Scheda sintetica trovi come funziona l'indicizzazione e il prezzo più alto degli ultimi 12 mesi.",
      },
      {
        q: "Che cosa sono le offerte PLACET?",
        a: "Sono offerte standard che ogni venditore deve proporre a famiglie e piccole imprese, con termini contrattuali fissati da ARERA. Esistono a prezzo fisso e variabile, con durata indeterminata.",
      },
    ],
    sources: [SRC_BILL, SRC_PLACET, SRC_VARIABLE, SRC_PUN, SRC_GLOSSARY, SRC_END_TUTELA_ELE, SRC_END_TUTELA_GAS, SRC_STG_CLIENTS, SRC_SWITCH_COST_ELE, SRC_PORTALE],
    related: ["/offerte-luce", "/offerte-gas", "/offerte-luce-gas-partita-iva", "/guida/cambio-fornitore-luce-gas"],
    reviewedOn: REVIEWED,
  },

  // ---------------------------------------------------------------------
  {
    path: "/offerte-luce",
    title: "Offerte luce per casa e partita IVA: prezzi | VERSUS",
    description:
      "Le offerte luce presenti su VERSUS per casa e partita IVA: prezzo in €/kWh o spread sul PUN, voci di bolletta e cosa verificare prima di firmare.",
    h1: "Offerte luce per casa e partita IVA",
    intro:
      "Qui trovi le offerte luce presenti su VERSUS, per casa e per partita IVA. Il prezzo mostrato è quello dell'energia in €/kWh, oppure lo spread sul PUN Index GME nelle offerte variabili, sempre al netto di IVA. La spesa finale dipende dai consumi e dalle altre voci di bolletta.",
    listings: [
      { heading: "Offerte luce per la casa", commodity: "luce", customerType: "casa" },
      { heading: "Offerte luce per partita IVA", commodity: "luce", customerType: "business" },
    ],
    sections: [
      {
        heading: "Le offerte luce su VERSUS",
        paragraphs: [
          "I due elenchi di questa pagina riguardano la luce: uno per la casa, uno per la partita IVA. Sono letti direttamente dal nostro archivio e seguono le offerte in vendita.",
          `${COVERAGE} ${AGENT} Per te il confronto è gratuito.`,
        ],
      },
      {
        heading: "Cosa significa il prezzo in €/kWh",
        paragraphs: [
          "Il prezzo in €/kWh è quello che il venditore applica all'energia elettrica consumata. Non è l'intera bolletta. Secondo la guida di ARERA, nella bolletta della luce la parte che dipende dal venditore è la materia energia, composta da una quota fissa annua e da una quota in €/kWh, che per i contatori elettronici può cambiare in base alla fascia oraria.",
          "Le altre voci non dipendono dall'offerta. Il trasporto e la gestione del contatore hanno una quota fissa annua, una legata ai kW di potenza e una ai kWh, con una tariffa che ARERA stabilisce con criteri uniformi in Italia. Gli oneri di sistema sono costi di interesse generale pagati da tutti i clienti; le imposte sono l'accisa e l'IVA sul totale.",
          "Molte di queste voci sono aggiornate periodicamente da ARERA, anche ogni trimestre: per questo qui non trovi i loro valori.",
        ],
      },
      {
        heading: "Prezzo fisso, variabile e indice PUN",
        paragraphs: [
          "In un'offerta a prezzo fisso il prezzo dell'energia non cambia per il periodo previsto dal contratto. In un'offerta a prezzo variabile segue un indice a intervalli stabiliti, e la Scheda sintetica deve spiegare il meccanismo e indicare il prezzo più alto dei 12 mesi precedenti.",
          "Per la luce l'indice di riferimento è il PUN. Il GME, il gestore del mercato elettrico, lo definisce come il prezzo di riferimento dell'energia elettrica scambiata sul mercato del giorno prima e lo pubblica come PUN Index GME, calcolato come media dei prezzi zonali di quel mercato pesata sugli acquisti. Nelle pagine di ARERA lo trovi ancora spesso scritto semplicemente PUN.",
          "Nelle offerte indicizzate, quindi, il prezzo che vedi è solo la parte fissata dal venditore, lo spread, mentre l'indice cambia nel tempo. Non riportiamo qui i valori dell'indice, che variano di continuo.",
        ],
      },
      {
        heading: "Potenza e consumo: i dati da avere in mano",
        paragraphs: [
          "Per confrontare le offerte luce servono due dati che trovi in bolletta: il consumo annuo in kWh e la potenza impegnata in kW. Se non hai una bolletta, lo storico dei consumi è consultabile sul Portale Consumi di ARERA con SPID o CIE.",
          "Se attivi una nuova fornitura non hai uno storico: il confronto parte da una stima dei consumi, da leggere come tale.",
        ],
      },
      {
        heading: "Vulnerabili, maggior tutela e fine del servizio a tutele graduali",
        paragraphs: [
          "Secondo ARERA, dal 1 luglio 2024 la maggior tutela è riservata ai clienti vulnerabili. Rientrano, tra gli altri, chi ha 75 anni o più, chi riceve il bonus sociale elettrico o il bonus per gravi condizioni di salute, chi ha una disabilità riconosciuta dalla legge 104 del 1992, chi vive in un'abitazione di emergenza dopo un evento calamitoso e chi è servito su isole minori non interconnesse.",
          "I clienti non vulnerabili che non avevano scelto il mercato libero sono passati al Servizio a Tutele Graduali, che dal 1 aprile 2027 non sarà più disponibile. Chi non sceglie verrà spostato senza interruzioni su un'offerta di mercato libero del venditore del servizio, con durata minima di 12 mesi e senza penale per il recesso anticipato.",
        ],
      },
      {
        heading: "Recesso e costi per cambiare",
        paragraphs: [
          "Cambiare venditore di luce in generale non costa nulla. Le uniche spese possibili sono l'imposta di bollo, solo se le regole fiscali la richiedono, e un deposito cauzionale o un'altra garanzia, solo se il contratto la prevede.",
          "Nei contratti a prezzo fisso e durata determinata può esserci una penale per il recesso anticipato: il massimo deve essere indicato nel contratto, firmato in modo specifico e riportato nella Scheda sintetica, alla voce “Modalità e oneri per il recesso”.",
          "Il Portale Offerte di ARERA è lo strumento pubblico ufficiale per confrontare le offerte.",
        ],
      },
      {
        heading: "Confronta le offerte luce su VERSUS",
        paragraphs: [
          "Se vuoi una stima sulla tua situazione, apri il confronto: indica se la fornitura è per la casa o per una partita IVA, aggiungi i consumi e guarda le offerte che corrispondono. Il risultato è una stima al netto di IVA, e prima di firmare resta fondamentale leggere la Scheda sintetica.",
        ],
      },
    ],
    faq: [
      {
        q: "Che cosa vuol dire €/kWh?",
        a: "È il prezzo dell'energia elettrica per ogni kWh consumato. Si somma alle altre voci della bolletta e alle imposte: da solo non dice quanto spenderai.",
      },
      {
        q: "Che cos'è il PUN Index GME?",
        a: "Per il GME è il prezzo di riferimento dell'energia elettrica scambiata sul mercato del giorno prima. Le offerte variabili luce lo usano come indice: ARERA lo indica ancora spesso come PUN.",
      },
      {
        q: "Posso restare in maggior tutela?",
        a: "Secondo ARERA la maggior tutela è riservata ai clienti vulnerabili, per esempio chi ha 75 anni o più o riceve il bonus sociale elettrico. Gli altri sono sul mercato libero o nel Servizio a Tutele Graduali.",
      },
      {
        q: "Cambiare fornitore di luce costa qualcosa?",
        a: "In generale no. Possono esserci imposta di bollo e deposito cauzionale solo se previsti da norme fiscali o dal contratto, e una penale per il recesso anticipato nei contratti a prezzo fisso e durata determinata.",
      },
      {
        q: "Le offerte mostrate sono tutte quelle disponibili?",
        a: `No. ${COVERAGE} ${AGENT}`,
      },
    ],
    sources: [SRC_BILL, SRC_TRANSPORT, SRC_PUN, SRC_GLOSSARY, SRC_VARIABLE, SRC_END_TUTELA_ELE, SRC_STG_CLIENTS, SRC_SWITCH_COST_ELE, SRC_PORTALE],
    related: ["/offerte-luce-gas", "/offerte-gas", "/offerte-luce-gas-partita-iva", "/guida/cambio-fornitore-luce-gas"],
    reviewedOn: REVIEWED,
  },

  // ---------------------------------------------------------------------
  {
    path: "/offerte-gas",
    title: "Offerte gas per casa e partita IVA: prezzi | VERSUS",
    description:
      "Le offerte gas presenti su VERSUS per casa e partita IVA: prezzo in €/Smc, prezzo fisso e variabile, cos'è il PSV e cosa verificare prima di firmare.",
    h1: "Offerte gas per casa e partita IVA",
    intro:
      "Qui trovi le offerte gas presenti su VERSUS, per casa e per partita IVA. Il prezzo mostrato è quello del gas in €/Smc, al netto di IVA. La spesa finale dipende dai consumi in Smc e dalle altre voci di bolletta.",
    listings: [
      { heading: "Offerte gas per la casa", commodity: "gas", customerType: "casa" },
      { heading: "Offerte gas per partita IVA", commodity: "gas", customerType: "business" },
    ],
    sections: [
      {
        heading: "Le offerte gas su VERSUS",
        paragraphs: [
          "Gli elenchi di questa pagina riguardano solo il gas: uno per la casa e uno per la partita IVA. Si leggono dal nostro archivio e cambiano insieme alle offerte.",
          `${COVERAGE} ${AGENT} Per te il confronto è gratuito.`,
        ],
      },
      {
        heading: "Mc e Smc: a cosa si riferisce il prezzo",
        paragraphs: [
          "Il contatore del gas registra metri cubi (mc), ma in bolletta il gas si fattura in standard metri cubi (Smc). Quando il contatore non ha il correttore di volume, un coefficiente indicato con la lettera C converte i metri cubi in Smc. Il prezzo del gas nelle offerte è espresso in €/Smc, ed è questo il numero da moltiplicare per i tuoi consumi.",
          "Ricorda che il prezzo dell'offerta non è la bolletta intera: ci sono altre voci e le imposte, e tutti i prezzi che vedi qui sono al netto di IVA.",
        ],
      },
      {
        heading: "Prezzo fisso e prezzo variabile nel gas",
        paragraphs: [
          "Con un'offerta a prezzo fisso il prezzo resta invariato per un periodo stabilito dal contratto. Con un'offerta a prezzo variabile cambia a intervalli prestabiliti seguendo un indice, e la Scheda sintetica deve indicare come funziona l'indicizzazione e il prezzo più alto dei 12 mesi precedenti, con il periodo.",
          "Nel PLACET gas a prezzo variabile, l'offerta standard che ogni venditore deve proporre a famiglie e piccole imprese, ARERA usa come riferimento la media mensile del prezzo giornaliero del PSV giorno prima. Il PSV, Punto di Scambio Virtuale, è il punto virtuale in cui si scambia e si trasferisce il gas, gestito da Snam Rete Gas. Non riportiamo qui i valori, che cambiano ogni mese.",
          "Anche il servizio per i clienti vulnerabili ha un prezzo variabile mensile, basato sulla media mensile del PSV giorno prima, più gli altri oneri fissati da ARERA e le imposte.",
        ],
      },
      {
        heading: "Cosa cambia, e cosa no, quando cambi venditore di gas",
        paragraphs: [
          "Per il gas, secondo ARERA, il recesso non ha costi: eventuali spese arrivano dalla firma del nuovo contratto, per esempio imposta di bollo o deposito cauzionale se previsti. Cambiare venditore non causa interruzioni della fornitura né interventi tecnici sul contatore o sugli impianti.",
          "Il codice PDR, formato da 14 cifre, identifica il punto in cui il gas ti viene riconsegnato e non cambia quando cambi venditore.",
        ],
      },
      {
        heading: "Tutela per i vulnerabili e passaggio al mercato libero",
        paragraphs: [
          "Secondo ARERA, dal gennaio 2024 il servizio di tutela per il gas può essere scelto solo dai clienti vulnerabili. I clienti domestici non vulnerabili sono passati al mercato libero, e chi non ha scelto è passato a un'offerta PLACET.",
          "Sono vulnerabili, per il gas, gli intestatari con 75 anni o più, chi riceve il bonus sociale gas, chi ha una disabilità riconosciuta dalla legge 104 del 1992 e chi vive in un'abitazione di emergenza dopo un evento calamitoso.",
        ],
      },
      {
        heading: "Un confronto più ampio",
        paragraphs: [
          "Il Portale Offerte di ARERA è lo strumento pubblico ufficiale per confrontare le offerte gas, luce e luce più gas. Su VERSUS vedi invece le offerte dei venditori con cui collaboriamo.",
        ],
      },
      {
        heading: "Confronta le offerte gas su VERSUS",
        paragraphs: [
          "Se vuoi una stima sul tuo consumo, apri il confronto: scegli gas, indica se è per la casa o per una partita IVA, aggiungi i tuoi Smc oppure lasciaci stimarli in base all'uso. Il risultato è una stima al netto di IVA, e la scelta spetta a te.",
        ],
      },
    ],
    faq: [
      {
        q: "Che differenza c'è tra mc e Smc?",
        a: "Il contatore registra metri cubi, la bolletta usa gli standard metri cubi. Il coefficiente C converte i metri cubi in Smc quando il contatore non ha il correttore di volume.",
      },
      {
        q: "Che cos'è il PSV?",
        a: "È il Punto di Scambio Virtuale, il punto virtuale in cui si scambia e si trasferisce il gas. Nel PLACET gas variabile ARERA usa la media mensile del suo prezzo giorno prima.",
      },
      {
        q: "Cambiare venditore di gas mi lascia senza gas?",
        a: "No. Secondo ARERA il cambio di venditore non provoca interruzioni e non richiede interventi tecnici sul contatore o sugli impianti.",
      },
      {
        q: "Il recesso dal gas ha un costo?",
        a: "Secondo ARERA no. Le spese eventuali dipendono dal nuovo contratto, per esempio imposta di bollo o deposito cauzionale se previsti.",
      },
      {
        q: "Le offerte gas elencate sono tutte quelle sul mercato?",
        a: `No. ${COVERAGE} ${AGENT}`,
      },
    ],
    sources: [SRC_GAS_C, SRC_VARIABLE, SRC_PLACET, SRC_GLOSSARY, SRC_END_TUTELA_GAS, SRC_CMEM, SRC_RECESSO_GAS, SRC_PORTALE],
    related: ["/offerte-luce-gas", "/offerte-luce", "/offerte-luce-gas-partita-iva", "/guida/cambio-fornitore-luce-gas"],
    reviewedOn: REVIEWED,
  },

  // ---------------------------------------------------------------------
  {
    path: "/offerte-luce-gas-partita-iva",
    title: "Offerte luce e gas per partita IVA | VERSUS",
    description:
      "Le offerte luce e gas per partita IVA presenti su VERSUS: come leggere i prezzi al netto di IVA, PLACET per piccole imprese e cosa controllare.",
    h1: "Offerte luce e gas per partita IVA",
    intro:
      "Qui trovi le offerte luce e gas per partita IVA presenti su VERSUS. Il prezzo mostrato è quello dell'energia, in €/kWh per la luce e in €/Smc per il gas, sempre al netto di IVA. La spesa finale dipende dai consumi e dalle altre voci di bolletta.",
    listings: [
      { heading: "Offerte luce per partita IVA", commodity: "luce", customerType: "business" },
      { heading: "Offerte gas per partita IVA", commodity: "gas", customerType: "business" },
    ],
    sections: [
      {
        heading: "Le offerte per partita IVA su VERSUS",
        paragraphs: [
          "I due elenchi della pagina riguardano le forniture intestate a una partita IVA: luce business e gas business. Si leggono dal nostro archivio e seguono le offerte presenti.",
          `${COVERAGE} ${AGENT} Per te il confronto è gratuito.`,
        ],
      },
      {
        heading: "Prezzi al netto di IVA: cosa significa per un'attività",
        paragraphs: [
          "I prezzi e le stime di VERSUS sono mostrati al netto di IVA. Questo vale per tutte le offerte, comprese quelle per partita IVA, e ti permette di confrontare i numeri nella stessa base. Non riportiamo qui aliquote o trattamenti fiscali: dipendono dalla tua attività e dal tipo di uso, e vanno chiariti con il tuo commercialista.",
          "Il prezzo accanto a un'offerta riguarda solo l'energia: per la luce in €/kWh, per il gas in €/Smc. La spesa totale dipende dai consumi e dalle altre voci della bolletta, come il trasporto, gli oneri di sistema e le imposte.",
        ],
      },
      {
        heading: "Quali dati servono per un'attività",
        paragraphs: [
          "Per confrontare le offerte luce servono il consumo annuo in kWh e la potenza impegnata in kW, che trovi in bolletta. Per il gas serve il consumo annuo in Smc. Lo storico dei consumi è consultabile sul Portale Consumi di ARERA con SPID o CIE.",
          "Se la fornitura è nuova e non hai uno storico, parti da una stima, tenendo presente che resta una stima e non un dato certo.",
        ],
      },
      {
        heading: "Piccole imprese e microimprese: cosa dice ARERA",
        paragraphs: [
          "ARERA distingue le microimprese (meno di 10 dipendenti e fatturato fino a 2 milioni di euro) dalle piccole imprese (da 10 a 50 dipendenti e/o fatturato tra 2 e 10 milioni di euro, con punti di prelievo in bassa tensione). La partita IVA in sé non basta a definire la categoria: contano dimensione e potenza.",
          "Per la luce, ARERA ha previsto il Servizio a Tutele Graduali per le microimprese e per gli altri clienti non domestici con punti di prelievo fino a 15 kW: dal 1 aprile 2023, per le piccole imprese dal 1 luglio 2024. Le liste di questi clienti arrivano fino al 31 marzo 2027. Per sapere cosa accade dopo quella data, verifica sulle pagine di ARERA o chiedilo al tuo venditore attuale.",
          "Le offerte standard PLACET, con termini contrattuali fissati da ARERA, devono essere proposte da ogni venditore anche alle piccole imprese, in versione a prezzo fisso e variabile.",
        ],
      },
      {
        heading: "Prezzo fisso o variabile",
        paragraphs: [
          "Un'offerta a prezzo fisso mantiene il prezzo dell'energia invariato per il periodo del contratto. Una variabile lo aggiorna a intervalli stabiliti seguendo un indice: nel PLACET ARERA usa il PUN per la luce, che il GME pubblica come PUN Index GME, e la media mensile del PSV giorno prima per il gas.",
          "Per un'attività che vuole prevedere i costi, il tipo di prezzo è una scelta di gestione del rischio. Ti conviene leggere con attenzione la durata, le condizioni di recesso e le modalità di indicizzazione.",
        ],
      },
      {
        heading: "Cambiare fornitore con una partita IVA",
        paragraphs: [
          "Per il gas il venditore entrante avvia la procedura di cambio e si occupa anche di chiudere il rapporto con il vecchio. Per la luce il nuovo venditore invia il recesso a quello precedente per conto del cliente, in base a una procura. Nel gas il cambio non causa interruzioni né interventi sul contatore.",
          "I codici POD (luce) e PDR (gas) identificano il punto di fornitura e non cambiano con il venditore. Più dettagli, a partire dai tempi, sono nella nostra guida al cambio fornitore.",
        ],
      },
      {
        heading: "Un confronto più ampio",
        paragraphs: [
          "Il Portale Offerte di ARERA è lo strumento pubblico ufficiale per confrontare le offerte. Su VERSUS vedi solo quelle dei venditori con cui collaboriamo.",
        ],
      },
      {
        heading: "Confronta le offerte per la tua attività su VERSUS",
        paragraphs: [
          "Per ottenere una stima, apri il confronto, scegli luce, gas o luce e gas e indica che la fornitura è per una partita IVA. Aggiungi i consumi e guarda le offerte che corrispondono: la scelta, dopo aver letto le condizioni, resta tua.",
        ],
      },
    ],
    faq: [
      {
        q: "I prezzi per partita IVA includono l'IVA?",
        a: "No. Prezzi e stime su VERSUS sono mostrati al netto di IVA.",
      },
      {
        q: "Le offerte per partita IVA sono diverse da quelle per la casa?",
        a: "Gli elenchi sono separati perché le offerte e i dati richiesti possono essere diversi. Le condizioni valgono quelle indicate per ogni offerta: leggile prima di firmare.",
      },
      {
        q: "Che cos'è il PLACET per le piccole imprese?",
        a: "Sono offerte standard che ogni venditore deve proporre a famiglie e piccole imprese, con termini fissati da ARERA, a prezzo fisso o variabile e con durata indeterminata.",
      },
      {
        q: "Che dati servono per confrontare luce e gas?",
        a: "Per la luce il consumo annuo in kWh e la potenza in kW; per il gas il consumo annuo in Smc. Li trovi in bolletta.",
      },
      {
        q: "VERSUS mostra tutte le offerte per le imprese?",
        a: `No. ${COVERAGE} ${AGENT}`,
      },
    ],
    sources: [SRC_STG_BUSINESS, SRC_PLACET, SRC_BILL, SRC_VARIABLE, SRC_GLOSSARY, SRC_PUN, SRC_PORTALE],
    related: ["/offerte-luce-gas", "/offerte-luce", "/offerte-gas", "/guida/cambio-fornitore-luce-gas"],
    reviewedOn: REVIEWED,
  },
];
