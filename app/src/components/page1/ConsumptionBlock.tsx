"use client";

import { APPLIANCES, GAS_USES, SQM_RANGES, type ApplianceId, type GasUseId } from "@/config/consumption";
import { Input, SelectCardGroup } from "@/components/ui";
import type { SqmRange } from "@/lib/data/types";
import type { FlowPatch, FlowState } from "@/lib/lead/flow-state";
import { includesGas, includesLuce } from "@/lib/lead/rules";
import {
  AirConditionerIcon,
  CookingIcon,
  DishwasherIcon,
  DropletIcon,
  FridgeIcon,
  OvenIcon,
  RadiatorIcon,
  WasherIcon,
  WaterHeaterIcon,
} from "./icons";
import { formatCount, parseWholeNumber, usesManualEntry, type Page1Errors } from "./logic";
import { Anchor, Block, CheckboxField, Choice, FieldGroup, legendId } from "./parts";
import type { ReactNode } from "react";

const APPLIANCE_ICONS: Record<ApplianceId, ReactNode> = {
  frigorifero: <FridgeIcon />,
  forno: <OvenIcon />,
  lavastoviglie: <DishwasherIcon />,
  lavatrice: <WasherIcon />,
  climatizzatore: <AirConditionerIcon />,
  scaldabagno: <WaterHeaterIcon />,
};

const GAS_USE_ICONS: Record<GasUseId, ReactNode> = {
  cucina: <CookingIcon />,
  riscaldamento: <RadiatorIcon />,
  acqua_calda: <DropletIcon />,
};

const PEOPLE_OPTIONS = [1, 2, 3, 4, 5] as const;

interface Props {
  state: FlowState;
  change: (patch: FlowPatch) => void;
  errors: Page1Errors;
}

function Estimate({ testId, value, unit }: { testId: string; value: number | null; unit: string }) {
  return (
    <div aria-live="polite">
      {value != null && (
        <p
          data-testid={testId}
          className="rounded-control border border-brand-200 bg-brand-50 px-4 py-3 text-base text-brand-900"
        >
          Consumo stimato: <strong className="font-bold">~{formatCount(value)} {unit}/anno</strong>
        </p>
      )}
    </div>
  );
}

function ManualInputs({ state, change, errors }: Props) {
  const luce = includesLuce(state.commodity);
  const gas = includesGas(state.commodity);
  return (
    <div className="flex flex-col gap-5" data-testid="manual-consumption">
      {luce && (
        <Anchor fieldKey="manualKwh">
          <Input
            id="p1-manual-kwh"
            data-testid="manual-kwh"
            label="Consumo annuo di energia elettrica (kWh)"
            hint="Lo trovi in bolletta, alla voce «Consumo annuo» o «Consumo ultimi 12 mesi»."
            inputMode="numeric"
            autoComplete="off"
            placeholder="Es. 2700"
            required
            value={state.manualKwhYear != null ? String(state.manualKwhYear) : ""}
            onChange={(e) => change({ manualKwhYear: parseWholeNumber(e.target.value) })}
            error={errors.manualKwh}
          />
        </Anchor>
      )}
      {gas && (
        <Anchor fieldKey="manualSmc">
          <Input
            id="p1-manual-smc"
            data-testid="manual-smc"
            label="Consumo annuo di gas (Smc)"
            hint="Lo trovi in bolletta, alla voce «Consumo annuo» o «Consumo ultimi 12 mesi» (Smc)."
            inputMode="numeric"
            autoComplete="off"
            placeholder="Es. 800"
            required
            value={state.manualSmcYear != null ? String(state.manualSmcYear) : ""}
            onChange={(e) => change({ manualSmcYear: parseWholeNumber(e.target.value) })}
            error={errors.manualSmc}
          />
        </Anchor>
      )}
    </div>
  );
}

/** Block F (PRD §6): consumption estimate for Casa, direct entry for Partita IVA. */
export function ConsumptionBlock({ state, change, errors }: Props) {
  const luce = includesLuce(state.commodity);
  const gas = includesGas(state.commodity);
  const business = state.customerType === "business";
  const manual = usesManualEntry(state);

  if (business) {
    return (
      <Block
        id="consumption"
        title="I tuoi consumi"
        description="Inserisci il consumo annuo che trovi nella tua bolletta."
        testId="block-consumption"
      >
        <ManualInputs state={state} change={change} errors={errors} />
      </Block>
    );
  }

  return (
    <Block id="consumption" title="I tuoi consumi" testId="block-consumption">
      {!manual && (
        <FieldGroup fieldKey="people" legend="Quante persone vivono in casa?" error={errors.people}>
          <SelectCardGroup
            type="radio"
            aria-labelledby={legendId("people")}
            value={state.people != null ? String(state.people) : null}
            onValueChange={(v) => change({ people: Number(v) })}
            className="grid grid-cols-5 gap-2"
          >
            {PEOPLE_OPTIONS.map((n) => (
              <Choice
                key={n}
                testId={`people-${n}`}
                selected={state.people === n}
                value={String(n)}
                title={n === 5 ? "5+" : String(n)}
              />
            ))}
          </SelectCardGroup>
        </FieldGroup>
      )}

      {luce && !manual && (
        <>
          <FieldGroup fieldKey="appliances" legend="Per cosa utilizzi la Luce?" hint="Puoi selezionarne più di uno.">
            <SelectCardGroup
              type="checkbox"
              aria-labelledby={legendId("appliances")}
              value={state.appliances}
              onValueChange={(v) => change({ appliances: v as ApplianceId[] })}
              className="grid grid-cols-2 gap-3 sm:grid-cols-3"
            >
              {APPLIANCES.map((a) => (
                <Choice
                  key={a.id}
                  testId={`appliance-${a.id}`}
                  selected={state.appliances.includes(a.id)}
                  value={a.id}
                  title={a.label}
                  icon={APPLIANCE_ICONS[a.id]}
                />
              ))}
            </SelectCardGroup>
          </FieldGroup>
          <Estimate testId="estimate-luce" value={state.estimatedKwhYear} unit="kWh" />
        </>
      )}

      {gas && (
        <>
          <FieldGroup fieldKey="hasGas" legend="Hai già il Gas a casa?" error={errors.hasGas}>
            <SelectCardGroup
              type="radio"
              aria-labelledby={legendId("hasGas")}
              value={state.hasGas == null ? null : state.hasGas ? "yes" : "no"}
              onValueChange={(v) => change({ hasGas: v === "yes" })}
              className="grid grid-cols-2 gap-3"
            >
              <Choice testId="has-gas-yes" selected={state.hasGas === true} value="yes" title="Sì" />
              <Choice testId="has-gas-no" selected={state.hasGas === false} value="no" title="No" />
            </SelectCardGroup>
            {state.hasGas === false && (
              <p data-testid="has-gas-note" className="mt-3 text-sm text-ink-muted">
                Senza una fornitura gas attiva si tratta di un Primo allaccio.
              </p>
            )}
          </FieldGroup>

          <FieldGroup
            fieldKey="gasUses"
            legend="Per cosa utilizzi il Gas?"
            hint="Puoi selezionarne più di uno."
            error={errors.gasUses}
          >
            <SelectCardGroup
              type="checkbox"
              aria-labelledby={legendId("gasUses")}
              value={state.gasUses}
              onValueChange={(v) => change({ gasUses: v as GasUseId[] })}
              className="grid grid-cols-2 gap-3 sm:grid-cols-3"
            >
              {GAS_USES.map((u) => (
                <Choice
                  key={u.id}
                  testId={`gas-use-${u.id}`}
                  selected={state.gasUses.includes(u.id)}
                  value={u.id}
                  title={u.label}
                  icon={GAS_USE_ICONS[u.id]}
                />
              ))}
            </SelectCardGroup>
          </FieldGroup>

          {!manual && state.gasUses.includes("riscaldamento") && (
            <FieldGroup fieldKey="sqmRange" legend="Quanto è grande la casa da riscaldare?" error={errors.sqmRange}>
              <SelectCardGroup
                type="radio"
                aria-labelledby={legendId("sqmRange")}
                value={state.sqmRange}
                onValueChange={(v) => change({ sqmRange: v as SqmRange })}
                className="grid grid-cols-2 gap-3 sm:grid-cols-4"
              >
                {SQM_RANGES.map((r) => (
                  <Choice
                    key={r.id}
                    testId={`sqm-${r.id}`}
                    selected={state.sqmRange === r.id}
                    value={r.id}
                    title={r.label}
                  />
                ))}
              </SelectCardGroup>
            </FieldGroup>
          )}
          {!manual && <Estimate testId="estimate-gas" value={state.estimatedSmcYear} unit="Smc" />}
        </>
      )}

      {manual && <ManualInputs state={state} change={change} errors={errors} />}

      <div className="border-t border-line pt-5">
        <CheckboxField
          id="p1-manual-toggle"
          testId="manual-toggle"
          checked={state.manualConsumption}
          onChange={(checked) => change({ manualConsumption: checked })}
        >
          Conosco il mio consumo annuo
        </CheckboxField>
      </div>
    </Block>
  );
}
