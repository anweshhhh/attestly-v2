import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-config";
import { AppError } from "@/lib/errors";
import { requireWorkspaceAccess, type WorkspaceAccess } from "@/lib/workspaces";
import { type WorkspaceAction } from "@/lib/rbac";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null
  };
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new AppError("Authentication required.", {
      code: "UNAUTHORIZED",
      status: 401
    });
  }

  return user;
}

export async function requirePageWorkspaceAccess(
  workspaceSlug: string,
  action: WorkspaceAction
): Promise<WorkspaceAccess> {
  const user = await getCurrentUser();
  if (!user) {
    const nextPath = `/w/${workspaceSlug}`;
    redirect(`/login?callbackUrl=${encodeURIComponent(nextPath)}`);
  }

  try {
    return await requireWorkspaceAccess(user.id, workspaceSlug, action);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}
