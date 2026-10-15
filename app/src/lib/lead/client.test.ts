import { afterEach, describe, expect, it, vi } from "vitest";
import { clearLead, completeLead, createLead, LeadApiError, updateLead } from "./client";
import { completeData, page1Data } from "./test-fixtures";

function stubFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
  const f = vi.fn<typeof fetch>(
    async () =>
      new Response(typeof body === "string" ? body : JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json", ...headers },
      }),
  );
  vi.stubGlobal("fetch", f);
  return f;
}

afterEach(() => vi.unstubAllGlobals());

describe("lead client", () => {
  it("createLead POSTs { data, turnstileToken } same-origin", async () => {
    const f = stubFetch(201, { ok: true });
    await createLead(page1Data(), "tok");
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("/api/lead");
    expect(init).toMatchObject({ method: "POST", credentials: "same-origin" });
    expect(JSON.parse(init!.body as string)).toEqual({ data: page1Data(), turnstileToken: "tok" });
  });

  it("updateLead PATCHes { data } with keepalive", async () => {
    const f = stubFetch(200, { ok: true });
    await updateLead({ step_reached: "results" });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("/api/lead");
    expect(init).toMatchObject({ method: "PATCH", keepalive: true });
    expect(JSON.parse(init!.body as string)).toEqual({ data: { step_reached: "results" } });
  });

  it("completeLead POSTs to /api/lead/complete; clearLead DELETEs", async () => {
    const f = stubFetch(200, { ok: true });
    await completeLead(completeData(), "tok");
    await clearLead();
    expect(f.mock.calls[0][0]).toBe("/api/lead/complete");
    expect(f.mock.calls[1][1]).toMatchObject({ method: "DELETE" });
    expect(f.mock.calls[1][1]?.body).toBeUndefined();
  });

  it("throws typed validation errors with fields", async () => {
    stubFetch(422, { ok: false, error: "validation", fields: { tax_code: "name_mismatch" } });
    const err = await completeLead(completeData(), "tok").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(LeadApiError);
    expect(err).toMatchObject({ status: 422, code: "validation", fields: { tax_code: "name_mismatch" } });
  });

  it("exposes Retry-After on 429", async () => {
    stubFetch(429, { ok: false, error: "rate_limited" }, { "Retry-After": "30" });
    await expect(updateLead({})).rejects.toMatchObject({ code: "rate_limited", retryAfterSec: 30 });
  });

  it("maps network failures and non-JSON responses", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("offline"))));
    await expect(updateLead({})).rejects.toMatchObject({ status: 0, code: "network_error" });
    stubFetch(502, "<html>bad gateway</html>");
    await expect(updateLead({})).rejects.toMatchObject({ status: 502, code: "server_error" });
    stubFetch(404, "not json");
    await expect(updateLead({})).rejects.toMatchObject({ status: 404, code: "invalid_body" });
  });
});
