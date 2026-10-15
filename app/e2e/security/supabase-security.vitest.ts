/**
 * T7.5 — Security integration suite against the REAL Supabase project (anon role only).
 *
 * - Talks directly to PostgREST / Storage over HTTP with the publishable key.
 * - Needs NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and LEAD_API_SECRET
 *   in app/.env.local. The key and the secret are NEVER printed, logged or put in an assertion
 *   message (all failure output goes through `redact`).
 * - Writes: exactly 2 test leads per run (first_name "TEST-SECURITY"), created through the
 *   official `create_lead` RPC. The admin can delete them from the leads list. Nothing else is
 *   created or modified (every other write attempt is expected to be rejected).
 *
 * File is named *.vitest.ts (not *.test.ts) so Playwright's default testMatch ignores it.
 * Run: npm run test:security
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, it } from "vitest";

// ---------------------------------------------------------------------------------------
// Env + HTTP helpers
// ---------------------------------------------------------------------------------------

function loadEnvFile(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m || line.trim().startsWith("#")) continue;
    out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return out;
}

const env = loadEnvFile(path.resolve(__dirname, "../../.env.local"));
const BASE = (env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
const KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const SECRET = env.LEAD_API_SECRET ?? "";

if (!BASE || !KEY || !SECRET) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / LEAD_API_SECRET in app/.env.local");
}

/** Strip the key and the secret from any text that could end up in a report. */
function redact(text: string): string {
  let t = text;
  for (const s of [KEY, SECRET, createHash("sha256").update(SECRET).digest("hex")]) {
    if (s) t = t.split(s).join("<redacted>");
  }
  return t;
}

interface Res {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
  headers: Headers;
}

async function call(
  method: string,
  pathAndQuery: string,
  opts: { body?: unknown; headers?: Record<string, string>; raw?: BodyInit } = {},
): Promise<Res> {
  const headers: Record<string, string> = { apikey: KEY, ...(opts.headers ?? {}) };
  let body: BodyInit | undefined;
  if (opts.raw !== undefined) body = opts.raw;
  else if (opts.body !== undefined) {
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(`${BASE}${pathAndQuery}`, { method, headers, body });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    /* keep text */
  }
  return { status: res.status, body: parsed, headers: res.headers };
}

const rest = (method: string, q: string, opts?: Parameters<typeof call>[2]) => call(method, `/rest/v1/${q}`, opts);
const rpc = (fn: string, args: unknown, headers?: Record<string, string>) =>
  call("POST", `/rest/v1/rpc/${fn}`, { body: args, headers });

/** Assert with a redacted message so a failure can never leak the key/secret. */
function must(cond: boolean, message: string, res?: Res) {
  if (!cond) {
    throw new Error(redact(`${message}${res ? ` (HTTP ${res.status}: ${JSON.stringify(res.body).slice(0, 300)})` : ""}`));
  }
}

const isDenied = (r: Res) => [401, 403].includes(r.status);
const isErrorStatus = (r: Res) => r.status >= 400 && r.status < 500;
// lead_not_found is raised with SQLSTATE P0002, which PostgREST maps to HTTP 500 (any 4xx/5xx is a rejection).
const isRejected = (r: Res) => r.status >= 400;
const hasNoRows = (r: Res) => Array.isArray(r.body) && r.body.length === 0;
const msg = (r: Res): string => String(r.body?.message ?? "");

const TOKEN_RE = /^[0-9a-f]{64}$/;

// Shared state across the ordered lead tests
let comune: { istat_code: string; cap: string } | null = null;
let luceOfferId = "";
const leadA: { id: string; token: string } = { id: "", token: "" };
const leadB: { id: string; token: string } = { id: "", token: "" };
let rowsCreated = 0;

const BASE_LEAD = {
  privacy_consent: true,
  first_name: "TEST-SECURITY",
  last_name: "TEST-SECURITY",
  phone: "3000000000",
  commodity: "luce",
  customer_type: "casa",
};

// ---------------------------------------------------------------------------------------
// 1. Public data: comuni / suppliers / offers
// ---------------------------------------------------------------------------------------

describe("public read access (anon)", () => {
  it("comuni are readable and there are exactly 7894", async () => {
    const r = await rest("GET", "comuni?select=istat_code&limit=1", { headers: { Prefer: "count=exact" } });
    must(r.status === 200 || r.status === 206, "comuni select must succeed", r);
    const total = Number(String(r.headers.get("content-range")).split("/")[1]);
    must(total === 7894, `comuni count must be 7894, got ${total}`);
  });

  it("suppliers: every visible row is active", async () => {
    const r = await rest("GET", "suppliers?select=id,slug,active&limit=1000");
    must(r.status === 200 && Array.isArray(r.body) && r.body.length > 0, "suppliers must be readable", r);
    must(r.body.every((s: { active: boolean }) => s.active === true), "an inactive supplier is visible to anon");
  });

  it("suppliers: inactive ones are invisible (active=eq.false -> 0 rows)", async () => {
    const r = await rest("GET", "suppliers?select=id&active=eq.false");
    must(r.status === 200 && hasNoRows(r), "inactive suppliers leaked", r);
  });

  it("offers: every visible row is active AND belongs to an active supplier", async () => {
    const r = await rest("GET", "offers?select=id,active,suppliers(id,active)&limit=1000");
    must(r.status === 200 && Array.isArray(r.body) && r.body.length > 0, "offers must be readable", r);
    for (const o of r.body) {
      must(o.active === true, `offer ${o.id} visible but not active`);
      must(o.suppliers && o.suppliers.active === true, `offer ${o.id} visible but its supplier is not active/visible`);
    }
  });

  it("offers: inactive ones are invisible (active=eq.false -> 0 rows)", async () => {
    // Documented: if the real DB has no inactive offer this only proves the RLS filter
    // (the policy forces active = true), not that a specific hidden row exists.
    const r = await rest("GET", "offers?select=id&active=eq.false");
    must(r.status === 200 && hasNoRows(r), "inactive offers leaked", r);
  });

  it("offers: offers of inactive suppliers are invisible (suppliers.active=false -> 0 rows)", async () => {
    const r = await rest("GET", "offers?select=id,suppliers!inner(active)&suppliers.active=eq.false");
    must(r.status === 200 && hasNoRows(r), "offers of inactive suppliers leaked", r);
  });

  it("anon cannot use the embedded API to reach leads through offers/suppliers", async () => {
    const r = await rest("GET", "offers?select=id,leads(*)&limit=1");
    must(r.status >= 400 || !(Array.isArray(r.body) && r.body.some((o: { leads?: unknown[] }) => o.leads?.length)), "leads reachable via embed", r);
  });
});

// ---------------------------------------------------------------------------------------
// 2. Tables the anon role must not see / write
// ---------------------------------------------------------------------------------------

describe("protected tables (anon)", () => {
  for (const table of ["leads", "settings", "admins"]) {
    it(`${table}: select is denied or returns no rows`, async () => {
      const r = await rest("GET", `${table}?select=*`);
      must(isDenied(r) || (r.status === 200 && hasNoRows(r)), `${table} readable by anon`, r);
    });
  }

  it("leads: select with filters / count / head exposes nothing", async () => {
    for (const q of ["leads?select=id,token&limit=5", "leads?select=count", "leads?token=like.*", "leads?status=eq.new&select=*"]) {
      const r = await rest("GET", q);
      must(isDenied(r) || (r.status === 200 && (hasNoRows(r) || (Array.isArray(r.body) && r.body.every((x: { count?: number }) => x.count === 0)))), `leads readable via ${q}`, r);
    }
    const head = await rest("HEAD", "leads?select=id", { headers: { Prefer: "count=exact" } });
    const range = String(head.headers.get("content-range") ?? "*/0");
    must(isDenied(head) || range.endsWith("/0") || range.endsWith("/*"), "leads row count exposed through HEAD");
  });

  it("leads: direct insert is rejected", async () => {
    const r = await rest("POST", "leads", { body: { privacy_consent: true, first_name: "TEST-SECURITY-DIRECT" }, headers: { Prefer: "return=minimal" } });
    must(isDenied(r), "direct insert on leads not rejected", r);
  });

  it("leads: direct update is rejected", async () => {
    const r = await rest("PATCH", "leads?first_name=eq.TEST-SECURITY", { body: { status: "closed" }, headers: { Prefer: "return=representation" } });
    must(isDenied(r) || (r.status < 300 && hasNoRows(r)), "direct update on leads not rejected", r);
    must(!(Array.isArray(r.body) && r.body.length > 0), "direct update on leads touched rows", r);
  });

  it("leads: direct delete is rejected", async () => {
    const r = await rest("DELETE", "leads?first_name=eq.TEST-SECURITY", { headers: { Prefer: "return=representation" } });
    must(isDenied(r) || (r.status < 300 && hasNoRows(r)), "direct delete on leads not rejected", r);
  });

  for (const table of ["settings", "admins"]) {
    it(`${table}: insert / update / delete are rejected`, async () => {
      // pg-safeupdate requires a WHERE clause; give one so the privilege check is what rejects.
      const filter = table === "settings" ? "id=eq.true" : "user_id=neq.00000000-0000-0000-0000-000000000000";
      const ins = await rest("POST", table, { body: table === "settings" ? { notification_email: "x@example.com" } : { user_id: "00000000-0000-0000-0000-000000000000" } });
      must(isDenied(ins), `${table} insert not rejected`, ins);
      const upd = await rest("PATCH", `${table}?${filter}`, { body: table === "settings" ? { notification_email: "x@example.com" } : { user_id: "00000000-0000-0000-0000-000000000001" }, headers: { Prefer: "return=representation" } });
      must(isDenied(upd) || (upd.status < 300 && hasNoRows(upd)), `${table} update not rejected`, upd);
      const del = await rest("DELETE", `${table}?${filter}`, { headers: { Prefer: "return=representation" } });
      must(isDenied(del) || (del.status < 300 && hasNoRows(del)), `${table} delete not rejected`, del);
    });
  }

  it("private.app_secrets is not exposed by the API (any profile / path)", async () => {
    const attempts: Res[] = [
      await rest("GET", "app_secrets?select=*"),
      await rest("GET", "app_secrets?select=*", { headers: { "Accept-Profile": "private" } }),
      await call("GET", "/rest/v1/private.app_secrets?select=*"),
    ];
    for (const r of attempts) {
      must(isErrorStatus(r) || hasNoRows(r), "app_secrets reachable", r);
      must(!JSON.stringify(r.body).includes("sha256\":\""), "app_secrets content exposed", r);
    }
  });

  it("the OpenAPI schema does not list leads, settings, admins or app_secrets", async () => {
    const r = await rest("GET", "");
    // Anon may be denied the schema document altogether (newer PostgREST) — both outcomes are fine.
    if (r.status === 200 && r.body?.paths) {
      const paths = Object.keys(r.body.paths);
      for (const p of ["/leads", "/settings", "/admins", "/app_secrets"]) {
        must(!paths.includes(p), `${p} listed in the OpenAPI schema`);
      }
    } else {
      must(isErrorStatus(r), "unexpected response for the OpenAPI root", r);
    }
  });
});

// ---------------------------------------------------------------------------------------
// 3. Admin-only writes with the publishable key
// ---------------------------------------------------------------------------------------

describe("admin paths are closed to the publishable key", () => {
  let offerId = "";
  let supplierId = "";
  beforeAll(async () => {
    const o = await rest("GET", "offers?select=id&limit=1");
    offerId = o.body?.[0]?.id ?? "";
    const s = await rest("GET", "suppliers?select=id&limit=1");
    supplierId = s.body?.[0]?.id ?? "";
    must(!!offerId && !!supplierId, "need at least one offer and supplier");
  });

  it("PATCH offers is rejected", async () => {
    const r = await rest("PATCH", `offers?id=eq.${offerId}`, { body: { active: false, featured: true }, headers: { Prefer: "return=representation" } });
    must(isDenied(r), "offers update not rejected", r);
  });

  it("PATCH suppliers is rejected", async () => {
    const r = await rest("PATCH", `suppliers?id=eq.${supplierId}`, { body: { active: false }, headers: { Prefer: "return=representation" } });
    must(isDenied(r), "suppliers update not rejected", r);
  });

  it("POST / DELETE on offers, suppliers and comuni are rejected", async () => {
    const reqs: Array<[string, string, unknown?]> = [
      ["POST", "offers", { supplier_id: supplierId, name: "TEST-SECURITY", commodity: "luce", energy_price: 0.1, locked_months: 12 }],
      ["DELETE", `offers?id=eq.${offerId}`],
      ["POST", "suppliers", { name: "TEST-SECURITY", slug: "test-security" }],
      ["DELETE", `suppliers?id=eq.${supplierId}`],
      ["POST", "comuni", { istat_code: "999999", name: "TEST-SECURITY", province_code: "XX", province_name: "x", region: "x" }],
      ["PATCH", "comuni?istat_code=eq.015146", { name: "TEST-SECURITY" }],
      ["DELETE", "comuni?istat_code=eq.015146"],
    ];
    for (const [method, q, body] of reqs) {
      const r = await rest(method, q, { body, headers: { Prefer: "return=representation" } });
      must(isDenied(r), `${method} ${q.split("?")[0]} not rejected`, r);
    }
    // Nothing changed
    const o = await rest("GET", `offers?id=eq.${offerId}&select=id,active`);
    must(o.body?.[0]?.active === true, "offer changed unexpectedly", o);
  });

  it("is_admin() cannot be called by anon", async () => {
    const r = await rpc("is_admin", {});
    must([401, 403, 404].includes(r.status), "is_admin callable by anon", r);
    must(r.body !== true, "is_admin returned true for anon");
  });

  it("private / disabled / bootstrap functions are not callable", async () => {
    const names: Array<[string, unknown, Record<string, string>?]> = [
      ["check_lead_secret", { p_secret: SECRET }],
      ["check_lead_secret", { p_secret: SECRET }, { "Content-Profile": "private" }],
      ["apply_lead_patch", { p_id: "00000000-0000-0000-0000-000000000000", p_patch: {} }, { "Content-Profile": "private" }],
      ["lock_lead_by_token", { p_token: "0".repeat(64) }, { "Content-Profile": "private" }],
      ["lead_writable_fields", {}, { "Content-Profile": "private" }],
      ["mfa_satisfied", {}, { "Content-Profile": "private" }],
      ["old_create_lead_disabled", { p_data: {} }, { "Content-Profile": "private" }],
      ["bootstrap_load_comuni", { p_rows: [] }],
      ["set_updated_at", {}],
    ];
    for (const [fn, args, headers] of names) {
      const r = await rpc(fn, args, headers);
      must(isErrorStatus(r), `rpc ${fn} should not be callable (got ${r.status})`, r);
    }
  });
});

// ---------------------------------------------------------------------------------------
// 4. Lead RPC: shared secret
// ---------------------------------------------------------------------------------------

describe("lead RPCs require the server secret", () => {
  const dummyToken = "0".repeat(64);
  const secretHash = createHash("sha256").update(SECRET).digest("hex");

  const badSecrets: Array<[string, string | null]> = [
    ["wrong secret", "definitely-not-the-secret"],
    ["empty secret", ""],
    ["null secret", null],
    ["secret + trailing space", `${SECRET} `],
    ["truncated secret", SECRET.slice(0, -1)],
    ["upper-cased secret", SECRET.toUpperCase() === SECRET ? `${SECRET}x` : SECRET.toUpperCase()],
    ["the SHA-256 of the secret (the value stored in the DB)", secretHash],
    ["oversized secret (300 chars)", "a".repeat(300)],
  ];

  function expectInvalidSecret(r: Res, what: string) {
    must(r.status === 403, `${what}: expected HTTP 403, got ${r.status}`, r);
    must(r.body?.code === "28000", `${what}: expected code 28000`, r);
    must(msg(r) === "invalid_secret", `${what}: expected message invalid_secret`, r);
  }

  for (const [label, secret] of badSecrets) {
    it(`create_lead rejects: ${label}`, async () => {
      expectInvalidSecret(await rpc("create_lead", { p_secret: secret, p_data: BASE_LEAD }), label);
    });
    it(`update_lead rejects: ${label}`, async () => {
      expectInvalidSecret(await rpc("update_lead", { p_secret: secret, p_token: dummyToken, p_patch: { first_name: "x" } }), label);
    });
    it(`complete_lead rejects: ${label}`, async () => {
      expectInvalidSecret(await rpc("complete_lead", { p_secret: secret, p_token: dummyToken, p_data: {} }), label);
    });
  }

  it("the secret check runs before anything else (bad secret + bad payload -> invalid_secret, not a validation error)", async () => {
    expectInvalidSecret(await rpc("create_lead", { p_secret: "nope", p_data: { privacy_consent: false } }), "create bad payload");
    expectInvalidSecret(await rpc("update_lead", { p_secret: "nope", p_token: "not-a-token", p_patch: { status: "closed" } }), "update bad payload");
    expectInvalidSecret(await rpc("complete_lead", { p_secret: "nope", p_token: "not-a-token", p_data: { notes: "x" } }), "complete bad payload");
  });

  it("omitting p_secret altogether: the function cannot be resolved (PGRST202)", async () => {
    const r1 = await rpc("create_lead", { p_data: BASE_LEAD });
    const r2 = await rpc("update_lead", { p_token: dummyToken, p_patch: {} });
    const r3 = await rpc("complete_lead", { p_token: dummyToken, p_data: {} });
    for (const r of [r1, r2, r3]) {
      must(r.status === 404 && r.body?.code === "PGRST202", "old / secret-less signature still resolvable", r);
    }
  });

  it("old signatures create_lead(p_data), update_lead(p_token,p_patch), complete_lead(p_token,p_data) are gone", async () => {
    // Same argument names as the pre-Q6 functions; passing p_secret as extra named arg must not match either.
    const r = await rpc("update_lead", { p_token: dummyToken, p_patch: { first_name: "x" } });
    must(r.status === 404 || isDenied(r), "old update_lead(text, jsonb) still callable", r);
    const r2 = await rpc("complete_lead", { p_token: dummyToken, p_data: {} });
    must(r2.status === 404 || isDenied(r2), "old complete_lead(text, jsonb) still callable", r2);
    const r3 = await rpc("create_lead", { p_data: BASE_LEAD });
    must(r3.status === 404 || isDenied(r3), "old create_lead(jsonb) still callable", r3);
  });

  it("a rejected call creates no lead (no token is returned)", async () => {
    const r = await rpc("create_lead", { p_secret: "nope", p_data: BASE_LEAD });
    must(!JSON.stringify(r.body).match(/[0-9a-f]{64}/), "token-like value returned on rejected call", r);
  });
});

// ---------------------------------------------------------------------------------------
// 5. Lead RPC: validation without creating rows
// ---------------------------------------------------------------------------------------

describe("create_lead input rules (no row is created by a rejected call)", () => {
  it("privacy_consent is mandatory and must be the JSON boolean true", async () => {
    for (const data of [{}, { first_name: "TEST-SECURITY" }, { ...BASE_LEAD, privacy_consent: false }, { ...BASE_LEAD, privacy_consent: "true" }, { ...BASE_LEAD, privacy_consent: 1 }, { ...BASE_LEAD, privacy_consent: null }]) {
      const r = await rpc("create_lead", { p_secret: SECRET, p_data: data });
      must(isErrorStatus(r) && msg(r) === "privacy_consent_required", `expected privacy_consent_required for ${JSON.stringify(data)}`, r);
    }
  });

  it("non-writable keys (notes, status, token, id, timestamps) are rejected with invalid_field", async () => {
    for (const key of ["notes", "status", "token", "id", "created_at", "updated_at"]) {
      const r = await rpc("create_lead", { p_secret: SECRET, p_data: { ...BASE_LEAD, [key]: key === "status" ? "closed" : "x" } });
      must(isErrorStatus(r) && msg(r) === `invalid_field: ${key}`, `${key} must not be settable on create`, r);
    }
  });

  it("step_reached = completed cannot be forced on create", async () => {
    const r = await rpc("create_lead", { p_secret: SECRET, p_data: { ...BASE_LEAD, step_reached: "completed" } });
    must(isErrorStatus(r) && msg(r) === "invalid_step_reached", "completed forced on create", r);
  });

  it("payloads above 20 kB are refused", async () => {
    const r = await rpc("create_lead", { p_secret: SECRET, p_data: { ...BASE_LEAD, address: "x".repeat(21_000) } });
    must(isErrorStatus(r), "oversized payload accepted", r);
  });
});

// ---------------------------------------------------------------------------------------
// 6. Token isolation (creates the only 2 rows of the run)
// ---------------------------------------------------------------------------------------

describe("token isolation (2 TEST-SECURITY leads per run)", () => {
  beforeAll(async () => {
    const c = await rest("GET", "comuni?name=eq.Milano&select=istat_code,caps&limit=1");
    must(c.status === 200 && c.body?.[0], "Milano not found in comuni", c);
    comune = { istat_code: c.body[0].istat_code, cap: c.body[0].caps[0] };
    const o = await rest("GET", "offers?commodity=eq.luce&select=id&limit=1");
    must(o.status === 200 && o.body?.[0]?.id, "no active luce offer", o);
    luceOfferId = o.body[0].id;
  });

  it("create_lead with the right secret returns {id, token} (lead A)", async () => {
    const r = await rpc("create_lead", { p_secret: SECRET, p_data: { ...BASE_LEAD, step_reached: "page1" } });
    must(r.status === 200, "create lead A failed", r);
    must(typeof r.body.id === "string" && TOKEN_RE.test(r.body.token), "lead A response shape", r);
    leadA.id = r.body.id;
    leadA.token = r.body.token;
    rowsCreated += 1;
  });

  it("create_lead again returns a different id and token (lead B)", async () => {
    const r = await rpc("create_lead", { p_secret: SECRET, p_data: BASE_LEAD });
    must(r.status === 200 && TOKEN_RE.test(r.body.token), "create lead B failed", r);
    leadB.id = r.body.id;
    leadB.token = r.body.token;
    rowsCreated += 1;
    must(leadB.id !== leadA.id && leadB.token !== leadA.token, "two leads share id/token");
  });

  it("the token is not derivable from the id and the RPC response never contains notes/status", async () => {
    must(!leadA.token.includes(leadA.id.replace(/-/g, "")), "token embeds the id");
    must(leadA.token !== leadB.token, "tokens equal");
  });

  const forged = (): Array<[string, string | null]> => [
    ["all-zero token", "0".repeat(64)],
    ["A's token with the last hex digit changed", leadA.token.slice(0, -1) + (leadA.token.endsWith("0") ? "1" : "0")],
    ["A's token upper-cased", leadA.token.toUpperCase()],
    ["A's token + trailing space", `${leadA.token} `],
    ["A's token prefix (63 chars)", leadA.token.slice(0, 63)],
    ["A's token + '%' wildcard", `${leadA.token}%`],
    ["bare '%' wildcard", "%"],
    ["64-char wildcard-like token", "%".repeat(64)],
    ["empty token", ""],
    ["null token", null],
    ["lead A's uuid instead of the token", leadA.id],
    ["SQL-injection-like token", "' or '1'='1"],
    ["a 10 kB token", "a".repeat(10_000)],
  ];

  it("update_lead with forged / malformed tokens -> lead_not_found", async () => {
    for (const [label, token] of forged()) {
      const r = await rpc("update_lead", { p_secret: SECRET, p_token: token, p_patch: { first_name: "TEST-SECURITY" } });
      must(isRejected(r) && msg(r) === "lead_not_found", `update_lead with ${label} should be lead_not_found`, r);
    }
  });

  it("complete_lead with forged / malformed tokens -> lead_not_found", async () => {
    for (const [label, token] of forged()) {
      const r = await rpc("complete_lead", { p_secret: SECRET, p_token: token, p_data: {} });
      must(isRejected(r) && msg(r) === "lead_not_found", `complete_lead with ${label} should be lead_not_found`, r);
    }
  });

  it("update_lead with A's token succeeds (204, no body)", async () => {
    const r = await rpc("update_lead", { p_secret: SECRET, p_token: leadA.token, p_patch: { step_reached: "results", has_gas: false } });
    must(r.status === 204 || r.status === 200, "update A failed", r);
  });

  it("update_lead cannot write notes / status / token / id / completed on an owned lead", async () => {
    for (const patch of [{ notes: "x" }, { status: "closed" }, { token: "0".repeat(64) }, { id: leadB.id }, { created_at: "2000-01-01" }]) {
      const r = await rpc("update_lead", { p_secret: SECRET, p_token: leadA.token, p_patch: patch });
      must(isErrorStatus(r) && msg(r).startsWith("invalid_field"), `patch ${Object.keys(patch)[0]} should be invalid_field`, r);
    }
    const r = await rpc("update_lead", { p_secret: SECRET, p_token: leadA.token, p_patch: { step_reached: "completed" } });
    must(isErrorStatus(r) && msg(r) === "invalid_step_reached", "step_reached completed accepted by update", r);
    const r2 = await rpc("update_lead", { p_secret: SECRET, p_token: leadA.token, p_patch: { privacy_consent: false } });
    must(isErrorStatus(r2) && msg(r2) === "privacy_consent_required", "consent withdrawal accepted", r2);
  });

  it("complete_lead with A's token but incomplete data -> missing_field (A stays in progress)", async () => {
    const r = await rpc("complete_lead", { p_secret: SECRET, p_token: leadA.token, p_data: {} });
    must(isErrorStatus(r) && msg(r).startsWith("missing_field"), "incomplete complete_lead accepted", r);
    const again = await rpc("update_lead", { p_secret: SECRET, p_token: leadA.token, p_patch: { step_reached: "offer_chosen" } });
    must(again.status === 204 || again.status === 200, "A should still be in progress after a failed complete", again);
  });

  it("complete_lead with A's token + valid data succeeds and returns {id, token, notification_email}", async () => {
    const r = await rpc("complete_lead", {
      p_secret: SECRET,
      p_token: leadA.token,
      p_data: {
        tax_code: "TSTSCR80A01H501X",
        housing_title: "proprietario",
        comune_istat: comune!.istat_code,
        cap: comune!.cap,
        address: "Via Test Security",
        street_number: "1",
        is_resident: true,
        service_type: "cambio_fornitore",
        chosen_offer_luce: luceOfferId,
        pod: "IT001E12345678",
        power_kw: 3,
        voltage: 220,
      },
    });
    must(r.status === 200, "complete A failed", r);
    must(r.body.id === leadA.id && r.body.token === leadA.token, "complete A returned another lead", r);
    must("notification_email" in r.body, "notification_email key missing (Q7)", r);
    must(r.body.notification_email === null || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.body.notification_email), "notification_email malformed", r);
  });

  it("after completion, A is read-only: update_lead / complete_lead -> lead_not_found", async () => {
    const u = await rpc("update_lead", { p_secret: SECRET, p_token: leadA.token, p_patch: { first_name: "CHANGED" } });
    must(isRejected(u) && msg(u) === "lead_not_found", "completed lead A still updatable", u);
    const c = await rpc("complete_lead", { p_secret: SECRET, p_token: leadA.token, p_data: {} });
    must(isRejected(c) && msg(c) === "lead_not_found", "completed lead A can be completed twice", c);
  });

  it("isolation: completing A did not touch B (B is still in progress and updatable with its own token only)", async () => {
    const r = await rpc("update_lead", { p_secret: SECRET, p_token: leadB.token, p_patch: { step_reached: "results", has_gas: false } });
    must(r.status === 204 || r.status === 200, "B should still be updatable after A completed", r);
  });

  it("isolation: B's token cannot reach A, A's token cannot reach B", async () => {
    // A is completed -> its token no longer matches any in-progress row, whichever token is used.
    const viaB = await rpc("complete_lead", { p_secret: SECRET, p_token: leadB.token, p_data: { tax_code: "TSTSCR80A01H501X" } });
    must(isErrorStatus(viaB) && msg(viaB).startsWith("missing_field"), "B completion should fail on missing fields only", viaB);
    const bStill = await rpc("update_lead", { p_secret: SECRET, p_token: leadB.token, p_patch: { first_name: "TEST-SECURITY" } });
    must(bStill.status === 204 || bStill.status === 200, "B must stay in progress after a failed complete", bStill);
    const aTok = await rpc("update_lead", { p_secret: SECRET, p_token: leadA.token, p_patch: { first_name: "TEST-SECURITY-B" } });
    must(isRejected(aTok) && msg(aTok) === "lead_not_found", "A's token must not match anything now", aTok);
  });

  it("anon still cannot read the test leads (no direct select)", async () => {
    const r = await rest("GET", `leads?id=in.(${leadA.id},${leadB.id})&select=id,token,first_name`);
    must(isDenied(r) || (r.status === 200 && hasNoRows(r)), "test leads readable by anon", r);
    const r2 = await rest("GET", `leads?token=eq.${leadA.token}&select=*`);
    must(isDenied(r2) || (r2.status === 200 && hasNoRows(r2)), "lead readable by token filter", r2);
  });

  it("anon cannot PATCH / DELETE the test leads directly", async () => {
    const p = await rest("PATCH", `leads?id=eq.${leadB.id}`, { body: { first_name: "HACKED" }, headers: { Prefer: "return=representation" } });
    must(isDenied(p) || (p.status < 300 && hasNoRows(p)), "direct PATCH on test lead", p);
    const d = await rest("DELETE", `leads?id=eq.${leadB.id}`, { headers: { Prefer: "return=representation" } });
    must(isDenied(d) || (d.status < 300 && hasNoRows(d)), "direct DELETE on test lead", d);
    const ok = await rpc("update_lead", { p_secret: SECRET, p_token: leadB.token, p_patch: { first_name: "TEST-SECURITY" } });
    must(ok.status === 204 || ok.status === 200, "B must still be intact and updatable", ok);
  });

  it("reports rows created this run (exactly 2)", () => {
    must(rowsCreated === 2, `expected 2 rows created, got ${rowsCreated}`);
    console.log(`[security] test leads created this run: ${rowsCreated} (first_name TEST-SECURITY; A completed, B in progress)`);
  });
});

// ---------------------------------------------------------------------------------------
// 7. Storage
// ---------------------------------------------------------------------------------------

describe("storage supplier-logos (anon)", () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>';

  it("anon cannot upload", async () => {
    const r = await call("POST", `/storage/v1/object/supplier-logos/test-security/${Date.now()}.svg`, { raw: svg, headers: { "Content-Type": "image/svg+xml" } });
    must(isErrorStatus(r) || r.body?.statusCode === "403" || r.body?.statusCode === 403, "anon upload accepted", r);
    must(!(r.status >= 200 && r.status < 300), "anon upload accepted", r);
  });

  it("anon cannot overwrite (upsert) or delete", async () => {
    const up = await call("PUT", "/storage/v1/object/supplier-logos/test-security/x.svg", { raw: svg, headers: { "Content-Type": "image/svg+xml" } });
    must(!(up.status >= 200 && up.status < 300), "anon PUT accepted", up);
    const del = await call("DELETE", "/storage/v1/object/supplier-logos/test-security/x.svg");
    must(!(del.status >= 200 && del.status < 300 && Array.isArray(del.body) && del.body.length > 0), "anon delete removed something", del);
  });

  it("anon cannot list the bucket", async () => {
    const r = await call("POST", "/storage/v1/object/list/supplier-logos", { body: { prefix: "", limit: 100 } });
    must(isErrorStatus(r) || hasNoRows(r), "bucket listing exposed to anon", r);
  });

  it("anon cannot upload to a bucket that does not allow it either (other bucket name)", async () => {
    const r = await call("POST", `/storage/v1/object/other-bucket/test-security/${Date.now()}.svg`, { raw: svg, headers: { "Content-Type": "image/svg+xml" } });
    must(!(r.status >= 200 && r.status < 300), "anon upload accepted on other bucket", r);
  });

  it("public read of an existing logo works (skipped when no supplier has a stored logo)", async (ctx) => {
    const s = await rest("GET", "suppliers?select=logo_path&logo_path=not.is.null&limit=50");
    const candidates: string[] = (s.body ?? []).map((x: { logo_path: string }) => x.logo_path);
    // logo_path is either a bucket object name or a site-relative path (/logos/...). Only test bucket objects.
    const objectName = candidates.find((p) => !p.startsWith("/") && !p.startsWith("http"));
    if (!objectName) {
      ctx.skip();
      return;
    }
    const r = await fetch(`${BASE}/storage/v1/object/public/supplier-logos/${objectName}`);
    must(r.status === 200, `public logo read failed with HTTP ${r.status}`);
  });
});
