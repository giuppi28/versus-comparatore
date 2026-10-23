import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdmin = vi.fn();
vi.mock("@/lib/auth", () => ({ requireAdmin: () => requireAdmin() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/data/admin", () => ({
  getAdminRepository: async () => ({ getSettings: async () => ({ notification_email: "aldo@example.it" }) }),
}));

import { sendTestEmailAction } from "./actions";
import { resetTestEmailLimiter } from "@/lib/notify/test-email";

describe("sendTestEmailAction", () => {
  beforeEach(() => {
    resetTestEmailLimiter();
    requireAdmin.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("rejects non-admins before doing anything", async () => {
    requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(sendTestEmailAction({ attempt: 0 })).rejects.toThrow("NEXT_REDIRECT");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports missing config in Italian without sending", async () => {
    requireAdmin.mockResolvedValue({ id: "u1", email: null });
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("RESEND_FROM", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const s = await sendTestEmailAction({ attempt: 0 });
    expect(s.result).toBe("error");
    expect(s.message).toContain("configurazione mancante");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends via mocked fetch and shows address + response", async () => {
    requireAdmin.mockResolvedValue({ id: "u1", email: null });
    vi.stubEnv("RESEND_API_KEY", "re_x");
    vi.stubEnv("RESEND_FROM", "noreply@versus.it");
    vi.stubEnv("NOTIFICATION_EMAIL", "");
    const fetchMock = vi.fn(async () => new Response('{"id":"id-1"}', { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const s = await sendTestEmailAction({ attempt: 0 });
    expect(s).toEqual({
      result: "sent",
      message: 'Email inviata a aldo@example.it. Risposta Resend: {"id":"id-1"}',
      attempt: 1,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("passes Resend errors through verbatim", async () => {
    requireAdmin.mockResolvedValue({ id: "u1", email: null });
    vi.stubEnv("RESEND_API_KEY", "re_x");
    vi.stubEnv("RESEND_FROM", "onboarding@resend.dev");
    vi.stubEnv("NOTIFICATION_EMAIL", "");
    vi.stubGlobal("fetch", vi.fn(async () => new Response('{"message":"nope"}', { status: 403 })));
    const s = await sendTestEmailAction({ attempt: 0 });
    expect(s.message).toBe('Errore Resend, HTTP 403: {"message":"nope"}');
    expect(s.message).not.toContain("re_x");
  });
});
