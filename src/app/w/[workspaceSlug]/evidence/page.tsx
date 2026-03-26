import { archiveEvidenceAction, retryEvidenceAction } from "@/app/actions";
import Link from "next/link";
import { Banner } from "@/components/banner";
import { EvidenceUploadCard } from "@/components/evidence-upload-card";
import { StatusChip } from "@/components/status-chip";
import { requirePageWorkspaceAccess } from "@/lib/auth";
import { DocumentStatus } from "@/lib/domain";
import { listEvidenceDocuments } from "@/lib/evidence";
import { MAX_EVIDENCE_FILE_BYTES } from "@/lib/env";
import { can } from "@/lib/rbac";
import { getWorkspaceReadinessState } from "@/lib/workspace-readiness";

type EvidencePageProps = {
  params: {
    workspaceSlug: string;
  };
  searchParams?: {
    error?: string;
    notice?: string;
  };
};

function statusTone(status: string) {
  if (status === DocumentStatus.CHUNKED) {
    return "ready";
  }
  if (status === DocumentStatus.ERROR) {
    return "error";
  }
  if (status === DocumentStatus.ARCHIVED) {
    return "neutral";
  }
  return "upcoming";
}

export default async function EvidencePage(props: EvidencePageProps) {
  const access = await requirePageWorkspaceAccess(props.params.workspaceSlug, "VIEW_EVIDENCE");
  const { documents, readiness } = await listEvidenceDocuments(access.userId, access.workspace.slug);
  const workspaceReadiness = await getWorkspaceReadinessState(access.userId, access.workspace.slug);

  return (
    <div className="stack">
      <Banner error={props.searchParams?.error} notice={props.searchParams?.notice} />

      <section className="split">
        <div className="card split-main stack">
          <div className="space-between">
            <div>
              <span className="eyebrow">Evidence Library</span>
              <h1 style={{ marginBottom: 8 }}>Build the citation-ready source base</h1>
              <p className="muted" style={{ marginTop: 0 }}>
                Upload trust-relevant documents, let the system process them into citation-usable chunks, and track
                which files are ready to ground the current Trust Pack.
              </p>
            </div>
            <StatusChip tone={readiness.citationReadyDocuments > 0 ? "ready" : "upcoming"}>
              {readiness.citationReadyDocuments > 0 ? "Citation-ready evidence present" : "Upload your first evidence"}
            </StatusChip>
          </div>

          {can(access.role, "UPLOAD_EVIDENCE") ? (
            <EvidenceUploadCard
              workspaceId={access.workspace.id}
              workspaceSlug={access.workspace.slug}
              maxBytes={MAX_EVIDENCE_FILE_BYTES}
            />
          ) : (
            <div className="card card-muted">
              <strong>Read-only evidence access</strong>
              <p className="muted">Your role can inspect evidence readiness, but uploads and evidence changes are disabled.</p>
            </div>
          )}

          <div className="table-wrap card">
            <div className="space-between" style={{ marginBottom: 12 }}>
              <div>
                <span className="eyebrow">Workspace-scoped documents</span>
                <h2 style={{ marginBottom: 8 }}>Evidence status</h2>
              </div>
              <div className="toolbar">
                <span className="pill">{readiness.totalDocuments} total</span>
                <span className="pill">{readiness.citationReadyDocuments} citation-ready</span>
              </div>
            </div>

            {documents.length === 0 ? (
              <div className="empty-state">
                <strong>No evidence yet</strong>
                <p className="muted">
                  Start with policies, architecture notes, product docs, or prior diligence responses. Attestly stays
                  intentionally evidence-first.
                </p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Status</th>
                    <th>Readiness</th>
                    <th>Metadata</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((document) => (
                    <tr key={document.id}>
                      <td>
                        <strong>{document.originalName}</strong>
                        <div className="muted">{document.mimeType || "Unknown type"}</div>
                      </td>
                      <td>
                        <StatusChip tone={statusTone(document.status)}>{document.status}</StatusChip>
                        {document.errorMessage ? <div className="muted">{document.errorMessage}</div> : null}
                      </td>
                      <td>
                        {document.status === DocumentStatus.CHUNKED ? (
                          <div className="stack" style={{ gap: 6 }}>
                            <strong>Ready for later citations</strong>
                            <span className="muted">{document.chunkCount} chunks extracted</span>
                          </div>
                        ) : (
                          <span className="muted">Not citation-usable yet</span>
                        )}
                      </td>
                      <td>
                        <div className="stack" style={{ gap: 6 }}>
                          <span>{Math.round(document.byteSize / 1024)} KB</span>
                          <span className="muted">{new Date(document.updatedAt).toLocaleString()}</span>
                        </div>
                      </td>
                      <td>
                        <div className="stack" style={{ gap: 8 }}>
                          {can(access.role, "RETRY_EVIDENCE") && document.status !== DocumentStatus.CHUNKED ? (
                            <form
                              action={retryEvidenceAction.bind(null, access.workspace.slug, document.id)}
                              className="inline-form"
                            >
                              <button className="button-secondary" type="submit">
                                Retry processing
                              </button>
                            </form>
                          ) : null}

                          {can(access.role, "ARCHIVE_EVIDENCE") && document.status !== DocumentStatus.ARCHIVED ? (
                            <form
                              action={archiveEvidenceAction.bind(null, access.workspace.slug, document.id)}
                              className="inline-form"
                            >
                              <button className="button-danger" type="submit">
                                Archive
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <aside className="split-side stack">
          <section className="card stack">
            <span className="eyebrow">Readiness</span>
            <h2 style={{ marginBottom: 8 }}>Future Trust Pack inputs</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              Evidence stays first, but the next truthful step changes once documents are ready.
            </p>
            <StatusChip tone={readiness.citationReadyDocuments > 0 ? "ready" : "upcoming"}>
              Evidence prerequisite {readiness.citationReadyDocuments > 0 ? "met" : "not met yet"}
            </StatusChip>
            {workspaceReadiness.evidence.citationReadyDocuments > 0 && !workspaceReadiness.aiProfile.latestProfile ? (
              workspaceReadiness.canEditAIProfile ? (
                <Link className="button-secondary" href={`/w/${access.workspace.slug}/ai-profile`}>
                  {workspaceReadiness.aiProfile.activeDraft ? "Resume AI profile" : "Complete AI profile"}
                </Link>
              ) : (
                <div className="pill">AI Profile is pending and read-only for your role.</div>
              )
            ) : null}
            {workspaceReadiness.trustPack.canCreateDraftVersion ? (
              <Link className="button-secondary" href={`/w/${access.workspace.slug}/trust-packs`}>
                Trust Pack inputs are ready
              </Link>
            ) : null}
          </section>

          <section className="card stack">
            <span className="eyebrow">Boundaries</span>
            <h2 style={{ marginBottom: 8 }}>Current document actions</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              Upload, status visibility, retry, and archive are the only live document operations here. This is not a
              generic document-management workspace.
            </p>
          </section>
        </aside>
      </section>
    </div>
  );
}
