"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button, Card, ConfirmDialog } from "@/components/ui";
import { deleteLeadsAction } from "./actions";
import type { LeadRowData } from "./row-data";
import { confirmTitle, deletedMessage } from "./delete-notice";
import { StatusBadge, StepBadge } from "./LeadBadges";
import { COMMODITY_LABELS, CUSTOMER_TYPE_LABELS, formatDateTime, formatEuro } from "./labels";
import { leadDisplayName } from "./list-params";

export interface LeadListRow {
  lead: LeadRowData;
  comune: string | null;
}

const dash = (v: string | null | undefined) => (v && v.trim() ? v : "—");

/** Checkbox with a >= 44px hit area (label wraps the native input). */
function RowCheck({
  checked,
  onChange,
  label,
  testId = "lead-select",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  testId?: string;
}) {
  return (
    <label className="-m-2 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
        data-testid={testId}
        className="size-5 cursor-pointer accent-brand-600"
      />
    </label>
  );
}

/**
 * Desktop table (md+) and mobile cards (<md). Same data, only one is visible.
 * Selection = rows of the visible page; the parent re-mounts this component (key) when the
 * filters or the page change, which clears the selection and the notice.
 */
export function LeadList({ rows, initialNotice = null }: { rows: LeadListRow[]; initialNotice?: string | null }) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null);
  const [notice, setNotice] = useState<string | null>(initialNotice);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const nameById = new Map(rows.map(({ lead }) => [lead.id, leadDisplayName(lead)]));
  // Only rows that are still visible can be selected (rows vanish after a delete + refresh).
  const selectedIds = rows.map(({ lead }) => lead.id).filter((id) => selected.has(id));
  const allSelected = rows.length > 0 && selectedIds.length === rows.length;

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const toggleAll = (on: boolean) => setSelected(on ? new Set(rows.map(({ lead }) => lead.id)) : new Set());

  const ask = (ids: string[]) => {
    setError(null);
    setConfirmIds(ids);
  };
  const cancel = () => {
    setConfirmIds(null);
    setError(null);
  };
  const confirm = () => {
    if (!confirmIds) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteLeadsAction(confirmIds);
      if (result.ok) {
        setNotice(deletedMessage(result.deleted));
        setSelected(new Set());
        setConfirmIds(null);
      } else {
        setError(result.message);
      }
    });
  };

  const rowDelete = (lead: LeadRowData) => (
    <Button
      type="button"
      variant="danger"
      onClick={() => ask([lead.id])}
      aria-label={`Elimina lead ${leadDisplayName(lead)}`}
      data-testid="lead-row-delete"
      className="!px-3 text-sm"
    >
      Elimina
    </Button>
  );

  const count = confirmIds?.length ?? 0;

  return (
    <>
      <p
        role="status"
        aria-live="polite"
        data-testid="lead-delete-notice"
        className={notice ? "rounded-control bg-success-soft px-4 py-3 font-semibold text-success" : "sr-only"}
      >
        {notice}
      </p>

      {rows.length === 0 && (
        <Card data-testid="lead-empty" className="text-center text-ink-muted">
          Nessun lead corrisponde ai filtri selezionati.
        </Card>
      )}

      {rows.length > 0 && (
        <div className="flex min-h-11 items-center gap-3 rounded-control border border-line bg-surface px-3">
          <RowCheck
            checked={allSelected}
            onChange={toggleAll}
            label="Seleziona tutti (pagina)"
            testId="lead-select-all"
          />
          <span className="text-sm font-semibold">Seleziona tutti (pagina)</span>
          <span className="ml-auto text-sm text-ink-muted" data-testid="lead-selected-count">
            {selectedIds.length > 0 ? `${selectedIds.length} selezionati` : ""}
          </span>
        </div>
      )}

      {selectedIds.length > 0 && (
        <div
          data-testid="lead-bulk-bar"
          className="sticky bottom-3 z-20 flex items-center justify-between gap-3 rounded-card border border-line bg-surface p-3 shadow-card"
        >
          <button
            type="button"
            onClick={() => toggleAll(false)}
            className="min-h-11 px-2 text-sm font-semibold text-ink-muted underline underline-offset-2"
          >
            Deseleziona
          </button>
          <Button type="button" variant="danger" onClick={() => ask(selectedIds)} data-testid="lead-bulk-delete">
            Elimina selezionati ({selectedIds.length})
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmIds !== null}
        onCancel={cancel}
        onConfirm={confirm}
        title={confirmTitle(count)}
        pending={pending}
        error={error}
      >
        {count === 1 && confirmIds ? (
          <p>
            Il lead di <strong className="text-ink">{nameById.get(confirmIds[0]) ?? "—"}</strong> verrà eliminato
            definitivamente.
          </p>
        ) : (
          <p>{count} lead verranno eliminati definitivamente.</p>
        )}
        <p className="font-semibold text-ink">L&apos;operazione non può essere annullata.</p>
      </ConfirmDialog>

      {rows.length > 0 && (
        <>
          <div className="hidden overflow-x-auto rounded-card border border-line bg-surface shadow-card md:block">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <thead className="border-b border-line bg-surface-muted text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th scope="col" className="w-14 px-3 py-3">
                    <span className="sr-only">Selezione</span>
                  </th>
                  <th scope="col" className="px-3 py-3">
                    Creato / aggiornato
                  </th>
                  <th scope="col" className="px-3 py-3">
                    Nome
                  </th>
                  <th scope="col" className="px-3 py-3">
                    Telefono
                  </th>
                  <th scope="col" className="px-3 py-3">
                    Richiesta
                  </th>
                  <th scope="col" className="px-3 py-3">
                    Comune
                  </th>
                  <th scope="col" className="px-3 py-3">
                    Passo
                  </th>
                  <th scope="col" className="px-3 py-3">
                    Stato
                  </th>
                  <th scope="col" className="px-3 py-3 text-right">
                    Costo mensile
                  </th>
                  <th scope="col" className="px-3 py-3 text-right">
                    <span className="sr-only">Azioni</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map(({ lead, comune }) => (
                  <tr
                    key={lead.id}
                    data-testid="lead-item"
                    data-step={lead.step_reached}
                    className="align-top hover:bg-brand-50/40"
                  >
                    <td className="px-3 py-3">
                      <RowCheck
                        checked={selected.has(lead.id)}
                        onChange={(v) => toggle(lead.id, v)}
                        label={`Seleziona ${leadDisplayName(lead)}`}
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-ink-muted">
                      <div>{formatDateTime(lead.created_at)}</div>
                      <div className="text-xs">agg. {formatDateTime(lead.updated_at)}</div>
                    </td>
                    <td className="px-3 py-3 font-semibold">
                      <Link href={`/admin/leads/${lead.id}`} className="text-brand-700 underline underline-offset-2">
                        {leadDisplayName(lead)}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">{dash(lead.phone)}</td>
                    <td className="px-3 py-3">
                      <div>{lead.commodity ? COMMODITY_LABELS[lead.commodity] : "—"}</div>
                      <div className="text-xs text-ink-muted">
                        {lead.customer_type ? CUSTOMER_TYPE_LABELS[lead.customer_type] : "—"}
                      </div>
                    </td>
                    <td className="px-3 py-3">{dash(comune)}</td>
                    <td className="px-3 py-3">
                      <StepBadge step={lead.step_reached} />
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right">{formatEuro(lead.monthly_cost_shown)}</td>
                    <td className="px-3 py-3 text-right">{rowDelete(lead)}</td>
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
                    <RowCheck
                      checked={selected.has(lead.id)}
                      onChange={(v) => toggle(lead.id, v)}
                      label={`Seleziona ${leadDisplayName(lead)}`}
                    />
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
                  <div className="flex justify-end">{rowDelete(lead)}</div>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
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
