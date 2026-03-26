# AI Profile Wizard

## Purpose
The AI Profile Wizard captures structured, versioned first-party attestations about how a vendor uses AI. Its job is to turn fuzzy founder knowledge into explicit, reusable inputs for trust-pack generation.

The wizard is not:
- a chat prompt
- an unstructured questionnaire blob
- hidden context passed to the model without provenance

## Output
Completing the wizard creates a new immutable `AIProfile` version for the workspace. That version becomes a citable provenance source in the trust pack via `CitationSourceType = WIZARD_ATTESTATION`.

Save-and-resume happens through a separate mutable `AIProfileDraftSession`. The draft session is not itself citable.

## Interaction Model
- structured stepper
- save-and-resume support
- explicit unknown handling
- review summary before generation
- immutable version created on completion

## Persistence Contract
### Draft session
The wizard saves into `AIProfileDraftSession` while the user is still working.

Phase-1 rules:
- one active `IN_PROGRESS` draft session per workspace
- the session stores `currentStepKey`, `draftPayloadJson`, `fieldStateJson`, `schemaVersion`, and `lastSavedAt`
- `draftPayloadJson` keys must exactly match the `fieldKey` values in this document
- `fieldStateJson` stores `PROVIDED`, `UNKNOWN`, or `UNANSWERED` per field

### Completion
When the user completes the wizard:
- the active draft session is validated
- `ai_usage_mode` may remain `UNKNOWN` while the draft is still in progress, but completion requires a resolved canonical `AIUsageMode` enum value
- an immutable `AIProfile` version is created
- the draft session is marked `COMPLETED`
- the current Trust Pack version becomes `STALE` if it was generated from an older `AIProfile`

### Unknown handling
- `allowsUnknown = yes` means the UI must offer an explicit unknown state
- an unknown field is persisted as `WizardFieldState = UNKNOWN`, not as missing data
- only fields with `citableInTrustPack = yes` and `fieldState = PROVIDED` may be cited in the Trust Pack

## Field Type Legend
- `shortText`: single-line text
- `longText`: multi-line text
- `url`: URL or primary domain string
- `enum`: single-select controlled value
- `boolean`: yes/no value
- `multiSelect`: multi-value controlled list
- `date`: date only

## Field Contract
These field keys are stable phase-1 identifiers and should be used consistently in UI, persistence, provenance, and Trust Pack generation.

## Step 1: Company / Product Basics
### Goal
Capture the baseline identity and product context needed to frame the trust pack.

### Fields
| fieldKey | Label | Type | Required | Repeatable | allowsUnknown | citableInTrustPack | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `company_legal_name` | Company legal name | `shortText` | Required | No | No | Yes | Supports company identity claims |
| `product_name` | Product name | `shortText` | Required | No | No | Yes | Supports company identity claims |
| `primary_domain` | Website or primary domain | `url` | Optional | No | No | No | Useful workspace metadata, not a primary cited claim input |
| `product_summary` | Product summary | `longText` | Required | No | Yes | Yes | Supports product summary claims |
| `deployment_model` | Deployment model | `enum` | Required | No | Yes | Yes | Suggested values: SaaS, Managed Service, Self-Hosted, Hybrid |
| `primary_customer_type` | Primary customer type | `shortText` | Optional | No | Yes | No | Helpful context, not a core claim key in phase 1 |
| `internal_trust_owner` | Primary trust owner | `shortText` | Optional | No | No | No | Operational field only |

### Notes
- Keep required fields lightweight so first-run completion is fast.
- This step should feed the `Company Snapshot` and `Product / Data Boundary` sections.

## Step 2: AI Usage Mode
### Goal
State whether and where AI is used in the product or internal workflow.

### Fields
| fieldKey | Label | Type | Required | Repeatable | allowsUnknown | citableInTrustPack | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ai_usage_mode` | How is AI used today? | `enum` | Required | No | Yes | Yes | Uses `AIUsageMode = NONE | INTERNAL_ONLY | CUSTOMER_FACING | BOTH` |
| `ai_usage_summary` | Short summary of AI usage | `longText` | Optional | No | Yes | Yes | High-level narrative input for AI usage inventory claims |
| `ai_output_visible_to_end_users` | Is AI output visible to end users? | `boolean` | Optional | No | Yes | Yes | Relevant when `ai_usage_mode` is customer-facing or both |
| `ai_internal_use_areas` | Internal AI use areas | `multiSelect` | Optional | No | Yes | Yes | Suggested values: support, sales, coding, operations, other |

### Notes
- If `NONE`, later AI-specific steps should collapse to a lighter path rather than forcing irrelevant detail.
- `UNKNOWN` is allowed while drafting this field, but the review-summary completion path must resolve it to `NONE`, `INTERNAL_ONLY`, `CUSTOMER_FACING`, or `BOTH`.
- This step should directly influence whether AI sections are empty, short, or fully populated.

## Step 3: Models / Vendors
### Goal
Create a clear inventory of AI systems involved in the product or internal operations.

### Fields
Each entry in `ai_systems` is repeatable.

| fieldKey | Label | Type | Required | Repeatable | allowsUnknown | citableInTrustPack | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ai_systems.provider_name` | Provider or vendor name | `shortText` | Required | Yes | Yes | Yes | Required per AI system entry when AI is in use |
| `ai_systems.model_or_service` | Model family or service type | `shortText` | Required | Yes | Yes | Yes | Example: GPT-4 class model, embedding API, classifier service |
| `ai_systems.use_case` | Primary use case | `longText` | Required | Yes | Yes | Yes | Supports AI feature inventory claims |
| `ai_systems.hosting_mode` | Hosting mode | `enum` | Required | Yes | Yes | Yes | Suggested values: vendor-hosted, self-managed, mixed |
| `ai_systems.customer_data_sent` | Does customer data reach this system? | `boolean` | Required | Yes | Yes | Yes | Supports downstream data-use claims |
| `ai_systems.notes` | Additional notes | `longText` | Optional | Yes | Yes | No | Contextual only in phase 1 |

### Notes
- Store vendor and model entries as structured list items, not freeform text only.
- Each repeatable item must carry a stable item identifier in persistence so later provenance can resolve paths like `ai_systems[itemId].provider_name` unambiguously against one immutable `AIProfile` version.
- This step should feed the `AI Systems Inventory` section.

## Step 4: Customer Data / Training Usage
### Goal
Capture how customer data interacts with AI systems and what retention or training posture exists.

### Fields
| fieldKey | Label | Type | Required | Repeatable | allowsUnknown | citableInTrustPack | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ai_data_categories` | Data categories sent to AI systems | `multiSelect` | Optional | No | Yes | Yes | Suggested values: prompts, support tickets, documents, telemetry, metadata, other |
| `ai_customer_content_in_scope` | Can customer content be included? | `boolean` | Optional | No | Yes | Yes | Supports customer-data-to-AI claims |
| `ai_pii_in_scope` | Can PII be included? | `boolean` | Optional | No | Yes | Yes | Useful qualifier for data-risk review |
| `ai_training_usage` | Is customer data used for model training? | `enum` | Required | No | Yes | Yes | Suggested values: no, yes, limited/conditional |
| `ai_retention_posture` | Retention or deletion posture | `longText` | Optional | No | Yes | Yes | Supports retention posture claims |
| `ai_deletion_or_opt_out_posture` | Customer control or opt-out posture | `longText` | Optional | No | Yes | Yes | Supports customer control posture claims |
| `ai_vendor_handling_unknowns` | Unresolved vendor handling questions | `longText` | Optional | No | No | No | Used to drive `PARTIAL` or `NOT_FOUND`, not as support |

### Notes
- Unknown answers are allowed, but must stay explicit.
- This step feeds `AI Data Usage And Retention`.

## Step 5: Safeguards / Human Oversight
### Goal
Capture the operational controls that make AI use credible and reviewable.

### Fields
| fieldKey | Label | Type | Required | Repeatable | allowsUnknown | citableInTrustPack | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ai_human_review_exists` | Is there any human review or approval in AI workflows? | `boolean` | Optional | No | Yes | Yes | Supports human-review posture claims |
| `ai_human_review_description` | Describe human review or approval points | `longText` | Optional | No | Yes | Yes | Supports human-review posture claims |
| `ai_fallback_behavior` | What happens when AI output is weak or unavailable? | `longText` | Optional | No | Yes | Yes | Supports fallback and escalation claims |
| `ai_monitoring_and_logging` | Monitoring or logging for AI usage | `longText` | Optional | No | Yes | Yes | Supports monitoring and quality-control claims |
| `ai_access_controls` | Access or release controls around AI features | `longText` | Optional | No | Yes | Yes | Supports access and release control claims |
| `ai_evaluation_or_qa` | Evaluation or QA checks for AI systems | `longText` | Optional | No | Yes | Yes | Supports monitoring and quality-control claims |
| `ai_incident_escalation` | Incident or escalation path for unsafe output | `longText` | Optional | No | Yes | Yes | Supports fallback and escalation claims |

### Notes
- This step feeds `AI Risk Controls / Human Oversight`.
- The system should not imply controls the team cannot honestly attest to.

## Step 6: Open Gaps / Unknowns
### Goal
Let the team record incomplete or unresolved areas without blocking forward motion.

### Fields
Each entry in `open_gaps` is repeatable.

| fieldKey | Label | Type | Required | Repeatable | allowsUnknown | citableInTrustPack | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `open_gaps.category` | Gap category | `enum` | Required | Yes | No | No | Suggested values: open question, missing documentation, vendor unknown, control gap |
| `open_gaps.description` | Gap description | `longText` | Required | Yes | No | No | Drives follow-up and `PARTIAL`/`NOT_FOUND` visibility |
| `open_gaps.owner` | Follow-up owner | `shortText` | Optional | Yes | No | No | Operational only |
| `open_gaps.target_date` | Target date | `date` | Optional | Yes | No | No | Operational only |

### Notes
- Unknowns should generate `PARTIAL` or `NOT_FOUND` pack claims instead of hidden omissions.
- Each repeatable gap entry must carry a stable item identifier in persistence so provenance can resolve one exact gap record when needed.
- This step makes the product more honest and more useful.

## Validation Rules
- required fields should be minimal but meaningful
- users must be able to choose an explicit unknown state when a truthful answer is not available
- wizard completion must produce a review summary before generation
- editing an existing wizard answer set creates a new version rather than overwriting history
- the same stable `fieldKey` contract must be used in UI, persistence, and provenance

## Provenance Rules
- each completed wizard run produces a versioned attestation set
- each attestation set records who completed it and when
- trust-pack claims may cite wizard answers directly
- wizard citations should identify the section or field they came from
- repeatable groups must be item-addressable with stable paths such as `ai_systems[itemId].provider_name` or `open_gaps[itemId].description`
- only fields marked `citableInTrustPack = yes` may be used as wizard citations
- fields in `UNKNOWN` or `UNANSWERED` state must not be cited as support

## Regeneration Triggers
The current trust pack should be marked `STALE` when:
- a new wizard version is completed
- a cited evidence document changes materially
- the user chooses to regenerate after resolving gaps

## Phase-1 UX Requirements
- keep the step count short and obvious
- avoid long legalistic forms
- use plain language suitable for founder-led teams
- show users how wizard answers will influence the trust pack
- do not expose raw prompts or model internals in the wizard UI
- do not expand the wizard into a questionnaire engine or compliance survey
