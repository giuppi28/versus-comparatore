"use client";

import { useId, useRef, useState } from "react";
import {
  Button,
  CheckIcon,
  CloseIcon,
  Input,
  Select,
  SpinnerIcon,
} from "@/components/ui";
import { CheckboxField } from "@/components/page1/parts";
import { DOCUMENT_MAX_FILES } from "@/lib/logic/validators";
import { DOCUMENT_TYPES, type DocumentType } from "@/lib/data/types";
import {
  LeadApiError,
  removeLeadDocument,
  uploadLeadDocument,
} from "@/lib/lead/client";
import { DocumentPrepareError, prepareDocumentFile } from "./compress-image";
import {
  formatUploadSize,
  ibanRequired,
  groupIban,
  removeErrorMessage,
  uploadErrorMessage,
} from "./logic";
import { normalizeIban, validateCodiceFiscale } from "@/lib/logic/validators";
import type { StepProps } from "./types";

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  carta_identita: "Carta d'identità",
  patente: "Patente",
  passaporto: "Passaporto",
};

type SectionProps = Pick<
  StepProps,
  "state" | "update" | "errorFor" | "touch" | "edited"
>;

/** "Pagamento": IBAN and, optionally, a different account holder. */
export function PaymentFields({
  state,
  update,
  errorFor,
  touch,
  edited,
}: SectionProps) {
  const a = state.activation;
  const holderId = useId();
  const hasIban = a.iban.trim().length > 0;
  const required = ibanRequired(state);

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Input
          label="IBAN"
          name="iban"
          required={required}
          hint={required ? "Obbligatorio: l'offerta scelta si attiva solo con pagamento IBAN" : "Facoltativo, se vuoi pagare con addebito sul conto"}
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
        {/* Fixed copy, deliberately outside aria-describedby (SPEC #15). */}
        <p
          data-testid="iban-discount"
          className="rounded-control bg-brand-50 px-3 py-2 text-sm font-bold text-brand-700"
        >
          Sconto del 20% se paghi con IBAN
        </p>
      </div>
      {hasIban && (
        <>
          <CheckboxField
            id={holderId}
            testId="iban-holder-different"
            checked={a.ibanHolderDifferent}
            onChange={(checked) =>
              update({ activation: { ibanHolderDifferent: checked } })
            }
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
                    update({
                      activation: { ibanHolderFirstName: e.target.value },
                    });
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
                    update({
                      activation: { ibanHolderLastName: e.target.value },
                    });
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
                  update({
                    activation: {
                      ibanHolderTaxCode: e.target.value.toUpperCase(),
                    },
                  });
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
export function DocumentFields({
  state,
  update,
  errorFor,
  touch,
  edited,
}: SectionProps) {
  const a = state.activation;
  const fileId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const documents = a.documents;
  const full = documents.length >= DOCUMENT_MAX_FILES;

  async function onFiles(files: FileList | null) {
    const file = files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    setUploadError(null);
    setRemoveError(null);
    setUploading(true);
    try {
      const prepared = await prepareDocumentFile(file);
      const doc = await uploadLeadDocument(prepared);
      update({
        activation: {
          documents: [...documents, { ...doc, name: prepared.name }],
        },
      });
    } catch (err) {
      const code =
        err instanceof LeadApiError || err instanceof DocumentPrepareError
          ? err.code
          : "upload_failed";
      setUploadError(uploadErrorMessage(code));
    } finally {
      setUploading(false);
    }
  }

  async function onRemove(id: string) {
    setRemoveError(null);
    setUploadError(null);
    setRemovingId(id);
    try {
      await removeLeadDocument(id);
    } catch (err) {
      // 404: already gone on the server, so drop it from the list too.
      if (!(err instanceof LeadApiError && err.code === "document_not_found")) {
        setRemoveError(
          removeErrorMessage(
            err instanceof LeadApiError ? err.code : "server_error",
          ),
        );
        setRemovingId(null);
        return;
      }
    }
    update({ activation: { documents: documents.filter((d) => d.id !== id) } });
    setRemovingId(null);
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-ink-muted">
        Compila tutti i campi, oppure carica il file.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Tipo di documento"
          name="document_type"
          options={[
            { value: "", label: "Seleziona il tipo" },
            ...DOCUMENT_TYPES.map((t) => ({
              value: t,
              label: DOCUMENT_TYPE_LABELS[t],
            })),
          ]}
          value={a.documentType ?? ""}
          error={errorFor("document_type")}
          onChange={(e) => {
            edited("document_type");
            update({
              activation: {
                documentType: (e.target.value || null) as DocumentType | null,
              },
            });
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
            update({
              activation: { documentNumber: e.target.value.toUpperCase() },
            });
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

      <fieldset data-testid="document-upload" className="min-w-0 space-y-3">
        <legend className="mb-2 text-sm font-semibold text-ink">
          Oppure carica il documento
        </legend>
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
                <span className="shrink-0 text-ink-muted">
                  {formatUploadSize(d.size_bytes)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  data-testid="document-remove"
                  aria-label={`Rimuovi ${d.name}`}
                  loading={removingId === d.id}
                  disabled={removingId !== null || uploading}
                  className="-my-2 -mr-2 shrink-0 gap-1.5 px-3"
                  onClick={() => void onRemove(d.id)}
                >
                  <CloseIcon className="size-4" />
                  Rimuovi
                </Button>
              </li>
            ))}
          </ul>
        )}
        {!full && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3 rounded-control focus-within:ring-[3px] focus-within:ring-brand-100">
              <input
                ref={inputRef}
                id={fileId}
                data-testid="document-file"
                name="document_file"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
                disabled={uploading}
                aria-describedby={`${fileId}-hint`}
                onChange={(e) => void onFiles(e.target.files)}
                className="peer sr-only"
              />
              <Button
                type="button"
                variant="secondary"
                disabled={uploading}
                className="min-h-11 peer-focus-visible:border-brand-600"
                onClick={() => inputRef.current?.click()}
              >
                Scegli file
              </Button>
              {!uploading && (
                <span
                  data-testid="document-status"
                  className="text-sm text-ink-muted"
                >
                  Nessun file selezionato
                </span>
              )}
            </div>
            <p id={`${fileId}-hint`} className="text-sm text-ink-muted">
              Foto (JPG, PNG, HEIC) o PDF, fino a 2 file. Le foto vengono
              ridotte in automatico; max 4 MB.
            </p>
          </div>
        )}
        {uploading && (
          <p
            data-testid="document-uploading"
            role="status"
            className="flex items-center gap-2 text-sm text-ink-muted"
          >
            <SpinnerIcon className="size-4 animate-spin" />
            Caricamento in corso&hellip;
          </p>
        )}
        {removeError && (
          <p
            data-testid="document-remove-error"
            role="alert"
            className="text-sm font-medium text-danger"
          >
            {removeError}
          </p>
        )}
        {uploadError && (
          <p
            data-testid="document-upload-error"
            role="alert"
            className="text-sm font-medium text-danger"
          >
            {uploadError}
          </p>
        )}
      </fieldset>
    </div>
  );
}
