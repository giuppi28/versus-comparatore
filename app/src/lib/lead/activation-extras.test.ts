// @vitest-environment node
/** Phase 12 (E3–E5): optional IBAN / account holder / identity document + POD/PDR codes. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRepository, type Repository } from "@/lib/data";
import { LEAD_COOKIE, LEAD_STEP_COOKIE } from "./api-types";
import { checkCompletion, checkPatchActivation, italianToday } from "./completion";
import { INITIAL_FLOW_STATE, applyFlowPatch, loadFlowState, toLeadCompleteData, FLOW_STORAGE_KEY } from "./flow-state";
import { createLeadHandlers, createRateLimiters, type LeadHandlers } from "./handlers";
import { completeBodySchema, patchBodySchema, zodFieldErrors } from "./schemas";
import { completeData, page1Data, VALID_CF } from "./test-fixtures";

const IBAN = "IT60X0542811101000000123456";
const IBAN_BAD_CHECKSUM = "IT61X0542811101000000123456";
/** Anna Verdi, valid check character. */
const HOLDER_CF = "VRDNNA90A41F205M";
const TODAY = "2026-10-15";
const DOC = {
  document_type: "carta_identita" as const,
  document_number: "ca 12345 ab",
  document_expiry: "2030-05-31",
  document_issuer: "Comune di Milano",
};

/** Schema + business rules of POST /api/lead/complete, as the handler runs them. */
function complete(overrides: Record<string, unknown>) {
  const body = { data: { ...completeData(), ...overrides } };
  const parsed = completeBodySchema.safeParse(body);
  if (!parsed.success) return { fields: zodFieldErrors(parsed.error, body), data: null };
  return checkCompletion(parsed.data.data, TODAY);
}

describe("IBAN (complete)", () => {
  it("normalises a valid IBAN; holder fields dropped when the holder is not different", () => {
    const r = complete({
      iban: "it60 x054 2811 1010 0000 0123 456",
      iban_holder_first_name: "Anna",
      iban_holder_last_name: "Verdi",
      iban_holder_tax_code: HOLDER_CF,
    });
    expect(r.fields).toEqual({});
    expect(r.data).toMatchObject({
      iban: IBAN,
      iban_holder_different: false,
      iban_holder_first_name: null,
      iban_holder_last_name: null,
      iban_holder_tax_code: null,
    });
  });

  it.each([
    [IBAN_BAD_CHECKSUM, "checksum"],
    ["IT60X05428111010000001234", "length"],
    ["XX60X0542811101000000123456", "country"],
    ["60IT0542811101000000123456", "format"],
  ])("rejects %s with %s", (iban, code) => {
    expect(complete({ iban }).fields).toEqual({ iban: code });
  });

  it("blank / absent IBAN is stored as null and clears every holder field", () => {
    for (const iban of ["", "   ", null, undefined]) {
      const r = complete({ iban, iban_holder_different: true, iban_holder_first_name: "Anna" });
      expect(r.fields).toEqual({});
      expect(r.data).toMatchObject({
        iban: null,
        iban_holder_different: null,
        iban_holder_first_name: null,
        iban_holder_last_name: null,
        iban_holder_tax_code: null,
      });
    }
  });

  it("different holder: name, surname and tax code required", () => {
    expect(complete({ iban: IBAN, iban_holder_different: true }).fields).toEqual({
      iban_holder_first_name: "required",
      iban_holder_last_name: "required",
      iban_holder_tax_code: "required",
    });
  });

  it("different holder: tax code must match the holder's name (not the lead holder's)", () => {
    const holder = { iban: IBAN, iban_holder_different: true };
    expect(
      complete({ ...holder, iban_holder_first_name: "Anna", iban_holder_last_name: "Rossi", iban_holder_tax_code: HOLDER_CF })
        .fields,
    ).toEqual({ iban_holder_tax_code: "surname_mismatch" });
    expect(
      complete({ ...holder, iban_holder_first_name: "Maria", iban_holder_last_name: "Verdi", iban_holder_tax_code: HOLDER_CF })
        .fields,
    ).toEqual({ iban_holder_tax_code: "name_mismatch" });
    expect(
      complete({ ...holder, iban_holder_first_name: "Anna", iban_holder_last_name: "Verdi", iban_holder_tax_code: "VRDNNA90A41F205X" })
        .fields,
    ).toEqual({ iban_holder_tax_code: "checksum" });

    const ok = complete({
      ...holder,
      iban_holder_first_name: " Anna ",
      iban_holder_last_name: "Verdi",
      iban_holder_tax_code: HOLDER_CF.toLowerCase(),
    });
    expect(ok.fields).toEqual({});
    expect(ok.data).toMatchObject({
      iban_holder_different: true,
      iban_holder_first_name: "Anna",
      iban_holder_last_name: "Verdi",
      iban_holder_tax_code: HOLDER_CF,
    });
  });
});

describe("identity document data (complete)", () => {
  it("accepts all four fields and normalises the number", () => {
    const r = complete(DOC);
    expect(r.fields).toEqual({});
    expect(r.data).toMatchObject({ ...DOC, document_number: "CA12345AB" });
  });

  it("none given → all null", () => {
    const r = complete({ document_number: "  " });
    expect(r.fields).toEqual({});
    expect(r.data).toMatchObject({
      document_type: null,
      document_number: null,
      document_expiry: null,
      document_issuer: null,
    });
  });

  it("all-or-nothing: the missing ones are required", () => {
    expect(complete({ document_number: "AB12345" }).fields).toEqual({
      document_type: "required",
      document_expiry: "required",
      document_issuer: "required",
    });
  });

  it("expiry today is fine, yesterday is past", () => {
    expect(complete({ ...DOC, document_expiry: TODAY }).fields).toEqual({});
    expect(complete({ ...DOC, document_expiry: "2026-10-14" }).fields).toEqual({ document_expiry: "past" });
  });

  it.each([
    [{ document_type: "tessera" }, "document_type", "invalid"],
    [{ document_number: "AB12" }, "document_number", "format"],
    [{ document_number: "A".repeat(21) }, "document_number", "format"],
    [{ document_number: "AB/12345" }, "document_number", "format"],
    [{ document_expiry: "2030-02-30" }, "document_expiry", "invalid"],
    [{ document_expiry: "31/05/2030" }, "document_expiry", "invalid"],
    [{ document_expiry: "2101-01-01" }, "document_expiry", "invalid"],
    [{ document_issuer: "X" }, "document_issuer", "invalid"],
    [{ document_issuer: "x".repeat(81) }, "document_issuer", "invalid"],
  ])("rejects %j", (patch, key, code) => {
    expect(complete({ ...DOC, ...patch }).fields).toEqual({ [key]: code });
  });
});

describe("POD / PDR server-side normalisation", () => {
  it("strips spaces/dots and upper-cases before validating", () => {
    const r = complete({ pod: "it 001.e12345678" });
    expect(r.fields).toEqual({});
    expect(r.data?.pod).toBe("IT001E12345678");
    const g = complete({
      commodity: "gas",
      chosen_offer_luce: undefined,
      current_supplier_gas: "enel-energia",
      chosen_offer_gas: "offer-plenitude-gas-fisso-12",
      gas_uses: ["cucina"],
      pdr: "1234 5678.9012 34",
    });
    expect(g.fields).toEqual({});
    expect(g.data?.pdr).toBe("12345678901234");
  });

  it("returns the cross-detection codes", () => {
    expect(complete({ pod: "1234 5678 9012 34" }).fields).toEqual({ pod: "looksLikePdr" });
    expect(complete({ commodity: "dual", pdr: "IT001E12345678" }).fields).toMatchObject({ pdr: "looksLikePod" });
  });
});

describe("PATCH /api/lead activation fields", () => {
  it("accepts and normalises the new fields; unknown keys still rejected", () => {
    const r = patchBodySchema.safeParse({ data: { iban: "it60 x054 2811 1010 0000 0123 456", ...DOC } });
    expect(r.success).toBe(true);
    expect(r.data?.data).toMatchObject({ iban: IBAN, document_number: "CA12345AB" });
    const bad = { data: { iban: IBAN_BAD_CHECKSUM, iban_bank: "x" } };
    const e = patchBodySchema.safeParse(bad);
    expect(zodFieldErrors(e.error!, bad)).toEqual({ iban: "checksum", iban_bank: "unknown_field" });
  });

  it("clearing the IBAN / unticking the box clears the holder fields; past expiry rejected", () => {
    expect(checkPatchActivation({ iban: null }, TODAY).data).toEqual({
      iban: null,
      iban_holder_different: null,
      iban_holder_first_name: null,
      iban_holder_last_name: null,
      iban_holder_tax_code: null,
    });
    expect(checkPatchActivation({ iban_holder_different: false }, TODAY).data).toMatchObject({
      iban_holder_tax_code: null,
    });
    expect(checkPatchActivation({ document_expiry: "2020-01-01" }, TODAY).fields).toEqual({
      document_expiry: "past",
    });
  });
});

describe("italianToday", () => {
  it("uses the Europe/Rome calendar day", () => {
    expect(italianToday(new Date("2026-10-14T22:30:00Z"))).toBe("2026-10-15");
    expect(italianToday(new Date("2026-10-15T10:00:00Z"))).toBe("2026-10-15");
  });
});

describe("handlers (mock repository)", () => {
  let repo: Repository;
  let handlers: LeadHandlers;
  const URL_BASE = "http://localhost:3000";

  beforeEach(() => {
    repo = createMockRepository();
    handlers = createLeadHandlers({
      getRepository: () => repo,
      notify: vi.fn(async () => {}),
      limiters: createRateLimiters(),
      isProduction: false,
      now: () => new Date("2026-10-15T10:00:00.000Z"),
    });
  });

  const json = (method: string, path: string, body: unknown, cookie?: string) =>
    new Request(`${URL_BASE}${path}`, {
      method,
      headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
      body: JSON.stringify(body),
    });

  async function cookie() {
    const res = await handlers.create(json("POST", "/api/lead", { data: page1Data() }));
    const token = res.headers.getSetCookie()[0].split(";")[0].split("=")[1];
    return `${LEAD_COOKIE}=${token}; ${LEAD_STEP_COOKIE}=page1`;
  }

  it("complete stores IBAN, different holder and document data", async () => {
    const c = await cookie();
    const res = await handlers.complete(
      json(
        "POST",
        "/api/lead/complete",
        {
          data: completeData({
            iban: IBAN,
            iban_holder_different: true,
            iban_holder_first_name: "Anna",
            iban_holder_last_name: "Verdi",
            iban_holder_tax_code: HOLDER_CF,
            ...DOC,
          }),
        },
        c,
      ),
    );
    expect(res.status).toBe(200);
    const [lead] = await repo.listLeads();
    expect(lead).toMatchObject({
      tax_code: VALID_CF,
      iban: IBAN,
      iban_holder_different: true,
      iban_holder_tax_code: HOLDER_CF,
      document_type: "carta_identita",
      document_number: "CA12345AB",
      document_expiry: "2030-05-31",
      document_issuer: "Comune di Milano",
    });
  });

  it("complete returns field codes in the usual { fields } shape", async () => {
    const c = await cookie();
    const res = await handlers.complete(
      json("POST", "/api/lead/complete", { data: completeData({ iban: IBAN_BAD_CHECKSUM, pod: "12345678901234" }) }, c),
    );
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({
      ok: false,
      error: "validation",
      fields: { iban: "checksum", pod: "looksLikePdr" },
    });
  });

  it("PATCH rejects a past document expiry (handler clock)", async () => {
    const c = await cookie();
    const res = await handlers.update(json("PATCH", "/api/lead", { data: { document_expiry: "2026-10-14" } }, c));
    expect(res.status).toBe(422);
    expect((await res.json()).fields).toEqual({ document_expiry: "past" });
  });
});

describe("flow state (activation extras)", () => {
  it("old saved state without the Phase 12 fields loads with defaults", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    } as unknown as Storage;
    store.set(
      FLOW_STORAGE_KEY,
      JSON.stringify({ ...INITIAL_FLOW_STATE, activation: { taxCode: VALID_CF, pod: "IT001E12345678" } }),
    );
    const s = loadFlowState(storage);
    expect(s.activation).toMatchObject({ taxCode: VALID_CF, iban: "", ibanHolderDifferent: false, documents: [] });
  });

  it("toLeadCompleteData sends IBAN/holder/document only when given", () => {
    const base = applyFlowPatch(INITIAL_FLOW_STATE, { commodity: "luce", customerType: "casa" });
    const none = toLeadCompleteData(base);
    expect(none).not.toHaveProperty("iban");
    expect(none).not.toHaveProperty("iban_holder_different");
    expect(none).not.toHaveProperty("document_type");

    const noIban = toLeadCompleteData(
      applyFlowPatch(base, { activation: { ibanHolderDifferent: true, ibanHolderFirstName: "Anna" } }),
    );
    expect(noIban).not.toHaveProperty("iban_holder_first_name");

    const notDifferent = toLeadCompleteData(
      applyFlowPatch(base, { activation: { iban: ` ${IBAN} `, ibanHolderFirstName: "Anna" } }),
    );
    expect(notDifferent).toMatchObject({ iban: IBAN, iban_holder_different: false });
    expect(notDifferent).not.toHaveProperty("iban_holder_first_name");

    const full = toLeadCompleteData(
      applyFlowPatch(base, {
        activation: {
          iban: IBAN,
          ibanHolderDifferent: true,
          ibanHolderFirstName: "Anna",
          ibanHolderLastName: "Verdi",
          ibanHolderTaxCode: HOLDER_CF,
          documentType: "patente",
          documentNumber: "U1A123456B",
          documentExpiry: "2031-01-01",
          documentIssuer: "MCTC",
        },
      }),
    );
    expect(full).toMatchObject({
      iban_holder_different: true,
      iban_holder_first_name: "Anna",
      iban_holder_last_name: "Verdi",
      iban_holder_tax_code: HOLDER_CF,
      document_type: "patente",
      document_number: "U1A123456B",
      document_expiry: "2031-01-01",
      document_issuer: "MCTC",
    });
  });
});
