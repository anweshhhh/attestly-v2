# User Journeys

## Journey 1: Founder Or CTO Creates The First Trust Pack
### Persona
Founder or CTO at a small B2B SaaS company preparing for buyer diligence.

### Trigger
A prospect asks for security and AI usage details before procurement or technical review can move forward.

### Success outcome
The user produces a grounded first trust-pack version inside the workspace's single logical Trust Pack container, reviews it honestly, and gets it approved for buyer-facing export without hunting through scattered materials again.

### Flow
1. User creates or enters a workspace.
2. User lands on Home and sees the primary call to action: upload evidence.
3. User uploads trust-relevant files such as policies, architecture notes, product docs, and existing security responses.
4. User opens the AI Usage Wizard and answers a structured stepper about product basics, AI use, models/vendors, data usage, safeguards, and open gaps.
5. If the product does not use AI, the user still completes the minimal truthful `AIUsageMode = NONE` path and creates a completed AI Profile.
6. Once the workspace has both a completed AI Profile and at least one processed, citation-usable evidence document, the user generates the first draft version inside `Trust Packs`.
7. The system assembles fixed sections under the workspace's single logical Trust Pack and marks each claim as `FOUND`, `PARTIAL`, or `NOT_FOUND`.
8. User reviews the version, sees citations inline, and spots gaps that need cleanup or honest retention.
9. User marks the version `READY_FOR_REVIEW`.
10. An `OWNER` or `ADMIN` approves the version even if some claims remain visible as `PARTIAL` or `NOT_FOUND`.
11. User exports a buyer-facing Markdown packet that includes citations and the evidence appendix by default without exposing raw internal workflow chrome or raw claim-status labels.

### System expectations
- Evidence upload must feel fast and obvious.
- Wizard answers must be stored as versioned first-party attestations.
- Generation must remain blocked until both required inputs exist: a completed AI Profile and at least one processed, citation-usable evidence document.
- The first generated pack must make missing information explicit instead of smoothing it over.

## Journey 2: User Resolves PARTIAL And NOT_FOUND Gaps
### Persona
Founder, CTO, or reviewer improving a draft before sharing it externally.

### Trigger
The generated trust pack contains claims flagged as `PARTIAL` or `NOT_FOUND`.

### Success outcome
The user can resolve missing or weak sections by adding evidence, updating AI attestations, or deliberately leaving honest gaps visible in a new version when full resolution is not possible.

### Flow
1. User opens a draft trust pack and sees section-level and claim-level statuses.
2. User inspects claims marked `PARTIAL` or `NOT_FOUND` and opens provenance to understand what is missing.
3. For document-backed gaps, user uploads more evidence or replaces outdated documents.
4. For first-party disclosure gaps, user reopens the AI Usage Wizard and updates answers.
5. The current trust-pack version is marked `STALE` and can be regenerated inside the workspace's single logical Trust Pack.
6. On regeneration, claims either move to `FOUND`, stay `PARTIAL`, or remain `NOT_FOUND`.
7. User reviews whether the updated citations and wording are acceptable for approval, knowing that some honest `PARTIAL` or `NOT_FOUND` claims may remain.

### System expectations
- `PARTIAL` claims must keep supporting citations while clearly calling out what is missing.
- `NOT_FOUND` claims must never fabricate content or carry citations.
- Evidence or wizard changes must create a visible stale/regenerate path.
- Approval is still possible when `PARTIAL` or `NOT_FOUND` claims remain as honest limitations.

## Journey 3: Solutions Engineer Exports And Adapts A Pack For A Live Buyer Request
### Persona
Solutions engineer supporting a live enterprise deal.

### Trigger
A buyer requests a security and AI overview, but not yet a full questionnaire.

### Success outcome
The user exports a buyer-facing Markdown trust-pack version for the deal while preserving confidence about what is grounded, what is limited, and which exact approved version was shared.

### Flow
1. Solutions engineer opens the latest `APPROVED` or `EXPORTED` trust-pack version from the workspace's single logical Trust Pack.
2. User scans the pack to confirm sections relevant to the buyer request are complete.
3. User exports the packet in Markdown format.
4. User adapts the exported text for the buyer's format outside or later inside the product.
5. If the buyer asks a new question, the user uses the pack as the source of truth instead of rewriting from scratch.

### System expectations
- Export should prioritize editability over presentation polish.
- Export should be available only for `APPROVED` or `EXPORTED` versions.
- The export should preserve section structure and claim text cleanly while omitting raw internal workflow chrome and raw `FOUND`, `PARTIAL`, and `NOT_FOUND` labels.
- Citations and the evidence appendix should be included by default in phase 1.
- Citations and provenance must remain easy to trace back in-product.

## Journey 4: Admin And Reviewer Collaborate Under RBAC
### Persona
Admin coordinating workspace setup and reviewer validating output quality.

### Trigger
A small team needs to share trust-pack work without exposing everything to everyone or losing audit discipline.

### Success outcome
The workspace supports safe collaboration: admins manage evidence and setup, reviewers verify claims, viewers can inspect outputs without mutating them.

### Flow
1. Admin creates the workspace and invites teammates.
2. Admin uploads evidence and starts the AI Usage Wizard.
3. Reviewer opens the generated trust pack and inspects citations plus claim status.
4. Reviewer flags weak areas through provenance inspection and asks for follow-up evidence or AI Profile updates when needed.
5. Admin or owner approves the pack for export.
6. Viewer can inspect the final artifact without changing source materials.

### System expectations
- access remains org-scoped at every layer
- roles govern who can upload evidence, update attestations, review claims, approve versions, and export
- no user can cite evidence from another workspace
- approval and export should happen against a specific pack version
- approved or exported history remains immutable, and stale follow-up work happens through regeneration of a new version
