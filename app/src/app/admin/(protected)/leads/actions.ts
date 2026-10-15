"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getAdminRepository } from "@/lib/data/admin";
import { LeadNotFoundError } from "@/lib/data/repository";
import { INITIAL_LEAD_ADMIN_STATE, leadAdminFormSchema, type LeadAdminFormState } from "./schema";

const text = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");

/** Saves status + internal notes of a lead (PRD §5.1). */
export async function updateLeadAction(
  prev: LeadAdminFormState,
  formData: FormData,
): Promise<LeadAdminFormState> {
  await requireAdmin();
  const attempt = (prev ?? INITIAL_LEAD_ADMIN_STATE).attempt + 1;
  const raw = { id: text(formData.get("id")), status: text(formData.get("status")), notes: text(formData.get("notes")) };
  const values = { status: raw.status, notes: raw.notes };

  const parsed = leadAdminFormSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: NonNullable<LeadAdminFormState["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "status" || key === "notes") fieldErrors[key] ??= issue.message;
    }
    return { status: "error", message: "Controlla i campi evidenziati.", fieldErrors, values, attempt };
  }

  const { id, status, notes } = parsed.data;
  try {
    const repo = await getAdminRepository();
    const saved = await repo.updateLeadAdmin(id, { status, notes: notes.trim() === "" ? null : notes.trim() });
    revalidatePath("/admin/leads");
    revalidatePath(`/admin/leads/${id}`);
    return {
      status: "success",
      message: "Modifiche salvate.",
      values: { status: saved.status, notes: saved.notes ?? "" },
      attempt,
    };
  } catch (e) {
    const message =
      e instanceof LeadNotFoundError ? "Lead non trovato." : "Impossibile salvare le modifiche. Riprova.";
    return { status: "error", message, values, attempt };
  }
}
