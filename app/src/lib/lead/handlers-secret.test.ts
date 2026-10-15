// @vitest-environment node
/**
 * Lead API wired to the Supabase repository lead methods (fake PostgREST client):
 * LEAD_API_SECRET is passed as p_secret on every lead RPC, fails closed when missing,
 * `invalid_secret` maps to 500 server_error, and the secret never leaks.
 * Reads (offers / comuni for the completion checks) come from the mock repository.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createMockRepository, createSupabaseRepository, type Repository } from "@/lib/data";
import { LEAD_COOKIE, LEAD_STEP_COOKIE } from "./api-types";
import { createLeadHandlers, createRateLimiters, type LeadHandlers } from "./handlers";
import type { NewLeadNotification } from "./notify";
import { completeData, page1Data } from "./test-fixtures";

const SECRET = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";
const COOKIE = `${LEAD_COOKIE}=tok-1; ${LEAD_STEP_COOKIE}=offer_chosen`;

type RpcResult = { data: unknown; error: { message: string; code?: string } | null };

let rpc: ReturnType<typeof vi.fn<(fn: string, args: Record<string, unknown>) => Promise<RpcResult>>>;
let notify: ReturnType<typeof vi.fn<(l: NewLeadNotification) => Promise<void>>>;
let secret: string | undefined;
let handlers: LeadHandlers;
let errorLog: ReturnType<typeof vi.spyOn>;

function setup() {
  rpc = vi.fn(async (fn: string): Promise<RpcResult> => {
    if (fn === "create_lead") return { data: { id: "lead-1", token: "tok-1" }, error: null };
    if (fn === "complete_lead") {
      return { data: { id: "lead-1", token: "tok-1", notification_email: "aldo@azienda.it" }, error: null };
    }
    return { data: null, error: null };
  });
  const sb = createSupabaseRepository({ rpc } as unknown as SupabaseClient, { leadSecret: () => secret });
  const reads = createMockRepository();
  const repo: Repository = {
    ...reads,
    createLead: sb.createLead,
    updateLead: sb.updateLead,
    completeLead: sb.completeLead,
  };
  notify = vi.fn<(l: NewLeadNotification) => Promise<void>>(async () => {});
  handlers = createLeadHandlers({
    getRepository: () => repo,
    verifyTurnstile: async () => ({ success: true, errorCodes: [] }),
    notify,
    limiters: createRateLimiters(),
    isProduction: false,
    now: () => new Date("2026-10-15T10:00:00.000Z"),
  });
}

function req(method: string, path: string, body: unknown, cookie?: string): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (cookie) headers.cookie = cookie;
  return new Request(`http://localhost:3000${path}`, { method, headers, body: JSON.stringify(body) });
}

const create = () => handlers.create(req("POST", "/api/lead", { data: page1Data(), turnstileToken: "t" }));
const update = () => handlers.update(req("PATCH", "/api/lead", { data: { first_name: "Anna" } }, COOKIE));
const complete = () =>
  handlers.complete(req("POST", "/api/lead/complete", { data: completeData(), turnstileToken: "t" }, COOKIE));

async function expectNoLeak(res: Response) {
  const text = await res.clone().text();
  expect(text).not.toContain(SECRET);
  for (const [, v] of res.headers) expect(v).not.toContain(SECRET);
  expect(errorLog.mock.calls.flat().map(String).join(" ")).not.toContain(SECRET);
}

beforeEach(() => {
  secret = SECRET;
  errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
  setup();
});
afterEach(() => vi.restoreAllMocks());

describe("lead API with the Supabase lead RPCs", () => {
  it("passes p_secret on create_lead, update_lead and complete_lead", async () => {
    const created = await create();
    expect(created.status).toBe(201);
    await expectNoLeak(created);
    expect((await update()).status).toBe(200);
    const completed = await complete();
    expect(completed.status).toBe(200);
    await expectNoLeak(completed);

    expect(rpc.mock.calls.map(([fn]) => fn)).toEqual(["create_lead", "update_lead", "complete_lead"]);
    for (const [, args] of rpc.mock.calls) expect(args.p_secret).toBe(SECRET);
    expect(rpc.mock.calls[1][1]).toMatchObject({ p_token: "tok-1", p_patch: { first_name: "Anna" } });
    expect(rpc.mock.calls[2][1]).toMatchObject({ p_token: "tok-1" });
  });

  it("forwards notification_email from complete_lead to the notification hook", async () => {
    await complete();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0]).toMatchObject({ id: "lead-1", notificationEmail: "aldo@azienda.it" });
  });

  it.each([
    ["undefined", undefined],
    ["empty", ""],
    ["blank", "   "],
  ])("fails closed with 500 server_error when the secret is %s (no RPC call)", async (_label, value) => {
    secret = value;
    for (const res of [await create(), await update(), await complete()]) {
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ ok: false, error: "server_error" });
      // A server fault must not make the browser forget its lead.
      expect(res.headers.getSetCookie()).toEqual([]);
    }
    expect(rpc).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
    expect(errorLog.mock.calls.flat().join(" ")).toContain("LEAD_API_SECRET missing");
  });

  it("maps invalid_secret (SQLSTATE 28000 / HTTP 403) to 500 server_error, never a client error", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "invalid_secret", code: "28000" } });
    for (const res of [await create(), await update(), await complete()]) {
      await expectNoLeak(res);
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ ok: false, error: "server_error" });
      expect(res.headers.getSetCookie()).toEqual([]);
    }
    expect(notify).not.toHaveBeenCalled();
    const logged = errorLog.mock.calls.flat().join(" ");
    expect(logged).toContain("LEAD_API_SECRET invalid");
    expect(logged).not.toContain(SECRET);
  });
});

describe("server secret wiring", () => {
  it("importing the handlers registers the env reader (Supabase mode default path)", async () => {
    await import("./handlers");
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const repo = createSupabaseRepository({ rpc } as unknown as SupabaseClient);
    vi.stubEnv("LEAD_API_SECRET", SECRET);
    try {
      await repo.updateLead("tok-1", {});
      expect(rpc).toHaveBeenCalledWith("update_lead", { p_secret: SECRET, p_token: "tok-1", p_patch: {} });
      vi.stubEnv("LEAD_API_SECRET", "");
      await expect(repo.updateLead("tok-1", {})).rejects.toThrow(/not configured/);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
