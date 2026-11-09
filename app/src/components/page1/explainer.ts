// Home text block below the FAQ (T19.4e). Copy approved by Giuseppe on 2026-11-07
// (docs/geo/bozze-round2.md section 1); facts only from docs/geo/canonical-facts.md and fonti-guide.md.
export interface ExplainerBlock {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export const EXPLAINER_TITLE = "Come funziona il confronto luce e gas su VERSUS";

export const EXPLAINER_INTRO =
  "VERSUS è un comparatore luce e gas per la casa e per la partita IVA. Scegli se confrontare luce, gas o luce e gas, indichi il tipo di fornitura e i consumi, e vedi le offerte dei venditori con cui collaboriamo, con una stima della spesa mensile IVA esclusa. Il confronto è gratuito. Se un'offerta fa per te, puoi attivarla online: cambio fornitore, subentro, voltura o primo allaccio.";

export const EXPLAINER_BLOCKS: ExplainerBlock[] = [
  {
    heading: "Quali offerte confrontiamo",
    paragraphs: [
      "Confrontiamo le offerte dei venditori con cui collaboriamo, non tutte quelle disponibili sul mercato. VERSUS opera come agente ed è remunerato dai venditori. Per te il confronto non ha costi.",
      "Per avere una vista più ampia del mercato esiste il Portale Offerte, il sito gratuito e indipendente di ARERA, previsto dalla Legge Concorrenza del 2017, per confrontare le offerte di luce, gas e luce più gas: comprende offerte PLACET, di mercato libero e servizi di tutela.",
    ],
  },
  {
    heading: "Come viene calcolata la stima",
    paragraphs: [
      "La stima parte dal consumo annuo. Per le abitazioni lo ricaviamo da persone in casa, elettrodomestici, usi del gas e zona climatica del comune; se conosci già il tuo consumo puoi inserirlo tu. Per la partita IVA lo indichi direttamente.",
      "Per un'offerta a prezzo fisso la spesa mensile stimata è il consumo di un mese moltiplicato per il prezzo dell'energia dell'offerta, più le eventuali quote fisse mensili previste dall'offerta. È una stima, non una bolletta: per la luce la guida di ARERA distingue quattro voci (materia energia, trasporto e gestione del contatore, oneri di sistema, imposte) e il prezzo dell'offerta riguarda l'energia. Quanto paghi davvero dipende dai tuoi consumi reali. Tutte le stime sono IVA esclusa, così le offerte si confrontano sulla stessa base.",
    ],
  },
  {
    heading: "Prezzo fisso o prezzo variabile",
    paragraphs: [
      "Con un'offerta a prezzo fisso il prezzo dell'energia resta invariato per un periodo stabilito dal contratto. Con un'offerta a prezzo variabile cambia in automatico a intervalli prestabiliti, seguendo un indice. Nelle offerte standard PLACET, ARERA usa come riferimento il PUN per la luce (indice che il GME definisce PUN Index GME) e la media mensile del PSV giorno prima per il gas.",
      "Per le offerte variabili la Scheda sintetica deve indicare come funziona l'indicizzazione e il prezzo più alto dei 12 mesi precedenti, con il periodo. Né il prezzo fisso né il variabile sono giusti in assoluto: dipende da come vuoi gestire il rischio di variazioni.",
    ],
  },
  {
    heading: "Mercato libero e servizi di tutela",
    paragraphs: [
      "Secondo ARERA, per la luce dal 1 luglio 2024 la maggior tutela è riservata ai clienti vulnerabili, mentre i clienti non vulnerabili che non avevano scelto il mercato libero sono passati al Servizio a Tutele Graduali, che dal 1 aprile 2027 non sarà più disponibile. Per il gas, dal gennaio 2024 il servizio di tutela è riservato ai clienti vulnerabili. Passare al mercato libero per la luce è gratuito, non richiede la sostituzione del contatore e non interrompe la fornitura.",
    ],
  },
  {
    heading: "Le quattro situazioni più comuni",
    paragraphs: [],
    bullets: [
      "Cambio fornitore: passi a un nuovo venditore, che avvia la procedura. Per il gas, secondo ARERA, il cambio non interrompe la fornitura.",
      "Subentro: attivi una fornitura il cui contatore era stato disattivato dopo la chiusura del contratto precedente.",
      "Voltura: cambia l'intestatario di un contratto già attivo. Per il gas, ARERA precisa che il venditore resta lo stesso e la fornitura non si interrompe.",
      "Primo allaccio: serve per una nuova fornitura e comprende il collegamento alla rete, fatto dal distributore, e l'attivazione della fornitura.",
    ],
  },
  {
    heading: "Cosa controllare prima di firmare",
    paragraphs: [
      "Prima di firmare il venditore deve consegnarti la Scheda sintetica, con le condizioni principali e la spesa annua stimata. Per la luce, nei contratti a prezzo fisso e durata determinata può esserci una penale per il recesso anticipato: deve essere scritta nel contratto, firmata in modo specifico e riportata nella Scheda sintetica.",
      "Per confrontare le offerte servono il consumo annuo in kWh e la potenza impegnata in kW, che trovi in bolletta. Lo storico dei consumi è consultabile sul Portale Consumi di ARERA con SPID o CIE.",
    ],
  },
];
