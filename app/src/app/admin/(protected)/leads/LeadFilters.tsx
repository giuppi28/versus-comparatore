import { Button, Input, Select, cn } from "@/components/ui";
import type { LeadListParams } from "./list-params";
import { LEAD_TABS, TAB_LABELS, listHref } from "./list-params";
import { LEAD_STATUSES, PARTIAL_STEPS, STATUS_LABELS, STEP_LABELS } from "./labels";

/** Tabs (links) + GET filter form: the URL is the single source of truth (shareable). */
export function LeadFilters({ params }: { params: LeadListParams }) {
  const steps = params.tab === "parziali" ? PARTIAL_STEPS : [...PARTIAL_STEPS, "completed" as const];
  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Tipo di lead" className="flex gap-1 rounded-control bg-disabled p-1 sm:inline-flex sm:self-start">
        {LEAD_TABS.map((tab) => {
          const active = tab === params.tab;
          return (
            <a
              key={tab}
              href={listHref({ tab, status: params.status, q: params.q })}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex-1 whitespace-nowrap rounded-[0.4rem] border px-4 py-1.5 text-center text-sm font-semibold sm:flex-none sm:px-5",
                active
                  ? "border-line bg-surface text-ink shadow-card"
                  : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {TAB_LABELS[tab]}
            </a>
          );
        })}
      </nav>

      <form method="get" action="/admin/leads" role="search" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-end">
        {params.tab !== "completati" && <input type="hidden" name="tab" value={params.tab} />}
        <div className="sm:col-span-2 lg:col-span-1">
          <Input
            type="search"
            name="q"
            label="Cerca"
            defaultValue={params.q}
            maxLength={100}
            placeholder="Nome, telefono, codice fiscale, POD/PDR…"
          />
        </div>
        {params.tab !== "completati" ? (
          <Select
            name="step"
            label="Passo raggiunto"
            defaultValue={params.step ?? ""}
            options={[
              { value: "", label: "Tutti" },
              ...steps.map((s) => ({ value: s, label: STEP_LABELS[s] })),
            ]}
          />
        ) : (
          <div className="hidden lg:block" />
        )}
        <Select
          name="status"
          label="Stato"
          defaultValue={params.status ?? ""}
          options={[
            { value: "", label: "Tutti" },
            ...LEAD_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
          ]}
        />
        <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
          <Button type="submit" variant="primary" className="min-h-12 flex-1 lg:flex-none">
            Filtra
          </Button>
          {(params.q || params.step || params.status) && (
            <a
              href={listHref({ tab: params.tab })}
              className="inline-flex min-h-12 items-center justify-center rounded-control border border-control bg-surface px-5 font-semibold text-ink transition-colors hover:border-ink"
            >
              Azzera
            </a>
          )}
        </div>
      </form>
    </div>
  );
}
