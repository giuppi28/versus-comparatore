"use client";

import { useState } from "react";
import { Input } from "@/components/ui";
import type { Commodity } from "@/lib/data/types";
import { parseMonthlyConsumption, unitFor } from "./results-logic";

export interface ConsumptionPanelProps {
  commodity: Commodity;
  /** Current valid monthly consumption (kWh or Smc). */
  monthly: number;
  onChange: (monthly: number) => void;
}

const nf = new Intl.NumberFormat("it-IT");

/**
 * "I tuoi consumi" (PRD §8): the only control of the results page. Valid values are
 * pushed up immediately (instant recalculation); an invalid draft shows an error and
 * keeps the last valid value in use. Remount with `key={commodity}` when the step changes.
 */
export function ConsumptionPanel({ commodity, monthly, onChange }: ConsumptionPanelProps) {
  const unit = unitFor(commodity);
  const [text, setText] = useState(String(monthly));
  const [invalid, setInvalid] = useState(false);

  const handle = (raw: string) => {
    setText(raw);
    const parsed = parseMonthlyConsumption(raw);
    if (parsed == null) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onChange(parsed);
  };

  return (
    <section
      aria-labelledby="results-consumption-title"
      data-testid="results-consumption"
      className="rounded-card border border-line bg-surface p-4 shadow-card sm:p-5"
    >
      <h2 id="results-consumption-title" className="mb-3 text-lg font-bold text-ink">
        I tuoi consumi
      </h2>
      <Input
        label={commodity === "luce" ? "Consumo mensile di luce (kWh)" : "Consumo mensile di gas (Smc)"}
        inputMode="numeric"
        autoComplete="off"
        value={text}
        onChange={(e) => handle(e.target.value)}
        onBlur={() => {
          if (invalid) {
            setText(String(monthly));
            setInvalid(false);
          }
        }}
        error={invalid ? `Inserisci un consumo mensile valido in ${unit} (numero intero maggiore di zero).` : undefined}
        hint={
          invalid
            ? undefined
            : `Stima in base ai tuoi dati: modificala se conosci il tuo consumo. Circa ${nf.format(monthly * 12)} ${unit} all'anno.`
        }
        data-testid={commodity === "luce" ? "results-consumption-kwh" : "results-consumption-smc"}
      />
    </section>
  );
}
