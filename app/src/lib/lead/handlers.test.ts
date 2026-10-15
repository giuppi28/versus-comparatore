// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRepository, type Repository } from "@/lib/data";
import { LEAD_COOKIE, LEAD_STEP_COOKIE } from "./api-types";
import { createLeadHandlers, createRateLimiters, MAX_BODY_BYTES, type LeadHandlers } from "./handlers";
import type { NewLeadNotification } from "./notify";
import { SlidingWindowRateLimiter } from "./rate-limit";
import {
  completeData,
  GAS_OFFER_ID,
  page1Data,
  VALID_PDR,
  VALID_PIVA,
} from "./test-fixtures";

const URL_BASE = "http://localhost:3000";

let repo: Repository;
let handlers: LeadHandlers;
let notify: ReturnType<typeof vi.fn<(l: NewLeadNotification) => Promise<void>>>;

function setup(opts: { isProduction?: boolean; limiters?: ReturnType<typeof createRateLimiters> } = {}) {
  repo = createMockRepository();
  notify = vi.fn<(l: NewLeadNotification) => Promise<void>>(async () => {});
  handlers = createLeadHandlers({
    getRepository: () => repo,
    notify,
    limiters: opts.limiters ?? createRateLimiters(),
    isProduction: opts.isProduction ?? false,
    now: () => new Date("2026-10-15T10:00:00.000Z"),
  });
}

function req(
  method: string,
  path: string,
  body?: unknown,
  opts: { cookie?: string; headers?: Record<string, string>; raw?: string } = {},
): Request {
  const headers: Record<string, string> = { ...opts.headers };
  if (body !== undefined || opts.raw !== undefined) headers["content-type"] ??= "application/json";
  if (opts.cookie) headers.cookie = opts.cookie;
  return new Request(`${URL_BASE}${path}`, {
    method,
    headers,
    body: opts.raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
}

/** name → { value, attrs } from Set-Cookie headers. */
function setCookies(res: Response) {
  const out: Record<string, { value: string; raw: string }> = {};
  for (const line of res.headers.getSetCookie()) {
    const [pair] = line.split(";");
    const eq = pair.indexOf("=");
    out[pair.slice(0, eq)] = { value: decodeURIComponent(pair.slice(eq + 1)), raw: line };
  }
  return out;
}

async function createAndGetCookie(data = page1Data()): Promise<string> {
  const res = await handlers.create(req("POST", "/api/lead", { data }));
  expect(res.status).toBe(201);
  const token = setCookies(res)[LEAD_COOKIE].value;
  return `${LEAD_COOKIE}=${token}; ${LEAD_STEP_COOKIE}=page1`;
}

async function onlyLead() {
  const leads = await repo.listLeads();
  expect(leads).toHaveLength(1);
  return leads[0];
}

beforeEach(() => setup());

describe("POST /api/lead (create)", () => {
  it("creates the lead, sets an httpOnly SameSite=Lax cookie and never returns the token", async () => {
    const res = await handlers.create(req("POST", "/api/lead", { data: page1Data() }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ ok: true });

    const lead = await onlyLead();
    expect(JSON.stringify(body)).not.toContain(lead.token);
    const cookies = setCookies(res);
    expect(cookies[LEAD_COOKIE].value).toBe(lead.token);
    expect(cookies[LEAD_COOKIE].raw).toMatch(/HttpOnly/i);
    expect(cookies[LEAD_COOKIE].raw).toMatch(/SameSite=Lax/i);
    expect(cookies[LEAD_COOKIE].raw).toMatch(/Path=\//);
    expect(cookies[LEAD_COOKIE].raw).not.toMatch(/Secure/i);
    expect(cookies[LEAD_STEP_COOKIE].value).toBe("page1");
    expect(res.headers.get("cache-control")).toBe("no-store");

    expect(lead).toMatchObject({
      step_reached: "page1",
      status: "new",
      privacy_consent: true,
      first_name: "Mario",
      phone: "3331234567", // normalised by validatePhone
    });
  });

  it("sets the Secure flag in production", async () => {
    setup({ isProduction: true });
    const res = await handlers.create(req("POST", "/api/lead", { data: page1Data() }));
    expect(setCookies(res)[LEAD_COOKIE].raw).toMatch(/Secure/i);
  });

  it.each([
    ["missing", (() => {
      const { privacy_consent: _p, ...d } = page1Data();
      void _p;
      return d;
    })()],
    ["false", { ...page1Data(), privacy_consent: false }],
    ["string 'true'", { ...page1Data(), privacy_consent: "true" }],
  ])("rejects privacy_consent %s with 400 and stores nothing", async (_label, data) => {
    const res = await handlers.create(req("POST", "/api/lead", { data }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "privacy_consent_required" });
    expect(await repo.listLeads()).toHaveLength(0);
    expect(setCookies(res)[LEAD_COOKIE]).toBeUndefined();
  });

  it("rejects unknown keys and server-managed columns (422 unknown_field)", async () => {
    const res = await handlers.create(
      req("POST", "/api/lead", {
        data: { ...page1Data(), status: "closed", notes: "x", token: "t", step_reached: "completed" },
      }),
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe("validation");
    expect(body.fields).toMatchObject({
      status: "unknown_field",
      notes: "unknown_field",
      token: "unknown_field",
      step_reached: "unknown_field",
    });
    expect(await repo.listLeads()).toHaveLength(0);
  });

  it("validates phone with the shared validator (422 format)", async () => {
    const res = await handlers.create(
      req("POST", "/api/lead", { data: page1Data({ phone: "0612345678" }) }),
    );
    expect(res.status).toBe(422);
    expect((await res.json()).fields).toEqual({ phone: "format" });
  });

  it("rejects unknown top-level body keys (422) without creating a lead", async () => {
    const res = await handlers.create(req("POST", "/api/lead", { data: page1Data(), token: "x" }));
    expect(res.status).toBe(422);
    expect((await res.json()).fields).toEqual({ token: "unknown_field" });
    expect(await repo.listLeads()).toHaveLength(0);
  });

  it("re-submitting with a valid cookie updates the same lead (no duplicate)", async () => {
    const cookie = await createAndGetCookie();
    const res = await handlers.create(
      req("POST", "/api/lead", { data: page1Data({ first_name: "Luigi" }) }, { cookie }),
    );
    expect(res.status).toBe(200);
    const lead = await onlyLead();
    expect(lead.first_name).toBe("Luigi");
  });

  it("a stale cookie creates a new lead", async () => {
    const res = await handlers.create(
      req("POST", "/api/lead", { data: page1Data() }, { cookie: `${LEAD_COOKIE}=stale` }),
    );
    expect(res.status).toBe(201);
    const lead = await onlyLead();
    expect(setCookies(res)[LEAD_COOKIE].value).toBe(lead.token);
  });

  it("rejects bad bodies", async () => {
    const notJson = await handlers.create(req("POST", "/api/lead", undefined, { raw: "{nope" }));
    expect(notJson.status).toBe(400);
    expect((await notJson.json()).error).toBe("invalid_body");

    const wrongType = await handlers.create(
      req("POST", "/api/lead", undefined, { raw: "{}", headers: { "content-type": "text/plain" } }),
    );
    expect(wrongType.status).toBe(400);

    const arr = await handlers.create(req("POST", "/api/lead", [1]));
    expect(arr.status).toBe(400);

    const big = await handlers.create(
      req("POST", "/api/lead", { data: page1Data({ first_name: "a".repeat(MAX_BODY_BYTES) }) }),
    );
    expect(big.status).toBe(413);
  });

  it("rejects cross-origin requests", async () => {
    const res = await handlers.create(
      req("POST", "/api/lead", { data: page1Data() }, {
        headers: { origin: "https://evil.example", host: "localhost:3000" },
      }),
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("forbidden_origin");

    const same = await handlers.create(
      req("POST", "/api/lead", { data: page1Data() }, {
        headers: { origin: "http://localhost:3000", host: "localhost:3000" },
      }),
    );
    expect(same.status).toBe(201);
  });

  it("rate limits per IP with 429 + Retry-After", async () => {
    const limiters = createRateLimiters();
    limiters.create = new SlidingWindowRateLimiter({ limit: 2, windowMs: 60_000 });
    setup({ limiters });
    const send = (ip: string) =>
      handlers.create(
        req("POST", "/api/lead", { data: page1Data() }, { headers: { "x-real-ip": ip } }),
      );
    expect((await send("1.1.1.1")).status).toBe(201);
    expect((await send("1.1.1.1")).status).toBe(201);
    const limited = await send("1.1.1.1");
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({ ok: false, error: "rate_limited" });
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
    expect((await send("2.2.2.2")).status).toBe(201);
  });

  it("a rotating cf-connecting-ip header does not bypass the rate limit", async () => {
    const limiters = createRateLimiters();
    limiters.create = new SlidingWindowRateLimiter({ limit: 2, windowMs: 60_000 });
    setup({ limiters });
    const send = (spoofed: string) =>
      handlers.create(
        req("POST", "/api/lead", { data: page1Data() }, {
          headers: { "x-real-ip": "5.5.5.5", "cf-connecting-ip": spoofed },
        }),
      );
    expect((await send("1.0.0.1")).status).toBe(201);
    expect((await send("1.0.0.2")).status).toBe(201);
    expect((await send("1.0.0.3")).status).toBe(429);
  });

  it("maps unexpected repository errors to 500 without leaking details", async () => {
    vi.spyOn(repo, "createLead").mockRejectedValueOnce(new Error("db down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await handlers.create(req("POST", "/api/lead", { data: page1Data() }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "server_error" });
    spy.mockRestore();
  });
});

describe("PATCH /api/lead (update)", () => {
  it("without the cookie → 401 no_lead", async () => {
    const res = await handlers.update(req("PATCH", "/api/lead", { data: { first_name: "X" } }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, error: "no_lead" });
  });

  it("with an unknown token → 404 and the cookies are expired", async () => {
    const res = await handlers.update(
      req("PATCH", "/api/lead", { data: { first_name: "X" } }, { cookie: `${LEAD_COOKIE}=nope` }),
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ ok: false, error: "lead_not_found" });
    expect(setCookies(res)[LEAD_COOKIE].raw).toMatch(/Max-Age=0/);
  });

  it("updates whitelisted fields of the own lead", async () => {
    const cookie = await createAndGetCookie();
    const res = await handlers.update(
      req("PATCH", "/api/lead", { data: { final_kwh_month: 150, chosen_offer_luce: "offer-x" } }, { cookie }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(await onlyLead()).toMatchObject({ final_kwh_month: 150, chosen_offer_luce: "offer-x" });
  });

  it.each(["status", "notes", "token", "id", "privacy_consent", "created_at"])(
    "cannot change %s (422 unknown_field)",
    async (key) => {
      const cookie = await createAndGetCookie();
      const res = await handlers.update(req("PATCH", "/api/lead", { data: { [key]: "closed" } }, { cookie }));
      expect(res.status).toBe(422);
      expect((await res.json()).fields).toEqual({ [key]: "unknown_field" });
      const lead = await onlyLead();
      expect(lead.status).toBe("new");
      expect(lead.notes).toBeNull();
    },
  );

  it("cannot set step_reached to completed or page1", async () => {
    const cookie = await createAndGetCookie();
    for (const step of ["completed", "page1"]) {
      const res = await handlers.update(req("PATCH", "/api/lead", { data: { step_reached: step } }, { cookie }));
      expect(res.status).toBe(422);
      expect((await res.json()).fields).toEqual({ step_reached: "invalid" });
    }
    expect((await onlyLead()).step_reached).toBe("page1");
  });

  it("step_reached only moves forward; a backward step is ignored, the rest is saved", async () => {
    const base = await createAndGetCookie();
    const token = base.split(";")[0];

    const r1 = await handlers.update(req("PATCH", "/api/lead", { data: { step_reached: "results" } }, { cookie: base }));
    expect(setCookies(r1)[LEAD_STEP_COOKIE].value).toBe("results");
    expect((await onlyLead()).step_reached).toBe("results");

    const atResults = `${token}; ${LEAD_STEP_COOKIE}=results`;
    const r2 = await handlers.update(
      req("PATCH", "/api/lead", { data: { step_reached: "offer_chosen" } }, { cookie: atResults }),
    );
    expect(setCookies(r2)[LEAD_STEP_COOKIE].value).toBe("offer_chosen");
    expect((await onlyLead()).step_reached).toBe("offer_chosen");

    const atOffer = `${token}; ${LEAD_STEP_COOKIE}=offer_chosen`;
    const r3 = await handlers.update(
      req("PATCH", "/api/lead", { data: { step_reached: "results", final_kwh_month: 99 } }, { cookie: atOffer }),
    );
    expect(r3.status).toBe(200);
    expect(setCookies(r3)[LEAD_STEP_COOKIE]).toBeUndefined();
    expect(await onlyLead()).toMatchObject({ step_reached: "offer_chosen", final_kwh_month: 99 });
  });

  it("validates formats (POD) with the shared validators", async () => {
    const cookie = await createAndGetCookie();
    const res = await handlers.update(req("PATCH", "/api/lead", { data: { pod: "FR001E12345678" } }, { cookie }));
    expect(res.status).toBe(422);
    expect((await res.json()).fields).toEqual({ pod: "prefix" });
  });
});

describe("POST /api/lead/complete", () => {
  async function complete(data: unknown, cookie?: string) {
    return handlers.complete(req("POST", "/api/lead/complete", { data }, { cookie }));
  }

  it("happy path: completed + status new, notification sent, cookies expired", async () => {
    const cookie = await createAndGetCookie();
    const res = await complete(completeData({ pod: "IT001E123456789" }), cookie);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const lead = await onlyLead();
    expect(lead).toMatchObject({
      step_reached: "completed",
      status: "new",
      tax_code: "RSSMRA85T10A562S",
      pod: "IT001E12345678", // 15 chars accepted, stored as 14
      voltage: 220,
      privacy_consent: true,
    });
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0]).toMatchObject({ id: lead.id, completedAt: "2026-10-15T10:00:00.000Z" });

    const cookies = setCookies(res);
    expect(cookies[LEAD_COOKIE].raw).toMatch(/Max-Age=0/);
    expect(cookies[LEAD_STEP_COOKIE].raw).toMatch(/Max-Age=0/);
  });

  it("without the cookie → 401", async () => {
    const res = await complete(completeData());
    expect(res.status).toBe(401);
  });

  it("with an unknown token → 404", async () => {
    const res = await complete(completeData(), `${LEAD_COOKIE}=nope`);
    expect(res.status).toBe(404);
  });

  it("invalid CF → 422 (checksum)", async () => {
    const cookie = await createAndGetCookie();
    const res = await complete(completeData({ tax_code: "RSSMRA85T10A562X" }), cookie);
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ ok: false, error: "validation", fields: { tax_code: "checksum" } });
    expect((await onlyLead()).step_reached).toBe("page1");
    expect(notify).not.toHaveBeenCalled();
  });

  it("CF not matching the name → 422 surname_mismatch / name_mismatch", async () => {
    const cookie = await createAndGetCookie();
    const r1 = await complete(completeData({ last_name: "Bianchi" }), cookie);
    expect((await r1.json()).fields).toEqual({ tax_code: "surname_mismatch" });
    const r2 = await complete(completeData({ first_name: "Luigi" }), cookie);
    expect((await r2.json()).fields).toEqual({ tax_code: "name_mismatch" });
  });

  it("reports every missing required field", async () => {
    const cookie = await createAndGetCookie();
    const res = await complete({ commodity: "dual", customer_type: "business", service_type: "voltura" }, cookie);
    expect(res.status).toBe(422);
    const { fields } = await res.json();
    for (const key of [
      "first_name", "last_name", "phone", "tax_code", "housing_title", "company_name", "vat_number",
      "comune_istat", "cap", "address", "street_number", "is_resident",
      "chosen_offer_luce", "current_supplier_luce", "pod", "power_kw", "voltage",
      "chosen_offer_gas", "current_supplier_gas", "pdr", "gas_uses",
    ]) {
      expect(fields[key], key).toBe("required");
    }
  });

  it("Partita IVA: validates the P.IVA checksum", async () => {
    const cookie = await createAndGetCookie();
    const res = await complete(
      completeData({ customer_type: "business", company_name: "Rossi Srl", vat_number: "12345678901" }),
      cookie,
    );
    expect((await res.json()).fields).toEqual({ vat_number: "checksum" });
    const ok = await complete(
      completeData({ customer_type: "business", company_name: "Rossi Srl", vat_number: VALID_PIVA }),
      cookie,
    );
    expect(ok.status).toBe(200);
    expect(await onlyLead()).toMatchObject({ vat_number: VALID_PIVA, company_name: "Rossi Srl" });
  });

  it("Casa: P.IVA / ragione sociale are dropped", async () => {
    const cookie = await createAndGetCookie();
    const res = await complete(completeData({ company_name: "X", vat_number: VALID_PIVA }), cookie);
    expect(res.status).toBe(200);
    expect(await onlyLead()).toMatchObject({ vat_number: null, company_name: null });
  });

  it("Primo allaccio: POD and current supplier not required (supplier cleared)", async () => {
    const cookie = await createAndGetCookie();
    const res = await complete(
      completeData({ service_type: "primo_allaccio", pod: undefined, current_supplier_luce: "enel-energia" }),
      cookie,
    );
    expect(res.status).toBe(200);
    expect(await onlyLead()).toMatchObject({ pod: null, current_supplier_luce: null, step_reached: "completed" });
  });

  it("Subentro: current supplier not required, POD required", async () => {
    const cookie = await createAndGetCookie();
    const res = await complete(
      completeData({ service_type: "subentro", current_supplier_luce: undefined, pod: undefined }),
      cookie,
    );
    expect((await res.json()).fields).toEqual({ pod: "required" });
  });

  it("Luce + Gas with has_gas = false: gas forced to primo allaccio (PDR not required)", async () => {
    const cookie = await createAndGetCookie();
    const res = await complete(
      completeData({
        commodity: "dual",
        has_gas: false,
        chosen_offer_gas: GAS_OFFER_ID,
        gas_uses: ["cucina"],
        current_supplier_gas: "eni-plenitude",
      }),
      cookie,
    );
    expect(res.status).toBe(200);
    expect(await onlyLead()).toMatchObject({ pdr: null, current_supplier_gas: null, current_supplier_luce: "enel-energia" });
  });

  it("Gas only: PDR validated, luce fields cleared", async () => {
    const cookie = await createAndGetCookie();
    const gasOnly = completeData({
      commodity: "gas",
      chosen_offer_luce: undefined,
      current_supplier_luce: undefined,
      pod: undefined,
      power_kw: undefined,
      voltage: undefined,
      chosen_offer_gas: GAS_OFFER_ID,
      current_supplier_gas: "enel-energia",
      has_gas: true,
      gas_uses: ["cucina", "riscaldamento"],
      sqm_range: "60_90",
    });
    const bad = await complete({ ...gasOnly, pdr: "1234" }, cookie);
    expect((await bad.json()).fields).toEqual({ pdr: "length" });
    const ok = await complete({ ...gasOnly, pdr: VALID_PDR, pod: "IT001E12345678" }, cookie);
    expect(ok.status).toBe(200);
    expect(await onlyLead()).toMatchObject({ pdr: VALID_PDR, pod: null, voltage: null, chosen_offer_luce: null });
  });

  it("power_kw: null (Altro) accepted, values outside the list rejected", async () => {
    const cookie = await createAndGetCookie();
    const bad = await complete(completeData({ power_kw: 7 }), cookie);
    expect((await bad.json()).fields).toEqual({ power_kw: "invalid" });
    const ok = await complete(completeData({ power_kw: null }), cookie);
    expect(ok.status).toBe(200);
  });

  it("rejects an inactive / unknown offer and an unknown comune", async () => {
    const cookie = await createAndGetCookie();
    const res = await complete(completeData({ chosen_offer_luce: GAS_OFFER_ID, comune_istat: "999999" }), cookie);
    expect(res.status).toBe(422);
    expect((await res.json()).fields).toEqual({ chosen_offer_luce: "not_available", comune_istat: "not_found" });
  });

  it("rejects status / notes / step_reached in the payload", async () => {
    const cookie = await createAndGetCookie();
    const res = await complete({ ...completeData(), status: "closed", notes: "x", step_reached: "completed" }, cookie);
    expect(res.status).toBe(422);
    expect((await res.json()).fields).toEqual({
      status: "unknown_field",
      notes: "unknown_field",
      step_reached: "unknown_field",
    });
  });

  it("rejects unknown top-level body keys (422) without completing the lead", async () => {
    const cookie = await createAndGetCookie();
    const res = await handlers.complete(
      req("POST", "/api/lead/complete", { data: completeData(), token: "x" }, { cookie }),
    );
    expect(res.status).toBe(422);
    expect((await res.json()).fields).toEqual({ token: "unknown_field" });
    expect((await onlyLead()).step_reached).toBe("page1");
    expect(notify).not.toHaveBeenCalled();
  });

  it("a failing notification does not fail the submit", async () => {
    notify.mockRejectedValueOnce(new Error("resend down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const cookie = await createAndGetCookie();
    const res = await complete(completeData(), cookie);
    expect(res.status).toBe(200);
    expect((await onlyLead()).step_reached).toBe("completed");
    spy.mockRestore();
  });
});

describe("DELETE /api/lead", () => {
  it("expires both cookies", async () => {
    const res = await handlers.clear(req("DELETE", "/api/lead", undefined, { cookie: `${LEAD_COOKIE}=x` }));
    expect(res.status).toBe(200);
    const cookies = setCookies(res);
    expect(cookies[LEAD_COOKIE].raw).toMatch(/Max-Age=0/);
    expect(cookies[LEAD_STEP_COOKIE].raw).toMatch(/Max-Age=0/);
  });
});

describe("route files", () => {
  it("export the HTTP methods bound to the handlers", async () => {
    const lead = await import("@/app/api/lead/route");
    const completeRoute = await import("@/app/api/lead/complete/route");
    expect(typeof lead.POST).toBe("function");
    expect(typeof lead.PATCH).toBe("function");
    expect(typeof lead.DELETE).toBe("function");
    expect(typeof completeRoute.POST).toBe("function");
    const res = await lead.PATCH(req("PATCH", "/api/lead", { data: {} }));
    expect(res.status).toBe(401);
  });
});
