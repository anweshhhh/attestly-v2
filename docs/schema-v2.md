# Schema v2

## Schema Goals
The phase-1 schema should support one narrow product loop:

`Workspace -> Evidence -> AI Profile -> Trust Pack -> Review -> Export`

It should preserve V1's trust model while creating a cleaner domain for trust-pack generation and later questionnaire reuse.

This schema must align with:
- `docs/trust-pack-lifecycle.md` for version lifecycle ownership
- `docs/ai-profile-wizard.md` for wizard save-and-resume and field persistence
- `docs/claim-catalog-v1.md` for stable claim keys and reuse boundaries

## Core Enums
```ts
MembershipRole = OWNER | ADMIN | REVIEWER | VIEWER
ClaimStatus = FOUND | PARTIAL | NOT_FOUND
PackStatus = DRAFT | READY_FOR_REVIEW | APPROVED | STALE | EXPORTED
CitationSourceType = DOCUMENT | WIZARD_ATTESTATION
AIUsageMode = NONE | INTERNAL_ONLY | CUSTOMER_FACING | BOTH
ExportFormat = MARKDOWN | DOCX | PDF
```

## Supporting Enums
These are useful implementation helpers for phase 1.

```ts
DocumentStatus = UPLOADED | CHUNKED | ERROR | ARCHIVED
ClaimOrigin = GENERATED | MANUAL_EDIT
WizardDraftStatus = IN_PROGRESS | COMPLETED | ABANDONED
WizardStepKey =
  COMPANY_PRODUCT_BASICS |
  AI_USAGE_MODE |
  MODELS_VENDORS |
  DATA_USAGE_TRAINING |
  SAFEGUARDS_HUMAN_OVERSIGHT |
  OPEN_GAPS
WizardFieldState = PROVIDED | UNKNOWN | UNANSWERED
```

## Core Entities
### Workspace
Top-level tenant boundary.

Suggested fields:
- `id`
- `name`
- `slug`
- `planTier` or equivalent lightweight free-tier flag
- `createdAt`
- `updatedAt`

Rules:
- all product data belongs to exactly one workspace
- free-tier gating is a workspace-level concern, not a separate billing subsystem in phase 1

### Membership
Maps users to a workspace and role.

Suggested fields:
- `id`
- `workspaceId`
- `userId`
- `role: MembershipRole`
- `createdAt`

Rules:
- unique on `workspaceId + userId`
- permissions derive from role and always apply within a workspace boundary

### EvidenceDocument
Uploaded trust evidence owned by a workspace.

Suggested fields:
- `id`
- `workspaceId`
- `name`
- `originalName`
- `mimeType`
- `status: DocumentStatus`
- `uploadedByUserId`
- `evidenceFingerprint`
- `createdAt`
- `updatedAt`

Rules:
- no cross-workspace visibility
- document changes can stale downstream trust-pack versions

### EvidenceChunk
Chunked unit used for retrieval and citations.

Suggested fields:
- `id`
- `documentId`
- `chunkIndex`
- `content`
- `embedding`
- `evidenceFingerprint`
- `createdAt`

Rules:
- chunks inherit workspace ownership through the parent document
- only workspace-owned chunks can be cited

### AIProfileDraftSession
Mutable save-and-resume state for the AI Usage Wizard.

Suggested fields:
- `id`
- `workspaceId`
- `basedOnAIProfileId` nullable
- `status: WizardDraftStatus`
- `currentStepKey: WizardStepKey`
- `draftPayloadJson`
- `fieldStateJson`
- `schemaVersion`
- `startedByUserId`
- `completedAIProfileId` nullable
- `lastSavedAt`
- `createdAt`
- `updatedAt`

Rules:
- at most one `IN_PROGRESS` wizard draft per workspace in phase 1
- `draftPayloadJson` uses the stable `fieldKey` values defined in `docs/ai-profile-wizard.md`
- repeatable groups in `draftPayloadJson` must persist a stable per-item identifier so provenance can address one entry deterministically within the draft and any later completed version
- `fieldStateJson` stores per-field `PROVIDED`, `UNKNOWN`, or `UNANSWERED`
- save-and-resume reads and writes this entity only; it does not mutate an immutable `AIProfile`
- `ai_usage_mode` may be `UNKNOWN` while the draft is still `IN_PROGRESS`
- completing the wizard creates a new `AIProfile` version and marks the draft session `COMPLETED`

### AIProfile
Immutable first-party attestation version produced by completing the wizard.

Suggested fields:
- `id`
- `workspaceId`
- `versionNumber`
- `aiUsageMode: AIUsageMode`
- `payloadJson`
- `fieldStateJson`
- `schemaVersion`
- `attestedByUserId`
- `createdAt`

Rules:
- immutable once created
- a new wizard completion creates a new version
- `payloadJson` keys must match the stable wizard `fieldKey` contract
- repeatable groups in `payloadJson` must preserve stable item identifiers so citations can resolve exact paths such as `ai_systems[itemId].provider_name`
- `fieldStateJson` preserves explicit unknowns for provenance and regeneration behavior
- completion requires a resolved canonical `AIUsageMode`; `UNKNOWN` is valid only while drafting, not on the persisted immutable `AIProfile`
- trust-pack versions reference the specific `AIProfile` version used to generate them

### TrustPack
Single logical trust-pack container for a workspace in phase 1.

Suggested fields:
- `id`
- `workspaceId`
- `title`
- `currentVersionId`
- `createdByUserId`
- `createdAt`
- `updatedAt`

Rules:
- phase 1 assumes exactly one logical `TrustPack` container per workspace
- free tier should allow only one active draft version
- this entity is the logical container only
- lifecycle status is not stored here
- `currentVersionId` points to the workspace's current version of that one logical pack
- the current pack state in UI is derived from `currentVersionId -> TrustPackVersion.status`

### TrustPackVersion
Version-scoped working record for generation, review, approval, and export.

Suggested fields:
- `id`
- `trustPackId`
- `versionNumber`
- `status: PackStatus`
- `aiProfileId`
- `createdFromVersionId` nullable
- `generationInputHash`
- `createdByUserId`
- `createdAt`
- `updatedAt`

Rules:
- lifecycle status lives here, not on `TrustPack`
- creating a new draft version requires both a completed `AIProfile` and at least one processed, citation-usable evidence document
- each regeneration creates a new version
- approvals and exports attach to a specific version
- versions are mutable only while `status` is `DRAFT` or `READY_FOR_REVIEW`
- versions are read-only once `status` is `APPROVED`, `EXPORTED`, or `STALE`
- editing an approved or exported pack creates a new draft version linked by `createdFromVersionId`

### ApprovalRecord
Version-specific approval event.

Suggested fields:
- `id`
- `trustPackVersionId`
- `approvedByUserId`
- `note` nullable
- `createdAt`

Rules:
- approval history is version-specific
- phase 1 allows at most one approval record per version
- approval exists only after `READY_FOR_REVIEW -> APPROVED`
- export requires an existing approval record for the same version

### TrustPackSection
Ordered section within a trust-pack version.

Suggested fields:
- `id`
- `trustPackVersionId`
- `key`
- `title`
- `orderIndex`
- `summaryText`

Rules:
- section order is fixed by product spec
- section content is a container for claims, not the trust source itself

### TrustPackClaim
Atomic answer unit used for trust-pack review and later questionnaire reuse.

Suggested fields:
- `id`
- `sectionId`
- `key`
- `prompt`
- `answerText`
- `status: ClaimStatus`
- `origin: ClaimOrigin`
- `missingDetailsText`
- `editedByUserId`
- `updatedAt`

Rules:
- `FOUND` requires one or more citations
- `PARTIAL` requires one or more citations plus explicit missing details
- `NOT_FOUND` requires zero citations
- no canned template-answer model exists in the answering path

### Citation
Provenance attached to a specific trust-pack claim.

Suggested fields:
- `id`
- `claimId`
- `sourceType: CitationSourceType`
- `sourceDocumentId` nullable
- `sourceChunkId` nullable
- `sourceAIProfileId` nullable
- `sourceFieldPath` nullable
- `quotedSnippet`
- `locator`
- `orderIndex`

Rules:
- citations must resolve to sources in the same workspace
- `DOCUMENT` citations reference a document and chunk
- `WIZARD_ATTESTATION` citations reference a specific immutable AI-profile version and exact field path
- repeatable wizard citations must remain item-addressable, for example `ai_systems[itemId].provider_name`

### ExportRecord
Tracks export events for a trust-pack version.

Suggested fields:
- `id`
- `trustPackVersionId`
- `format: ExportFormat`
- `exportedByUserId`
- `createdAt`

Rules:
- records the exact version exported
- export history is version-specific
- does not replace pack approval state
- multiple export records may exist for the same approved or exported version

## Relationship Overview
```text
Workspace
|- Membership
|- EvidenceDocument
|  |- EvidenceChunk
|- AIProfileDraftSession
|- AIProfile (versioned)
|- TrustPack
   |- currentVersionId -> TrustPackVersion
   |- TrustPackVersion
      |- TrustPackSection
         |- TrustPackClaim
            |- Citation
      |- ApprovalRecord
      |- ExportRecord
```

## Lifecycle Alignment
- `TrustPackVersion.status` is the source of truth for `DRAFT`, `READY_FOR_REVIEW`, `APPROVED`, `STALE`, and `EXPORTED`
- phase 1 has one logical `TrustPack` container per workspace, with version history under it
- `TrustPack.currentVersionId` points to the version the workspace is currently working from for that one logical pack
- the workspace should not store duplicate pack status on `TrustPack`
- approval and export history always resolve to a specific `TrustPackVersion`
- stale source changes do not rewrite history; they make the current version stale and require a new draft version
- a new draft version can be created only when the workspace has a completed `AIProfile` and at least one processed, citation-usable evidence document

## Wizard Persistence Alignment
- save-and-resume is backed by `AIProfileDraftSession`
- wizard completion materializes an immutable `AIProfile`
- `AIProfileDraftSession.draftPayloadJson` and `AIProfile.payloadJson` must use the same stable `fieldKey` contract
- `fieldStateJson` must distinguish `UNKNOWN` from `UNANSWERED`; null or missing values alone are not enough
- only completed `AIProfile` versions can be cited in a Trust Pack

## Guardrails
- org-scoped isolation is the primary tenant boundary
- RBAC enforcement is required on every mutating and sensitive read path
- phase 1 does not model a pack list or multiple logical pack containers per workspace
- `FOUND` claims require citations
- `NOT_FOUND` claims must have no citations
- `PARTIAL` claims require citations plus explicit missing detail
- wizard attestations are citable provenance, not hidden prompt state
- evidence retrieval and claim generation must not rely on canned templates
- versions are exportable only after approval, and export history is always version-specific

## Staleness Model
- changing cited evidence or completing a new `AIProfile` version should mark the current `TrustPackVersion` `STALE`
- stale status lives on the version, while `TrustPack.currentVersionId` still points to that stale version until regeneration
- old versions remain inspectable for audit and export history

## Deferred Extension: Questionnaire Automation
Phase 1 should not introduce separate answer-template entities for questionnaires.

When questionnaires arrive later, they should reuse:
- `TrustPackClaim` as the reusable answer unit
- the same evidence and citation rules
- the same workspace/RBAC boundaries

Likely future additions:
- `Questionnaire`
- `QuestionnaireItem`
- `QuestionnaireAnswer`
- mapping from buyer question to candidate `TrustPackClaim`
