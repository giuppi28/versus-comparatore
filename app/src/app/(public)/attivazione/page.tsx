import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ActivationForm } from "@/components/activation";
import { getRepository, type Supplier } from "@/lib/data";

export const metadata: Metadata = {
  title: "Attiva la tua offerta — VERSUS",
  robots: { index: false, follow: false },
};

// Suppliers are editable in the admin area: never serve a build-time copy.
export const dynamic = "force-dynamic";

async function loadSuppliers(): Promise<Supplier[]> {
  try {
    return await getRepository().listActiveSuppliers();
  } catch (err) {
    console.error("attivazione: could not load suppliers", err);
    return [];
  }
}

export default async function AttivazionePage() {
  const suppliers = await loadSuppliers();
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-10">
      <header className="mb-6 flex items-center justify-between gap-4">
        <Link href="/" aria-label="VERSUS">
          <Image
            src="/brand/versus_logo_nero.svg"
            alt="VERSUS"
            width={286}
            height={90}
            priority
            className="h-auto w-28 sm:w-36"
          />
        </Link>
      </header>
      <h1 className="mb-6 text-display font-bold tracking-tight text-ink">Attiva la tua offerta</h1>
      <ActivationForm suppliers={suppliers} />
    </main>
  );
}
