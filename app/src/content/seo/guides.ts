import type { SeoPage } from "./types";

const COVERAGE =
  "Confrontiamo le offerte dei venditori con cui collaboriamo, non tutte quelle disponibili sul mercato.";
const AGENT = "VERSUS opera come agente ed è remunerato dai venditori.";
const REVIEWED = "2026-11-05";

const A = "https://www.arera.it/atlante-per-il-consumatore";

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
      "Per cambiare fornitore di luce o gas firmi un nuovo contratto con il venditore scelto. Per il gas il venditore entrante avvia la procedura e chiude il vecchio rapporto; per la luce invia il recesso al vecchio venditore con una tua procura. Di norma non resti senza energia. Per il gas, secondo ARERA, servono di norma uno o due mesi.",
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
          "Il Portale Offerte di ARERA è lo strumento pubblico ufficiale per confrontare le offerte.",
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
    related: ["/guida/voltura-luce-gas", "/guida/subentro-luce-gas", "/offerte-luce-gas", "/offerte-luce-gas-partita-iva"],
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
      "La voltura è il cambio di intestatario di un contratto già attivo. Per il gas, ARERA la definisce come passaggio senza interruzione della fornitura e con lo stesso venditore. Per la luce la chiede il nuovo cliente. Secondo ARERA servono circa 5 giorni lavorativi per la luce, se non cambi venditore, e 4 per il gas.",
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
          "Il Portale Offerte di ARERA è lo strumento pubblico ufficiale per confrontare le offerte.",
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
    related: ["/guida/subentro-luce-gas", "/guida/cambio-fornitore-luce-gas", "/guida/primo-allaccio-luce-gas", "/offerte-luce-gas"],
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
      "Il subentro è l'attivazione di una fornitura da parte di un nuovo cliente dopo che il precedente ha chiuso il contratto e il contatore è stato disattivato. Lo chiedi al venditore che scegli. Per la luce il distributore attiva di norma entro 5 giorni lavorativi, per il gas entro 10, secondo ARERA.",
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
          "Il Portale Offerte di ARERA è lo strumento pubblico ufficiale per confrontare le offerte.",
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
    related: ["/guida/voltura-luce-gas", "/guida/primo-allaccio-luce-gas", "/guida/cambio-fornitore-luce-gas", "/offerte-luce-gas"],
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
      "“Primo allaccio” è un'etichetta commerciale: nelle pagine di ARERA si parla di allacciamento, il collegamento fisico fatto dal distributore, e di attivazione, l'avvio della fornitura. Per la luce puoi chiedere entrambi a un venditore, che inoltra la richiesta al distributore entro 2 giorni lavorativi. I tempi dei lavori dipendono dalla loro complessità.",
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
          "Il Portale Offerte di ARERA è lo strumento pubblico ufficiale per confrontare le offerte.",
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
    related: ["/guida/subentro-luce-gas", "/guida/voltura-luce-gas", "/guida/cambio-fornitore-luce-gas", "/offerte-luce-gas"],
    reviewedOn: REVIEWED,
  },
];
