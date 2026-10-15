import { SiteHeader } from "@/components/brand";
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
    <>
      <SiteHeader homeLink={false} />
      <main className="flex-1 pb-section">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <header className="flex flex-col gap-4 pb-8 pt-8 sm:gap-5 sm:pb-10 sm:pt-12 lg:max-w-2xl">
            <h1 className="heading-wide text-hero text-ink">
              Comparatore{" "}
              <br />
              <span className="text-brand-600">luce e gas</span>
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
    </>
  );
}
