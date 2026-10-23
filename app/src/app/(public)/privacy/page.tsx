import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/brand";

export const metadata: Metadata = {
  title: "Informativa sulla privacy | VERSUS",
  description:
    "Come VERSUS tratta i tuoi dati personali quando confronti le offerte luce e gas: dati raccolti, finalità, base giuridica, conservazione e diritti.",
  robots: { index: true },
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
  "comune di fornitura",
  "ragione sociale, codice fiscale e partita IVA (per le utenze non domestiche)",
  "indirizzo di fornitura",
  "codice POD (luce) e codice PDR (gas)",
  "dati di consumo (stimati in base alle tue risposte o inseriti da te)",
];

const RIGHTS = [
  "accedere ai tuoi dati e ottenerne copia;",
  "chiederne la rettifica o l’aggiornamento;",
  "chiederne la cancellazione;",
  "chiedere la limitazione del trattamento od opporti ad esso;",
  "ricevere i tuoi dati in un formato strutturato (portabilità);",
  "revocare in qualsiasi momento il consenso prestato, senza pregiudicare la liceità del trattamento effettuato prima della revoca;",
  "proporre reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it).",
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

            <Section title="2. Dati raccolti">
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
                  IBAN e documento d&apos;identità (facoltativi)
                </h3>
                <p>
                  Il conferimento di IBAN e documento d&apos;identità è facoltativo: puoi non fornirli.
                  Se li indichi, li trattiamo per le seguenti finalità:
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
                  comunicati al fornitore che hai selezionato. Il documento caricato è cancellato
                  insieme alla tua richiesta.
                </p>
                <p>Periodo di conservazione: [DA COMPLETARE].</p>
              </div>
            </Section>

            <Section title="3. Finalità del trattamento">
              <p>Trattiamo i tuoi dati per:</p>
              <ul className="list-disc space-y-1 pl-6">
                <li>mostrarti le offerte luce e gas più adatte alle tue esigenze;</li>
                <li>
                  permetterti di essere ricontattato per completare l’attivazione dell’offerta che
                  hai scelto;
                </li>
                <li>adempiere agli obblighi di legge connessi a tale attività.</li>
              </ul>
            </Section>

            <Section title="4. Base giuridica">
              <p>
                Il trattamento si fonda sul tuo consenso, che puoi prestare al momento dell’invio dei
                dati (art. 6, par. 1, lett. a, GDPR), e sull’esecuzione di misure precontrattuali
                adottate su tua richiesta (art. 6, par. 1, lett. b, GDPR). Il conferimento dei dati è
                facoltativo, ma senza di essi non possiamo completare la richiesta di attivazione.
              </p>
            </Section>

            <Section title="5. Destinatari dei dati">
              <p>
                I dati sono trattati dal titolare e da soggetti da lui incaricati o nominati
                responsabili del trattamento (ad esempio fornitori di servizi tecnici e di
                comunicazione). Per completare l’attivazione, i dati necessari possono essere
                comunicati al fornitore di energia dell’offerta che hai scelto. I dati non sono
                diffusi.
              </p>
            </Section>

            <Section title="6. Conservazione">
              <p>
                Conserviamo i tuoi dati per il tempo strettamente necessario alle finalità indicate e,
                in ogni caso, per un periodo non superiore a [Periodo di conservazione dei dati].
                Decorso tale termine i dati vengono cancellati o resi anonimi.
              </p>
            </Section>

            <Section title="7. Diritti dell’interessato">
              <p>In qualsiasi momento hai il diritto di:</p>
              <ul className="list-disc space-y-1 pl-6">
                {RIGHTS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Section>

            <Section title="8. Contatti">
              <p>
                Per esercitare i tuoi diritti o per ricevere informazioni sul trattamento dei tuoi dati
                scrivi a [Indirizzo email di contatto privacy] oppure a [Indirizzo completo del
                titolare].
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
