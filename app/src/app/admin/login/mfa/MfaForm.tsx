"use client";

import { useActionState } from "react";
import { Button, Input } from "@/components/ui";
import { logoutAction, verifyMfaAction } from "@/lib/auth/actions";
import { INITIAL_AUTH_STATE } from "@/lib/auth/form-state";
import { FormError } from "../AuthCard";

export function MfaForm() {
  const [state, formAction, pending] = useActionState(verifyMfaAction, INITIAL_AUTH_STATE);
  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-5" noValidate>
        <FormError message={state.error} />
        <Input
          label="Codice di verifica"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          hint="Inserisci il codice a 6 cifre generato dalla tua app di autenticazione."
        />
        <Button type="submit" size="lg" fullWidth loading={pending}>
          Verifica
        </Button>
      </form>
      <form action={logoutAction}>
        <Button type="submit" variant="ghost" fullWidth>
          Esci
        </Button>
      </form>
    </div>
  );
}
