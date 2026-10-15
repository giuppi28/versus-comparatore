import { describe, expect, it } from "vitest";
import {
  MANUAL_CHECKS,
  PRIVACY_PLACEHOLDERS,
  computeGoLiveChecks,
  hasRealTurnstileKeys,
  isReadyForGoLive,
  isTurnstileTestKey,
  type GoLiveInputs,
} from "./checks";

const READY: GoLiveInputs = {
  unverifiedActiveOffers: 0,
  notificationEmailSet: true,
  envRecipientSet: true,
  resendKeyPresent: true,
  resendFromPresent: true,
  turnstileReal: true,
  siteUrlPresent: true,
  dataSource: "supabase",
};

describe("go-live checks", () => {
  it("is ready only when every check passes", () => {
    expect(isReadyForGoLive(computeGoLiveChecks(READY))).toBe(true);
  });

  it.each([
    ["unverifiedActiveOffers", 8],
    ["notificationEmailSet", false],
    ["envRecipientSet", false],
    ["resendKeyPresent", false],
    ["resendFromPresent", false],
    ["turnstileReal", false],
    ["siteUrlPresent", false],
    ["dataSource", "mock"],
  ] as const)("is not ready when %s fails", (key, value) => {
    const checks = computeGoLiveChecks({ ...READY, [key]: value });
    expect(isReadyForGoLive(checks)).toBe(false);
    expect(checks.filter((c) => !c.ok)).toHaveLength(1);
  });

  it("pluralises the unverified offers detail", () => {
    const one = computeGoLiveChecks({ ...READY, unverifiedActiveOffers: 1 })[0];
    expect(one.detail).toBe("1 offerta attiva da verificare.");
    const many = computeGoLiveChecks({ ...READY, unverifiedActiveOffers: 8 })[0];
    expect(many.detail).toBe("8 offerte attive da verificare.");
  });

  it("only asks for NOTIFICATION_EMAIL in supabase mode", () => {
    expect(computeGoLiveChecks({ ...READY, dataSource: "mock" }).some((c) => c.id === "env-recipient")).toBe(false);
    expect(computeGoLiveChecks(READY).some((c) => c.id === "env-recipient")).toBe(true);
  });

  it("detects Cloudflare dummy Turnstile keys", () => {
    expect(isTurnstileTestKey("1x00000000000000000000AA")).toBe(true);
    expect(isTurnstileTestKey("2x0000000000000000000000000000000AA")).toBe(true);
    expect(isTurnstileTestKey("0x4AAAAAAABkMYinukE8nzYS")).toBe(false);
    expect(hasRealTurnstileKeys("0x4AAAAAAA", "0x4BBBBBBB")).toBe(true);
    expect(hasRealTurnstileKeys("1x00000000000000000000AA", "0x4BBBBBBB")).toBe(false);
    expect(hasRealTurnstileKeys("0x4AAAAAAA", "1x0000000000000000000000000000000AA")).toBe(false);
    expect(hasRealTurnstileKeys(undefined, "0x4BBBBBBB")).toBe(false);
    expect(hasRealTurnstileKeys("0x4AAAAAAA", "")).toBe(false);
  });

  it("keeps manual items out of the automatic checks and the ready computation", () => {
    const checks = computeGoLiveChecks(READY);
    for (const m of MANUAL_CHECKS) expect(checks.some((c) => c.id === m.id)).toBe(false);
    // Ready depends on automatic checks only: manual items never block it.
    expect(isReadyForGoLive(checks)).toBe(true);
  });

  it("lists the manual go-live items (three pending, one already done)", () => {
    expect(MANUAL_CHECKS.map((m) => m.id)).toEqual([
      "manual-signup-disabled",
      "manual-admin-account",
      "manual-privacy-placeholders",
      "manual-bootstrap-dropped",
    ]);
    expect(MANUAL_CHECKS[0].detail).toContain("Allow new users to sign up");
    expect(MANUAL_CHECKS[0].detail).toContain("Authentication → Sign In / Providers");
    expect(MANUAL_CHECKS[1].detail).toContain("public.admins");
    expect(MANUAL_CHECKS.filter((m) => !m.doneNote).map((m) => m.id)).toEqual([
      "manual-signup-disabled",
      "manual-admin-account",
      "manual-privacy-placeholders",
    ]);
  });

  it("lists every privacy placeholder in the pending privacy item", () => {
    expect(PRIVACY_PLACEHOLDERS).toHaveLength(6);
    const privacy = MANUAL_CHECKS.find((m) => m.id === "manual-privacy-placeholders")!;
    expect(privacy.doneNote).toBeUndefined();
    for (const ph of PRIVACY_PLACEHOLDERS) expect(privacy.detail).toContain(ph);
  });

  it("shows the bootstrap function item as done by the reviewer", () => {
    const b = MANUAL_CHECKS.find((m) => m.id === "manual-bootstrap-dropped")!;
    expect(b.label).toContain("public.bootstrap_load_comuni");
    expect(b.doneNote).toBe(
      "Completato dal revisore il 15/10/2026: funzione disattivata e spostata nello schema private.",
    );
  });
});
