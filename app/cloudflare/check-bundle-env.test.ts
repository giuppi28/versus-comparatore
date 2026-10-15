import { describe, expect, it } from "vitest";
import { findBundleEnvProblems } from "./check-bundle-env.mjs";

const good = {
  NEXT_PUBLIC_DATA_SOURCE: "supabase",
  NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "0x4AAA",
  NEXT_PUBLIC_SITE_URL: "https://versus.example",
};

describe("findBundleEnvProblems", () => {
  it("accepts a bundle with only public variables", () => {
    expect(findBundleEnvProblems(good)).toEqual([]);
  });

  it.each(["TURNSTILE_SECRET_KEY", "RESEND_API_KEY", "ADMIN_MOCK_PASSWORD", "NOTIFICATION_EMAIL"])(
    "rejects embedded non-public variable %s",
    (key) => {
      const problems = findBundleEnvProblems({ ...good, [key]: "value" });
      expect(problems).toHaveLength(1);
      expect(problems[0]).toContain(key);
    },
  );

  it("ignores empty non-public placeholders", () => {
    expect(findBundleEnvProblems({ ...good, RESEND_API_KEY: "" })).toEqual([]);
  });

  it("rejects mock data source and missing Supabase config", () => {
    expect(findBundleEnvProblems({ ...good, NEXT_PUBLIC_DATA_SOURCE: "mock" })[0]).toContain("supabase");
    const { NEXT_PUBLIC_SUPABASE_URL: _url, ...withoutUrl } = good;
    void _url;
    expect(findBundleEnvProblems(withoutUrl)).toEqual(["NEXT_PUBLIC_SUPABASE_URL is missing"]);
  });
});
