import { beforeEach, describe, expect, it } from "vitest";
import { completeAIProfileDraftSession, saveAIProfileDraftSession } from "@/lib/ai-profiles";
import { uploadEvidenceDocument } from "@/lib/evidence";
import {
  TrustPackGenerationReadinessState,
  createTrustPackVersionRecord,
  getTrustPackGenerationReadiness
} from "@/lib/trust-packs";
import { resetDatabase, seedWorkspaceOwner } from "@/test/test-helpers";

async function createCompletedAIProfile(params: { userId: string; workspaceSlug: string; aiUsageMode?: "NONE" | "BOTH" }) {
  const aiUsageMode = params.aiUsageMode ?? "NONE";
  const draft = await saveAIProfileDraftSession({
    userId: params.userId,
    workspaceSlug: params.workspaceSlug,
    currentStepKey: "AI_USAGE_MODE",
    draftPayloadJson: {
      company_legal_name: "Acme, Inc.",
      product_name: "Attestly",
      product_summary: "Security and AI trust workflow tooling",
      deployment_model: "SAAS",
      ai_usage_mode: aiUsageMode,
      ...(aiUsageMode === "NONE"
        ? {}
        : {
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
          })
    },
    fieldStateJson: {
      company_legal_name: "PROVIDED",
      product_name: "PROVIDED",
      product_summary: "PROVIDED",
      deployment_model: "PROVIDED",
      ai_usage_mode: "PROVIDED",
      ...(aiUsageMode === "NONE"
        ? {}
        : {
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
          })
    }
  });

  return completeAIProfileDraftSession({
    userId: params.userId,
    workspaceSlug: params.workspaceSlug,
    draftSessionId: draft!.id
  });
}

describe("trust-pack generation readiness", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("reports missing evidence when the workspace has no active evidence documents", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com"
    });

    const readiness = await getTrustPackGenerationReadiness(owner.user.id, owner.access.workspace.slug);
    expect(readiness.state).toBe(TrustPackGenerationReadinessState.NEEDS_EVIDENCE);
    expect(readiness.canGenerateInitialDraft).toBe(false);
  });

  it("reports citation-readiness gaps when evidence exists but processing did not produce usable chunks", async () => {
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

    const readiness = await getTrustPackGenerationReadiness(owner.user.id, owner.access.workspace.slug);
    expect(readiness.state).toBe(TrustPackGenerationReadinessState.NEEDS_CITATION_READY_EVIDENCE);
    expect(readiness.evidence.totalActiveDocuments).toBe(1);
    expect(readiness.evidence.citationReadyDocuments).toBe(0);
  });

  it("reports missing AI Profile when citation-usable evidence is ready", async () => {
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

    const readiness = await getTrustPackGenerationReadiness(owner.user.id, owner.access.workspace.slug);
    expect(readiness.state).toBe(TrustPackGenerationReadinessState.NEEDS_AI_PROFILE);
    expect(readiness.canGenerateInitialDraft).toBe(false);
  });

  it("reports ready-for-initial-generation when evidence and AI Profile inputs are complete", async () => {
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

    await createCompletedAIProfile({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug
    });

    const readiness = await getTrustPackGenerationReadiness(owner.user.id, owner.access.workspace.slug);
    expect(readiness.state).toBe(TrustPackGenerationReadinessState.READY_FOR_INITIAL_GENERATION);
    expect(readiness.canGenerateInitialDraft).toBe(true);
  });

  const mappedStatuses = [
    { packStatus: "DRAFT", readinessState: TrustPackGenerationReadinessState.CURRENT_VERSION_DRAFT },
    { packStatus: "READY_FOR_REVIEW", readinessState: TrustPackGenerationReadinessState.CURRENT_VERSION_READY_FOR_REVIEW },
    { packStatus: "APPROVED", readinessState: TrustPackGenerationReadinessState.CURRENT_VERSION_APPROVED },
    { packStatus: "EXPORTED", readinessState: TrustPackGenerationReadinessState.CURRENT_VERSION_EXPORTED }
  ] as const;

  for (const { packStatus, readinessState } of mappedStatuses) {
    it(`reports ${readinessState} when the current version status is ${packStatus}`, async () => {
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
        aiProfileId: aiProfile.id,
        status: packStatus
      });

      const readiness = await getTrustPackGenerationReadiness(owner.user.id, owner.access.workspace.slug);
      expect(readiness.state).toBe(readinessState);
      expect(readiness.trustPack.currentVersion?.status).toBe(packStatus);
      expect(readiness.canGenerateInitialDraft).toBe(false);
    });
  }

  it("reports stale when the current version has been invalidated by newer inputs", async () => {
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
      aiProfileId: aiProfile.id,
      status: "APPROVED"
    });

    await createCompletedAIProfile({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      aiUsageMode: "BOTH"
    });

    const readiness = await getTrustPackGenerationReadiness(owner.user.id, owner.access.workspace.slug);
    expect(readiness.state).toBe(TrustPackGenerationReadinessState.CURRENT_VERSION_STALE);
    expect(readiness.trustPack.currentVersion?.status).toBe("STALE");
    expect(readiness.canRegenerateStaleVersion).toBe(true);
  });
});
