"use client";

import { useActionState } from "react";
import { Button, Select } from "@/components/ui";
import type { LeadStatus } from "@/lib/data/types";
import { updateLeadAction } from "./actions";
import { LEAD_STATUSES, STATUS_LABELS } from "./labels";
import { INITIAL_LEAD_ADMIN_STATE, NOTES_MAX_LENGTH } from "./schema";

export function LeadEditForm({
  id,
  status,
  notes,
}: {
  id: string;
  status: LeadStatus;
  notes: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateLeadAction, INITIAL_LEAD_ADMIN_STATE);
  const values = state.values ?? { status, notes: notes ?? "" };
  const notesError = state.fieldErrors?.notes;

  return (
    // Re-mounted after each submit so the fields show exactly what was saved / rejected.
    <form key={state.attempt} action={formAction} className="flex flex-col gap-5" data-testid="lead-edit-form" noValidate>
      <input type="hidden" name="id" value={id} />
      <Select
        label="Stato"
        name="status"
        defaultValue={values.status}
        options={LEAD_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
        error={state.fieldErrors?.status}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="lead-notes" className="text-sm font-semibold text-ink">
          Note interne
        </label>
        <textarea
          id="lead-notes"
          name="notes"
          rows={6}
          maxLength={NOTES_MAX_LENGTH + 500}
          defaultValue={values.notes}
          aria-invalid={notesError ? true : undefined}
          aria-describedby={notesError ? "lead-notes-error" : undefined}
          className={
            "w-full rounded-control border bg-surface px-4 py-3 text-base text-ink focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/30 " +
            (notesError ? "border-danger" : "border-line-strong")
          }
        />
        {notesError && (
          <p id="lead-notes-error" role="alert" className="text-sm font-medium text-danger">
            {notesError}
          </p>
        )}
        <p className="text-sm text-ink-muted">Visibili solo nell&apos;area riservata.</p>
      </div>
      {state.status === "success" && (
        <p role="status" data-testid="save-success" className="rounded-control bg-success-soft px-4 py-3 font-semibold text-success">
          {state.message}
        </p>
      )}
      {state.status === "error" && (
        <p role="alert" data-testid="save-error" className="rounded-control bg-danger-soft px-4 py-3 font-semibold text-danger">
          {state.message}
        </p>
      )}
      <Button type="submit" loading={pending} className="self-start">
        Salva
      </Button>
    </form>
  );
}
