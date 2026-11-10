import type { SeoPage } from "./types";

const COVERAGE =
  "Confrontiamo le offerte dei venditori con cui collaboriamo, non tutte quelle disponibili sul mercato.";
const AGENT = "VERSUS opera come agente ed è remunerato dai venditori.";
const REVIEWED = "2026-11-07";
const REVIEWED_NEW = "2026-11-07";
const REVIEWED_COMPARATORE = "2026-11-10";

const A = "https://www.arera.it/atlante-per-il-consumatore";

const SRC_PLACET_URL = "https://www.arera.it/consumatori/offerte-standard-per-i-clienti-finali-placet";
const SRC_FINE_ELE_URL = "https://www.arera.it/consumatori/fine-tutela-ele";
const SRC_FINE_GAS_URL = "https://www.arera.it/consumatori/fine-tutela-gas-cosa-fare";

const SRC_PORTALE = {
  label: "Portale Offerte di ARERA",
  url: "https://www.ilportaleofferte.it",
};
const SRC_SWITCH_HOW = {
  label: "ARERA, cosa occorre fare per cambiare venditore",
  url: `${A}/gas/il-mercato-dellenergia/il-mercato-libero/cosa-occorre-fare-per-cambiare-venditore`,
};
const SRC_RECESSO_ELE = {
  label: "ARERA, come avviene il recesso per cambiare venditore (luce)",
  url: `${A}/elettricita/il-contratto/recesso/come-avviene-il-recesso-per-cambiare-venditore`,
};
const SRC_SWITCH_COST_ELE = {
  label: "ARERA, cambiare venditore ha un costo (luce)",
  url: `${A}/elettricita/il-mercato-dellenergia/il-mercato-libero/cambiare-venditore-ha-un-costo`,
};
const SRC_RECESSO_GAS = {
  label: "ARERA, il recesso ha un costo (gas)",
  url: `${A}/gas/il-contratto/recesso/il-recesso-ha-un-costo`,
};
const SRC_SWITCH_INTERRUPT_GAS = {
  label: "ARERA, se cambio venditore può interrompersi la fornitura (gas)",
  url: `${A}/gas/il-mercato-dellenergia/il-mercato-libero/se-cambio-venditore-puo-interrompersi-fornitura`,
};
const SRC_SWITCH_TIME = {
  label: "ARERA, quanto tempo serve per passare dal vecchio al nuovo venditore (gas)",
  url: `${A}/gas/il-mercato-dellenergia/il-mercato-libero/quanto-tempo-serve-per-passare-dal-vecchio-al-nuovo-venditore`,
};
const SRC_VULNERABLE = {
  label: "ARERA, clienti vulnerabili e Servizio a Tutele Graduali",
  url: "https://www.arera.it/consumatori/clienti-vulnerabili-e-servizio-tutele-graduali-1",
};
const SRC_DELIBERA_58 = {
  label: "ARERA, delibera 58/2026/R/eel",
  url: "https://www.arera.it/atti-e-provvedimenti/dettaglio/26/58-26",
};
const SRC_POD = {
  label: "ARERA, glossario: POD",
  url: "https://www.arera.it/bolletta/glossario-dei-termini/dettaglio/pod",
};
const SRC_PDR = {
  label: "ARERA, glossario: PDR",
  url: "https://www.arera.it/bolletta/glossario-dei-termini/dettaglio/pdr",
};

const SRC_VOLTURA_DEF_GAS = {
  label: "ARERA, cos'è la voltura (gas)",
  url: `${A}/gas/il-contratto/voltura-e-subentro/cose-la-voltura`,
};
const SRC_VOLTURA_HOW_ELE = {
  label: "ARERA, come si richiede la voltura (luce)",
  url: `${A}/elettricita/il-contratto/voltura-e-subentro/come-si-richiede-la-voltura`,
};
const SRC_VOLTURA_REFUSE_ELE = {
  label: "ARERA, il venditore può rifiutare la voltura (luce)",
  url: `${A}/elettricita/il-contratto/voltura-e-subentro/il-venditore-puo-rifiutare-la-voltura`,
};
const SRC_VOLTURA_TIME_ELE = {
  label: "ARERA, quanto tempo occorre per ottenere la voltura (luce)",
  url: `${A}/elettricita/il-contratto/voltura-e-subentro/quanto-tempo-occorre-per-ottenere-la-voltura`,
};
const SRC_VOLTURA_TIME_GAS = {
  label: "ARERA, quanto tempo occorre per ottenere la voltura (gas)",
  url: `${A}/gas/il-contratto/voltura-e-subentro/quanto-tempo-occorre-per-ottenere-la-voltura`,
};
const SRC_VOLTURA_COST_ELE = {
  label: "ARERA, quanto costa effettuare una voltura o un subentro (luce)",
  url: `${A}/elettricita/il-contratto/voltura-e-subentro/quanto-costa-effettuare-una-voltura-o-un-subentro`,
};
const SRC_VOLTURA_COST_GAS = {
  label: "ARERA, quanto costa effettuare una voltura o un subentro (gas)",
  url: `${A}/gas/il-contratto/voltura-e-subentro/quanto-costa-effettuare-una-voltura-o-un-subentro`,
};
const SRC_ARREARS = {
  label: "ARERA, morosità del precedente intestatario in caso di subentro o voltura (gas)",
  url: `${A}/gas/il-contratto/voltura-e-subentro/il-venditore-puo-addebitare-la-morosita-del-precedente-intestatario-in-caso-di-subentro-o-di-voltura`,
};
const SRC_DELIBERA_323 = {
  label: "ARERA, delibera 323/2025/R/com",
  url: "https://www.arera.it/atti-e-provvedimenti/dettaglio/25/323-25",
};

const SRC_SUBENTRO_DEF = {
  label: "ARERA, cos'è il subentro (gas)",
  url: `${A.replace("https://www.arera.it/", "https://www.arera.it/en/")}/gas/il-contratto/voltura-e-subentro/cose-il-subentro`,
};
const SRC_SUBENTRO_GAS = {
  label: "ARERA, come si richiede il subentro e quanto tempo occorre (gas)",
  url: `${A}/gas/il-contratto/voltura-e-subentro/come-si-richiede-il-subentro-e-quanto-tempo-occorre`,
};
const SRC_SUBENTRO_ELE = {
  label: "ARERA, come si richiede il subentro e quanto tempo occorre (luce)",
  url: "https://www.arera.it/en/atlante-per-il-consumatore/elettricita/il-contratto/voltura-e-subentro/come-si-richiede-il-subentro-e-quanto-tempo-occorre",
};
const SRC_SAFETY_COST_GAS = {
  label: "ARERA, quanto costa l'accertamento della sicurezza dell'impianto (gas)",
  url: `${A}/gas/la-fornitura/attivazione/quanto-costa-laccertamento-della-sicurezza-dellimpianto`,
};
const SRC_ACTIVATION_TIME_ELE = {
  label: "ARERA, quanto tempo occorre per l'attivazione (luce)",
  url: `${A}/elettricita/la-fornitura/attivazione/quanto-tempo-occorre-per-lattivazione`,
};

const SRC_ALLACCIO_HOW_ELE = {
  label: "ARERA, come si richiede l'allacciamento (luce)",
  url: `${A}/elettricita/la-fornitura/allacciamento/come-si-richiede-lallacciamento`,
};
const SRC_ALLACCIO_TIME_ELE = {
  label: "ARERA, quanto tempo occorre per ottenere l'allacciamento (luce)",
  url: `${A}/elettricita/la-fornitura/allacciamento/quanto-tempo-occorre-per-ottenere-lallacciamento`,
};
const SRC_ALLACCIO_TIME_GAS = {
  label: "ARERA, quanto tempo occorre per ottenere l'allacciamento (gas)",
  url: `${A}/gas/la-fornitura/allacciamento/quanto-tempo-occorre-per-ottenere-lallacciamento`,
};
const SRC_ALLACCIO_COST_ELE = {
  label: "ARERA, quanto costa un allacciamento permanente ordinario (luce)",
  url: `${A}/elettricita/la-fornitura/allacciamento/quanto-costa-un-allacciamento-permanente-ordinario`,
};
const SRC_ALLACCIO_COST_GAS = {
  label: "ARERA, quanto costa l'allacciamento (gas)",
  url: `${A}/gas/la-fornitura/allacciamento/quanto-costa-lallacciamento`,
};

export const GUIDE_PAGES: SeoPage[] = [
  // ---------------------------------------------------------------------
  {
    path: "/guida/cambio-fornitore-luce-gas",
    footerLabel: "Cambio fornitore",
    title: "Cambio fornitore luce e gas: come funziona | VERSUS",
    description:
      "Come cambiare fornitore di luce e gas: chi avvia la pratica, costi, tempi, ripensamento e cosa non cambia. Guida basata sulle pagine di ARERA.",
    h1: "Cambio fornitore di luce e gas: come funziona",
    intro:
      "Per cambiare fornitore di luce o gas firmi un nuovo contratto con il venditore scelto. Per il gas il venditore entrante avvia la procedura e chiude il vecchio rapporto; per la luce invia il recesso al vecchio venditore con una tua procura. Di norma non resti senza energia. Per il gas, secondo ARERA, servono di norma uno o due mesi. Prima di cambiare puoi confrontare gratis le offerte con VERSUS, comparatore luce e gas, che mostra quelle dei venditori con cui collaboriamo.",
    sections: [
      {
        heading: "Come si cambia fornitore di luce e gas",
        paragraphs: [
          "Per il gas, secondo ARERA, la procedura la avvia il venditore entrante: tu firmi il nuovo contratto di fornitura e il nuovo venditore si occupa anche di porre fine a quello vecchio.",
          "Per la luce, il meccanismo prevede che tu dia al nuovo venditore una procura: con quella, il nuovo venditore comunica il recesso al vecchio per tuo conto. In entrambi i casi non devi inviare tu la disdetta.",
          "Per confrontare le offerte prima di scegliere ti servono il consumo annuo in kWh e la potenza impegnata in kW, che trovi in bolletta. Lo storico dei consumi è consultabile sul Portale Consumi di ARERA con SPID o CIE.",
        ],
      },
      {
        heading: "Cambiare fornitore costa qualcosa?",
        paragraphs: [
          "Per la luce ARERA spiega che in generale cambiare venditore non costa nulla al cliente. Le uniche spese possibili sono l'imposta di bollo, solo se le regole fiscali la richiedono, e un deposito cauzionale o un'altra garanzia, solo se il contratto la prevede.",
          "Nei contratti luce a prezzo fisso e durata determinata può esserci una penale per il recesso anticipato: il massimo deve essere scritto nel contratto, firmato in modo specifico da te e riportato nella Scheda sintetica, alla voce “Modalità e oneri per il recesso”.",
          "Per il gas il recesso non ha costi. Se ci sono spese, arrivano dalla firma del nuovo contratto, per esempio bollo o deposito cauzionale se previsti.",
        ],
      },
      {
        heading: "Resto senza luce o gas durante il passaggio?",
        paragraphs: [
          "No. Per il gas ARERA precisa che cambiare venditore non causa interruzioni della fornitura e non richiede interventi tecnici sul contatore o sugli impianti. Per la luce, passare al mercato libero è gratuito, non richiede la sostituzione del contatore e non interrompe la fornitura.",
        ],
      },
      {
        heading: "Quanto tempo ci vuole per il cambio?",
        paragraphs: [
          "Secondo la pagina di ARERA sul gas, il passaggio richiede di norma da uno a due mesi. I cambi decorrono il primo giorno del mese: se il venditore entrante avvia la procedura entro il giorno 10, il cambio avviene il primo giorno del mese successivo, altrimenti un mese dopo.",
          "Per la luce ARERA ha approvato a marzo 2026 una procedura più rapida: la delibera 58/2026/R/eel prevede che la parte tecnica si svolga in 24 ore di un giorno lavorativo per i clienti domestici non morosi, e che l'intero cambio si concluda entro tre settimane al massimo. Prima di firmare chiedi al venditore quali tempi valgono per la tua pratica.",
        ],
      },
      {
        heading: "Cos'è il diritto di ripensamento e quanti giorni ho?",
        paragraphs: [
          "Secondo la pagina di ARERA sul gas, se il contratto è firmato fuori dai locali del venditore o a distanza, per i clienti domestici il ripensamento dura 14 giorni. Dura 30 giorni se è stato firmato durante una visita a domicilio non richiesta o durante un'escursione organizzata dal venditore.",
          "Sempre per i clienti domestici, il venditore entrante di regola aspetta la fine del periodo prima di avviare il cambio, salvo che tu chieda di partire prima.",
        ],
      },
      {
        heading: "Cosa serve per cambiare e cosa non cambia",
        paragraphs: [
          "Due codici identificano il tuo punto di fornitura: il POD per la luce, di 14 o 15 caratteri alfanumerici che iniziano con IT, e il PDR per il gas, di 14 cifre. Quando cambi venditore restano gli stessi. Per i dati da fornire segui le richieste del venditore.",
          "Prima di firmare il venditore deve consegnarti la Scheda sintetica, con le condizioni principali e la spesa annua stimata. Leggila con calma: è il documento fatto per confrontare.",
          "Il Portale Offerte è il sito gratuito e indipendente di ARERA, previsto dalla Legge Concorrenza del 2017, per confrontare le offerte.",
        ],
      },
      {
        heading: "Confronta le offerte su VERSUS",
        paragraphs: [
          `Quando sei pronto a guardare le offerte, apri il confronto di VERSUS: indichi luce, gas o luce e gas, il tipo di cliente e i consumi, e vedi le offerte in elenco. ${COVERAGE} ${AGENT} Per te il confronto è gratuito.`,
        ],
      },
    ],
    faq: [
      {
        q: "Devo disdire io il vecchio contratto?",
        a: "Di norma no. Per il gas, secondo ARERA, il venditore entrante si occupa di porre fine al contratto precedente. Per la luce il nuovo venditore invia il recesso per tuo conto, con una procura che gli dai tu.",
      },
      {
        q: "Cambiare fornitore costa qualcosa?",
        a: "In generale no. Il recesso del gas non ha costi, e per la luce possono esserci solo imposta di bollo e deposito cauzionale se previsti, oltre a una penale nei contratti a prezzo fisso e durata determinata.",
      },
      {
        q: "Resto senza luce o gas?",
        a: "No. Per il gas, secondo ARERA, il cambio non interrompe la fornitura e non richiede interventi sul contatore o sugli impianti. Per la luce passare al mercato libero è gratuito, non richiede la sostituzione del contatore e non interrompe la fornitura.",
      },
      {
        q: "Cambiano POD e PDR quando cambio venditore?",
        a: "No. Sono i codici del punto di fornitura e restano gli stessi.",
      },
      {
        q: "Posso ripensarci dopo aver firmato?",
        a: "Secondo le pagine di ARERA sul gas, per i clienti domestici il ripensamento dura 14 giorni se il contratto è firmato a distanza o fuori dai locali del venditore, e 30 giorni in caso di visita a domicilio non richiesta.",
      },
    ],
    sources: [SRC_SWITCH_HOW, SRC_RECESSO_ELE, SRC_SWITCH_COST_ELE, SRC_RECESSO_GAS, SRC_SWITCH_INTERRUPT_GAS, SRC_SWITCH_TIME, SRC_DELIBERA_58, SRC_VULNERABLE, SRC_POD, SRC_PDR, SRC_PORTALE],
    related: ["/guida/voltura-luce-gas", "/guida/subentro-luce-gas", "/guida/come-funziona-comparatore-luce-gas", "/guida/come-scegliere-offerta-luce-gas"],
    publishedOn: "2026-11-05",
    reviewedOn: REVIEWED,
  },

  // ---------------------------------------------------------------------
  {
    path: "/guida/voltura-luce-gas",
    footerLabel: "Voltura",
    title: "Voltura luce e gas: cos'è, documenti e tempi | VERSUS",
    description:
      "Cos'è la voltura di luce e gas, chi la richiede, quali documenti servono, tempi e costi, e differenza dal subentro. Guida basata su ARERA.",
    h1: "Voltura di luce e gas: cos'è e come si fa",
    intro:
      "La voltura è il cambio di intestatario di un contratto già attivo. Per il gas, ARERA la definisce come passaggio senza interruzione della fornitura e con lo stesso venditore. Per la luce la chiede il nuovo cliente. Secondo ARERA servono circa 5 giorni lavorativi per la luce, se non cambi venditore, e 4 per il gas. Questa guida è pubblicata da VERSUS, comparatore luce e gas, che ti fa confrontare gratis le offerte per la casa e per la partita IVA.",
    sections: [
      {
        heading: "Cos'è la voltura",
        paragraphs: [
          "Per il gas ARERA descrive la voltura come il cambio di intestatario del contratto di fornitura, con lo stesso venditore e senza interrompere l'erogazione del gas. La fornitura resta attiva: cambia chi la intesta.",
          "Per la luce ARERA spiega a chi e come si richiede la voltura. Se invece la fornitura è stata chiusa e viene riattivata da un nuovo cliente, si parla di subentro: lo trovi nella nostra guida dedicata.",
        ],
      },
      {
        heading: "Chi deve fare la richiesta di voltura",
        paragraphs: [
          "Per la luce, secondo ARERA, la richiesta la presenta il nuovo cliente al venditore che già fornisce il servizio. Se con la voltura vuoi anche cambiare venditore, la presenti al nuovo venditore, seguendo la sua procedura.",
          "Per gli altri adempimenti segui le istruzioni del venditore a cui ti rivolgi.",
        ],
      },
      {
        heading: "Quali documenti servono per la voltura",
        paragraphs: [
          "Per la luce devi dimostrare di essere proprietario dell'immobile o di averne il possesso o la detenzione in modo legittimo. ARERA indica che è accettata un'autodichiarazione.",
          "Il venditore può rifiutare la voltura se il titolo non viene mostrato e, sul mercato libero, anche per altri motivi. Se il venditore è già quello che fornisce il servizio, deve comunicare il rifiuto entro tre giorni lavorativi.",
        ],
      },
      {
        heading: "Quanto tempo ci vuole",
        paragraphs: [
          "Per la luce, quando non cambi venditore, ARERA indica circa 5 giorni lavorativi: fino a 3 per l'accettazione del venditore e fino a 2 per la registrazione del nuovo contratto. Se cambi anche venditore, la pagina non dà un totale.",
          "Per il gas il tempo è di circa 4 giorni lavorativi: 2 per l'accettazione del venditore e 2 per la registrazione.",
        ],
      },
      {
        heading: "Quanto costa la voltura di luce e gas",
        paragraphs: [
          "Non scriviamo cifre perché dipendono dal contratto e dal distributore. Per la luce sul mercato libero ARERA indica che il costo dipende dal singolo contratto, e che non è dovuto alcun importo al distributore. Per il gas il distributore addebita al venditore un contributo previsto dal suo prezzario, e quello che paghi tu dipende dal contratto; per i clienti nel servizio di tutela della vulnerabilità c'è inoltre un importo da versare al venditore.",
          "Alla firma del nuovo contratto possono esserci anche imposta di bollo e deposito cauzionale, se applicabili. Chiedi sempre al venditore il dettaglio dei costi prima di confermare.",
        ],
      },
      {
        heading: "Si pagano i debiti del precedente intestatario?",
        paragraphs: [
          "Per il gas, secondo ARERA, in generale no: il venditore non può addebitare le bollette non pagate del precedente intestatario a chi subentra con una voltura o un subentro. Fa eccezione chi non è estraneo al debito, per esempio un erede o una persona che conviveva con il precedente intestatario. Il venditore può chiedere un'autodichiarazione.",
        ],
      },
      {
        heading: "Differenza tra voltura e subentro",
        paragraphs: [
          "Con la voltura la fornitura è già attiva e resta tale: cambia solo l'intestatario, e per il gas ARERA precisa che il venditore resta lo stesso. Con il subentro la fornitura era stata chiusa, con il contatore disattivato, e un nuovo cliente la riattiva.",
        ],
      },
      {
        heading: "Posso fare la voltura e cambiare fornitore insieme?",
        paragraphs: [
          "Per la luce, secondo ARERA, se vuoi cambiare venditore con la voltura presenti la richiesta al nuovo venditore. Per il gas, la delibera 323/2025/R/com di ARERA ha completato le regole in modo che il cliente possa scegliere il venditore durante la voltura. Chiedi al venditore se si applica già alla tua pratica.",
          "Il Portale Offerte è il sito gratuito e indipendente di ARERA, previsto dalla Legge Concorrenza del 2017, per confrontare le offerte.",
        ],
      },
      {
        heading: "Confronta le offerte su VERSUS",
        paragraphs: [
          `Se con la voltura vuoi anche scegliere un'offerta nuova, puoi confrontarle su VERSUS indicando se la fornitura è per la casa o per una partita IVA. ${COVERAGE} ${AGENT} Per te il confronto è gratuito.`,
        ],
      },
    ],
    faq: [
      {
        q: "La voltura interrompe la luce o il gas?",
        a: "Per il gas ARERA la definisce come un cambio di intestatario senza interruzione della fornitura. La fornitura resta attiva.",
      },
      {
        q: "Chi può rifiutare la voltura?",
        a: "Per la luce il venditore può rifiutarla se non mostri il titolo sull'immobile e, sul mercato libero, anche per altri motivi. Un venditore già fornitore deve comunicare il rifiuto entro tre giorni lavorativi.",
      },
      {
        q: "Basta un'autodichiarazione per il titolo sull'immobile?",
        a: "Per la luce ARERA indica che l'autodichiarazione è accettata per dimostrare proprietà, possesso o detenzione legittima dell'immobile.",
      },
      {
        q: "Pago i debiti di chi c'era prima?",
        a: "Per il gas, secondo ARERA, in generale no, tranne se non sei estraneo al debito, per esempio come erede o come convivente del precedente intestatario.",
      },
      {
        q: "Quanto costa una voltura?",
        a: "Dipende dal contratto e, per il gas, dal prezzario del distributore. Per questo non riportiamo cifre: chiedi al venditore il dettaglio dei costi prima di confermare.",
      },
    ],
    sources: [SRC_VOLTURA_DEF_GAS, SRC_VOLTURA_HOW_ELE, SRC_VOLTURA_REFUSE_ELE, SRC_VOLTURA_TIME_ELE, SRC_VOLTURA_TIME_GAS, SRC_VOLTURA_COST_ELE, SRC_VOLTURA_COST_GAS, SRC_ARREARS, SRC_DELIBERA_323, SRC_SWITCH_COST_ELE, SRC_PORTALE],
    related: ["/guida/subentro-luce-gas", "/guida/cambio-fornitore-luce-gas", "/guida/primo-allaccio-luce-gas", "/guida/come-funziona-comparatore-luce-gas"],
    publishedOn: "2026-11-05",
    reviewedOn: REVIEWED,
  },

  // ---------------------------------------------------------------------
  {
    path: "/guida/subentro-luce-gas",
    footerLabel: "Subentro",
    title: "Subentro luce e gas: quando serve e come si fa | VERSUS",
    description:
      "Cos'è il subentro di luce e gas, quando serve al posto della voltura, documenti, tempi di riattivazione e costi. Guida basata su ARERA.",
    h1: "Subentro di luce e gas: quando serve",
    intro:
      "Il subentro è l'attivazione di una fornitura da parte di un nuovo cliente dopo che il precedente ha chiuso il contratto e il contatore è stato disattivato. Lo chiedi al venditore che scegli. Per la luce il distributore attiva di norma entro 5 giorni lavorativi, per il gas entro 10, secondo ARERA. Per il subentro puoi partire da VERSUS, comparatore luce e gas: indichi il tipo di fornitura e i consumi e vedi una stima della spesa mensile, IVA esclusa.",
    sections: [
      {
        heading: "Cos'è il subentro",
        paragraphs: [
          "Secondo ARERA, il subentro è l'attivazione di una fornitura da parte di un nuovo cliente dopo che il precedente ha terminato il contratto e il contatore è stato disattivato. A differenza della voltura, equivale a una riattivazione.",
        ],
      },
      {
        heading: "Quando serve il subentro invece della voltura",
        paragraphs: [
          "Serve il subentro quando nell'immobile la fornitura non è più attiva, perché il contratto del precedente cliente è stato chiuso. Se invece la fornitura è ancora attiva e cambia solo l'intestatario, si parla di voltura; per il gas ARERA precisa che il venditore resta lo stesso.",
          "Il confine, in pratica, è lo stato del contatore: attivo nella voltura, disattivato nel subentro.",
        ],
      },
      {
        heading: "Come si richiede e quali documenti servono",
        paragraphs: [
          "La richiesta si presenta al venditore che scegli. Il venditore la inoltra al distributore entro 2 giorni lavorativi, e puoi quindi scegliere un venditore nuovo già al subentro.",
          "Per la luce e per il gas devi dimostrare di essere proprietario dell'unità o di averne il possesso o la detenzione in modo legittimo: l'autodichiarazione è accettata. Per il gas, se l'impianto è stato ampliato, sottoposto a manutenzione straordinaria o trasformato per un altro tipo di gas, il venditore chiede la documentazione di sicurezza.",
        ],
      },
      {
        heading: "Quanto tempo ci vuole per riattivare la fornitura",
        paragraphs: [
          "Per la luce, secondo ARERA, il venditore invia la richiesta al distributore entro 2 giorni lavorativi e il distributore attiva entro 5 giorni lavorativi. Per il gas il venditore inoltra la richiesta entro 2 giorni lavorativi e il distributore attiva entro 10 giorni lavorativi, contati dal ricevimento della documentazione di sicurezza se l'impianto è stato modificato.",
          "Se il distributore è in ritardo, è previsto un indennizzo automatico in bolletta.",
          "Per la luce c'è un caso particolare: se la fornitura di chi richiede l'attivazione è stata sospesa per mancato pagamento, il distributore rinvia l'attivazione fino al pagamento del debito e lo comunica al venditore.",
        ],
      },
      {
        heading: "Quanto costa il subentro di luce e gas",
        paragraphs: [
          "Non scriviamo cifre perché cambiano e dipendono dal contratto. Per la luce sul mercato libero il costo dipende dal singolo contratto e ARERA indica che non è dovuto alcun importo al distributore.",
          "Per il gas il distributore addebita al venditore contributi stabiliti da ARERA: per il contatore fino alla classe G6, per la verifica documentale della sicurezza se l'impianto è stato modificato (dovuta anche se l'esito è negativo) e per ogni intervento che richiede una sospensione. Il venditore può trasferire a te al massimo quanto ha davvero pagato, e il costo per il cliente dipende dal contratto.",
          "Alla firma possono esserci anche imposta di bollo e deposito cauzionale, se applicabili.",
        ],
      },
      {
        heading: "Pago i debiti di chi c'era prima?",
        paragraphs: [
          "Per il gas, secondo ARERA, in generale no: il venditore non può addebitare le bollette non pagate del precedente intestatario a chi subentra, tranne se la persona non è estranea al debito, per esempio un erede o chi viveva con il precedente intestatario. Il venditore può chiedere un'autodichiarazione.",
        ],
      },
      {
        heading: "Posso scegliere un fornitore nuovo al subentro?",
        paragraphs: [
          "Sì: ARERA descrive la richiesta come una domanda rivolta al venditore che scegli. Questo ti permette di confrontare le offerte prima di decidere a chi chiedere l'attivazione.",
          "Il Portale Offerte è il sito gratuito e indipendente di ARERA, previsto dalla Legge Concorrenza del 2017, per confrontare le offerte.",
        ],
      },
      {
        heading: "Confronta le offerte su VERSUS",
        paragraphs: [
          `Prima di chiedere il subentro puoi vedere le offerte su VERSUS, per la casa o per una partita IVA, e scegliere con calma. ${COVERAGE} ${AGENT} Per te il confronto è gratuito.`,
        ],
      },
    ],
    faq: [
      {
        q: "Qual è la differenza tra subentro e voltura?",
        a: "Nella voltura la fornitura resta attiva e cambia l'intestatario; per il gas ARERA precisa che il venditore resta lo stesso. Nel subentro la fornitura era stata chiusa e un nuovo cliente la riattiva.",
      },
      {
        q: "Chi attiva il contatore dopo la richiesta?",
        a: "Il distributore. Il venditore gli inoltra la richiesta entro 2 giorni lavorativi.",
      },
      {
        q: "Quali documenti servono?",
        a: "Un titolo che provi proprietà, possesso o detenzione legittima dell'unità; l'autodichiarazione è accettata. Per il gas, se l'impianto è stato modificato, serve la documentazione di sicurezza.",
      },
      {
        q: "Pago le bollette non pagate di chi c'era prima?",
        a: "Per il gas, secondo ARERA, in generale no, tranne se non sei estraneo al debito, per esempio come erede o convivente del precedente intestatario.",
      },
      {
        q: "Quanto costa riattivare la fornitura?",
        a: "Dipende dal contratto e, per il gas, da contributi stabiliti da ARERA al distributore. Chiedi sempre al venditore il dettaglio prima di confermare.",
      },
    ],
    sources: [SRC_SUBENTRO_DEF, SRC_SUBENTRO_GAS, SRC_SUBENTRO_ELE, SRC_VOLTURA_COST_GAS, SRC_VOLTURA_COST_ELE, SRC_SAFETY_COST_GAS, SRC_ACTIVATION_TIME_ELE, SRC_ARREARS, SRC_PORTALE],
    related: ["/guida/voltura-luce-gas", "/guida/primo-allaccio-luce-gas", "/guida/cambio-fornitore-luce-gas", "/guida/come-funziona-comparatore-luce-gas"],
    publishedOn: "2026-11-05",
    reviewedOn: REVIEWED,
  },

  // ---------------------------------------------------------------------
  {
    path: "/guida/primo-allaccio-luce-gas",
    footerLabel: "Primo allaccio",
    title: "Primo allaccio luce e gas: cos'è e come funziona | VERSUS",
    description:
      "Primo allaccio di luce e gas: differenza tra allacciamento e attivazione, a chi rivolgersi, passaggi e tempi indicati da ARERA.",
    h1: "Primo allaccio di luce e gas: allacciamento e attivazione",
    intro:
      "“Primo allaccio” è un'etichetta commerciale: nelle pagine di ARERA si parla di allacciamento, il collegamento fisico fatto dal distributore, e di attivazione, l'avvio della fornitura. Per la luce puoi chiedere entrambi a un venditore, che inoltra la richiesta al distributore entro 2 giorni lavorativi. I tempi dei lavori dipendono dalla loro complessità. Se ti serve una nuova fornitura, VERSUS, comparatore luce e gas, ti aiuta a scegliere l'offerta e a richiederne l'attivazione online.",
    sections: [
      {
        heading: "Cosa significa primo allaccio o nuova attivazione",
        paragraphs: [
          "Con primo allaccio si intende, di solito, una fornitura nuova, dove prima non c'era un collegamento. ARERA non usa questa espressione: distingue l'allacciamento, cioè la connessione fisica fatta dal distributore, dall'attivazione, cioè l'inizio della fornitura da parte del venditore.",
          "Se il punto è già allacciato ma spento, si parla invece di attivazione, o di subentro se un nuovo cliente riattiva un contatore disattivato dopo un contratto chiuso.",
        ],
      },
      {
        heading: "A chi devo rivolgermi, al fornitore o al distributore?",
        paragraphs: [
          "Per la luce, secondo ARERA, se ti serve solo l'allacciamento ti rivolgi al distributore locale. Se vuoi allacciamento e fornitura insieme, firmi con un venditore chiedendo “allacciamento e attivazione”, e il venditore inoltra la richiesta al distributore entro 2 giorni lavorativi. Nella richiesta si indicano l'ubicazione del punto di prelievo, la tensione di fornitura e la potenza richiesta.",
          "Per il gas la richiesta passa di solito dal venditore.",
        ],
      },
      {
        heading: "Quali passaggi ci sono",
        paragraphs: [
          "Il percorso è lo stesso per luce e gas: tu o il venditore presentate la richiesta, il distributore formula un preventivo, realizza i lavori dopo l'accettazione, e poi il venditore attiva la fornitura. Per la luce il preventivo indica costo e tempo massimo; per il gas il costo segue i criteri del prezzario del distributore.",
        ],
        bullets: [
          "richiesta di allacciamento, tramite il distributore o il venditore;",
          "preventivo del distributore;",
          "accettazione del preventivo e lavori;",
          "attivazione della fornitura.",
        ],
      },
      {
        heading: "Quanto tempo ci vuole",
        paragraphs: [
          "Per la luce il distributore comunica il preventivo entro 15 giorni lavorativi. I lavori semplici, come l'installazione del contatore, si concludono entro 10 giorni lavorativi dall'accettazione; quelli complessi richiedono fino a 50 giorni lavorativi. Il venditore ha 2 giorni lavorativi per inoltrare la richiesta e 2 per girarti il preventivo. Questi tempi non comprendono i lavori a carico del cliente e le autorizzazioni, per esempio quella del condominio.",
          "Per il gas, nei lavori semplici il preventivo arriva entro 15 giorni lavorativi e l'allacciamento entro 10 dall'accettazione. Nei lavori complessi il preventivo arriva entro 30 giorni lavorativi e l'allacciamento entro 60.",
          "Se il punto è già allacciato, per la luce il distributore attiva entro 5 giorni lavorativi dalla richiesta, che il venditore inoltra entro 2.",
        ],
      },
      {
        heading: "Quanto costa allacciare luce o gas",
        paragraphs: [
          "Non riportiamo cifre: le pagine di ARERA non le indicano e dipendono da distanza, potenza e distributore. Per la luce, ARERA spiega che un allacciamento permanente ordinario è composto da una quota legata alla distanza (in linea retta dalla cabina più vicina in servizio da almeno cinque anni) e da una quota legata alla potenza. Per le abitazioni all'indirizzo di residenza fino a 3,3 kW di potenza disponibile si paga una quota fissa, a prescindere dalla distanza.",
          "Per il gas il costo è fissato nel preventivo del distributore secondo i criteri del suo prezzario.",
          "Se chiedi anche l'attivazione, ai costi dell'allacciamento si aggiungono quelli della firma del contratto (imposta di bollo e deposito cauzionale, se applicabili) e, per il gas, il controllo di sicurezza dell'impianto, che il distributore addebita al venditore.",
        ],
      },
      {
        heading: "Posso scegliere il fornitore subito?",
        paragraphs: [
          "Sì, nel caso della luce, ARERA descrive proprio la possibilità di firmare con un venditore chiedendo allacciamento e attivazione. Puoi quindi confrontare le offerte prima di firmare.",
          "Il Portale Offerte è il sito gratuito e indipendente di ARERA, previsto dalla Legge Concorrenza del 2017, per confrontare le offerte.",
        ],
      },
      {
        heading: "Differenza tra allaccio e attivazione",
        paragraphs: [
          "L'allaccio crea il collegamento fisico tra la rete e l'immobile, ed è realizzato dal distributore. L'attivazione avvia la fornitura di energia, su un punto già collegato, e richiede un contratto con un venditore.",
        ],
      },
      {
        heading: "Confronta le offerte su VERSUS",
        paragraphs: [
          `Per una nuova attivazione puoi confrontare le offerte su VERSUS, per la casa o per una partita IVA, e portare con te i dati della fornitura. ${COVERAGE} ${AGENT} Per te il confronto è gratuito.`,
        ],
      },
    ],
    faq: [
      {
        q: "Primo allaccio è un termine usato da ARERA?",
        a: "No, è un'etichetta commerciale. ARERA parla di allacciamento, il collegamento fisico fatto dal distributore, e di attivazione, l'avvio della fornitura.",
      },
      {
        q: "A chi chiedo l'allacciamento della luce?",
        a: "Se ti serve solo l'allacciamento, al distributore locale. Se vuoi anche la fornitura, firmi con un venditore chiedendo allacciamento e attivazione.",
      },
      {
        q: "Quanto tempo ci vuole per allacciare la luce?",
        a: "Il preventivo arriva entro 15 giorni lavorativi. I lavori semplici si concludono entro 10 giorni lavorativi dall'accettazione, quelli complessi fino a 50.",
      },
      {
        q: "E per il gas?",
        a: "Nei lavori semplici 15 giorni lavorativi per il preventivo e 10 per l'allacciamento. Nei complessi 30 per il preventivo e 60 per l'allacciamento.",
      },
      {
        q: "Quanto costa l'allacciamento?",
        a: "Dipende da distributore, potenza e distanza. Per il gas il costo è nel preventivo del distributore; per la luce c'è una quota di distanza e una di potenza.",
      },
    ],
    sources: [SRC_ALLACCIO_HOW_ELE, SRC_ALLACCIO_TIME_ELE, SRC_ALLACCIO_TIME_GAS, SRC_ALLACCIO_COST_ELE, SRC_ALLACCIO_COST_GAS, SRC_ACTIVATION_TIME_ELE, SRC_SAFETY_COST_GAS, SRC_SUBENTRO_DEF, SRC_PORTALE],
    related: ["/guida/subentro-luce-gas", "/guida/voltura-luce-gas", "/guida/cambio-fornitore-luce-gas", "/guida/come-funziona-comparatore-luce-gas"],
    publishedOn: "2026-11-05",
    reviewedOn: REVIEWED,
  },

  // ---------------------------------------------------------------------
  {
    path: "/guida/come-scegliere-offerta-luce-gas",
    footerLabel: "Come scegliere",
    title: "Come scegliere un'offerta luce e gas: guida | VERSUS",
    description:
      "Come scegliere un'offerta luce e gas: dati da avere, prezzo fisso o variabile, PLACET, Scheda sintetica e controlli prima di firmare. Guida basata su ARERA.",
    h1: "Come scegliere un'offerta luce e gas",
    intro:
      "Per scegliere un'offerta luce o gas guarda il tipo di prezzo (fisso o variabile), i tuoi consumi, le altre voci della bolletta e le condizioni del contratto, che trovi nella Scheda sintetica. Non esiste un'offerta giusta per tutti: dipende dai consumi e da come vuoi gestire il rischio di variazioni di prezzo. Per confrontare le offerte con questi criteri c'è VERSUS, comparatore luce e gas: è gratuito e mostra una stima della spesa mensile IVA esclusa.",
    sections: [
      {
        heading: "I dati da avere in mano",
        paragraphs: [
          "Per confrontare le offerte luce servono il consumo annuo in kWh e la potenza impegnata in kW, che trovi in bolletta. Per il gas il consumo si misura in Smc, gli standard metri cubi usati in fattura. Se non hai la bolletta, lo storico dei consumi è consultabile sul Portale Consumi di ARERA con SPID o CIE.",
        ],
      },
      {
        heading: "Che cosa comprende il prezzo di un'offerta",
        paragraphs: [
          "Il prezzo di un'offerta riguarda l'energia: per la luce in €/kWh, per il gas in €/Smc. Non è la bolletta intera. Per la luce la guida di ARERA indica quattro voci:",
          "Molte voci sono aggiornate periodicamente da ARERA, anche ogni trimestre: per questo qui non trovi i loro valori.",
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
          "Con un'offerta a prezzo fisso il prezzo dell'energia resta invariato per un periodo stabilito dal contratto. Con un'offerta a prezzo variabile il prezzo cambia in automatico a intervalli prestabiliti, seguendo un indice, e può salire o scendere.",
          "Nessuna delle due è giusta in assoluto: la scelta dipende da quanto vuoi poter prevedere la spesa. Per le offerte variabili la Scheda sintetica deve indicare il meccanismo di indicizzazione e il prezzo più alto dei 12 mesi precedenti, con il periodo a cui si riferisce.",
        ],
      },
      {
        heading: "Cosa sono le offerte PLACET",
        paragraphs: [
          "PLACET significa Prezzo Libero A Condizioni Equiparate di Tutela. Sono offerte standard che ogni venditore deve includere per famiglie e piccole imprese, in una versione a prezzo fisso e in una a prezzo variabile. Hanno durata indeterminata, con condizioni economiche rinnovate ogni 12 mesi, con il venditore che informa il cliente delle nuove condizioni entro tre mesi dalla scadenza. ARERA ne fissa i termini contrattuali, e luce e gas non possono stare nello stesso contratto PLACET.",
        ],
      },
      {
        heading: "PUN e PSV: gli indici delle offerte variabili",
        paragraphs: [
          "Nel PLACET a prezzo variabile ARERA usa come riferimento il PUN per la luce e la media mensile del PSV giorno prima per il gas.",
          "Il GME, il gestore del mercato elettrico, definisce il PUN Index GME come il prezzo di riferimento dell'energia elettrica scambiata sul mercato del giorno prima (MGP); nelle pagine di ARERA per le offerte PLACET luce l'indice è ancora indicato come PUN. Il PSV, Punto di Scambio Virtuale, è il punto virtuale in cui si scambia e si trasferisce il gas. Non riportiamo i loro valori, che cambiano di continuo.",
        ],
      },
      {
        heading: "I controlli prima di firmare",
        paragraphs: [],
        bullets: [
          "Scheda sintetica: prima di firmare il venditore deve consegnartela, con le condizioni principali e la spesa annua stimata.",
          "Recesso anticipato: per la luce, nei contratti a prezzo fisso e durata determinata può esserci una penale. Deve essere scritta nel contratto, firmata in modo specifico e riportata nella Scheda sintetica, alla voce «Modalità e oneri per il recesso».",
          "Costi alla firma: di norma cambiare venditore non costa nulla, ma possono esserci imposta di bollo e deposito cauzionale, se previsti.",
          "Ripensamento: per i clienti domestici dura 14 giorni se il contratto è firmato a distanza o fuori dai locali del venditore, 30 giorni in caso di visita a domicilio non richiesta.",
        ],
      },
      {
        heading: "Casa o partita IVA",
        paragraphs: [
          "Le regole per leggere un'offerta sono le stesse. I prezzi e le stime di VERSUS sono IVA esclusa, anche per la partita IVA. Aliquote e trattamento fiscale dipendono dalla tua attività e vanno chiariti con il tuo commercialista. Le offerte PLACET sono previste anche per le piccole imprese.",
        ],
      },
      {
        heading: "Se sei ancora in un servizio di tutela",
        paragraphs: [
          "Secondo ARERA, la maggior tutela per la luce (dal 1 luglio 2024) e il servizio di tutela per il gas (dal gennaio 2024) sono riservati ai clienti vulnerabili, e il Servizio a Tutele Graduali dal 1 aprile 2027 non sarà più disponibile. Trovi i dettagli nella guida «Fine della tutela e passaggio al mercato libero».",
        ],
      },
      {
        heading: "Un confronto più ampio",
        paragraphs: [
          "Il Portale Offerte è il sito gratuito e indipendente di ARERA, previsto dalla Legge Concorrenza del 2017, per confrontare le offerte di luce, gas e luce più gas: comprende offerte PLACET, di mercato libero e servizi di tutela.",
        ],
      },
      {
        heading: "Confronta le offerte su VERSUS",
        paragraphs: [
          `Su VERSUS scegli luce, gas o luce e gas, indichi se sei una casa o una partita IVA e inserisci i consumi: vedi le offerte in elenco con una stima della spesa mensile, IVA esclusa, e la scelta resta tua. ${COVERAGE} ${AGENT} Per te il confronto è gratuito.`,
        ],
      },
    ],
    faq: [
      {
        q: "Qual è l'offerta luce e gas più conveniente?",
        a: "Dipende dai consumi, dal tipo di prezzo e dalle altre voci della bolletta, quindi non c'è una risposta valida per tutti. Confronta la spesa annua stimata nella Scheda sintetica di più offerte e leggi le condizioni, compresa la durata e il recesso.",
      },
      {
        q: "Il prezzo che vedo è quanto pagherò in bolletta?",
        a: "No. È il prezzo dell'energia. La bolletta comprende anche trasporto e gestione del contatore, oneri di sistema e imposte, e dipende da quanto consumi davvero.",
      },
      {
        q: "Meglio il prezzo fisso o il prezzo variabile?",
        a: "Dipende da come vuoi gestire il rischio. Il prezzo fisso resta invariato per il periodo di contratto; il variabile segue un indice e può salire o scendere.",
      },
      {
        q: "Posso ripensarci dopo aver firmato?",
        a: "Secondo le pagine di ARERA, per i clienti domestici il ripensamento dura 14 giorni se il contratto è firmato a distanza o fuori dai locali del venditore, e 30 giorni in caso di visita a domicilio non richiesta.",
      },
    ],
    sources: [
      { label: "ARERA, guida alla lettura delle voci di spesa", url: "https://www.arera.it/bolletta/guida-alla-lettura-delle-voci-di-spesa" },
      { label: "ARERA, spesa per il trasporto e la gestione del contatore", url: `${A}/elettricita/la-bolletta/cosa-si-paga/cosa-e-la-spesa-per-il-trasporto-e-la-gestione-del-contatore` },
      { label: "ARERA, offerte standard PLACET", url: SRC_PLACET_URL },
      { label: "ARERA, cosa sono le offerte a prezzo variabile", url: `${A}/gas/il-mercato-dellenergia/le-offerte-commerciali/cosa-sono-le-offerte-a-prezzo-variabile` },
      { label: "ARERA, il coefficiente di correzione dei volumi C", url: "https://www.arera.it/en/atlante-per-il-consumatore/gas/la-bolletta/letture-e-consumi/che-cose-il-coefficiente-di-correzione-dei-volumi-denominato-c" },
      SRC_SWITCH_COST_ELE,
      SRC_SWITCH_TIME,
      SRC_VULNERABLE,
      { label: "ARERA, fine della tutela per la luce", url: SRC_FINE_ELE_URL },
      { label: "ARERA, fine della tutela per il gas", url: SRC_FINE_GAS_URL },
      { label: "GME, PUN Index GME", url: "https://www.mercatoelettrico.org/it-it/Home/Pubblicazioni/Indici-GME/PUNIndexGme" },
      { label: "GME, glossario", url: "https://www.mercatoelettrico.org/Home/Glossario" },
      SRC_PORTALE,
    ],
    related: ["/guida/fine-tutela-mercato-libero", "/guida/cambio-fornitore-luce-gas", "/guida/voltura-luce-gas", "/guida/come-funziona-comparatore-luce-gas"],
    publishedOn: "2026-11-07",
    reviewedOn: REVIEWED_NEW,
  },

  // ---------------------------------------------------------------------
  {
    path: "/guida/fine-tutela-mercato-libero",
    footerLabel: "Fine tutela",
    title: "Fine della tutela e mercato libero: cosa cambia | VERSUS",
    description:
      "Fine della maggior tutela e del Servizio a Tutele Graduali per luce e gas: date, clienti vulnerabili e cosa fare prima del 1 aprile 2027. Guida basata su ARERA.",
    h1: "Fine della tutela e passaggio al mercato libero",
    intro:
      "Per la luce, dal 1 luglio 2024 la maggior tutela è riservata ai clienti vulnerabili. I clienti non vulnerabili che non avevano scelto il mercato libero sono nel Servizio a Tutele Graduali, che dal 1 aprile 2027 non sarà più disponibile. Per il gas, dal gennaio 2024 il servizio di tutela è riservato ai clienti vulnerabili. Le date sono quelle indicate da ARERA a novembre 2026: ricontrollale sul sito di ARERA. Se vuoi passare al mercato libero, puoi cercare l'offerta con VERSUS, comparatore luce e gas, indicando consumi e tipo di cliente.",
    sections: [
      {
        heading: "Cosa è cambiato per la luce",
        paragraphs: [
          "Secondo ARERA, dal 1 luglio 2024 la maggior tutela per la luce può essere scelta solo dai clienti vulnerabili. Rientrano:",
          "I clienti non vulnerabili che non avevano scelto un contratto di mercato libero sono passati dal 1 luglio 2024 al Servizio a Tutele Graduali, con il venditore assegnato alla loro zona.",
        ],
        bullets: [
          "chi ha 75 anni o più;",
          "chi riceve il bonus sociale elettrico;",
          "chi riceve il bonus per gravi condizioni di salute;",
          "chi ha una disabilità riconosciuta dalla legge 104 del 1992;",
          "chi vive in un'abitazione di emergenza dopo un evento calamitoso;",
          "chi è servito su isole minori non interconnesse.",
        ],
      },
      {
        heading: "Cosa succede il 1 aprile 2027",
        paragraphs: [
          "Dal 1 aprile 2027 il Servizio a Tutele Graduali non è più disponibile: resta per i clienti senza venditore. I clienti non vulnerabili che non scelgono un'offerta sono spostati, senza interruzioni e senza un nuovo contratto da firmare, su un'offerta di mercato libero del loro venditore del servizio.",
          "Secondo ARERA quell'offerta ha durata minima di 12 mesi e nessuna penale per il recesso anticipato, ed è quella con la spesa annua stimata più bassa tra le offerte che il venditore rende disponibili ai clienti del servizio a dicembre 2026. A dicembre 2026 il cliente riceve una sintesi dell'offerta; i documenti completi possono arrivare entro il 31 marzo 2027.",
          "I clienti vulnerabili ancora nel Servizio a Tutele Graduali passano dal 1 aprile 2027 al Servizio di Maggior Tutela. Chi non è stato ancora identificato come vulnerabile può dichiararlo con un modulo allegato alle bollette da settembre 2026.",
        ],
      },
      {
        heading: "Cosa è cambiato per il gas",
        paragraphs: [
          "Secondo ARERA, dal gennaio 2024 il servizio di tutela per il gas può essere scelto solo dai clienti vulnerabili. I clienti domestici non vulnerabili sono passati al mercato libero, e chi non ha fatto nulla è passato a un'offerta PLACET. Sono vulnerabili, per il gas:",
        ],
        bullets: [
          "gli intestatari con 75 anni o più;",
          "chi riceve il bonus sociale gas;",
          "chi ha una disabilità riconosciuta dalla legge 104 del 1992;",
          "chi vive in un'abitazione di emergenza dopo un evento calamitoso.",
        ],
      },
      {
        heading: "Partita IVA e microimprese",
        paragraphs: [
          "ARERA distingue le microimprese (meno di 10 dipendenti e fatturato fino a 2 milioni di euro) dalle piccole imprese (da 10 a 50 dipendenti e/o fatturato tra 2 e 10 milioni di euro, con punti di prelievo in bassa tensione). Conta la dimensione, non la sola partita IVA.",
          "Il Servizio a Tutele Graduali ha riguardato le microimprese e gli altri clienti non domestici con punti di prelievo fino a 15 kW dal 1 aprile 2023, le piccole imprese dal 1 luglio 2024. Le liste di questi clienti arrivano fino al 31 marzo 2027. Per sapere cosa accade a un'attività dopo quella data, verifica sulle pagine di ARERA o chiedilo al tuo venditore attuale.",
        ],
      },
      {
        heading: "Passare al mercato libero: cosa c'è da sapere",
        paragraphs: [
          "Per la luce, passare al mercato libero è gratuito, non richiede la sostituzione del contatore e non interrompe la fornitura. Per il gas il cambio di venditore non causa interruzioni né interventi sul contatore o sugli impianti. Alla firma possono esserci imposta di bollo e deposito cauzionale, se previsti.",
          "Prima di firmare il venditore deve consegnarti la Scheda sintetica, con le condizioni principali e la spesa annua stimata. Per confrontare le offerte servono il consumo annuo in kWh e la potenza impegnata in kW, che trovi in bolletta; lo storico dei consumi è sul Portale Consumi di ARERA con SPID o CIE. Come leggere le offerte lo spieghiamo nella guida «Come scegliere un'offerta luce e gas».",
        ],
      },
      {
        heading: "Un confronto più ampio",
        paragraphs: [
          "Il Portale Offerte è il sito gratuito e indipendente di ARERA, previsto dalla Legge Concorrenza del 2017, per confrontare le offerte di luce, gas e luce più gas: comprende offerte PLACET, di mercato libero e servizi di tutela.",
        ],
      },
      {
        heading: "Confronta le offerte su VERSUS",
        paragraphs: [
          `Se vuoi scegliere tu, apri il confronto di VERSUS: indichi luce, gas o luce e gas, il tipo di cliente e i consumi, e vedi le offerte in elenco con una stima IVA esclusa. ${COVERAGE} ${AGENT} Per te il confronto è gratuito.`,
        ],
      },
    ],
    faq: [
      {
        q: "Cosa succede il 1 aprile 2027 se non scelgo un'offerta?",
        a: "Per la luce, secondo ARERA, il cliente non vulnerabile che non sceglie viene spostato, senza interruzioni, su un'offerta di mercato libero del venditore del servizio, con durata minima di 12 mesi e senza penale per il recesso anticipato.",
      },
      {
        q: "Chi può restare in maggior tutela per la luce?",
        a: "Solo i clienti vulnerabili: per esempio chi ha 75 anni o più, chi riceve il bonus sociale elettrico o chi ha una disabilità riconosciuta dalla legge 104 del 1992.",
      },
      {
        q: "La tutela del gas esiste ancora?",
        a: "Sì, ma dal gennaio 2024 solo per i clienti vulnerabili, secondo ARERA. Gli altri clienti domestici sono passati al mercato libero.",
      },
      {
        q: "Passare al mercato libero interrompe la luce o il gas?",
        a: "No. Per la luce passare al mercato libero è gratuito, non richiede la sostituzione del contatore e non interrompe la fornitura; per il gas il cambio non causa interruzioni né interventi sul contatore.",
      },
      {
        q: "Sono un cliente vulnerabile e non l'ho ancora dichiarato: cosa posso fare?",
        a: "Secondo ARERA, i clienti non ancora identificati possono dichiarare la vulnerabilità con un modulo allegato alle bollette da settembre 2026. Per la tua situazione, rivolgiti al tuo venditore.",
      },
    ],
    sources: [
      { label: "ARERA, fine della tutela per la luce", url: SRC_FINE_ELE_URL },
      SRC_VULNERABLE,
      { label: "ARERA, il Servizio a Tutele Graduali", url: "https://www.arera.it/consumatori/il-servizio-a-tutele-graduali" },
      { label: "ARERA, fine della tutela per il gas", url: SRC_FINE_GAS_URL },
      { label: "ARERA, offerte standard PLACET", url: SRC_PLACET_URL },
      SRC_SWITCH_INTERRUPT_GAS,
      SRC_SWITCH_COST_ELE,
      SRC_PORTALE,
    ],
    related: ["/guida/come-scegliere-offerta-luce-gas", "/guida/cambio-fornitore-luce-gas", "/guida/voltura-luce-gas", "/guida/come-funziona-comparatore-luce-gas"],
    publishedOn: "2026-11-07",
    reviewedOn: REVIEWED_NEW,
  },

  // ---------------------------------------------------------------------
  {
    path: "/guida/come-funziona-comparatore-luce-gas",
    footerLabel: "Come funziona un comparatore",
    title: "Come funziona un comparatore luce e gas | VERSUS",
    description:
      "Come funziona un comparatore luce e gas: dati richiesti, Portale Offerte di ARERA e controlli da fare prima di scegliere. Guida con fonti ufficiali.",
    h1: "Come funziona un comparatore luce e gas",
    intro:
      "Un comparatore luce e gas raccoglie offerte di più venditori e le mostra in un elenco, con una stima della spesa calcolata sui dati che inserisci, di solito consumi e tipo di cliente. La stima non è la bolletta, e un comparatore può mostrare tutto il mercato o solo una parte: per questo conviene sapere quali venditori include e come ordina i risultati. Su VERSUS, comparatore luce e gas, il confronto è gratuito e le stime sono IVA esclusa.",
    sections: [
      {
        heading: "Che cosa chiede e che cosa mostra",
        paragraphs: [
          "Per confrontare servono pochi dati: se vuoi luce, gas o entrambi, se sei una casa o una partita IVA e quanto consumi in un anno. Per la luce trovi in bolletta il consumo in kWh e la potenza impegnata in kW, per il gas il consumo in Smc. Lo storico dei consumi è consultabile anche sul Portale Consumi di ARERA, con SPID o CIE.",
          "Il risultato è un elenco di offerte con una stima della spesa. È una stima, non una bolletta: il prezzo di un'offerta riguarda l'energia, mentre la bolletta comprende anche trasporto e gestione del contatore, oneri di sistema e imposte, e dipende da quanto consumi davvero.",
          "Controlla anche su quale base è calcolata la stima. Nel Portale Offerte, per esempio, le FAQ spiegano che la spesa finale comprende le imposte, cioè accisa e IVA, mentre le stime di VERSUS sono IVA esclusa. Due cifre prese da siti diversi possono quindi non essere confrontabili tra loro.",
        ],
      },
      {
        heading: "Il comparatore pubblico: il Portale Offerte di ARERA",
        paragraphs: [
          "Il Portale Offerte è realizzato e gestito da Acquirente Unico su disposizione di ARERA, in attuazione della legge 124/2017. È online dal 1 luglio 2018 e permette a famiglie e piccole imprese di confrontare gratis le offerte di luce, gas e luce e gas insieme (dual fuel). Per cercare indichi il tipo di offerta e il comune o il CAP della fornitura; se vuoi, accedi con SPID o CIE per partire dal tuo storico dei consumi.",
          "ARERA lo descrive come lo strumento che raccoglie e pubblica tutte le offerte presenti sul mercato di vendita al dettaglio di luce e gas. Le FAQ del portale precisano che sono pubblicate le offerte rivolte al pubblico, presentate sui siti o negli uffici dei venditori o su media almeno regionali, e che per ora sono escluse, tra le altre, quelle riservate a gruppi chiusi, trattate individualmente o proposte solo a clienti raggiunti direttamente dal venditore.",
          "Per avere una vista d'insieme del mercato è il punto di partenza più ampio. Il portale ricorda però che le informazioni sulle offerte sono fornite dai venditori, che ne sono gli unici responsabili: prima di firmare, controlla le condizioni nella Scheda sintetica, che il venditore deve consegnarti prima della firma.",
        ],
      },
      {
        heading: "I comparatori privati: che cosa guardare",
        paragraphs: [
          "Un comparatore privato è un sito gestito da un'azienda, che decide quali offerte mostrare, come ordinarle e quali servizi aggiungere. Per valutarlo ti servono dei criteri.",
        ],
      },
      {
        heading: "Come valutare un comparatore: la lista di controllo",
        paragraphs: [],
        bullets: [
          "Chi c'è dietro: ragione sociale, sede e partita IVA dovrebbero essere facili da trovare sul sito.",
          "Quali venditori confronta: il sito dovrebbe dire se mostra tutto il mercato o solo una parte, e come sceglie i venditori da includere.",
          "Come ordina i risultati: per spesa stimata, per accordi commerciali o con altri criteri. Cerca la sezione che lo spiega.",
          "Come è remunerato: il sito dovrebbe spiegare chi lo paga e se questo può influire sui risultati.",
          "Che cosa comprende la stima: IVA, imposte e quote fisse sono dentro o fuori? È una spesa mensile o annua?",
          "Quanto sono aggiornate le offerte: cerca una data di aggiornamento e verifica sempre le condizioni nella Scheda sintetica del venditore.",
          "Che cosa succede dopo la scelta: il sito si limita al confronto o raccoglie i tuoi dati per attivare l'offerta? Controlla a chi li affida e per quale scopo.",
        ],
      },
      {
        heading: "L'ordine dei risultati: cosa prevede il Codice del consumo",
        paragraphs: [
          "Sull'ordine dei risultati il Codice del consumo dà due indicazioni. Quando puoi cercare prodotti offerti da professionisti diversi, sono considerate rilevanti le informazioni sui principali parametri che determinano la classificazione dei risultati, in una sezione raggiungibile dalla pagina dei risultati (art. 22, comma 4-bis). Inoltre è in ogni caso ingannevole mostrare risultati di ricerca senza indicare chiaramente un annuncio a pagamento, o un pagamento specifico per ottenere una posizione più alta nei risultati (art. 23, lettera m-bis).",
        ],
      },
      {
        heading: "Come risponde VERSUS alla lista di controllo",
        paragraphs: [
          "Su VERSUS scegli luce, gas o luce e gas, indichi se sei una casa o una partita IVA e inserisci i consumi: la scelta resta tua.",
        ],
        bullets: [
          "Chi c'è dietro: KEHILA S.r.l.s., con sede in Via Umberto 326 B, 95055 San Pietro Clarenza (CT), partita IVA 06237360877.",
          `Quali venditori confronta: ${COVERAGE}`,
          "Come ordina i risultati: prima le offerte «In evidenza», una scelta commerciale di VERSUS, poi le offerte a prezzo fisso, dalla spesa mensile stimata più bassa alla più alta, infine quelle a prezzo variabile.",
          `Come è remunerato: ${AGENT} Per te il confronto è gratuito.`,
          "Che cosa comprende la stima: è una stima della spesa mensile, IVA esclusa.",
          "Che cosa succede dopo la scelta: se un'offerta fa per te, puoi richiedere l'attivazione online, per un cambio fornitore, un subentro, una voltura o un primo allaccio.",
        ],
      },
    ],
    faq: [
      {
        q: "Qual è il miglior comparatore di luce e gas?",
        a: "Non c'è un comparatore che vada bene per tutti. Il Portale Offerte di ARERA è lo strumento pubblico e quello con la copertura più ampia, mentre i comparatori privati cambiano per venditori inclusi, criteri di ordinamento e servizi dopo la scelta. Usa la lista di controllo di questa guida per valutarli, VERSUS compreso.",
      },
      {
        q: "Qual è un buon comparatore di energia elettrica?",
        a: "Un buon comparatore dice chiaramente chi lo gestisce, quali venditori confronta, come ordina i risultati, come è remunerato e che cosa comprende la stima. Prima di firmare leggi sempre la Scheda sintetica del venditore.",
      },
      {
        q: "Dove posso trovare un comparatore del prezzo del gas?",
        a: "Puoi usare il Portale Offerte di ARERA, che copre luce, gas e offerte dual fuel, oppure un comparatore privato. Per il gas ti serve il consumo annuo in Smc, che trovi in bolletta. Su VERSUS scegli «gas» e vedi le offerte dei venditori con cui collaboriamo, con una stima della spesa mensile IVA esclusa.",
      },
      {
        q: "I comparatori mostrano tutte le offerte del mercato?",
        a: `Non necessariamente. Il Portale Offerte punta a raccogliere tutte le offerte rivolte al pubblico, con alcune esclusioni, per esempio quelle riservate a gruppi chiusi. Un comparatore privato può mostrarne solo una parte, e il sito dovrebbe dirlo. ${COVERAGE}`,
      },
      {
        q: "I comparatori luce e gas sono affidabili?",
        a: "Dipende da come sono costruiti, non dal solo fatto di essere un comparatore. Una stima non è una bolletta, e anche il Portale Offerte ricorda che le informazioni sulle offerte sono fornite dai venditori. Controlla chi gestisce il sito, come ordina i risultati e come è remunerato: per VERSUS la risposta è nella sezione sopra.",
      },
      {
        q: "Il Portale Offerte è il comparatore ufficiale?",
        a: "È il portale pubblico previsto dalla legge 124/2017, realizzato e gestito da Acquirente Unico su disposizione di ARERA, gratuito per famiglie e piccole imprese. VERSUS è un servizio privato: non sostituisce il Portale, e puoi usare entrambi per farti un'idea del mercato.",
      },
    ],
    sources: [
      { label: "ARERA, il Portale Offerte", url: "https://www.arera.it/consumatori/il-portale-offerte" },
      { label: "Portale Offerte, domande frequenti", url: "https://www.ilportaleofferte.it/portaleOfferte/it/domande_frequenti.page" },
      { label: "Portale Offerte, informazioni legali", url: "https://www.ilportaleofferte.it/portaleOfferte/it/informazioni-legali.page" },
      { label: "Portale Offerte, confronta le offerte", url: "https://www.ilportaleofferte.it/portaleOfferte/it/confronto-tariffe-prezzi-luce-gas.page" },
      { label: "ARERA, guida alla lettura delle voci di spesa", url: "https://www.arera.it/bolletta/guida-alla-lettura-delle-voci-di-spesa" },
      { label: "ARERA, clienti vulnerabili e Servizio a Tutele Graduali", url: "https://www.arera.it/consumatori/clienti-vulnerabili-e-servizio-tutele-graduali-1" },
      { label: "Codice del consumo, art. 22 (Normattiva)", url: "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2005-09-06;206~art22" },
      { label: "Codice del consumo, art. 23 (Normattiva)", url: "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2005-09-06;206~art23" },
    ],
    related: ["/guida/come-scegliere-offerta-luce-gas", "/guida/fine-tutela-mercato-libero", "/guida/cambio-fornitore-luce-gas"],
    publishedOn: REVIEWED_COMPARATORE,
    reviewedOn: REVIEWED_COMPARATORE,
  },
];
