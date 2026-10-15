import Link from "next/link";
import { Card } from "@/components/ui";
import type { Lead } from "@/lib/data/types";
import { StatusBadge, StepBadge } from "./LeadBadges";
import {
  COMMODITY_LABELS,
  CUSTOMER_TYPE_LABELS,
  formatDateTime,
  formatEuro,
} from "./labels";
import { leadDisplayName } from "./list-params";

export interface LeadListRow {
  lead: Lead;
  comune: string | null;
}

const dash = (v: string | null | undefined) => (v && v.trim() ? v : "—");

/** Desktop table (md+) and mobile cards (<md). Same data, only one is visible. */
export function LeadList({ rows }: { rows: LeadListRow[] }) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-card border border-line bg-surface shadow-card md:block">
        <table className="w-full min-w-[60rem] text-left text-sm">
          <thead className="border-b border-line bg-surface-muted text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th scope="col" className="px-4 py-3">Creato / aggiornato</th>
              <th scope="col" className="px-4 py-3">Nome</th>
              <th scope="col" className="px-4 py-3">Telefono</th>
              <th scope="col" className="px-4 py-3">Richiesta</th>
              <th scope="col" className="px-4 py-3">Comune</th>
              <th scope="col" className="px-4 py-3">Passo</th>
              <th scope="col" className="px-4 py-3">Stato</th>
              <th scope="col" className="px-4 py-3 text-right">Costo mensile</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(({ lead, comune }) => (
              <tr key={lead.id} data-testid="lead-item" data-step={lead.step_reached} className="align-top hover:bg-brand-50/40">
                <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
                  <div>{formatDateTime(lead.created_at)}</div>
                  <div className="text-xs">agg. {formatDateTime(lead.updated_at)}</div>
                </td>
                <td className="px-4 py-3 font-semibold">
                  <Link href={`/admin/leads/${lead.id}`} className="text-brand-700 underline underline-offset-2">
                    {leadDisplayName(lead)}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-4 py-3">{dash(lead.phone)}</td>
                <td className="px-4 py-3">
                  <div>{lead.commodity ? COMMODITY_LABELS[lead.commodity] : "—"}</div>
                  <div className="text-xs text-ink-muted">
                    {lead.customer_type ? CUSTOMER_TYPE_LABELS[lead.customer_type] : "—"}
                  </div>
                </td>
                <td className="px-4 py-3">{dash(comune)}</td>
                <td className="px-4 py-3"><StepBadge step={lead.step_reached} /></td>
                <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                <td className="whitespace-nowrap px-4 py-3 text-right">{formatEuro(lead.monthly_cost_shown)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map(({ lead, comune }) => (
          <li key={lead.id} data-testid="lead-item" data-step={lead.step_reached}>
            <Card className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <StepBadge step={lead.step_reached} />
                <StatusBadge status={lead.status} />
              </div>
              <Link
                href={`/admin/leads/${lead.id}`}
                className="text-lg font-bold text-brand-700 underline underline-offset-2"
              >
                {leadDisplayName(lead)}
              </Link>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <Item label="Telefono" value={dash(lead.phone)} />
                <Item
                  label="Richiesta"
                  value={`${lead.commodity ? COMMODITY_LABELS[lead.commodity] : "—"} · ${
                    lead.customer_type ? CUSTOMER_TYPE_LABELS[lead.customer_type] : "—"
                  }`}
                />
                <Item label="Comune" value={dash(comune)} />
                <Item label="Costo mensile" value={formatEuro(lead.monthly_cost_shown)} />
                <Item label="Creato" value={formatDateTime(lead.created_at)} />
                <Item label="Aggiornato" value={formatDateTime(lead.updated_at)} />
              </dl>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="break-words font-medium">{value}</dd>
    </div>
  );
}
