import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  collectSecretValues,
  findBundleEnvProblems,
  findSecretValueLeaks,
  parseDotenv,
  SERVER_SECRET_KEYS,
} from "./check-bundle-env.mjs";

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

  it.each(["LEAD_API_SECRET", "TURNSTILE_SECRET_KEY", "RESEND_API_KEY", "ADMIN_MOCK_PASSWORD", "NOTIFICATION_EMAIL"])(
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

describe("LEAD_API_SECRET bundle guard", () => {
  const SECRET = "6f1e0c9a2b7d4e8f0a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f6071";
  let tmp: string | undefined;
  afterEach(() => {
    if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
    tmp = undefined;
  });

  it("is in the server secret list", () => {
    expect(SERVER_SECRET_KEYS).toContain("LEAD_API_SECRET");
  });

  it("rejects LEAD_API_SECRET embedded in next-env without echoing its value", () => {
    const problems = findBundleEnvProblems({ ...good, LEAD_API_SECRET: SECRET });
    expect(problems).toEqual(["LEAD_API_SECRET would be embedded in the worker bundle (non-public variable)"]);
    expect(problems.join(" ")).not.toContain(SECRET);
  });

  it("rejects a secret renamed to NEXT_PUBLIC_*", () => {
    for (const key of ["NEXT_PUBLIC_LEAD_API_SECRET", "NEXT_PUBLIC_RESEND_API_KEY", "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"]) {
      const problems = findBundleEnvProblems({ ...good, [key]: SECRET });
      expect(problems).toHaveLength(1);
      expect(problems[0]).toContain(key);
    }
    // Public keys that merely contain "KEY" stay allowed.
    expect(findBundleEnvProblems(good)).toEqual([]);
  });

  it("finds the secret value anywhere in the build output, reporting name + file only", () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bundle-env-"));
    fs.mkdirSync(path.join(tmp, "server", "chunks"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "server", "ok.js"), "const a = process.env.LEAD_API_SECRET;");
    fs.writeFileSync(path.join(tmp, "server", "chunks", "leak.js"), `const s="${SECRET}";`);
    const problems = findSecretValueLeaks(tmp, { LEAD_API_SECRET: SECRET });
    expect(problems).toEqual([`the value of LEAD_API_SECRET appears in ${path.join("server", "chunks", "leak.js")}`]);
    expect(problems.join(" ")).not.toContain(SECRET);
    expect(findSecretValueLeaks(tmp, { LEAD_API_SECRET: "short" })).toEqual([]);
    expect(findSecretValueLeaks(path.join(tmp, "missing"), { LEAD_API_SECRET: SECRET })).toEqual([]);
  });

  it("collects secret values from the env first, then the .env files", () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bundle-env-"));
    fs.writeFileSync(
      path.join(tmp, ".env.local"),
      `# c\nLEAD_API_SECRET="${SECRET}"\nRESEND_API_KEY=re_from_file_123456 # note\nNEXT_PUBLIC_X=1\nADMIN_MOCK_PASSWORD=short\n`,
    );
    expect(collectSecretValues(tmp, {})).toEqual({ LEAD_API_SECRET: SECRET, RESEND_API_KEY: "re_from_file_123456" });
    expect(collectSecretValues(tmp, { LEAD_API_SECRET: "from-env-0123456789" }).LEAD_API_SECRET).toBe("from-env-0123456789");
    expect(parseDotenv("export A='x y'\nB = 2\n#C=3")).toEqual({ A: "x y", B: "2" });
  });
});
