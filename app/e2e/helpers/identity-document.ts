/**
 * Identity document helpers (T18.8): the document is mandatory in activation step B.
 * - `SEEDED_ID_DOCUMENT`: an activation fragment with the type and both sides already "uploaded",
 *   for specs that seed the flow state and mock POST /api/lead/complete.
 * - `uploadSide` / `uploadRequiredSides`: real uploads through the UI with the images in e2e/fixtures,
 *   for specs that talk to the real API.
 */
import path from "node:path";
import { expect, type Page } from "@playwright/test";

export const FIXTURES = path.join(__dirname, "..", "fixtures");
export const ID_FRONT = path.join(FIXTURES, "id-front.jpg");
export const ID_BACK = path.join(FIXTURES, "id-back.jpg");
export const PASSPORT_PAGE = path.join(FIXTURES, "passport.jpg");

const seededDoc = (id: string, side: "front" | "back") => ({
  id,
  kind: "id_document",
  mime_type: "image/jpeg",
  size_bytes: 3000,
  name: `${id}.jpg`,
  side,
});

/** Spread into the seeded `activation` object. */
export const SEEDED_ID_DOCUMENT = {
  documentType: "carta_identita",
  documents: [seededDoc("e2e-doc-front", "front"), seededDoc("e2e-doc-back", "back")],
};

export async function uploadSide(page: Page, side: "front" | "back", file: string) {
  await page.getByTestId(`document-file-${side}`).setInputFiles(file);
  await expect(page.getByTestId(`document-slot-${side}-badge`)).toBeVisible();
}

/** Picks the type and uploads the sides it needs; the section then collapses into "Documento caricato". */
export async function uploadRequiredSides(page: Page, type: "carta_identita" | "patente" | "passaporto" = "carta_identita") {
  await page.locator('[name="document_type"]').selectOption(type);
  await uploadSide(page, "front", type === "passaporto" ? PASSPORT_PAGE : ID_FRONT);
  if (type !== "passaporto") await uploadSide(page, "back", ID_BACK);
}
