import Link from "next/link";
import { Card } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { ADMIN_MFA_ENROLL_PATH } from "@/lib/auth/constants";

const SECTIONS = [
  { href: "/admin/leads", title: "Lead", text: "Richieste ricevute, stato e note interne." },
  { href: "/admin/fornitori", title: "Fornitori", text: "Elenco fornitori e loghi." },
  { href: "/admin/offerte", title: "Offerte", text: "Prezzi, condizioni e offerte attive." },
  { href: "/admin/impostazioni", title: "Impostazioni", text: "Email di notifica e controlli." },
] as const;

export default async function AdminDashboardPage() {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <ul className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <li key={s.href}>
            <Link href={s.href} className="block h-full">
              <Card className="h-full transition-colors hover:border-brand-600">
                <h2 className="text-lg font-bold">{s.title}</h2>
                <p className="mt-1 text-ink-muted">{s.text}</p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-sm text-ink-muted">
        Sicurezza:{" "}
        <Link href={ADMIN_MFA_ENROLL_PATH} className="font-semibold text-brand-700 underline">
          verifica in due passaggi
        </Link>
      </p>
    </div>
  );
}
