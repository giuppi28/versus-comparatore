import { SiteHeader } from "@/components/brand";
import { BulbIllustration } from "@/components/brand/decor";
import { Page1Form, type SupplierOption } from "@/components/page1";
import { LandingSections, type SupplierLogo } from "@/components/page1/LandingSections";
import { getRepository } from "@/lib/data";
import { resolveLogoUrl } from "@/lib/data/logo";
import { isRealSupplier } from "@/lib/data/types";

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

/** Real suppliers (never the Tutela / Altro / Non lo so placeholders) that have a logo. */
async function loadSupplierLogos(): Promise<SupplierLogo[]> {
  const suppliers = await getRepository().listActiveSuppliers();
  return suppliers
    .filter(isRealSupplier)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "it"))
    .flatMap((s) => {
      const logoUrl = resolveLogoUrl(s.logo_path);
      return logoUrl ? [{ name: s.name, logoUrl }] : [];
    });
}

/** Page 1 — data collection + consumption estimate (PRD §6). */
export default async function Page1() {
  const [suppliers, logos] = await Promise.all([loadSupplierOptions(), loadSupplierLogos()]);
  return (
    <>
      <SiteHeader homeLink={false} />
      <main className="flex-1 pb-section">
        {/* Hero: overflow-hidden crops the bulb; the form below never sits under it. */}
        <div className="relative overflow-hidden">
          {/* Below lg the text spans the whole width: the bulb only peeks in from the top-right corner
              (faded out before the headline). From lg it sits right of the headline, clear of it. */}
          <BulbIllustration
            className="absolute -right-8 -top-12 h-40 text-brand-200 lg:text-brand-100 [mask-image:linear-gradient(to_bottom,#000_34%,transparent_62%)] sm:-right-10 sm:-top-14 sm:h-48 lg:left-[calc(50%+21.5rem)] lg:right-auto lg:top-5 lg:h-[28rem] lg:[mask-image:linear-gradient(to_bottom,#000_30%,transparent_72%)]"
            strokeWidth={8}
          />
          <header className="relative mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-8 pt-12 sm:items-center sm:gap-5 sm:px-6 sm:pb-10 sm:pt-16 sm:text-center">
            <h1 className="heading-wide text-hero text-ink">
              Comparatore{" "}
              <br />
              <span className="text-brand-600">luce e gas</span>
            </h1>
            <p className="max-w-xl text-lg text-ink-muted">
              Rispondi a poche domande: ti mostriamo le offerte più convenienti per la tua casa o la
              tua attività.
            </p>
          </header>
        </div>
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
          <Page1Form suppliers={suppliers} />
        </div>
        <div className="px-4 sm:px-6">
          <LandingSections suppliers={logos} />
        </div>
      </main>
    </>
  );
}
