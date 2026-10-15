import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { VersusLogo } from "@/components/brand";
import { requireAdmin } from "@/lib/auth";
import { logoutAction } from "@/lib/auth/actions";

export const metadata: Metadata = {
  title: "Area riservata — VERSUS",
  robots: { index: false, follow: false },
};

/** Every admin route lives under this route group (URLs stay /admin/...). */
const NAV = [
  { href: "/admin/leads", label: "Lead" },
  { href: "/admin/fornitori", label: "Fornitori" },
  { href: "/admin/offerte", label: "Offerte" },
  { href: "/admin/impostazioni", label: "Impostazioni" },
] as const;

export default async function AdminProtectedLayout({ children }: { children: ReactNode }) {
  // Defence in depth: the proxy only checks authentication; this checks the admin role + MFA.
  const user = await requireAdmin();
  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface-muted">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3">
          <Link href="/admin" className="shrink-0" aria-label="Dashboard">
            <VersusLogo className="h-8 w-auto" />
          </Link>
          <nav aria-label="Area riservata" className="order-last w-full overflow-x-auto sm:order-none sm:w-auto sm:flex-1">
            <ul className="flex gap-1">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block whitespace-nowrap rounded-control px-3 py-2 font-semibold text-ink hover:bg-brand-50 hover:text-brand-700"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-3 sm:ml-0">
            {user.email && <span className="hidden text-sm text-ink-muted md:inline">{user.email}</span>}
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-control border border-line-strong px-4 py-2 text-sm font-semibold hover:border-brand-600 hover:bg-brand-50"
              >
                Esci
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">{children}</div>
    </div>
  );
}
