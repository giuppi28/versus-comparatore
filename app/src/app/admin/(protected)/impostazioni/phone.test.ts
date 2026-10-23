import { describe, expect, it } from "vitest";
import { normalizeCallbackPhone } from "./phone";

describe("normalizeCallbackPhone", () => {
  it.each([
    ["+39 095 0000000", "+39 095 0000000"],
    ["  +39   06  7654321 ", "+39 06 7654321"],
    ["0950000000", "0950000000"],
    ["", "+39 095 0000000"],
  ])("accepts %j", (input, out) => expect(normalizeCallbackPhone(input)).toBe(out));

  it.each(["12345", "+39 095 0000000 1234567", "+39-095-000", "abc123456", "39+095000000", "+39 (095) 000"])(
    "rejects %j",
    (input) => expect(normalizeCallbackPhone(input)).toBeNull(),
  );
});
