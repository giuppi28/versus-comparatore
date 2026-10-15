import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminState } from "@/lib/auth";
import { ADMIN_HOME_PATH, ADMIN_LOGIN_PATH, ADMIN_REJECT_PATH } from "@/lib/auth/constants";
import { AuthCard } from "../AuthCard";
import { MfaForm } from "./MfaForm";

export const metadata: Metadata = {
  title: "Verifica in due passaggi — VERSUS",
  robots: { index: false, follow: false },
};

export default async function AdminMfaPage() {
  const state = await getAdminState();
  if (state.access === "anonymous") redirect(ADMIN_LOGIN_PATH);
  if (state.access === "forbidden") redirect(ADMIN_REJECT_PATH);
  if (state.access === "ok") redirect(ADMIN_HOME_PATH);
  return (
    <AuthCard
      title="Verifica in due passaggi"
      subtitle="Per completare l'accesso inserisci il codice della tua app di autenticazione."
    >
      <MfaForm />
    </AuthCard>
  );
}
