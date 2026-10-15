/**
 * Sanity checks of the matrix generator itself (no browser): unique ids, every dimension covered,
 * pruning rules respected. A broken generator would silently shrink the matrix.
 */
import { expect, test } from "@playwright/test";
import { validateCodiceFiscale } from "../../src/lib/logic/validators/codice-fiscale";
import { validatePartitaIva } from "../../src/lib/logic/validators/partita-iva";
import { MATRIX, MOBILE_MATRIX, SERVICES } from "./cases";

test.describe("matrix generator", () => {
  test("ids are unique and every case has valid CF / P.IVA", () => {
    expect(new Set(MATRIX.map((c) => c.id)).size).toBe(MATRIX.length);
    for (const c of MATRIX) {
      expect(validateCodiceFiscale(c.person.cf, { firstName: c.person.first, lastName: c.person.last }).ok, c.id).toBe(true);
      if (c.vat) expect(validatePartitaIva(c.vat).ok, c.id).toBe(true);
    }
  });

  test("every commodity x customer x service combination exists on desktop and on mobile", () => {
    for (const commodity of ["luce", "gas", "dual"]) {
      for (const customer of ["casa", "business"]) {
        for (const service of SERVICES) {
          const hits = MATRIX.filter((c) => c.commodity === commodity && c.customer === customer && c.service === service);
          expect(hits.length, `${commodity}/${customer}/${service}`).toBeGreaterThan(0);
          expect(hits.some((c) => c.mobile), `mobile ${commodity}/${customer}/${service}`).toBe(true);
        }
      }
    }
  });

  test("pruning rules R1-R5", () => {
    for (const c of MATRIX) {
      if (c.commodity === "luce") {
        expect(c.hasGas, c.id).toBeNull();
        expect(c.gasUses, c.id).toEqual([]);
        expect(c.supplierGas, c.id).toBeNull();
      }
      if (c.customer === "business") {
        expect(c.hasGas, c.id).toBeNull();
        expect(c.manual, c.id).toBe(true);
        expect(c.people, c.id).toBeNull();
      }
      if (c.commodity === "gas" && c.hasGas === false) expect(c.service, c.id).toBe("primo_allaccio");
      if (c.hasGas === false) expect(c.supplierGas, c.id).toBeNull();
      if (c.service === "subentro" || c.service === "primo_allaccio") expect(c.supplierLuce, c.id).toBeNull();
    }
  });

  test("gas dimensions: hasGas yes/no, every single use, all uses, zones A-F and the unknown zone", () => {
    const gas = MATRIX.filter((c) => c.commodity !== "luce" && c.customer === "casa" && !c.manual);
    expect(new Set(gas.map((c) => c.hasGas))).toEqual(new Set([true, false]));
    for (const use of ["cucina", "riscaldamento", "acqua_calda"]) {
      expect(gas.some((c) => c.gasUses.length === 1 && c.gasUses[0] === use), use).toBe(true);
    }
    expect(gas.some((c) => c.gasUses.length === 3)).toBe(true);
    const zones = new Set(gas.filter((c) => c.gasUses.includes("riscaldamento")).map((c) => c.zone));
    expect(zones).toEqual(new Set(["A", "B", "C", "D", "E", "F", null]));
    expect(MATRIX.some((c) => c.manual && c.customer === "casa")).toBe(true);
    expect(MATRIX.some((c) => !c.manual)).toBe(true);
  });

  test("Edison (luce) and Eni Plenitude (gas) are the current supplier somewhere in every relevant group", () => {
    for (const service of ["cambio_fornitore", "voltura"] as const) {
      expect(MATRIX.some((c) => c.commodity === "luce" && c.service === service && c.supplierLuce === "edison-energia")).toBe(true);
      expect(MATRIX.some((c) => c.commodity === "gas" && c.service === service && c.supplierGas === "eni-plenitude")).toBe(true);
      expect(MATRIX.some((c) => c.commodity === "dual" && c.service === service && c.supplierLuce === "edison-energia" && c.supplierGas === "eni-plenitude")).toBe(true);
    }
  });

  test("size", () => {
    console.log(`matrix: ${MATRIX.length} desktop cases, ${MOBILE_MATRIX.length} mobile cases`);
    expect(MATRIX.length).toBeGreaterThan(150);
  });
});
