import { describe, expect, it } from "vitest";
import { confirmTitle, deletedMessage, parseDeletedParam, selectedMessage } from "./delete-notice";

describe("deletedMessage", () => {
  it("uses singular and plural Italian forms", () => {
    expect(deletedMessage(1)).toBe("1 lead eliminato");
    expect(deletedMessage(2)).toBe("2 lead eliminati");
    expect(deletedMessage(37)).toBe("37 lead eliminati");
    expect(deletedMessage(0)).toBe("Nessun lead eliminato");
  });
});

describe("selectedMessage", () => {
  it("uses singular and plural Italian forms", () => {
    expect(selectedMessage(1)).toBe("1 selezionato");
    expect(selectedMessage(2)).toBe("2 selezionati");
    expect(selectedMessage(50)).toBe("50 selezionati");
  });
});

describe("confirmTitle", () => {
  it("states the number of leads", () => {
    expect(confirmTitle(1)).toBe("Eliminare 1 lead?");
    expect(confirmTitle(12)).toBe("Eliminare 12 lead?");
  });
});

describe("parseDeletedParam", () => {
  it("accepts small non-negative integers only", () => {
    expect(parseDeletedParam("3")).toBe(3);
    expect(parseDeletedParam(["5", "9"])).toBe(5);
    expect(parseDeletedParam("200")).toBe(200);
    for (const bad of [undefined, "", "-1", "1.5", "abc", "201", "9999", "<script>"]) {
      expect(parseDeletedParam(bad)).toBeNull();
    }
  });
});
