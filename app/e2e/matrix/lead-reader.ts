/**
 * Reads a lead back from the SERVER through the real admin pages (list search -> detail), using the
 * mock-admin session. This is the most reliable way to prove what the repository really stored: the
 * mock repository lives inside the Next server process (not reachable from the test runner), and the
 * admin detail page renders every stored column as <dt>label</dt><dd>value</dd>.
 */
import { expect, type APIRequestContext } from "@playwright/test";

export interface LeadView {
  id: string;
  step: string; // data-step of the step badge (page1|results|offer_chosen|completed)
  status: string; // data-status of the status badge
  /** label -> value; "—" (empty) is returned as null. */
  fields: Record<string, string | null>;
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#x27;": "'",
  "&#39;": "'",
  "&nbsp;": " ",
};

function decode(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&(amp|lt|gt|quot|#x27|#39|nbsp);/g, (m) => ENTITIES[m] ?? m)
    .replace(/[  ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseLeadDetail(html: string): Omit<LeadView, "id"> {
  const fields: Record<string, string | null> = {};
  const re = /<dt[^>]*>([^<]*)<\/dt><dd[^>]*>([\s\S]*?)<\/dd>/g;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    // The admin renders "Distributore: …" next to POD/PDR: drop it so the field holds the code only.
    const value = decode(m[2]).replace(/\s*Distributore:.*$/, "").trim();
    fields[decode(m[1])] = value === "" || value === "—" ? null : value;
  }
  const step = /data-testid="step-badge"[^>]*data-step="([a-z_0-9]+)"/.exec(html)?.[1] ?? /data-step="([a-z_0-9]+)"[^>]*data-testid="step-badge"/.exec(html)?.[1] ?? "";
  const status = /data-testid="status-badge"[^>]*data-status="([a-z_]+)"/.exec(html)?.[1] ?? /data-status="([a-z_]+)"[^>]*data-testid="status-badge"/.exec(html)?.[1] ?? "";
  return { step, status, fields };
}

/** Finds the (single) lead matching the search term; returns null while it does not exist yet. */
export async function findLeadId(admin: APIRequestContext, term: string): Promise<string | null> {
  const res = await admin.get(`/admin/leads?tab=tutti&q=${encodeURIComponent(term)}`, { maxRedirects: 0 });
  expect(res.status(), `admin list for "${term}"`).toBe(200);
  const html = await res.text();
  const ids = [...new Set([...html.matchAll(/href="\/admin\/leads\/([0-9a-f-]{36})"/g)].map((m) => m[1]))];
  if (ids.length > 1) throw new Error(`Search "${term}" matched ${ids.length} leads: not unique`);
  return ids[0] ?? null;
}

export async function readLead(admin: APIRequestContext, id: string): Promise<LeadView> {
  const res = await admin.get(`/admin/leads/${id}`, { maxRedirects: 0 });
  expect(res.status(), `admin detail ${id}`).toBe(200);
  return { id, ...parseLeadDetail(await res.text()) };
}

/**
 * Polls until the lead identified by `term` (its unique phone number) exists and `until(lead)` holds
 * (the customer flow updates the lead in the background, so the server state converges shortly after
 * the UI moved on). Returns the last view; the caller asserts on it.
 */
export async function waitForLead(
  admin: APIRequestContext,
  term: string,
  until: (lead: LeadView) => boolean = () => true,
  timeoutMs = 15_000,
): Promise<LeadView> {
  const deadline = Date.now() + timeoutMs;
  let last: LeadView | null = null;
  for (;;) {
    const id = await findLeadId(admin, term);
    if (id) {
      last = await readLead(admin, id);
      if (until(last)) return last;
    }
    if (Date.now() > deadline) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  if (!last) throw new Error(`No lead found for "${term}" within ${timeoutMs} ms`);
  return last;
}
