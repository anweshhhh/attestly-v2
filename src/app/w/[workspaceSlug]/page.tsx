import Link from "next/link";
import { generateTrustPackDraftAction } from "@/app/actions";
import { Banner } from "@/components/banner";
import { StatusChip } from "@/components/status-chip";
import { getCurrentUser, requirePageWorkspaceAccess } from "@/lib/auth";
import { getHomeState } from "@/lib/home";

type WorkspaceHomePageProps = {
  params: {
    workspaceSlug: string;
  };
  searchParams?: {
    error?: string;
    notice?: string;
  };
};

export default async function WorkspaceHomePage(props: WorkspaceHomePageProps) {
  const user = await getCurrentUser();
  const access = await requirePageWorkspaceAccess(props.params.workspaceSlug, "VIEW_HOME");
  const state = await getHomeState(access.userId, access.workspace.slug);
  const generateAction = generateTrustPackDraftAction.bind(null, state.workspaceSlug);

  return (
    <div className="stack">
      <Banner error={props.searchParams?.error} notice={props.searchParams?.notice} />

      <section className="hero">
        <span className="eyebrow" style={{ color: "rgba(255,255,255,0.8)" }}>
          Home
        </span>
        <h1>{state.workspaceName}</h1>
        <p style={{ color: "rgba(255,255,255,0.82)", maxWidth: 760, lineHeight: 1.7 }}>
          Move through the narrow phase-1 loop one honest step at a time: upload evidence, complete the AI Profile,
          generate the current Trust Pack only when grounded inputs are ready, and keep later-slice controls out of
          view until they are real.
        </p>
        <div className="toolbar">
          {state.dominantAction.kind === "link" && state.dominantAction.href ? (
            <Link className="button-secondary" href={state.dominantAction.href}>
              {state.dominantAction.label}
            </Link>
          ) : (
            <form action={generateAction}>
              <button className="button-secondary" type="submit">
                {state.dominantAction.label}
              </button>
            </form>
          )}
          <span className="pill">Signed in as {user?.email}</span>
        </div>
      </section>

      <div className="split">
        <section className="card split-main stack">
          <div className="space-between">
            <div>
              <span className="eyebrow">Next action</span>
              <h2 style={{ marginBottom: 8 }}>Dominant setup step</h2>
              <p className="muted" style={{ marginTop: 0 }}>
                {state.dominantAction.description}
              </p>
            </div>
            <StatusChip
              tone={
                state.trustPackStatus.label === "Stale"
                  ? "error"
                  : state.trustPackStatus.label === "Current version"
                    ? "ready"
                    : state.evidence.citationReadyDocuments > 0
                      ? "upcoming"
                      : "neutral"
              }
            >
              {state.trustPackStatus.label}
            </StatusChip>
          </div>

          <div className="card-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <div className="card card-muted metric">
              <span className="muted">Total evidence docs</span>
              <strong>{state.evidence.totalDocuments}</strong>
            </div>
            <div className="card card-muted metric">
              <span className="muted">Citation-ready docs</span>
              <strong>{state.evidence.citationReadyDocuments}</strong>
            </div>
            <div className="card card-muted metric">
              <span className="muted">Processing issues</span>
              <strong>{state.evidence.processingErrors}</strong>
            </div>
          </div>
        </section>

        <aside className="split-side stack">
          <section className="card stack">
            <div>
              <span className="eyebrow">Phase 1 loop</span>
              <h2 style={{ marginBottom: 8 }}>Current progress</h2>
            </div>
            <div className="stack">
              <div className="card card-muted">
                <div className="space-between">
                  <strong>1. Evidence</strong>
                  <span className="pill">
                    {state.evidence.citationReadyDocuments > 0 ? "Ready" : state.evidence.totalDocuments > 0 ? "In progress" : "Not started"}
                  </span>
                </div>
                <p className="muted">{state.evidence.citationReadyDocuments > 0 ? "Citation-usable source material exists." : "Upload trust-relevant evidence first."}</p>
              </div>
              <div className="card card-muted">
                <div className="space-between">
                  <strong>2. AI Profile</strong>
                  <span className="pill">{state.aiProfileStatus.label}</span>
                </div>
                <p className="muted">{state.aiProfileStatus.description}</p>
              </div>
              <div className="card card-muted">
                <div className="space-between">
                  <strong>3. Trust Packs</strong>
                  <span className="pill">{state.trustPackStatus.label}</span>
                </div>
                <p className="muted">{state.trustPackStatus.description}</p>
              </div>
            </div>
          </section>

          <section className="card stack">
            <span className="eyebrow">Current pack</span>
            <h2 style={{ marginBottom: 8 }}>Single current Trust Pack</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              {state.trustPackStatus.currentVersionNumber
                ? `The workspace is currently pointed at Trust Pack v${state.trustPackStatus.currentVersionNumber} (${state.trustPackStatus.currentVersionStatus}).`
                : "No Trust Pack version exists yet. The workspace still uses the single-pack model, even before the first version is generated."}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
