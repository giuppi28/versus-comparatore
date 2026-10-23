import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  consumeTestEmailSlot,
  isResendDevSender,
  resetTestEmailLimiter,
  sendTestEmail,
  TEST_EMAIL_TEXT,
} from "./test-email";
import { sendViaResendRaw } from "./resend";

const config = { apiKey: "re_secret", from: "VERSUS <noreply@versus.it>", envRecipient: null, baseUrl: null };
const repo = (email: string | null) => ({
  getSettings: async () => ({ notification_email: email }) as never,
});
const okSend = () => vi.fn(async () => ({ kind: "response" as const, status: 200, ok: true, body: '{"id":"abc"}' }));

beforeEach(() => resetTestEmailLimiter());

describe("sendTestEmail", () => {
  it("sends to the saved address and returns the Resend body", async () => {
    const send = okSend();
    const r = await sendTestEmail("u1", { config, repo: repo("aldo@example.it"), send });
    expect(r).toEqual({ status: "sent", to: "aldo@example.it", body: '{"id":"abc"}' });
    expect(send).toHaveBeenCalledWith(
      "re_secret",
      expect.objectContaining({ to: "aldo@example.it", text: TEST_EMAIL_TEXT }),
    );
  });

  it.each([
    ["RESEND_API_KEY", { ...config, apiKey: null }, "a@b.it"],
    ["RESEND_FROM", { ...config, from: null }, "a@b.it"],
    ["indirizzo email", config, null],
  ])("missing %s: no request sent", async (label, cfg, email) => {
    const send = okSend();
    const r = await sendTestEmail("u1", { config: cfg, repo: repo(email), send });
    expect(r.status).toBe("missing_config");
    expect(JSON.stringify(r)).toContain(label);
    expect(JSON.stringify(r)).not.toContain("re_secret");
    expect(send).not.toHaveBeenCalled();
  });

  it("passes the Resend error through verbatim", async () => {
    const body = '{"statusCode":403,"message":"You can only send testing emails to your own email address","name":"validation_error"}';
    const send = vi.fn(async () => ({ kind: "response" as const, status: 403, ok: false, body }));
    const r = await sendTestEmail("u1", { config, repo: repo("a@b.it"), send });
    expect(r).toEqual({ status: "error", message: `Errore Resend, HTTP 403: ${body}` });
  });

  it("rate limits: 30 s between sends, 10 per hour", async () => {
    const send = okSend();
    const t0 = 1_000_000;
    expect((await sendTestEmail("u1", { config, repo: repo("a@b.it"), send, now: t0 })).status).toBe("sent");
    const r = await sendTestEmail("u1", { config, repo: repo("a@b.it"), send, now: t0 + 10_000 });
    expect(r.status).toBe("rate_limited");
    expect(r.status === "rate_limited" && r.message).toContain("20 secondi");
    expect(send).toHaveBeenCalledTimes(1);
    // other admin unaffected
    expect((await sendTestEmail("u2", { config, repo: repo("a@b.it"), send, now: t0 + 10_000 })).status).toBe("sent");
    // hourly cap
    resetTestEmailLimiter();
    for (let i = 0; i < 10; i++) expect(consumeTestEmailSlot("u3", t0 + i * 31_000)).toBe(0);
    expect(consumeTestEmailSlot("u3", t0 + 10 * 31_000)).toBeGreaterThan(0);
    expect(consumeTestEmailSlot("u3", t0 + 3_600_000 + 1)).toBe(0);
  });
});

describe("isResendDevSender", () => {
  it.each([
    ["onboarding@resend.dev", true],
    ["VERSUS <onboarding@resend.dev>", true],
    [" Onboarding@RESEND.DEV ", true],
    ["noreply@versus.it", false],
    ["VERSUS <noreply@versus.it>", false],
    [null, false],
  ])("%s -> %s", (v, expected) => expect(isResendDevSender(v)).toBe(expected));
});

describe("sendViaResendRaw", () => {
  it("returns status and body as received", async () => {
    const f = vi.fn(async () => new Response('{"message":"bad"}', { status: 422 }));
    expect(await sendViaResendRaw("k", { from: "a", to: "b", subject: "s", text: "t", html: "h" }, f as never)).toEqual({
      kind: "response",
      status: 422,
      ok: false,
      body: '{"message":"bad"}',
    });
  });
  it("reports network errors by name only", async () => {
    const f = vi.fn(async () => {
      throw new TypeError("secret detail");
    });
    expect(await sendViaResendRaw("k", { from: "a", to: "b", subject: "s", text: "t", html: "h" }, f as never)).toEqual({
      kind: "network",
      error: "TypeError",
    });
  });
});
