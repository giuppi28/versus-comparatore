/**
 * GET /api/cron/keepalive — Supabase keep-alive, called once a day by the Vercel Cron Job
 * declared in app/vercel.json. Protected by CRON_SECRET (see src/lib/keepalive.ts).
 */
import { createKeepAliveHandler, defaultKeepAliveDeps } from "@/lib/keepalive";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return createKeepAliveHandler(defaultKeepAliveDeps())(request);
}
