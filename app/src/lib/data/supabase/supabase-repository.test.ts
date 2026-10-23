import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseRepository, registerLeadSecretProvider } from "./supabase-repository";
import { LeadApiSecretError, LeadNotFoundError, PrivacyConsentRequiredError } from "../repository";

const SECRET = "s3cr3t-hex";
const withSecret = { leadSecret: () => SECRET };

function fakeClient(rpc: ReturnType<typeof vi.fn>) {
  return { rpc } as unknown as SupabaseClient;
}

describe("supabase repository lead RPCs", () => {
  it("calls create_lead and accepts object or one-row array", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ id: "i", token: "t" }], error: null });
    const repo = createSupabaseRepository(fakeClient(rpc), withSecret);
    expect(await repo.createLead({ privacy_consent: true })).toEqual({ id: "i", token: "t" });
    expect(rpc).toHaveBeenCalledWith("create_lead", { p_secret: SECRET, p_data: { privacy_consent: true } });
  });

  it("does not call the DB without consent", async () => {
    const rpc = vi.fn();
    const repo = createSupabaseRepository(fakeClient(rpc), withSecret);
    await expect(repo.createLead({})).rejects.toBeInstanceOf(PrivacyConsentRequiredError);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("calls update_lead / complete_lead with the token and maps errors", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: { id: "i", token: "t", notification_email: " aldo@azienda.it ", callback_phone: " +39 02 1234567 " },
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: { message: "lead_not_found" } });
    const repo = createSupabaseRepository(fakeClient(rpc), withSecret);
    await repo.updateLead("t", { first_name: "A" });
    expect(rpc).toHaveBeenNthCalledWith(1, "update_lead", {
      p_secret: SECRET,
      p_token: "t",
      p_patch: { first_name: "A" },
    });
    expect(await repo.completeLead("t", { pod: "x" })).toEqual({
      id: "i",
      token: "t",
      notification_email: "aldo@azienda.it",
      callback_phone: "+39 02 1234567",
    });
    expect(rpc).toHaveBeenNthCalledWith(2, "complete_lead", { p_secret: SECRET, p_token: "t", p_data: { pod: "x" } });
    await expect(repo.updateLead("bad", {})).rejects.toBeInstanceOf(LeadNotFoundError);
  });

  it("complete_lead: notification_email null / missing / blank → null, callback_phone → default; one-row array accepted", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: { id: "i", token: "t", notification_email: null }, error: null })
      .mockResolvedValueOnce({ data: [{ id: "i", token: "t" }], error: null })
      .mockResolvedValueOnce({ data: { id: "i", token: "t", notification_email: "  ", callback_phone: " " }, error: null });
    const repo = createSupabaseRepository(fakeClient(rpc), withSecret);
    for (let i = 0; i < 3; i++) {
      expect(await repo.completeLead("t", {})).toEqual({
        id: "i",
        token: "t",
        notification_email: null,
        callback_phone: "+39 095 0000000",
      });
    }
  });

  it("by default reads the secret lazily from the registered server provider", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const repo = createSupabaseRepository(fakeClient(rpc));
    let value: string | undefined = " registered ";
    registerLeadSecretProvider(() => value);
    try {
      await repo.updateLead("t", {});
      expect(rpc).toHaveBeenCalledWith("update_lead", { p_secret: "registered", p_token: "t", p_patch: {} });
      value = "";
      await expect(repo.updateLead("t", {})).rejects.toBeInstanceOf(LeadApiSecretError);
    } finally {
      registerLeadSecretProvider(() => undefined);
    }
  });

  it("fails closed without the secret: no RPC is attempted", async () => {
    const rpc = vi.fn();
    const repo = createSupabaseRepository(fakeClient(rpc), { leadSecret: () => undefined });
    for (const call of [
      () => repo.createLead({ privacy_consent: true }),
      () => repo.updateLead("t", {}),
      () => repo.completeLead("t", {}),
    ]) {
      const err = await call().catch((e: unknown) => e);
      expect(err).toBeInstanceOf(LeadApiSecretError);
      expect((err as LeadApiSecretError).reason).toBe("missing");
    }
    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps invalid_secret (code 28000 or message) to LeadApiSecretError without the secret in the message", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: "invalid_secret", code: "28000" } })
      .mockResolvedValueOnce({ data: null, error: { message: "invalid_secret" } })
      .mockResolvedValueOnce({ data: null, error: { message: "x", code: "28000" } });
    const repo = createSupabaseRepository(fakeClient(rpc), withSecret);
    for (const call of [
      () => repo.createLead({ privacy_consent: true }),
      () => repo.updateLead("t", {}),
      () => repo.completeLead("t", {}),
    ]) {
      const err = await call().catch((e: unknown) => e);
      expect(err).toBeInstanceOf(LeadApiSecretError);
      expect((err as LeadApiSecretError).reason).toBe("invalid");
      expect((err as Error).message).not.toContain(SECRET);
    }
  });

  it("rejects malformed rpc responses", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const repo = createSupabaseRepository(fakeClient(rpc), withSecret);
    await expect(repo.createLead({ privacy_consent: true })).rejects.toThrow(/Unexpected response/);
  });
});
