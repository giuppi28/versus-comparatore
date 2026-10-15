import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { VersusLogo } from "@/components/brand";
import { Button } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { logoutAction } from "@/lib/auth/actions";
import { AdminNav } from "./AdminNav";

export const metadata: Metadata = {
  title: "Area riservata — VERSUS",
  robots: { index: false, follow: false },
};

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
          <AdminNav />
          <div className="ml-auto flex items-center gap-3 sm:ml-0">
            {user.email && <span className="hidden text-sm text-ink-muted md:inline">{user.email}</span>}
            <form action={logoutAction}>
              <Button type="submit" variant="secondary" className="min-h-10 px-4 text-sm">
                Esci
              </Button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">{children}</div>
    </div>
  );
}
