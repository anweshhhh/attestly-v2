# Attestly V2 PRD

## Product One-Liner
Attestly V2 is a Vendor Security & AI-Risk Copilot for small B2B SaaS companies that turns uploaded evidence and structured AI disclosures into an exportable trust pack with grounded claims and citations.

## Product Direction
- V2 is a redesign and rebuild, not a UI port of V1.
- V1 proved the evidence engine, grounded answering, citations, approved-answer reuse, questionnaire autofill, RBAC, and org isolation.
- V2 starts with a narrower wedge: trust-pack generation for vendors that need to answer modern security and AI-risk questions quickly.
- Questionnaire automation is a later surface that reuses the same evidence and trust-pack engine.

## Primary ICP
### Primary user
- Founder or CTO at a small B2B SaaS company.
- Team size: roughly 5-150 employees.
- Typical motion: founder-led sales or lean GTM team with technical buyers asking security and AI questions.
- Pain profile: trust work is handled manually across docs, Notion pages, old questionnaires, and Slack threads.

### Secondary users
- Solutions engineers who need a reusable, editable artifact during active deals.
- RevOps or operations leads who help gather evidence and coordinate answers.
- Reviewers or admins who need org-scoped collaboration with clear permissions.

## Core Problem
Small B2B SaaS vendors are increasingly asked to explain both their security posture and their use of AI. They usually have evidence scattered across policy docs, architecture notes, vendor contracts, internal writeups, and prior answers. The current workflow is slow and risky:

- answers are rebuilt from scratch for every buyer request
- AI usage disclosures are inconsistent or incomplete
- teams cannot easily tell which claims are evidence-backed versus assumed
- missing information is hidden instead of called out
- review happens late and without clear provenance

## Jobs To Be Done
### Founder / CTO
- Help me produce a credible trust packet quickly without inventing unsupported claims.
- Help me explain how AI is used in the product in a way that is consistent, current, and reviewable.

### Solutions engineer
- Help me adapt a trust packet for a live buyer request without starting from zero.
- Help me export something editable so I can tailor wording while keeping provenance intact.

### Team admin / reviewer
- Help me keep trust materials scoped to the right workspace and reviewed by the right people.
- Help me see what is complete, partial, or missing before anything is shared.

## Phase 1 Wedge
### Primary flow
`Workspace -> Upload Evidence -> AI Usage Wizard -> Generate Trust Pack -> Review -> Approve -> Export`

### Wedge definition
Phase 1 ships one high-value artifact: an evidence-backed trust pack for B2B SaaS vendors using AI. The trust pack combines uploaded evidence and versioned first-party AI attestations into a structured export that can be reviewed, approved, and exported before sharing.

### Why this wedge
- It solves an urgent buyer-facing pain without requiring a broad questionnaire platform on day one.
- It keeps the initial user journey short and self-serve.
- It uses V1's proven engine concepts while avoiding V1's prototype-era IA.
- It creates a clean foundation for later questionnaire automation.

## In-Scope MVP
- workspace creation and org-scoped collaboration
- auth and RBAC with `OWNER`, `ADMIN`, `REVIEWER`, `VIEWER`
- evidence upload and evidence library for trust-relevant documents
- AI Usage Wizard with structured, versioned first-party attestations
- trust-pack generation with fixed sections
- grounded claim generation with citations
- explicit `FOUND`, `PARTIAL`, and `NOT_FOUND` claim handling
- review, approval, and export flow on the current Trust Pack version
- Markdown export
- minimal free-tier gating

## Out Of Scope For Phase 1
- questionnaire import, autofill, review queue, and export
- public trust center or public portal
- CRM integrations
- deployment, hosting, or operations work
- deep billing design
- third-party workflow automation
- generic answer-template or canned content systems

## Trust Model Requirements
These rules are non-negotiable and inherited from the V1 engine model:

- `FOUND` claims require at least one citation.
- `NOT_FOUND` claims carry no citations.
- `PARTIAL` claims require supporting citations and must make missing detail explicit.
- no canned template-answer logic is allowed in the answering path
- evidence-first behavior remains the default posture
- wizard answers are versioned first-party attestations, not hidden prompt context
- org-scoped isolation and RBAC are foundational

## Free Tier Concept
The free tier should prove value without pushing the product into a billing-heavy design exercise.

### Free tier shape
- one workspace
- limited number of evidence documents
- one active trust-pack draft
- basic Markdown export
- small-team collaboration with RBAC

### What is intentionally deferred
- usage-based pricing
- seat pricing
- overage rules
- enterprise packaging

## Success Metrics
### Activation
- a new workspace uploads evidence and completes the AI Usage Wizard in the first session
- a first trust-pack draft is generated within 30 minutes of signup

### Product value
- at least one export per activated workspace
- users reach a reviewable pack without manual document assembly outside the product
- median time from empty workspace to first export decreases relative to the current manual process

### Trust quality
- generated `FOUND` claims always include citations
- `NOT_FOUND` and `PARTIAL` states are visible and reviewable, not buried
- reviewers can identify the source of every exportable claim

## Why Questionnaire Automation Is Deferred
Questionnaire automation is real demand, but it is not the best first wedge for V2. Starting with questionnaires would pull the product back toward V1's broader workflow before the new trust-pack foundation is stable. Phase 1 should first establish:

- a clean evidence library
- a structured AI attestation model
- a reusable trust-pack claim model
- a reviewable export artifact

Once those are in place, questionnaire automation can reuse the same claim and citation engine rather than introducing a parallel answer-template path.

## Product Outcome
By the end of phase 1, a founder-led SaaS team should be able to assemble a credible, evidence-backed trust pack that covers both baseline security posture and AI-risk disclosures, review it on the current version surface, approve it, and export it as Markdown without relying on unsupported boilerplate.
