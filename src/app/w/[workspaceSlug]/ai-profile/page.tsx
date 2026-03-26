import { Banner } from "@/components/banner";
import { AIProfileSummary } from "@/components/ai-profile-summary";
import { AIProfileWizard } from "@/components/ai-profile-wizard";
import { StatusChip } from "@/components/status-chip";
import { requirePageWorkspaceAccess } from "@/lib/auth";
import { getAIProfileWizardPageData } from "@/lib/ai-profiles";

type AIProfilePageProps = {
  params: {
    workspaceSlug: string;
  };
  searchParams?: {
    error?: string;
    notice?: string;
  };
};

export default async function AIProfilePage(props: AIProfilePageProps) {
  const access = await requirePageWorkspaceAccess(props.params.workspaceSlug, "VIEW_AI_PROFILE");
  const state = await getAIProfileWizardPageData(access.userId, access.workspace.slug);

  return (
    <div className="stack">
      <Banner error={props.searchParams?.error} notice={props.searchParams?.notice} />

      {!state.canEdit ? (
        <div className="split">
          <section className="card split-main stack">
            <div className="space-between">
              <div>
                <span className="eyebrow">AI Profile</span>
                <h1 style={{ marginBottom: 8 }}>Read-only attestation summary</h1>
                <p className="muted" style={{ marginTop: 0, maxWidth: 760 }}>
                  Your role can inspect the latest completed AI Profile, but only owners, admins, and reviewers can
                  edit or complete it.
                </p>
              </div>
              <StatusChip tone="neutral">Viewer read-only</StatusChip>
            </div>

            {state.latestProfile ? (
              <AIProfileSummary
                description={`Latest completed version: v${state.latestProfile.versionNumber}. Unknown values remain visible and uncited.`}
                fieldState={state.latestProfile.fieldStateJson}
                payload={state.latestProfile.payloadJson}
                title="Latest completed AI Profile"
              />
            ) : (
              <div className="empty-state">
                <strong>No completed AI Profile yet</strong>
                <p className="muted">This workspace does not have a completed AI Profile version to review yet.</p>
              </div>
            )}
          </section>

          <aside className="split-side card stack">
            <span className="eyebrow">Phase 1 behavior</span>
            <h2 style={{ marginBottom: 8 }}>One current attestation thread</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              The wizard saves into one workspace-scoped draft session and completion creates immutable versions. This
              page keeps viewers read-only while the backend preserves the same version history.
            </p>
          </aside>
        </div>
      ) : (
        <AIProfileWizard
          initialDraft={state.initialDraft}
          latestProfileVersionNumber={state.latestProfile?.versionNumber ?? null}
          workspaceSlug={state.workspaceSlug}
        />
      )}
    </div>
  );
}
