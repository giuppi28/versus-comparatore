"use client";

import { useId, useRef, useState } from "react";
import { CheckIcon, Input, Select, SpinnerIcon } from "@/components/ui";
import { CheckboxField } from "@/components/page1/parts";
import { DOCUMENT_MAX_FILES } from "@/lib/logic/validators";
import { DOCUMENT_TYPES, type DocumentType } from "@/lib/data/types";
import { LeadApiError, uploadLeadDocument } from "@/lib/lead/client";
import { formatUploadSize, groupIban, uploadErrorMessage } from "./logic";
import { normalizeIban, validateCodiceFiscale } from "@/lib/logic/validators";
import type { StepProps } from "./types";

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  carta_identita: "Carta d'identità",
  patente: "Patente",
  passaporto: "Passaporto",
};

type SectionProps = Pick<StepProps, "state" | "update" | "errorFor" | "touch" | "edited">;

/** "Pagamento (facoltativo)": IBAN and, optionally, a different account holder. */
export function PaymentFields({ state, update, errorFor, touch, edited }: SectionProps) {
  const a = state.activation;
  const holderId = useId();
  const hasIban = a.iban.trim().length > 0;

  return (
    <div className="space-y-5">
      <Input
        label="IBAN (facoltativo, se vuoi pagare con addebito sul conto)"
        name="iban"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        maxLength={42}
        value={a.iban}
        error={errorFor("iban")}
        onChange={(e) => {
          edited("iban");
          update({ activation: { iban: e.target.value.toUpperCase() } });
        }}
        onBlur={() => {
          touch("iban");
          const n = normalizeIban(a.iban);
          const grouped = groupIban(n);
          if (grouped !== a.iban) update({ activation: { iban: grouped } });
        }}
      />
      {hasIban && (
        <>
          <CheckboxField
            id={holderId}
            testId="iban-holder-different"
            checked={a.ibanHolderDifferent}
            onChange={(checked) => update({ activation: { ibanHolderDifferent: checked } })}
          >
            L&apos;intestatario del conto è diverso dal titolare
          </CheckboxField>
          {a.ibanHolderDifferent && (
            <div data-testid="iban-holder-fields" className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Input
                  label="Nome dell'intestatario"
                  name="iban_holder_first_name"
                  required
                  autoComplete="off"
                  value={a.ibanHolderFirstName}
                  error={errorFor("iban_holder_first_name")}
                  onChange={(e) => {
                    edited("iban_holder_first_name");
                    update({ activation: { ibanHolderFirstName: e.target.value } });
                  }}
                  onBlur={() => touch("iban_holder_first_name")}
                />
                <Input
                  label="Cognome dell'intestatario"
                  name="iban_holder_last_name"
                  required
                  autoComplete="off"
                  value={a.ibanHolderLastName}
                  error={errorFor("iban_holder_last_name")}
                  onChange={(e) => {
                    edited("iban_holder_last_name");
                    update({ activation: { ibanHolderLastName: e.target.value } });
                  }}
                  onBlur={() => touch("iban_holder_last_name")}
                />
              </div>
              <Input
                label="Codice fiscale dell'intestatario"
                name="iban_holder_tax_code"
                required
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                maxLength={16}
                className="sm:max-w-sm"
                value={a.ibanHolderTaxCode}
                error={errorFor("iban_holder_tax_code")}
                onChange={(e) => {
                  edited("iban_holder_tax_code");
                  update({ activation: { ibanHolderTaxCode: e.target.value.toUpperCase() } });
                }}
                onBlur={() => {
                  touch("iban_holder_tax_code");
                  const r = validateCodiceFiscale(a.ibanHolderTaxCode);
                  if (r.ok && r.value !== a.ibanHolderTaxCode) {
                    update({ activation: { ibanHolderTaxCode: r.value } });
                  }
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** "Documento d'identità (facoltativo)": data fields (all-or-nothing) + immediate file upload. */
export function DocumentFields({ state, update, errorFor, touch, edited }: SectionProps) {
  const a = state.activation;
  const fileId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const documents = a.documents;
  const full = documents.length >= DOCUMENT_MAX_FILES;

  async function onFiles(files: FileList | null) {
    const file = files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const doc = await uploadLeadDocument(file);
      update({ activation: { documents: [...documents, { ...doc, name: file.name }] } });
    } catch (err) {
      setUploadError(uploadErrorMessage(err instanceof LeadApiError ? err.code : "upload_failed"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Tipo di documento"
          name="document_type"
          options={[{ value: "", label: "Seleziona il tipo" }, ...DOCUMENT_TYPES.map((t) => ({ value: t, label: DOCUMENT_TYPE_LABELS[t] }))]}
          value={a.documentType ?? ""}
          error={errorFor("document_type")}
          onChange={(e) => {
            edited("document_type");
            update({ activation: { documentType: (e.target.value || null) as DocumentType | null } });
          }}
          onBlur={() => touch("document_type")}
        />
        <Input
          label="Numero del documento"
          name="document_number"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={30}
          value={a.documentNumber}
          error={errorFor("document_number")}
          onChange={(e) => {
            edited("document_number");
            update({ activation: { documentNumber: e.target.value.toUpperCase() } });
          }}
          onBlur={() => touch("document_number")}
        />
        <Input
          label="Data di scadenza"
          name="document_expiry"
          type="date"
          min="1900-01-01"
          max="2100-12-31"
          value={a.documentExpiry}
          error={errorFor("document_expiry")}
          onChange={(e) => {
            edited("document_expiry");
            update({ activation: { documentExpiry: e.target.value } });
          }}
          onBlur={() => touch("document_expiry")}
        />
        <Input
          label="Ente di rilascio"
          name="document_issuer"
          autoComplete="off"
          maxLength={80}
          value={a.documentIssuer}
          error={errorFor("document_issuer")}
          onChange={(e) => {
            edited("document_issuer");
            update({ activation: { documentIssuer: e.target.value } });
          }}
          onBlur={() => touch("document_issuer")}
        />
      </div>

      <div data-testid="document-upload" className="space-y-3">
        <p className="text-sm font-semibold text-ink">Oppure carica il documento</p>
        {documents.length > 0 && (
          <ul data-testid="document-list" className="space-y-2">
            {documents.map((d) => (
              <li
                key={d.id}
                data-testid="document-item"
                className="flex items-center gap-2 rounded-control border border-line px-3 py-2 text-sm text-ink"
              >
                <span aria-hidden="true" className="text-brand-600">
                  <CheckIcon className="size-5" />
                </span>
                <span className="min-w-0 flex-1 truncate">{d.name}</span>
                <span className="shrink-0 text-ink-muted">{formatUploadSize(d.size_bytes)}</span>
              </li>
            ))}
          </ul>
        )}
        {!full && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={fileId} className="text-sm text-ink-muted">
              JPG o PDF, max 4 MB, fino a 2 file
            </label>
            <input
              ref={inputRef}
              id={fileId}
              data-testid="document-file"
              name="document_file"
              type="file"
              accept=".jpg,.jpeg,.pdf,image/jpeg,application/pdf"
              disabled={uploading}
              onChange={(e) => void onFiles(e.target.files)}
              className="block w-full text-sm text-ink file:mr-3 file:cursor-pointer file:rounded-control file:border file:border-control file:bg-surface file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-ink"
            />
          </div>
        )}
        {uploading && (
          <p data-testid="document-uploading" role="status" className="flex items-center gap-2 text-sm text-ink-muted">
            <SpinnerIcon className="size-4 animate-spin" />
            Caricamento in corso&hellip;
          </p>
        )}
        {uploadError && (
          <p data-testid="document-upload-error" role="alert" className="text-sm font-medium text-danger">
            {uploadError}
          </p>
        )}
      </div>
    </div>
  );
}
