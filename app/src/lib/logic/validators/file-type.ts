export const DOCUMENT_MAX_BYTES = 4 * 1024 * 1024;
export const DOCUMENT_MAX_FILES = 2;
export const DOCUMENT_ALLOWED_MIMES = ["image/jpeg", "application/pdf"] as const;
export type DocumentMime = (typeof DOCUMENT_ALLOWED_MIMES)[number];

/** Detects the real file type from its magic bytes (JPEG `FF D8 FF`, PDF `%PDF-`). */
export function sniffDocumentType(bytes: Uint8Array): DocumentMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 5 &&
    bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d
  ) {
    return "application/pdf";
  }
  return null;
}
