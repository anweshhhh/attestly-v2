# Build Log

## 2026-03-25 - Deployment-platform migration to Neon Postgres and Vercel Blob
- What changed:
  Migrated the production runtime from SQLite plus local uploaded-file storage to Neon-compatible Postgres and Vercel Blob-backed evidence storage.
  Switched Prisma to a Postgres datasource, added a checked-in Postgres baseline migration plus a narrow deploy-time Postgres migration runner, and replaced the server-action evidence upload path with direct Blob uploads plus server-side finalization and processing.
  Updated env validation, local/test runtime helpers, README, launch runbook, and handoff docs so the shipped phase-1 wedge now has one explicit Vercel + Neon + Blob deployment story.
- Why it changed:
  Master Control chose to avoid a temporary SQLite/local-uploads hosting path and go straight to the long-term Vercel deployment shape before launch.
  This patch removes the remaining production-critical local persistence assumptions without changing the shipped product workflow.
- Files touched:
  `package.json`
  `package-lock.json`
  `.env.example`
  `README.md`
  `docs/launch-runbook.md`
  `prisma/schema.prisma`
  `prisma/postgres-migrations/0001_postgres_baseline/migration.sql`
  `scripts/apply-postgres-migrations.mjs`
  `scripts/reset-postgres-database.mjs`
  `src/lib/env.ts`
  `src/lib/env.test.ts`
  `src/lib/extract-text.ts`
  `src/lib/evidence-paths.ts`
  `src/lib/storage.ts`
  `src/lib/evidence.ts`
  `src/lib/evidence.test.ts`
  `src/app/actions.ts`
  `src/app/api/evidence/upload-token/route.ts`
  `src/app/w/[workspaceSlug]/evidence/page.tsx`
  `src/components/evidence-upload-card.tsx`
  `src/app/globals.css`
  `src/test/postgres-runtime.ts`
  `src/test/setup.ts`
  `src/test/test-helpers.ts`
  `docs/build-log.md`
  `docs/context.md`
  `docs/review-brief.md`
- Assumptions introduced:
  Production deployments now require Neon Postgres connection strings plus Vercel Blob configuration; local disk uploads are no longer part of the supported production path.
  Local development and automated tests may use the mock Blob backend, but the production runtime is explicitly `vercel-blob`.
  Legacy SQLite migration files remain only as historical pre-migration reference; the live deploy path uses `prisma/postgres-migrations`.
- Risks / watchouts:
  Evidence uploads now rely on direct browser-to-Blob uploads, so launch config must include working Blob credentials and the evidence token route on the real domain.
  The custom Postgres migration runner is now the deployment path; future schema changes need to add SQL migrations under `prisma/postgres-migrations` rather than relying on the retired SQLite runner.
  Vercel deployment still depends on correct Google OAuth config, Neon pooled/direct URLs, and Blob token wiring.
- Tests run:
  `DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:55432/attestly_dev?schema=public' DIRECT_DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:55432/attestly_dev?schema=public' npx prisma validate`
  `DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:55432/attestly_dev?schema=public' DIRECT_DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:55432/attestly_dev?schema=public' npx prisma generate`
  `DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:55432/attestly_dev?schema=public' DIRECT_DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:55432/attestly_dev?schema=public' npm run db:migrate:deploy`
  `npx tsc --noEmit`
  `TEST_DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:55432/attestly_test?schema=public' TEST_DIRECT_DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:55432/attestly_test?schema=public' BLOB_STORAGE_BACKEND='mock' npm test`
  `NODE_ENV=production DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:55432/attestly_dev?schema=public' DIRECT_DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:55432/attestly_dev?schema=public' BLOB_STORAGE_BACKEND='vercel-blob' BLOB_READ_WRITE_TOKEN='vercel_blob_rw_test' AUTH_SECRET='prod-like-auth-secret' NEXTAUTH_URL='https://app.attestly.example' GOOGLE_CLIENT_ID='prod-google-client-id' GOOGLE_CLIENT_SECRET='prod-google-client-secret' npm run build`
- Next step:
  Provision the real Neon database, Vercel Blob store, and Vercel env vars on the launch project, then run the launch runbook against the real deployment.

## 2026-03-25 - Launch rollout and stabilization prep
- What changed:
  Added a compact launch runbook for the shipped phase-1 wedge and linked it from the README.
  The runbook now captures launch-day env requirements, persistent storage requirements, Google OAuth setup, pre-launch validation, the end-to-end smoke checklist, stop-ship criteria, and immediate post-launch stabilization expectations.
- Why it changed:
  The wedge was already launch-ready in code, but rollout execution still needed one practical source of truth for operators so launch could be run in a controlled way without guesswork.
- Files touched:
  `docs/launch-runbook.md`
  `README.md`
  `docs/build-log.md`
  `docs/context.md`
  `docs/review-brief.md`
- Assumptions introduced:
  No new product or runtime assumptions were added; this is rollout guidance for the already accepted launch shape.
- Risks / watchouts:
  Launch still depends on following the runbook exactly, especially around persistent storage paths and real-domain Google OAuth callback configuration.
- Tests run:
  No new code changes; this task documented rollout verification and launch execution steps for the already verified phase-1 wedge.
- Next step:
  Execute the controlled launch checklist on the real launch environment and treat any failed smoke step marked as a stop-ship issue.

## 2026-03-25 - Launch-readiness auth upgrade
- What changed:
  Replaced the preview-grade email/bootstrap login and custom session-cookie path with verified Google OAuth on `next-auth` JWT sessions.
  Added a narrow Auth.js configuration, Google sign-in and sign-out UI, server-side session resolution through the new auth layer, env hardening for OAuth configuration, auth regression tests, and a wedge smoke test that starts from verified sign-in before running the existing phase-1 workflow.
  Updated README, `.env.example`, and the handoff docs for the new auth setup.
- Why it changed:
  Deployment-readiness work was already complete, but broader public launch was still blocked by the old preview-grade auth model.
  This patch upgrades identity verification and session handling without changing the phase-1 product workflow, workspace membership model, or RBAC semantics.
- Files touched:
  `package.json`
  `package-lock.json`
  `.env.example`
  `README.md`
  `src/lib/env.ts`
  `src/lib/auth-config.ts`
  `src/lib/auth.ts`
  `src/lib/workspaces.ts`
  `src/app/actions.ts`
  `src/app/api/auth/[...nextauth]/route.ts`
  `src/app/login/page.tsx`
  `src/components/app-shell.tsx`
  `src/components/google-sign-in-button.tsx`
  `src/components/sign-out-button.tsx`
  `src/types/next-auth.d.ts`
  `src/test/setup.ts`
  `src/lib/env.test.ts`
  `src/lib/auth-config.test.ts`
  `src/lib/auth.test.ts`
  `src/lib/deployment-smoke.test.ts`
  `docs/build-log.md`
  `docs/context.md`
  `docs/review-brief.md`
- Assumptions introduced:
  Public launch now depends on a Google OAuth client as the verified-identity provider for the current phase-1 wedge.
  Existing `User.email` and `Membership` rows remain the canonical mapping layer; verified sign-in resolves onto that same model instead of introducing a separate account-management surface.
  The legacy Prisma `Session` table remains in the schema for now, but the live runtime no longer depends on it.
- Risks / watchouts:
  Public launch now depends on correct OAuth configuration: `AUTH_SECRET` or `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET` must all be set correctly.
  This patch intentionally stays narrow: it does not add enterprise SSO, invitation-acceptance flows, or broader account-management features.
- Tests run:
  `DATABASE_URL='file:./test.db' AUTH_SECRET='test-attestly-v2-auth-secret' NEXTAUTH_URL='http://localhost:3000' GOOGLE_CLIENT_ID='test-google-client-id' GOOGLE_CLIENT_SECRET='test-google-client-secret' npx tsc --noEmit`
  `DATABASE_URL='file:./test.db' AUTH_SECRET='test-attestly-v2-auth-secret' NEXTAUTH_URL='http://localhost:3000' GOOGLE_CLIENT_ID='test-google-client-id' GOOGLE_CLIENT_SECRET='test-google-client-secret' npm test`
  `DATABASE_URL='file:/.../prisma/test.db' AUTH_SECRET='prod-like-auth-secret' NEXTAUTH_URL='https://app.attestly.example' GOOGLE_CLIENT_ID='prod-google-client-id' GOOGLE_CLIENT_SECRET='prod-google-client-secret' npm run db:migrate:deploy`
  `DATABASE_URL='file:/.../prisma/test.db' UPLOADS_ROOT='/.../uploads-test' AUTH_SECRET='prod-like-auth-secret' NEXTAUTH_URL='https://app.attestly.example' GOOGLE_CLIENT_ID='prod-google-client-id' GOOGLE_CLIENT_SECRET='prod-google-client-secret' npm run build`
- Next step:
  The auth blocker for broader public launch is now resolved.
  The next work should be deployment and monitoring for the shipped phase-1 wedge or an explicitly new post-phase-1 scope decision.

## 2026-03-25 - Deployment-readiness and stabilization prep
- What changed:
  Hardened the shipped phase-1 runtime for hosted deployment without changing the product wedge.
  Added production env validation, configurable persistent uploads storage, HMAC-backed session token hashing, a server-action body-size fix for 10 MB evidence uploads, a repo-local SQLite migration runner for deploy/init, hosted-safe export response headers, and focused deployment smoke coverage.
  Updated README and handoff docs so deployment expectations are explicit.
- Why it changed:
  Phase 1 was functionally complete, but the runtime still assumed local-disk defaults, a local-dev migration path, and unclear production config. This patch makes the current wedge deployable in a hosted stateful environment without expanding scope.
- Files touched:
  `package.json`
  `.env.example`
  `next.config.js`
  `README.md`
  `prisma/migrations/migration_lock.toml`
  `scripts/apply-sqlite-migrations.mjs`
  `src/lib/env.ts`
  `src/lib/session.ts`
  `src/app/actions.ts`
  `src/app/layout.tsx`
  `src/app/login/page.tsx`
  `src/app/w/[workspaceSlug]/evidence/page.tsx`
  `src/app/w/[workspaceSlug]/settings/team/page.tsx`
  `src/app/w/[workspaceSlug]/trust-packs/exports/[exportRecordId]/route.ts`
  `src/test/setup.ts`
  `src/test/test-helpers.ts`
  `src/lib/env.test.ts`
  `src/lib/session.test.ts`
  `src/lib/deployment-smoke.test.ts`
  `docs/build-log.md`
  `docs/context.md`
  `docs/review-brief.md`
- Assumptions introduced:
  Hosted deployment remains stateful in phase 1: SQLite and evidence uploads both require mounted persistent paths.
  Existing sessions are invalidated by the new HMAC-backed session token hashing.
  The current email-only bootstrap login remains acceptable only for trusted/internal deployments, not a broad public launch.
- Risks / watchouts:
  The runtime is now deployable for a trusted hosted environment, but public launch is still blocked by preview-grade auth with no identity verification.
  SQLite plus local evidence storage still require persistent mounted volumes; this patch does not move the product to managed DB or object storage.
- Tests run:
  `DATABASE_URL='file:/.../prisma/deploy-smoke.db' SESSION_SECRET='deploy-check-secret' UPLOADS_ROOT='/.../uploads-deploy' npm run db:migrate:deploy`
  `DATABASE_URL='file:/.../prisma/deploy-smoke.db' SESSION_SECRET='deploy-check-secret' UPLOADS_ROOT='/.../uploads-deploy' NODE_ENV=production npm run build`
  `DATABASE_URL='file:/.../prisma/deploy-smoke.db' SESSION_SECRET='deploy-check-secret' UPLOADS_ROOT='/.../uploads-deploy' NODE_ENV=production npx tsc --noEmit`
  `DATABASE_URL='file:/.../prisma/test.db' SESSION_SECRET='test-attestly-v2-secret' UPLOADS_ROOT='/.../uploads' npm test`
- Next step:
  If the goal is internal or trusted hosted deployment, this wedge is ready after environment setup and mounted storage are in place.
  If the goal is broader public launch, replace the current email-only bootstrap login with real identity verification before exposing the app publicly.

## 2026-03-22 - Supporting-doc phase-1 consistency cleanup
- What changed:
  Patched lower-tier supporting docs so they now match the final shipped phase-1 runtime.
  Removed stale wording about pack-list UX, standalone generation, live claim editing, and live DOCX/PDF export behavior from the supporting doc set.
- Why it changed:
  The canonical docs were already aligned, but a few supporting docs still carried earlier planning assumptions that no longer matched the shipped product.
- Files touched:
  `docs/slice-plan.md`
  `docs/page-map.md`
  `docs/trust-pack-first-run-ux.md`
  `docs/user-journeys.md`
  `docs/build-log.md`
  `docs/context.md`
  `docs/review-brief.md`
- Assumptions introduced:
  No new product assumptions were added; this was a docs-only consistency cleanup against the accepted phase-1 runtime.
- Risks / watchouts:
  Supporting docs should continue to treat review / approve / Markdown export on the single Trust Packs surface as the shipped phase-1 story unless the product actually broadens.
- Tests run:
  No code changes; docs-only cleanup.
- Next step:
  Treat phase 1 as fully doc-aligned across both canonical and supporting docs, with any later-scope expansion called out explicitly as post-phase-1 work.

## 2026-03-21 - Final phase-1 canonical doc alignment
- What changed:
  Patched the canonical phase-1 docs so they match the shipped runtime exactly.
  Removed remaining wording that implied claim editing was part of live phase-1 behavior.
  Removed remaining wording that implied DOCX/PDF were live phase-1 export formats.
- Why it changed:
  Phase 1 was already shipped in code, but the docs still carried a few older planning assumptions that made the final runtime contract look broader than it is.
- Files touched:
  `docs/prd.md`
  `docs/trust-pack-spec.md`
  `docs/phase-1-wireframe-screen-specs.md`
  `docs/phase-1-figma-frame-plan.md`
  `docs/context.md`
  `docs/build-log.md`
  `docs/review-brief.md`
- Assumptions introduced:
  No new product assumptions were added; this was a wording-only alignment pass against the shipped runtime.
- Risks / watchouts:
  Future docs should keep phase-1 wording anchored to review / approve / Markdown export on immutable generated versions unless the product actually ships a broader editing or export-format surface.
- Tests run:
  No code changes; docs-only cleanup.
- Next step:
  Treat phase 1 as doc-aligned and complete, then make any future scope expansion explicit as a post-phase-1 decision rather than implied phase-1 behavior.

## 2026-03-20 - Slice 4 lifecycle hardening, approval, and buyer-safe export
- What changed:
  Added Prisma-backed `ApprovalRecord` and `ExportRecord` persistence plus a forward migration for version-specific approval and export history.
  Added a canonical trust-pack lifecycle service with explicit commands for `DRAFT -> READY_FOR_REVIEW`, `READY_FOR_REVIEW -> DRAFT`, `READY_FOR_REVIEW -> APPROVED`, and export from `APPROVED` / `EXPORTED`, all enforced server-side.
  Added one approval-readiness validator for persisted claims and citations, then wired the current Trust Packs surface to show lifecycle-aware actions, blocked-state messaging, approval/export summary, and buyer-safe Markdown export downloads.
  Added focused lifecycle/export tests covering transitions, approval gating, export invariants, viewer restrictions, current-version immutability, and buyer-safe export formatting.
- Why it changed:
  Slice 3 delivered grounded generation and current-pack review, but Slice 4 needed to harden the review surface into a real phase-1 workflow that can move a current version through approval and export without adding new IA or weakening lifecycle invariants.
- Files touched:
  `prisma/schema.prisma`
  `prisma/migrations/0003_slice4_approval_export_records/migration.sql`
  `src/lib/domain.ts`
  `src/lib/trust-pack-lifecycle.ts`
  `src/lib/trust-pack-generation.ts`
  `src/lib/home.ts`
  `src/app/actions.ts`
  `src/app/w/[workspaceSlug]/trust-packs/page.tsx`
  `src/app/w/[workspaceSlug]/trust-packs/exports/[exportRecordId]/route.ts`
  `src/lib/trust-pack-lifecycle.test.ts`
  `src/lib/rbac.test.ts`
  `docs/build-log.md`
  `docs/context.md`
  `docs/review-brief.md`
- Assumptions introduced:
  Phase 1 now implements Markdown as the only live export format, even though the schema/domain contract still reserves `DOCX` and `PDF` as future enum values.
  Approval readiness remains conservative and version-specific: `PARTIAL` and `NOT_FOUND` can be approved, but only if persisted claim/citation integrity rules still hold.
  Slice 4 ships without new claim-editing mechanics because approval/export can remain coherent on top of the generated current-version review surface.
- Risks / watchouts:
  Buyer-safe export currently depends on persisted claim content plus formatter rules rather than a broader template system, so later export changes should preserve the same no-template, evidence-first posture.
  Export download routes are intentionally guarded by export permission; there is no public sharing or buyer portal in phase 1.
  There is still no version-history browser, so approval/export flows only operate on the current version even though historical approval/export records are now persisted.
- Tests run:
  `DATABASE_URL='file:./dev.db' npx prisma validate`
  `DATABASE_URL='file:./dev.db' npx prisma generate`
  `DATABASE_URL='file:./test.db' SESSION_SECRET='test-attestly-v2-secret' npx tsc --noEmit`
  `npm test`
  `npm run db:init`
  `DATABASE_URL='file:./dev.db' SESSION_SECRET='dev-attestly-v2-session-secret' npm run build`
- Next step:
  Treat the phase-1 trust-pack wedge as functionally complete through export, then decide whether the next work is post-phase-1 polish, a narrow version-history/read-only enhancement, or later questionnaire reuse on top of the same trust-pack and evidence engine.

## 2026-03-16 - Documentation hygiene workflow installation
- What changed:
  Added a permanent root `AGENTS.md` that makes the Attestly V2 documentation hygiene workflow mandatory for future Codex tasks.
  Replaced the placeholder handoff docs with a current project snapshot and latest-task review artifact.
- Why it changed:
  The repo needed a durable, repo-local workflow so Codex updates compact handoff docs after each meaningful task and ChatGPT project chats can review changes without large uploads.
- Files touched:
  `AGENTS.md`
  `docs/build-log.md`
  `docs/context.md`
  `docs/review-brief.md`
- Assumptions introduced:
  Future Codex work in this repo should treat the documentation hygiene workflow as mandatory.
  The current implemented product state is Slice 1 only, with later slices still gated behind the locked phase-1 docs.
- Risks / watchouts:
  The workflow only works if future tasks actually maintain the three handoff docs.
  `docs/review-brief.md` must keep being overwritten rather than appended.
- Tests run:
  No code or contract behavior changed in this task, so no additional tests were required.
- Next step:
  Use the new hygiene workflow on the next meaningful implementation task, likely Slice 2 AI Profile and trust-pack readiness work.

## 2026-03-16 - Pre-Slice-2 backend/domain alignment patch
- What changed:
  Added canonical persistence support for `AIProfileDraftSession`, immutable `AIProfile`, `TrustPack`, and `TrustPackVersion`.
  Extended the SQLite migration and Prisma schema to enforce one logical trust-pack container per workspace, version-owned trust-pack lifecycle state, and one active `IN_PROGRESS` AI profile draft per workspace through a partial unique index.
  Added backend/domain services and tests for AI profile draft save/resume, immutable AI profile completion, trust-pack container creation, trust-pack version creation, future-ready RBAC guards, and minimal Home-state aggregation of AI profile progress.
- Why it changed:
  Slice 1 UI and routing were accepted, but Slice 2 depended on canonical persistence and guardrails that were still missing from the live backend.
  This patch makes the backend structurally ready for Slice 2 UI without prematurely shipping wizard, generation, review, approval, or export flows.
- Files touched:
  `prisma/schema.prisma`
  `prisma/migrations/0001_slice1_init/migration.sql`
  `src/lib/domain.ts`
  `src/lib/rbac.ts`
  `src/lib/workspaces.ts`
  `src/lib/ai-profiles.ts`
  `src/lib/trust-packs.ts`
  `src/lib/home.ts`
  `src/lib/ai-profiles.test.ts`
  `src/lib/trust-packs.test.ts`
  `src/lib/rbac.test.ts`
  `src/lib/home.test.ts`
- Assumptions introduced:
  SQLite-backed JSON storage remains text-backed in phase 1, with JSON validation and parsing enforced in the domain layer instead of Prisma `Json` columns.
  A workspace shares one active AI profile draft session at a time, even if multiple authorized members can resume it later.
  Home should prefer showing AI Profile `In progress` over `Completed` when both a completed version and a newer active draft exist.
- Risks / watchouts:
  The one-active-draft invariant depends on both the domain helper and a migration-level partial unique index because Prisma cannot express that partial index directly in the schema DSL.
  Trust-pack lifecycle flows are only structurally ready; approval/export behavior is still doc-locked but not implemented.
  Future Slice 2 UI should consume the structured service-layer payloads rather than reaching directly for raw JSON strings in Prisma records.
- Tests run:
  `DATABASE_URL='file:./dev.db' npx prisma validate`
  `DATABASE_URL='file:./dev.db' npx prisma generate`
  `DATABASE_URL='file:./test.db' SESSION_SECRET='test-attestly-v2-secret' npx tsc --noEmit`
  `npm test`
  `npm run db:init`
  `DATABASE_URL='file:./dev.db' SESSION_SECRET='dev-attestly-v2-session-secret' npm run build`
- Next step:
  Implement Slice 2 UI against these new persistence contracts: AI Profile wizard save/resume, immutable completion, trust-pack readiness, and the single current trust-pack detail flow.

## 2026-03-16 - Slice 2A AI Profile wizard and readiness shell
- What changed:
  Added the phase-1 AI Profile Wizard route and client UI with structured steps, explicit unknown handling, save/resume through `AIProfileDraftSession`, and completion from a review summary into a new immutable `AIProfile` version.
  Replaced the Trust Packs stub with a single current-pack readiness/detail shell and updated Home to use real persisted evidence, AI profile, and trust-pack state for its CTA ladder.
  Added shared readiness aggregation and conservative stale signaling so new AI Profile completions and evidence changes can mark the current Trust Pack version `STALE`.
- Why it changed:
  Slice 2A needed to turn the accepted backend/domain patch into a usable founder-fast flow without jumping ahead into generation, review, approval, or export UI.
  Home and Trust Packs also needed to stop speaking in Slice-1 placeholders and instead reflect the real persisted state now available in the backend.
- Files touched:
  `src/lib/ai-profile-wizard-contract.ts`
  `src/lib/ai-profiles.ts`
  `src/lib/trust-packs.ts`
  `src/lib/evidence.ts`
  `src/lib/workspace-readiness.ts`
  `src/lib/home.ts`
  `src/app/actions.ts`
  `src/app/w/[workspaceSlug]/page.tsx`
  `src/app/w/[workspaceSlug]/evidence/page.tsx`
  `src/app/w/[workspaceSlug]/ai-profile/page.tsx`
  `src/app/w/[workspaceSlug]/trust-packs/page.tsx`
  `src/components/ai-profile-wizard.tsx`
  `src/components/ai-profile-summary.tsx`
  `src/app/globals.css`
  `src/lib/ai-profiles.test.ts`
  `src/lib/trust-packs.test.ts`
  `src/lib/evidence.test.ts`
  `src/lib/home.test.ts`
- Assumptions introduced:
  `ai_usage_mode` may be saved as `UNKNOWN` during draft editing, but completion still requires a concrete canonical AI usage mode because immutable `AIProfile.aiUsageMode` is enum-backed in the domain model.
  The review summary is a UI-only step; the persisted `currentStepKey` still uses the last real wizard step key rather than a separate review-step enum value.
  Generation remains intentionally absent even when inputs are ready; the truthful next action is to open Trust Packs readiness, not to trigger a fake generator.
- Risks / watchouts:
  The wizard contract is now encoded in code as well as docs, so future contract changes must update both together.
  The new stale signaling is conservative and version-level only; it does not yet explain *why* a pack is stale or offer regeneration UI.
  The client wizard uses server actions for persistence, so future work should keep mutations in that service/action path rather than reaching around it with raw Prisma or ad hoc API logic.
- Tests run:
  `DATABASE_URL='file:./test.db' SESSION_SECRET='test-attestly-v2-secret' npx tsc --noEmit`
  `npm test`
  `DATABASE_URL='file:./dev.db' SESSION_SECRET='dev-attestly-v2-session-secret' npm run build`
- Next step:
  Move into Slice 3 trust-pack generation and claim assembly: create the first version from evidence plus completed AI Profile input, then expose claim-level status and citation review.

## 2026-03-17 - Pre-Slice-3 contract/backend cleanup
- What changed:
  Tightened AI Profile completion so `ai_usage_mode` may stay `UNKNOWN` only while a draft is in progress; immutable completion now requires a resolved canonical `AIUsageMode` and is enforced in the service layer instead of only in UI behavior.
  Added stable repeatable-item identity and provenance resolution for wizard groups such as `ai_systems` and `open_gaps`, including exact item-addressable paths for future wizard citations.
  Added one authoritative trust-pack generation-readiness service, explicit future lifecycle RBAC action definitions, and focused stale-behavior tests proving only the current `TrustPackVersion` becomes `STALE` while historical versions stay immutable.
  Updated the canonical wizard and schema docs to reflect the now-explicit completion rule and repeatable-item provenance contract.
- Why it changed:
  Slice 3 generation work needed the remaining backend contracts locked before generation, claim assembly, and lifecycle UI can build safely on them.
  The live codebase still had a few ambiguous or UI-owned rules that could have caused drift once Slice 3 started.
- Files touched:
  `src/lib/ai-profile-wizard-contract.ts`
  `src/lib/ai-profiles.ts`
  `src/lib/trust-packs.ts`
  `src/lib/workspace-readiness.ts`
  `src/lib/rbac.ts`
  `src/app/actions.ts`
  `src/components/ai-profile-wizard.tsx`
  `src/components/ai-profile-summary.tsx`
  `src/lib/ai-profiles.test.ts`
  `src/lib/trust-packs.test.ts`
  `src/lib/trust-pack-generation-readiness.test.ts`
  `src/lib/rbac.test.ts`
  `src/lib/evidence.test.ts`
  `src/lib/home.test.ts`
  `docs/ai-profile-wizard.md`
  `docs/schema-v2.md`
  `docs/build-log.md`
  `docs/context.md`
  `docs/review-brief.md`
- Assumptions introduced:
  Drafting may preserve `ai_usage_mode = UNKNOWN`, but a completed immutable `AIProfile` must always store one resolved enum value.
  Stable repeatable-item IDs live inside wizard payload JSON so provenance can resolve one exact repeated entry without adding a broader provenance subsystem.
  The new generation-readiness service is the source of truth for evidence + AI profile + current-version state, while actual generation flows remain unimplemented.
- Risks / watchouts:
  Repeatable-item identity now matters for provenance, so future wizard editing work must preserve item IDs rather than recreating entries unnecessarily.
  `createTrustPackVersionRecord` still exists as a low-level creation helper; future Slice 3 actions should call readiness/lifecycle guards explicitly instead of treating it as a UI flow.
  Canonical docs changed here, so downstream chats should refresh from `docs/review-brief.md` or `docs/context.md` before proposing Slice 3 work.
- Tests run:
  `DATABASE_URL='file:./test.db' SESSION_SECRET='test-attestly-v2-secret' npx tsc --noEmit`
  `npm test`
  `DATABASE_URL='file:./dev.db' SESSION_SECRET='dev-attestly-v2-session-secret' npm run build`
- Next step:
  Start Slice 3 proper: trust-pack generation from completed AI Profile plus citation-usable evidence, then claim/section assembly with version-owned lifecycle behavior and provenance-backed citations.

## 2026-03-19 - Slice 3 trust-pack generation and current-pack review foundation
- What changed:
  Added persisted Slice 3 trust-pack generation on top of the existing service/domain layer, including the first real generation action, fixed section and claim assembly from the locked claim catalog, claim-level `FOUND` / `PARTIAL` / `NOT_FOUND` statusing, and document plus wizard-attestation citations.
  Added Prisma support for `TrustPackSection`, `TrustPackClaim`, and `Citation` with a forward migration, then extended the generation service to create `DRAFT` versions atomically under the workspace's single logical `TrustPack`.
  Replaced the interim Trust Packs readiness shell with the first real current-version review foundation and updated Home CTA handling to use real generation and regeneration actions when the readiness service allows them.
  Added focused tests for generation blocking, first-version creation, catalog-aligned persistence, citation provenance, current-version detail loading, viewer restrictions, and stale-to-regenerated version behavior.
- Why it changed:
  Slice 2A had the AI Profile and readiness base in place, but the product still lacked the first real trust-pack artifact and current-pack review foundation required by the phase-1 wedge.
  This slice turns Trust Packs into a real evidence-backed workspace without leaking into Slice 4 approval or export flows.
- Files touched:
  `prisma/schema.prisma`
  `prisma/migrations/0002_slice3_trust_pack_review/migration.sql`
  `package.json`
  `src/test/test-helpers.ts`
  `src/lib/domain.ts`
  `src/lib/trust-packs.ts`
  `src/lib/trust-pack-catalog.ts`
  `src/lib/trust-pack-generation.ts`
  `src/lib/workspace-readiness.ts`
  `src/lib/home.ts`
  `src/app/actions.ts`
  `src/app/w/[workspaceSlug]/page.tsx`
  `src/app/w/[workspaceSlug]/trust-packs/page.tsx`
  `src/app/w/[workspaceSlug]/evidence/page.tsx`
  `src/components/trust-pack-review.tsx`
  `src/app/globals.css`
  `src/lib/home.test.ts`
  `src/lib/trust-pack-generation.test.ts`
  `docs/schema-v2.md`
  `docs/build-log.md`
  `docs/context.md`
  `docs/review-brief.md`
- Assumptions introduced:
  Slice 3 uses deterministic, rule-based claim assembly from the fixed catalog and existing inputs rather than freeform LLM generation.
  The first live generation action covers only two paths: initial generation when the workspace is ready and stale regeneration when the current version is `STALE`.
  Trust Packs remains the single current-pack surface in phase 1; version history exists in persistence but is not yet a user-browsable workflow.
- Risks / watchouts:
  The current claim assembly heuristics are intentionally narrow and deterministic, so future claim-quality improvements should stay evidence-first and preserve the existing status/citation rules instead of becoming template-driven.
  `TrustPackSection`, `TrustPackClaim`, and `Citation` are now real persisted records, so later editing/review work must preserve immutable history semantics around stale and regenerated versions.
  Buyer-facing export formatting is still out of scope, so internal review labels and provenance UI should not be mistaken for final external presentation.
- Tests run:
  `DATABASE_URL='file:./dev.db' npx prisma validate`
  `DATABASE_URL='file:./dev.db' npx prisma generate`
  `DATABASE_URL='file:./test.db' SESSION_SECRET='test-attestly-v2-secret' npx tsc --noEmit`
  `npm test`
  `npm run db:init`
  `DATABASE_URL='file:./dev.db' SESSION_SECRET='dev-attestly-v2-session-secret' npm run build`
- Next step:
  Move into Slice 4 review workflow hardening: approval gating, review-state transitions, and buyer-safe export behavior on the current Trust Pack surface.

## 2026-03-20 - Commit discipline workflow rule
- What changed:
  Added a standing Attestly V2 commit-discipline rule to the repo-level `AGENTS.md`.
  Updated the Codex hygiene prompt so future work groups commits by concern, uses conventional-style messages, and keeps docs synchronized inside the same task-oriented commit stack.
- Why it changed:
  The project needed a permanent git-history standard so future slices stay portfolio-quality, easy to review, and aligned with vertical-slice delivery rather than drifting into giant dump commits.
- Files touched:
  `AGENTS.md`
  `docs/codex-doc-hygiene-prompt.md`
  `docs/build-log.md`
  `docs/context.md`
  `docs/review-brief.md`
- Assumptions introduced:
  Future Attestly V2 work should follow the commit discipline by default unless a task explicitly asks for a different strategy.
  The preferred commit grouping order is now part of the standing repo workflow, not just chat-local guidance.
- Risks / watchouts:
  The workflow depends on actually using stable commit boundaries rather than treating the rule as documentation only.
  Over-splitting is still discouraged; the goal is clean intent, not performative micro-commits.
- Tests run:
  No code or product contract behavior changed in this task, so no additional tests were required.
- Next step:
  Apply this commit discipline on the next implementation task, likely Slice 4 review and export hardening.
