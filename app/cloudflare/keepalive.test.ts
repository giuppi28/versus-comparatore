import { describe, expect, it, vi } from "vitest";
import { pingSupabase } from "./keepalive";

const env = {
  NEXT_PUBLIC_DATA_SOURCE: "supabase",
  NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co/",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
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
