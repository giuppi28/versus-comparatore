import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getAdminRepository } from "@/lib/data/admin";
import { OfferForm } from "../OfferForm";
import { buildSupplierChoices, DEFAULT_OFFER_VALUES } from "../offer-form-schema";

export const dynamic = "force-dynamic";

export default async function NewOfferPage() {
  await requireAdmin();
  const repo = await getAdminRepository();
  const suppliers = buildSupplierChoices(await repo.listAllSuppliers());
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/offerte" className="text-sm font-semibold text-brand-700 hover:underline">
          ← Tutte le offerte
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Nuova offerta</h1>
      </div>
      <OfferForm initial={DEFAULT_OFFER_VALUES} suppliers={suppliers} />
    </div>
  );
}
