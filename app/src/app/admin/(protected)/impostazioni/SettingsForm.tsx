"use client";

import { useActionState } from "react";
import { Button, Input } from "@/components/ui";
import { updateSettingsAction } from "./actions";
import { INITIAL_SETTINGS_STATE } from "./settings-state";

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
