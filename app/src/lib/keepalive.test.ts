// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { isProtectedAdminPath } from "@/lib/auth/paths";
import { config as proxyConfig } from "@/proxy";
import { createKeepAliveHandler, isAuthorizedCronRequest, pingSupabase } from "./keepalive";

const env = {
  NEXT_PUBLIC_DATA_SOURCE: "supabase",
  NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co/",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
};
const CRON_SECRET = "cron-secret-0123456789abcdef";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function cronRequest(authorization?: string) {
  return new Request("http://localhost:3000/api/cron/keepalive", {
    headers: authorization ? { authorization } : {},
  });
}

describe("pingSupabase", () => {
  it("reads one comune with the publishable key only", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([{ istat_code: "015146" }]));
    const result = await pingSupabase(env, fetchMock as unknown as typeof fetch);
    expect(result).toEqual({ ok: true, status: 200 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://abc.supabase.co/rest/v1/comuni?select=istat_code&limit=1");
    expect(init.method).toBe("GET");
    expect(init.headers).toEqual({ apikey: "sb_publishable_test", Accept: "application/json" });
  });

  it("does nothing outside supabase mode", async () => {
    const fetchMock = vi.fn();
    const result = await pingSupabase({ ...env, NEXT_PUBLIC_DATA_SOURCE: "mock" }, fetchMock as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, status: 0, reason: "not_supabase_mode" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports missing configuration without sending a request", async () => {
    const fetchMock = vi.fn();
    const result = await pingSupabase(
      { NEXT_PUBLIC_DATA_SOURCE: "supabase", NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co" },
      fetchMock as unknown as typeof fetch,
    );
    expect(result.reason).toBe("missing_config");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports HTTP errors (e.g. paused project)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("paused", { status: 503 }));
    expect(await pingSupabase(env, fetchMock as unknown as typeof fetch)).toEqual({
      ok: false,
      status: 503,
      reason: "http_error",
    });
  });

  it("reports an empty table as not ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    expect((await pingSupabase(env, fetchMock as unknown as typeof fetch)).reason).toBe("empty_response");
  });

  it("never throws on network failures", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    expect(await pingSupabase(env, fetchMock as unknown as typeof fetch)).toEqual({
      ok: false,
      status: 0,
      reason: "network_error",
    });
  });
});

describe("isAuthorizedCronRequest (Vercel CRON_SECRET)", () => {
  it("requires the exact Bearer secret when CRON_SECRET is set", () => {
    for (const isProduction of [true, false]) {
      const opts = { cronSecret: CRON_SECRET, isProduction };
      expect(isAuthorizedCronRequest(`Bearer ${CRON_SECRET}`, opts)).toBe(true);
      expect(isAuthorizedCronRequest(null, opts)).toBe(false);
      expect(isAuthorizedCronRequest("", opts)).toBe(false);
      expect(isAuthorizedCronRequest(CRON_SECRET, opts)).toBe(false);
      expect(isAuthorizedCronRequest(`Bearer ${CRON_SECRET}x`, opts)).toBe(false);
      expect(isAuthorizedCronRequest(`bearer ${CRON_SECRET}`, opts)).toBe(false);
      expect(isAuthorizedCronRequest("Bearer wrong", opts)).toBe(false);
    }
  });

  it("refuses everything in production when CRON_SECRET is unset (fail closed)", () => {
    for (const cronSecret of [undefined, "", "   "]) {
      expect(isAuthorizedCronRequest(null, { cronSecret, isProduction: true })).toBe(false);
      expect(isAuthorizedCronRequest("Bearer anything", { cronSecret, isProduction: true })).toBe(false);
    }
  });

  it("is open in development / tests when CRON_SECRET is unset", () => {
    expect(isAuthorizedCronRequest(null, { cronSecret: undefined, isProduction: false })).toBe(true);
  });
});

describe("GET /api/cron/keepalive handler", () => {
  it("401 JSON without the Bearer secret; Supabase is never contacted", async () => {
    const fetchMock = vi.fn();
    const handler = createKeepAliveHandler({
      env: { ...env, CRON_SECRET },
      isProduction: true,
      fetchImpl: fetchMock as unknown as typeof fetch,
      log: () => {},
    });
    for (const auth of [undefined, "Bearer nope"]) {
      const res = await handler(cronRequest(auth));
      expect(res.status).toBe(401);
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(await res.json()).toEqual({ ok: false, status: 0, reason: "unauthorized" });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("401 in production when CRON_SECRET is not configured", async () => {
    const fetchMock = vi.fn();
    const handler = createKeepAliveHandler({ env, isProduction: true, fetchImpl: fetchMock as unknown as typeof fetch });
    expect((await handler(cronRequest("Bearer x"))).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("200 {ok, status} with the Bearer secret, logging the result without secrets", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([{ istat_code: "015146" }]));
    const log = vi.fn();
    const handler = createKeepAliveHandler({
      env: { ...env, CRON_SECRET },
      isProduction: true,
      fetchImpl: fetchMock as unknown as typeof fetch,
      log,
    });
    const res = await handler(cronRequest(`Bearer ${CRON_SECRET}`));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({ ok: true, status: 200 });
    expect(log).toHaveBeenCalledWith('supabase-keepalive {"ok":true,"status":200}');
    expect(log.mock.calls.flat().join(" ")).not.toContain(CRON_SECRET);
    // The Bearer secret is never forwarded to Supabase.
    expect(JSON.stringify(fetchMock.mock.calls[0][1])).not.toContain(CRON_SECRET);
  });

  it("503 with the failure reason when the ping fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("paused", { status: 540 }));
    const handler = createKeepAliveHandler({
      env: { ...env, CRON_SECRET },
      isProduction: true,
      fetchImpl: fetchMock as unknown as typeof fetch,
      log: () => {},
    });
    const res = await handler(cronRequest(`Bearer ${CRON_SECRET}`));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, status: 540, reason: "http_error" });
  });
});

describe("Vercel wiring", () => {
  it("vercel.json schedules the keep-alive once a day (Hobby limit)", () => {
    const vercel = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../vercel.json"), "utf8")) as {
      crons: { path: string; schedule: string }[];
    };
    expect(vercel.crons).toEqual([{ path: "/api/cron/keepalive", schedule: expect.any(String) }]);
    const [minute, hour, dom, month, dow] = vercel.crons[0].schedule.split(" ");
    expect([minute, hour].every((v) => /^\d+$/.test(v))).toBe(true);
    expect([dom, month, dow]).toEqual(["*", "*", "*"]);
    expect(fs.existsSync(path.resolve(__dirname, "../app/api/cron/keepalive/route.ts"))).toBe(true);
  });

  it("the admin proxy never intercepts the cron route", () => {
    expect(isProtectedAdminPath("/api/cron/keepalive")).toBe(false);
    for (const m of proxyConfig.matcher) expect(m.startsWith("/admin")).toBe(true);
  });
});
