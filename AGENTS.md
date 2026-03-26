# Attestly V2 Agent Instructions

## Documentation Hygiene
After every meaningful Codex task, run the Attestly V2 documentation hygiene workflow.

Use [docs/codex-doc-hygiene-prompt.md](/Users/anweshsingh/Downloads/Attestly/attestly-v2/docs/codex-doc-hygiene-prompt.md) as the full standing instruction set.

### Meaningful task trigger
Treat a task as meaningful if it changes any of:

- code
- schema
- routes
- RBAC or auth behavior
- UX or IA behavior
- lifecycle or contract behavior
- tests
- implementation assumptions

Skip only for true no-op work with no repo change and no new decision.

### Required after-task workflow
1. Decide whether the task changed the product contract or only implementation.
2. Update canonical product or contract docs only if the actual contract changed.
3. Append `docs/build-log.md`.
4. Refresh `docs/context.md`.
5. Overwrite `docs/review-brief.md`.
6. Check that `build-log`, `context`, and `review-brief` agree before finishing.

### File expectations
- `docs/build-log.md`:
  Append-only running history.
  Include what changed, why it changed, files touched, assumptions, risks, tests, next step.
- `docs/context.md`:
  Current snapshot only.
  Keep current implemented slices, locked implementation-relevant decisions, current next step, and out-of-scope boundaries up to date.
- `docs/review-brief.md`:
  Latest-change-only review artifact.
  Keep it compact and optimized for PM, UX, IA, schema, and cross-chat review.

### Guardrails
- Do not update canonical docs unless the underlying contract changed.
- Do not create duplicate summary or handoff docs.
- Do not let `docs/review-brief.md` become a history file.
- Do not let `docs/context.md` drift into a changelog.
- Do not copy large diffs into docs.
- If the contract did not change, say so in the handoff docs instead of editing source-of-truth docs.

## Commit Discipline
Apply portfolio-quality commit discipline for all Attestly V2 work unless a task explicitly says otherwise.

### Core rules
- Use small, logically grouped commits when the work naturally separates.
- Do not mix unrelated concerns in one commit.
- Prefer a short stack of clean commits over one giant dump commit when a task spans multiple layers.
- If the task is genuinely small, prefer one clean commit over artificial splitting.
- Avoid noisy micro-commits for formatting churn, renames with no purpose, or partial broken states unless they are necessary stepping stones inside the same logical slice.
- Keep history linear, readable, and suitable for later portfolio review.
- Keep docs synchronized with the same task; do not leave `build-log`, `context`, or `review-brief` behind.

### Preferred grouping order
- schema / migration
- backend / domain / services
- UI / surface wiring
- tests
- docs / build-log / context / review brief

### Message guidance
- Use concise, descriptive conventional-style messages such as `feat: add trust pack section claim and citation persistence`.
- Start with a clear action verb and name the actual subsystem or behavior changed.
- Prefer `feat`, `fix`, `refactor`, `test`, `docs`, and `chore` where they fit naturally.
- Never use vague messages like `misc fixes`, `updates`, `changes`, `cleanup`, or `wip`.

### Guardrails
- Before committing, quickly group changed files by concern.
- If code and tests are small and tightly coupled, keep them together in one coherent commit.
- Do not create a giant everything commit unless the task is truly tiny.
- Do not split commits purely for appearance if the result is harder to review.

## Attestly V2 Product Boundaries
- Phase 1 is the Trust Pack Generator wedge.
- Keep navigation aligned to `Home`, `Evidence`, `Trust Packs`, and `Settings / Team`.
- Preserve evidence-first behavior.
- Preserve workspace isolation and server-enforced RBAC.
- Do not introduce multi-pack phase-1 UX, questionnaire-first flows, standalone generate flows, trust center work, CRM integrations, or billing redesign unless explicitly requested.
