"use client";

import { useActionState, useSyncExternalStore } from "react";
import { Button, Input } from "@/components/ui";
import { loginAction } from "@/lib/auth/actions";
import { INITIAL_AUTH_STATE } from "@/lib/auth/form-state";
import { FormError } from "./AuthCard";

const noopSubscribe = () => () => {};

/** False during SSR and hydration, true once React runs in the browser. */
function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function LoginForm({ notice }: { notice?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, INITIAL_AUTH_STATE);
  // The submit is enabled once hydrated, so the action always runs through React.
  const hydrated = useHydrated();

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate data-attempt={state.attempt}>
      <FormError message={state.error ?? notice} />
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="username"
        inputMode="email"
        defaultValue={state.email}
        required
        maxLength={254}
      />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        maxLength={512}
      />
      <Button type="submit" size="lg" fullWidth loading={pending} disabled={!hydrated}>
        Accedi
      </Button>
    </form>
  );
}
