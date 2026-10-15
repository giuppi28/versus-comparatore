"use client";

import { useActionState, useState } from "react";
import { Button, Input } from "@/components/ui";
import { loginAction } from "@/lib/auth/actions";
import { INITIAL_AUTH_STATE } from "@/lib/auth/form-state";
import { FormError } from "./AuthCard";
import { TurnstileWidget } from "./TurnstileWidget";

export function LoginForm({ siteKey, notice }: { siteKey: string; notice?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, INITIAL_AUTH_STATE);
  // Token per attempt: the widget is re-mounted (fresh token) after every failure.
  const [token, setToken] = useState<{ attempt: number; value: string | null }>({
    attempt: 0,
    value: null,
  });
  const ready = token.attempt === state.attempt && !!token.value;

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
      <TurnstileWidget
        key={state.attempt}
        siteKey={siteKey}
        action="admin-login"
        onToken={(value) => setToken({ attempt: state.attempt, value })}
      />
      <Button type="submit" size="lg" fullWidth loading={pending} disabled={!ready}>
        Accedi
      </Button>
    </form>
  );
}
