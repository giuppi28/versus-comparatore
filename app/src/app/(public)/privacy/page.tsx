import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/brand";

export const metadata: Metadata = {
  title: "Informativa sulla privacy | VERSUS",
  description:
    "Come VERSUS tratta i tuoi dati personali quando confronti le offerte luce e gas: dati raccolti, finalità, base giuridica, conservazione e diritti.",
  robots: { index: false, follow: false },
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold tracking-tight text-ink">{title}</h2>
      {children}
    </section>
  );
}

const DATA_COLLECTED = [
  "nome e cognome",
  "numero di telefono",
  "codice fiscale",
  "ragione sociale e partita IVA (per le utenze non domestiche)",
  "comune, CAP e indirizzo di fornitura, e se sei residente a quell’indirizzo",
  "codice POD (luce) e codice PDR (gas)",
  "potenza impegnata e tensione di fornitura",
  "dati di consumo (stimati in base alle tue risposte o inseriti da te)",
  "fornitore attuale di luce e gas",
  "offerta scelta e relativa spesa mensile mostrata",
  "IBAN ed eventuali dati dell’intestatario del conto, se diverso dal titolare (obbligatori solo per le offerte che prevedono il pagamento con IBAN, altrimenti facoltativi)",
  "dati del documento d’identità (tipo, numero, scadenza, ente di rilascio) e copia del documento caricata (facoltativi)",
  "copia della bolletta in PDF (facoltativa), conservata come il documento d’identità; i dati che contiene (POD, PDR, codice fiscale, fornitore) sono letti solo nel tuo browser per precompilare il modulo, senza servizi esterni",
];

const COOKIES = [
  "versus_lead: cookie tecnico (httpOnly, durata 24 ore) che collega il tuo browser al confronto in corso, così puoi continuare senza ricominciare;",
  "versus_lead_step: cookie tecnico (httpOnly, durata 24 ore) che ricorda l’ultimo passaggio raggiunto nel confronto;",
  "cookie di sessione di accesso all’area riservata: impostati solo quando il personale autorizzato effettua il login (autenticazione Supabase) e non riguardano chi usa il comparatore.",
];

const RIGHTS = [
  "accedere ai tuoi dati e ottenerne copia;",
  "chiederne la rettifica o l’aggiornamento;",
  "chiederne la cancellazione;",
  "chiedere la limitazione del trattamento;",
  "opporti al trattamento basato sul legittimo interesse del titolare (art. 21 GDPR);",
  "ricevere i tuoi dati in un formato strutturato (portabilità);",
  "proporre reclamo al Garante per la protezione dei dati personali (garanteprivacy.it).",
];

/** Privacy notice (PRD §13.1). Facts still pending from the client are shown as bracketed placeholders. */
export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 pb-section">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <header className="flex flex-col gap-5 pb-8 pt-8 sm:pb-10 sm:pt-12">
            <Link
              href="/"
              className="w-fit text-sm font-medium text-brand-700 underline underline-offset-4 hover:text-brand-600"
            >
              ← Torna al confronto
            </Link>
            <h1
              data-testid="privacy-heading"
              className="heading-wide text-display text-ink"
            >
              Informativa sulla privacy
            </h1>
            <p className="text-base text-ink-muted">
              Informativa resa ai sensi degli artt. 13 e 14 del Regolamento (UE) 2016/679 (GDPR) a chi
              utilizza il comparatore VERSUS.
            </p>
          </header>

          <article className="flex flex-col gap-8 rounded-card border border-line bg-surface p-5 text-base leading-relaxed text-ink sm:p-8">
            <Section title="1. Titolare del trattamento">
              <p>
                Il titolare del trattamento è [Ragione sociale del titolare], con sede in [Indirizzo
                completo del titolare], P.IVA [Partita IVA del titolare]. Per qualsiasi richiesta
                puoi scrivere a [Indirizzo email di contatto privacy].
              </p>
            </Section>

            <Section title="2. Responsabile del trattamento">
              <p>
                Il titolare si avvale di SiteXP per la gestione tecnica del sito, in qualità di
                responsabile del trattamento. Contatto: info@sitexp.it.
              </p>
            </Section>

            <Section title="3. Dati raccolti">
              <p>Attraverso il comparatore raccogliamo i seguenti dati che ci fornisci direttamente:</p>
              <ul className="list-disc space-y-1 pl-6">
                {DATA_COLLECTED.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p>
                Non raccogliamo dati appartenenti a categorie particolari (come i dati relativi alla
                salute).
              </p>
              <div className="flex flex-col gap-3">
                <h3 className="text-lg font-semibold tracking-tight text-ink">
                  IBAN, documento d&apos;identità e bolletta
                </h3>
                <p>
                  L&apos;IBAN è obbligatorio per le offerte che prevedono il pagamento con IBAN: tali
                  offerte lo indicano prima dell&apos;attivazione e, senza l&apos;IBAN, quell&apos;offerta non
                  può essere attivata. Per le altre offerte l&apos;IBAN è facoltativo. Il documento
                  d&apos;identità e la bolletta sono sempre facoltativi: puoi non fornirli. Se li
                  indichi, li trattiamo per le seguenti finalità:
                </p>
                <ul className="list-disc space-y-1 pl-6">
                  <li>
                    identificazione del cliente per l&apos;attivazione del contratto (documento
                    d&apos;identità);
                  </li>
                  <li>addebito diretto in conto (IBAN / domiciliazione bancaria).</li>
                </ul>
                <p>
                  L&apos;accesso a questi dati è consentito solo al personale autorizzato. Per
                  completare l&apos;attivazione dell&apos;offerta scelta, i dati necessari possono essere
                  comunicati al fornitore che hai selezionato. I file caricati sono cancellati
                  insieme alla tua richiesta.
                </p>
                <p>Periodo di conservazione: [Periodo di conservazione dei dati].</p>
              </div>
            </Section>

            <Section title="4. Finalità e basi giuridiche">
              <ul className="list-disc space-y-2 pl-6">
                <li>
                  confrontare le offerte luce e gas, gestire la richiesta di attivazione e il
                  ricontatto che richiedi con «Richiamami»: esecuzione di misure precontrattuali
                  adottate su tua richiesta (art. 6, par. 1, lett. b, GDPR);
                </li>
                <li>
                  adempimenti di legge, in particolare fiscali, e richieste delle autorità: obbligo
                  legale (art. 6, par. 1, lett. c, GDPR);
                </li>
                <li>
                  sicurezza del sito e prevenzione di abusi (limiti alle richieste per indirizzo IP,
                  log tecnici): legittimo interesse del titolare (art. 6, par. 1, lett. f, GDPR).
                </li>
              </ul>
              <p>
                Non utilizziamo i tuoi dati per finalità di marketing: il modulo non prevede alcun
                consenso a comunicazioni promozionali.
              </p>
            </Section>

            <Section title="5. Destinatari dei dati">
              <ul className="list-disc space-y-1 pl-6">
                <li>
                  il venditore dell&apos;offerta che hai scelto, per attivare la fornitura;
                </li>
                <li>SiteXP, responsabile del trattamento (gestione tecnica del sito);</li>
                <li>
                  fornitori tecnici di SiteXP, in qualità di sub-responsabili: Vercel Inc. (hosting,
                  Stati Uniti; server delle funzioni a Francoforte), Supabase (database e
                  archiviazione dei file, server a Francoforte, Germania) e Resend (invio
                  dell&apos;email di notifica della richiesta al titolare, Stati Uniti);
                </li>
                <li>
                  eventuale call center esterno incaricato dal titolare: [Call center esterno: nome o
                  &quot;nessuno&quot;].
                </li>
              </ul>
              <p>I dati non sono diffusi.</p>
            </Section>

            <Section title="6. Trasferimenti extra-UE">
              <p>
                Vercel e Resend sono società statunitensi. Il trasferimento avviene sulla base della
                decisione di adeguatezza UE-USA (EU-US Data Privacy Framework, decisione della
                Commissione europea del 10 luglio 2023) per le società certificate e, in ogni caso,
                delle clausole contrattuali tipo approvate dalla Commissione europea.
              </p>
            </Section>

            <Section title="7. Conservazione">
              <p>
                Conserviamo i tuoi dati per il tempo strettamente necessario alle finalità indicate e,
                in ogni caso, per un periodo non superiore a [Periodo di conservazione dei dati].
                Decorso tale termine i dati vengono cancellati o resi anonimi.
              </p>
            </Section>

            <Section title="8. Cookie">
              <p>
                Questo sito utilizza solo cookie tecnici, necessari al funzionamento del servizio.
                Non utilizziamo cookie di analisi, di profilazione o pubblicitari, né strumenti di
                tracciamento di terze parti: per questo non è richiesto alcun banner di consenso.
              </p>
              <ul className="list-disc space-y-1 pl-6">
                {COOKIES.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p>
                Per non perdere i dati inseriti se aggiorni la pagina durante il confronto,
                utilizziamo anche la memoria di sessione del browser (sessionStorage): contiene i dati
                che inserisci nel modulo (inclusi i dati personali), resta sul tuo dispositivo e viene
                eliminata alla chiusura della scheda.
              </p>
            </Section>

            <Section title="9. Diritti dell’interessato">
              <p>In qualsiasi momento hai il diritto di:</p>
              <ul className="list-disc space-y-1 pl-6">
                {RIGHTS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p>
                Per esercitare i tuoi diritti scrivi a [Indirizzo email di contatto privacy] oppure a
                [Indirizzo completo del titolare].
              </p>
            </Section>

            <Section title="10. Conferimento dei dati">
              <p>
                Nome, cognome, telefono, email, indirizzo e codici POD/PDR sono necessari per
                confrontare e attivare l&apos;offerta: senza, la richiesta non può essere completata.
                L&apos;IBAN è necessario solo per le offerte che lo indicano. Il documento
                d&apos;identità e la bolletta sono facoltativi.
              </p>
            </Section>

            <p className="text-sm text-ink-muted">Ultimo aggiornamento: [Data di aggiornamento].</p>
          </article>

          <div className="py-8">
            <Link
              href="/"
              className="text-sm font-medium text-brand-700 underline underline-offset-4 hover:text-brand-600"
            >
              ← Torna al confronto
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
