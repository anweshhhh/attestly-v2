# Current Context

## Current implemented slices
- Slice 1 is implemented:
  workspace bootstrap, workspace-scoped app shell, Home, Evidence Library, lean Settings / Team, verified Google OAuth sign-in, Auth.js JWT sessions, and server-enforced RBAC for `OWNER`, `ADMIN`, `REVIEWER`, and `VIEWER`.
- A pre-Slice-2 backend/domain alignment patch is implemented:
  canonical persistence now exists for `AIProfileDraftSession`, immutable `AIProfile`, the single logical workspace `TrustPack`, and version-owned `TrustPackVersion`.
- Slice 2A is implemented:
  AI Profile Wizard UI with save/resume, explicit unknown handling, review-summary completion into immutable `AIProfile` versions, Home CTA ladder wired to real persisted readiness state, and a single current Trust Packs readiness/detail shell replacing the old stub.
- A pre-Slice-3 cleanup patch is implemented:
  service-owned AI Profile completion validation, deterministic repeatable-item wizard provenance, authoritative generation-readiness service output, explicit future lifecycle RBAC action definitions, and stale-behavior tests for current-vs-historical trust-pack versions.
- Slice 3 is implemented:
  first trust-pack generation for the workspace's single logical pack, fixed section and claim assembly from the locked claim catalog, persisted `TrustPackSection` / `TrustPackClaim` / `Citation` records, claim-level `FOUND` / `PARTIAL` / `NOT_FOUND`, document and wizard citations, Home generation/regeneration CTAs, and the first real current-version Trust Packs review foundation.
- Slice 4 is implemented:
  service-layer lifecycle transitions for the current version, approval readiness validation, persisted `ApprovalRecord` / `ExportRecord` history, review / approve / export behavior on the current Trust Packs surface, and buyer-safe Markdown export with citations and the evidence appendix.
- Claim editing is not required in shipped phase 1, and version-history browsing is still not implemented.
- Deployment-platform migration is implemented:
  production runtime now targets Neon Postgres, Vercel Blob-backed evidence storage, Vercel-compatible direct evidence uploads plus server-side processing, and production env validation for Neon + Blob + Google OAuth.

## Locked decisions relevant to implementation
- Phase 1 remains the Trust Pack Generator wedge.
- Navigation stays `Home`, `Evidence`, `Trust Packs`, `Settings / Team`.
- Phase 1 uses one logical Trust Pack container per workspace with version history under it, but multi-pack UX is not part of phase 1.
- No standalone Generate screen exists in canonical IA.
- Generation is later gated by completed AI Profile plus citation-usable evidence.
- Evidence-first behavior, strict workspace isolation, and server-enforced RBAC are foundational.
- `AIProfileDraftSession` owns save/resume state, at most one `IN_PROGRESS` draft exists per workspace in phase 1, and completing a draft creates a new immutable `AIProfile` version.
- `ai_usage_mode` may remain `UNKNOWN` while a draft is in progress, but immutable completion requires a resolved canonical enum value; `NONE` is the minimal truthful completed path.
- Repeatable wizard groups persist stable per-item identifiers so provenance can resolve exact paths like `ai_systems[itemId].provider_name` against one immutable `AIProfile` version.
- `TrustPackVersion` owns lifecycle status; `TrustPack` is only the single logical workspace container with `currentVersionId`.
- `AIUsageMode = NONE` is a valid short path but still completes a real immutable AI Profile version.
- Home and Trust Packs now read real persisted readiness state, live generation/regeneration actions, and the current-version review / approve / export state on the single Trust Packs surface.
- Trust-pack generation readiness is now determined in one backend service from citation-usable evidence, completed AI Profile presence, and `TrustPack.currentVersionId -> TrustPackVersion.status`.
- Explicit RBAC actions now govern generation, lifecycle transitions, approval, export, and provenance viewing on workspace-scoped trust-pack versions.
- Slice 3 generation uses the fixed claim catalog only, persists one status per claim, and enforces the canonical citation rules:
  `FOUND` requires citations, `PARTIAL` requires citations plus missing detail, and `NOT_FOUND` requires zero citations.
- Wizard citations are stored against exact immutable AI Profile field paths, including repeatable item paths such as `ai_systems[itemId].provider_name`.
- Current-version stale behavior remains version-owned: only the current version becomes `STALE`, history stays immutable, and `currentVersionId` does not move until explicit regeneration creates a new draft version.
- Slice 4 now hardens the same current-pack surface rather than adding new IA:
  lifecycle transitions are service-owned, approval is gated by one backend validator, approval/export history is version-specific, export is allowed only from the same `APPROVED` / `EXPORTED` version, and buyer-facing export omits raw internal workflow chrome and raw claim-status labels while preserving citations and the evidence appendix.
- Shipped phase 1 is review / approve / export on immutable generated versions; broad claim editing is not part of the live runtime requirement.
- Phase 1 export is currently Markdown-only in the live product even though the schema/domain enum still reserves additional export formats for later.
- Repo workflow now expects small, logically grouped conventional-style commits with docs synchronized in the same task-oriented commit stack unless a task explicitly says otherwise.
- The production deployment target is now Vercel with Neon Postgres and Vercel Blob; SQLite plus local uploaded-file persistence are no longer the supported production path.

## Current next step
- The phase-1 trust-pack wedge is now functionally implemented through review, approval, and buyer-safe Markdown export on immutable generated versions.
- Supporting docs are aligned to that shipped runtime, and the launch platform has now been migrated from SQLite/local uploads assumptions to Vercel-compatible Neon Postgres plus Vercel Blob.
- Verified Google OAuth, workspace/RBAC behavior, evidence processing, generation, approval, and Markdown export have all been re-verified on the migrated stack.
- The remaining launch step is operational rather than product-facing: run `npm run db:migrate:production` against the live Neon database before production traffic, then retry the launch runbook on that deployment and monitor the shipped wedge.

## Out of scope right now
- broad claim editing and version-history browsing
- questionnaire automation
- trust center or portal work
- CRM integrations
- billing or pricing design
- analytics or reporting sprawl
- multi-workspace admin console work

## Current status note
- No new product scope was added in the latest task; it was a narrow deployment-fix patch for production migration execution and launch wiring.
- Phase 1 remains complete and stable.
- The current wedge should succeed on Vercel once the live Neon schema is applied with `npm run db:migrate:production` and the existing production env is set correctly.
