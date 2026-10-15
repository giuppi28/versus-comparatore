/** POST /api/lead/complete — final submit of the activation form (PRD §10). */
import { getLeadHandlers } from "@/lib/lead/handlers";

export async function POST(request: Request) {
  return getLeadHandlers().complete(request);
}
