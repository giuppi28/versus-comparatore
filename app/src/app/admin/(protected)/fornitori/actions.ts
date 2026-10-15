"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getAdminRepository } from "@/lib/data/admin";
import { InvalidLogoError, SupplierNotFoundError, SupplierSlugTakenError } from "@/lib/data";
import { sanitizeSvg, SvgSanitizeError } from "@/lib/svg/sanitize";
import type { SupplierFormState } from "./form-state";
import { parseSupplierForm } from "./validation";

const GENERIC_ERROR = "Impossibile salvare il fornitore. Riprova tra qualche istante.";

function revalidate(id?: string) {
  revalidatePath("/admin/fornitori");
  if (id) revalidatePath(`/admin/fornitori/${id}`);
}

/** Sanitizes an uploaded file. Returns the clean SVG or a user-facing error. */
async function prepareLogo(file: File): Promise<{ svg: string; removed: string[] } | { error: string }> {
  try {
    return sanitizeSvg(await file.text());
  } catch (e) {
    if (e instanceof SvgSanitizeError) return { error: e.userMessage };
    throw e;
  }
}

function removedNotice(removed: string[]): string | undefined {
  return removed.length > 0
    ? `Il logo è stato ripulito automaticamente: rimossi elementi non consentiti (${removed.slice(0, 6).join(", ")}${removed.length > 6 ? ", ..." : ""}).`
    : undefined;
}

/**
 * Create or update a supplier (and optionally its logo) from the admin form.
 * `id` (hidden field) is empty on create.
 */
export async function saveSupplierAction(_prev: SupplierFormState, formData: FormData): Promise<SupplierFormState> {
  await requireAdmin();
  const repo = await getAdminRepository();

  const rawId = String(formData.get("id") ?? "").trim();
  const parsed = parseSupplierForm(formData);
  if (!parsed.ok) {
    return { status: "error", message: "Controlla i campi evidenziati.", fieldErrors: parsed.errors };
  }
  const { values, logo, removeLogo } = parsed;

  // Sanitize before touching the database: a rejected file creates/changes nothing.
  let clean: { svg: string; removed: string[] } | null = null;
  if (logo) {
    const result = await prepareLogo(logo);
    if ("error" in result) {
      return { status: "error", message: "Controlla i campi evidenziati.", fieldErrors: { logo: result.error } };
    }
    clean = result;
  }

  if (!rawId) {
    let createdId: string;
    try {
      createdId = (await repo.createSupplier({ ...values, logo_path: null })).id;
    } catch (e) {
      if (e instanceof SupplierSlugTakenError) {
        return { status: "error", message: "Controlla i campi evidenziati.", fieldErrors: { slug: "Questo slug è già in uso." } };
      }
      console.error("createSupplier failed", e);
      return { status: "error", message: GENERIC_ERROR };
    }
    let logoFlag = "";
    if (clean) {
      try {
        const path = await repo.uploadSupplierLogo(createdId, clean.svg);
        await repo.updateSupplier(createdId, { logo_path: path });
      } catch (e) {
        console.error("logo upload after create failed", e);
        logoFlag = "&logo=errore";
      }
    }
    revalidate();
    redirect(`/admin/fornitori/${createdId}?creato=1${logoFlag}`);
  }

  try {
    let logo_path: string | null | undefined;
    if (clean) logo_path = await repo.uploadSupplierLogo(rawId, clean.svg);
    else if (removeLogo) logo_path = null;
    await repo.updateSupplier(rawId, { ...values, ...(logo_path !== undefined ? { logo_path } : {}) });
  } catch (e) {
    if (e instanceof SupplierSlugTakenError) {
      return { status: "error", message: "Controlla i campi evidenziati.", fieldErrors: { slug: "Questo slug è già in uso." } };
    }
    if (e instanceof SupplierNotFoundError) {
      return { status: "error", message: "Fornitore non trovato: potrebbe essere stato eliminato." };
    }
    if (e instanceof InvalidLogoError) {
      return { status: "error", message: "Controlla i campi evidenziati.", fieldErrors: { logo: "Il logo non è valido." } };
    }
    console.error("updateSupplier failed", e);
    return { status: "error", message: GENERIC_ERROR };
  }
  revalidate(rawId);
  return {
    status: "success",
    message: "Fornitore salvato.",
    notice: clean ? (removedNotice(clean.removed) ?? "Logo aggiornato.") : removeLogo ? "Logo rimosso." : undefined,
    savedAt: Date.now(),
  };
}
