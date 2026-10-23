import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireAdmin = vi.fn();
const createSupabaseServerClient = vi.fn();
vi.mock("@/lib/auth", () => ({
  requireAdmin: (...a: unknown[]) => requireAdmin(...a),
  createSupabaseServerClient: (...a: unknown[]) => createSupabaseServerClient(...a),
}));

import { getAdminRepository } from "./admin";
import { getRepository, resetRepositoryCache } from "./index";

beforeEach(() => {
  requireAdmin.mockReset().mockResolvedValue({ id: "admin" });
  createSupabaseServerClient.mockReset();
  resetRepositoryCache();
});
afterEach(() => {
  vi.unstubAllEnvs();
  resetRepositoryCache();
});

describe("getAdminRepository", () => {
  it("mock mode returns the same instance as getRepository()", async () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "mock");
    expect(await getAdminRepository()).toBe(getRepository());
    expect(requireAdmin).toHaveBeenCalledTimes(1);
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("never returns a repository when the admin check redirects/throws", async () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "mock");
    requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(getAdminRepository()).rejects.toThrow("NEXT_REDIRECT");
  });

  it("supabase mode binds a repository to the cookie-session client", async () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "supabase");
    const single = vi.fn().mockResolvedValue({ data: { id: true, notification_email: "a@b.it" }, error: null });
    const upsert = vi.fn().mockReturnValue({ select: () => ({ single }) });
    const client = { from: vi.fn().mockReturnValue({ upsert }) };
    createSupabaseServerClient.mockResolvedValue(client);

    const repo = await getAdminRepository();
    expect(await repo.updateSettings({ notification_email: "a@b.it" })).toEqual({
      notification_email: "a@b.it",
      callback_phone: "+39 095 0000000",
    });
    expect(client.from).toHaveBeenCalledWith("settings");
    expect(upsert).toHaveBeenCalledWith({ id: true, notification_email: "a@b.it" });
    // A new repository per call (cookies are per request).
    expect(await getAdminRepository()).not.toBe(repo);
  });
});
