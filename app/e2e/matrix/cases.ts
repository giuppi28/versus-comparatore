/**
 * T7.1 — programmatic generation of the customer-flow test matrix.
 *
 * Dimensions (CLAUDE.md "definition of done"):
 *   commodity {luce, gas, dual} x customer {casa, business} x service {cambio_fornitore, subentro,
 *   voltura, primo_allaccio} x "gas already present" {si, no} x gas uses {each single use, pairs, all,
 *   riscaldamento in every climate zone A..F plus a comune with an unknown zone} x
 *   consumption {estimated, manual}.
 *
 * PRUNING RULES (impossible / meaningless combinations are removed, everything else is kept):
 *   R1  luce-only has no gas dimension: no hasGas, no gas uses, no sqm range.
 *   R2  gas questions ("Hai gia' il Gas a casa?", uses, m2) exist only for Casa; Partita IVA always
 *       enters the annual consumption by hand (PRD §6 Block F) and has no hasGas / household questions.
 *   R3  Partita IVA => manual consumption only (so "estimated" does not exist for business).
 *   R4  gas-only + hasGas=no locks the service to Primo allaccio (PRD §6): the other three services
 *       do not exist for that combination (Block D is disabled in the UI).
 *   R5  dual + hasGas=no keeps all four services for luce; the gas part is forced to Primo allaccio.
 *   R6  riscaldamento is the only use that needs the m2 range and the comune's climate zone; the
 *       zone dimension (A,B,C,D,E,F,null) is therefore only crossed with the riscaldamento profiles.
 *       Other dimensions (people, appliances, comune, current supplier, activation answers) are
 *       rotated deterministically over the cases instead of being cross-multiplied.
 *   R7  manual consumption (Casa) hides people/appliances/m2: one profile per use-set is enough.
 *   R8  the current supplier exists only for Cambio fornitore and Voltura (and never for a gas part
 *       forced to Primo allaccio by hasGas=no).
 *
 * The first cambio/voltura case of every group uses Edison Energia (luce) / Eni Plenitude (gas), so the
 * "current supplier excluded" rule is proven on a supplier that has offers. Variable, IBAN-required and
 * forced-featured offers are pinned in offer-kinds.spec.ts.
 */
import type { ApplianceId, GasUseId } from "../../src/config/consumption";
import type { ClimateZone, HousingTitle, ServiceType, SqmRange, Voltage } from "../../src/lib/data/types";
import { MOCK_COMUNI } from "../../src/lib/data/mock/data";
import { nameCode, surnameCode } from "../../src/lib/logic/validators/codice-fiscale";
import { validatePartitaIva } from "../../src/lib/logic/validators/partita-iva";

export type CommodityChoice = "luce" | "gas" | "dual";
export type CustomerChoice = "casa" | "business";

export interface Person {
  first: string;
  last: string;
  cf: string;
}

export interface MatrixCase {
  /** Unique, human readable (used as test title). */
  id: string;
  index: number;
  commodity: CommodityChoice;
  customer: CustomerChoice;
  service: ServiceType;
  /** Casa + gas in the comparison only; null otherwise (R1, R2). */
  hasGas: boolean | null;
  manual: boolean;
  /** Household size (Casa, estimated only). */
  people: number | null;
  appliances: ApplianceId[];
  gasUses: GasUseId[];
  sqm: SqmRange | null;
  /** Comune typed in the autocomplete (mock sample). */
  comune: string;
  zone: ClimateZone | null;
  /** Province code of the comune; estimateGas falls back to the province capital's zone when `zone` is null. */
  provinceCode: string | null;
  /** Current suppliers selected on Page 1 (null = block not shown). */
  supplierLuce: string | null;
  supplierGas: string | null;
  /** Annual consumption typed by hand (manual / business). */
  manualKwh: number | null;
  manualSmc: number | null;
  /** Rotating index of the offer card chosen on each step. */
  pickLuce: number;
  pickGas: number;
  /** Optional: choose this exact offer instead of the rotating position (variable / IBAN-required combos). */
  pickLuceId?: string;
  pickGasId?: string;
  person: Person;
  company: string | null;
  vat: string | null;
  housing: HousingTitle;
  resident: boolean;
  powerKw: number | null;
  voltage: Voltage;
  phoneFormat: "plain" | "spaced" | "intl";
  /** Gas uses edited on Step B (business only: nothing is prefilled). */
  businessGasUse: GasUseId;
  /** Part of the representative subset that also runs on mobile (390px). */
  mobile: boolean;
}

// ---------------------------------------------------------------------------
// deterministic helpers

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ODD_VALUES: Record<string, number> = {
  "0": 1, "1": 0, "2": 5, "3": 7, "4": 9, "5": 13, "6": 15, "7": 17, "8": 19, "9": 21,
  A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21, K: 2, L: 4, M: 18,
  N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14, U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23,
};

/** Official check character of a codice fiscale (independent copy of the algorithm). */
function checkChar(first15: string): string {
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    const ch = first15[i];
    sum += i % 2 === 0 ? ODD_VALUES[ch] : ch >= "0" && ch <= "9" ? ch.charCodeAt(0) - 48 : ch.charCodeAt(0) - 65;
  }
  return String.fromCharCode(65 + (sum % 26));
}

const BELFIORE = ["A562", "F205", "H501", "L219", "D612", "G273", "C351", "A944"];
const MONTH_LETTERS = "ABCDEHLMPRST";

/** A valid codice fiscale for the given names (surname/name codes + synthetic birth data). */
export function makeCodiceFiscale(first: string, last: string, seed: number): string {
  const r = rng(seed * 7919 + 13);
  const year = String(60 + Math.floor(r() * 40)).padStart(2, "0");
  const month = MONTH_LETTERS[Math.floor(r() * 12)];
  const day = String(1 + Math.floor(r() * 28)).padStart(2, "0");
  const place = BELFIORE[Math.floor(r() * BELFIORE.length)];
  const body = `${surnameCode(last)}${nameCode(first)}${year}${month}${day}${place}`;
  return body + checkChar(body);
}

/** A valid Partita IVA (11 digits, official checksum). */
export function makePartitaIva(seed: number): string {
  const r = rng(seed * 104729 + 7);
  for (;;) {
    const digits = String(Math.floor(r() * 1e11)).padStart(11, "0");
    if (validatePartitaIva(digits).ok) return digits;
  }
}

// Surnames/names include apostrophes, accents and multiple words on purpose: the CF algorithm
// strips them and the lead stores the name as typed.
const PEOPLE: ReadonlyArray<readonly [string, string]> = [
  ["Mario", "Rossi"],
  ["Giulia", "Bianchi"],
  ["Luca", "Esposito"],
  ["Anna", "De Luca"],
  ["Niccolò", "D'Angelo"],
  ["Francesca", "Russo"],
  ["Alessandro", "Ferrari"],
  ["Chiara", "Colombo"],
  ["Giovanni", "Marino"],
  ["Elisa", "Greco"],
  ["Andrea", "Bruno"],
  ["Sofia", "Gallo"],
];

const COMPANIES = ["Rossi Impianti S.r.l.", "Bar Sport di Bianchi", "Studio Esposito & C.", "Officine Greco S.n.c."];
const HOUSING: HousingTitle[] = ["proprietario", "inquilino", "usufruttuario", "altro"];
const POWERS: Array<number | null> = [3, 1.5, 4.5, 6, 3.5, 5, 10, 15, null, 4];
const PHONE_FORMATS: MatrixCase["phoneFormat"][] = ["plain", "spaced", "intl"];

/**
 * Suppliers the customer may currently have: those with offers (incl. the Phase 14 suppliers Sentra,
 * Enegan, Asti, Estra), suppliers without any offer (Hera, Engie: nothing to exclude) and the special options.
 */
const LUCE_CURRENT = ["edison-energia", "sentra-energia", "a2a-energia", "hera-comm", "enel-energia", "tutela", "estra-energia", "asti-energia"];
const GAS_CURRENT = ["eni-plenitude", "enegan", "engie", "iren", "enel-energia", "non-lo-so", "sentra-energia", "asti-energia"];

// ---------------------------------------------------------------------------
// profiles

interface LuceProfile {
  key: string;
  people: number;
  appliances: ApplianceId[];
}

const LUCE_PROFILES: LuceProfile[] = [
  { key: "L1", people: 1, appliances: [] },
  { key: "L2", people: 2, appliances: ["frigorifero", "lavatrice"] },
  { key: "L3", people: 3, appliances: ["forno", "lavastoviglie", "climatizzatore"] },
  { key: "L4", people: 4, appliances: ["scaldabagno"] },
  {
    key: "L5",
    people: 5,
    appliances: ["frigorifero", "forno", "lavastoviglie", "lavatrice", "climatizzatore", "scaldabagno"],
  },
];

interface GasProfile {
  key: string;
  uses: GasUseId[];
  sqm: SqmRange | null;
  comune: string;
}

const ALL_USES: GasUseId[] = ["cucina", "riscaldamento", "acqua_calda"];

/** Estimated gas profiles: each single use, a pair, all uses, riscaldamento in every zone + null zone. */
const GAS_ESTIMATED_PROFILES: GasProfile[] = [
  { key: "cucina", uses: ["cucina"], sqm: null, comune: "Palermo" },
  { key: "acqua", uses: ["acqua_calda"], sqm: null, comune: "Roma" },
  { key: "cucina+acqua", uses: ["cucina", "acqua_calda"], sqm: null, comune: "Bari" },
  { key: "risc-A", uses: ["riscaldamento"], sqm: "lt60", comune: "Lampedusa e Linosa" },
  { key: "risc-B", uses: ["riscaldamento"], sqm: "60_90", comune: "Catania" },
  { key: "risc-C", uses: ["riscaldamento"], sqm: "gt120", comune: "Napoli" },
  { key: "risc-D", uses: ["riscaldamento"], sqm: "90_120", comune: "Firenze" },
  { key: "risc-E", uses: ["riscaldamento"], sqm: "90_120", comune: "Milano" },
  { key: "risc-F", uses: ["riscaldamento"], sqm: "gt120", comune: "Belluno" },
  { key: "risc-null", uses: ["riscaldamento"], sqm: "60_90", comune: "Borgo Valbelluna" },
  { key: "tutti", uses: ALL_USES, sqm: "60_90", comune: "Venezia" },
  { key: "risc+cucina", uses: ["cucina", "riscaldamento"], sqm: "lt60", comune: "Cortina d'Ampezzo" },
];

/** Manual gas profiles: uses are still asked (they feed the activation form), m2 is not. */
const GAS_MANUAL_PROFILES: GasProfile[] = [
  { key: "man-cucina", uses: ["cucina"], sqm: null, comune: "Torino" },
  { key: "man-tutti", uses: ALL_USES, sqm: null, comune: "Reggio di Calabria" },
];

const SERVICES: ServiceType[] = ["cambio_fornitore", "subentro", "voltura", "primo_allaccio"];

function comuneByName(comuneName: string) {
  const c = MOCK_COMUNI.find((x) => x.name === comuneName);
  if (!c) throw new Error(`Unknown mock comune "${comuneName}"`);
  return c;
}

// ---------------------------------------------------------------------------
// generation

export function generateMatrix(): MatrixCase[] {
  const cases: MatrixCase[] = [];
  const groupCounter = new Map<string, number>();
  const mobileGroups = new Set<string>();
  let n = 0;

  interface Spec {
    commodity: CommodityChoice;
    customer: CustomerChoice;
    service: ServiceType;
    hasGas: boolean | null;
    manual: boolean;
    luceProfile: LuceProfile | null;
    gasProfile: GasProfile | null;
    label: string;
  }

  function add(spec: Spec) {
    const index = n++;
    const { commodity, customer, service, hasGas, manual, luceProfile, gasProfile } = spec;
    const groupKey = [commodity, customer, service, hasGas === null ? "-" : hasGas ? "gas" : "nogas"].join("|");
    const k = groupCounter.get(groupKey) ?? 0;
    groupCounter.set(groupKey, k + 1);

    const luceService = service;
    const gasService: ServiceType = hasGas === false ? "primo_allaccio" : service;
    const supplierLuce =
      commodity !== "gas" && (luceService === "cambio_fornitore" || luceService === "voltura")
        ? LUCE_CURRENT[k % LUCE_CURRENT.length]
        : null;
    const supplierGas =
      commodity !== "luce" && (gasService === "cambio_fornitore" || gasService === "voltura")
        ? GAS_CURRENT[k % GAS_CURRENT.length]
        : null;

    const [first, last] = PEOPLE[index % PEOPLE.length];
    const business = customer === "business";
    const comune = gasProfile?.comune ?? ["Milano", "Roma", "Napoli", "Torino", "Bologna", "Firenze"][index % 6];

    const profileKey = [luceProfile?.key, gasProfile?.key].filter(Boolean).join("+") || "base";
    const id = `${commodity} | ${customer} | ${service}${hasGas === null ? "" : hasGas ? " | gas-si" : " | gas-no"} | ${spec.label} | ${profileKey}`;

    // Mobile subset: first case of each (commodity, customer, service, hasGas) group (covers every
    // commodity x customer x service) + the unusual gas profiles (unknown zone, zone A, all uses, manual).
    const special = ["risc-null", "risc-A", "tutti"].includes(gasProfile?.key ?? "") && service === "cambio_fornitore";
    const first_in_group = !mobileGroups.has(groupKey);
    if (first_in_group) mobileGroups.add(groupKey);
    const mobile = first_in_group || (special && hasGas !== false) || (manual && service === "voltura" && customer === "casa");

    cases.push({
      id,
      index,
      commodity,
      customer,
      service,
      hasGas,
      manual,
      people: business || manual ? null : (luceProfile?.people ?? 1 + (index % 5)),
      appliances: !business && !manual && luceProfile ? luceProfile.appliances : [],
      gasUses: business ? [] : (gasProfile?.uses ?? []),
      sqm: !business && !manual ? (gasProfile?.sqm ?? null) : null,
      comune,
      zone: comuneByName(comune).climate_zone,
      provinceCode: comuneByName(comune).province_code,
      supplierLuce,
      supplierGas,
      manualKwh: manual || business ? 1500 + ((index * 733) % 9000) : null,
      manualSmc: manual || business ? 300 + ((index * 271) % 2500) : null,
      pickLuce: index,
      pickGas: index + 1,
      person: { first, last, cf: makeCodiceFiscale(first, last, index) },
      company: business ? COMPANIES[index % COMPANIES.length] : null,
      vat: business ? makePartitaIva(index) : null,
      housing: HOUSING[index % HOUSING.length],
      resident: index % 3 !== 0,
      powerKw: POWERS[index % POWERS.length],
      voltage: (index % 2 === 0 ? 220 : 380) as Voltage,
      phoneFormat: PHONE_FORMATS[index % PHONE_FORMATS.length],
      businessGasUse: ALL_USES[index % 3],
      mobile,
    });
  }

  // ---- LUCE ONLY (R1) ----
  for (const service of SERVICES) {
    LUCE_PROFILES.forEach((p) =>
      add({ commodity: "luce", customer: "casa", service, hasGas: null, manual: false, luceProfile: p, gasProfile: null, label: "stima" }),
    );
    add({ commodity: "luce", customer: "casa", service, hasGas: null, manual: true, luceProfile: null, gasProfile: null, label: "manuale" });
    add({ commodity: "luce", customer: "business", service, hasGas: null, manual: true, luceProfile: null, gasProfile: null, label: "manuale" });
  }

  // ---- GAS ONLY ----
  for (const hasGas of [true, false]) {
    // R4: hasGas=no => only Primo allaccio
    for (const service of hasGas ? SERVICES : (["primo_allaccio"] as ServiceType[])) {
      GAS_ESTIMATED_PROFILES.forEach((g) =>
        add({ commodity: "gas", customer: "casa", service, hasGas, manual: false, luceProfile: null, gasProfile: g, label: "stima" }),
      );
      GAS_MANUAL_PROFILES.forEach((g) =>
        add({ commodity: "gas", customer: "casa", service, hasGas, manual: true, luceProfile: null, gasProfile: g, label: "manuale" }),
      );
    }
  }
  for (const service of SERVICES) {
    add({ commodity: "gas", customer: "business", service, hasGas: null, manual: true, luceProfile: null, gasProfile: null, label: "manuale" });
  }

  // ---- LUCE + GAS ----
  for (const service of SERVICES) {
    for (const hasGas of [true, false]) {
      GAS_ESTIMATED_PROFILES.forEach((g, i) =>
        add({
          commodity: "dual",
          customer: "casa",
          service,
          hasGas,
          manual: false,
          luceProfile: LUCE_PROFILES[(i + SERVICES.indexOf(service)) % LUCE_PROFILES.length],
          gasProfile: g,
          label: "stima",
        }),
      );
      GAS_MANUAL_PROFILES.forEach((g) =>
        add({ commodity: "dual", customer: "casa", service, hasGas, manual: true, luceProfile: null, gasProfile: g, label: "manuale" }),
      );
    }
    add({ commodity: "dual", customer: "business", service, hasGas: null, manual: true, luceProfile: null, gasProfile: null, label: "manuale" });
  }

  return cases;
}

export const MATRIX: MatrixCase[] = generateMatrix();
export const MOBILE_MATRIX: MatrixCase[] = MATRIX.filter((c) => c.mobile);

export { GAS_ESTIMATED_PROFILES, GAS_MANUAL_PROFILES, LUCE_PROFILES, SERVICES, LUCE_CURRENT, GAS_CURRENT };
