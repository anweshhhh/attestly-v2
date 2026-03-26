import { beforeEach, describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { addWorkspaceMember, listWorkspaceMembers, renameWorkspace, requireWorkspaceAccess } from "@/lib/workspaces";
import { resetDatabase, seedWorkspaceOwner } from "@/test/test-helpers";

describe("workspace access", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("bootstraps an owner workspace and grants access only to members", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com",
      name: "Owner"
    });
    const outsider = await seedWorkspaceOwner({
      email: "outsider@beta.com",
      name: "Outsider"
    });

    const access = await requireWorkspaceAccess(owner.user.id, owner.access.workspace.slug, "VIEW_HOME");
    expect(access.workspace.slug).toBe(owner.access.workspace.slug);
    expect(access.role).toBe("OWNER");

    await expect(
      requireWorkspaceAccess(outsider.user.id, owner.access.workspace.slug, "VIEW_HOME")
    ).rejects.toMatchObject({
      status: 404,
      code: "WORKSPACE_NOT_FOUND"
    });
  });

  it("enforces owner and admin boundaries for team settings", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com"
    });

    await addWorkspaceMember({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      email: "viewer@acme.com",
      role: "VIEWER"
    });

    const members = await listWorkspaceMembers(owner.user.id, owner.access.workspace.slug);
    const viewer = members.find((member) => member.email === "viewer@acme.com");
    expect(viewer?.role).toBe("VIEWER");

    await expect(renameWorkspace(viewer!.userId, owner.access.workspace.slug, "Blocked")).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN"
    });

    await expect(
      addWorkspaceMember({
        userId: viewer!.userId,
        workspaceSlug: owner.access.workspace.slug,
        email: "another@acme.com",
        role: "VIEWER"
      })
    ).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN"
    });
  });
});
