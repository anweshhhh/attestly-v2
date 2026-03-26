import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";
import { resetDatabase, seedWorkspaceOwner } from "@/test/test-helpers";

const { getServerSessionMock } = vi.hoisted(() => ({
  getServerSessionMock: vi.fn()
}));

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock
}));

import { getCurrentUser, requireCurrentUser, requirePageWorkspaceAccess } from "@/lib/auth";

describe("server auth helpers", () => {
  beforeEach(async () => {
    await resetDatabase();
    getServerSessionMock.mockReset();
  });

  it("returns the authenticated app user from the NextAuth session", async () => {
    getServerSessionMock.mockResolvedValue({
      user: {
        id: "user_123",
        email: "owner@acme.com",
        name: "Owner"
      }
    });

    await expect(getCurrentUser()).resolves.toEqual({
      id: "user_123",
      email: "owner@acme.com",
      name: "Owner"
    });
  });

  it("rejects protected access when no authenticated session exists", async () => {
    getServerSessionMock.mockResolvedValue(null);

    await expect(requireCurrentUser()).rejects.toThrowError(AppError);
  });

  it("resolves workspace access from the authenticated membership role", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com",
      name: "Owner"
    });

    getServerSessionMock.mockResolvedValue({
      user: {
        id: owner.user.id,
        email: owner.user.email,
        name: owner.user.name
      }
    });

    await expect(requirePageWorkspaceAccess(owner.access.workspace.slug, "VIEW_HOME")).resolves.toMatchObject({
      workspace: {
        slug: owner.access.workspace.slug
      },
      role: "OWNER"
    });
  });
});
