/**
 * Lead lifecycle API (PRD §5.1). Contract: src/lib/lead/api-types.ts and app/README.md
 * ("Customer flow state & lead API").
 *   POST   /api/lead  create on Page 1 privacy consent (rate limited per IP)
 *   PATCH  /api/lead  update own lead (httpOnly cookie token)
 *   DELETE /api/lead  forget the lead in this browser (expires the cookies)
 */
import { getLeadHandlers } from "@/lib/lead/handlers";

export async function POST(request: Request) {
  return getLeadHandlers().create(request);
}

export async function PATCH(request: Request) {
  return getLeadHandlers().update(request);
}

export async function DELETE(request: Request) {
  return getLeadHandlers().clear(request);
}
