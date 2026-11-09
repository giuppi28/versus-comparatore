import { describe, expect, it } from "vitest";
import { EXPLAINER_INTRO } from "./explainer";

describe("home explainer", () => {
  it("opens with the brand sentence", () => {
    expect(EXPLAINER_INTRO.startsWith("VERSUS è un comparatore luce e gas per la casa e per la partita IVA.")).toBe(true);
  });
});
