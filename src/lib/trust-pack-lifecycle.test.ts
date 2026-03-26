import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { completeAIProfileDraftSession, saveAIProfileDraftSession } from "@/lib/ai-profiles";
import { uploadEvidenceDocument } from "@/lib/evidence";
import { getTrustPackDetailPageData, generateCurrentTrustPackDraft } from "@/lib/trust-pack-generation";
import {
  approveVersion,
  exportVersion,
  getTrustPackApprovalReadinessByWorkspaceId,
  getTrustPackExportDownload,
  markReadyForReview,
  sendBackToDraft
} from "@/lib/trust-pack-lifecycle";
import { getWorkspaceTrustPack } from "@/lib/trust-packs";
import { addWorkspaceMember } from "@/lib/workspaces";
import { resetDatabase, seedWorkspaceOwner } from "@/test/test-helpers";

async function createEvidence(params: { userId: string; workspaceSlug: string; fileName?: string; body?: string }) {
  await uploadEvidenceDocument({
    userId: params.userId,
    workspaceSlug: params.workspaceSlug,
    fileName: params.fileName ?? "controls.txt",
    mimeType: "text/plain",
    bytes: Buffer.from(
      params.body ??
        [
          "Architecture boundary and system boundary are documented.",
          "Customer data and PII may enter the service.",
          "Support access to production follows least privilege RBAC and MFA.",
          "Encryption in transit uses TLS and encryption at rest uses managed keys.",
          "Monitoring, logging, alerts, backups, disaster recovery, code review, and vulnerability management are in place.",
          "Vendor terms document retention and model training restrictions."
        ].join(" ")
    )
  });
}

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

async function createReadyForReviewVersion(params: { userId: string; workspaceSlug: string }) {
  await createEvidence(params);
  await createCompletedAIProfile(params);
  const draft = await generateCurrentTrustPackDraft({
    userId: params.userId,
    workspaceSlug: params.workspaceSlug
  });

  const ready = await markReadyForReview({
    userId: params.userId,
    workspaceSlug: params.workspaceSlug,
    versionId: draft.versionId
  });

  return {
    draft,
    ready
  };
}

describe("trust-pack lifecycle", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("moves the current version from draft to ready for review and back to draft", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com"
    });

    const { draft, ready } = await createReadyForReviewVersion({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug
    });

    expect(ready.versionId).toBe(draft.versionId);
    expect(ready.status).toBe("READY_FOR_REVIEW");

    const backToDraft = await sendBackToDraft({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      versionId: draft.versionId
    });

    expect(backToDraft.status).toBe("DRAFT");

    const trustPack = await getWorkspaceTrustPack(owner.user.id, owner.access.workspace.slug);
    expect(trustPack?.currentVersion?.status).toBe("DRAFT");
  });

  it("blocks approval when the readiness validator finds claim-integrity problems", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com"
    });

    const { draft } = await createReadyForReviewVersion({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug
    });

    const foundClaim = await prisma.trustPackClaim.findFirst({
      where: {
        section: {
          trustPackVersionId: draft.versionId
        },
        status: "FOUND"
      },
      include: {
        citations: true
      }
    });

    expect(foundClaim).toBeTruthy();

    await prisma.citation.deleteMany({
      where: {
        claimId: foundClaim!.id
      }
    });

    const readiness = await getTrustPackApprovalReadinessByWorkspaceId(owner.access.workspace.id, draft.versionId);
    expect(readiness.eligible).toBe(false);
    expect(readiness.blockingReasons.some((reason) => reason.code === "FOUND_CITATION_REQUIRED")).toBe(true);

    await expect(
      approveVersion({
        userId: owner.user.id,
        workspaceSlug: owner.access.workspace.slug,
        versionId: draft.versionId
      })
    ).rejects.toMatchObject({
      status: 400,
      code: "TRUST_PACK_APPROVAL_BLOCKED"
    });
  });

  it("creates a single approval record for a version and exposes approval state on the review surface", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com"
    });

    const { draft } = await createReadyForReviewVersion({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug
    });

    const approval = await approveVersion({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      versionId: draft.versionId
    });

    expect(approval.status).toBe("APPROVED");

    const approvalCount = await prisma.approvalRecord.count({
      where: {
        trustPackVersionId: draft.versionId
      }
    });
    expect(approvalCount).toBe(1);

    await expect(
      approveVersion({
        userId: owner.user.id,
        workspaceSlug: owner.access.workspace.slug,
        versionId: draft.versionId
      })
    ).rejects.toMatchObject({
      status: 409,
      code: "TRUST_PACK_ALREADY_APPROVED"
    });

    const detail = await getTrustPackDetailPageData(owner.user.id, owner.access.workspace.slug);
    expect(detail.currentVersion?.status).toBe("APPROVED");
    expect(detail.currentVersion?.lifecycle.approvalRecord?.approvedBy).toBe(owner.user.email);
    expect(detail.currentVersion?.lifecycle.actions.canExport).toBe(true);
  });

  it("blocks export until the same version has been approved", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com"
    });

    const { draft } = await createReadyForReviewVersion({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug
    });

    await expect(
      exportVersion({
        userId: owner.user.id,
        workspaceSlug: owner.access.workspace.slug,
        versionId: draft.versionId
      })
    ).rejects.toMatchObject({
      status: 409,
      code: "TRUST_PACK_EXPORT_BLOCKED"
    });
  });

  it("exports the approved current version in place and creates version-specific export records", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com"
    });

    const { draft } = await createReadyForReviewVersion({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug
    });

    await approveVersion({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      versionId: draft.versionId
    });

    const firstExport = await exportVersion({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      versionId: draft.versionId
    });

    expect(firstExport.status).toBe("EXPORTED");

    const secondExport = await exportVersion({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      versionId: draft.versionId
    });

    expect(secondExport.versionId).toBe(firstExport.versionId);
    expect(secondExport.status).toBe("EXPORTED");

    const exportRecords = await prisma.exportRecord.findMany({
      where: {
        trustPackVersionId: draft.versionId
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    expect(exportRecords).toHaveLength(2);

    const trustPack = await getWorkspaceTrustPack(owner.user.id, owner.access.workspace.slug);
    expect(trustPack?.currentVersion?.id).toBe(draft.versionId);
    expect(trustPack?.currentVersion?.status).toBe("EXPORTED");
  });

  it("renders buyer-safe markdown export with citations and the evidence appendix", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com"
    });

    const { draft } = await createReadyForReviewVersion({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug
    });

    await approveVersion({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      versionId: draft.versionId
    });

    const exportResult = await exportVersion({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      versionId: draft.versionId
    });

    const download = await getTrustPackExportDownload({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      exportRecordId: exportResult.exportRecordId
    });

    expect(download.fileName).toContain("trust-pack-v1");
    expect(download.content).toContain("## Evidence Appendix");
    expect(download.content).toContain("Sources:");
    expect(download.content).not.toContain("FOUND");
    expect(download.content).not.toContain("PARTIAL");
    expect(download.content).not.toContain("NOT_FOUND");
    expect(download.content).not.toContain("Approve version");
    expect(download.content).not.toContain("Send back to draft");
  });

  it("keeps exported history immutable when newer inputs make the current version stale and regeneration creates a new draft", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com"
    });

    const { draft } = await createReadyForReviewVersion({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug
    });

    await approveVersion({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      versionId: draft.versionId
    });

    const exportResult = await exportVersion({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      versionId: draft.versionId
    });

    await createCompletedAIProfile({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug
    });

    const stalePack = await getWorkspaceTrustPack(owner.user.id, owner.access.workspace.slug);
    expect(stalePack?.currentVersion?.id).toBe(draft.versionId);
    expect(stalePack?.currentVersion?.status).toBe("STALE");

    const regenerated = await generateCurrentTrustPackDraft({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug
    });

    expect(regenerated.versionId).not.toBe(draft.versionId);
    expect(regenerated.createdFromVersionId).toBe(draft.versionId);

    const staleVersion = await prisma.trustPackVersion.findUnique({
      where: {
        id: draft.versionId
      },
      include: {
        exportRecords: true
      }
    });

    expect(staleVersion?.status).toBe("STALE");
    expect(staleVersion?.exportRecords).toHaveLength(1);
    expect(staleVersion?.exportRecords[0]?.id).toBe(exportResult.exportRecordId);
  });

  it("keeps viewers read-only for approval and export actions", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com"
    });

    await addWorkspaceMember({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      email: "viewer@acme.com",
      role: "VIEWER"
    });
    const viewer = await seedWorkspaceOwner({
      email: "viewer@acme.com"
    });

    const { draft } = await createReadyForReviewVersion({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug
    });

    await expect(
      approveVersion({
        userId: viewer.user.id,
        workspaceSlug: owner.access.workspace.slug,
        versionId: draft.versionId
      })
    ).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN"
    });

    await approveVersion({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      versionId: draft.versionId
    });

    await expect(
      exportVersion({
        userId: viewer.user.id,
        workspaceSlug: owner.access.workspace.slug,
        versionId: draft.versionId
      })
    ).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN"
    });
  });
});
