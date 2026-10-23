import { z } from "zod";

export const NOTES_MAX_LENGTH = 5000;

export const leadAdminFormSchema = z.object({
  id: z.string().min(1).max(100),
  status: z.enum(["new", "contacted", "in_progress", "closed"], {
    error: "Stato non valido.",
  }),
  notes: z.string().max(NOTES_MAX_LENGTH, `Le note possono contenere al massimo ${NOTES_MAX_LENGTH} caratteri.`),
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

export const INITIAL_LEAD_ADMIN_STATE: LeadAdminFormState = {
  status: "idle",
  attempt: 0,
};

/** Max leads per delete call (PHASE11 D2). */
export const DELETE_LEADS_MAX = 200;

export const deleteLeadsSchema = z
  .array(z.string().uuid("Identificativo lead non valido."))
  .min(1, "Seleziona almeno un lead.")
  .max(DELETE_LEADS_MAX, `Puoi eliminare al massimo ${DELETE_LEADS_MAX} lead per volta.`);

export type DeleteLeadsResult =
  { ok: true; deleted: number; documentCleanupFailed: boolean } | { ok: false; message: string };

export const leadDocumentUrlSchema = z.object({
  id: z.string().uuid("Documento non valido."),
  mode: z.enum(["preview", "download"], { error: "Richiesta non valida." }),
});

export type LeadDocumentUrlResult = { ok: true; url: string } | { ok: false; message: string };
