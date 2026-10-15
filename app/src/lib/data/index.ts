import { createMockRepository } from "./mock/mock-repository";
import { createSupabaseClient, createSupabaseRepository } from "./supabase/supabase-repository";
import type { Repository } from "./repository";

export * from "./types";
export { normalizeSearch } from "./normalize";
export {
  LeadNotFoundError,
  PrivacyConsentRequiredError,
  DEFAULT_COMUNI_LIMIT,
} from "./repository";
export type { Repository } from "./repository";
export { createMockRepository } from "./mock/mock-repository";
export { createSupabaseRepository, createSupabaseClient } from "./supabase/supabase-repository";
export { MOCK_SUPPLIERS, MOCK_OFFERS, MOCK_COMUNI } from "./mock/data";

export type DataSource = "mock" | "supabase";

/** Resolves NEXT_PUBLIC_DATA_SOURCE (default "mock"). Throws on unknown values. */
export function getDataSource(): DataSource {
  // Must be a literal property access so Next inlines it in client bundles.
  const raw = (process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock").trim().toLowerCase();
  if (raw === "" || raw === "mock") return "mock";
  if (raw === "supabase") return "supabase";
  throw new Error(`Invalid NEXT_PUBLIC_DATA_SOURCE "${raw}" (expected "mock" or "supabase")`);
}

// Survive Next.js dev module reloads so the in-memory mock keeps its leads.
const globalForRepo = globalThis as unknown as { __versusRepo?: { source: DataSource; repo: Repository } };

/**
 * The single entry point for data access. Switch implementation with
 * NEXT_PUBLIC_DATA_SOURCE=mock|supabase.
 */
export function getRepository(): Repository {
  const source = getDataSource();
  const cached = globalForRepo.__versusRepo;
  if (cached && cached.source === source) return cached.repo;

  let repo: Repository;
  if (source === "mock") {
    repo = createMockRepository();
  } else {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      throw new Error(
        "NEXT_PUBLIC_DATA_SOURCE=supabase requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      );
    }
    repo = createSupabaseRepository(createSupabaseClient({ url, key }));
  }
  globalForRepo.__versusRepo = { source, repo };
  return repo;
}

/** Test helper: drop the cached repository. */
export function resetRepositoryCache() {
  globalForRepo.__versusRepo = undefined;
}
