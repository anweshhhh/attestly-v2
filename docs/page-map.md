# Page Map

## Phase 1 IA
Phase 1 should feel like a guided trust-pack workspace, not a broad compliance platform. The primary navigation is intentionally small:

- `Home`
- `Evidence`
- `Trust Packs`
- `Settings / Team`

## Core Flow
`Home -> Evidence -> Complete AI Profile -> Generate Trust Pack -> Review current version -> Approve version -> Export Markdown`

## Sitemap
```text
Home
|- Empty workspace onboarding
|- Progress checklist
|- Open trust packs

Evidence
|- Evidence library
|- Upload flow
|- Document detail / status

Trust Packs
|- Current logical trust pack
|  |- Current version review
|  |- Review / approve
|  |- Export Markdown

Settings / Team
|- Workspace settings
|- Team / roles
```

## Page Inventory
| Surface | Suggested route | Purpose | Primary actions |
| --- | --- | --- | --- |
| Home | `/` | Guided starting point for new and returning users | Upload evidence, continue wizard, open current trust pack |
| Evidence Library | `/evidence` | Store and inspect trust-relevant source material | Upload, replace, archive, view processing status |
| AI Usage Wizard | `/ai-profile` | Collect structured first-party AI attestations for the workspace | Save draft, continue, complete wizard |
| Trust Packs | `/trust-packs` | Land on the workspace's single logical trust pack and current version review surface | Generate first version when ready, open current version, inspect provenance, mark ready, approve, export Markdown |
| Settings / Team | `/settings/team` | Manage collaborators and roles | Invite, change role, remove member |

## Home Page Requirements
- Show one dominant CTA based on workspace state.
- For empty workspaces, direct users to upload evidence first.
- For partially configured workspaces, show progress through evidence, AI profile completion, and trust-pack readiness.
- For mature workspaces, show the latest pack status and a resume action.

## Evidence Page Requirements
- Center phase 1 evidence work on uploading and validating documents.
- Show document status, last updated time, and whether documents are actively used by the current pack.
- Avoid turning the evidence page into a document-management system with folders, tags, or broad governance features in phase 1.

## Trust Packs Area Requirements
- This is the heart of phase 1.
- `Trust Packs` is the global-nav label, but in phase 1 it lands on the workspace's single logical trust pack rather than a pack list.
- Trust Packs should include generation, review, approval, and export behavior for that single logical pack on one current-pack surface.
- Generation is an inline action or transitional state inside the trust-pack experience, not a standalone page.
- Generating the first or next draft version requires both a completed AI Profile and at least one processed, citation-usable evidence document.
- The review page should emphasize section status, claim status, citations, approval readiness, and Markdown export readiness.
- The product should not expose a separate questionnaire workbench in phase 1.

## Settings / Team Requirements
- Keep this lean: workspace identity, roles, and membership management.
- Support `OWNER`, `ADMIN`, `REVIEWER`, and `VIEWER`.
- Do not add billing-center complexity in phase 1.

## Deferred Surfaces
These should be explicitly documented as later work, not hidden phase-1 obligations:

- questionnaire import and autofill
- approved-answer library UI
- public trust center / portal
- CRM integrations
- broad integrations marketplace
- advanced analytics or admin reporting

## IA Notes
- The IA should optimize for founder/CTO clarity first, not enterprise admin breadth.
- The trust-pack flow should be linear and obvious without introducing a separate generate route, pack list, or new-pack setup branch.
- `AIUsageMode = NONE` still completes a minimal truthful AI Profile before trust-pack generation becomes available.
- Review depth should increase only after the first trust-pack draft exists.
