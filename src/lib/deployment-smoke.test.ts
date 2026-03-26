import { beforeEach, describe, expect, it } from "vitest";
import type { Session } from "next-auth";
import { completeAIProfileDraftSession, saveAIProfileDraftSession } from "@/lib/ai-profiles";
import { authOptions } from "@/lib/auth-config";
import { ExportFormat } from "@/lib/domain";
import { uploadEvidenceDocument } from "@/lib/evidence";
import { generateCurrentTrustPackDraft } from "@/lib/trust-pack-generation";
import {
  approveVersion,
  exportVersion,
  getTrustPackExportDownload,
  markReadyForReview
} from "@/lib/trust-pack-lifecycle";
import { getWorkspaceTrustPack } from "@/lib/trust-packs";
import { bootstrapWorkspaceForUser, getActiveWorkspaceForUser } from "@/lib/workspaces";
import { resetDatabase } from "@/test/test-helpers";

describe("deployment readiness smoke", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("runs the shipped phase-1 wedge end to end", async () => {
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

    const activeWorkspace = await getActiveWorkspaceForUser(session.user.id);
    const workspaceSlug =
      activeWorkspace?.workspace.slug ??
      (
        await bootstrapWorkspaceForUser({
          email: session.user.email,
          name: session.user.name
        })
      ).access.workspace.slug;

    const owner = {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name
      },
      workspaceSlug
    };

    await uploadEvidenceDocument({
      userId: owner.user.id,
      workspaceSlug: owner.workspaceSlug,
      fileName: "security-overview.txt",
      mimeType: "text/plain",
      bytes: Buffer.from(
        "Encryption at rest, audit logging, least privilege controls, backups, and AI safeguards are documented here."
      )
    });

    const draft = await saveAIProfileDraftSession({
      userId: owner.user.id,
      workspaceSlug: owner.workspaceSlug,
      currentStepKey: "AI_USAGE_MODE",
      draftPayloadJson: {
        company_legal_name: "Acme, Inc.",
        product_name: "Attestly",
        product_summary: "Trust Pack generation for B2B SaaS vendors using AI.",
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

    await completeAIProfileDraftSession({
      userId: owner.user.id,
      workspaceSlug: owner.workspaceSlug,
      draftSessionId: draft!.id
    });

    const generated = await generateCurrentTrustPackDraft({
      userId: owner.user.id,
      workspaceSlug: owner.workspaceSlug
    });

    expect(generated.status).toBe("DRAFT");

    await markReadyForReview({
      userId: owner.user.id,
      workspaceSlug: owner.workspaceSlug,
      versionId: generated.versionId
    });

    const approval = await approveVersion({
      userId: owner.user.id,
      workspaceSlug: owner.workspaceSlug,
      versionId: generated.versionId
    });

    expect(approval.status).toBe("APPROVED");

    const exportResult = await exportVersion({
      userId: owner.user.id,
      workspaceSlug: owner.workspaceSlug,
      versionId: generated.versionId,
      format: ExportFormat.MARKDOWN
    });

    expect(exportResult.status).toBe("EXPORTED");

    const download = await getTrustPackExportDownload({
      userId: owner.user.id,
      workspaceSlug: owner.workspaceSlug,
      exportRecordId: exportResult.exportRecordId
    });

    expect(download.mimeType.startsWith("text/markdown")).toBe(true);
    expect(download.fileName.endsWith(".md")).toBe(true);
    expect(download.content).toContain("Evidence Appendix");
    expect(download.content).toContain("Security Baseline");

    const trustPack = await getWorkspaceTrustPack(owner.user.id, owner.workspaceSlug);
    expect(trustPack?.currentVersion?.id).toBe(generated.versionId);
    expect(trustPack?.currentVersion?.status).toBe("EXPORTED");
  });
});
