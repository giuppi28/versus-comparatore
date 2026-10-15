/**
 * New-lead notification (PRD §3 Resend, §5.1). SERVER ONLY.
 *
 * Flow: resolve recipient + config -> (log-only when anything is missing) -> build the email
 * -> POST to Resend. Never throws: failures are logged (lead id + error code, no personal data).
 *
 * Recipient (see README "Notifications"): the `settings.notification_email` value is admin-only
 * under RLS, so with the public (anon) client of the lead API it is NOT readable in Supabase mode.
 * Resolution order: (b) settings via the repository when readable (always in mock mode),
 * then (a) env NOTIFICATION_EMAIL.
 */
import { getRepository } from "@/lib/data";
import type { LeadData, Repository } from "@/lib/data";
import { monthlyCost } from "@/lib/logic/pricing";
import { normalizeEmail } from "./email-address";
import { buildNewLeadEmail, type NewLeadEmailOffer } from "./new-lead-email";
import { sendViaResend, type ResendEmail, type ResendResult } from "./resend";

export interface NewLeadNotificationInput {
  id: string;
  data: LeadData;
  completedAt: string;
}

export interface NotifyConfig {
  apiKey: string | null;
  from: string | null;
  envRecipient: string | null;
  baseUrl: string | null;
}

export interface NotifyDeps {
  repo?: Pick<Repository, "getSettings" | "listActiveOffers" | "getComune">;
  config?: NotifyConfig;
  send?: (apiKey: string, email: ResendEmail) => Promise<ResendResult>;
}

const clean = (v: string | undefined): string | null => v?.trim() || null;

export function readNotifyConfig(env: NodeJS.ProcessEnv = process.env): NotifyConfig {
  const base = clean(env.NEXT_PUBLIC_SITE_URL);
  return {
    apiKey: clean(env.RESEND_API_KEY),
    from: clean(env.RESEND_FROM),
    envRecipient: normalizeEmail(env.NOTIFICATION_EMAIL),
    baseUrl: base && /^https?:\/\//i.test(base) ? base.replace(/\/+$/, "") : null,
  };
}

/** settings.notification_email when readable, else env NOTIFICATION_EMAIL, else null. */
export async function resolveRecipient(
  repo: Pick<Repository, "getSettings">,
  envRecipient: string | null,
): Promise<string | null> {
  try {
    const fromSettings = normalizeEmail((await repo.getSettings()).notification_email);
    if (fromSettings) return fromSettings;
  } catch {
    // Not readable with the public client (RLS): fall through to the env fallback.
  }
  return envRecipient;
}

const COMMODITY_LABEL = { luce: "Luce", gas: "Gas", dual: "Luce + Gas" } as const;
const CUSTOMER_LABEL = { casa: "Casa", business: "Partita IVA" } as const;

async function collectOffers(
  repo: Pick<Repository, "listActiveOffers">,
  data: LeadData,
): Promise<NewLeadEmailOffer[]> {
  const out: NewLeadEmailOffer[] = [];
  const customerType = data.customer_type ?? null;
  const wanted = [
    { commodity: "luce" as const, id: data.chosen_offer_luce, monthly: data.final_kwh_month, label: "Luce" },
    { commodity: "gas" as const, id: data.chosen_offer_gas, monthly: data.final_smc_month, label: "Gas" },
  ];
  for (const w of wanted) {
    if (!w.id) continue;
    let name = "offerta non più disponibile";
    let cost: number | null = null;
    if (customerType) {
      try {
        const offer = (await repo.listActiveOffers(w.commodity, customerType)).find((o) => o.id === w.id);
        if (offer) {
          name = `${offer.supplier.name} - ${offer.name}`;
          cost = typeof w.monthly === "number" ? monthlyCost(offer, w.monthly * 12) : null;
        }
      } catch {
        // keep the placeholder name
      }
    }
    out.push({ commodityLabel: w.label, name, monthlyCost: cost });
  }
  return out;
}

export async function sendNewLeadNotification(
  lead: NewLeadNotificationInput,
  deps: NotifyDeps = {},
): Promise<"sent" | "logged" | "failed"> {
  try {
    const config = deps.config ?? readNotifyConfig();
    const repo = deps.repo ?? getRepository();
    const recipient = await resolveRecipient(repo, config.envRecipient);

    const missing = [
      !config.apiKey && "RESEND_API_KEY",
      !config.from && "RESEND_FROM",
      !recipient && "notification email",
    ].filter(Boolean);
    if (missing.length > 0 || !config.apiKey || !config.from || !recipient) {
      console.info(
        `[notify] lead ${lead.id} completed at ${lead.completedAt}: email not sent (missing: ${missing.join(", ")})`,
      );
      return "logged";
    }

    const { data } = lead;
    let comuneLabel: string | null = null;
    if (data.comune_istat) {
      try {
        const comune = await repo.getComune(data.comune_istat);
        if (comune) comuneLabel = `${comune.name} (${comune.province_code})`;
      } catch {
        // optional detail
      }
    }
    const email = buildNewLeadEmail({
      leadId: lead.id,
      firstName: data.first_name ?? null,
      lastName: data.last_name ?? null,
      phone: data.phone ?? null,
      commodityLabel: data.commodity ? COMMODITY_LABEL[data.commodity] : null,
      customerTypeLabel: data.customer_type ? CUSTOMER_LABEL[data.customer_type] : null,
      comuneLabel,
      offers: await collectOffers(repo, data),
      totalMonthlyCost: data.monthly_cost_shown ?? null,
      completedAt: lead.completedAt,
      baseUrl: config.baseUrl,
    });

    const send = deps.send ?? ((key, mail) => sendViaResend(key, mail));
    const result = await send(config.apiKey, { from: config.from, to: recipient, ...email });
    if (!result.ok) {
      console.error(`[notify] lead ${lead.id}: email failed (${result.error})`);
      return "failed";
    }
    console.info(`[notify] lead ${lead.id}: email sent`);
    return "sent";
  } catch (err) {
    console.error(`[notify] lead ${lead.id}: unexpected error (${err instanceof Error ? err.name : "unknown"})`);
    return "failed";
  }
}
