"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button, Input } from "@/components/ui";
import { confirmMfaEnrollmentAction, startMfaEnrollmentAction } from "@/lib/auth/actions";
import { INITIAL_ENROLL_STATE, type EnrollFormState } from "@/lib/auth/form-state";
import { FormError } from "../../AuthCard";

export function EnrollForm() {
  const [started, startAction, starting] = useActionState(startMfaEnrollmentAction, INITIAL_ENROLL_STATE);
  if (started.done) return <Done />;
  if (!started.enrollment) {
    return (
      <form action={startAction} className="flex flex-col gap-5">
        <FormError message={started.error} />
        <p className="text-ink-muted">
          Proteggi l&apos;accesso con un codice temporaneo generato da un&apos;app di autenticazione
          (ad esempio Google Authenticator, Microsoft Authenticator o 1Password).
        </p>
        <Button type="submit" size="lg" fullWidth loading={starting}>
          Attiva la verifica in due passaggi
        </Button>
      </form>
    );
  }
  return <Confirm initial={{ attempt: 0, enrollment: started.enrollment }} />;
}

function Confirm({ initial }: { initial: EnrollFormState }) {
  const [state, action, pending] = useActionState(confirmMfaEnrollmentAction, initial);
  const [showSecret, setShowSecret] = useState(false);
  if (state.done) return <Done />;
  const enrollment = state.enrollment ?? initial.enrollment!;
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormError message={state.error} />
      <p className="text-ink-muted">Inquadra il codice QR con la tua app di autenticazione.</p>
      {/* Rendered as <img>: SVG markup in an image cannot run scripts. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`data:image/svg+xml;utf-8,${encodeURIComponent(enrollment.qrCode)}`}
        alt="Codice QR per l'app di autenticazione"
        width={200}
        height={200}
        className="mx-auto rounded-control border border-line bg-white p-2"
      />
      <div className="text-sm">
        <button
          type="button"
          className="font-semibold text-brand-700 underline"
          onClick={() => setShowSecret((v) => !v)}
        >
          Non riesci a inquadrarlo? Mostra la chiave
        </button>
        {showSecret && (
          <code className="mt-2 block break-all rounded-control bg-surface-muted px-3 py-2">
            {enrollment.secret}
          </code>
        )}
      </div>
      <Input
        label="Codice di verifica"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        required
      />
      <Button type="submit" size="lg" fullWidth loading={pending}>
        Conferma
      </Button>
    </form>
  );
}

function Done() {
  return (
    <div className="flex flex-col gap-5">
      <p role="status" className="font-medium text-brand-700">
        La verifica in due passaggi è attiva. Dal prossimo accesso ti verrà chiesto il codice.
      </p>
      <Link href="/admin" className="font-semibold text-brand-700 underline">
        Torna alla dashboard
      </Link>
    </div>
  );
}
