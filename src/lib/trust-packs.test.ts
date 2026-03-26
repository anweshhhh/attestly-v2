import { beforeEach, describe, expect, it } from "vitest";
import { uploadEvidenceDocument } from "@/lib/evidence";
import { completeAIProfileDraftSession, saveAIProfileDraftSession } from "@/lib/ai-profiles";
import { prisma } from "@/lib/prisma";
import {
  createTrustPackVersionRecord,
  ensureWorkspaceTrustPack,
  getWorkspaceTrustPack,
  getTrustPackReadinessSummary
} from "@/lib/trust-packs";
import { resetDatabase, seedWorkspaceOwner } from "@/test/test-helpers";

const staleablePackStatuses = ["DRAFT", "READY_FOR_REVIEW", "APPROVED", "EXPORTED"] as const;

async function createCompletedAIProfile(params: { userId: string; workspaceSlug: string }) {
  const draft = await saveAIProfileDraftSession({
    userId: params.userId,
    workspaceSlug: params.workspaceSlug,
    currentStepKey: "AI_USAGE_MODE",
    draftPayloadJson: {
      company_legal_name: "Acme, Inc.",
      product_name: "Attestly",
      product_summary: "Security and AI trust workflow tooling",
      deployment_model: "SAAS",
      ai_usage_mode: "NONE"
    },
    fieldStateJson: {
      company_legal_name: "PROVIDED",
      product_name: "PROVIDED",
      product_summary: "PROVIDED",
      deployment_model: "PROVIDED",
      ai_usage_mode: "PROVIDED"
    }
  });

  return completeAIProfileDraftSession({
    userId: params.userId,
    workspaceSlug: params.workspaceSlug,
    draftSessionId: draft!.id
  });
}

describe("Trust Pack persistence", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("enforces one logical Trust Pack container per workspace", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com"
    });

    const firstPack = await ensureWorkspaceTrustPack(owner.user.id, owner.access.workspace.slug);
    const secondPack = await ensureWorkspaceTrustPack(owner.user.id, owner.access.workspace.slug);

    expect(secondPack.id).toBe(firstPack.id);

    const packCount = await prisma.trustPack.count({
      where: {
        workspaceId: owner.access.workspace.id
      }
    });
    expect(packCount).toBe(1);
  });

  it("creates Trust Pack versions with version-owned lifecycle state and currentVersion pointer", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com"
    });

    await uploadEvidenceDocument({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      fileName: "controls.txt",
      mimeType: "text/plain",
      bytes: Buffer.from("Encryption, logging, backups, and least privilege.")
    });

    const aiProfile = await createCompletedAIProfile({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug
    });

    const firstVersion = await createTrustPackVersionRecord({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      aiProfileId: aiProfile.id
    });

    const secondVersion = await createTrustPackVersionRecord({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      aiProfileId: aiProfile.id,
      status: "READY_FOR_REVIEW",
      createdFromVersionId: firstVersion.version.id,
      generationInputHash: "hash-v2"
    });

    expect(firstVersion.version.status).toBe("DRAFT");
    expect(firstVersion.version.versionNumber).toBe(1);
    expect(secondVersion.version.status).toBe("READY_FOR_REVIEW");
    expect(secondVersion.version.versionNumber).toBe(2);
    expect(secondVersion.trustPack.currentVersionId).toBe(secondVersion.version.id);

    const pack = await getWorkspaceTrustPack(owner.user.id, owner.access.workspace.slug);
    expect(pack?.currentVersion?.id).toBe(secondVersion.version.id);
    expect(pack?.currentVersion?.status).toBe("READY_FOR_REVIEW");
  });

  it("requires completed AI Profile and citation-ready evidence before creating a Trust Pack version", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com"
    });

    const aiProfile = await createCompletedAIProfile({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug
    });

    await expect(
      createTrustPackVersionRecord({
        userId: owner.user.id,
        workspaceSlug: owner.access.workspace.slug,
        aiProfileId: aiProfile.id
      })
    ).rejects.toMatchObject({
      status: 400,
      code: "TRUST_PACK_EVIDENCE_REQUIRED"
    });

    const readiness = await getTrustPackReadinessSummary(owner.access.workspace.id);
    expect(readiness.hasCompletedAIProfile).toBe(true);
    expect(readiness.canCreateDraftVersion).toBe(false);
  });

  it("preserves workspace isolation for Trust Pack entities", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com"
    });
    const outsider = await seedWorkspaceOwner({
      email: "outsider@beta.com"
    });

    await uploadEvidenceDocument({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      fileName: "controls.txt",
      mimeType: "text/plain",
      bytes: Buffer.from("Encryption, logging, backups, and least privilege.")
    });

    const aiProfile = await createCompletedAIProfile({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug
    });

    await createTrustPackVersionRecord({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      aiProfileId: aiProfile.id
    });

    await expect(getWorkspaceTrustPack(outsider.user.id, owner.access.workspace.slug)).rejects.toMatchObject({
      status: 404,
      code: "WORKSPACE_NOT_FOUND"
    });
  });

  for (const initialStatus of staleablePackStatuses) {
    it(`marks only the current ${initialStatus} version stale when a new AI Profile version is completed`, async () => {
      const owner = await seedWorkspaceOwner({
        email: "owner@acme.com"
      });

      await uploadEvidenceDocument({
        userId: owner.user.id,
        workspaceSlug: owner.access.workspace.slug,
        fileName: "controls.txt",
        mimeType: "text/plain",
        bytes: Buffer.from("Encryption, logging, backups, and least privilege.")
      });

      const aiProfile = await createCompletedAIProfile({
        userId: owner.user.id,
        workspaceSlug: owner.access.workspace.slug
      });

      const historicalVersion = await createTrustPackVersionRecord({
        userId: owner.user.id,
        workspaceSlug: owner.access.workspace.slug,
        aiProfileId: aiProfile.id,
        status: "DRAFT"
      });

      const currentVersion = await createTrustPackVersionRecord({
        userId: owner.user.id,
        workspaceSlug: owner.access.workspace.slug,
        aiProfileId: aiProfile.id,
        status: initialStatus,
        createdFromVersionId: historicalVersion.version.id
      });

      const nextDraft = await saveAIProfileDraftSession({
        userId: owner.user.id,
        workspaceSlug: owner.access.workspace.slug,
        basedOnAIProfileId: aiProfile.id,
        currentStepKey: "AI_USAGE_MODE",
        draftPayloadJson: {
          company_legal_name: "Acme, Inc.",
          product_name: "Attestly",
          product_summary: "Security and AI trust workflow tooling",
          deployment_model: "SAAS",
          ai_usage_mode: "BOTH",
          ai_systems: [
            {
              provider_name: "OpenAI",
              model_or_service: "GPT-5",
              use_case: "Internal trust workflow assistance",
              hosting_mode: "VENDOR_HOSTED",
              customer_data_sent: false
            }
          ],
          ai_training_usage: "NO"
        },
        fieldStateJson: {
          company_legal_name: "PROVIDED",
          product_name: "PROVIDED",
          product_summary: "PROVIDED",
          deployment_model: "PROVIDED",
          ai_usage_mode: "PROVIDED",
          ai_systems: [
            {
              provider_name: "PROVIDED",
              model_or_service: "PROVIDED",
              use_case: "PROVIDED",
              hosting_mode: "PROVIDED",
              customer_data_sent: "PROVIDED"
            }
          ],
          ai_training_usage: "PROVIDED"
        }
      });

      await completeAIProfileDraftSession({
        userId: owner.user.id,
        workspaceSlug: owner.access.workspace.slug,
        draftSessionId: nextDraft!.id
      });

      const trustPack = await prisma.trustPack.findUnique({
        where: {
          workspaceId: owner.access.workspace.id
        }
      });
      const versions = await prisma.trustPackVersion.findMany({
        where: {
          trustPackId: trustPack!.id
        },
        orderBy: {
          versionNumber: "asc"
        }
      });

      expect(trustPack?.currentVersionId).toBe(currentVersion.version.id);
      expect(versions.find((version) => version.id === historicalVersion.version.id)?.status).toBe("DRAFT");
      expect(versions.find((version) => version.id === currentVersion.version.id)?.status).toBe("STALE");
      expect(versions).toHaveLength(2);
    });
  }

  it("keeps the stale current version pinned until explicit regeneration creates a new draft version", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com"
    });

    await uploadEvidenceDocument({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      fileName: "controls.txt",
      mimeType: "text/plain",
      bytes: Buffer.from("Encryption, logging, backups, and least privilege.")
    });

    const aiProfile = await createCompletedAIProfile({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug
    });

    const historicalVersion = await createTrustPackVersionRecord({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      aiProfileId: aiProfile.id,
      status: "DRAFT"
    });

    const currentVersion = await createTrustPackVersionRecord({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      aiProfileId: aiProfile.id,
      status: "READY_FOR_REVIEW",
      createdFromVersionId: historicalVersion.version.id
    });

    await uploadEvidenceDocument({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      fileName: "fresh-controls.txt",
      mimeType: "text/plain",
      bytes: Buffer.from("New evidence should stale only the current version.")
    });

    const trustPackBeforeRegeneration = await prisma.trustPack.findUnique({
      where: {
        workspaceId: owner.access.workspace.id
      }
    });
    const versionsWhileStale = await prisma.trustPackVersion.findMany({
      where: {
        trustPackId: trustPackBeforeRegeneration!.id
      },
      orderBy: {
        versionNumber: "asc"
      }
    });

    expect(trustPackBeforeRegeneration?.currentVersionId).toBe(currentVersion.version.id);
    expect(versionsWhileStale.find((version) => version.id === historicalVersion.version.id)?.status).toBe("DRAFT");
    expect(versionsWhileStale.find((version) => version.id === currentVersion.version.id)?.status).toBe("STALE");

    const regeneratedVersion = await createTrustPackVersionRecord({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      aiProfileId: aiProfile.id,
      createdFromVersionId: currentVersion.version.id
    });

    const trustPackAfterRegeneration = await prisma.trustPack.findUnique({
      where: {
        workspaceId: owner.access.workspace.id
      }
    });
    const versionsAfterRegeneration = await prisma.trustPackVersion.findMany({
      where: {
        trustPackId: trustPackAfterRegeneration!.id
      },
      orderBy: {
        versionNumber: "asc"
      }
    });

    expect(regeneratedVersion.version.id).not.toBe(currentVersion.version.id);
    expect(regeneratedVersion.version.versionNumber).toBe(3);
    expect(regeneratedVersion.version.createdFromVersionId).toBe(currentVersion.version.id);
    expect(regeneratedVersion.version.status).toBe("DRAFT");
    expect(trustPackAfterRegeneration?.currentVersionId).toBe(regeneratedVersion.version.id);
    expect(versionsAfterRegeneration.find((version) => version.id === historicalVersion.version.id)?.status).toBe("DRAFT");
    expect(versionsAfterRegeneration.find((version) => version.id === currentVersion.version.id)?.status).toBe("STALE");
    expect(versionsAfterRegeneration.find((version) => version.id === regeneratedVersion.version.id)?.status).toBe("DRAFT");
  });
});
