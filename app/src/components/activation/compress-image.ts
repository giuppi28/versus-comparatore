/**
 * Client-side preparation of the identity-document upload (step B): photos are decoded in
 * the browser, scaled down (long side <= 2000 px, never upscaled) and re-encoded as JPEG
 * (quality 0.8); PDFs go through unchanged. The server still only accepts JPEG/PDF.
 * The pure parts (dimensions, naming, kind and size decisions) are unit tested; the canvas
 * pipeline is covered by the Playwright spec.
 */
import { DOCUMENT_MAX_BYTES } from "@/lib/logic/validators/file-type";

export const IMAGE_MAX_SIDE = 2000;
export const IMAGE_JPEG_QUALITY = 0.8;

export type DocumentPrepareErrorCode = "file_type" | "file_size" | "file_missing" | "image_decode";

export class DocumentPrepareError extends Error {
  constructor(readonly code: DocumentPrepareErrorCode) {
    super(`Document preparation failed: ${code}`);
    this.name = "DocumentPrepareError";
  }
}

const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic", "heif"];

function extensionOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i < 0 ? "" : name.slice(i + 1).toLowerCase();
}

/** How a picked file is handled: re-encoded image, PDF as-is, or not accepted. */
export type DocumentKind = "image" | "pdf" | "unsupported";

/** Decides by MIME type, falling back to the extension (mobile browsers may send no type for HEIC). */
export function classifyDocument(file: { name: string; type: string }): DocumentKind {
  const type = file.type.toLowerCase();
  const ext = extensionOf(file.name);
  if (type === "application/pdf") return "pdf";
  if (IMAGE_MIMES.includes(type)) return "image";
  if (type === "" || type === "application/octet-stream") {
    if (ext === "pdf") return "pdf";
    if (IMAGE_EXTENSIONS.includes(ext)) return "image";
  }
  return "unsupported";
}

/** Target size: long side capped at `maxSide`, aspect ratio kept, never upscaled. */
export function targetDimensions(width: number, height: number, maxSide = IMAGE_MAX_SIDE): { width: number; height: number } {
  const longSide = Math.max(width, height);
  if (!(longSide > maxSide)) return { width, height };
  const scale = maxSide / longSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** "Foto documento.HEIC" -> "Foto documento.jpg" (only the last extension is replaced). */
export function jpegFileName(name: string): string {
  const base = name.replace(/^.*[\\/]/, "").trim();
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : base;
  return `${stem || "documento"}.jpg`;
}

export function exceedsSizeLimit(bytes: number): boolean {
  return bytes > DOCUMENT_MAX_BYTES;
}

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bmp, width: bmp.width, height: bmp.height, release: () => bmp.close() };
    } catch {
      // fall through to the <img> decoder
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    if (!img.naturalWidth || !img.naturalHeight) throw new Error("empty image");
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    throw new DocumentPrepareError("image_decode");
  }
}

async function compressImage(file: File): Promise<File> {
  const decoded = await decode(file);
  try {
    const { width, height } = targetDimensions(decoded.width, decoded.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new DocumentPrepareError("image_decode");
    ctx.fillStyle = "#ffffff"; // JPEG has no alpha: transparent PNG areas become white
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(decoded.source, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", IMAGE_JPEG_QUALITY));
    if (!blob || blob.type !== "image/jpeg") throw new DocumentPrepareError("image_decode");
    return new File([blob], jpegFileName(file.name), { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    decoded.release();
  }
}

/**
 * Returns the file to upload. Throws DocumentPrepareError: "file_missing" (empty file),
 * "file_type" (neither image nor PDF), "image_decode" (browser cannot read the photo),
 * "file_size" (still over 4 MB after compression, or a PDF over 4 MB).
 */
export async function prepareDocumentFile(file: File): Promise<File> {
  if (!file || file.size === 0) throw new DocumentPrepareError("file_missing");
  const kind = classifyDocument(file);
  if (kind === "unsupported") throw new DocumentPrepareError("file_type");
  if (kind === "pdf") {
    if (exceedsSizeLimit(file.size)) throw new DocumentPrepareError("file_size");
    return file.type === "application/pdf" ? file : new File([file], file.name, { type: "application/pdf" });
  }
  const out = await compressImage(file);
  if (exceedsSizeLimit(out.size)) throw new DocumentPrepareError("file_size");
  return out;
}
