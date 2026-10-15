import Link from "next/link";

export default function LeadNotFound() {
  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="heading-wide text-title break-words">Lead non trovato</h1>
      <p className="text-ink-muted">Il lead richiesto non esiste o è stato rimosso.</p>
      <Link href="/admin/leads" className="font-semibold text-brand-700 underline underline-offset-2">
        ← Torna all&apos;elenco
      </Link>
    </div>
  );
}
