# Spec Gaps Closed

## Resolved
- Moved lifecycle ownership to `TrustPackVersion` in [schema-v2.md](schema-v2.md), with `TrustPack` kept as the logical container plus `currentVersionId`.
- Made approval and export history version-specific by introducing `ApprovalRecord` and keeping `ExportRecord` attached to `TrustPackVersion`.
- Added a lightweight `AIProfileDraftSession` model so wizard save-and-resume has an explicit persistence contract instead of implicitly mutating `AIProfile`.
- Hardened [ai-profile-wizard.md](ai-profile-wizard.md) with a field-level contract for every phase-1 wizard input: `fieldKey`, label, type, required/optional, repeatable, `allowsUnknown`, and `citableInTrustPack`.
- Aligned unknown handling across UX and schema using explicit field states (`PROVIDED`, `UNKNOWN`, `UNANSWERED`) so provenance and regeneration rules are deterministic.

## What Stayed Intentionally The Same
- evidence-first generation
- claim-level `FOUND` / `PARTIAL` / `NOT_FOUND`
- no questionnaire automation in phase 1
- no expansion into trust center or CRM workflows

## Outcome
The schema now matches the lifecycle contract, and the wizard UX now matches a concrete persistence model. The spec set is ready to drive Figma flows and slice-1 implementation boundaries.
