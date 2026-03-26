# Trust Pack Lifecycle

## Purpose
This document defines the phase-1 operational lifecycle for a Trust Pack version. It is the contract layer between product spec, UI states, schema design, and role behavior.

This is the canonical source for approval blockers, export blockers, and version-mutation rules in phase 1.

Phase 1 goals:
- keep status behavior simple
- keep approvals explicit
- keep exports safe
- never mutate an approved historical version in place

## Lifecycle Scope
The lifecycle applies to a specific `TrustPackVersion`.

- `TrustPack` is the single logical trust-pack container for a workspace in phase 1.
- `TrustPackVersion` is the version-scoped working record that moves through statuses under that container.
- The workspace-level current pack status is the status of the current version.
- Lifecycle status is owned only by `TrustPackVersion`, not by `TrustPack`.
- Phase-1 free-tier limits affect capacity only and do not change lifecycle semantics; the limited unit is one active draft version.

## Draft-Creation Preconditions
Creating the first draft version or a regenerated draft version requires both of these inputs:

- a completed `AIProfile`
- at least one processed, citation-usable evidence document

Phase 1 rules:
- `AIUsageMode = NONE` still requires a completed minimal `AIProfile`; it does not bypass profile completion
- uploaded evidence that is not yet processed into citation-usable form does not satisfy draft-creation readiness
- if either prerequisite is missing, the system must block draft creation and direct the user back to setup rather than create a partial shell version

## Pack Statuses
### `DRAFT`
Meaning:
- a version exists
- it may be incomplete
- it may contain manual edits
- it is not yet ready for approval or export

Typical state:
- generation just completed
- someone is still editing or resolving gaps

### `READY_FOR_REVIEW`
Meaning:
- the current version is stable enough for final human review
- the editor believes the version is ready for an approver to accept or send back
- it is still not exportable in phase 1

Typical state:
- edits are complete for now
- visible `PARTIAL` or `NOT_FOUND` claims may still exist, but they are intentionally present and ready for review

### `APPROVED`
Meaning:
- an `OWNER` or `ADMIN` has accepted this exact version as shareable
- the version is now eligible for export
- the version is immutable

Typical state:
- citations, wording, and visible gaps are accepted as-is

### `STALE`
Meaning:
- newer source inputs exist than the ones used for the current version
- the current version is still viewable, but no longer reflects the latest evidence or wizard attestations
- the version is not exportable until a new version is generated and approved

Typical triggers:
- evidence document upload, replacement, removal, or archival
- completion of a new AI Usage Wizard attestation version

### `EXPORTED`
Meaning:
- this exact approved version has been exported at least once
- approval is still implied
- the version remains immutable

Typical state:
- the approved version is now actively being used outside the product

## Role Model
Phase 1 roles:
- `OWNER`
- `ADMIN`
- `REVIEWER`
- `VIEWER`

## Allowed Actions By Role
| Action | OWNER | ADMIN | REVIEWER | VIEWER |
| --- | --- | --- | --- | --- |
| Generate initial draft | Yes | Yes | Yes | No |
| Edit draft version | Yes | Yes | Yes | No |
| Mark draft ready for review | Yes | Yes | Yes | No |
| Send ready version back to draft | Yes | Yes | Yes | No |
| Approve version | Yes | Yes | No | No |
| Export approved or exported version | Yes | Yes | Yes | No |
| Regenerate stale version into new draft | Yes | Yes | Yes | No |
| View any version in workspace | Yes | Yes | Yes | Yes |

## Allowed Status Transitions
| Current status | Action | Next status | Allowed roles | Notes |
| --- | --- | --- | --- | --- |
| none | Generate pack | `DRAFT` | `OWNER`, `ADMIN`, `REVIEWER` | Creates the first version only when draft-creation preconditions are met |
| `DRAFT` | Mark ready for review | `READY_FOR_REVIEW` | `OWNER`, `ADMIN`, `REVIEWER` | Signals final review handoff |
| `READY_FOR_REVIEW` | Send back for edits | `DRAFT` | `OWNER`, `ADMIN`, `REVIEWER` | Used when more work is needed |
| `READY_FOR_REVIEW` | Approve | `APPROVED` | `OWNER`, `ADMIN` | Approval is version-wide |
| `APPROVED` | Export | `EXPORTED` | `OWNER`, `ADMIN`, `REVIEWER` | First export changes status to `EXPORTED` |
| `EXPORTED` | Export again | `EXPORTED` | `OWNER`, `ADMIN`, `REVIEWER` | Additional exports keep the same status |
| `DRAFT` | Source inputs change | `STALE` | system | Conservative staleness rule |
| `READY_FOR_REVIEW` | Source inputs change | `STALE` | system | Conservative staleness rule |
| `APPROVED` | Source inputs change | `STALE` | system | Approval no longer reflects latest inputs |
| `EXPORTED` | Source inputs change | `STALE` | system | Exported version remains viewable but outdated |
| `STALE` | Regenerate | `DRAFT` | `OWNER`, `ADMIN`, `REVIEWER` | Creates a new version using latest inputs only when draft-creation preconditions are met |
| `APPROVED` | Start edit / revision | `DRAFT` | `OWNER`, `ADMIN`, `REVIEWER` | Creates a new draft version; approved version stays frozen |
| `EXPORTED` | Start edit / revision | `DRAFT` | `OWNER`, `ADMIN`, `REVIEWER` | Creates a new draft version; exported version stays frozen |

## Transitions That Are Not Allowed
- `DRAFT -> APPROVED`
- `DRAFT -> EXPORTED`
- `READY_FOR_REVIEW -> EXPORTED`
- `STALE -> APPROVED`
- `STALE -> EXPORTED`
- mutating an `APPROVED` or `EXPORTED` version in place
- restoring a stale version to approved without regeneration and re-approval

## Approval Contract
Approval is version-level in phase 1.

Approval means:
- this exact version is acceptable to share
- citations and wording are accepted as-is
- visible `PARTIAL` and `NOT_FOUND` claims are accepted as honest limitations, not hidden blockers

Approval does not mean:
- every claim is `FOUND`
- every buyer question is fully answered
- future evidence changes are automatically reflected

Approval blockers in phase 1:
- the version is not in `READY_FOR_REVIEW`
- the version is `STALE`
- required claim rows are missing altogether from the generated version
- lifecycle preconditions for version integrity are broken, such as missing claim provenance where the schema requires it

Approval is not blocked merely because:
- some claims remain `PARTIAL`
- some claims remain `NOT_FOUND`
- the pack contains honest limitations the approver accepts as shareable

## Export Contract
Phase 1 export requires approval.

Rules:
- only `APPROVED` or `EXPORTED` versions can be exported
- exporting a version for the first time moves it from `APPROVED` to `EXPORTED`
- repeated exports keep the version in `EXPORTED`
- export always attaches to a specific version
- buyer-facing export omits raw internal workflow chrome and raw `FOUND`, `PARTIAL`, and `NOT_FOUND` labels
- citations and the evidence appendix are included by default in phase 1 export behavior

Export blockers in phase 1:
- the version is `DRAFT`
- the version is `READY_FOR_REVIEW`
- the version is `STALE`
- no approval record exists for the same version

Export is not additionally blocked merely because:
- some approved claims are `PARTIAL`
- some approved claims are `NOT_FOUND`
- the approver has accepted those limitations as part of the approved version

This keeps the rule simple:
- drafts are for editing
- ready-for-review is for decision-making
- approved or exported versions are the only shareable states

## Evidence Change Behavior
Phase 1 uses a conservative staleness rule.

If evidence changes after a version is generated, the current version becomes `STALE`.

Evidence changes that trigger staleness:
- uploading a new evidence document
- replacing a document
- archiving or deleting a document
- materially changing a cited document's contents

What does not happen:
- the existing approved or exported version is not rewritten
- citations on historical versions are not silently re-bound to new evidence

What happens next:
- users can still inspect the stale version
- users must regenerate a new `DRAFT` version from current inputs
- the new draft must move through review and approval again

## Wizard Attestation Change Behavior
Wizard changes follow the same conservative staleness model.

If a new `AIProfile` attestation version is completed after a pack version was generated:
- the current version becomes `STALE`
- the current version remains viewable
- a new `DRAFT` version must be generated to incorporate the updated attestation data

Phase 1 rule:
- a trust pack version always points to one specific attestation version
- attestation history is never overwritten in place

## Editing Rules
### Editing `DRAFT`
- edits mutate the current draft version
- the version remains `DRAFT` unless explicitly moved to `READY_FOR_REVIEW`

### Editing `READY_FOR_REVIEW`
- edits should move the version back to `DRAFT`
- the system should not pretend a materially changed version is still ready for final review

### Editing `APPROVED` or `EXPORTED`
- editing does not mutate the approved or exported version
- editing creates a new `DRAFT` version cloned from the latest approved or exported version
- the old version remains immutable for audit, review history, and export traceability

### Editing `STALE`
- stale versions are read-only in phase 1
- users must regenerate into a new draft rather than continue editing the stale version directly

## Phase-1 Operational Notes
- only one current active pack status should be shown at a time
- phase 1 has one logical `TrustPack` container per workspace, with version history beneath it
- approval is intentionally simple and version-wide
- section-level review detail can exist in UI, but the formal approval decision is pack-version-wide
- `VIEWER` can inspect status and provenance but cannot change lifecycle state
- the free tier should not change lifecycle behavior; it only limits capacity through one active draft version
