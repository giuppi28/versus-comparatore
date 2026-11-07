"use client";

import { useId, useRef, useState } from "react";
import {
  Button,
  CheckIcon,
  cn,
  CloseIcon,
  Input,
  Select,
  SpinnerIcon,
} from "@/components/ui";
import { CheckboxField } from "@/components/page1/parts";
import { DOCUMENT_TYPES, type DocumentType } from "@/lib/data/types";
import {
  LeadApiError,
  removeLeadDocument,
  uploadLeadDocument,
} from "@/lib/lead/client";
import { DocumentPrepareError, prepareDocumentFile } from "./compress-image";
import {
  addDocumentPatch,
  assignDocumentSlots,
  formatUploadSize,
  ibanRequired,
  groupIban,
  removeDocumentPatch,
  removeErrorMessage,
  uploadErrorMessage,
} from "./logic";
import { normalizeIban, validateCodiceFiscale } from "@/lib/logic/validators";
import type { StepProps } from "./types";
import type {
  DocumentSide,
  FlowUploadedDocument,
} from "@/lib/lead/flow-state";

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
          // Sensitive: keep it out of the browser's saved-values history (shared devices).
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
                  autoComplete="section-intestatario given-name"
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
                  autoComplete="section-intestatario family-name"
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
                // Someone else's codice fiscale: never autofilled with the customer's own, never remembered.
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

/** "Documento d'identità (facoltativo)": data fields (each optional) + immediate file upload. */
export function DocumentFields({
  state,
  update,
  errorFor,
  touch,
  edited,
}: SectionProps) {
  const a = state.activation;
  const hintId = useId();
  const [uploadingSide, setUploadingSide] = useState<DocumentSide | null>(null);
  const [uploadError, setUploadError] = useState<SideMessage | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<SideMessage | null>(null);
  // Id of the file uploaded in this session: only that one plays the badge pop-in (not after a reload).
  const [freshDocId, setFreshDocId] = useState<string | null>(null);
  // The bill (kind "bill") lives in its own section: this one only handles identity documents.
  const slots = assignDocumentSlots(a.documents);
  const busy = uploadingSide !== null || removingId !== null;

  async function onFiles(side: DocumentSide, file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    setRemoveError(null);
    setUploadingSide(side);
    try {
      const prepared = await prepareDocumentFile(file);
      const doc = await uploadLeadDocument(prepared);
      update((s) => addDocumentPatch(s, { ...doc, name: prepared.name }, side));
      setFreshDocId(doc.id);
    } catch (err) {
      const code =
        err instanceof LeadApiError || err instanceof DocumentPrepareError
          ? err.code
          : "upload_failed";
      setUploadError({ side, message: uploadErrorMessage(code) });
    } finally {
      setUploadingSide(null);
    }
  }

  async function onRemove(side: DocumentSide, id: string) {
    setRemoveError(null);
    setUploadError(null);
    setRemovingId(id);
    try {
      await removeLeadDocument(id);
    } catch (err) {
      // 404: already gone on the server, so drop it from the list too.
      if (!(err instanceof LeadApiError && err.code === "document_not_found")) {
        setRemoveError({
          side,
          message: removeErrorMessage(
            err instanceof LeadApiError ? err.code : "server_error",
          ),
        });
        setRemovingId(null);
        return;
      }
    }
    update((s) => removeDocumentPatch(s, id));
    setRemovingId(null);
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-ink-muted">
        Facoltativo: puoi compilare i dati del documento, caricare il file, oppure saltare questa sezione.
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
          // Identity-document data (number, expiry, issuer) is sensitive: never kept in the
          // browser's saved-values history, so autocomplete stays off on these three fields.
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
          autoComplete="off"
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
        <div className="grid gap-5 sm:grid-cols-2">
          {DOCUMENT_SIDES.map((side) => (
            <DocumentSlot
              key={side}
              side={side}
              doc={slots[side]}
              fresh={slots[side] !== null && slots[side]?.id === freshDocId}
              hintId={hintId}
              busy={busy}
              uploading={uploadingSide === side}
              removing={slots[side] !== null && removingId === slots[side]?.id}
              error={
                (uploadError?.side === side && uploadError.message) ||
                (removeError?.side === side && removeError.message) ||
                null
              }
              errorKind={uploadError?.side === side ? "upload" : "remove"}
              onFile={(file) => void onFiles(side, file)}
              onRemove={(id) => void onRemove(side, id)}
            />
          ))}
        </div>
        {slots.extra.length > 0 && (
          <ul data-testid="document-list" className="space-y-2">
            {slots.extra.map((d) => (
              <li key={d.id}>
                <DocumentRow
                  doc={d}
                  ariaLabel={`Rimuovi ${d.name}`}
                  removing={removingId === d.id}
                  disabled={busy}
                  onRemove={() => void onRemove("back", d.id)}
                />
              </li>
            ))}
          </ul>
        )}
        <p id={hintId} className="text-sm text-ink-muted">
          Foto (JPG, PNG, HEIC) o PDF, max 4 MB; le foto vengono ridotte in
          automatico. Con il passaporto, o con un PDF che contiene già entrambi
          i lati, basta il fronte.
        </p>
      </fieldset>
    </div>
  );
}

const DOCUMENT_SIDES: DocumentSide[] = ["front", "back"];
const SIDE_LABELS: Record<DocumentSide, string> = {
  front: "Fronte del documento",
  back: "Retro del documento",
};

type SideMessage = { side: DocumentSide; message: string };

/** One filled file: check, name (truncated), size and the remove button. */
function DocumentRow({
  doc,
  ariaLabel,
  removing,
  disabled,
  showCheck = true,
  onRemove,
}: {
  doc: FlowUploadedDocument;
  ariaLabel: string;
  removing: boolean;
  disabled: boolean;
  /** False in a slot: the slot title row carries the green badge instead. */
  showCheck?: boolean;
  onRemove: () => void;
}) {
  return (
    <div
      data-testid="document-item"
      className="flex items-center gap-2 text-sm text-ink"
    >
      {showCheck && (
        <span aria-hidden="true" className="text-brand-600">
          <CheckIcon className="size-5" />
        </span>
      )}
      <span className="min-w-0 flex-1 truncate">{doc.name}</span>
      <span className="shrink-0 text-ink-muted">
        {formatUploadSize(doc.size_bytes)}
      </span>
      <Button
        type="button"
        variant="ghost"
        data-testid="document-remove"
        aria-label={ariaLabel}
        loading={removing}
        disabled={disabled}
        className="-my-2 -mr-2 shrink-0 gap-1.5 px-3"
        onClick={onRemove}
      >
        <CloseIcon className="size-4" />
        Rimuovi
      </Button>
    </div>
  );
}

/** Front or back of the identity document: empty (choose a file) or filled (file + remove). */
function DocumentSlot({
  side,
  doc,
  fresh,
  hintId,
  busy,
  uploading,
  removing,
  error,
  errorKind,
  onFile,
  onRemove,
}: {
  side: DocumentSide;
  doc: FlowUploadedDocument | null;
  /** The file was uploaded in this session (animate the badge, announce it). */
  fresh: boolean;
  hintId: string;
  busy: boolean;
  uploading: boolean;
  removing: boolean;
  error: string | null;
  errorKind: "upload" | "remove";
  onFile: (file: File | undefined) => void;
  onRemove: (id: string) => void;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const label = SIDE_LABELS[side];
  const errorId = `${id}-error`;

  return (
    <div
      role="group"
      aria-labelledby={`${id}-label`}
      data-testid={`document-slot-${side}`}
      className="min-w-0 space-y-2 rounded-control border border-line px-3 py-3"
    >
      {/* Fixed-height title row: the badge appears inside it without moving anything. */}
      <div className="flex min-h-7 items-center justify-between gap-2">
        <p id={`${id}-label`} className="text-sm font-semibold text-ink">
          {label}
        </p>
        {doc && (
          <span
            aria-hidden="true"
            data-testid={`document-slot-${side}-badge`}
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white",
              fresh && "animate-badge-pop motion-reduce:animate-none",
            )}
          >
            <CheckIcon className="size-4" strokeWidth={3} />
          </span>
        )}
      </div>
      {/* Always mounted so the announcement is read when it fills; silent on reload/restore. */}
      <span role="status" className="sr-only">
        {doc && fresh ? `${label} caricato` : ""}
      </span>
      {doc ? (
        <DocumentRow
          showCheck={false}
          doc={doc}
          ariaLabel={`Rimuovi ${label.toLowerCase()}: ${doc.name}`}
          removing={removing}
          disabled={busy}
          onRemove={() => onRemove(doc.id)}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-3 rounded-control focus-within:ring-[3px] focus-within:ring-brand-100">
          {/* No "capture": the customer may pick an existing photo, a file or the camera. */}
          <input
            ref={inputRef}
            id={`${id}-file`}
            data-testid={`document-file-${side}`}
            name={`document_file_${side}`}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
            disabled={busy}
            aria-labelledby={`${id}-label`}
            aria-describedby={error ? `${hintId} ${errorId}` : hintId}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              onFile(file);
            }}
            className="peer sr-only"
          />
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            aria-label={`Scegli file: ${label.toLowerCase()}`}
            className="min-h-11 peer-focus-visible:border-brand-600"
            onClick={() => inputRef.current?.click()}
          >
            Scegli file
          </Button>
          {uploading ? (
            <span
              data-testid="document-uploading"
              role="status"
              className="flex items-center gap-2 text-sm text-ink-muted"
            >
              <SpinnerIcon className="size-4 animate-spin" />
              Caricamento in corso&hellip;
            </span>
          ) : (
            <span
              data-testid="document-status"
              className="text-sm text-ink-muted"
            >
              Nessun file selezionato
            </span>
          )}
        </div>
      )}
      {error && (
        <p
          id={errorId}
          data-testid={
            errorKind === "upload"
              ? "document-upload-error"
              : "document-remove-error"
          }
          role="alert"
          className="text-sm font-medium text-danger"
        >
          {error}
        </p>
      )}
    </div>
  );
}
