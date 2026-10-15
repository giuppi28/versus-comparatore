import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { resolveLogoUrl } from "@/lib/data";
import { getAdminRepository } from "@/lib/data/admin";
import { SupplierForm } from "../SupplierForm";

export const metadata: Metadata = { title: "Modifica fornitore — Area riservata" };
export const dynamic = "force-dynamic";

export default async function EditSupplierPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ creato?: string; logo?: string }>;
}) {
  await requireAdmin();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const supplier = await (await getAdminRepository()).getSupplier(id);
  if (!supplier) notFound();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/admin/fornitori" className="text-sm font-semibold text-brand-700 underline">
          Fornitori
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">{supplier.name}</h1>
      </div>
      {query.creato === "1" && (
        <div role="status" data-testid="created-banner" className="rounded-control border border-success bg-success-soft px-4 py-3 text-sm font-medium text-brand-800">
          Fornitore creato.
          {query.logo === "errore" && " Il logo non è stato salvato: caricalo di nuovo qui sotto."}
        </div>
      )}
      <SupplierForm
        key={supplier.id}
        initial={{
          id: supplier.id,
          name: supplier.name,
          slug: supplier.slug,
          sells_luce: supplier.sells_luce,
          sells_gas: supplier.sells_gas,
          show_in_dropdown: supplier.show_in_dropdown,
          active: supplier.active,
          sort_order: supplier.sort_order,
        }}
        logoUrl={resolveLogoUrl(supplier.logo_path)}
        defaultSortOrder={supplier.sort_order}
      />
    </div>
  );
}
