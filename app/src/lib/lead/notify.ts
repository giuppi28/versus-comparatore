/**
 * New-lead notification hook (PRD §5.1, §10: email to Aldo on each completed lead).
 * SERVER ONLY.
 *
 * STUB: logs the lead id only (never personal data). admin-settings-builder replaces the
 * body with the Resend email to `settings.notification_email`, keeping this signature.
 * The lead API awaits it but never fails the customer's request if it throws.
 */
import type { LeadData } from "@/lib/data/types";

export interface NewLeadNotification {
  /** leads.id */
  id: string;
  /** Validated, normalised data written by the final submit (anon cannot read the row back). */
  data: LeadData;
  /** ISO timestamp of the completion. */
  completedAt: string;
}

export type NotifyNewLead = (lead: NewLeadNotification) => Promise<void>;

export const notifyNewLead: NotifyNewLead = async (lead) => {
  console.info(`[lead] completed lead ${lead.id} at ${lead.completedAt} (notification stub)`);
};
