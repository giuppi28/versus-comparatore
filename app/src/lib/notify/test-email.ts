/**
 * Admin "Invia email di prova" (PRD E1). SERVER ONLY. Pure orchestration with injectable deps:
 * config check -> rate limit -> raw Resend call. Never returns or logs the API key.
 */
import { readNotifyConfig, resolveRecipient, type NotifyConfig } from "./index";
import { sendViaResendRaw, type ResendEmail, type ResendRawOutcome } from "./resend";
import type { Repository } from "@/lib/data";

export const TEST_EMAIL_SUBJECT = "Email di prova VERSUS";
export const TEST_EMAIL_TEXT =
  "Email di prova VERSUS — se la ricevi, le notifiche dei nuovi lead funzionano.";

export type TestEmailResult =
  | { status: "sent"; to: string; body: string }
  | { status: "error"; message: string }
  | { status: "missing_config"; message: string }
  | { status: "rate_limited"; message: string };

export const RESEND_DEV_WARNING =
  "Il mittente di prova (@resend.dev) consegna solo all'indirizzo del proprietario dell'account Resend.";

/** True when RESEND_FROM is `x@resend.dev` or `Name <x@resend.dev>`. */
export function isResendDevSender(from: string | null | undefined): boolean {
  const v = (from ?? "").trim().replace(/>$/, "").trim();
  return /@resend\.dev$/i.test(v);
}

// ---- rate limit: 1 per 30 s and 10 per hour, per admin user (in memory) ----
export const TEST_EMAIL_MIN_INTERVAL_MS = 30_000;
export const TEST_EMAIL_HOURLY_MAX = 10;
const HOUR_MS = 3_600_000;
const sends = new Map<string, number[]>();

/** Returns 0 when allowed (and records the attempt), otherwise the wait in ms. */
export function consumeTestEmailSlot(userId: string, now = Date.now()): number {
  const recent = (sends.get(userId) ?? []).filter((t) => now - t < HOUR_MS);
  const last = recent[recent.length - 1];
  let wait = 0;
  if (last !== undefined && now - last < TEST_EMAIL_MIN_INTERVAL_MS) {
    wait = TEST_EMAIL_MIN_INTERVAL_MS - (now - last);
  } else if (recent.length >= TEST_EMAIL_HOURLY_MAX) {
    wait = HOUR_MS - (now - recent[0]);
  }
  if (wait > 0) {
    sends.set(userId, recent);
    return wait;
  }
  recent.push(now);
  sends.set(userId, recent);
  return 0;
}

export function resetTestEmailLimiter(): void {
  sends.clear();
}

function waitText(ms: number): string {
  const s = Math.ceil(ms / 1000);
  if (s < 90) return `${s} second${s === 1 ? "o" : "i"}`;
  const m = Math.ceil(s / 60);
  return `${m} minuti`;
}

export interface TestEmailDeps {
  config?: NotifyConfig;
  repo: Pick<Repository, "getSettings">;
  send?: (apiKey: string, email: ResendEmail) => Promise<ResendRawOutcome>;
  now?: number;
}

export async function sendTestEmail(userId: string, deps: TestEmailDeps): Promise<TestEmailResult> {
  const config = deps.config ?? readNotifyConfig();
  const recipient = await resolveRecipient(deps.repo, config.envRecipient);

  const missing: string[] = [];
  if (!config.apiKey) missing.push("RESEND_API_KEY");
  if (!config.from) missing.push("RESEND_FROM");
  if (!recipient) missing.push("indirizzo email per le notifiche");
  if (missing.length > 0 || !config.apiKey || !config.from || !recipient) {
    return {
      status: "missing_config",
      message: `Impossibile inviare: configurazione mancante (${missing.join(", ")}). Nessuna richiesta inviata.`,
    };
  }

  const wait = consumeTestEmailSlot(userId, deps.now);
  if (wait > 0) {
    return {
      status: "rate_limited",
      message: `Troppi invii di prova: riprova tra ${waitText(wait)}.`,
    };
  }

  const send = deps.send ?? ((key, mail) => sendViaResendRaw(key, mail));
  const outcome = await send(config.apiKey, {
    from: config.from,
    to: recipient,
    subject: TEST_EMAIL_SUBJECT,
    text: TEST_EMAIL_TEXT,
    html: `<p>${TEST_EMAIL_TEXT}</p>`,
  });
  if (outcome.kind === "network") {
    return { status: "error", message: `Invio non riuscito: errore di rete (${outcome.error}).` };
  }
  if (!outcome.ok) {
    return { status: "error", message: `Errore Resend, HTTP ${outcome.status}: ${outcome.body}` };
  }
  return { status: "sent", to: recipient, body: outcome.body };
}
