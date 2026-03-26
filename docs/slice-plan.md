# Slice Plan

## Goal
Ship the first trust-pack wedge in four vertical slices, each producing a usable increment without dragging in questionnaire-era sprawl.

## Slice 1: Workspace Foundation And Evidence Library
### Goal
Establish the tenant, permissions, and evidence base needed for everything else.

### Scope
- workspace creation and identity
- auth and RBAC
- org-scoped isolation
- Home empty-state onboarding
- Evidence page with upload, processing state, and basic evidence library
- Settings / Team with role management

### Dependencies
- none; this is the foundation slice

### Acceptance criteria
- a new workspace can be created and accessed only by authorized members
- users can upload trust-relevant evidence documents
- evidence is clearly tied to the workspace
- Home directs users toward the next meaningful setup action
- role boundaries for `OWNER`, `ADMIN`, `REVIEWER`, and `VIEWER` are defined

### Out of scope
- AI Usage Wizard
- trust-pack generation
- export
- questionnaire surfaces

## Slice 2: AI Usage Wizard And Attestation Versioning
### Goal
Capture structured first-party AI disclosures that can be cited and versioned.

### Scope
- AI Usage Wizard stepper
- save-and-resume wizard state
- immutable `AIProfile` version creation on completion
- explicit unknown handling
- stale/regenerate signaling when profile data changes

### Dependencies
- Slice 1 workspace, auth, and evidence foundations

### Acceptance criteria
- a user can complete the wizard with structured answers
- unknowns can be recorded explicitly
- completing the wizard creates a versioned attestation set
- trust-pack generation has a clear upstream input to consume
- updating the wizard later does not overwrite prior versions

### Out of scope
- trust-pack review UI
- export behavior
- later questionnaire reuse

## Slice 3: Trust Pack Generation And Claim Assembly
### Goal
Generate the first evidence-backed trust pack from evidence plus wizard attestations.

### Scope
- trust-pack generation for the workspace's single logical current pack
- fixed-section assembly
- section and claim generation
- claim-level citations
- strict `FOUND`, `PARTIAL`, and `NOT_FOUND` behavior
- current-version review foundation on the `Trust Packs` surface

### Dependencies
- Slice 1 evidence library
- Slice 2 AI-profile inputs

### Acceptance criteria
- a user can generate a trust-pack draft from available inputs
- all generated claims are statused as `FOUND`, `PARTIAL`, or `NOT_FOUND`
- every `FOUND` claim includes citations
- every `NOT_FOUND` claim has no citations
- wizard attestations can appear as citeable provenance
- changing source inputs can mark the pack `STALE`

### Out of scope
- final approval workflow
- polished export handling
- questionnaire automation

## Slice 4: Review, Approve, Export, And Minimal Free-Tier Gating
### Goal
Make the trust pack shippable as a real workflow artifact.

### Scope
- review and approval workflow for the current trust-pack version
- pack readiness and approval state
- Markdown export tied to the approved current version
- minimal free-tier gating for one active draft and limited evidence volume

### Dependencies
- Slice 3 trust-pack generation

### Acceptance criteria
- reviewers can inspect claim status and provenance before export
- a pack can move from draft to review-ready to approved
- Markdown exports are tied to a specific approved or exported pack version
- free-tier limits are enforced without adding a full billing subsystem

### Out of scope
- public trust portal
- CRM and downstream workflow integrations
- pricing system depth

## Slice 5+
Later slices can add questionnaire automation by reusing `TrustPackClaim` plus the evidence engine. That work should come after the trust-pack workflow is stable and should not introduce a separate template-answer system.
