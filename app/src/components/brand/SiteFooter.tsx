import Link from "next/link";
import { BrandLockup } from "./BrandLockup";

/**
 * Footer of the public pages: lockup, privacy link, copyright. No legal data on purpose.
 * `data-site-footer` lets globals.css hide it while the full-screen loading view is mounted.
 */
export function SiteFooter() {
  return (
    <footer data-site-footer className="relative border-t border-line bg-surface">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-brand-700 via-brand-400 to-brand-200"
      />
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-5 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <BrandLockup size="sm" />
        <div className="flex flex-col gap-1 text-sm text-ink-muted sm:flex-row sm:items-center sm:gap-6">
          <Link
            href="/privacy"
            className="-mx-1 inline-flex min-h-11 items-center rounded-control px-1 font-medium text-ink underline decoration-brand-500 decoration-2 underline-offset-4 hover:text-brand-700"
          >
            Privacy e cookie
          </Link>
          <p>© VERSUS {new Date().getFullYear()}</p>
        </div>
      </div>
    </footer>
  );
}
