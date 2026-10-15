"use client";

import Link from "next/link";
import { useActionState, useRef, useState, startTransition, type FormEvent, type ReactNode } from "react";
import { Button, Card, Input } from "@/components/ui";
import { saveSupplierAction } from "./actions";
import { INITIAL_SUPPLIER_STATE } from "./form-state";
import { slugify } from "./slug";

export interface SupplierFormInitial {
  id: string;
  name: string;
  slug: string;
  sells_luce: boolean;
  sells_gas: boolean;
  show_in_dropdown: boolean;
  active: boolean;
  sort_order: number;
}

const MAX_LOGO_BYTES = 200_000;

function Check({
  name,
  label,
  hint,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-control border border-line-strong px-4 py-3 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-5 shrink-0 accent-brand-600"
      />
      <span className="flex flex-col">
        <span className="font-semibold">{label}</span>
        {hint && <span className="text-sm text-ink-muted">{hint}</span>}
      </span>
    </label>
  );
}

function Banner({ tone, children, testId }: { tone: "success" | "error" | "info"; children: ReactNode; testId?: string }) {
  const cls = {
    success: "border-success bg-success-soft text-brand-800",
    error: "border-danger bg-danger-soft text-danger",
    info: "border-line-strong bg-surface-muted text-ink",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} data-testid={testId} className={`rounded-control border px-4 py-3 text-sm font-medium ${cls}`}>
      {children}
    </div>
  );
}

/**
 * Create / edit form. `logoUrl` is the already-resolved URL of the saved logo.
 * Submitted programmatically (no native form reset) so typed values survive a validation error.
 */
export function SupplierForm({
  initial,
  logoUrl,
  defaultSortOrder,
}: {
  initial: SupplierFormInitial | null;
  logoUrl: string | null;
  defaultSortOrder: number;
}) {
  const [state, formAction, pending] = useActionState(saveSupplierAction, INITIAL_SUPPLIER_STATE);
  const isEdit = initial !== null;

  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [sellsLuce, setSellsLuce] = useState(initial?.sells_luce ?? true);
  const [sellsGas, setSellsGas] = useState(initial?.sells_gas ?? true);
  const [showInDropdown, setShowInDropdown] = useState(initial?.show_in_dropdown ?? true);
  const [active, setActive] = useState(initial?.active ?? true);
  const [removeLogo, setRemoveLogo] = useState(false);

  // Client-side preview of the chosen file. An <img> never runs SVG scripts; the saved logo is
  // always the server-sanitized version.
  const [chosen, setChosen] = useState<{ url: string; name: string; key: number | undefined } | null>(null);
  const [clientLogoError, setClientLogoError] = useState<string | null>(null);
  const fileKey = state.savedAt ?? 0;
  const preview = chosen && chosen.key === fileKey ? chosen : null;
  // A server-side logo error is hidden as soon as the admin picks another file.
  const [logoErrorDismissedFor, setLogoErrorDismissedFor] = useState<unknown>(null);
  const fieldErrors = { ...state.fieldErrors };
  if (logoErrorDismissedFor === state) delete fieldErrors.logo;
  const formRef = useRef<HTMLFormElement>(null);

  function onNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function onFileChange(file: File | undefined) {
    if (chosen) URL.revokeObjectURL(chosen.url);
    setClientLogoError(null);
    setLogoErrorDismissedFor(state);
    if (!file) return setChosen(null);
    if (!/\.svg$/i.test(file.name) && file.type !== "image/svg+xml") {
      setClientLogoError("Carica un file in formato SVG.");
      return setChosen(null);
    }
    if (file.size > MAX_LOGO_BYTES) {
      setClientLogoError("Il file supera il limite di 200 KB.");
      return setChosen(null);
    }
    setChosen({ url: URL.createObjectURL(file), name: file.name, key: fileKey });
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (clientLogoError) return;
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="flex flex-col gap-6" data-testid="supplier-form">
      {isEdit && <input type="hidden" name="id" value={initial.id} />}

      {state.status === "error" && state.message && <Banner tone="error" testId="form-error">{state.message}</Banner>}
      {state.status === "success" && (
        <Banner tone="success" testId="form-success">
          {state.message}
          {state.notice && <span className="mt-1 block font-normal" data-testid="form-notice">{state.notice}</span>}
        </Banner>
      )}

      <Card padding="lg" className="flex flex-col gap-5">
        <h2 className="text-lg font-bold">Dati del fornitore</h2>
        <Input
          label="Nome"
          name="name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          error={fieldErrors.name}
          required
          maxLength={80}
          autoComplete="off"
        />
        <Input
          label="Slug"
          name="slug"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          onBlur={() => setSlug((s) => (s.trim() ? slugify(s) : slugify(name)))}
          error={fieldErrors.slug}
          hint="Identificativo univoco nel sito: solo lettere minuscole, numeri e trattini. Generato dal nome."
          required
          maxLength={60}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
        <Input
          label="Ordine di visualizzazione"
          name="sort_order"
          type="number"
          inputMode="numeric"
          min={0}
          max={9999}
          step={1}
          defaultValue={initial?.sort_order ?? defaultSortOrder}
          error={fieldErrors.sort_order}
          hint="I numeri più bassi compaiono prima nell'elenco."
          required
          className="sm:max-w-48"
        />
      </Card>

      <Card padding="lg" className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">Impostazioni</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Check name="sells_luce" label="Vende luce" checked={sellsLuce} onChange={setSellsLuce} />
          <Check name="sells_gas" label="Vende gas" checked={sellsGas} onChange={setSellsGas} />
          <Check
            name="show_in_dropdown"
            label="Mostra nell'elenco «Fornitore attuale»"
            hint="Compare tra i fornitori selezionabili nel modulo."
            checked={showInDropdown}
            onChange={setShowInDropdown}
          />
          <Check
            name="active"
            label="Attivo"
            hint="Se disattivato, il fornitore e le sue offerte non sono visibili ai clienti."
            checked={active}
            onChange={setActive}
          />
        </div>
      </Card>

      <Card padding="lg" className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">Logo</h2>
        <div className="flex flex-wrap items-center gap-4">
          <div
            className="flex h-20 w-44 items-center justify-center rounded-control border border-line bg-surface-muted p-3"
            data-testid="logo-preview"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- blob/data URL preview
              <img src={preview.url} alt="Anteprima del logo selezionato" className="max-h-full max-w-full object-contain" />
            ) : logoUrl && !removeLogo ? (
              // eslint-disable-next-line @next/next/no-img-element -- Supabase public URL or data URL
              <img src={logoUrl} alt={`Logo di ${initial?.name ?? "fornitore"}`} className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-center text-sm font-semibold text-ink-muted">{name.trim() || "Nessun logo"}</span>
            )}
          </div>
          <p className="max-w-sm text-sm text-ink-muted">
            {preview
              ? `Anteprima di «${preview.name}». Il file viene controllato e ripulito al salvataggio.`
              : logoUrl && !removeLogo
                ? "Logo attuale."
                : "Senza logo viene mostrato il nome del fornitore."}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="logo" className="text-sm font-semibold">
            Carica un nuovo logo (SVG, massimo 200 KB)
          </label>
          <input
            key={fileKey}
            id="logo"
            name="logo"
            type="file"
            accept=".svg,image/svg+xml"
            onChange={(e) => onFileChange(e.target.files?.[0])}
            aria-invalid={fieldErrors.logo || clientLogoError ? true : undefined}
            aria-describedby={fieldErrors.logo || clientLogoError ? "logo-error" : undefined}
            className="block w-full rounded-control border border-line-strong bg-surface p-2 text-sm file:mr-3 file:min-h-10 file:rounded-control file:border-0 file:bg-brand-50 file:px-4 file:font-semibold file:text-brand-700"
          />
          {(fieldErrors.logo || clientLogoError) && (
            <p id="logo-error" role="alert" data-testid="logo-error" className="text-sm font-medium text-danger">
              {clientLogoError ?? fieldErrors.logo}
            </p>
          )}
        </div>
        {isEdit && logoUrl && (
          <Check name="remove_logo" label="Rimuovi il logo attuale" checked={removeLogo} onChange={setRemoveLogo} />
        )}
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        <Link
          href="/admin/fornitori"
          className="inline-flex min-h-11 items-center justify-center rounded-control border border-line-strong px-5 font-semibold hover:border-brand-600 hover:bg-brand-50"
        >
          Torna all&apos;elenco
        </Link>
        <Button type="submit" size="lg" loading={pending} className="sm:ml-auto">
          {isEdit ? "Salva modifiche" : "Crea fornitore"}
        </Button>
      </div>
    </form>
  );
}
