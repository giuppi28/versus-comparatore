import { describe, expect, it } from "vitest";
import { LEAD_ROW_FIELDS } from "./row-data";

describe("LEAD_ROW_FIELDS", () => {
  it("never exposes the secret token (or notes/PII not shown in the list)", () => {
    expect(LEAD_ROW_FIELDS).not.toContain("token" as never);
    expect(LEAD_ROW_FIELDS).not.toContain("notes" as never);
    expect(LEAD_ROW_FIELDS).not.toContain("tax_code" as never);
  });
});
