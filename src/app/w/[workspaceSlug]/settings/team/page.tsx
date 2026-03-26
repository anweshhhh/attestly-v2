import { addMemberAction, renameWorkspaceAction, updateMemberRoleAction } from "@/app/actions";
import { Banner } from "@/components/banner";
import { StatusChip } from "@/components/status-chip";
import { requirePageWorkspaceAccess } from "@/lib/auth";
import { MembershipRole, type MembershipRole as MembershipRoleType } from "@/lib/domain";
import { can, canAssignRole } from "@/lib/rbac";
import { listWorkspaceMembers } from "@/lib/workspaces";

type SettingsTeamPageProps = {
  params: {
    workspaceSlug: string;
  };
  searchParams?: {
    error?: string;
    notice?: string;
  };
};

const ROLE_OPTIONS: MembershipRoleType[] = ["ADMIN", "REVIEWER", "VIEWER"];

export default async function SettingsTeamPage(props: SettingsTeamPageProps) {
  const access = await requirePageWorkspaceAccess(props.params.workspaceSlug, "VIEW_TEAM");
  const members = await listWorkspaceMembers(access.userId, access.workspace.slug);
  const canManageWorkspace = can(access.role, "UPDATE_WORKSPACE");
  const canInviteMembers = can(access.role, "INVITE_MEMBERS");
  const canUpdateRoles = can(access.role, "UPDATE_MEMBER_ROLE");

  return (
    <div className="stack">
      <Banner error={props.searchParams?.error} notice={props.searchParams?.notice} />

      <section className="split">
        <div className="card split-main stack">
          <div className="space-between">
            <div>
              <span className="eyebrow">Settings / Team</span>
              <h1 style={{ marginBottom: 8 }}>Lean workspace administration</h1>
              <p className="muted" style={{ marginTop: 0 }}>
                Phase 1 keeps this surface intentionally small: workspace identity, membership visibility, and role
                controls that respect workspace boundaries.
              </p>
            </div>
            <StatusChip tone="neutral">{access.role}</StatusChip>
          </div>

          <section className="card card-muted stack">
            <div>
              <strong>Workspace identity</strong>
              <p className="muted">
                Slug: <code>{access.workspace.slug}</code>
              </p>
            </div>
            {canManageWorkspace ? (
              <form action={renameWorkspaceAction.bind(null, access.workspace.slug)} className="field-grid">
                <label className="stack">
                  <span>Workspace name</span>
                  <input defaultValue={access.workspace.name} name="name" required />
                </label>
                <div>
                  <button className="button" type="submit">
                    Save workspace name
                  </button>
                </div>
              </form>
            ) : (
              <p className="muted">Workspace identity changes are limited to admins and owners in phase 1.</p>
            )}
          </section>

          <section className="card stack">
            <div className="space-between">
              <div>
                <span className="eyebrow">Memberships</span>
                <h2 style={{ marginBottom: 8 }}>Workspace members</h2>
              </div>
              <span className="pill">{members.length} members</span>
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => {
                    const canEditThisMember =
                      canUpdateRoles &&
                      member.userId !== access.userId &&
                      member.role !== MembershipRole.OWNER &&
                      canAssignRole(access.role, member.role);

                    return (
                      <tr key={member.id}>
                        <td>
                          <strong>{member.name || member.email}</strong>
                          <div className="muted">{member.email}</div>
                        </td>
                        <td>
                          <StatusChip tone={member.role === MembershipRole.VIEWER ? "neutral" : "ready"}>
                            {member.role}
                          </StatusChip>
                        </td>
                        <td>{new Date(member.createdAt).toLocaleDateString()}</td>
                        <td>
                          {canEditThisMember ? (
                            <form
                              action={updateMemberRoleAction.bind(null, access.workspace.slug, member.id)}
                              className="inline-form"
                            >
                              <select defaultValue={member.role} name="role">
                                {ROLE_OPTIONS.filter((role) => canAssignRole(access.role, role)).map((role) => (
                                  <option key={role} value={role}>
                                    {role}
                                  </option>
                                ))}
                              </select>
                              <button className="button-secondary" type="submit">
                                Update role
                              </button>
                            </form>
                          ) : (
                            <span className="muted">No editable action</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="split-side stack">
          <section className="card stack">
            <span className="eyebrow">Role boundaries</span>
            <h2 style={{ marginBottom: 8 }}>Server-enforced permissions</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              Owners and admins can manage workspace operations. Reviewers and viewers can still inspect team context
              without gaining hidden mutation access.
            </p>
          </section>

          <section className="card stack">
            <span className="eyebrow">Add member</span>
            {canInviteMembers ? (
              <form action={addMemberAction.bind(null, access.workspace.slug)} className="field-grid">
                <label className="stack">
                  <span>Email</span>
                  <input name="email" placeholder="teammate@company.com" type="email" required />
                </label>
                <label className="stack">
                  <span>Name (optional)</span>
                  <input name="name" placeholder="Teammate name" type="text" />
                </label>
                <label className="stack">
                  <span>Role</span>
                  <select name="role" defaultValue={canAssignRole(access.role, "ADMIN") ? "REVIEWER" : "VIEWER"}>
                    {ROLE_OPTIONS.filter((role) => canAssignRole(access.role, role)).map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>
                <div>
                  <button className="button" type="submit">
                    Add member
                  </button>
                </div>
              </form>
            ) : (
              <p className="muted">Invites and role management are disabled for your role in phase 1.</p>
            )}
          </section>
        </aside>
      </section>
    </div>
  );
}
