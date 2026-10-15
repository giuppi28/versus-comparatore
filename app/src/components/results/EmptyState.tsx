import Link from "next/link";

/** No offer available for the customer's request (PRD §8). No call/callback wording. */
export function EmptyState({ commodityLabel }: { commodityLabel: string }) {
  return (
    <div data-testid="results-empty" className="rounded-card border border-line bg-surface p-6 text-center shadow-card">
      <h2 className="text-lg font-bold text-ink">Nessuna offerta disponibile al momento</h2>
      <p className="mt-2 text-ink-muted">
        Per i dati che hai inserito non abbiamo trovato offerte {commodityLabel.toLowerCase()} disponibili. Puoi
        controllare e modificare i dati inseriti oppure riprovare più tardi.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center rounded-control bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700"
        >
          Modifica i dati
        </Link>
      </div>
    </div>
  );
}
