/**
 * Server-only source of LEAD_API_SECRET (T8.2 / Q6): the shared secret the server passes as
 * `p_secret` to create_lead / update_lead / complete_lead. The DB stores only its SHA-256.
 *
 * Importing this module registers the reader with the Supabase repository; the env var is
 * read at call time. The value is never logged and never leaves the server except in the RPC.
 * In mock mode it is not needed.
 */
import "server-only";
import { registerLeadSecretProvider } from "@/lib/data/supabase/supabase-repository";

export function readLeadApiSecret(): string | undefined {
  return process.env.LEAD_API_SECRET;
}

registerLeadSecretProvider(readLeadApiSecret);
