import Link from "next/link";
import { Card } from "@/components/ui";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getAdminRepository } from "@/lib/data/admin";
import { DeleteOfferButton } from "../DeleteOfferButton";
import { OfferForm } from "../OfferForm";
import { buildSupplierChoices, offerToFormValues } from "../offer-form-schema";

export const dynamic = "force-dynamic";

export default async function EditOfferPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ esito?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { esito } = await searchParams;
  const repo = await getAdminRepository();
  const offer = await repo.getOffer(id);
  if (!offer) notFound();
  const suppliers = buildSupplierChoices(await repo.listAllSuppliers(), offer.supplier_id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/offerte" className="text-sm font-semibold text-brand-700 hover:underline">
          ← Tutte le offerte
        </Link>
        <h1 className="mt-2 heading-wide text-title break-words">Modifica offerta</h1>
        <p className="text-ink-muted">{offer.name}</p>
      </div>
      {(esito === "creata" || esito === "salvata") && (
        <p role="status" data-testid="saved-notice" className="rounded-control bg-success-soft px-4 py-3 font-medium text-success">
          {esito === "creata" ? "Offerta creata." : "Modifiche salvate."} Le quote fisse sono salvate come importo mensile.
        </p>
      )}
      <OfferForm
        key={`${offer.id}-${offer.updated_at}`}
        initial={offerToFormValues(offer)}
        suppliers={suppliers}
        offerId={offer.id}
      />
      <Card padding="lg" className="flex flex-col gap-3 border-danger/30">
        <h2 className="heading-section">Elimina offerta</h2>
        <p className="text-sm text-ink-muted">
          L&apos;eliminazione è definitiva: i lead che hanno scelto questa offerta ne conservano una copia dei dati. Se
          vuoi solo nasconderla ai clienti, disattivala.
        </p>
        <div>
          <DeleteOfferButton offerId={offer.id} offerName={offer.name} active={offer.active} className="min-h-11 w-full rounded-control border border-danger/40 bg-surface px-5 font-semibold text-danger transition-colors hover:border-danger hover:bg-danger-soft sm:w-auto" />
        </div>
      </Card>
    </div>
  );
}
