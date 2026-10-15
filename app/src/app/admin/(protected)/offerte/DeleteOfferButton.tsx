"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, ConfirmDialog } from "@/components/ui";
import { deleteOfferAction, toggleOfferFlagAction } from "./actions";

/**
 * "Elimina" button + confirmation dialog for one offer. Used in the list rows and in the edit page.
 * Deleting redirects to the list (server side); a failure is shown inside the dialog.
 */
export function DeleteOfferButton({
  offerId,
  offerName,
  active,
  vista,
  className,
}: {
  offerId: string;
  offerName: string;
  active: boolean;
  vista?: string;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [gone, setGone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const close = () => {
    setOpen(false);
    setError(null);
    // The offer was already removed elsewhere: drop the stale row.
    if (gone) router.refresh();
  };

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteOfferAction(offerId, { vista });
        // Success redirects server side; only a failure comes back here.
        if (result && !result.ok) {
          setError(result.error);
          setGone(result.gone === true);
        }
      } catch {
        setError("Eliminazione non riuscita. Riprova tra qualche istante.");
      }
    });
  };

  const deactivateInstead = () => {
    setError(null);
    startTransition(async () => {
      try {
        const data = new FormData();
        data.set("id", offerId);
        data.set("flag", "active");
        data.set("value", "false");
        await toggleOfferFlagAction(data);
        close();
      } catch {
        setError("Operazione non riuscita. Riprova tra qualche istante.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        data-testid="delete-offer"
        onClick={() => setOpen(true)}
        className={
          className ??
          "min-h-10 rounded-control border border-danger/40 bg-surface px-3 text-sm font-semibold text-danger transition-colors hover:border-danger hover:bg-danger-soft"
        }
      >
        Elimina
      </button>
      <ConfirmDialog
        open={open}
        onCancel={close}
        onConfirm={confirm}
        title={`Eliminare l'offerta «${offerName}»?`}
        confirmLabel="Elimina"
        pending={pending}
        error={error}
      >
        <p>I lead che hanno scelto questa offerta ne conservano una copia dei dati.</p>
        <p className="font-semibold text-ink">L&apos;operazione non può essere annullata.</p>
        <p>Se vuoi solo nasconderla ai clienti, disattivala.</p>
        {active && (
          <Button
            variant="secondary"
            onClick={deactivateInstead}
            disabled={pending}
            data-testid="delete-offer-deactivate"
            className="w-full"
          >
            Disattiva invece
          </Button>
        )}
      </ConfirmDialog>
    </>
  );
}
