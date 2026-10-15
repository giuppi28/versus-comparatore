# PROGRESS — append-only log (builder)

Format: `## YYYY-MM-DD HH:MM — T<id> <title>` · what changed · how verified · commit.

## 2026-10-15 11:50 — T0.1–T0.5 Setup (scaffold, tooling, UI kit, data layer)
- Agent: setup-builder (sonnet).
- Changed: Next.js 16.4 app in `app/` (TS strict, Tailwind, ESLint), git init + origin; Vitest + Playwright (desktop 1440 / mobile 390); VERSUS green design tokens + UI kit (`src/components/ui`); `.env.example` (empty values), `.env.local` (gitignored), `app/README.md`; data-access layer `src/lib/data` with mock + Supabase repositories switched by `NEXT_PUBLIC_DATA_SOURCE`.
- Notes: removed generated `cacheComponents`/`partialPrefetching` from next.config (cookie/token routes, OpenNext); lead.commodity = luce|gas|dual; current_supplier_* stores suppliers.id; special dropdown options seeded as supplier rows without offers. RPC contract documented in `supabase-repository.ts`.
- Verified by orchestrator: typecheck ✓, lint ✓, vitest 76/76 ✓, e2e smoke 2/2 (desktop+mobile) ✓.
- Commit: 4431fb4
