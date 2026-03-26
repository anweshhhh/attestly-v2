# Claim Catalog v1

## Purpose
This document locks the initial phase-1 claim catalog for Trust Pack generation, review, UI layout, and schema design.

It is intentionally:
- narrow
- buyer-relevant
- evidence-first
- reusable later for questionnaire mapping

It is not:
- a full compliance control library
- a trust-center taxonomy
- a comprehensive security questionnaire ontology

## Catalog Rules
- Claim keys are stable identifiers for generation, review, editing, and future reuse.
- Each claim is the atomic unit for `FOUND`, `PARTIAL`, and `NOT_FOUND`.
- Preferred source type tells the system what to reach for first, not the only allowed source.
- For operational and security claims, documents should be preferred whenever they exist.
- Wizard attestations are strongest for company context and AI disclosure claims.
- If support is contradictory or incomplete, the claim should fall to `PARTIAL` or `NOT_FOUND` rather than overstate confidence.

## Status Semantics
Unless noted otherwise, catalog claims may be:
- `FOUND`
- `PARTIAL`
- `NOT_FOUND`

`FOUND` still requires citations.
`PARTIAL` still requires citations plus explicit missing detail.
`NOT_FOUND` still requires zero citations.

## Section 1: Company Snapshot
| Claim key | Section | Purpose | Preferred source type | Allowed statuses | Acceptable support |
| --- | --- | --- | --- | --- | --- |
| `company_snapshot.company_identity` | Company Snapshot | Identify the vendor and product in a buyer-readable opening statement | both | `FOUND`, `PARTIAL`, `NOT_FOUND` | Wizard company basics plus a product overview, website, or product doc that confirms the company-product pairing |
| `company_snapshot.product_summary` | Company Snapshot | Explain what the product does in one concise claim | both | `FOUND`, `PARTIAL`, `NOT_FOUND` | Product overview docs, architecture overviews, product site copy, or structured wizard summary that is consistent with uploaded material |
| `company_snapshot.deployment_model` | Company Snapshot | State whether the product is SaaS, managed service, self-hosted, or mixed | both | `FOUND`, `PARTIAL`, `NOT_FOUND` | Architecture docs, hosting notes, implementation guides, or explicit wizard attestation about deployment posture |

## Section 2: Product / Data Boundary
| Claim key | Section | Purpose | Preferred source type | Allowed statuses | Acceptable support |
| --- | --- | --- | --- | --- | --- |
| `product_data_boundary.customer_data_scope` | Product / Data Boundary | Describe whether customer data enters the platform and what broad categories are handled | both | `FOUND`, `PARTIAL`, `NOT_FOUND` | Data flow docs, privacy materials, architecture docs, or wizard attestation that names the data categories |
| `product_data_boundary.system_boundary` | Product / Data Boundary | Explain the high-level product boundary and what sits inside versus outside the system | document | `FOUND`, `PARTIAL`, `NOT_FOUND` | Architecture diagrams, system overviews, infrastructure notes, or product technical docs |
| `product_data_boundary.operator_access_boundary` | Product / Data Boundary | Describe whether internal operators can access production systems or customer data and at a high level under what conditions | document | `FOUND`, `PARTIAL`, `NOT_FOUND` | Access policies, runbooks, architecture notes, audit docs, or other operational evidence describing support/admin access boundaries |

## Section 3: Security Baseline
| Claim key | Section | Purpose | Preferred source type | Allowed statuses | Acceptable support |
| --- | --- | --- | --- | --- | --- |
| `security_baseline.access_control_baseline` | Security Baseline | Summarize the baseline access-control posture for users and internal admins | document | `FOUND`, `PARTIAL`, `NOT_FOUND` | Security policies, IAM runbooks, SSO or MFA docs, admin access procedures, or architecture notes describing authorization posture |
| `security_baseline.encryption_baseline` | Security Baseline | Summarize encryption posture for data in transit and at rest | document | `FOUND`, `PARTIAL`, `NOT_FOUND` | Security policies, infrastructure docs, vendor configs, or architecture notes that explicitly support the encryption statement being made |
| `security_baseline.logging_monitoring_baseline` | Security Baseline | State whether key activity and system events are logged or monitored | document | `FOUND`, `PARTIAL`, `NOT_FOUND` | Runbooks, monitoring docs, security procedures, or architecture notes describing logging and alerting coverage |
| `security_baseline.backup_recovery_baseline` | Security Baseline | Describe the existence of backup or recovery posture at a high level | document | `FOUND`, `PARTIAL`, `NOT_FOUND` | Backup runbooks, disaster-recovery notes, infrastructure docs, or operational procedures |
| `security_baseline.secure_development_baseline` | Security Baseline | Describe the basic secure development or vulnerability-management posture | document | `FOUND`, `PARTIAL`, `NOT_FOUND` | SDLC policies, ticketing workflows, code-review guidance, vulnerability-management procedures, or engineering security docs |

## Section 4: AI Systems Inventory
| Claim key | Section | Purpose | Preferred source type | Allowed statuses | Acceptable support |
| --- | --- | --- | --- | --- | --- |
| `ai_systems_inventory.ai_usage_mode` | AI Systems Inventory | State whether AI is used and whether use is internal, customer-facing, or both | wizard attestation | `FOUND`, `PARTIAL`, `NOT_FOUND` | Explicit wizard attestation, ideally backed by product docs when customer-facing claims are made |
| `ai_systems_inventory.ai_feature_inventory` | AI Systems Inventory | List the major AI-enabled workflows or product features in scope | both | `FOUND`, `PARTIAL`, `NOT_FOUND` | Wizard entries describing use cases plus product docs, feature docs, or architecture notes that confirm them |
| `ai_systems_inventory.model_vendor_inventory` | AI Systems Inventory | Identify the main model providers or AI vendors involved | both | `FOUND`, `PARTIAL`, `NOT_FOUND` | Wizard inventory plus vendor contracts, architecture docs, or internal vendor lists that support the named providers or model families |

## Section 5: AI Data Usage And Retention
| Claim key | Section | Purpose | Preferred source type | Allowed statuses | Acceptable support |
| --- | --- | --- | --- | --- | --- |
| `ai_data_usage.customer_data_to_ai` | AI Data Usage And Retention | Explain whether customer data is sent to AI systems and at what level | both | `FOUND`, `PARTIAL`, `NOT_FOUND` | Wizard attestation plus data flow docs, architecture notes, vendor docs, or policies that show the direction and scope of data flow |
| `ai_data_usage.training_usage` | AI Data Usage And Retention | State whether customer data is used for model training | both | `FOUND`, `PARTIAL`, `NOT_FOUND` | Explicit wizard attestation, vendor terms, internal policy docs, or product docs that clearly support the training statement |
| `ai_data_usage.retention_posture` | AI Data Usage And Retention | Explain the high-level retention or deletion posture for data sent to AI systems | both | `FOUND`, `PARTIAL`, `NOT_FOUND` | Vendor documentation, internal retention policy, runbooks, or wizard attestation tied to a known operating policy |
| `ai_data_usage.customer_control_posture` | AI Data Usage And Retention | Describe any customer-facing control, exclusion, opt-out, or tenant-handling posture related to AI data use | both | `FOUND`, `PARTIAL`, `NOT_FOUND` | Product docs, policy docs, vendor notes, or explicit wizard attestation describing what customers can or cannot control |

## Section 6: AI Risk Controls / Human Oversight
| Claim key | Section | Purpose | Preferred source type | Allowed statuses | Acceptable support |
| --- | --- | --- | --- | --- | --- |
| `ai_risk_controls.human_review_posture` | AI Risk Controls / Human Oversight | Describe whether human review or approval exists in AI-assisted workflows | both | `FOUND`, `PARTIAL`, `NOT_FOUND` | Wizard attestation, SOPs, runbooks, or product workflow docs that describe where human review occurs |
| `ai_risk_controls.access_and_release_controls` | AI Risk Controls / Human Oversight | Describe access restrictions or release controls around AI capabilities | both | `FOUND`, `PARTIAL`, `NOT_FOUND` | Access policies, rollout docs, admin docs, feature-flag guidance, or wizard attestation describing control points |
| `ai_risk_controls.monitoring_and_quality_controls` | AI Risk Controls / Human Oversight | Describe how the team monitors or checks AI output quality, safety, or abuse | both | `FOUND`, `PARTIAL`, `NOT_FOUND` | Runbooks, eval notes, QA procedures, incident processes, or wizard attestation describing monitoring and review activity |
| `ai_risk_controls.fallback_and_escalation` | AI Risk Controls / Human Oversight | Describe what happens when AI output is wrong, unsafe, or insufficient | both | `FOUND`, `PARTIAL`, `NOT_FOUND` | Incident runbooks, support procedures, product fallback docs, or wizard attestation explaining escalation and fallback behavior |

## Section 7: Evidence Appendix
These claims are system-generated and should not rely on broad freeform generation.

| Claim key | Section | Purpose | Preferred source type | Allowed statuses | Acceptable support |
| --- | --- | --- | --- | --- | --- |
| `evidence_appendix.source_document_index` | Evidence Appendix | List the key source documents used by the current version | document | `FOUND`, `PARTIAL` | Generated from the cited document set for the version; `PARTIAL` only if some claims depend solely on wizard attestations and no document list can be shown for them |
| `evidence_appendix.attestation_version_index` | Evidence Appendix | Show which wizard attestation version was used for the current version | wizard attestation | `FOUND`, `PARTIAL` | Generated from the exact `AIProfile` version referenced by the pack version; `PARTIAL` only if legacy or incomplete attestation metadata exists |

## Phase-1 Boundaries
This catalog intentionally does not include:
- full control families
- compliance certification mapping
- vendor risk questionnaire taxonomies
- trust-center marketing content
- deal-specific custom claims

## Design And Schema Notes
- UI should render review, citation, and status at the claim level using these keys.
- Schema should treat these claim keys as stable enum-like identifiers even if stored as strings.
- Future questionnaire automation should map buyer questions onto these claims before inventing any new answer layer.
