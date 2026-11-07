import { describe, expect, it } from "vitest";
import { requiredIdDocumentsMissing } from "./completion";

describe("requiredIdDocumentsMissing", () => {
  it("carta d'identità and patente need 2 files", () => {
    for (const t of ["carta_identita", "patente"] as const) {
      expect(requiredIdDocumentsMissing(t, 0)).toBe("id_document");
      expect(requiredIdDocumentsMissing(t, 1)).toBe("id_document");
      expect(requiredIdDocumentsMissing(t, 2)).toBeNull();
    }
  });
  it("passaporto needs 1 file", () => {
    expect(requiredIdDocumentsMissing("passaporto", 0)).toBe("id_document");
    expect(requiredIdDocumentsMissing("passaporto", 1)).toBeNull();
  });
  it("a missing type is refused on document_type, whatever the count", () => {
    expect(requiredIdDocumentsMissing(null, 2)).toBe("document_type");
    expect(requiredIdDocumentsMissing(undefined, 0)).toBe("document_type");
  });
  it("legacy uploads without a side are just counted", () => {
    expect(requiredIdDocumentsMissing("carta_identita", 2)).toBeNull();
  });
});
