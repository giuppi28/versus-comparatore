import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getRepository, resetMockRepository, resetRepositoryCache } from "./index";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "mock");
  resetRepositoryCache();
});
afterEach(() => {
  vi.unstubAllEnvs();
  resetRepositoryCache();
});

describe("mock repository singleton", () => {
  it("is shared process-wide, also across module reloads (globalThis)", async () => {
    const a = getRepository();
    vi.resetModules();
    const fresh = await import("./index");
    expect(fresh.getRepository()).toBe(a);
  });

  it("makes an admin change visible to the public reads of the same instance", async () => {
    const admin = getRepository();
    const [offer] = await getRepository().listActiveOffers("luce", "casa");
    await admin.setOfferFlags(offer.id, { active: false });
    expect((await getRepository().listActiveOffers("luce", "casa")).map((o) => o.id)).not.toContain(offer.id);
  });

  it("resetMockRepository restores the seed data in a new instance", async () => {
    const before = getRepository();
    const [offer] = await before.listActiveOffers("luce", "casa");
    await before.setOfferFlags(offer.id, { active: false });
    await before.createLead({ privacy_consent: true });

    const after = resetMockRepository();
    expect(after).not.toBe(before);
    expect(getRepository()).toBe(after);
    expect((await after.listActiveOffers("luce", "casa")).map((o) => o.id)).toContain(offer.id);
    expect(await after.listLeads()).toEqual([]);
  });

  it("resetMockRepository is refused in production and outside mock mode", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => resetMockRepository()).toThrow(/production/);
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "supabase");
    expect(() => resetMockRepository()).toThrow(/only works/);
  });
});
