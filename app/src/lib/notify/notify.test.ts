import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRepository } from "@/lib/data";
import { MOCK_OFFERS } from "@/lib/data/mock/data";
import { isValidEmail, normalizeEmail } from "./email-address";
import { buildNewLeadEmail, escapeHtml, leadAdminUrl, type NewLeadEmailInput } from "./new-lead-email";
import { readNotifyConfig, resolveRecipient, sendNewLeadNotification, type NotifyConfig } from "./index";
import { RESEND_ENDPOINT, sendViaResend } from "./resend";

const BASE: NewLeadEmailInput = {
  leadId: "lead-1",
  firstName: "Mario",
  lastName: "Rossi",
  phone: "3331234567",
  commodityLabel: "Luce + Gas",
  customerTypeLabel: "Casa",
  comuneLabel: "Milano (MI)",
  offers: [
    { commodityLabel: "Luce", name: "Enel - Prova", monthlyCost: 65.5 },
    { commodityLabel: "Gas", name: "Eni - Altra", monthlyCost: null },
  ],
  totalMonthlyCost: 100,
  completedAt: "2026-10-15T10:00:00.000Z",
  baseUrl: "https://versus.example",
};

const CONFIG: NotifyConfig = {
  apiKey: "re_test_key",
  from: "VERSUS <noreply@versus.example>",
  envRecipient: null,
  baseUrl: "https://versus.example",
};

describe("email address helpers", () => {
  it("validates addresses", () => {
    expect(isValidEmail("aldo@azienda.it")).toBe(true);
    for (const bad of ["", "aldo", "aldo@", "@azienda.it", "a b@c.it", "aldo@azienda", "a@b..it"]) {
      expect(isValidEmail(bad)).toBe(false);
    }
    expect(normalizeEmail("  aldo@azienda.it ")).toBe("aldo@azienda.it");
    expect(normalizeEmail("nope")).toBeNull();
    expect(normalizeEmail(null)).toBeNull();
  });
});

describe("buildNewLeadEmail", () => {
  it("includes name, phone, service, comune, offers and the admin link", () => {
    const e = buildNewLeadEmail(BASE);
    expect(e.subject).toBe("Nuovo lead completato: Mario Rossi");
    for (const part of ["Mario Rossi", "3331234567", "Luce + Gas", "Casa", "Milano (MI)", "Enel - Prova", "Eni - Altra"]) {
      expect(e.text).toContain(part);
      expect(e.html).toContain(part);
    }
    expect(e.text).toContain("65,50");
    expect(e.text).toContain("Totale mensile mostrato");
    expect(e.text).toContain("https://versus.example/admin/leads/lead-1");
    expect(e.html).toContain('href="https://versus.example/admin/leads/lead-1"');
  });

  it("escapes HTML in every user-supplied value", () => {
    const evil = `<script>alert("x")</script>&'`;
    const e = buildNewLeadEmail({
      ...BASE,
      firstName: evil,
      lastName: "<img src=x onerror=1>",
      phone: evil,
      comuneLabel: evil,
      offers: [{ commodityLabel: "Luce", name: evil, monthlyCost: 1 }],
      baseUrl: 'https://x.example/"><script>',
    });
    expect(e.html).not.toContain("<script>");
    expect(e.html).not.toContain("<img");
    expect(e.html).toContain("&lt;script&gt;");
    expect(e.html).toContain("&amp;&#39;");
    expect(e.html).toContain("&quot;&gt;&lt;script&gt;");
  });

  it("strips control characters and newlines from the subject", () => {
    const e = buildNewLeadEmail({ ...BASE, firstName: "Mario\r\nBcc: x@y.it", lastName: null });
    expect(e.subject).not.toMatch(/[\r\n]/);
  });

  it("omits the link without a base URL and handles missing data", () => {
    const e = buildNewLeadEmail({
      ...BASE,
      firstName: null,
      lastName: null,
      phone: null,
      offers: [],
      totalMonthlyCost: null,
      baseUrl: null,
    });
    expect(e.subject).toBe("Nuovo lead completato");
    expect(e.text).not.toContain("Apri il lead");
    expect(e.text).toContain("- nessuna");
    expect(leadAdminUrl(null, "x")).toBeNull();
    expect(leadAdminUrl("https://a.it/", "a/b")).toBe("https://a.it/admin/leads/a%2Fb");
  });

  it("escapeHtml handles all special characters", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });
});

describe("sendViaResend", () => {
  const mail = { from: "a@b.it", to: "c@d.it", subject: "S", text: "T", html: "<p>H</p>" };

  it("POSTs the documented payload with the bearer key", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "msg_1" }), { status: 200 }));
    const r = await sendViaResend("re_key", mail, fetchMock as unknown as typeof fetch);
    expect(r).toEqual({ ok: true, id: "msg_1" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(RESEND_ENDPOINT);
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer re_key");
    expect(JSON.parse(init.body)).toEqual({
      from: "a@b.it",
      to: ["c@d.it"],
      subject: "S",
      text: "T",
      html: "<p>H</p>",
    });
  });

  it("returns an error (never throws) on HTTP errors and network failures", async () => {
    const http = vi.fn().mockResolvedValue(new Response("{}", { status: 422 }));
    expect(await sendViaResend("k", mail, http as unknown as typeof fetch)).toEqual({
      ok: false,
      error: "resend_http_422",
    });
    const net = vi.fn().mockRejectedValue(new TypeError("boom"));
    expect(await sendViaResend("k", mail, net as unknown as typeof fetch)).toEqual({ ok: false, error: "TypeError" });
  });
});

describe("readNotifyConfig", () => {
  it("reads and normalises env values", () => {
    const c = readNotifyConfig({
      RESEND_API_KEY: " re_x ",
      RESEND_FROM: "",
      NOTIFICATION_EMAIL: "aldo@azienda.it",
      NEXT_PUBLIC_SITE_URL: "https://versus.example/",
    } as unknown as NodeJS.ProcessEnv);
    expect(c).toEqual({
      apiKey: "re_x",
      from: null,
      envRecipient: "aldo@azienda.it",
      baseUrl: "https://versus.example",
    });
    expect(readNotifyConfig({ NEXT_PUBLIC_SITE_URL: "versus.example" } as unknown as NodeJS.ProcessEnv).baseUrl).toBeNull();
  });
});

describe("resolveRecipient", () => {
  const settings = (email: string | null) => ({ getSettings: async () => ({ notification_email: email }) });
  const unreadable = { getSettings: async (): Promise<{ notification_email: string | null }> => { throw new Error("rls"); } };

  it("order: completeLead recipient, then env NOTIFICATION_EMAIL, then settings", async () => {
    expect(await resolveRecipient(settings("s@x.it"), "e@x.it", "c@x.it")).toBe("c@x.it");
    expect(await resolveRecipient(unreadable, "e@x.it", " c@x.it ")).toBe("c@x.it");
    expect(await resolveRecipient(settings("s@x.it"), "e@x.it", null)).toBe("e@x.it");
    expect(await resolveRecipient(settings("s@x.it"), "e@x.it", "not-an-email")).toBe("e@x.it");
    expect(await resolveRecipient(settings("s@x.it"), null, null)).toBe("s@x.it");
    expect(await resolveRecipient(settings("s@x.it"), null)).toBe("s@x.it");
  });

  it("tolerates an unreadable settings table and invalid values", async () => {
    expect(await resolveRecipient(unreadable, "e@x.it")).toBe("e@x.it");
    expect(await resolveRecipient(unreadable, null)).toBeNull();
    expect(await resolveRecipient(settings("bad"), null)).toBeNull();
  });
});

describe("sendNewLeadNotification", () => {
  let info: ReturnType<typeof vi.spyOn>;
  let error: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    info = vi.spyOn(console, "info").mockImplementation(() => {});
    error = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  const offer = MOCK_OFFERS.find((o) => o.commodity === "luce" && (o.customer_type === "casa" || o.customer_type === "both"))!;
  const lead = {
    id: "lead-42",
    completedAt: "2026-10-15T10:00:00.000Z",
    data: {
      first_name: "Mario",
      last_name: "Rossi",
      phone: "3331234567",
      commodity: "luce" as const,
      customer_type: "casa" as const,
      chosen_offer_luce: offer.id,
      final_kwh_month: 200,
      monthly_cost_shown: 70,
    },
  };

  async function repoWith(email: string | null) {
    const repo = createMockRepository();
    await repo.updateSettings({ notification_email: email });
    return repo;
  }

  it("is log-only (no fetch, no personal data) when the API key is missing", async () => {
    const send = vi.fn();
    const r = await sendNewLeadNotification(lead, {
      repo: await repoWith("aldo@azienda.it"),
      config: { ...CONFIG, apiKey: null },
      send,
    });
    expect(r).toBe("logged");
    expect(send).not.toHaveBeenCalled();
    const logged = info.mock.calls.flat().join(" ");
    expect(logged).toContain("lead-42");
    expect(logged).toContain("RESEND_API_KEY");
    expect(logged).not.toMatch(/Mario|Rossi|3331234567/);
  });

  it("is log-only when the recipient or sender is missing", async () => {
    const send = vi.fn();
    expect(await sendNewLeadNotification(lead, { repo: await repoWith(null), config: CONFIG, send })).toBe("logged");
    expect(
      await sendNewLeadNotification(lead, { repo: await repoWith("a@b.it"), config: { ...CONFIG, from: null }, send }),
    ).toBe("logged");
    expect(send).not.toHaveBeenCalled();
  });

  it("sends the email to the settings recipient with the offer and its monthly cost", async () => {
    const send = vi.fn().mockResolvedValue({ ok: true, id: "m1" });
    const r = await sendNewLeadNotification(lead, { repo: await repoWith("aldo@azienda.it"), config: CONFIG, send });
    expect(r).toBe("sent");
    expect(send).toHaveBeenCalledTimes(1);
    const [key, mail] = send.mock.calls[0];
    expect(key).toBe("re_test_key");
    expect(mail.to).toBe("aldo@azienda.it");
    expect(mail.from).toBe(CONFIG.from);
    expect(mail.subject).toBe("Nuovo lead completato: Mario Rossi");
    expect(mail.text).toContain(offer.name);
    expect(mail.text).toContain("/mese");
    expect(mail.text).toContain("https://versus.example/admin/leads/lead-42");
    expect(info.mock.calls.flat().join(" ")).not.toMatch(/Mario|aldo@azienda/);
  });

  it("uses the env recipient when settings are empty, and posts via fetch end to end", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const r = await sendNewLeadNotification(lead, {
      repo: await repoWith(null),
      config: { ...CONFIG, envRecipient: "env@azienda.it" },
    });
    vi.unstubAllGlobals();
    expect(r).toBe("sent");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.to).toEqual(["env@azienda.it"]);
    expect(body.html).toContain("Nuovo lead completato");
  });

  it("sends to the completeLead recipient ahead of env and settings", async () => {
    const send = vi.fn().mockResolvedValue({ ok: true, id: "m1" });
    const r = await sendNewLeadNotification(
      { ...lead, notificationEmail: "db@azienda.it" },
      { repo: await repoWith("settings@azienda.it"), config: { ...CONFIG, envRecipient: "env@azienda.it" }, send },
    );
    expect(r).toBe("sent");
    expect(send.mock.calls[0][1].to).toBe("db@azienda.it");
  });

  it("swallows send failures and unexpected errors", async () => {
    const failing = vi.fn().mockResolvedValue({ ok: false, error: "resend_http_500" });
    expect(
      await sendNewLeadNotification(lead, { repo: await repoWith("a@b.it"), config: CONFIG, send: failing }),
    ).toBe("failed");
    expect(error.mock.calls.flat().join(" ")).toContain("lead-42");

    const throwing = vi.fn().mockRejectedValue(new Error("kaboom Mario Rossi"));
    await expect(
      sendNewLeadNotification(lead, { repo: await repoWith("a@b.it"), config: CONFIG, send: throwing }),
    ).resolves.toBe("failed");
    expect(error.mock.calls.flat().join(" ")).not.toContain("Mario");
  });
});
