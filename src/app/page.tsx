import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { bootstrapWorkspaceForUser, getActiveWorkspaceForUser } from "@/lib/workspaces";

export default async function IndexPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const activeWorkspace = await getActiveWorkspaceForUser(user.id);

  if (!activeWorkspace) {
    const bootstrapped = await bootstrapWorkspaceForUser({
      email: user.email,
      name: user.name
    });
    redirect(`/w/${bootstrapped.access.workspace.slug}`);
  }

  redirect(`/w/${activeWorkspace.workspace.slug}`);
}
