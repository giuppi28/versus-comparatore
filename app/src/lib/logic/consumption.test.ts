import { describe, expect, it } from "vitest";
import { APPLIANCES, CLIMATE_ZONE_SMC_PER_SQM, SQM_RANGE_VALUE } from "@/config/consumption";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ClimateZone, SqmRange } from "@/lib/data/types";
import { PROVINCE_CAPITAL_ZONES } from "@/config/province-capital-zones";
import { estimateGas, estimateLuce, normalizePeople, resolveClimateZone } from "./consumption";

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
  it("riscaldamento with unknown climate zone and unknown province falls back to zone E", () => {
    const base = { people: 2, uses: ["riscaldamento"], sqmRange: "60_90" as const };
    expect(estimateGas({ ...base, climateZone: null })).toBe(75 * 13);
    expect(estimateGas(base)).toBe(75 * 13);
    expect(estimateGas({ ...base, provinceCode: null })).toBe(75 * 13);
    expect(estimateGas({ ...base, provinceCode: "" })).toBe(75 * 13);
    expect(estimateGas({ ...base, provinceCode: "ZZ" })).toBe(75 * 13);
    expect(estimateGas({ ...base, provinceCode: "constructor" })).toBe(75 * 13);
  });
  it("riscaldamento with unknown comune zone uses the province capital's zone", () => {
    const base = { people: 2, uses: ["riscaldamento"], sqmRange: "90_120" as const, climateZone: null };
    // Bari (zone C) for Mola di Bari, Belluno (zone F) for Borgo Valbelluna.
    expect(estimateGas({ ...base, provinceCode: "BA" })).toBe(105 * CLIMATE_ZONE_SMC_PER_SQM.C);
    expect(estimateGas({ ...base, provinceCode: "bl " })).toBe(105 * CLIMATE_ZONE_SMC_PER_SQM.F);
  });
  it("the comune's own zone wins over the province capital's zone", () => {
    expect(
      estimateGas({ people: 2, uses: ["riscaldamento"], sqmRange: "lt60", climateZone: "A", provinceCode: "BL" }),
    ).toBe(50 * 2);
    expect(resolveClimateZone("B", "BL")).toBe("B");
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

interface DatasetComune {
  istat_code: string;
  name: string;
  province_code: string;
  climate_zone: ClimateZone | null;
}

function loadDataset(): DatasetComune[] {
  const dir = join(process.cwd(), "supabase", "bootstrap");
  const all: DatasetComune[] = [];
  for (let i = 1; i <= 9; i++) {
    all.push(...(JSON.parse(readFileSync(join(dir, `comuni_0${i}.json`), "utf8")) as DatasetComune[]));
  }
  return all;
}

describe("province capital zone fallback (dataset)", () => {
  const dataset = loadDataset();
  const provinces = [...new Set(dataset.map((c) => c.province_code))];
  const nullZone = dataset.filter((c) => c.climate_zone === null);

  it("has an A-F capital zone for every province in the dataset and no extras", () => {
    expect(provinces).toHaveLength(110);
    for (const p of provinces) expect(PROVINCE_CAPITAL_ZONES[p], p).toMatch(/^[A-F]$/);
    expect(Object.keys(PROVINCE_CAPITAL_ZONES).sort()).toEqual([...provinces].sort());
  });
  it("matches the real zone of well-known capitals", () => {
    const expected: Record<string, ClimateZone> = { MI: "E", TO: "E", RM: "D", NA: "C", PA: "B", BL: "F", AO: "E", AG: "B", BA: "C" };
    for (const [p, z] of Object.entries(expected)) expect(PROVINCE_CAPITAL_ZONES[p], p).toBe(z);
  });
  it("covers the 21 comuni without a zone", () => {
    expect(nullZone).toHaveLength(21);
  });
  it.each(nullZone.map((c) => [c.istat_code, c.name, c.province_code] as const))(
    "comune %s %s (%s): fallback equals the province capital's zone",
    (_istat, _name, province) => {
      const zone = PROVINCE_CAPITAL_ZONES[province];
      expect(resolveClimateZone(null, province)).toBe(zone);
      expect(
        estimateGas({ people: 2, uses: ["riscaldamento"], sqmRange: "60_90", climateZone: null, provinceCode: province }),
      ).toBe(75 * CLIMATE_ZONE_SMC_PER_SQM[zone]);
    },
  );
});
