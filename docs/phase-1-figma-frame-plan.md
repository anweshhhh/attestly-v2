# Phase 1 Figma Frame Plan

This document translates the locked phase-1 screen specs into a Figma-ready frame inventory for low-fidelity wireframes.

## Source Of Truth

Use these docs together:

- [phase-1-wireframe-screen-specs.md](/Users/anweshsingh/Downloads/Attestly/attestly-v2/docs/phase-1-wireframe-screen-specs.md)
- [trust-pack-lifecycle.md](/Users/anweshsingh/Downloads/Attestly/attestly-v2/docs/trust-pack-lifecycle.md)
- [ai-profile-wizard.md](/Users/anweshsingh/Downloads/Attestly/attestly-v2/docs/ai-profile-wizard.md)

## Locked Decisions

- No separate Generate screen in this frame set. Generation is represented as a transition from `Home` or `Evidence` into `Trust Pack Detail / Review`.
- Evidence Library never shows `Generate trust pack` unless usable evidence and a completed `AIProfile` both exist.
- If evidence exists but the AI Profile is incomplete, the next action is `Complete AI profile` or `Continue setup`.
- Exported versions use the display convention `Approved • Exported` on Trust Pack Detail.
- The underlying lifecycle status remains `EXPORTED`; approval is implied and export history stays version-specific.

## 1. Desktop Frame Inventory

### Home

- `D01 Home / Empty Workspace`
- `D02 Home / Evidence Present, AI Profile Incomplete`
- `D03 Home / Inputs Ready, No Trust Pack Version`
- `D04 Home / Current Trust Pack Present`
- `D05 Home / Current Trust Pack Stale`

### Evidence Library

- `D06 Evidence / Empty`
- `D07 Evidence / Upload Processing + Mixed Document Status`
- `D08 Evidence / Evidence Present, AI Profile Incomplete`
- `D09 Evidence / Inputs Ready`
- `D10 Evidence / Current Pack Impact Warning`

### AI Profile Wizard

- `D11 AI Profile / Step 1 Basics`
- `D12 AI Profile / Mid-Step With Explicit Unknown Selected`
- `D13 AI Profile / AI Usage Mode = NONE Short Path`
- `D14 AI Profile / Open Gaps Step`
- `D15 AI Profile / Review Summary Before Completion`

### Trust Pack Detail / Review

- `D16 Trust Pack / No Version Yet`
- `D17 Trust Pack / Draft Review`
- `D18 Trust Pack / Draft Review + Citation Panel Open`
- `D19 Trust Pack / Ready For Review`
- `D20 Trust Pack / Approved`
- `D21 Trust Pack / Approved • Exported`
- `D22 Trust Pack / Stale`

## 2. Mobile Frame Inventory

Mirror desktop state coverage one-to-one.

### Home

- `M01 Home / Empty Workspace`
- `M02 Home / Evidence Present, AI Profile Incomplete`
- `M03 Home / Inputs Ready, No Trust Pack Version`
- `M04 Home / Current Trust Pack Present`
- `M05 Home / Current Trust Pack Stale`

### Evidence Library

- `M06 Evidence / Empty`
- `M07 Evidence / Upload Processing + Mixed Document Status`
- `M08 Evidence / Evidence Present, AI Profile Incomplete`
- `M09 Evidence / Inputs Ready`
- `M10 Evidence / Current Pack Impact Warning`

### AI Profile Wizard

- `M11 AI Profile / Step 1 Basics`
- `M12 AI Profile / Mid-Step With Explicit Unknown Selected`
- `M13 AI Profile / AI Usage Mode = NONE Short Path`
- `M14 AI Profile / Open Gaps Step`
- `M15 AI Profile / Review Summary Before Completion`

### Trust Pack Detail / Review

- `M16 Trust Pack / No Version Yet`
- `M17 Trust Pack / Draft Review`
- `M18 Trust Pack / Draft Review + Citation Panel Open`
- `M19 Trust Pack / Ready For Review`
- `M20 Trust Pack / Approved`
- `M21 Trust Pack / Approved • Exported`
- `M22 Trust Pack / Stale`

### Mobile Layout Rules

- Single-column only.
- Keep the top status and primary CTA visible near the top.
- Evidence list becomes stacked document cards.
- Wizard summary moves below the active fields.
- Trust Pack citations open as a bottom sheet or expandable panel instead of a persistent side panel.

## 3. Exact States To Wireframe

### Screen 1: Home

Full-layout frames:

- `D01/M01` empty workspace
- `D02/M02` evidence present, AI Profile incomplete
- `D03/M03` inputs ready, no Trust Pack version
- `D04/M04` current Trust Pack present
- `D05/M05` current Trust Pack stale

Local variants or callouts inside the Home Figma page:

- `loading`
- `page_error`
- `viewer_read_only`

Locked behavior:

- Only one dominant CTA appears at a time.
- Use `Complete AI profile` when evidence exists but the AI Profile is not complete.
- Use `Generate trust pack` only when both inputs are ready and there is no current version yet.
- Use `Regenerate new version` when the current version is stale.

### Screen 2: Evidence Library

Full-layout frames:

- `D06/M06` empty evidence library
- `D07/M07` upload processing with mixed statuses
- `D08/M08` evidence present, AI Profile incomplete
- `D09/M09` inputs ready
- `D10/M10` current pack impact warning

Local variants or callouts inside the Evidence Figma page:

- `unsupported_file_error`
- `processing_error`
- `page_error`
- `viewer_read_only`

Locked behavior:

- `D08/M08` must show `Complete AI profile` or `Continue setup`, never `Generate trust pack`.
- `D09/M09` is the first Evidence state where `Generate trust pack` may appear.
- Upload and document health stay above any setup-completion CTA.
- If evidence changes would stale the current version, the warning appears inline on the screen rather than as a separate surface.

### Screen 3: AI Profile Wizard

Full-layout frames:

- `D11/M11` Step 1 Basics
- `D12/M12` mid-step with explicit unknown selected
- `D13/M13` AI Usage Mode = NONE short path
- `D14/M14` Open Gaps step
- `D15/M15` review summary before completion

Local variants or callouts inside the AI Profile Figma page:

- `autosave_in_progress`
- `validation_error`
- `save_failure`
- `viewer_read_only_summary`

Locked behavior:

- Unknown is a first-class saved state, not a blank.
- The `NONE` mode visibly shortens the path without skipping attestation creation.
- Completion occurs from the review summary, not directly from the last field group.

### Screen 4: Trust Pack Detail / Review

Full-layout frames:

- `D16/M16` no version yet
- `D17/M17` draft review
- `D18/M18` draft review with citation panel open
- `D19/M19` ready for review
- `D20/M20` approved
- `D21/M21` approved and exported
- `D22/M22` stale

Local variants or callouts inside the Trust Pack Figma page:

- `loading`
- `page_error`
- `citation_error`
- `ready_for_review_reviewer_action_bar`
- `viewer_read_only`

Locked behavior:

- `D19/M19` defaults to the `OWNER` or `ADMIN` action bar with `Approve version`.
- The reviewer variant for `D19/M19` swaps the primary action to `Send back to draft`.
- `D20/M20` shows export-eligible `APPROVED`.
- `D21/M21` shows the display label `Approved • Exported` with `Export again`.
- `D22/M22` is read-only except for `Regenerate new version`; approval and export actions are hidden.
- `READY_FOR_REVIEW`, `APPROVED`, `Approved • Exported`, and `STALE` must all preserve the same underlying section and claim layout.

## 4. Suggested Annotation Notes For Frames

Place these as small wireframe annotations directly in the relevant frames.

### Cross-screen note

- `New evidence or a new AI Profile version can stale the current Trust Pack.`

### Evidence Library notes

- `Generation is gated by both usable evidence and a completed AI Profile. Evidence alone is not enough.`
- `Document changes can stale the current Trust Pack version.`

### AI Profile Wizard notes

- `Unknown is a saved value, not a blank. Unknown fields stay visible and are not citable.`
- `Completing the wizard creates a new immutable AI Profile version.`
- `Only PROVIDED citable fields can be used as Trust Pack citations.`

### Trust Pack Detail notes

- `FOUND = citations required. PARTIAL = citations + missing detail. NOT_FOUND = no citations.`
- `Review and approval apply to this exact version only.`
- `Display label = Approved • Exported. Underlying lifecycle status = EXPORTED.`
- APPROVED and EXPORTED remain immutable in shipped phase 1. Review, approval, and export happen on the current version surface; claim editing is not required in the live runtime.
- `STALE versions are view-only. Regenerate before approval or export.`

## 5. Minimal Component Inventory For Low-Fidelity Wireframes

Use only these reusable components:

- App shell with minimal nav
- Page header
- Status banner
- Primary / secondary CTA row
- Progress checklist
- Summary card
- Status badge / chip
- Upload zone
- Evidence row card / table row
- Wizard stepper
- Field group
- Explicit `Unknown` control
- Gap list row
- Section rail
- Claim card
- Citation panel / drawer
- Metadata row
- Empty / loading / error block

## 6. QA Checklist For The Figma Set

- No Evidence frame shows `Generate trust pack` before both usable evidence and a completed AI Profile exist.
- Wizard frames visibly distinguish `PROVIDED`, `UNKNOWN`, and unanswered states.
- Trust Pack frames preserve all lifecycle states: `DRAFT`, `READY_FOR_REVIEW`, `APPROVED`, `Approved • Exported`, and `STALE`.
- Claim-level notes reflect the schema rules for `FOUND`, `PARTIAL`, and `NOT_FOUND`.
- Role-based variants change action availability only, not the underlying layout model.
- Mobile frames mirror desktop state coverage exactly.
