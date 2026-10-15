import { Button } from "@/components/ui";
import type { LeadListParams } from "./list-params";
import { LEAD_TABS, TAB_LABELS, listHref } from "./list-params";
import { LEAD_STATUSES, PARTIAL_STEPS, STATUS_LABELS, STEP_LABELS } from "./labels";

const selectClass =
  "min-h-11 w-full rounded-control border border-line-strong bg-surface px-3 text-base text-ink focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/30";

/** Tabs (links) + GET filter form: the URL is the single source of truth (shareable). */
export function LeadFilters({ params }: { params: LeadListParams }) {
  const steps = params.tab === "parziali" ? PARTIAL_STEPS : [...PARTIAL_STEPS, "completed" as const];
  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Tipo di lead" className="flex gap-1 overflow-x-auto rounded-control border border-line bg-surface p-1">
        {LEAD_TABS.map((tab) => {
          const active = tab === params.tab;
          return (
            <a
              key={tab}
              href={listHref({ tab, status: params.status, q: params.q })}
              aria-current={active ? "page" : undefined}
              className={
                "flex-1 whitespace-nowrap rounded-control px-4 py-2 text-center font-semibold " +
                (active ? "bg-brand-600 text-white" : "text-ink hover:bg-brand-50")
              }
            >
              {TAB_LABELS[tab]}
            </a>
          );
        })}
      </nav>

      <form method="get" action="/admin/leads" role="search" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-end">
        {params.tab !== "completati" && <input type="hidden" name="tab" value={params.tab} />}
        <label className="flex flex-col gap-1.5 text-sm font-semibold sm:col-span-2 lg:col-span-1">
          Cerca
          <input
            type="search"
            name="q"
            defaultValue={params.q}
            maxLength={100}
            placeholder="Nome, telefono, codice fiscale, POD/PDR…"
            className={selectClass + " font-normal placeholder:text-ink-subtle"}
          />
        </label>
        {params.tab !== "completati" ? (
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Passo raggiunto
            <select name="step" defaultValue={params.step ?? ""} className={selectClass + " font-normal"}>
              <option value="">Tutti</option>
              {steps.map((s) => (
                <option key={s} value={s}>
                  {STEP_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="hidden lg:block" />
        )}
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Stato
          <select name="status" defaultValue={params.status ?? ""} className={selectClass + " font-normal"}>
            <option value="">Tutti</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
          <Button type="submit" variant="primary" className="flex-1 lg:flex-none">
            Filtra
          </Button>
          {(params.q || params.step || params.status) && (
            <a
              href={listHref({ tab: params.tab })}
              className="inline-flex min-h-11 items-center justify-center rounded-control border border-line-strong px-4 font-semibold hover:border-brand-600 hover:bg-brand-50"
            >
              Azzera
            </a>
          )}
        </div>
      </form>
    </div>
  );
}
