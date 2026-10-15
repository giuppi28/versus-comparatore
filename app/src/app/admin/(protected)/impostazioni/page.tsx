import Link from "next/link";
import { Card } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getAdminRepository } from "@/lib/data/admin";
import { getDataSource } from "@/lib/data";
import { normalizeEmail } from "@/lib/notify/email-address";
import { MANUAL_CHECKS, computeGoLiveChecks, isReadyForGoLive } from "./checks";
import { SettingsForm } from "./SettingsForm";

export const metadata = { title: "Impostazioni — Area riservata VERSUS" };

const COMMODITY = { luce: "Luce", gas: "Gas" } as const;

export default async function SettingsPage() {
  await requireAdmin();
  const repo = await getAdminRepository();
  const [settings, unverified] = await Promise.all([repo.getSettings(), repo.listUnverifiedActiveOffers()]);

  const notificationEmail = normalizeEmail(settings.notification_email);
  // Server-side facts only: booleans, never the secret values.
  const checks = computeGoLiveChecks({
    unverifiedActiveOffers: unverified.length,
    notificationEmailSet: !!notificationEmail,
    envRecipientSet: !!normalizeEmail(process.env.NOTIFICATION_EMAIL),
    resendKeyPresent: !!process.env.RESEND_API_KEY?.trim(),
    resendFromPresent: !!process.env.RESEND_FROM?.trim(),
    siteUrlPresent: /^https?:\/\//i.test(process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? ""),
    dataSource: getDataSource(),
  });
  const ready = isReadyForGoLive(checks);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold tracking-tight">Impostazioni</h1>

      <section aria-labelledby="notifiche-title">
        <Card padding="lg" className="flex max-w-2xl flex-col gap-4">
          <h2 id="notifiche-title" className="text-xl font-bold">
            Notifiche
          </h2>
          <p className="text-ink-muted">
            A questo indirizzo arriva un&apos;email per ogni nuovo lead completato.
          </p>
          {!notificationEmail && (
            <p
              role="alert"
              data-testid="notifications-disabled"
              className="rounded-control border border-warning bg-warning-soft px-4 py-3 font-semibold"
            >
              Notifiche disattivate: nessun indirizzo email impostato. I nuovi lead non vengono segnalati via email.
            </p>
          )}
          <SettingsForm notificationEmail={notificationEmail} />
        </Card>
      </section>

      <section aria-labelledby="golive-title">
        <Card padding="lg" className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="golive-title" className="text-xl font-bold">
              Checklist di pubblicazione
            </h2>
            <p
              data-testid="golive-status"
              className={
                ready
                  ? "rounded-full bg-brand-100 px-4 py-1.5 font-bold text-brand-800"
                  : "rounded-full bg-danger-soft px-4 py-1.5 font-bold text-danger"
              }
            >
              {ready ? "Pronto per la pubblicazione" : "Non pronto"}
            </p>
          </div>

          <ul className="flex flex-col divide-y divide-line" aria-label="Controlli">
            {checks.map((c) => (
              <li key={c.id} data-check={c.id} data-ok={c.ok} className="flex items-start gap-3 py-3">
                <span
                  aria-hidden="true"
                  className={`mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${c.ok ? "bg-brand-600" : "bg-danger"}`}
                >
                  {c.ok ? "✓" : "!"}
                </span>
                <div>
                  <p className="font-semibold">
                    {c.label}
                    <span className="sr-only">{c.ok ? " — superato" : " — da completare"}</span>
                  </p>
                  <p className="text-sm text-ink-muted">{c.detail}</p>
                </div>
              </li>
            ))}
          </ul>

          <div
            data-testid="manual-checks"
            className="flex flex-col gap-3 rounded-control border border-warning bg-warning-soft p-4"
          >
            <h3 className="text-lg font-bold">Verifiche manuali</h3>
            <p className="text-sm">
              Queste voci non si possono rilevare dal sito e non cambiano lo stato qui sopra: controllale
              a mano prima di pubblicare.
            </p>
            <ul className="flex flex-col gap-3" aria-label="Verifiche manuali">
              {MANUAL_CHECKS.map((m) =>
                m.doneNote ? (
                  <li
                    key={m.id}
                    data-check={m.id}
                    data-manual="true"
                    data-done="true"
                    className="flex items-start gap-3"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white"
                    >
                      ✓
                    </span>
                    <div>
                      <p className="font-semibold">
                        {m.label}
                        <span className="sr-only"> — completato</span>
                      </p>
                      <p className="text-sm text-ink-muted break-words">{m.doneNote}</p>
                    </div>
                  </li>
                ) : (
                  <li key={m.id} data-check={m.id} data-manual="true" className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-warning text-sm font-bold text-white"
                    >
                      ?
                    </span>
                    <div>
                      <p className="font-semibold">
                        {m.label}
                        <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs font-bold uppercase tracking-wide">
                          Da verificare manualmente
                        </span>
                      </p>
                      <p className="text-sm break-words">{m.detail}</p>
                    </div>
                  </li>
                ),
              )}
            </ul>
          </div>

          {unverified.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-bold">Offerte attive da verificare</h3>
              <ul data-testid="unverified-offers" className="flex flex-col gap-2">
                {unverified.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/admin/offerte/${o.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-line px-4 py-3 hover:border-brand-600 hover:bg-brand-50"
                    >
                      <span className="font-semibold">
                        {o.supplier.name} — {o.name}
                      </span>
                      <span className="text-sm text-ink-muted">
                        {COMMODITY[o.commodity]} · Verifica prezzi
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
