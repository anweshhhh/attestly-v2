import type { Session } from "next-auth";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { authOptions, getVerifiedGoogleIdentity } from "@/lib/auth-config";
import { addWorkspaceMember, bootstrapWorkspaceForUser, getActiveWorkspaceForUser } from "@/lib/workspaces";
import { resetDatabase } from "@/test/test-helpers";

describe("auth config", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("accepts only verified Google identities", () => {
    expect(
      getVerifiedGoogleIdentity({
        email: "Owner@Acme.com",
        email_verified: true,
        name: "Owner"
      })
    ).toEqual({
      email: "owner@acme.com",
      name: "Owner"
    });

    expect(
      getVerifiedGoogleIdentity({
        email: "owner@acme.com",
        email_verified: false
      })
    ).toBeNull();
  });

  it("creates or updates the app user from a verified Google sign-in and exposes the app user id in session", async () => {
    const signInResult = await authOptions.callbacks?.signIn?.({
      account: {
        provider: "google"
      },
      profile: {
        email: "owner@acme.com",
        email_verified: true,
        name: "Owner"
      }
    } as never);

    expect(signInResult).toBe(true);

    const token = await authOptions.callbacks?.jwt?.({
      token: {
        email: "owner@acme.com",
        name: "Owner"
      },
      account: {
        provider: "google"
      },
      profile: {
        email: "owner@acme.com",
        email_verified: true,
        name: "Owner"
      }
    } as never);

    expect(token?.appUserId).toBeTruthy();

    const session = (await authOptions.callbacks?.session?.({
      session: {
        user: {
          email: "owner@acme.com",
          name: "Owner"
        },
        expires: new Date(Date.now() + 60_000).toISOString()
      } as Session,
      token: token!
    } as never)) as Session;

    expect(session.user.id).toBe(token?.appUserId);
    expect(session.user.email).toBe("owner@acme.com");

    const persistedUser = await prisma.user.findUnique({
      where: {
        email: "owner@acme.com"
      }
    });

    expect(persistedUser?.id).toBe(token?.appUserId);
  });

  it("maps a verified sign-in back onto an existing invited membership instead of creating a duplicate user", async () => {
    const owner = await bootstrapWorkspaceForUser({
      email: "owner@acme.com",
      name: "Owner"
    });

    const invitedMembership = await addWorkspaceMember({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      email: "reviewer@acme.com",
      name: "Reviewer",
      role: "REVIEWER"
    });

    const token = await authOptions.callbacks?.jwt?.({
      token: {
        email: "reviewer@acme.com",
        name: "Reviewer"
      },
      account: {
        provider: "google"
      },
      profile: {
        email: "reviewer@acme.com",
        email_verified: true,
        name: "Reviewer"
      }
    } as never);

    expect(token?.appUserId).toBe(invitedMembership.userId);

    const memberships = await prisma.membership.findMany({
      where: {
        userId: invitedMembership.userId
      }
    });

    expect(memberships).toHaveLength(1);

    const activeWorkspace = await getActiveWorkspaceForUser(invitedMembership.userId);
    expect(activeWorkspace?.workspace.slug).toBe(owner.access.workspace.slug);
  });
});
