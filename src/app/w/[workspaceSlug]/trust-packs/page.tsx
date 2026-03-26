import Link from "next/link";
import {
  approveTrustPackVersionAction,
  exportTrustPackVersionAction,
  generateTrustPackDraftAction,
  markTrustPackReadyForReviewAction,
  sendTrustPackBackToDraftAction
} from "@/app/actions";
import { Banner } from "@/components/banner";
import { StatusChip } from "@/components/status-chip";
import { TrustPackReview } from "@/components/trust-pack-review";
import { requirePageWorkspaceAccess } from "@/lib/auth";
import { getTrustPackDetailPageData } from "@/lib/trust-pack-generation";
import { can, WorkspaceAction } from "@/lib/rbac";

type TrustPacksPageProps = {
  params: {
    workspaceSlug: string;
  };
  searchParams?: {
    error?: string;
    notice?: string;
  };
};

function getReadinessTone(state: string, hasCurrentVersion: boolean) {
  if (state === "CURRENT_VERSION_STALE") {
    return "error";
  }

  if (hasCurrentVersion || state === "READY_FOR_INITIAL_GENERATION") {
    return "ready";
  }

  if (state === "NEEDS_AI_PROFILE" || state === "NEEDS_CITATION_READY_EVIDENCE") {
    return "upcoming";
  }

  return "neutral";
}

function getReadinessLabel(state: string, hasCurrentVersion: boolean) {
  if (hasCurrentVersion) {
    return state === "CURRENT_VERSION_STALE" ? "Current version stale" : "Current version ready";
  }

  switch (state) {
    case "READY_FOR_INITIAL_GENERATION":
      return "Ready to generate";
    case "NEEDS_AI_PROFILE":
      return "AI Profile needed";
    case "NEEDS_CITATION_READY_EVIDENCE":
      return "Evidence still processing";
    case "NEEDS_EVIDENCE":
      return "Evidence needed";
    default:
      return "Setup in progress";
  }
}

function getLifecycleBadgeLabel(status: string) {
  return status === "EXPORTED" ? "Approved • Exported" : status;
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

export default async function TrustPacksPage(props: TrustPacksPageProps) {
  const access = await requirePageWorkspaceAccess(props.params.workspaceSlug, "VIEW_TRUST_PACKS");
  const state = await getTrustPackDetailPageData(access.userId, props.params.workspaceSlug);
  const currentVersion = state.currentVersion;
  const generationAction = generateTrustPackDraftAction.bind(null, state.workspaceSlug);

  return (
    <div className="stack">
      <Banner error={props.searchParams?.error} notice={props.searchParams?.notice} />

      <section className="card stack">
        <div className="space-between">
          <div>
            <span className="eyebrow">Trust Packs</span>
            <h1 style={{ marginBottom: 8 }}>
              {currentVersion ? `Current Trust Pack v${currentVersion.versionNumber}` : "Single current Trust Pack"}
            </h1>
            <p className="muted" style={{ marginTop: 0, maxWidth: 760 }}>
              Phase 1 keeps one logical Trust Pack container per workspace. This page lands on the current pack, not a
              list, and generation flows directly into this review surface.
            </p>
          </div>
          <StatusChip tone={getReadinessTone(state.readiness.state, Boolean(currentVersion))}>
            {getReadinessLabel(state.readiness.state, Boolean(currentVersion))}
          </StatusChip>
        </div>
      </section>

      {!currentVersion ? (
        <div className="split">
          <section className="card split-main stack">
            <div>
              <span className="eyebrow">Readiness</span>
              <h2 style={{ marginBottom: 8 }}>No version yet</h2>
              <p className="muted" style={{ marginTop: 0 }}>
                Generation needs a completed immutable AI Profile and at least one citation-usable evidence document.
                When both inputs are ready, generation creates the first <code>DRAFT</code> version for this workspace&apos;s
                single Trust Pack.
              </p>
            </div>

            <div className="card-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              <div className="card card-muted stack">
                <strong>Evidence readiness</strong>
                <p className="muted">
                  {state.readiness.evidence.citationReadyDocuments > 0
                    ? `${state.readiness.evidence.citationReadyDocuments} citation-ready document(s) available.`
                    : "No citation-usable evidence exists yet."}
                </p>
                <Link className="button-secondary" href={`/w/${state.workspaceSlug}/evidence`}>
                  Open evidence
                </Link>
              </div>

              <div className="card card-muted stack">
                <strong>AI Profile readiness</strong>
                <p className="muted">
                  {state.readiness.aiProfile.latestProfile
                    ? `AI Profile v${state.readiness.aiProfile.latestProfile.versionNumber} is complete.`
                    : "No completed AI Profile exists yet."}
                </p>
                <Link className="button-secondary" href={`/w/${state.workspaceSlug}/ai-profile`}>
                  {state.readiness.aiProfile.latestProfile ? "Open AI profile" : "Complete AI profile"}
                </Link>
              </div>

              <div className="card card-muted stack">
                <strong>Generation</strong>
                <p className="muted">
                  {state.canGenerateInitial
                    ? "Inputs are ready. Generate the first draft version directly into this current-pack review, approval, and export surface."
                    : "Generation stays blocked until both evidence and AI Profile readiness are real and persisted."}
                </p>
                {state.canGenerateInitial ? (
                  <form action={generationAction}>
                    <button className="button" type="submit">
                      Generate trust pack
                    </button>
                  </form>
                ) : (
                  <button className="button" disabled type="button">
                    Generate trust pack
                  </button>
                )}
              </div>
            </div>
          </section>

          <aside className="split-side stack">
            <section className="card stack">
              <span className="eyebrow">Generation rules</span>
              <h2 style={{ marginBottom: 8 }}>Canonical gate</h2>
              <p className="muted" style={{ marginTop: 0 }}>
                Generation is available only when the backend readiness service says the workspace has a completed AI
                Profile and citation-usable evidence. There is no separate Generate page or pack-creation flow.
              </p>
            </section>
          </aside>
        </div>
      ) : (
        <div className="stack">
          <section className="card stack">
            <div className="space-between">
              <div>
                <span className="eyebrow">Current version</span>
                <h2 style={{ marginBottom: 8 }}>Trust Pack v{currentVersion.versionNumber}</h2>
                <p className="muted" style={{ marginTop: 0 }}>
                  This is the workspace&apos;s current version. Review, approval, and export now extend this same
                  current-pack surface without adding new IA.
                </p>
              </div>
              <div className="toolbar">
                <StatusChip tone={currentVersion.status === "STALE" ? "error" : "ready"}>
                  {getLifecycleBadgeLabel(currentVersion.status)}
                </StatusChip>
                {currentVersion.lifecycle.actions.canMarkReadyForReview ? (
                  <form action={markTrustPackReadyForReviewAction.bind(null, state.workspaceSlug, currentVersion.id)}>
                    <button className="button" type="submit">
                      Mark ready for review
                    </button>
                  </form>
                ) : null}
                {currentVersion.status === "READY_FOR_REVIEW" && can(state.role, WorkspaceAction.APPROVE_TRUST_PACK_VERSION) ? (
                  <form action={approveTrustPackVersionAction.bind(null, state.workspaceSlug, currentVersion.id)}>
                    <button
                      className="button"
                      disabled={!currentVersion.lifecycle.actions.canApprove}
                      type="submit"
                    >
                      Approve version
                    </button>
                  </form>
                ) : null}
                {currentVersion.lifecycle.actions.canSendBackToDraft ? (
                  <form action={sendTrustPackBackToDraftAction.bind(null, state.workspaceSlug, currentVersion.id)}>
                    <button className="button-secondary" type="submit">
                      Send back to draft
                    </button>
                  </form>
                ) : null}
                {currentVersion.lifecycle.actions.canExport && currentVersion.lifecycle.actions.exportLabel ? (
                  <form action={exportTrustPackVersionAction.bind(null, state.workspaceSlug, currentVersion.id)}>
                    <button className="button" type="submit">
                      {currentVersion.lifecycle.actions.exportLabel}
                    </button>
                  </form>
                ) : null}
                {state.canRegenerateStale ? (
                  <form action={generationAction}>
                    <button className="button" type="submit">
                      Regenerate new version
                    </button>
                  </form>
                ) : null}
              </div>
            </div>

            <div className="card-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
              <div className="card card-muted metric">
                <span className="muted">AI Profile</span>
                <strong>v{currentVersion.aiProfileVersionNumber}</strong>
              </div>
              <div className="card card-muted metric">
                <span className="muted">Approval</span>
                <strong>{currentVersion.lifecycle.approvalRecord ? "Approved" : "Not approved"}</strong>
              </div>
              <div className="card card-muted metric">
                <span className="muted">Found claims</span>
                <strong>{currentVersion.summary.foundClaims}</strong>
              </div>
              <div className="card card-muted metric">
                <span className="muted">Partial claims</span>
                <strong>{currentVersion.summary.partialClaims}</strong>
              </div>
              <div className="card card-muted metric">
                <span className="muted">Not found</span>
                <strong>{currentVersion.summary.notFoundClaims}</strong>
              </div>
              <div className="card card-muted metric">
                <span className="muted">Citations</span>
                <strong>{currentVersion.summary.totalCitations}</strong>
              </div>
              <div className="card card-muted metric">
                <span className="muted">Exports</span>
                <strong>{currentVersion.lifecycle.exportSummary.exportCount}</strong>
              </div>
            </div>

            {currentVersion.status === "STALE" ? (
              <div className="banner banner-error" role="status">
                Newer evidence or AI Profile inputs exist. This stale version remains the current version until an
                explicit regeneration creates a new draft.
              </div>
            ) : currentVersion.status === "READY_FOR_REVIEW" &&
              can(state.role, WorkspaceAction.APPROVE_TRUST_PACK_VERSION) &&
              currentVersion.lifecycle.approvalReadiness.blockingReasons.length > 0 ? (
              <div className="banner banner-error" role="status">
                <strong>Approval is blocked on this version.</strong>
                <ul style={{ marginBottom: 0 }}>
                  {currentVersion.lifecycle.approvalReadiness.blockingReasons.map((reason) => (
                    <li key={`${reason.code}-${reason.claimKey ?? reason.sectionKey ?? reason.message}`}>{reason.message}</li>
                  ))}
                </ul>
              </div>
            ) : currentVersion.status === "READY_FOR_REVIEW" &&
              !can(state.role, WorkspaceAction.APPROVE_TRUST_PACK_VERSION) ? (
              <div className="banner banner-notice" role="status">
                Only owners and admins can approve this ready-for-review version. Reviewers can still send it back to
                draft if more work is needed.
              </div>
            ) : currentVersion.status === "APPROVED" || currentVersion.status === "EXPORTED" ? (
              <div className="banner banner-notice" role="status">
                Buyer-facing export uses this exact approved version, preserves citations and the evidence appendix, and
                omits raw internal workflow chrome and claim-status labels.
              </div>
            ) : (
              <div className="banner banner-notice" role="status">
                Move this draft to ready for review when the current wording, citations, and honest gaps are acceptable
                for final approval on this exact version.
              </div>
            )}

            {(currentVersion.lifecycle.approvalRecord || currentVersion.lifecycle.exportSummary.exportCount > 0) && (
              <div className="card-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                {currentVersion.lifecycle.approvalRecord ? (
                  <div className="card card-muted stack">
                    <strong>Approval record</strong>
                    <p className="muted" style={{ margin: 0 }}>
                      Approved by {currentVersion.lifecycle.approvalRecord.approvedBy} on{" "}
                      {formatTimestamp(currentVersion.lifecycle.approvalRecord.approvedAt) ?? "an earlier date"}.
                    </p>
                    {currentVersion.lifecycle.approvalRecord.note ? (
                      <p className="muted" style={{ margin: 0 }}>
                        Note: {currentVersion.lifecycle.approvalRecord.note}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {currentVersion.lifecycle.exportSummary.exportCount > 0 ? (
                  <div className="card card-muted stack">
                    <strong>Export history</strong>
                    <p className="muted" style={{ margin: 0 }}>
                      {currentVersion.lifecycle.exportSummary.exportCount} export record(s) attached to this exact
                      version.
                    </p>
                    <p className="muted" style={{ margin: 0 }}>
                      Latest export: {formatTimestamp(currentVersion.lifecycle.exportSummary.latestExportedAt) ?? "Not recorded"}
                      {currentVersion.lifecycle.exportSummary.latestFormat
                        ? ` · ${currentVersion.lifecycle.exportSummary.latestFormat}`
                        : ""}
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </section>

          <TrustPackReview currentVersion={currentVersion} />
        </div>
      )}
    </div>
  );
}
