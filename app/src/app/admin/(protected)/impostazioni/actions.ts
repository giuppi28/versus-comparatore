"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getAdminRepository } from "@/lib/data/admin";
import { normalizeEmail } from "@/lib/notify/email-address";
import { SETTINGS_MESSAGES, type SettingsFormState } from "./settings-state";

/** Saves settings.notification_email. Empty value = notifications disabled. */
export async function updateSettingsAction(
  prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  await requireAdmin();
  const attempt = prev.attempt + 1;
  const raw = formData.get("notification_email");
  const value = (typeof raw === "string" ? raw : "").trim().slice(0, 300);

  const email = value === "" ? null : normalizeEmail(value);
  if (value !== "" && !email) {
    return { error: SETTINGS_MESSAGES.invalidEmail, email: value, attempt };
  }
  try {
    const repo = await getAdminRepository();
    await repo.updateSettings({ notification_email: email });
  } catch (err) {
    console.error("[settings] update failed:", err instanceof Error ? err.name : "unknown");
    return { error: SETTINGS_MESSAGES.saveFailed, email: value, attempt };
  }
  revalidatePath("/admin/impostazioni");
  return { saved: email ? "enabled" : "disabled", attempt };
}
