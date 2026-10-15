import { describe, expect, it } from "vitest";
import { APPLIANCES, CLIMATE_ZONE_SMC_PER_SQM, SQM_RANGE_VALUE } from "@/config/consumption";
import type { ClimateZone, SqmRange } from "@/lib/data/types";
import { estimateGas, estimateLuce, normalizePeople } from "./consumption";

describe("estimateLuce", () => {
  it("base consumption by people, no appliances", () => {
    expect([1, 2, 3, 4, 5].map((p) => estimateLuce({ people: p, appliances: [] }))).toEqual([
      900, 1300, 1600, 1900, 2200,
    ]);
  });
  it("flat appliances", () => {
    expect(estimateLuce({ people: 1, appliances: ["frigorifero"] })).toBe(1200);
    expect(estimateLuce({ people: 1, appliances: ["forno"] })).toBe(1050);
    expect(estimateLuce({ people: 1, appliances: ["lavastoviglie"] })).toBe(1150);
    expect(estimateLuce({ people: 1, appliances: ["lavatrice"] })).toBe(1100);
    expect(estimateLuce({ people: 1, appliances: ["climatizzatore"] })).toBe(1400);
  });
  it("scaldabagno is 600 kWh per person", () => {
    expect(estimateLuce({ people: 1, appliances: ["scaldabagno"] })).toBe(900 + 600);
    expect(estimateLuce({ people: 3, appliances: ["scaldabagno"] })).toBe(1600 + 1800);
    expect(estimateLuce({ people: 5, appliances: ["scaldabagno"] })).toBe(2200 + 3000);
  });
  it("all appliances for 4 people", () => {
    const flat = APPLIANCES.reduce((s, a) => s + a.kwh, 0); // 1400
    expect(estimateLuce({ people: 4, appliances: APPLIANCES.map((a) => a.id) })).toBe(1900 + flat + 2400);
  });
  it("ignores unknown ids and duplicates", () => {
    expect(estimateLuce({ people: 2, appliances: ["forno", "forno", "tv"] })).toBe(1300 + 150);
  });
  it("normalizes people (5+ => 5, clamp, floor, invalid => 1)", () => {
    expect(normalizePeople(6)).toBe(5);
    expect(normalizePeople(0)).toBe(1);
    expect(normalizePeople(2.9)).toBe(2);
    expect(normalizePeople(Number.NaN)).toBe(1);
    expect(estimateLuce({ people: 8, appliances: [] })).toBe(2200);
  });
});

describe("estimateGas", () => {
  it("cucina = 40 + 10 per person", () => {
    expect(estimateGas({ people: 1, uses: ["cucina"] })).toBe(50);
    expect(estimateGas({ people: 4, uses: ["cucina"] })).toBe(80);
    expect(estimateGas({ people: 5, uses: ["cucina"] })).toBe(90);
  });
  it("acqua calda = 70 per person", () => {
    expect(estimateGas({ people: 1, uses: ["acqua_calda"] })).toBe(70);
    expect(estimateGas({ people: 3, uses: ["acqua_calda"] })).toBe(210);
  });
  it("no uses => 0, unknown ids ignored", () => {
    expect(estimateGas({ people: 3, uses: [] })).toBe(0);
    expect(estimateGas({ people: 3, uses: ["piscina"] })).toBe(0);
  });
  it("riscaldamento: every range x every zone", () => {
    const ranges: [SqmRange, number][] = [["lt60", 50], ["60_90", 75], ["90_120", 105], ["gt120", 140]];
    const zones: [ClimateZone, number][] = [["A", 2], ["B", 4], ["C", 7], ["D", 10], ["E", 13], ["F", 16]];
    for (const [range, sqm] of ranges) {
      expect(SQM_RANGE_VALUE[range]).toBe(sqm);
      for (const [zone, coeff] of zones) {
        expect(CLIMATE_ZONE_SMC_PER_SQM[zone]).toBe(coeff);
        expect(estimateGas({ people: 2, uses: ["riscaldamento"], sqmRange: range, climateZone: zone })).toBe(sqm * coeff);
      }
    }
  });
  it("riscaldamento with unknown climate zone falls back to zone E", () => {
    expect(estimateGas({ people: 2, uses: ["riscaldamento"], sqmRange: "60_90", climateZone: null })).toBe(75 * 13);
    expect(estimateGas({ people: 2, uses: ["riscaldamento"], sqmRange: "60_90" })).toBe(75 * 13);
  });
  it("riscaldamento without sqm range contributes 0", () => {
    expect(estimateGas({ people: 2, uses: ["riscaldamento"], climateZone: "E" })).toBe(0);
    expect(estimateGas({ people: 2, uses: ["riscaldamento"], sqmRange: null, climateZone: "E" })).toBe(0);
  });
  it("all uses combined", () => {
    expect(
      estimateGas({ people: 3, uses: ["cucina", "acqua_calda", "riscaldamento"], sqmRange: "90_120", climateZone: "D" }),
    ).toBe(70 + 210 + 1050);
  });
});
