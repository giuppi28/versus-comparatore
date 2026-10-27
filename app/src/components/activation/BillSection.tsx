"use client";

import { useId, useRef, useState } from "react";
import { Button, CheckIcon, CloseIcon, Input, Modal, Select, SpinnerIcon } from "@/components/ui";
import { CheckboxField } from "@/components/page1/parts";
import { extractPdfText } from "@/lib/bill/extract";
import { parseBillText } from "@/lib/bill/parse";
import type { Supplier } from "@/lib/data/types";
import { DOCUMENT_MAX_BYTES } from "@/lib/logic/validators";
import {
  normalizePdr,
  normalizePod,
  CODICE_FISCALE_MESSAGES,
  validateCodiceFiscale,
  validatePdr,
  validatePod,
} from "@/lib/logic/validators";
import { LeadApiError, removeLeadDocument, uploadLeadDocument } from "@/lib/lead/client";
import {
  billConflicts,
  buildBillDraft,
  dropMismatchedTaxCode,
  hasBillValues,
  planBillMerge,
  type BillField,
  type BillFieldAvailability,
  type BillValues,
} from "./bill-merge";
import { addDocumentPatch, formatUploadSize, removeDocumentPatch, removeErrorMessage, supplierOptions } from "./logic";
import type { StepProps } from "./types";

const BILL_ERRORS: Record<string, string> = {
  file_type: "Carica la bolletta in formato PDF.",
  file_size: "Il file supera il limite di 4 MB. Prova con un file più leggero.",
  file_content: "Il file non sembra un PDF valido.",
  file_missing: "Il file è vuoto: scegline un altro.",
  too_many_bills: "Hai già caricato una bolletta: rimuovila per caricarne un'altra.",
  rate_limited: "Troppe richieste: attendi qualche istante e riprova.",
  network_error: "Connessione assente: controlla la rete e riprova.",
};

function billErrorMessage(code: string): string {
  return BILL_ERRORS[code] ?? "Caricamento non riuscito, riprova.";
}

const UNREADABLE = "Non siamo riusciti a leggere i dati: inseriscili a mano.";

type BillSectionProps = Pick<StepProps, "state" | "update" | "touch" | "edited"> & {
  suppliers: readonly Supplier[];
  avail: BillFieldAvailability;
};

/** "Bolletta (facoltativa)": one digital PDF, read in the browser to prefill step B. */
export function BillFields({ state, update, edited, touch, suppliers, avail }: BillSectionProps) {
  const a = state.activation;
  const fileId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [draft, setDraft] = useState<BillValues | null>(null);
  const bill = a.documents.find((d) => d.kind === "bill");

  const current: BillValues = {
    pod: a.pod,
    pdr: a.pdr,
    taxCode: a.taxCode,
    supplierLuce: state.currentSupplierLuce ?? "",
    supplierGas: state.currentSupplierGas ?? "",
  };

  async function onFiles(files: FileList | null) {
    const file = files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    setError(null);
    setNotice(null);
    if (file.type !== "application/pdf") return setError(billErrorMessage("file_type"));
    if (file.size > DOCUMENT_MAX_BYTES) return setError(billErrorMessage("file_size"));
    setBusy(true);
    try {
      // Upload and in-browser reading run in parallel; the text never leaves the browser.
      const [doc, text] = await Promise.all([uploadLeadDocument(file, "bill"), extractPdfText(file)]);
      update((s) => addDocumentPatch(s, { ...doc, name: file.name }));
      const proposal = dropMismatchedTaxCode(
        buildBillDraft(parseBillText(text, [...suppliers]), suppliers, avail),
        { firstName: state.firstName.trim(), lastName: state.lastName.trim() },
      );
      if (hasBillValues(proposal)) setDraft(proposal);
      else setNotice(UNREADABLE);
    } catch (err) {
      setError(billErrorMessage(err instanceof LeadApiError ? err.code : "upload_failed"));
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(id: string) {
    setError(null);
    setNotice(null);
    setRemoving(true);
    try {
      await removeLeadDocument(id);
    } catch (err) {
      if (!(err instanceof LeadApiError && err.code === "document_not_found")) {
        setError(removeErrorMessage(err instanceof LeadApiError ? err.code : "server_error"));
        setRemoving(false);
        return;
      }
    }
    update((s) => removeDocumentPatch(s, id));
    setRemoving(false);
  }

  function cancelDialog() {
    setDraft(null);
    // The file input is gone once a bill is attached: send focus to the bill item
    // (after the modal has restored focus to its trigger on unmount).
    setTimeout(() => itemRef.current?.focus(), 0);
  }

  function apply(values: Partial<BillValues>) {
    const activation: Record<string, string> = {};
    const top: Record<string, string> = {};
    if (values.pod !== undefined) activation.pod = values.pod;
    if (values.pdr !== undefined) activation.pdr = values.pdr;
    if (values.taxCode !== undefined) activation.taxCode = values.taxCode;
    if (values.supplierLuce !== undefined) top.currentSupplierLuce = values.supplierLuce;
    if (values.supplierGas !== undefined) top.currentSupplierGas = values.supplierGas;
    const names: Record<BillField, string> = {
      pod: "pod",
      pdr: "pdr",
      taxCode: "tax_code",
      supplierLuce: "current_supplier_luce",
      supplierGas: "current_supplier_gas",
    };
    for (const f of Object.keys(values) as BillField[]) {
      edited(names[f]);
      touch(names[f]);
    }
    update({ ...top, activation });
    setDraft(null);
    setTimeout(() => itemRef.current?.focus(), 0);
  }

  return (
    <fieldset data-testid="bill-upload" className="min-w-0 space-y-3">
      <legend className="sr-only">Bolletta</legend>
      <p className="text-sm text-ink-muted">
        Carica la bolletta in PDF: leggiamo POD, PDR, codice fiscale e fornitore sul tuo dispositivo per
        precompilare i campi. Potrai verificarli prima di confermare.
      </p>
      {bill ? (
        <div
          ref={itemRef}
          tabIndex={-1}
          data-testid="bill-item"
          className="flex items-center gap-2 rounded-control border border-line px-3 py-2 text-sm text-ink focus:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-100"
        >
          <span aria-hidden="true" className="text-brand-600">
            <CheckIcon className="size-5" />
          </span>
          <span className="min-w-0 flex-1 truncate">{bill.name}</span>
          <span className="shrink-0 text-ink-muted">{formatUploadSize(bill.size_bytes)}</span>
          <Button
            type="button"
            variant="ghost"
            data-testid="bill-remove"
            aria-label={`Rimuovi ${bill.name}`}
            loading={removing}
            disabled={removing || busy}
            className="-my-2 -mr-2 shrink-0 gap-1.5 px-3"
            onClick={() => void onRemove(bill.id)}
          >
            <CloseIcon className="size-4" />
            Rimuovi
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3 rounded-control focus-within:ring-[3px] focus-within:ring-brand-100">
            <input
              ref={inputRef}
              id={fileId}
              data-testid="bill-file"
              name="bill_file"
              type="file"
              accept=".pdf,application/pdf"
              disabled={busy}
              aria-describedby={`${fileId}-hint`}
              onChange={(e) => void onFiles(e.target.files)}
              className="peer sr-only"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              className="min-h-11 peer-focus-visible:border-brand-600"
              onClick={() => inputRef.current?.click()}
            >
              Scegli file
            </Button>
            {!busy && <span className="text-sm text-ink-muted">Nessun file selezionato</span>}
          </div>
          <p id={`${fileId}-hint`} className="text-sm text-ink-muted">
            Solo PDF digitale (non una foto), max 4 MB.
          </p>
        </div>
      )}
      {busy && (
        <p data-testid="bill-uploading" role="status" className="flex items-center gap-2 text-sm text-ink-muted">
          <SpinnerIcon className="size-4 animate-spin" />
          Lettura e caricamento in corso&hellip;
        </p>
      )}
      {notice && (
        <p data-testid="bill-unreadable" role="status" className="text-sm font-medium text-ink-muted">
          {notice}
        </p>
      )}
      {error && (
        <p data-testid="bill-error" role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      {draft && (
        <BillReviewDialog
          initial={draft}
          current={current}
          names={{ firstName: state.firstName.trim(), lastName: state.lastName.trim() }}
          suppliers={suppliers}
          avail={avail}
          onCancel={cancelDialog}
          onConfirm={apply}
        />
      )}
    </fieldset>
  );
}

function BillReviewDialog({
  initial,
  current,
  names,
  suppliers,
  avail,
  onCancel,
  onConfirm,
}: {
  initial: BillValues;
  current: BillValues;
  names: { firstName: string; lastName: string };
  suppliers: readonly Supplier[];
  avail: BillFieldAvailability;
  onCancel: () => void;
  onConfirm: (values: Partial<BillValues>) => void;
}) {
  const uid = useId();
  const [values, setValues] = useState<BillValues>(initial);
  const [replace, setReplace] = useState<Partial<Record<BillField, boolean>>>({});
  const [errors, setErrors] = useState<Partial<Record<BillField, string>>>({});
  const conflicts = billConflicts(values, current);
  const set = (f: BillField, v: string) => {
    setValues((p) => ({ ...p, [f]: v }));
    setErrors((p) => ({ ...p, [f]: undefined }));
  };

  function confirm() {
    const next: BillValues = { ...values };
    const errs: Partial<Record<BillField, string>> = {};
    if (values.pod.trim()) {
      const r = validatePod(values.pod);
      if (r.ok) next.pod = r.value;
      else errs.pod = "Codice POD non valido: controlla i caratteri.";
    }
    if (values.pdr.trim()) {
      const r = validatePdr(values.pdr);
      if (r.ok) next.pdr = r.value;
      else errs.pdr = "Codice PDR non valido: sono 14 cifre.";
    }
    if (values.taxCode.trim()) {
      // Same rule as step A: the codice fiscale must match the name and surname entered.
      const r = validateCodiceFiscale(values.taxCode, names);
      if (r.ok) next.taxCode = r.value;
      else errs.taxCode = CODICE_FISCALE_MESSAGES[r.error];
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onConfirm(planBillMerge(next, current, replace));
  }

  const nameOf = (f: BillField, id: string) =>
    f === "supplierLuce" || f === "supplierGas"
      ? (suppliers.find((s) => s.id === id)?.name ?? id)
      : id;

  const replaceBox = (f: BillField) =>
    conflicts.includes(f) && (
      <div className="mt-2">
        <CheckboxField
          id={`${uid}-replace-${f}`}
          testId={`bill-replace-${f}`}
          checked={replace[f] === true}
          onChange={(checked) => setReplace((p) => ({ ...p, [f]: checked }))}
        >
          <span className="text-sm">Sostituisci il valore inserito ({nameOf(f, current[f])})?</span>
        </CheckboxField>
      </div>
    );

  return (
    <Modal
      open
      onClose={onCancel}
      title="Dati letti dalla bolletta: verifica e correggi"
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" data-testid="bill-dialog-cancel" onClick={onCancel}>
            Annulla
          </Button>
          <Button type="button" data-testid="bill-dialog-confirm" onClick={confirm}>
            Conferma
          </Button>
        </div>
      }
    >
      <div data-testid="bill-dialog" className="space-y-5">
        <p className="text-sm text-ink-muted">
          Controlla i dati: i campi che lasci vuoti non vengono modificati.
        </p>
        {avail.pod && (
          <div>
            <Input
              label="Codice POD"
              name="bill_pod"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={24}
              value={values.pod}
              error={errors.pod}
              onChange={(e) => set("pod", normalizePod(e.target.value))}
            />
            {replaceBox("pod")}
          </div>
        )}
        {avail.pdr && (
          <div>
            <Input
              label="Codice PDR"
              name="bill_pdr"
              inputMode="numeric"
              autoComplete="off"
              maxLength={20}
              value={values.pdr}
              error={errors.pdr}
              onChange={(e) => set("pdr", normalizePdr(e.target.value))}
            />
            {replaceBox("pdr")}
          </div>
        )}
        <div>
          <Input
            label="Codice fiscale"
            name="bill_tax_code"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={16}
            value={values.taxCode}
            error={errors.taxCode}
            onChange={(e) => set("taxCode", e.target.value.toUpperCase())}
          />
          {replaceBox("taxCode")}
        </div>
        {avail.supplierLuce && (
          <div>
            <Select
              label="Fornitore attuale luce"
              name="bill_supplier_luce"
              placeholder="Non indicato"
              options={supplierOptions(suppliers, "luce", values.supplierLuce || null)}
              value={values.supplierLuce}
              onChange={(e) => set("supplierLuce", e.target.value)}
            />
            {replaceBox("supplierLuce")}
          </div>
        )}
        {avail.supplierGas && (
          <div>
            <Select
              label="Fornitore attuale gas"
              name="bill_supplier_gas"
              placeholder="Non indicato"
              options={supplierOptions(suppliers, "gas", values.supplierGas || null)}
              value={values.supplierGas}
              onChange={(e) => set("supplierGas", e.target.value)}
            />
            {replaceBox("supplierGas")}
          </div>
        )}
      </div>
    </Modal>
  );
}
