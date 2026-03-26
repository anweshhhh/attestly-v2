# Codex Documentation Hygiene Prompt

Use these instructions as a standing Attestly V2 workflow rule after every meaningful Codex task.

## Trigger
Run this documentation hygiene pass after any meaningful task that changes:

- code
- schema
- routes
- RBAC/auth behavior
- UX/IA behavior
- lifecycle or contract behavior
- tests
- implementation assumptions

Skip only for trivial no-op tasks with no repo change and no new decision.

## Goal
Keep compact handoff docs current so ChatGPT project chats can review work without large uploads or long diff dumps.

This workflow supports the 5-chat operating model:

- Master Control
- System Design
- Build Log / Decisions
- Codex Prompt Generator
- Product / UX / IA / Figma

## Core Rules
1. Update canonical product and contract docs only when the actual product contract changed.
2. Do not restate unchanged contracts in multiple places.
3. Append `docs/build-log.md` after every meaningful task.
4. Refresh `docs/context.md` after every meaningful task.
5. Overwrite `docs/review-brief.md` after every meaningful task.
6. Keep all three handoff docs compact and current.
7. Do not let `docs/review-brief.md` become a history file.
8. Do not create duplicate summary docs unless explicitly asked.

## Commit Discipline
For Attestly V2 work, keep git history clean and reviewable unless the task explicitly asks for a different approach.

Apply these rules:

1. Use small, logically grouped commits when the work naturally separates.
2. Do not mix unrelated concerns in one commit.
3. Prefer a short stack of clean commits over one giant dump commit when a task spans multiple layers.
4. If the task is genuinely small, prefer one clean commit over artificial splitting.
5. Avoid noisy micro-commits for formatting churn, rename-only churn, or broken intermediate states unless they are required stepping stones inside the same logical slice.
6. Keep docs synchronized with the task in the same commit stack; do not leave handoff docs behind for a later unrelated commit.
7. Use clear conventional-style commit messages and avoid vague messages like `updates`, `changes`, `cleanup`, or `wip`.

Preferred grouping order when applicable:

- schema / migration
- backend / domain / services
- UI / surface wiring
- tests
- docs / build-log / context / review brief

Before committing, quickly group changed files by concern and choose the smallest readable set of coherent commits.

## Canonical vs Handoff Docs
Treat these as different layers:

- Canonical docs:
  Only update when the source-of-truth contract changed.
  Examples: PRD, schema, lifecycle, page map, claim catalog, wizard contract, trust-pack spec.
- Handoff docs:
  Always maintain after meaningful work.
  Files: `docs/build-log.md`, `docs/context.md`, `docs/review-brief.md`.

If implementation changed but the product contract did not, update only the handoff docs.

## Required Workflow After Each Meaningful Task
1. Decide whether the task changed the contract or only implementation.
2. If the contract changed, update only the necessary canonical docs.
3. Append a new entry to `docs/build-log.md`.
4. Refresh `docs/context.md` to reflect the current snapshot.
5. Overwrite `docs/review-brief.md` with a compact review artifact for the latest task only.
6. Before finishing, make sure `build-log`, `context`, and `review-brief` all agree.

## File-by-File Expectations

### `docs/build-log.md`
Append only. Never rewrite prior entries unless correcting an error.

Each new entry must include:

- date
- task / slice
- what changed
- why it changed
- files touched
- assumptions introduced
- risks / watchouts
- tests run
- next step

Keep each entry compact. Use bullets, not long prose.

Recommended format:

```md
## YYYY-MM-DD - Short task title
- What changed:
- Why it changed:
- Files touched:
- Assumptions introduced:
- Risks / watchouts:
- Tests run:
- Next step:
```

### `docs/context.md`
Always reflect the current project state as of now, not the whole history.

It must stay short and decision-oriented. Update these sections in place:

- current implemented slices
- locked decisions relevant to implementation
- current next step
- out of scope right now

Good `context.md` behavior:

- describes what is true now
- removes stale “next step” language
- does not repeat long rationale from canonical docs
- points readers to canonical docs when needed

### `docs/review-brief.md`
Overwrite every time. This is a latest-change review artifact, not a changelog.

Audience:

- PM review
- UX / IA review
- schema / contract review
- fast cross-chat handoff

Optimize for:

- scope clarity
- changed files
- assumptions
- contract-sensitive areas
- risks
- next step

Do not dump implementation internals unless they affect review.

Use this exact structure:

```md
# Review Brief

## Scope of this change
- Slice / task:
- Goal:

## What changed
- ...
- ...

## Files touched
- ...
- ...

## Assumptions introduced
- ...
- ...

## Contract-sensitive areas
- schema:
- lifecycle:
- UX/IA:
- RBAC/auth:
- evidence/generation/export:

## Tests run
- ...
- result:

## Risks / watchouts
- ...
- ...

## Recommended next step
- ...
```

## Guardrails Against Stale Duplicate Documentation
- Do not copy full diffs into docs.
- Do not summarize unchanged canonical docs after every task.
- Do not create separate “handoff”, “summary”, “status”, and “review” docs for the same change.
- Do not let `docs/review-brief.md` accumulate history.
- Do not let `docs/context.md` become a build log.
- Do not let `docs/build-log.md` become a rewritten project overview.
- If a contract did not change, say so explicitly instead of quietly editing canonical docs.
- If a canonical doc changed, make sure the build log and review brief call that out.

## Multi-Chat Workflow Guidance
- Master Control should read `docs/review-brief.md` first, then `docs/context.md`, then only the canonical docs named in the brief.
- System Design should use `docs/context.md` plus only the canonical contract docs touched by the latest task.
- Build Log / Decisions should rely on `docs/build-log.md` as the running history and canonical docs as the source of truth.
- Codex Prompt Generator should use `docs/context.md` and the latest `docs/review-brief.md` to generate narrow next-task prompts.
- Product / UX / IA / Figma should use `docs/review-brief.md` for current change review and only pull canonical UX / IA docs if contract-sensitive areas mention them.

## Completion Check Before Final Response
Before ending the task, verify:

- `docs/build-log.md` has a new entry
- `docs/context.md` reflects the new current state
- `docs/review-brief.md` reflects only the latest task
- canonical docs changed only if the contract actually changed
- no stale duplicate summary doc was introduced
