import { beforeEach, describe, expect, it } from "vitest";
import { completeAIProfileDraftSession, saveAIProfileDraftSession } from "@/lib/ai-profiles";
import { uploadEvidenceDocument } from "@/lib/evidence";
import { getHomeState } from "@/lib/home";
import { createTrustPackVersionRecord } from "@/lib/trust-packs";
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

describe("home state", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("resolves an empty workspace to an evidence-first next action", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com"
    });

    const state = await getHomeState(owner.user.id, owner.access.workspace.slug);
    expect(state.dominantAction.label).toBe("Upload evidence");
    expect(state.evidence.totalDocuments).toBe(0);
    expect(state.aiProfileStatus.label).toBe("Not started");
    expect(state.trustPackStatus.label).toBe("Not created");
  });

  it("routes evidence-present workspaces into AI Profile completion", async () => {
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

    const state = await getHomeState(owner.user.id, owner.access.workspace.slug);
    expect(state.dominantAction.label).toBe("Complete AI profile");
    expect(state.evidence.citationReadyDocuments).toBe(1);
    expect(state.aiProfileStatus.label).toBe("Not started");
  });

  it("shows readiness when inputs are complete but no trust-pack version exists yet", async () => {
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
      workspaceSlug: owner.access.workspace.slug,
      aiUsageMode: "NONE"
    });

    const state = await getHomeState(owner.user.id, owner.access.workspace.slug);
    expect(state.aiProfileStatus.label).toBe("Completed");
    expect(state.trustPackStatus.label).toBe("Ready for first version");
    expect(state.dominantAction.label).toBe("Generate trust pack");
    expect(state.dominantAction.kind).toBe("generate");
  });

  it("shows the current trust-pack shell when a current version exists", async () => {
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
      workspaceSlug: owner.access.workspace.slug,
      aiUsageMode: "NONE"
    });

    await createTrustPackVersionRecord({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      aiProfileId: aiProfile.id
    });

    const state = await getHomeState(owner.user.id, owner.access.workspace.slug);
    expect(state.trustPackStatus.label).toBe("Current version");
    expect(state.trustPackStatus.currentVersionStatus).toBe("DRAFT");
    expect(state.dominantAction.label).toBe("Open trust pack");
  });

  it("surfaces stale current trust-pack state after a new AI Profile version is completed", async () => {
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
      workspaceSlug: owner.access.workspace.slug,
      aiUsageMode: "NONE"
    });

    await createTrustPackVersionRecord({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      aiProfileId: aiProfile.id
    });

    await createCompletedAIProfile({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      aiUsageMode: "BOTH"
    });

    const state = await getHomeState(owner.user.id, owner.access.workspace.slug);
    expect(state.aiProfileStatus.label).toBe("Completed");
    expect(state.trustPackStatus.label).toBe("Stale");
    expect(state.dominantAction.label).toBe("Regenerate new version");
    expect(state.dominantAction.kind).toBe("regenerate");
  });
});
