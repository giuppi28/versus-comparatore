import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseRepository } from "./supabase-repository";
import { LeadNotFoundError, PrivacyConsentRequiredError } from "../repository";

function fakeClient(rpc: ReturnType<typeof vi.fn>) {
  return { rpc } as unknown as SupabaseClient;
}

describe("supabase repository lead RPCs", () => {
  it("calls create_lead and accepts object or one-row array", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ id: "i", token: "t" }], error: null });
    const repo = createSupabaseRepository(fakeClient(rpc));
    expect(await repo.createLead({ privacy_consent: true })).toEqual({ id: "i", token: "t" });
    expect(rpc).toHaveBeenCalledWith("create_lead", { p_data: { privacy_consent: true } });
  });

  it("does not call the DB without consent", async () => {
    const rpc = vi.fn();
    const repo = createSupabaseRepository(fakeClient(rpc));
    await expect(repo.createLead({})).rejects.toBeInstanceOf(PrivacyConsentRequiredError);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("calls update_lead / complete_lead with the token and maps errors", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: "i", token: "t" }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "lead_not_found" } });
    const repo = createSupabaseRepository(fakeClient(rpc));
    await repo.updateLead("t", { first_name: "A" });
    expect(rpc).toHaveBeenNthCalledWith(1, "update_lead", { p_token: "t", p_patch: { first_name: "A" } });
    expect(await repo.completeLead("t", { pod: "x" })).toEqual({ id: "i", token: "t" });
    expect(rpc).toHaveBeenNthCalledWith(2, "complete_lead", { p_token: "t", p_data: { pod: "x" } });
    await expect(repo.updateLead("bad", {})).rejects.toBeInstanceOf(LeadNotFoundError);
  });

  it("rejects malformed rpc responses", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const repo = createSupabaseRepository(fakeClient(rpc));
    await expect(repo.createLead({ privacy_consent: true })).rejects.toThrow(/Unexpected response/);
  });
});
