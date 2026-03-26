import { type Workspace } from "@prisma/client";
import { MembershipRole, asMembershipRole, type MembershipRole as MembershipRoleValue } from "@/lib/domain";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { assertCan, canAssignRole, type WorkspaceAction } from "@/lib/rbac";
import { buildWorkspaceName, slugifyWorkspaceName } from "@/lib/slug";

export type WorkspaceAccess = {
  userId: string;
  role: MembershipRoleValue;
  membershipId: string;
  workspace: Pick<Workspace, "id" | "name" | "slug" | "createdAt" | "updatedAt">;
};

export type WorkspaceMemberSummary = {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: MembershipRoleValue;
  createdAt: Date;
};

async function createUniqueWorkspaceSlug(baseName: string) {
  const baseSlug = slugifyWorkspaceName(baseName) || "workspace";

  for (let index = 0; index < 100; index += 1) {
    const candidate = index === 0 ? baseSlug : `${baseSlug}-${index + 1}`;
    const existing = await prisma.workspace.findUnique({
      where: { slug: candidate },
      select: { id: true }
    });

    if (!existing) {
      return candidate;
    }
  }

  return `${baseSlug}-${Date.now()}`;
}

export async function ensureUserIdentity(params: { email: string; name?: string | null }) {
  const normalizedEmail = params.email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new AppError("Email is required.", {
      code: "INVALID_EMAIL",
      status: 400
    });
  }

  return prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      name: params.name?.trim() || undefined
    },
    create: {
      email: normalizedEmail,
      name: params.name?.trim() || null
    }
  });
}

export async function bootstrapWorkspaceForUser(params: { email: string; name?: string | null }) {
  const user = await ensureUserIdentity({
    email: params.email,
    name: params.name
  });

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          updatedAt: true
        }
      }
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  if (memberships.length === 0) {
    const workspaceName = buildWorkspaceName({
      email: user.email,
      name: user.name,
      userId: user.id
    });
    const workspaceSlug = await createUniqueWorkspaceSlug(workspaceName);

    const workspace = await prisma.workspace.create({
      data: {
        name: workspaceName,
        slug: workspaceSlug
      }
    });

    const membership = await prisma.membership.create({
      data: {
        userId: user.id,
        workspaceId: workspace.id,
        role: MembershipRole.OWNER
      }
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastUsedWorkspaceId: workspace.id }
    });

    return {
      user,
      access: {
        userId: user.id,
        membershipId: membership.id,
        role: asMembershipRole(membership.role),
        workspace
      }
    };
  }

  const activeMembership =
    memberships.find((membership) => membership.workspace.id === user.lastUsedWorkspaceId) ?? memberships[0];

  if (activeMembership.workspace.id !== user.lastUsedWorkspaceId) {
    await prisma.user.update({
      where: { id: user.id },
      data: { lastUsedWorkspaceId: activeMembership.workspace.id }
    });
  }

  return {
    user,
    access: {
      userId: user.id,
      membershipId: activeMembership.id,
      role: asMembershipRole(activeMembership.role),
      workspace: activeMembership.workspace
    }
  };
}

export async function getActiveWorkspaceForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      lastUsedWorkspaceId: true
    }
  });

  if (!user) {
    return null;
  }

  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          updatedAt: true
        }
      }
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  if (memberships.length === 0) {
    return null;
  }

  return memberships.find((membership) => membership.workspace.id === user.lastUsedWorkspaceId) ?? memberships[0];
}

export async function requireWorkspaceAccess(
  userId: string,
  workspaceSlug: string,
  action: WorkspaceAction
): Promise<WorkspaceAccess> {
  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      workspace: {
        slug: workspaceSlug
      }
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          updatedAt: true
        }
      }
    }
  });

  if (!membership) {
    throw new AppError("Workspace not found.", {
      code: "WORKSPACE_NOT_FOUND",
      status: 404
    });
  }

  const role = asMembershipRole(membership.role);
  assertCan(role, action);

  return {
    userId,
    membershipId: membership.id,
    role,
    workspace: membership.workspace
  };
}

export async function listWorkspaceMembers(userId: string, workspaceSlug: string) {
  const access = await requireWorkspaceAccess(userId, workspaceSlug, "VIEW_TEAM");

  const memberships = await prisma.membership.findMany({
    where: {
      workspaceId: access.workspace.id
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }]
  });

  return memberships.map<WorkspaceMemberSummary>((membership) => ({
    id: membership.id,
    userId: membership.user.id,
    email: membership.user.email,
    name: membership.user.name,
    role: asMembershipRole(membership.role),
    createdAt: membership.createdAt
  }));
}

export async function renameWorkspace(userId: string, workspaceSlug: string, nextName: string) {
  const access = await requireWorkspaceAccess(userId, workspaceSlug, "UPDATE_WORKSPACE");
  const trimmedName = nextName.trim();

  if (trimmedName.length < 3) {
    throw new AppError("Workspace name must be at least 3 characters.", {
      code: "INVALID_WORKSPACE_NAME",
      status: 400
    });
  }

  return prisma.workspace.update({
    where: {
      id: access.workspace.id
    },
    data: {
      name: trimmedName
    }
  });
}

function assertCanManageRole(actorRole: MembershipRoleValue, targetRole: MembershipRoleValue) {
  if (!canAssignRole(actorRole, targetRole)) {
    throw new AppError("You cannot assign that role in Slice 1.", {
      code: "FORBIDDEN_ROLE_ASSIGNMENT",
      status: 403
    });
  }
}

export async function addWorkspaceMember(params: {
  userId: string;
  workspaceSlug: string;
  email: string;
  name?: string | null;
  role: MembershipRoleValue;
}) {
  const access = await requireWorkspaceAccess(params.userId, params.workspaceSlug, "INVITE_MEMBERS");
  assertCanManageRole(access.role, params.role);

  const email = params.email.trim().toLowerCase();
  if (!email) {
    throw new AppError("Email is required.", {
      code: "INVALID_EMAIL",
      status: 400
    });
  }

  const user = await ensureUserIdentity({
    email,
    name: params.name
  });

  const existingMembership = await prisma.membership.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: access.workspace.id,
        userId: user.id
      }
    }
  });

  if (existingMembership) {
    throw new AppError("That user is already a member of this workspace.", {
      code: "MEMBERSHIP_EXISTS",
      status: 400
    });
  }

  return prisma.membership.create({
    data: {
      workspaceId: access.workspace.id,
      userId: user.id,
      role: params.role
    }
  });
}

export async function updateWorkspaceMemberRole(params: {
  userId: string;
  workspaceSlug: string;
  membershipId: string;
  role: MembershipRoleValue;
}) {
  const access = await requireWorkspaceAccess(params.userId, params.workspaceSlug, "UPDATE_MEMBER_ROLE");
  assertCanManageRole(access.role, params.role);

  const membership = await prisma.membership.findFirst({
    where: {
      id: params.membershipId,
      workspaceId: access.workspace.id
    }
  });

  if (!membership) {
    throw new AppError("Membership not found.", {
      code: "MEMBERSHIP_NOT_FOUND",
      status: 404
    });
  }

  if (membership.role === MembershipRole.OWNER) {
    throw new AppError("Owner role changes are out of scope for Slice 1.", {
      code: "OWNER_ROLE_LOCKED",
      status: 400
    });
  }

  if (membership.userId === params.userId) {
    throw new AppError("Self role changes are out of scope for Slice 1.", {
      code: "SELF_ROLE_CHANGE_FORBIDDEN",
      status: 400
    });
  }

  return prisma.membership.update({
    where: { id: membership.id },
    data: {
      role: params.role
    }
  });
}
