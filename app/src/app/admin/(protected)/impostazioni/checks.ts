/**
 * Go-live checklist (PRD §5.3: go-live blocked until all active offers are verified).
 * Pure logic; the page feeds it server-side facts (booleans only, never secret values).
 */

export interface GoLiveInputs {
  unverifiedActiveOffers: number;
  /** settings.notification_email is set and valid. */
  notificationEmailSet: boolean;
  /** env NOTIFICATION_EMAIL is set and valid (the lead API cannot read settings under RLS). */
  envRecipientSet: boolean;
  resendKeyPresent: boolean;
  resendFromPresent: boolean;
  /** Real (non-test) Turnstile site key AND secret key. */
  turnstileReal: boolean;
  siteUrlPresent: boolean;
  dataSource: "mock" | "supabase";
}

export interface GoLiveCheck {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
}

/** Cloudflare's documented dummy keys: 1x/2x/3x followed by zeros (site keys and secrets). */
export function isTurnstileTestKey(key: string | null | undefined): boolean {
  return /^[123]x0{10,}/i.test((key ?? "").trim());
}

export function hasRealTurnstileKeys(siteKey: string | undefined, secret: string | undefined): boolean {
  const s = (siteKey ?? "").trim();
  const k = (secret ?? "").trim();
  return !!s && !!k && !isTurnstileTestKey(s) && !isTurnstileTestKey(k);
}

export function computeGoLiveChecks(i: GoLiveInputs): GoLiveCheck[] {
  const checks: GoLiveCheck[] = [
    {
      id: "offers-verified",
      label: "Tutte le offerte attive hanno i prezzi verificati",
      ok: i.unverifiedActiveOffers === 0,
      detail:
        i.unverifiedActiveOffers === 0
          ? "Nessuna offerta attiva da verificare."
          : `${i.unverifiedActiveOffers} ${i.unverifiedActiveOffers === 1 ? "offerta attiva da verificare" : "offerte attive da verificare"}.`,
    },
    {
      id: "notification-email",
      label: "Email di notifica impostata",
      ok: i.notificationEmailSet,
      detail: i.notificationEmailSet
        ? "Indirizzo configurato."
        : "Nessun indirizzo: le notifiche dei nuovi lead sono disattivate.",
    },
  ];
  if (i.dataSource === "supabase") {
    checks.push({
      id: "env-recipient",
      label: "Destinatario disponibile al server (NOTIFICATION_EMAIL)",
      ok: i.envRecipientSet,
      detail: i.envRecipientSet
        ? "Variabile configurata."
        : "Con Supabase il server dei lead non può leggere l'email dalle impostazioni: serve la variabile NOTIFICATION_EMAIL.",
    });
  }
  checks.push(
    {
      id: "resend-key",
      label: "Invio email attivo (RESEND_API_KEY)",
      ok: i.resendKeyPresent,
      detail: i.resendKeyPresent ? "Chiave presente sul server." : "Chiave mancante: le email non vengono inviate.",
    },
    {
      id: "resend-from",
      label: "Mittente email configurato (RESEND_FROM)",
      ok: i.resendFromPresent,
      detail: i.resendFromPresent ? "Mittente configurato." : "Mittente mancante: le email non vengono inviate.",
    },
    {
      id: "turnstile",
      label: "Chiavi Turnstile reali",
      ok: i.turnstileReal,
      detail: i.turnstileReal
        ? "Chiavi di produzione presenti."
        : "Mancanti o di prova: la protezione anti-bot non è attiva.",
    },
    {
      id: "site-url",
      label: "Indirizzo del sito configurato (NEXT_PUBLIC_SITE_URL)",
      ok: i.siteUrlPresent,
      detail: i.siteUrlPresent ? "Indirizzo configurato." : "Mancante: l'email non contiene il link al lead.",
    },
    {
      id: "data-source",
      label: "Dati su Supabase",
      ok: i.dataSource === "supabase",
      detail:
        i.dataSource === "supabase"
          ? "Il sito usa il database Supabase."
          : "Il sito usa dati di prova in memoria (NEXT_PUBLIC_DATA_SOURCE).",
    },
  );
  return checks;
}

export function isReadyForGoLive(checks: readonly GoLiveCheck[]): boolean {
  return checks.every((c) => c.ok);
}

/**
 * Manual go-live items: facts the app cannot detect with the publishable key (no service role,
 * no persisted acknowledgement column). They are purely informational: they never feed
 * `isReadyForGoLive` (which covers the automatic checks only) and are always shown, prominently,
 * in a separate "Verifiche manuali" block next to the status.
 */
export interface ManualCheck {
  id: string;
  label: string;
  /** Where / how to do it, in Italian. */
  detail: string;
  /** Set when the item was already completed by someone else: shown as done, not pending. */
  doneNote?: string;
}

/** Placeholders still to be replaced in the /privacy page (owned elsewhere; kept in sync by hand). */
export const PRIVACY_PLACEHOLDERS = [
  "[Ragione sociale del titolare]",
  "[Indirizzo completo del titolare]",
  "[Partita IVA del titolare]",
  "[Indirizzo email di contatto privacy]",
  "[Periodo di conservazione dei dati]",
  "[Data di aggiornamento]",
] as const;

export const MANUAL_CHECKS: readonly ManualCheck[] = [
  {
    id: "manual-signup-disabled",
    label: "Registrazione pubblica disattivata in Supabase Auth",
    detail:
      "Dashboard Supabase → Authentication → Sign In / Providers → \"Allow new users to sign up\" disattivato.",
  },
  {
    id: "manual-admin-account",
    label: "Account amministratore di Aldo creato e inserito in public.admins",
    detail:
      "Authentication → Users → Add user (email di Aldo, Auto Confirm), poi nel SQL editor: insert into public.admins (user_id) select id from auth.users where email = '<email di Aldo>';",
  },
  {
    id: "manual-privacy-placeholders",
    label: "Informativa privacy: sostituire i segnaposto con i dati del titolare",
    detail: `Nella pagina /privacy sostituire: ${PRIVACY_PLACEHOLDERS.join(", ")}.`,
  },
  {
    id: "manual-bootstrap-dropped",
    label: "Funzione temporanea public.bootstrap_load_comuni rimossa",
    detail: "La funzione non è più raggiungibile dal sito.",
    doneNote:
      "Completato dal revisore il 15/10/2026: funzione disattivata e spostata nello schema private.",
  },
];
