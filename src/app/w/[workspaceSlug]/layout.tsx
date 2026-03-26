import { AppShell } from "@/components/app-shell";
import { getCurrentUser, requirePageWorkspaceAccess } from "@/lib/auth";

export default async function WorkspaceLayout(props: {
  children: React.ReactNode;
  params: {
    workspaceSlug: string;
  };
}) {
  const user = await getCurrentUser();
  const access = await requirePageWorkspaceAccess(props.params.workspaceSlug, "VIEW_HOME");

  if (!user) {
    return null;
  }

  return (
    <AppShell
      role={access.role}
      userEmail={user.email}
      workspaceName={access.workspace.name}
      workspaceSlug={access.workspace.slug}
    >
      {props.children}
    </AppShell>
  );
}
