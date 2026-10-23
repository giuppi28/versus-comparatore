"use client";

import { useActionState } from "react";
import { Button, Input } from "@/components/ui";
import { sendTestEmailAction, updateSettingsAction } from "./actions";
import { INITIAL_SETTINGS_STATE, INITIAL_TEST_EMAIL_STATE } from "./settings-state";

export function SettingsForm({ notificationEmail }: { notificationEmail: string | null }) {
  const [state, formAction, pending] = useActionState(updateSettingsAction, INITIAL_SETTINGS_STATE);
  return (
    <form action={formAction} noValidate data-attempt={state.attempt} className="flex flex-col gap-4">
      <Input
        label="Email per le notifiche dei nuovi lead"
        name="notification_email"
        type="email"
        inputMode="email"
        autoComplete="off"
        maxLength={254}
        defaultValue={state.email ?? notificationEmail ?? ""}
        error={state.error}
        hint="Lascia vuoto per disattivare le notifiche."
      />
      {state.saved && (
        <p role="status" data-testid="settings-saved" className="text-sm font-semibold text-brand-700">
          {state.saved === "enabled"
            ? "Impostazioni salvate."
            : "Impostazioni salvate. Le notifiche sono disattivate."}
        </p>
      )}
      <div>
        <Button type="submit" loading={pending}>
          Salva
        </Button>
      </div>
    </form>
  );
}

export function TestEmailButton() {
  const [state, formAction, pending] = useActionState(sendTestEmailAction, INITIAL_TEST_EMAIL_STATE);
  return (
    <form action={formAction} data-testid="test-email-form" data-test-attempt={state.attempt} className="flex flex-col gap-3">
      <p className="text-sm text-ink-muted">
        Invia un&apos;email di prova all&apos;indirizzo salvato qui sopra (salva prima le modifiche).
      </p>
      <div>
        <Button type="submit" variant="secondary" loading={pending}>
          Invia email di prova
        </Button>
      </div>
      {state.result === "sent" && (
        <p role="status" data-testid="test-email-result" className="text-sm font-semibold text-brand-700 break-words">
          {state.message}
        </p>
      )}
      {state.result === "error" && (
        <p
          role="alert"
          data-testid="test-email-result"
          className="rounded-control border border-danger bg-danger-soft px-4 py-3 text-sm font-semibold break-words"
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
