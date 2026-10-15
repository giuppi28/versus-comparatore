"use client";

import type { FormEvent, ReactNode } from "react";
import { GAS_USES, type GasUseId } from "@/config/consumption";
import { Button, Input, Select, SelectCard, SelectCardGroup } from "@/components/ui";
import type { Voltage } from "@/lib/data/types";
import { serviceTypeFor } from "@/lib/lead/flow-state";
import { includesGas, includesLuce, needsCurrentSupplier, needsMeterCode } from "@/lib/lead/rules";
import { validatePdr, validatePod } from "@/lib/logic/validators";
import { GroupError, GroupLabel } from "./FieldError";
import {
  effectiveCap,
  effectiveGasUses,
  powerFromSelectValue,
  powerOptions,
  powerToSelectValue,
  supplierOptions,
} from "./logic";
import type { StepBProps } from "./types";

function Section({ title, testId, children }: { title: string; testId: string; children: ReactNode }) {
  return (
    <section data-testid={testId} className="space-y-5 border-t border-line pt-6">
      <h3 className="heading-section text-ink">{title}</h3>
      {children}
    </section>
  );
}

/** Step B — "Fornitura" (PRD §10). Submits the lead. */
export function StepB({
  state,
  update,
  errorFor,
  touch,
  edited,
  onBack,
  onNext,
  suppliers,
  submitting,
  beforeActions,
}: StepBProps & { onNext: () => void }) {
  const a = state.activation;
  const luce = includesLuce(state.commodity);
  const gas = includesGas(state.commodity);
  const comune = state.comune;
  const caps = comune?.caps ?? [];
  const cap = effectiveCap(state);

  const luceService = serviceTypeFor(state, "luce");
  const gasService = serviceTypeFor(state, "gas");
  const luceSupplierShown = luce && needsCurrentSupplier(luceService);
  const gasSupplierShown = gas && needsCurrentSupplier(gasService);
  const podRequired = needsMeterCode(luceService);
  const pdrRequired = needsMeterCode(gasService);
  const gasUses = effectiveGasUses(state);

  function submit(e: FormEvent) {
    e.preventDefault();
    onNext();
  }

  return (
    <form noValidate onSubmit={submit} data-testid="activation-step-b" className="space-y-8">
      <div>
        <h2 className="heading-section text-ink">Fornitura</h2>
        <p className="mt-1 text-base text-ink-muted">Dove attivare la fornitura e i dati del contatore.</p>
      </div>

      <div className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Comune di fornitura"
            name="comune"
            readOnly
            value={comune ? `${comune.name} (${comune.province})` : ""}
          />
          {caps.length > 1 ? (
            <Select
              label="CAP"
              name="cap"
              required
              placeholder="Seleziona il CAP"
              options={caps.map((c) => ({ value: c, label: c }))}
              value={cap}
              error={errorFor("cap")}
              onChange={(e) => {
                edited("cap");
                update({ activation: { cap: e.target.value } });
              }}
              onBlur={() => touch("cap")}
            />
          ) : (
            <Input
              label="CAP"
              name="cap"
              required
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={5}
              readOnly={caps.length === 1}
              value={cap}
              error={errorFor("cap")}
              onChange={(e) => {
                edited("cap");
                update({ activation: { cap: e.target.value.replace(/\D/g, "") } });
              }}
              onBlur={() => touch("cap")}
            />
          )}
        </div>

        <div className="grid grid-cols-3 items-start gap-4 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-3">
            <Input
              label="Indirizzo"
              name="address"
              required
              autoComplete="address-line1"
              value={a.address}
              error={errorFor("address")}
              onChange={(e) => {
                edited("address");
                update({ activation: { address: e.target.value } });
              }}
              onBlur={() => touch("address")}
            />
          </div>
          <Input
            label="Civico"
            name="street_number"
            required
            autoComplete="off"
            maxLength={20}
            value={a.streetNumber}
            error={errorFor("street_number")}
            onChange={(e) => {
              edited("street_number");
              update({ activation: { streetNumber: e.target.value } });
            }}
            onBlur={() => touch("street_number")}
          />
        </div>

        <div>
          <GroupLabel id="resident-label" required>
            Sei residente a questo indirizzo?
          </GroupLabel>
          <SelectCardGroup
            type="radio"
            aria-labelledby="resident-label"
            value={a.isResident === null ? null : a.isResident ? "yes" : "no"}
            onValueChange={(v) => {
              edited("is_resident");
              touch("is_resident");
              update({ activation: { isResident: v === "yes" } });
            }}
            className="grid grid-cols-2 gap-3 sm:max-w-sm"
          >
            <div data-testid="is_resident-yes">
              <SelectCard value="yes" title="Sì" />
            </div>
            <div data-testid="is_resident-no">
              <SelectCard value="no" title="No" />
            </div>
          </SelectCardGroup>
          <GroupError id="resident-error" message={errorFor("is_resident")} />
        </div>
      </div>

      {luce && (
        <Section title="Luce" testId="activation-luce">
          {luceSupplierShown && (
            <Select
              label="Attuale fornitore luce"
              name="current_supplier_luce"
              required
              placeholder="Seleziona il fornitore"
              options={supplierOptions(suppliers, "luce", state.currentSupplierLuce)}
              value={state.currentSupplierLuce ?? ""}
              error={errorFor("current_supplier_luce")}
              onChange={(e) => {
                edited("current_supplier_luce");
                update({ currentSupplierLuce: e.target.value });
              }}
              onBlur={() => touch("current_supplier_luce")}
            />
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label={podRequired ? "Codice POD" : "Codice POD (facoltativo)"}
              name="pod"
              required={podRequired}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={24}
              hint={
                podRequired
                  ? "Lo trovi in bolletta: inizia con IT ed è di 14 caratteri."
                  : "Se non lo hai ancora puoi lasciarlo vuoto."
              }
              value={a.pod}
              error={errorFor("pod")}
              onChange={(e) => {
                edited("pod");
                update({ activation: { pod: e.target.value.toUpperCase() } });
              }}
              onBlur={() => {
                touch("pod");
                const r = validatePod(a.pod);
                if (r.ok && r.value !== a.pod) update({ activation: { pod: r.value } });
              }}
            />
            <Select
              label="Potenza impegnata"
              name="power_kw"
              required
              options={powerOptions()}
              value={powerToSelectValue(a.powerKw)}
              onChange={(e) => {
                edited("power_kw");
                update({ activation: { powerKw: powerFromSelectValue(e.target.value) } });
              }}
            />
          </div>
          <div>
            <GroupLabel id="voltage-label" required>
              Livello di tensione
            </GroupLabel>
            <SelectCardGroup
              type="radio"
              aria-labelledby="voltage-label"
              value={a.voltage === null ? null : String(a.voltage)}
              onValueChange={(v) => {
                edited("voltage");
                touch("voltage");
                update({ activation: { voltage: Number(v) as Voltage } });
              }}
              className="grid grid-cols-2 gap-3 sm:max-w-md"
            >
              <div data-testid="voltage-220">
                <SelectCard value="220" title="220 V" description="Monofase" />
              </div>
              <div data-testid="voltage-380">
                <SelectCard value="380" title="380 V" description="Trifase" />
              </div>
            </SelectCardGroup>
            <GroupError id="voltage-error" message={errorFor("voltage")} />
          </div>
        </Section>
      )}

      {gas && (
        <Section title="Gas" testId="activation-gas">
          {gasSupplierShown && (
            <Select
              label="Attuale fornitore gas"
              name="current_supplier_gas"
              required
              placeholder="Seleziona il fornitore"
              options={supplierOptions(suppliers, "gas", state.currentSupplierGas)}
              value={state.currentSupplierGas ?? ""}
              error={errorFor("current_supplier_gas")}
              onChange={(e) => {
                edited("current_supplier_gas");
                update({ currentSupplierGas: e.target.value });
              }}
              onBlur={() => touch("current_supplier_gas")}
            />
          )}
          <Input
            label={pdrRequired ? "Codice PDR" : "Codice PDR (facoltativo)"}
            name="pdr"
            required={pdrRequired}
            inputMode="numeric"
            autoComplete="off"
            maxLength={20}
            className="sm:max-w-sm"
            hint={
              pdrRequired
                ? "Lo trovi in bolletta: è di 14 cifre."
                : "Se non lo hai ancora puoi lasciarlo vuoto."
            }
            value={a.pdr}
            error={errorFor("pdr")}
            onChange={(e) => {
              edited("pdr");
              update({ activation: { pdr: e.target.value } });
            }}
            onBlur={() => {
              touch("pdr");
              const r = validatePdr(a.pdr);
              if (r.ok && r.value !== a.pdr) update({ activation: { pdr: r.value } });
            }}
          />
          <div>
            <GroupLabel id="gas-uses-label" required>
              Usi del gas
            </GroupLabel>
            <SelectCardGroup
              type="checkbox"
              aria-labelledby="gas-uses-label"
              value={gasUses}
              onValueChange={(v) => {
                edited("gas_uses");
                touch("gas_uses");
                update({ activation: { gasUses: v as GasUseId[] } });
              }}
              className="grid grid-cols-1 gap-3 sm:grid-cols-3"
            >
              {GAS_USES.map((u) => (
                <div key={u.id} data-testid={`gas-use-${u.id}`}>
                  <SelectCard value={u.id} title={u.label} />
                </div>
              ))}
            </SelectCardGroup>
            <GroupError id="gas-uses-error" message={errorFor("gas_uses")} />
          </div>
        </Section>
      )}

      {beforeActions}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button
          variant="secondary"
          size="lg"
          data-testid="activation-back"
          onClick={onBack}
          disabled={submitting}
        >
          Indietro
        </Button>
        <Button type="submit" size="lg" data-testid="activation-submit" loading={submitting}>
          Prosegui
        </Button>
      </div>
    </form>
  );
}
