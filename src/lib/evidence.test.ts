import { beforeEach, describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { buildEvidenceBlobPath } from "@/lib/evidence-paths";
import {
  archiveEvidenceDocument,
  finalizeEvidenceBlobUpload,
  listEvidenceDocuments,
  retryEvidenceDocument,
  uploadEvidenceDocument
} from "@/lib/evidence";
import { completeAIProfileDraftSession, saveAIProfileDraftSession } from "@/lib/ai-profiles";
import { createTrustPackVersionRecord, getWorkspaceTrustPack } from "@/lib/trust-packs";
import { putStoredEvidenceObject } from "@/lib/storage";
import { addWorkspaceMember } from "@/lib/workspaces";
import { resetDatabase, seedWorkspaceOwner } from "@/test/test-helpers";

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

describe("evidence flows", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("uploads evidence into the current workspace and exposes citation-ready status", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com"
    });

    const uploaded = await uploadEvidenceDocument({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      fileName: "security-overview.txt",
      mimeType: "text/plain",
      bytes: Buffer.from("Security overview with encryption, backups, and least privilege controls.")
    });

    const listing = await listEvidenceDocuments(owner.user.id, owner.access.workspace.slug);
    expect(listing.documents).toHaveLength(1);
    expect(listing.documents[0]?.status).toBe("CHUNKED");
    expect(listing.documents[0]?.chunkCount).toBeGreaterThan(0);
    expect(listing.readiness.citationReadyDocuments).toBe(1);
    expect(uploaded.storagePath).toContain(`workspaces/${owner.access.workspace.id}/evidence/`);
    expect(uploaded.storagePath.startsWith("/")).toBe(false);
  });

  it("blocks cross-workspace evidence visibility", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com"
    });
    const outsider = await seedWorkspaceOwner({
      email: "outsider@beta.com"
    });

    await uploadEvidenceDocument({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      fileName: "architecture.md",
      mimeType: "text/markdown",
      bytes: Buffer.from("# Architecture\nPrivate VPC and audit logging")
    });

    await expect(listEvidenceDocuments(outsider.user.id, owner.access.workspace.slug)).rejects.toMatchObject({
      status: 404,
      code: "WORKSPACE_NOT_FOUND"
    });
  });

  it("lets reviewers upload evidence but keeps viewers read-only", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com"
    });

    await addWorkspaceMember({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      email: "reviewer@acme.com",
      role: "REVIEWER"
    });

    await addWorkspaceMember({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      email: "viewer@acme.com",
      role: "VIEWER"
    });

    const reviewer = await seedWorkspaceOwner({
      email: "reviewer@acme.com"
    });
    const viewer = await seedWorkspaceOwner({
      email: "viewer@acme.com"
    });

    await uploadEvidenceDocument({
      userId: reviewer.user.id,
      workspaceSlug: owner.access.workspace.slug,
      fileName: "reviewer-evidence.txt",
      mimeType: "text/plain",
      bytes: Buffer.from("Reviewer supplied trust evidence.")
    });

    await expect(
      uploadEvidenceDocument({
        userId: viewer.user.id,
        workspaceSlug: owner.access.workspace.slug,
        fileName: "viewer-evidence.txt",
        mimeType: "text/plain",
        bytes: Buffer.from("Viewer should not upload.")
      })
    ).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN"
    });
  });

  it("supports retry and archive within the same workspace", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com"
    });

    await uploadEvidenceDocument({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      fileName: "binary.bin",
      mimeType: "application/octet-stream",
      bytes: Buffer.from([0, 1, 2, 3, 4])
    }).catch(() => undefined);

    const initialListing = await listEvidenceDocuments(owner.user.id, owner.access.workspace.slug);
    const doc = initialListing.documents[0];
    expect(doc?.status).toBe("ERROR");

    await retryEvidenceDocument({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      documentId: doc!.id
    }).catch(() => undefined);

    await archiveEvidenceDocument({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      documentId: doc!.id
    });

    const finalListing = await listEvidenceDocuments(owner.user.id, owner.access.workspace.slug);
    expect(finalListing.documents[0]?.status).toBe("ARCHIVED");
  });

  it("marks the current Trust Pack version stale when evidence changes", async () => {
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

    await createTrustPackVersionRecord({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      aiProfileId: aiProfile.id
    });

    await uploadEvidenceDocument({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      fileName: "new-controls.txt",
      mimeType: "text/plain",
      bytes: Buffer.from("Newer evidence for stale detection.")
    });

    const trustPack = await getWorkspaceTrustPack(owner.user.id, owner.access.workspace.slug);
    expect(trustPack?.currentVersion?.status).toBe("STALE");
  });

  it("finalizes Blob-backed uploads into workspace-scoped evidence documents", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com"
    });

    const pathname = buildEvidenceBlobPath({
      workspaceId: owner.access.workspace.id,
      uploadId: "upload-1",
      fileName: "blob-security.txt"
    });

    await putStoredEvidenceObject({
      pathname,
      bytes: Buffer.from("Blob-backed evidence upload with encryption and monitoring controls."),
      contentType: "text/plain"
    });

    const document = await finalizeEvidenceBlobUpload({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      fileName: "blob-security.txt",
      mimeType: "text/plain",
      storagePath: pathname
    });

    expect(document.storagePath).toBe(pathname);
    expect(document.status).toBe("CHUNKED");
    expect(document.chunkCount).toBeGreaterThan(0);
  });

  it("blocks finalizing a Blob upload outside the active workspace", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com"
    });
    const outsider = await seedWorkspaceOwner({
      email: "outsider@beta.com"
    });

    const outsiderPath = buildEvidenceBlobPath({
      workspaceId: outsider.access.workspace.id,
      uploadId: "upload-2",
      fileName: "outsider-evidence.txt"
    });

    await putStoredEvidenceObject({
      pathname: outsiderPath,
      bytes: Buffer.from("Cross-workspace evidence path should be rejected."),
      contentType: "text/plain"
    });

    await expect(
      finalizeEvidenceBlobUpload({
        userId: owner.user.id,
        workspaceSlug: owner.access.workspace.slug,
        fileName: "outsider-evidence.txt",
        mimeType: "text/plain",
        storagePath: outsiderPath
      })
    ).rejects.toBeInstanceOf(AppError);
  });
});
