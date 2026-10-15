"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getAdminRepository } from "@/lib/data/admin";
import { OfferNotFoundError, SupplierNotFoundError } from "@/lib/data/repository";
import {
  formDataToValues,
  parseOfferForm,
  placeholderAssignmentError,
  type OfferFormState,
} from "./offer-form-schema";

const LIST_PATH = "/admin/offerte";

function refreshViews() {
  // The list and the public pages both read offers; layout scope covers every sub-page.
  revalidatePath(LIST_PATH, "layout");
}

/** Create (no `id` posted) or update (`id` posted) an offer. */
export async function saveOfferAction(
  prev: OfferFormState,
  formData: FormData,
): Promise<OfferFormState> {
  await requireAdmin();
  const rawId = formData.get("id");
  const id = typeof rawId === "string" && rawId.trim() ? rawId.trim() : null;

  const parsed = parseOfferForm(formDataToValues(formData));
  if (!parsed.ok) {
    return {
      errors: parsed.errors,
      message: "Controlla i campi evidenziati.",
      attempt: prev.attempt + 1,
    };
  }

  const repo = await getAdminRepository();

  // A placeholder supplier (Tutela / Altro fornitore / Non lo so) can only be kept, never newly assigned.
  const chosen = await repo.getSupplier(parsed.data.supplier_id);
  const current = id ? await repo.getOffer(id) : null;
  const placeholderError = placeholderAssignmentError(chosen, current?.supplier_id ?? null);
  if (placeholderError) {
    return {
      errors: { supplier_id: placeholderError },
      message: "Controlla i campi evidenziati.",
      attempt: prev.attempt + 1,
    };
  }

  let savedId: string;
  try {
    const saved = id ? await repo.updateOffer(id, parsed.data) : await repo.createOffer(parsed.data);
    savedId = saved.id;
  } catch (error) {
    if (error instanceof SupplierNotFoundError) {
      return {
        errors: { supplier_id: "Il fornitore selezionato non esiste più." },
        message: "Controlla i campi evidenziati.",
        attempt: prev.attempt + 1,
      };
    }
    if (error instanceof OfferNotFoundError) {
      return { errors: {}, message: "Offerta non trovata: potrebbe essere stata rimossa.", attempt: prev.attempt + 1 };
    }
    return {
      errors: {},
      message: "Salvataggio non riuscito. Riprova tra qualche istante.",
      attempt: prev.attempt + 1,
    };
  }

  refreshViews();
  // Reload the stored values (fees are shown per month, as stored).
  redirect(`${LIST_PATH}/${encodeURIComponent(savedId)}?esito=${id ? "salvata" : "creata"}`);
}

const FLAGS = ["active", "featured", "price_verified"] as const;
type FlagName = (typeof FLAGS)[number];

/** Quick toggles from the list: posts `id`, `flag` and the new `value` (true|false). */
export async function toggleOfferFlagAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = formData.get("id");
  const flag = formData.get("flag");
  const value = formData.get("value");
  if (typeof id !== "string" || !id) return;
  if (typeof flag !== "string" || !(FLAGS as readonly string[]).includes(flag)) return;
  if (value !== "true" && value !== "false") return;

  const repo = await getAdminRepository();
  try {
    await repo.setOfferFlags(id, { [flag as FlagName]: value === "true" });
  } catch (error) {
    if (!(error instanceof OfferNotFoundError)) throw error;
  }
  refreshViews();
}
