# Design Principles

## Product Principles
### 1. Start Narrow And Earn Breadth
Phase 1 solves one workflow well: generating a credible trust pack for a small B2B SaaS vendor using AI. We do not widen scope into trust centers, CRM integrations, or questionnaire platforms before this loop is strong.

### 2. Founder-Fast, Reviewer-Safe
The product should feel approachable for founder-led teams while still giving reviewers enough structure to trust the output. Fast setup must not come at the cost of provenance or guardrails.

### 3. Useful Beats Impressive
The artifact should be practical, editable, and buyer-ready. We should prefer a clean packet that helps a live deal over a flashy but shallow experience.

## UX Principles
### 4. One Clear Flow
The core journey should remain obvious:

`Workspace -> Upload Evidence -> AI Usage Wizard -> Generate Trust Pack -> Review/Edit -> Export`

Navigation, empty states, and primary actions should all reinforce this sequence.

### 5. Guided Setup, Progressive Depth
New users should see a simple next step. Detail should appear only when it becomes relevant, especially around citations, review, and gap resolution.

### 6. Structured Inputs Over Magic Prompts
The AI Usage Wizard should capture explicit, structured answers rather than relying on a hidden prompt blob. Users should understand what they are asserting and how it will affect the pack.

### 7. Editability Over Presentation Polish
Phase 1 should optimize for Markdown-first, editable output. A polished PDF is useful later, but not the primary design center.

## Trust Model Principles
### 8. Evidence Before Prose
Claims should emerge from evidence retrieval and explicit attestations, not from stylistic boilerplate. The product earns trust by showing where statements came from.

### 9. Honest Gaps Are Better Than Smooth Hallucinations
`PARTIAL` and `NOT_FOUND` are product features, not failure cases to hide. The system should make missing information visible so teams can fix it or share the limitation honestly.

### 10. Citations Are Mandatory For Supported Claims
`FOUND` claims require citations. `NOT_FOUND` claims have none. `PARTIAL` claims carry support plus visible missing details. These rules should stay consistent everywhere: generation, review, editing, export, and future questionnaire reuse.

### 11. First-Party Attestations Need Provenance Too
AI Usage Wizard answers are not informal notes. They are versioned first-party attestations that can be cited and traced just like documents.

### 12. No Template Logic In The Answering Path
The system must not fall back to canned answer templates when evidence is weak. Reuse in later phases should come from grounded claims, not generic boilerplate libraries.

## Collaboration Principles
### 13. Workspace Boundaries Are Absolute
Every artifact, citation, and action belongs to one workspace. Cross-workspace leakage is unacceptable.

### 14. RBAC Is A Product Primitive
Roles are not a thin admin afterthought. They shape who can upload evidence, edit attestations, review claims, approve packs, and export results.

### 15. Versions Matter
Trust work is temporal. Evidence changes, AI disclosures change, and exports need a stable source. Trust packs and AI profiles should be versioned so collaboration stays auditable and understandable.

## Expansion Principle
### 16. Reuse The Core Engine For Phase 2
When questionnaire automation arrives, it should build on `TrustPackClaim`, evidence retrieval, citations, and the same status rules. V2 should grow from one coherent trust engine, not split into parallel systems.
