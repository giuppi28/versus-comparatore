"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getAdminRepository } from "@/lib/data/admin";
import { LeadDocumentNotFoundError, LeadNotFoundError } from "@/lib/data/repository";
import {
  INITIAL_LEAD_ADMIN_STATE,
  deleteLeadsSchema,
  leadDocumentUrlSchema,
  leadAdminFormSchema,
  type DeleteLeadsResult,
  type LeadAdminFormState,
  type LeadDocumentUrlResult,
} from "./schema";

const text = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");

/** Saves status + internal notes of a lead (PRD §5.1). */
export async function updateLeadAction(prev: LeadAdminFormState, formData: FormData): Promise<LeadAdminFormState> {
  await requireAdmin();
  const attempt = (prev ?? INITIAL_LEAD_ADMIN_STATE).attempt + 1;
  const raw = {
    id: text(formData.get("id")),
    status: text(formData.get("status")),
    notes: text(formData.get("notes")),
  };
  const values = { status: raw.status, notes: raw.notes };

  const parsed = leadAdminFormSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: NonNullable<LeadAdminFormState["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "status" || key === "notes") fieldErrors[key] ??= issue.message;
    }
    return {
      status: "error",
      message: "Controlla i campi evidenziati.",
      fieldErrors,
      values,
      attempt,
    };
  }

  const { id, status, notes } = parsed.data;
  try {
    const repo = await getAdminRepository();
    const saved = await repo.updateLeadAdmin(id, {
      status,
      notes: notes.trim() === "" ? null : notes.trim(),
    });
    revalidatePath("/admin/leads");
    revalidatePath(`/admin/leads/${id}`);
    return {
      status: "success",
      message: "Modifiche salvate.",
      values: { status: saved.status, notes: saved.notes ?? "" },
      attempt,
    };
  } catch (e) {
    const message = e instanceof LeadNotFoundError ? "Lead non trovato." : "Impossibile salvare le modifiche. Riprova.";
    return { status: "error", message, values, attempt };
  }
}

async function deleteValidated(ids: unknown): Promise<DeleteLeadsResult> {
  const parsed = deleteLeadsSchema.safeParse(ids);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Richiesta non valida.",
    };
  }
  const unique = [...new Set(parsed.data)];
  try {
    const repo = await getAdminRepository();
    const { deleted, documentCleanupFailed } = await repo.deleteLeadsAndDocuments(unique);
    revalidatePath("/admin/leads");
    for (const id of unique) revalidatePath(`/admin/leads/${id}`);
    return { ok: true, deleted, documentCleanupFailed };
  } catch {
    return { ok: false, message: "Impossibile eliminare i lead. Riprova." };
  }
}

/** Permanently deletes the given leads (list: single row or bulk). Admin only. */
export async function deleteLeadsAction(ids: string[]): Promise<DeleteLeadsResult> {
  await requireAdmin();
  return deleteValidated(ids);
}

/** Deletes one lead from its detail page, then redirects to the list. Returns only on error. */
export async function deleteLeadAndRedirectAction(id: string): Promise<DeleteLeadsResult> {
  await requireAdmin();
  const result = await deleteValidated([id]);
  if (!result.ok) return result;
  redirect(`/admin/leads?deleted=${result.deleted}${result.documentCleanupFailed ? "&cleanup=failed" : ""}`);
}

/**
 * Fresh short-lived (<= 300 s) signed URL of an identity document, generated on demand when the
 * admin clicks "Anteprima" / "Scarica". Never embedded in the page. Admin only.
 */
export async function createLeadDocumentUrlAction(id: string, mode: string): Promise<LeadDocumentUrlResult> {
  await requireAdmin();
  const parsed = leadDocumentUrlSchema.safeParse({ id, mode });
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Richiesta non valida.",
    };
  try {
    const repo = await getAdminRepository();
    const url = await repo.createLeadDocumentUrl(parsed.data.id, {
      download: parsed.data.mode === "download",
      expiresIn: 300,
    });
    return { ok: true, url };
  } catch (e) {
    return {
      ok: false,
      message:
        e instanceof LeadDocumentNotFoundError ? "Documento non trovato." : "Impossibile aprire il documento. Riprova.",
    };
  }
}
