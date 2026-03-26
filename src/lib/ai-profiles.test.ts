import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import {
  completeAIProfileDraftSession,
  getActiveAIProfileDraftSession,
  getAIProfileWizardPageData,
  resolveAIProfileWizardProvenance,
  saveAIProfileDraftSession
} from "@/lib/ai-profiles";
import { addWorkspaceMember } from "@/lib/workspaces";
import { resetDatabase, seedWorkspaceOwner } from "@/test/test-helpers";

describe("AI Profile persistence", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("creates and reuses one active in-progress draft per workspace", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com"
    });

    const firstDraft = await saveAIProfileDraftSession({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      currentStepKey: "COMPANY_PRODUCT_BASICS",
      draftPayloadJson: {
        company_legal_name: "Acme, Inc."
      },
      fieldStateJson: {
        company_legal_name: "PROVIDED"
      }
    });

    const secondDraft = await saveAIProfileDraftSession({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      currentStepKey: "AI_USAGE_MODE",
      draftPayloadJson: {
        company_legal_name: "Acme, Inc.",
        ai_usage_mode: "NONE"
      },
      fieldStateJson: {
        company_legal_name: "PROVIDED",
        ai_usage_mode: "PROVIDED"
      }
    });

    expect(firstDraft).not.toBeNull();
    expect(secondDraft).not.toBeNull();
    expect(secondDraft!.id).toBe(firstDraft!.id);
    expect(secondDraft!.currentStepKey).toBe("AI_USAGE_MODE");

    const activeDraft = await getActiveAIProfileDraftSession(owner.user.id, owner.access.workspace.slug);
    expect(activeDraft?.id).toBe(firstDraft!.id);

    const inProgressCount = await prisma.aIProfileDraftSession.count({
      where: {
        workspaceId: owner.access.workspace.id,
        status: "IN_PROGRESS"
      }
    });
    expect(inProgressCount).toBe(1);
  });

  it("creates immutable AI Profile versions from completed drafts", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com"
    });

    const firstDraft = await saveAIProfileDraftSession({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
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

    const firstProfile = await completeAIProfileDraftSession({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      draftSessionId: firstDraft!.id
    });

    await saveAIProfileDraftSession({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      basedOnAIProfileId: firstProfile.id,
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

    const secondDraft = await getActiveAIProfileDraftSession(owner.user.id, owner.access.workspace.slug);
    const secondProfile = await completeAIProfileDraftSession({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      draftSessionId: secondDraft!.id
    });

    const profiles = await prisma.aIProfile.findMany({
      where: {
        workspaceId: owner.access.workspace.id
      },
      orderBy: {
        versionNumber: "asc"
      }
    });

    expect(profiles.map((profile) => profile.versionNumber)).toEqual([1, 2]);
    expect(firstProfile.versionNumber).toBe(1);
    expect(secondProfile.versionNumber).toBe(2);
    expect(profiles[0]?.aiUsageMode).toBe("NONE");
    expect(profiles[1]?.aiUsageMode).toBe("BOTH");
    expect(await getActiveAIProfileDraftSession(owner.user.id, owner.access.workspace.slug)).toBeNull();
  });

  it("hydrates the wizard page from an active draft and latest immutable profile state", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com"
    });

    const firstDraft = await saveAIProfileDraftSession({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
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

    const pageWithDraft = await getAIProfileWizardPageData(owner.user.id, owner.access.workspace.slug);
    expect(pageWithDraft.canEdit).toBe(true);
    expect(pageWithDraft.initialDraft.draftSessionId).toBe(firstDraft?.id ?? null);
    expect(pageWithDraft.initialDraft.currentStepKey).toBe("AI_USAGE_MODE");
    expect(pageWithDraft.initialDraft.draftPayloadJson.company_legal_name).toBe("Acme, Inc.");

    const firstProfile = await completeAIProfileDraftSession({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      draftSessionId: firstDraft!.id
    });

    const pageAfterCompletion = await getAIProfileWizardPageData(owner.user.id, owner.access.workspace.slug);
    expect(pageAfterCompletion.activeDraft).toBeNull();
    expect(pageAfterCompletion.latestProfile?.versionNumber).toBe(firstProfile.versionNumber);
    expect(pageAfterCompletion.initialDraft.basedOnAIProfileId).toBe(firstProfile.id);
    expect(pageAfterCompletion.initialDraft.draftPayloadJson.ai_usage_mode).toBe("NONE");
  });

  it("keeps viewers read-only while exposing the latest completed AI Profile summary", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com"
    });

    const firstDraft = await saveAIProfileDraftSession({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
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

    await completeAIProfileDraftSession({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      draftSessionId: firstDraft!.id
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

    const viewerState = await getAIProfileWizardPageData(viewer.user.id, owner.access.workspace.slug);
    expect(viewerState.canEdit).toBe(false);
    expect(viewerState.activeDraft).toBeNull();
    expect(viewerState.latestProfile?.versionNumber).toBe(1);
  });

  it("preserves workspace isolation and reviewer permissions for draft sessions", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com"
    });
    const outsider = await seedWorkspaceOwner({
      email: "outsider@beta.com"
    });

    await addWorkspaceMember({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      email: "reviewer@acme.com",
      role: "REVIEWER"
    });

    const reviewer = await seedWorkspaceOwner({
      email: "reviewer@acme.com"
    });

    const reviewerDraft = await saveAIProfileDraftSession({
      userId: reviewer.user.id,
      workspaceSlug: owner.access.workspace.slug,
      currentStepKey: "COMPANY_PRODUCT_BASICS",
      draftPayloadJson: {
        company_legal_name: "Acme, Inc."
      },
      fieldStateJson: {
        company_legal_name: "PROVIDED"
      }
    });

    expect(reviewerDraft).not.toBeNull();
    expect(reviewerDraft!.status).toBe("IN_PROGRESS");

    await expect(
      getActiveAIProfileDraftSession(outsider.user.id, owner.access.workspace.slug)
    ).rejects.toMatchObject({
      status: 404,
      code: "WORKSPACE_NOT_FOUND"
    });
  });

  it("allows UNKNOWN during drafting but requires a resolved AI usage mode at completion", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com"
    });

    const draft = await saveAIProfileDraftSession({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      currentStepKey: "AI_USAGE_MODE",
      draftPayloadJson: {
        company_legal_name: "Acme, Inc.",
        product_name: "Attestly",
        product_summary: "Security and AI trust workflow tooling",
        deployment_model: "SAAS"
      },
      fieldStateJson: {
        company_legal_name: "PROVIDED",
        product_name: "PROVIDED",
        product_summary: "PROVIDED",
        deployment_model: "PROVIDED",
        ai_usage_mode: "UNKNOWN"
      }
    });

    expect(draft?.fieldStateJson.ai_usage_mode).toBe("UNKNOWN");

    await expect(
      completeAIProfileDraftSession({
        userId: owner.user.id,
        workspaceSlug: owner.access.workspace.slug,
        draftSessionId: draft!.id
      })
    ).rejects.toMatchObject({
      status: 400,
      code: "AI_PROFILE_DRAFT_INCOMPLETE"
    });
  });

  it("resolves repeatable wizard provenance against one stable immutable item", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com"
    });

    const draft = await saveAIProfileDraftSession({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      currentStepKey: "OPEN_GAPS",
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
            use_case: "Customer-facing assistant",
            hosting_mode: "VENDOR_HOSTED",
            customer_data_sent: true
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

    const aiSystems = Array.isArray(draft?.draftPayloadJson.ai_systems) ? draft?.draftPayloadJson.ai_systems : [];
    const itemId = typeof aiSystems[0]?._itemId === "string" ? String(aiSystems[0]._itemId) : null;

    expect(itemId).toBeTruthy();

    const profile = await completeAIProfileDraftSession({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      draftSessionId: draft!.id
    });

    const provenance = await resolveAIProfileWizardProvenance({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      aiProfileId: profile.id,
      path: `ai_systems[${itemId}].provider_name`
    });

    expect(provenance.itemId).toBe(itemId);
    expect(provenance.topLevelFieldKey).toBe("ai_systems");
    expect(provenance.childFieldKey).toBe("provider_name");
    expect(provenance.value).toBe("OpenAI");
    expect(provenance.fieldState).toBe("PROVIDED");
    expect(provenance.citableInTrustPack).toBe(true);
  });

  it("blocks viewers from mutating AI Profile draft state", async () => {
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

    await expect(
      saveAIProfileDraftSession({
        userId: viewer.user.id,
        workspaceSlug: owner.access.workspace.slug,
        currentStepKey: "COMPANY_PRODUCT_BASICS",
        draftPayloadJson: {
          company_legal_name: "Acme, Inc."
        },
        fieldStateJson: {
          company_legal_name: "PROVIDED"
        }
      })
    ).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN"
    });
  });
});
