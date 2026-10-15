import { z } from "zod";

export const NOTES_MAX_LENGTH = 5000;

export const leadAdminFormSchema = z.object({
  id: z.string().min(1).max(100),
  status: z.enum(["new", "contacted", "in_progress", "closed"], { error: "Stato non valido." }),
  notes: z
    .string()
    .max(NOTES_MAX_LENGTH, `Le note possono contenere al massimo ${NOTES_MAX_LENGTH} caratteri.`),
});

export type LeadAdminFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: { status?: string; notes?: string };
  /** Values to show in the form (last submitted / saved). */
  values?: { status: string; notes: string };
  /** Bumped on every submit so the form is re-mounted with `values`. */
  attempt: number;
};

export const INITIAL_LEAD_ADMIN_STATE: LeadAdminFormState = { status: "idle", attempt: 0 };
