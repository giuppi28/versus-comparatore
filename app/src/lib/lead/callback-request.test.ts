import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CALLBACK_REQUEST_BUTTON_LABEL, CALLBACK_REQUEST_TEXT, CALLBACK_REQUEST_TEXT_MAX } from "./callback-request";

describe("callback request constant (SPEC #28)", () => {
  it("is the exact sentence of decision #28 and the button label it names", () => {
    expect(CALLBACK_REQUEST_TEXT).toBe(
      "Premendo «Richiamami» chiedi di essere ricontattato da un consulente VERSUS al numero di telefono che hai indicato, per attivare l'offerta scelta.",
    );
    expect(CALLBACK_REQUEST_BUTTON_LABEL).toBe("Richiamami");
    expect(CALLBACK_REQUEST_TEXT).toContain(`«${CALLBACK_REQUEST_BUTTON_LABEL}»`);
  });

  it("fits the DB limit (complete_lead / leads_callback_request_text_len)", () => {
    expect(CALLBACK_REQUEST_TEXT.trim()).toBe(CALLBACK_REQUEST_TEXT);
    expect([...CALLBACK_REQUEST_TEXT].length).toBeLessThanOrEqual(CALLBACK_REQUEST_TEXT_MAX);
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/20261102100000_lead_callback_request.sql"),
      "utf8",
    );
    expect(sql).toContain(`between 1 and ${CALLBACK_REQUEST_TEXT_MAX}`);
    expect(sql).toContain(`char_length(v_cb_text) > ${CALLBACK_REQUEST_TEXT_MAX}`);
  });

  it("step B renders the constant above the submit button labelled with it", () => {
    const src = readFileSync(join(process.cwd(), "src/components/activation/StepB.tsx"), "utf8");
    const sentence = src.indexOf("{CALLBACK_REQUEST_TEXT}");
    const submit = src.indexOf('data-testid="activation-submit"');
    expect(sentence).toBeGreaterThan(0);
    expect(submit).toBeGreaterThan(sentence);
    expect(src.slice(submit, submit + 200)).toContain("{CALLBACK_REQUEST_BUTTON_LABEL}");
    expect(src).not.toMatch(/>\s*Prosegui\s*</);
  });
});
