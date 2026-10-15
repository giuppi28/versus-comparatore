import type { Metadata } from "next";
import Link from "next/link";
import { getAuth, requireAdmin } from "@/lib/auth";
import { AuthCard } from "../../AuthCard";
import { EnrollForm } from "./EnrollForm";

export const metadata: Metadata = {
  title: "Verifica in due passaggi — VERSUS",
  robots: { index: false, follow: false },
};

export default async function AdminMfaEnrollPage() {
  await requireAdmin();
  const mfa = getAuth().mfa;
  const active = mfa ? await mfa.hasVerifiedTotp() : false;
  return (
    <AuthCard title="Verifica in due passaggi">
      {!mfa ? (
        <p className="text-ink-muted">
          La verifica in due passaggi non è disponibile in questa configurazione.
        </p>
      ) : active ? (
        <p role="status" className="font-medium text-brand-700">
          La verifica in due passaggi è già attiva.
        </p>
      ) : (
        <EnrollForm />
      )}
      {(!mfa || active) && (
        <Link href="/admin" className="mt-5 inline-block font-semibold text-brand-700 underline">
          Torna alla dashboard
        </Link>
      )}
    </AuthCard>
  );
}
