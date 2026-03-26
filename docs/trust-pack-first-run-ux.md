# Trust Pack Generator First-Run UX Architecture

## Scope

This document defines the V2 phase 1 user experience for generating a Trust Pack for a B2B SaaS vendor using AI.

- Primary audience: product manager, founder, CTO, or operator preparing customer-facing trust materials.
- Primary outcome: turn existing evidence plus a small amount of AI-specific context into a reviewable Trust Pack quickly.
- Primary flow: Home -> Upload Evidence -> Complete AI Profile -> Generate Trust Pack -> Review current version -> Approve version -> Export Markdown.
- Phase 1 assumption: one logical `TrustPack` container per workspace, with version history underneath it.
- Phase 1 non-goal: a large security questionnaire as the main interaction model.

### Contract precedence
This document is a UX companion, not the source of truth for lifecycle or claim structure.

- Lifecycle, approval, export gating, and version mutation rules are governed by `docs/trust-pack-lifecycle.md`.
- Stable phase-1 claim units are governed by `docs/claim-catalog-v1.md`.
- If this UX doc conflicts with those contract docs, the contract docs win.

## Product Positioning

Attestly should feel like a guided packaging tool, not a compliance maze.

- The product is helping the user answer: "Can I turn what we already know about our product, security posture, and AI usage into something I can confidently share?"
- The product is not asking the user to become a security expert before seeing value.
- The AI should reduce synthesis work, but the human stays in control of what gets exported.

## 1. User Journey

| Stage | User goal | What Attestly should do | Success signal |
| --- | --- | --- | --- |
| Enter workspace | Understand what this product will create and what is needed to start | Show a focused setup checklist, a simple progress meter, and a short preview of the final Trust Pack | User knows the next action in under 10 seconds |
| Upload evidence | Get existing materials into the system fast | Accept common files, classify them automatically, show ingestion status, and recommend missing evidence types | User uploads enough material without needing taxonomy setup |
| Complete AI Profile | Provide AI-specific context that documents alone may not contain | Ask a short set of plain-language questions and show a live preview of how answers affect the pack | User finishes in 5 to 7 minutes and feels the questions were understandable |
| Generate first draft version | Let AI synthesize a first draft with confidence | Trigger generation from the Trust Packs surface only after the AI Profile is completed and citation-usable evidence exists, then show real progress and visible gaps instead of a blank spinner | User trusts the system is doing meaningful work |
| Review current version | Validate accuracy before sharing | Present the pack in sections with source links, status markers, provenance inspection, and lifecycle-aware review actions | User can review one section at a time without losing context |
| Approve and export | Move a reviewed version into buyer-facing use | Let the user approve a specific version, then export that approved version as Markdown with citations and the evidence appendix by default | User leaves with a usable artifact tied to a specific approved version |
| Return loop | Keep the pack current as docs change | Surface what changed, which sections are stale, and when a new version should be regenerated and reviewed | User can maintain the pack without redoing the full flow |

## 2. Page Map

### Primary Navigation

Keep global navigation to four items.

- `Home`
- `Evidence`
- `Trust Packs`
- `Settings / Team`

### Page Structure

| Area | Screen or view | Purpose |
| --- | --- | --- |
| Home | Workspace Overview | Entry point, setup progress, evidence summary, next-step CTA |
| Evidence | Evidence Library | Upload, inspect, classify, and replace source documents |
| Setup flow | AI Usage Wizard | Short stepper for AI-specific product context when setup is incomplete |
| Trust Packs | Current logical Trust Pack | Readiness summary, inline generation state, section review, approval, and Markdown export actions for the single phase-1 pack |
| Settings / Team | Workspace Settings | Company profile, export defaults, roles, and data controls |

### Secondary Surfaces

These should appear as overlays or drawers, not new primary pages.

- Upload drawer or modal
- Evidence details drawer
- Citation drawer in review mode
- Gap resolution drawer for missing inputs
- Confirm regeneration modal

### IA Notes

- The questionnaire should not be a top-level navigation item.
- Evidence and AI usage should feel like inputs into the Trust Pack, not separate products.
- `Trust Packs` should land on the workspace's single logical pack, not a pack list or new-pack setup branch.
- Generation is a trust-pack action or inline system state, not a canonical standalone page.
- The Trust Pack view should remain accessible before generation so the user can understand readiness, then become the single review / approve / export surface after a version exists.

## 3. Wireframe-Level Screen Descriptions

### Screen 1: Workspace Overview

- Purpose: orient first-time users and make one next step obvious.
- Layout: app shell with minimal left navigation, top header with workspace name, setup progress meter, and primary CTA area.
- Main content block: a three-step setup checklist with `Upload evidence`, `Complete AI profile`, and `Open Trust Packs`.
- Supporting content block: a compact preview of Trust Pack sections so the user understands the artifact they are building.
- Lower content block: evidence summary cards showing file count, ingestion health, last updated, and missing recommended evidence types.
- Right rail or side panel: "What customers will get" explanation with sample section names and estimated time to draft.
- Primary CTA: `Upload evidence`.
- Secondary CTA: `View Trust Packs` only when the user already has the required generation inputs or an existing version.
- Empty-state behavior: this is the main first-run landing screen and should not look like a blank dashboard.

### Screen 2: Upload Evidence

- Purpose: help users add source material quickly and understand what was accepted.
- Layout: page title and helper text on top, large drag-and-drop zone above a structured evidence table.
- Upload area: accepts common evidence formats such as PDF, DOCX, PPT, text, and URLs when supported by ingestion.
- Evidence table columns: file name, source type, extraction status, last updated, confidence, and actions.
- Auto-classification behavior: after upload, the system tags items like policy, SOC report, architecture doc, questionnaire response, or internal note.
- Right-side guidance panel: recommended evidence types for best results with short explanations in plain language.
- Inline issues: unsupported file, password-protected file, duplicate upload, failed text extraction.
- Footer action: `Continue to AI profile` becomes prominent once minimum viable evidence is present.
- Helpful rule: one strong processed document should be enough to move forward, but the UI should explain that more evidence improves draft quality.

### Screen 3: AI Usage Wizard

- Purpose: collect high-value AI details that are usually missing from uploaded documents.
- Layout: full-page or modal stepper with one main question per step and a persistent progress bar.
- Recommended length: 5 to 7 steps max.
- Question types: mostly multiple choice, structured selects, short text, and yes or no toggles.
- Suggested steps: whether the product uses AI, where AI appears in the product, providers or models used, what data reaches the model, human review or safety controls, customer-facing commitments.
- Language style: plain English and product language, not policy language.
- Preview panel: a live summary on the right that shows how answers will populate the AI-related trust-pack sections.
- `AIUsageMode = NONE` should shorten the flow into a minimal truthful completion path, not bypass completion.
- Unknown-capable fields may be left explicitly `UNKNOWN`, but the wizard still ends with `Complete AI profile`.
- End-of-wizard summary: unresolved gaps, saved answers, and CTA to complete the AI Profile, then continue into Trust Packs when evidence is ready.
- Success criteria: user should feel like they are clarifying product reality, not completing compliance paperwork.

### Inline Generation State Inside Trust Packs

- Purpose: turn a passive waiting moment into a confidence-building inline system state inside the Trust Packs surface.
- Entry condition: generation is available only after the workspace has both a completed AI Profile and at least one processed, citation-usable evidence document.
- Layout: progress area within the Trust Pack detail surface, with section list, current activity, and surfaced gaps.
- Section list: show live statuses such as `Queued`, `Analyzing`, `Drafting`, `Needs input`, and `Ready for review`.
- Activity area: describe what the system is doing in human terms, such as reviewing evidence, extracting security controls, or drafting AI-related sections.
- Gap panel: surface blockers and low-confidence gaps with quick actions where needed.
- Time guidance: estimated time remaining with honest ranges instead of false precision.
- Partial completion behavior: allow the user to enter review mode as soon as at least one section is ready.
- Failure containment: if one section fails, the whole pack should not be blocked.
- Primary CTA on completion: `Review draft`.

### Screen 5: Review And Approve Trust Pack

- Purpose: make the current version easy to verify, inspect, and move through readiness and approval.
- Layout: three-column review workspace.
- Left column: section navigation with status badges and warning counts.
- Center column: selected section content with current lifecycle state and version status.
- Right column: evidence drawer showing citations, source snippets, confidence, and related wizard answers.
- Top summary bar: pack readiness, approval blockers, unresolved issues, and export availability.
- Each section card should show: section title, short summary, generated content, claim-level citations, claim status, and missing-detail text where applicable.
- Action bar: `Mark ready for review`, `Send back to draft`, `Approve version`, `Export`, or `Export again` as lifecycle rules allow.
- Review order: users should be able to move through sections linearly from top to bottom.
- Highlighting: claims without strong support should be visually distinct but not alarming.
- Human control: approval and export should always operate on the visible current version, not a hidden regenerated draft.
- `READY_FOR_REVIEW` and approval should not imply every claim is `FOUND`; visible `PARTIAL` and `NOT_FOUND` claims remain valid review outcomes when honestly presented.

### Export Behavior Inside Trust Packs

- Purpose: let the user turn the approved Trust Pack into a shareable buyer-facing artifact without leaving the current review surface.
- Export is available only when lifecycle rules permit it for the visible current version.
- Phase-1 shipped export is Markdown-only.
- Citations and the evidence appendix are included by default.
- Buyer-facing export should omit raw internal workflow chrome and raw `FOUND`, `PARTIAL`, and `NOT_FOUND` labels.

## 4. Suggested Trust Pack Structure

The generated pack should be predictable enough for repeat review.

- Company Snapshot
- Product and Data Boundary
- Security Baseline
- AI Systems Inventory
- AI Data Usage and Retention
- AI Risk Controls and Human Oversight
- Evidence Appendix

## 5. Design Principles

- One obvious next step per screen. Every major screen should answer "what should I do now?" without requiring exploration.
- Reviewability over magic. AI can synthesize, but the UI must show where claims came from and what still needs human judgment.
- Progressive disclosure over UI sprawl. Keep advanced settings, edge cases, and low-frequency actions behind drawers or secondary actions.
- Plain-language trust. Write labels and helper text for operators and builders, not just compliance specialists.
- Speed to first artifact. The user should reach a first draft quickly, even if some sections are marked low confidence.
- Version-level control. Users should review, approve, export, and regenerate whole versions on the same Trust Packs surface rather than bouncing across multiple workflows.
- Visible evidence chain. Users should always be able to see which uploaded materials or wizard answers support a statement.
- Just-in-time follow-up questions. Ask for missing inputs only when they materially improve a draft, not upfront by default.
- Stable approved history. Approved or exported versions should never be mutated in place.

## 6. Component Inventory

| Component | Purpose | Notes |
| --- | --- | --- |
| App shell | Holds minimal navigation and workspace context | Keep persistent and quiet |
| Setup checklist | Guides the first-run workflow | Core orientation element on workspace screen |
| Readiness meter | Shows progress toward a reviewable pack | Use simple percent or steps complete |
| Trust Pack preview card | Explains the artifact early | Helps non-experts understand the outcome |
| Drag-and-drop upload zone | Primary evidence ingestion control | Should support multiple files |
| Evidence table | Tracks source files and ingestion status | Must allow replace, remove, inspect |
| Evidence type chip | Shows document classification | Policy, report, architecture, questionnaire, note |
| Issue banner | Calls out upload or extraction problems | Non-blocking where possible |
| Wizard stepper | Collects AI-specific context | Short and focused |
| Question card | Single-question interaction unit | Keep content density low |
| Live preview panel | Shows how answers shape the pack | Builds confidence during wizard |
| Generation tracker | Displays section-by-section progress | Avoid empty spinner-only states |
| Section status badge | Signals local review context | Keep aligned to claim status and version lifecycle |
| Review workspace | Main draft verification surface | High-priority screen in phase 1 |
| Citation chip | Links claims to supporting evidence | Opens evidence drawer |
| Evidence drawer | Displays supporting sources and snippets | Essential for review trust |
| Gap prompt card | Requests missing information at the right moment | Keep optional unless truly blocking |
| Export action state | Packages the final artifact from the review surface | Markdown-only in shipped phase 1 |
| Confirmation toast or panel | Confirms save, approval, export | Keep reassuring and specific |

## 7. Empty, Loading, and Error States

| Context | Empty state | Loading state | Error state |
| --- | --- | --- | --- |
| Home | Show guided setup card, short explanation of the outcome, and `Upload evidence` CTA | Skeleton for checklist and preview cards | If workspace data fails, show retry plus short reassurance that no files were lost |
| Evidence Library | Explain what counts as evidence and show recommended file examples | Per-file upload progress and extraction badges | For bad files, show reason and next best action such as retry, replace, or skip |
| AI Usage Wizard | If the workspace does not use AI, guide the user through the minimal truthful `NONE` path and still require `Complete AI profile` | Save step state quickly and show lightweight inline progress | Preserve completed answers and return user to the failed step with clear recovery |
| Trust Packs inline generation | Never show a blank spinner-only state; show sections and active work inside the Trust Packs surface | Live progress at section level | If a section fails, mark only that section as failed and allow retry or manual fill |
| Review | If a section is empty, explain whether it is waiting on generation or missing input | Skeleton content blocks for sections not yet ready | If citations cannot load, keep content visible and show evidence drawer retry |
| Export | If no approved or exported version exists, explain what must be completed before export from the same Trust Packs surface | Show export packaging progress and version creation | If export fails, keep the current version intact and offer retry without data loss |

## 8. Review Workflow Behavior

### Review Model

- The Trust Pack is reviewed section by section, not as one large generated blob.
- Section-level indicators can show states such as `Needs input` or `Needs review`, but these are local review aids rather than the formal pack lifecycle.
- Formal approval is version-wide and follows `DRAFT -> READY_FOR_REVIEW -> APPROVED -> EXPORTED` with `STALE` as the conservative invalidation state.
- Export availability follows pack-version status, not a rollup of informal section badges.
- Approval does not require every claim to be `FOUND`; honest `PARTIAL` and `NOT_FOUND` claims may remain visible and reviewable.

### Citation and Evidence Behavior

- Every important claim should show at least one citation chip or a marker that it came from the AI Usage Wizard.
- Clicking a citation should open the evidence drawer with source metadata, snippet or excerpt, and source confidence.
- Claims with weak or indirect support should be marked `Low confidence` rather than hidden.
- If no evidence is available for a claim, the UI should show the honest gap and point the user toward adding evidence or updating the AI Profile before regenerating.

### AI Assistance Rules

- Safe assist actions should be constrained and legible, such as regenerate a stale version from current evidence and AI Profile inputs.
- Large hidden rewrites should be avoided in phase 1.
- Approved or exported content should not be mutated in place.

### Gap Resolution

- Missing information should appear as compact prompt cards tied to the affected section.
- Gap prompts should ask for the smallest useful input, not open a long questionnaire.
- Resolving a gap should happen by adding evidence or updating the AI Profile, then regenerating a new version when needed.

### Approval and Export Rules

- Sections may be reviewed individually, but formal approval is pack-version-wide.
- Approval and export blockers are governed by `docs/trust-pack-lifecycle.md`; this UX doc should not redefine them.
- Export is available only for `APPROVED` and `EXPORTED` versions.
- Buyer-facing export should omit raw internal workflow chrome and raw claim-status labels while preserving citations and the evidence appendix by default.
- Non-critical issues such as low-confidence wording should warn during review, but the final decision still happens through version approval.

## 9. Figma Frame List

Use these as the initial screen set.

- `01 Workspace Overview - First Run`
- `02 Upload Evidence - With Files`
- `03 AI Usage Wizard - Mid Flow`
- `04 Trust Packs - Generating First Draft`
- `05 Review Trust Pack - Current Version`
- `06 Review Trust Pack - Citation Drawer Open`

## 10. Key UX Decisions to Protect in V2

- Do not introduce a broad dashboard with many competing cards.
- Do not put the full questionnaire in primary navigation.
- Do not hide evidence provenance behind separate admin pages.
- Do not require security expertise to complete the first draft flow.
