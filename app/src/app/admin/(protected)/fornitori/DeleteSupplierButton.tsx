"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, ConfirmDialog, cn } from "@/components/ui";
import { deleteSupplierAction } from "./actions";

/**
 * "Elimina" button + confirmation modal for one supplier. Never rendered for placeholder suppliers.
 * On success it navigates to the list with a feedback banner (query params, rendered server-side).
 */
export function DeleteSupplierButton({
  id,
  name,
  offerCount,
  tone = "outline",
  className,
}: {
  id: string;
  name: string;
  offerCount: number;
  /** "outline" for list rows, "solid" for the edit page. */
  tone?: "outline" | "solid";
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setError(null);
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteSupplierAction(id);
        if (result.status === "error") {
          setError(result.message);
          return;
        }
        const q = new URLSearchParams({ eliminato: result.name, offerte: String(result.deletedOffers) });
        if (result.logoCleanupFailed) q.set("logo", "errore");
        setOpen(false);
        router.push(`/admin/fornitori?${q.toString()}`);
        router.refresh();
      } catch {
        setError("Impossibile eliminare il fornitore. Riprova tra qualche istante.");
      }
    });
  }

  return (
    <>
      <Button
        variant={tone === "solid" ? "danger" : "secondary"}
        onClick={() => setOpen(true)}
        data-testid="delete-supplier"
        aria-label={`Elimina il fornitore ${name}`}
        className={cn(tone === "outline" && "min-h-11 border-danger/40 px-4 !text-danger hover:border-danger", className)}
      >
        Elimina
      </Button>
      <ConfirmDialog
        open={open}
        onCancel={close}
        onConfirm={confirm}
        title={`Eliminare il fornitore «${name}»?`}
        pending={pending}
        error={error}
      >
        {offerCount > 0 && (
          <p data-testid="delete-supplier-offers" className="font-semibold text-ink">
            {offerCount === 1
              ? "Questo fornitore ha 1 offerta: verrà eliminata anche l'offerta."
              : `Questo fornitore ha ${offerCount} offerte: verranno eliminate anche le offerte.`}
          </p>
        )}
        <p>I lead esistenti conservano il nome del fornitore e i dati delle offerte scelte.</p>
        <p className="font-semibold text-ink">L&apos;operazione non può essere annullata.</p>
      </ConfirmDialog>
    </>
  );
}
