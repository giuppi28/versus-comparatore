import { describe, expect, it } from "vitest";
import { computeGoLiveChecks, hasRealTurnstileKeys, isReadyForGoLive, isTurnstileTestKey, type GoLiveInputs } from "./checks";

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
});
