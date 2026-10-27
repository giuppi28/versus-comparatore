import { beforeEach, describe, expect, it, vi } from "vitest";

const getDocument = vi.fn();

vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
  GlobalWorkerOptions: {},
  getDocument: (...args: unknown[]) => getDocument(...args),
}));

import { extractPdfText, MAX_BILL_PAGES } from "./extract";

function pdfFile(): File {
  return new File(["%PDF-1.7\n1 0 obj\n<<>>\nendobj\n"], "bolletta.pdf", { type: "application/pdf" });
}

function fakeDoc(pages: string[]) {
  const destroy = vi.fn().mockResolvedValue(undefined);
  const getPage = vi.fn(async (n: number) => ({
    getTextContent: async () => ({ items: [{ str: pages[n - 1], hasEOL: true }, { type: "beginMarkedContent" }] }),
  }));
  getDocument.mockReturnValue({ promise: Promise.resolve({ numPages: pages.length, getPage }), destroy });
  return { getPage, destroy };
}

describe("extractPdfText", () => {
  beforeEach(() => {
    getDocument.mockReset();
  });

  it("returns '' for a non-PDF file without loading pdf.js", async () => {
    const garbage = new File([new Uint8Array([1, 2, 3, 250, 251, 252])], "x.pdf", { type: "application/pdf" });
    expect(await extractPdfText(garbage)).toBe("");
    expect(await extractPdfText(new File(["hello"], "a.txt", { type: "text/plain" }))).toBe("");
    expect(getDocument).not.toHaveBeenCalled();
  });

  it("returns '' when pdf.js rejects (corrupt, encrypted, scanned)", async () => {
    const destroy = vi.fn().mockResolvedValue(undefined);
    getDocument.mockReturnValue({ promise: Promise.reject(new Error("PasswordException")), destroy });
    expect(await extractPdfText(pdfFile())).toBe("");
    expect(destroy).toHaveBeenCalled();
  });

  it("returns '' when the loader itself throws", async () => {
    getDocument.mockImplementation(() => {
      throw new Error("boom");
    });
    expect(await extractPdfText(pdfFile())).toBe("");
  });

  it("concatenates the text of the pages and destroys the document", async () => {
    const { destroy } = fakeDoc(["POD IT001E12345678", "PDR 00881234567890"]);
    const text = await extractPdfText(pdfFile());
    expect(text).toContain("POD IT001E12345678");
    expect(text).toContain("PDR 00881234567890");
    expect(destroy).toHaveBeenCalled();
  });

  it("reads at most MAX_BILL_PAGES pages", async () => {
    const { getPage } = fakeDoc(Array.from({ length: 12 }, (_, i) => `page ${i + 1}`));
    await extractPdfText(pdfFile());
    expect(getPage).toHaveBeenCalledTimes(MAX_BILL_PAGES);
  });
});
