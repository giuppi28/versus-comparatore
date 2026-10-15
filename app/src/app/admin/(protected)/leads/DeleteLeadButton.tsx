"use client";

import { useState, useTransition } from "react";
import { Button, ConfirmDialog } from "@/components/ui";
import { deleteLeadAndRedirectAction } from "./actions";
import { confirmTitle } from "./delete-notice";

/** "Elimina lead" on the detail page: confirm modal, then redirect to the list. */
export function DeleteLeadButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      // On success the action redirects (this promise never resolves with a value).
      const result = await deleteLeadAndRedirectAction(id);
      if (result && !result.ok) setError(result.message);
    });
  };

  return (
    <>
      <Button type="button" variant="danger" onClick={() => setOpen(true)} data-testid="lead-delete">
        Elimina lead
      </Button>
      <ConfirmDialog
        open={open}
        onCancel={() => {
          setOpen(false);
          setError(null);
        }}
        onConfirm={confirm}
        title={confirmTitle(1)}
        pending={pending}
        error={error}
      >
        <p>
          Il lead di <strong className="text-ink">{name}</strong> verrà eliminato definitivamente.
        </p>
        <p className="font-semibold text-ink">L&apos;operazione non può essere annullata.</p>
      </ConfirmDialog>
    </>
  );
}
