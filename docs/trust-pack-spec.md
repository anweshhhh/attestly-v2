# Trust Pack Spec

## Artifact Definition
The Trust Pack is the core phase-1 product artifact: a structured, exportable packet that explains a vendor's security posture and AI-risk posture using evidence-backed claims plus versioned first-party AI attestations.

It is not:
- a public trust center
- a full questionnaire engine
- a polished marketing brochure
- a generic answer-template library

## Primary Use Case
A small B2B SaaS company needs a credible packet it can review internally and export externally when a buyer asks for baseline security and AI usage details.

## Trust Pack Inputs
- uploaded evidence documents
- chunked evidence retrieved from those documents
- AI Usage Wizard answers stored as versioned first-party attestations
- workspace metadata

## Trust Pack Output Shape
Each trust pack version should contain:

1. Cover metadata
2. Fixed sections in a stable order
3. Claim-level statuses and citations
4. Evidence appendix

## Fixed Sections
| Order | Section | Purpose | Primary sources |
| --- | --- | --- | --- |
| 1 | Company Snapshot | Identify the company, product, buyer context, and operating basics | Wizard attestations, product docs |
| 2 | Product / Data Boundary | Explain what the product does, what customer data enters the system, and where trust boundaries sit | Wizard attestations, architecture docs, data flow docs |
| 3 | Security Baseline | Summarize access control, encryption, logging, backup, SDLC, and baseline operational controls | Policies, architecture docs, procedures |
| 4 | AI Systems Inventory | List where AI is used, whether usage is internal or customer-facing, and which vendors/models are involved | Wizard attestations, product docs |
| 5 | AI Data Usage And Retention | Explain what data is sent to AI systems, training usage, retention behavior, and customer-data handling | Wizard attestations, vendor docs, policies |
| 6 | AI Risk Controls / Human Oversight | Describe approval points, human review, monitoring, restrictions, and operational safeguards around AI use | Wizard attestations, runbooks, policies |
| 7 | Evidence Appendix | Show the source documents and wizard attestation versions used to build the pack | System-generated provenance |

## Claim Model
Each section contains one or more discrete claims. Claims are the atomic unit for status, provenance, and later questionnaire reuse.

### Claim requirements
- every claim has one `ClaimStatus`: `FOUND`, `PARTIAL`, or `NOT_FOUND`
- every claim has an answer body
- every `FOUND` claim has at least one citation
- every `PARTIAL` claim has at least one citation and an explicit missing-detail marker
- every `NOT_FOUND` claim has zero citations

### Citation sources
Claims may cite:
- `DOCUMENT` evidence chunks
- `WIZARD_ATTESTATION` entries from the AI Usage Wizard

## Section Guidance
### 1. Company Snapshot
Typical fields or claims:
- company name
- product name
- product summary
- primary customer type
- deployment model
- primary trust-contact owner

### 2. Product / Data Boundary
Typical fields or claims:
- what the product does
- whether customer data enters the platform
- major categories of data handled
- high-level system boundary and operator access expectations

### 3. Security Baseline
Typical fields or claims:
- authentication and access controls
- encryption at rest and in transit
- logging and monitoring
- backup / recovery posture
- vulnerability management or secure development practice

### 4. AI Systems Inventory
Typical fields or claims:
- whether AI is used at all
- whether usage is internal only, customer-facing, or both
- AI-enabled features or workflows
- model or vendor inventory

### 5. AI Data Usage And Retention
Typical fields or claims:
- whether customer data is sent to AI vendors
- whether customer data is used for model training
- retention or deletion posture
- any explicit opt-out or tenant-handling statement

### 6. AI Risk Controls / Human Oversight
Typical fields or claims:
- human review or approval points
- access restrictions around AI features
- evaluation, monitoring, or abuse safeguards
- fallback or escalation path when AI output is unreliable

### 7. Evidence Appendix
The appendix should list:
- source documents used
- document timestamps or versions when available
- wizard attestation version used
- pack version metadata

## Generation Rules
- Trust Pack generation must use evidence retrieval and structured attestations, not canned templates.
- Claims must be generated section by section so provenance remains inspectable.
- Wizard answers can be cited directly when they are first-party disclosures.
- Evidence documents should remain the preferred support for operational or security claims whenever available.
- Missing information must remain visible as `PARTIAL` or `NOT_FOUND`.

## Review And Approval Rules
- review happens on a specific trust-pack version
- users inspect claim content, statuses, citations, and provenance on that version
- approval is version-wide on the reviewed current version
- phase 1 does not require live claim editing as part of the shipped workflow
- changing evidence or wizard answers marks the pack stale rather than silently mutating an approved version

## Export Rules
- phase-1 shipped export is Markdown-only
- DOCX and PDF remain reserved future formats at the broader contract/model level, but are not part of live phase-1 runtime behavior
- export must preserve section order and clear section headings
- export should favor editability and internal reuse over polished brochure styling

## Reuse Direction
Future questionnaire automation should map buyer questions onto `TrustPackClaim` and the evidence engine, rather than introducing a separate template-answer path.
