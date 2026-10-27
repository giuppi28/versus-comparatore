/**
 * vCard 3.0 builder (RFC 2426) for the thank-you page "Salva il nostro numero".
 * Pure: no I/O. PHOTO is added only when a base64 PNG is supplied.
 */

export const VCARD_NAME = "VERSUS Comparatore";
export const VCARD_ORG = "VERSUS";

/** Escapes a TEXT value: backslash, semicolon, comma, newline (RFC 2426 §4). */
export function escapeVCardText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\;")
    .replace(/,/g, "\\,");
}

/** Folds a content line to at most 75 octets per line (continuations start with one space). */
export function foldVCardLine(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let size = 0;
  let limit = 75; // continuation lines carry a leading space, so 74 content octets
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (size + n > limit) {
      parts.push(current);
      current = "";
      size = 0;
      limit = 74;
    }
    current += ch;
    size += n;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export interface VCardInput {
  /** settings.callback_phone */
  phone: string;
  /** Base64 of a PNG; omitted when absent. */
  photoPngBase64?: string | null;
}

export function buildVCard({ phone, photoPngBase64 }: VCardInput): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:;${escapeVCardText(VCARD_NAME)};;;`,
    `FN:${escapeVCardText(VCARD_NAME)}`,
    `ORG:${escapeVCardText(VCARD_ORG)}`,
    `TEL;TYPE=WORK,VOICE:${escapeVCardText(phone.trim())}`,
  ];
  if (photoPngBase64) lines.push(`PHOTO;ENCODING=b;TYPE=PNG:${photoPngBase64}`);
  lines.push("END:VCARD");
  return lines.map(foldVCardLine).join("\r\n") + "\r\n";
}
