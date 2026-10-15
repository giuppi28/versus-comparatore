import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  checkBuild,
  collectBuildEnv,
  collectSecretValues,
  findPublicEnvProblems,
  findSecretValueLeaks,
  parseDotenv,
  SERVER_SECRET_KEYS,
} from "./check-bundle-env.mjs";

const good = {
  NEXT_PUBLIC_DATA_SOURCE: "supabase",
  NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x",
  NEXT_PUBLIC_SITE_URL: "https://versus.example",
  // Server-only variables are fine in the build env: Next never inlines them.
  LEAD_API_SECRET: "x".repeat(64),
  RESEND_API_KEY: "re_123",
};

const SECRET = "6f1e0c9a2b7d4e8f0a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f6071";

let tmp: string | undefined;
afterEach(() => {
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  tmp = undefined;
});
const mkTmp = () => (tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bundle-env-")));

describe("findPublicEnvProblems", () => {
  it("accepts public + server-only variables", () => {
    expect(findPublicEnvProblems(good)).toEqual([]);
    expect(findPublicEnvProblems(good, { requireSupabase: true })).toEqual([]);
  });

  it("rejects a secret renamed to NEXT_PUBLIC_* without echoing its value", () => {
    for (const key of [
      "NEXT_PUBLIC_LEAD_API_SECRET",
      "NEXT_PUBLIC_RESEND_API_KEY",
      "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
      "NEXT_PUBLIC_ADMIN_PASSWORD",
      "NEXT_PUBLIC_CRON_SECRET",
    ]) {
      const problems = findPublicEnvProblems({ ...good, [key]: SECRET });
      expect(problems).toHaveLength(1);
      expect(problems[0]).toContain(key);
      expect(problems.join(" ")).not.toContain(SECRET);
    }
    // Empty placeholders leak nothing; public keys that merely contain "KEY" stay allowed.
    expect(findPublicEnvProblems({ ...good, NEXT_PUBLIC_LEAD_API_SECRET: " " })).toEqual([]);
  });

  it("strict mode requires the supabase data source and public config", () => {
    expect(findPublicEnvProblems({ ...good, NEXT_PUBLIC_DATA_SOURCE: "mock" })).toEqual([]);
    expect(findPublicEnvProblems({ ...good, NEXT_PUBLIC_DATA_SOURCE: "mock" }, { requireSupabase: true })[0]).toContain(
      "supabase",
    );
    const { NEXT_PUBLIC_SUPABASE_URL: _url, ...withoutUrl } = good;
    void _url;
    expect(findPublicEnvProblems(withoutUrl, { requireSupabase: true })).toEqual(["NEXT_PUBLIC_SUPABASE_URL is missing"]);
  });
});

describe("LEAD_API_SECRET bundle guard", () => {
  it("covers every server secret", () => {
    expect(SERVER_SECRET_KEYS).toEqual(
      expect.arrayContaining(["LEAD_API_SECRET", "RESEND_API_KEY", "CRON_SECRET", "ADMIN_MOCK_SESSION_SECRET"]),
    );
  });

  it("finds the secret value anywhere in the build output, reporting name + file only", () => {
    const root = mkTmp();
    fs.mkdirSync(path.join(root, "static", "chunks"), { recursive: true });
    fs.writeFileSync(path.join(root, "static", "ok.js"), "const a = process.env.LEAD_API_SECRET;");
    fs.writeFileSync(path.join(root, "static", "chunks", "leak.js"), `const s="${SECRET}";`);
    const problems = findSecretValueLeaks(root, { LEAD_API_SECRET: SECRET });
    expect(problems).toEqual([`the value of LEAD_API_SECRET appears in ${path.join("static", "chunks", "leak.js")}`]);
    expect(problems.join(" ")).not.toContain(SECRET);
    expect(findSecretValueLeaks(root, { LEAD_API_SECRET: "short" })).toEqual([]);
    expect(findSecretValueLeaks(path.join(root, "missing"), { LEAD_API_SECRET: SECRET })).toEqual([]);
  });

  it("skips only the top-level cache / dev folders of .next", () => {
    const root = mkTmp();
    for (const d of ["cache", "dev", path.join("server", "cache")]) {
      fs.mkdirSync(path.join(root, d), { recursive: true });
      fs.writeFileSync(path.join(root, d, "x.js"), SECRET);
    }
    expect(findSecretValueLeaks(root, { LEAD_API_SECRET: SECRET })).toEqual([
      `the value of LEAD_API_SECRET appears in ${path.join("server", "cache", "x.js")}`,
    ]);
  });

  it("collects secret values from the env first, then the .env files", () => {
    const dir = mkTmp();
    fs.writeFileSync(
      path.join(dir, ".env.local"),
      `# c\nLEAD_API_SECRET="${SECRET}"\nRESEND_API_KEY=re_from_file_123456 # note\nNEXT_PUBLIC_X=1\nADMIN_MOCK_PASSWORD=short\n`,
    );
    expect(collectSecretValues(dir, {})).toEqual({ LEAD_API_SECRET: SECRET, RESEND_API_KEY: "re_from_file_123456" });
    expect(collectSecretValues(dir, { LEAD_API_SECRET: "from-env-0123456789" }).LEAD_API_SECRET).toBe("from-env-0123456789");
    expect(parseDotenv("export A='x y'\nB = 2\n#C=3")).toEqual({ A: "x y", B: "2" });
    expect(collectBuildEnv(dir, { NEXT_PUBLIC_X: "2" }).NEXT_PUBLIC_X).toBe("2");
  });

  it("checkBuild: needs a build, passes a clean one, fails a leaking one", () => {
    const dir = mkTmp();
    expect(checkBuild({ dir, env: {} })[0]).toContain("no production build");
    fs.mkdirSync(path.join(dir, ".next", "static", "chunks"), { recursive: true });
    fs.writeFileSync(path.join(dir, ".next", "BUILD_ID"), "abc");
    fs.writeFileSync(path.join(dir, ".next", "static", "chunks", "app.js"), "console.log(1)");
    const env = { ...good, LEAD_API_SECRET: SECRET };
    expect(checkBuild({ dir, env, strict: true })).toEqual([]);
    fs.writeFileSync(path.join(dir, ".next", "static", "chunks", "bad.js"), `x="${SECRET}"`);
    const problems = checkBuild({ dir, env });
    expect(problems).toEqual([
      `the value of LEAD_API_SECRET appears in ${path.join("static", "chunks", "bad.js")}`,
    ]);
    expect(problems.join(" ")).not.toContain(SECRET);
  });
});
