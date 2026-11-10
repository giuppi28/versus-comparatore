import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/brand";

export const metadata: Metadata = {
  title: { absolute: "Pagina non trovata | VERSUS" },
  robots: { index: false, follow: false },
};

/** Italian 404 for every unknown URL: same header and footer as the public pages. */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-section sm:px-6">
        <div className="flex w-full max-w-xl flex-col items-start gap-5 rounded-card border border-line bg-surface p-6 shadow-card sm:p-10">
          <h1 className="heading-wide text-display text-ink [overflow-wrap:anywhere]">Pagina non trovata</h1>
          <p className="text-lg leading-relaxed text-ink-muted">La pagina che cerchi non esiste o è stata spostata.</p>
          <Link
            href="/"
            className="heading-wide inline-flex min-h-13 items-center justify-center rounded-control bg-brand-600 px-6 text-center text-sm font-bold leading-tight text-white hover:bg-brand-700 active:bg-brand-800"
          >
            Torna al comparatore luce e gas
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
