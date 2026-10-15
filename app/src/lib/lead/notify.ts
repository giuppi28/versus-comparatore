/**
 * New-lead notification hook (PRD §5.1, §10: email to Aldo on each completed lead).
 * SERVER ONLY. Implementation in `@/lib/notify` (Resend via fetch; log-only without
 * RESEND_API_KEY / RESEND_FROM / recipient). Never throws.
 * The lead API awaits it but never fails the customer's request if it throws.
 */
import "server-only";
import type { LeadData } from "@/lib/data/types";
import { sendNewLeadNotification } from "@/lib/notify";

export interface NewLeadNotification {
  /** leads.id */
  id: string;
  /** Validated, normalised data written by the final submit (anon cannot read the row back). */
  data: LeadData;
  /** ISO timestamp of the completion. */
  completedAt: string;
  /** settings.notification_email as returned by completeLead (null when not set). */
  notificationEmail?: string | null;
}

export type NotifyNewLead = (lead: NewLeadNotification) => Promise<void>;

export const notifyNewLead: NotifyNewLead = async (lead) => {
  await sendNewLeadNotification(lead);
};
