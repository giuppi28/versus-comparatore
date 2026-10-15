import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminState } from "@/lib/auth";
import { ADMIN_HOME_PATH, ADMIN_MFA_PATH, AUTH_MESSAGES } from "@/lib/auth/constants";
import { AuthCard } from "./AuthCard";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Accesso area riservata — VERSUS",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const state = await getAdminState();
  if (state.access === "ok") redirect(ADMIN_HOME_PATH);
  if (state.access === "mfa_required") redirect(ADMIN_MFA_PATH);

  const { errore } = await searchParams;
  return (
    <AuthCard title="Area riservata" subtitle="Accedi con le credenziali di amministratore.">
      <LoginForm notice={errore === "accesso" ? AUTH_MESSAGES.rejected : undefined} />
    </AuthCard>
  );
}
