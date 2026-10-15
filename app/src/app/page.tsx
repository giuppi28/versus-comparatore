import Image from "next/image";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-brand-50 to-surface px-5 py-section">
      <div className="flex w-full max-w-xl flex-col items-center gap-6 text-center">
        <Image
          src="/brand/versus_logo_nero.svg"
          alt="VERSUS"
          width={286}
          height={90}
          priority
          className="h-auto w-56 sm:w-72"
        />
        <h1 className="text-display font-bold tracking-tight">
          Confronta luce e gas, scegli l&apos;offerta giusta per te
        </h1>
        <p className="text-lg text-ink-muted">
          Il comparatore VERSUS ti aiuta a trovare in pochi passaggi le offerte luce e gas più
          convenienti per la tua casa o la tua attività.
        </p>
      </div>
    </main>
  );
}
