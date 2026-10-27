/**
 * In-browser text extraction from a digital bill PDF (SPEC decision #21).
 * Nothing leaves the browser: pdfjs-dist runs locally, its worker is served from the package
 * (no CDN, no third-party service, no server-side parsing).
 * pdfjs-dist is loaded with a dynamic import only when a file is actually read, so it is
 * never part of the first-load JS of any route.
 */

/** Maximum number of pages read (bills put POD/PDR/CF/supplier on the first pages). */
export const MAX_BILL_PAGES = 6;
/** Give up on slow / pathological files. */
const EXTRACT_TIMEOUT_MS = 20_000;

/** True when the first bytes carry the "%PDF" signature (allowing a few bytes of leading junk). */
function hasPdfSignature(bytes: Uint8Array): boolean {
  const head = String.fromCharCode(...bytes.subarray(0, 1024));
  return head.includes("%PDF-");
}

async function readPdfText(data: Uint8Array): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const task = pdfjs.getDocument({ data, enableXfa: false, verbosity: 0 });
  try {
    const doc = await task.promise;
    const pages = Math.min(doc.numPages, MAX_BILL_PAGES);
    const chunks: string[] = [];
    for (let n = 1; n <= pages; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      let text = "";
      for (const item of content.items) {
        if (!("str" in item)) continue;
        text += item.str;
        text += item.hasEOL ? "\n" : " ";
      }
      chunks.push(text);
    }
    return chunks.join("\n");
  } finally {
    // Frees the worker; failures here must not hide the result.
    await task.destroy().catch(() => undefined);
  }
}

/**
 * Returns the text of the first pages of a PDF, or "" when the file is not a PDF, is scanned
 * (no text layer), encrypted, corrupt or takes too long. Never throws.
 */
export async function extractPdfText(file: File): Promise<string> {
  try {
    const data = new Uint8Array(await file.arrayBuffer());
    if (!hasPdfSignature(data)) return "";
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<string>((resolve) => {
      timer = setTimeout(() => resolve(""), EXTRACT_TIMEOUT_MS);
    });
    try {
      return await Promise.race([readPdfText(data), timeout]);
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return "";
  }
}
