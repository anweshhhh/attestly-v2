# Phase 1 Wireframe Screen Specs

This document defines wireframe-ready screen specs for the first four phase-1 screens only.

## Shared Frame Rules

- Keep primary navigation to `Home`, `Evidence`, `Trust Packs`, and `Settings / Team`.
- Do not add a top-level questionnaire surface.
- Keep the product evidence-first: the default next step for a new workspace is always evidence upload.
- Preserve explicit unknown handling in the AI Profile Wizard.
- Preserve version-based review, approval, and export behavior in Trust Pack Detail.
- Assume one active workspace context and one logical `TrustPack` container per workspace in phase 1, with version history underneath it.
- Treat generation as an inline lifecycle action or transitional state inside `Trust Packs`, not as a standalone screen.

---

## Screen 1: Home

**Suggested frame name:** `01 Home`

### Screen purpose

Guide the user into the narrow phase-1 loop and make the next meaningful action obvious.

### Primary user goal

Understand current workspace progress and start or resume the trust-pack flow without exploring the product.

### Information hierarchy

1. Current workspace state and dominant next action.
2. Progress through the phase-1 loop: evidence, AI profile, trust pack, review/export.
3. Current Trust Pack status if a version already exists.
4. Evidence readiness summary.
5. AI Profile status summary.

### Main sections

- Top app shell with workspace name and minimal primary navigation.
- Page header with short explanation of what the workspace is building.
- Dominant progress card with one primary CTA determined by current workspace state.
- Progress checklist showing `Evidence`, `AI Profile`, `Trust Pack`, and `Review / Export`.
- Current Trust Pack summary card showing latest version number and lifecycle status when present.
- Evidence summary card showing document count, processing health, and last updated time.
- AI Profile summary card showing draft or completed status and the latest attestation version when present.

### Key components

- Progress checklist with step states.
- Workspace state banner.
- Current Trust Pack status card.
- Evidence readiness card.
- AI Profile status card.
- Role-aware primary CTA button.

### Primary CTA

Use one dominant CTA based on workspace state.

- No evidence: `Upload evidence`
- Evidence exists, no completed AI Profile: `Complete AI profile`
- Inputs ready, no Trust Pack version: `Generate trust pack`
- Draft or ready version exists: `Open trust pack`
- Current version is stale: `Regenerate new version`

### Secondary actions

- `View evidence library`
- `Resume AI profile`
- `Open latest version`
- `View team settings`

### Empty state

- Show a single onboarding card that explains the outcome: create a reviewable Trust Pack from real evidence and explicit AI attestations.
- Show recommended evidence examples such as policies, architecture docs, product docs, and prior questionnaire responses.
- Keep the only dominant action as `Upload evidence`.

### Loading state

- Render skeleton blocks for the progress card, summary cards, and latest Trust Pack status.
- Keep navigation visible.
- Do not show a blank dashboard shell.

### Error state

- If workspace state fails to load, show an inline page-level error with `Retry`.
- Keep navigation available so the user can still reach `Evidence` or `Trust Packs`.
- If the current Trust Pack summary fails independently, isolate the error to that card and keep the rest of the page usable.

### Role-based behavior where relevant

| Role | Behavior |
| --- | --- |
| `OWNER` | Can use all CTAs including regenerate, open, and settings access |
| `ADMIN` | Same as owner except workspace governance may be narrower in settings |
| `REVIEWER` | Can upload evidence, resume AI profile, generate, and open Trust Pack |
| `VIEWER` | Read-only summaries only; hide mutating CTAs and show `View latest trust pack` if available |

### Notes for mobile responsiveness

- Stack summary cards vertically in priority order: progress, Trust Pack, evidence, AI Profile.
- Keep the dominant CTA visible near the top without requiring horizontal scanning.
- Convert the progress checklist into a vertical step list.

### Notes for accessibility

- The dominant progress card should have a clear page heading and descriptive button label.
- Progress states must not rely on color alone.
- Summary cards should use real heading structure so assistive tech can jump between sections.
- Error and stale banners should be announced as status messages.

### Notes on how this screen reflects the underlying lifecycle/schema contracts

- Home summarizes data from `EvidenceDocument`, `AIProfileDraftSession`, `AIProfile`, and `TrustPack.currentVersionId -> TrustPackVersion`.
- The dominant CTA reflects lifecycle state rather than a generic dashboard action.
- Only one current Trust Pack lifecycle state should be shown at a time.
- `Generate trust pack` is available only when the workspace has both a completed `AIProfile` and at least one processed, citation-usable evidence document.
- If evidence changes or a new `AIProfile` is completed, the current version may appear as `STALE` here and the next step should shift to regeneration.

---

## Screen 2: Evidence Library

**Suggested frame name:** `02 Evidence Library`

### Screen purpose

Provide the evidence-first workspace where users upload, inspect, and maintain the source material used for Trust Pack generation and review.

### Primary user goal

Add trustworthy source documents and understand whether the current evidence set is ready for pack generation or review.

### Information hierarchy

1. Upload and ingestion status.
2. Evidence list with document health and pack usage.
3. Processing errors or unsupported files.
4. Recommendations for missing evidence types.
5. Impact on the current Trust Pack version.

### Main sections

- Top app shell with minimal navigation.
- Page header with evidence count and short explanation of what qualifies as evidence.
- Upload zone or upload button row at the top of the page.
- Evidence library table or card list with document rows.
- Inline processing and issue indicators on each document.
- Lightweight recommendations panel for missing evidence categories.
- Current-pack impact banner when evidence changes would stale the current version.

### Key components

- Upload control with drag-and-drop plus file picker.
- Evidence list with columns for name, status, last updated, uploaded by, and pack usage.
- Status chips for `UPLOADED`, `CHUNKED`, `ERROR`, and `ARCHIVED`.
- Pack usage indicator such as `Used in current version`.
- Row actions for `View`, `Replace`, `Archive`, and `Retry`.
- Recommendations panel listing example evidence types.
- Staleness impact banner.

### Primary CTA

`Upload evidence`

### Secondary actions

- `View document`
- `Replace document`
- `Archive document`
- `Retry processing`
- `Complete AI profile` or `Continue setup` when evidence exists but no completed AI Profile exists
- `Generate trust pack` only when usable evidence and a completed AI Profile both exist

### Empty state

- Show example evidence types and a short sentence explaining why evidence comes first.
- Explain that uploaded documents power citations and reduce unsupported claims.
- Keep `Upload evidence` as the only primary action.

### Loading state

- Show per-row processing states as documents upload and chunk.
- Keep already processed rows visible while new items continue processing.
- If the page is loading from scratch, show a skeleton list with visible column labels.

### Error state

- Unsupported file: show the reason directly on the file row and offer remove or replace.
- Extraction failure: keep the document row, mark it `ERROR`, and offer `Retry`.
- Duplicate or replaced file: show a non-blocking warning instead of silent deduplication.
- If the evidence list fails to load, show a page-level retry state while preserving the upload CTA.

### Role-based behavior where relevant

| Role | Behavior |
| --- | --- |
| `OWNER` | Can upload, replace, archive, and inspect all documents |
| `ADMIN` | Can upload, replace, archive, and inspect all documents |
| `REVIEWER` | Can upload, replace, archive, and inspect all documents in phase 1 |
| `VIEWER` | Can inspect document list and processing status but cannot upload, replace, archive, or retry |

### Notes for mobile responsiveness

- Convert the document table into stacked evidence cards.
- Keep row status and pack usage visible near the title of each card.
- Move row actions into a simple overflow menu or bottom action row.
- Keep the upload control full-width at the top of the page.

### Notes for accessibility

- Drag-and-drop must always have a keyboard and file-picker equivalent.
- Upload and processing progress should be announced to assistive technology.
- The evidence list should remain navigable as a semantic table on desktop and a semantic list on mobile.
- Status chips and pack-usage indicators must not rely on color alone.

### Notes on how this screen reflects the underlying lifecycle/schema contracts

- Each row reflects one `EvidenceDocument` and its `DocumentStatus`.
- This screen is document-level, not chunk-level, but it must communicate that successful processing leads to chunked, citable evidence.
- Replacing, archiving, or materially changing evidence can stale `TrustPack.currentVersionId`.
- Pack usage indicators should help users understand which documents support the current `TrustPackVersion`.
- Evidence remains workspace-scoped and role-guarded.
- Trust-pack generation is gated by both usable evidence and a completed `AIProfile`; evidence alone should route the user back into setup rather than into generation.

---

## Screen 3: AI Profile Wizard

**Suggested frame name:** `03 AI Profile Wizard`

### Screen purpose

Capture structured, versioned first-party AI attestations that can later be cited in the Trust Pack.

### Primary user goal

Complete or resume a truthful AI Profile with explicit unknowns preserved, then create a new immutable attestation version.

### Information hierarchy

1. Current wizard step and progress.
2. Step goal and required fields.
3. Field input controls with explicit unknown handling where allowed.
4. Save status and resume confidence.
5. Review summary and completion action.

### Main sections

- Top app shell with minimal navigation and workspace context.
- Wizard header with current step title, progress indicator, and save status.
- Main step panel with one step goal and its fields.
- Inline unknown controls on fields that allow explicit unknown.
- Compact side or bottom summary showing how the current answers affect the Trust Pack.
- Footer action row with back, save-and-exit, continue, and complete actions.

### Key components

- Stepper covering `Company / Product Basics`, `AI Usage Mode`, `Models / Vendors`, `Customer Data / Training`, `Safeguards / Human Oversight`, and `Open Gaps`.
- Field groups keyed to the stable wizard contract.
- Explicit `Unknown` control on fields where `allowsUnknown = yes`.
- Review summary panel before completion.
- Save status indicator showing draft persistence.
- Context note when `ai_usage_mode = NONE` shortens the remaining flow.

### Primary CTA

- Mid-flow: `Continue`
- Final step: `Complete AI profile`

### Secondary actions

- `Back`
- `Save and exit`
- `Resume later`
- `Review answers`

### Empty state

- First launch with no draft should open directly into Step 1 with a short explanation of why the AI Profile exists.
- Do not show a blank index page before the first step.
- If the workspace does not use AI, the wizard should still support a truthful `NONE` mode and complete a minimal attestation path.

### Loading state

- When resuming, show the stepper shell immediately and load saved answers into the current step.
- While saving, keep the user on the current step and show non-blocking save feedback.
- Do not clear entered values during save.

### Error state

- Validation error: keep the user on the step and show field-level issues plus a short step summary.
- Save failure: preserve entered values locally in the UI and show `Retry save`.
- Completion failure: keep the review summary visible and explain that no immutable version was created yet.

### Role-based behavior where relevant

| Role | Behavior |
| --- | --- |
| `OWNER` | Can start, edit, complete, and replace the current attestation flow |
| `ADMIN` | Can start, edit, complete, and replace the current attestation flow |
| `REVIEWER` | Can start, edit, complete, and replace the current attestation flow in phase 1 |
| `VIEWER` | Read-only access to the latest completed AI Profile summary only; no draft editing or completion actions |

### Notes for mobile responsiveness

- Use a one-column layout with the stepper condensed into a progress indicator plus step label.
- Keep back and continue actions in a sticky footer.
- Place the Trust Pack impact summary below the active fields instead of in a side panel.
- Make the explicit unknown control easy to tap without obscuring the main field.

### Notes for accessibility

- Every step needs a clear heading and description.
- Required, optional, unknown-capable, and unanswered states must be distinguishable in text, not color alone.
- The stepper should expose progress semantics such as step count and current step.
- Save, validation, and completion messages should be announced to assistive technology.
- Unknown should be a first-class input state, not a visual annotation.

### Notes on how this screen reflects the underlying lifecycle/schema contracts

- In-progress work writes to `AIProfileDraftSession`, not directly to `AIProfile`.
- The screen must preserve `PROVIDED`, `UNKNOWN`, and `UNANSWERED` per field rather than collapsing them into a single null state.
- Completion creates a new immutable `AIProfile` version.
- The final review summary exists because the wizard contract requires review before completion.
- Completing a new `AIProfile` can mark the current Trust Pack version `STALE`.
- Only fields marked citable and in `PROVIDED` state can become citation sources later.
- `AIUsageMode = NONE` still ends with `Complete AI profile`; it shortens the path but does not bypass attestation completion.

---

## Screen 4: Trust Pack Detail / Review

**Suggested frame name:** `04 Trust Pack Detail / Review`

### Screen purpose

Provide the main version-specific review workspace where users inspect claims, provenance, lifecycle state, approval readiness, and export readiness for a Trust Pack.

### Primary user goal

Review the current Trust Pack version, inspect provenance, accept honest gaps, and move the version through review, approval, or export according to role and lifecycle state.

### Information hierarchy

1. Trust Pack version identity and lifecycle state.
2. Pack-level readiness summary and allowed next action.
3. Section navigation in fixed order.
4. Claim-level content, statuses, and missing details.
5. Citation and provenance detail for the selected claim.

### Main sections

- Top app shell with minimal navigation.
- Version header showing Trust Pack title, version number, lifecycle badge, AI Profile version used, and last updated time.
- Pack-level action bar with the allowed primary lifecycle action.
- Section navigation rail showing fixed section order and status counts.
- Main review column with section content and claim cards.
- Citation and provenance panel showing document or wizard support for the selected claim.

### Key components

- Lifecycle badge for `DRAFT`, `READY_FOR_REVIEW`, `APPROVED`, `Approved • Exported`, or `STALE`.
- Version metadata card.
- Section list covering the fixed Trust Pack sections in order.
- Claim cards with claim title, answer body, claim status, citations count, and missing-details text where needed.
- Citation drawer or side panel that distinguishes `DOCUMENT` and `WIZARD_ATTESTATION`.
- Version-level action buttons such as `Mark ready for review`, `Send back to draft`, `Approve version`, `Export`, `Export again`, or `Regenerate new version`.

### Primary CTA

The primary CTA is lifecycle-dependent and role-dependent.

- `DRAFT`: `Mark ready for review`
- `READY_FOR_REVIEW` for `OWNER` or `ADMIN`: `Approve version`
- `READY_FOR_REVIEW` for `REVIEWER`: `Send back to draft`
- `APPROVED`: `Export`
- `Approved • Exported`: `Export again`
- `STALE`: `Regenerate new version`

`READY_FOR_REVIEW` does not require every claim to be `FOUND`; honest `PARTIAL` and `NOT_FOUND` claims may still be reviewed and approved.

### Secondary actions

- `View citations`

### Empty state

- If no Trust Pack version exists yet, show the required inputs summary: evidence readiness and AI Profile readiness.
- Explain that generation creates the first versioned pack.
- Show `Generate trust pack` only when minimum inputs exist; otherwise direct the user back to missing inputs.

### Loading state

- Show the version header and section rail first, then load claim bodies and citations progressively.
- Keep section positions stable while content loads.
- When citations are loading, keep claim text visible and show a loading state inside the provenance panel only.

### Error state

- If the version fails to load, show a page-level recovery state with `Retry`.
- If citations fail to load, isolate the error to the provenance panel and keep claim review usable.
- If a lifecycle action fails, keep the current version state visible and explain that the status did not change.
- If the current version is stale, show a non-dismissable stale banner and prevent approval or export on that version.

### Role-based behavior where relevant

| Role | Behavior |
| --- | --- |
| `OWNER` | Can mark ready, send back, approve, export, and regenerate stale versions on the current Trust Pack surface |
| `ADMIN` | Same lifecycle capabilities as owner in phase 1 |
| `REVIEWER` | Can mark ready, send back, export approved or exported versions, and regenerate stale versions; cannot approve |
| `VIEWER` | Read-only access to section content, claim status, citations, provenance, and lifecycle badges; no approval, export, or regeneration actions |

### Notes for mobile responsiveness

- Collapse the three-panel desktop layout into a stacked flow.
- Keep version status and the primary CTA pinned near the top.
- Turn the section rail into an accordion or compact section picker.
- Move citations into a bottom sheet or expandable panel rather than a persistent side rail.
- Keep claim status, missing details, and citation count visible without requiring the provenance panel to stay open.

### Notes for accessibility

- Lifecycle state, claim status, and missing-detail indicators must have text labels, not color-only badges.
- Section navigation should support keyboard movement and clear current-section indication.
- Citation panel opening should move focus predictably and return it on close.
- Claim cards should expose heading, status, answer text, and citation count in a consistent reading order.
- Approval, export, and stale messages should be announced clearly because they affect workflow permissions.

### Notes on how this screen reflects the underlying lifecycle/schema contracts

- This screen is version-specific and should always identify the exact `TrustPackVersion` being reviewed.
- Section order must match the fixed section spec and claims must align to stable catalog claim keys.
- Claim statuses must obey the schema contract: `FOUND` requires citations, `PARTIAL` requires citations plus missing details, and `NOT_FOUND` requires zero citations.
- Citations must resolve to either `DOCUMENT` evidence or `WIZARD_ATTESTATION` from the specific `AIProfile` version linked to this pack version.
- Phase 1 does not require live claim editing on this screen; the shipped workflow is review, approval, and export on generated versions.
- `APPROVED` and `EXPORTED` versions are immutable in live phase 1.
- `STALE` versions remain viewable but cannot be approved or exported until regeneration creates a new draft.
- Export availability must reflect the lifecycle contract: only `APPROVED` or `EXPORTED` versions are shareable.
- Buyer-facing export should omit raw internal workflow chrome and raw `FOUND`, `PARTIAL`, and `NOT_FOUND` labels while including citations and the evidence appendix by default in phase 1.
- `Approved • Exported` is a UI display convention only; the underlying lifecycle state remains `EXPORTED`, and export history remains version-specific metadata.
