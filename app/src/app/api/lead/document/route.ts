/**
 * POST /api/lead/document — identity document upload for the current lead (Phase 12, E4).
 * multipart/form-data with a single `file` part (JPEG or PDF, max 5 MiB); bound to the
 * httpOnly lead cookie. Contract: src/lib/lead/api-types.ts and app/README.md.
 */
import { getLeadHandlers } from "@/lib/lead/handlers";

export async function POST(request: Request) {
  return getLeadHandlers().uploadDocument(request);
}
