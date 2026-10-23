"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getAdminRepository } from "@/lib/data/admin";
import { normalizeEmail } from "@/lib/notify/email-address";
import { sendTestEmail } from "@/lib/notify/test-email";
import { normalizeCallbackPhone } from "./phone";
import { SETTINGS_MESSAGES, type SettingsFormState, type TestEmailState } from "./settings-state";

/** Saves settings.notification_email (empty = notifications disabled) and callback_phone. */
export async function updateSettingsAction(
  prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  await requireAdmin();
  const attempt = prev.attempt + 1;
  const raw = formData.get("notification_email");
  const value = (typeof raw === "string" ? raw : "").trim().slice(0, 300);

  const rawPhone = formData.get("callback_phone");
  const phoneValue = (typeof rawPhone === "string" ? rawPhone : "").slice(0, 100);

  const email = value === "" ? null : normalizeEmail(value);
  const phone = normalizeCallbackPhone(phoneValue);
  const emailError = value !== "" && !email ? SETTINGS_MESSAGES.invalidEmail : undefined;
  const phoneError = phone ? undefined : SETTINGS_MESSAGES.invalidPhone;
  if (emailError || phoneError) {
    return { error: emailError, phoneError, email: value, phone: phoneValue, attempt };
  }
  try {
    const repo = await getAdminRepository();
    await repo.updateSettings({ notification_email: email, callback_phone: phone! });
  } catch (err) {
    console.error("[settings] update failed:", err instanceof Error ? err.name : "unknown");
    return { error: SETTINGS_MESSAGES.saveFailed, email: value, phone: phoneValue, attempt };
  }
  revalidatePath("/admin/impostazioni");
  return { saved: email ? "enabled" : "disabled", attempt };
}

/** Sends a test email to the currently saved notification address (Resend response shown verbatim). */
export async function sendTestEmailAction(prev: TestEmailState): Promise<TestEmailState> {
  const user = await requireAdmin();
  const attempt = prev.attempt + 1;
  try {
    const repo = await getAdminRepository();
    const r = await sendTestEmail(user.id, { repo });
    if (r.status === "sent") {
      return {
        result: "sent",
        message: `Email inviata a ${r.to}. Risposta Resend: ${r.body}`,
        attempt,
      };
    }
    return { result: "error", message: r.message, attempt };
  } catch (err) {
    console.error("[settings] test email failed:", err instanceof Error ? err.name : "unknown");
    return { result: "error", message: "Invio di prova non riuscito. Riprova tra poco.", attempt };
  }
}
