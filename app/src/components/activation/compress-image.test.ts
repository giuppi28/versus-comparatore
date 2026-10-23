import { describe, expect, it } from "vitest";
import { DOCUMENT_MAX_BYTES } from "@/lib/logic/validators/file-type";
import {
  classifyDocument,
  exceedsSizeLimit,
  jpegFileName,
  prepareDocumentFile,
  targetDimensions,
} from "./compress-image";

describe("targetDimensions", () => {
  it("never upscales", () => {
    expect(targetDimensions(800, 600)).toEqual({ width: 800, height: 600 });
    expect(targetDimensions(2000, 1500)).toEqual({ width: 2000, height: 1500 });
  });
  it("caps the long side at 2000 keeping the ratio", () => {
    expect(targetDimensions(4000, 3000)).toEqual({ width: 2000, height: 1500 });
    expect(targetDimensions(3000, 6000)).toEqual({ width: 1000, height: 2000 });
  });
  it("never returns a zero side", () => {
    expect(targetDimensions(100000, 10)).toEqual({ width: 2000, height: 1 });
  });
});

describe("jpegFileName", () => {
  it("replaces the extension with .jpg", () => {
    expect(jpegFileName("foto.png")).toBe("foto.jpg");
    expect(jpegFileName("IMG_0001.HEIC")).toBe("IMG_0001.jpg");
    expect(jpegFileName("carta.fronte.webp")).toBe("carta.fronte.jpg");
    expect(jpegFileName("senza-estensione")).toBe("senza-estensione.jpg");
    expect(jpegFileName("C:\\foto\\a.jpeg")).toBe("a.jpg");
    expect(jpegFileName(".png")).toBe(".png.jpg");
  });
});

describe("classifyDocument", () => {
  it("passes PDFs through and re-encodes images", () => {
    expect(classifyDocument({ name: "a.pdf", type: "application/pdf" })).toBe("pdf");
    for (const type of ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]) {
      expect(classifyDocument({ name: "a", type })).toBe("image");
    }
  });
  it("falls back to the extension only when the browser gives no type", () => {
    expect(classifyDocument({ name: "IMG.HEIC", type: "" })).toBe("image");
    expect(classifyDocument({ name: "x.pdf", type: "" })).toBe("pdf");
    expect(classifyDocument({ name: "x.heic", type: "text/plain" })).toBe("unsupported");
  });
  it("rejects other types", () => {
    expect(classifyDocument({ name: "a.gif", type: "image/gif" })).toBe("unsupported");
    expect(classifyDocument({ name: "a.docx", type: "" })).toBe("unsupported");
  });
});

describe("size limit and PDF passthrough", () => {
  it("limit is 4 MB inclusive", () => {
    expect(exceedsSizeLimit(DOCUMENT_MAX_BYTES)).toBe(false);
    expect(exceedsSizeLimit(DOCUMENT_MAX_BYTES + 1)).toBe(true);
  });
  it("returns a small PDF unchanged and rejects a big one", async () => {
    const pdf = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "a.pdf", { type: "application/pdf" });
    expect(await prepareDocumentFile(pdf)).toBe(pdf);
    const big = new File([new Uint8Array(DOCUMENT_MAX_BYTES + 1)], "b.pdf", { type: "application/pdf" });
    await expect(prepareDocumentFile(big)).rejects.toMatchObject({ code: "file_size" });
  });
  it("rejects empty and unsupported files", async () => {
    await expect(prepareDocumentFile(new File([], "a.jpg", { type: "image/jpeg" }))).rejects.toMatchObject({ code: "file_missing" });
    await expect(prepareDocumentFile(new File([new Uint8Array(4)], "a.gif", { type: "image/gif" }))).rejects.toMatchObject({
      code: "file_type",
    });
  });
});
