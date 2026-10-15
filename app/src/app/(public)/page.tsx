import Image from "next/image";
import { Page1Form, type SupplierOption } from "@/components/page1";
import { getRepository } from "@/lib/data";

// Supplier list is editable from the admin area: never bake it in at build time.
export const dynamic = "force-dynamic";

/** "Fornitore attuale" options: suppliers flagged show_in_dropdown, ordered by sort_order. */
async function loadSupplierOptions(): Promise<SupplierOption[]> {
  const suppliers = await getRepository().listActiveSuppliers();
  return suppliers
    .filter((s) => s.show_in_dropdown)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "it"))
    .map((s) => ({ id: s.id, name: s.name, sellsLuce: s.sells_luce, sellsGas: s.sells_gas }));
}

/** Page 1 — data collection + consumption estimate (PRD §6). */
export default async function Page1() {
  const suppliers = await loadSupplierOptions();
  return (
    <main className="flex-1 bg-gradient-to-b from-brand-50 to-surface pb-section">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <header className="flex flex-col gap-5 py-8 sm:py-12 lg:max-w-2xl">
          <Image
            src="/brand/versus_logo_nero.svg"
            alt="VERSUS"
            width={286}
            height={90}
            priority
            className="h-auto w-40 sm:w-52"
          />
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-display">
            Confronta le offerte luce e gas
          </h1>
          <p className="text-lg text-ink-muted">
            Rispondi a poche domande: ti mostriamo le offerte più convenienti per la tua casa o la
            tua attività.
          </p>
        </header>
        <div className="lg:max-w-2xl">
          <Page1Form suppliers={suppliers} />
        </div>
      </div>
    </main>
  );
}
