import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getAdminRepository } from "@/lib/data/admin";
import { SupplierForm } from "../SupplierForm";

export const metadata: Metadata = { title: "Nuovo fornitore — Area riservata" };
export const dynamic = "force-dynamic";

export default async function NewSupplierPage() {
  await requireAdmin();
  const suppliers = await (await getAdminRepository()).listAllSuppliers();
  // Next free slot after the regular suppliers (special entries use 100+).
  const regular = suppliers.map((s) => s.sort_order).filter((n) => n < 100);
  const defaultSortOrder = (regular.length ? Math.max(...regular) : 0) + 1;
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/admin/fornitori" className="text-sm font-semibold text-brand-700 underline">
          Fornitori
        </Link>
        <h1 className="heading-wide text-title break-words">Nuovo fornitore</h1>
      </div>
      <SupplierForm initial={null} logoUrl={null} defaultSortOrder={defaultSortOrder} />
    </div>
  );
}
