import type { Lead } from "@/lib/data/types";

/**
 * Only the fields the list renders. LeadList is a client component: its props are serialized
 * into the page, so the full Lead (which holds the secret token) must never be passed to it.
 */
export const LEAD_ROW_FIELDS = [
  "id",
  "created_at",
  "updated_at",
  "step_reached",
  "status",
  "phone",
  "commodity",
  "customer_type",
  "monthly_cost_shown",
  "company_name",
  "first_name",
  "last_name",
] as const;
export type LeadRowData = Pick<Lead, (typeof LEAD_ROW_FIELDS)[number]>;
