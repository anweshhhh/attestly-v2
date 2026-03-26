import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { completeAIProfileDraftSession, saveAIProfileDraftSession } from "@/lib/ai-profiles";
import { uploadEvidenceDocument } from "@/lib/evidence";
import { generateCurrentTrustPackDraft, getTrustPackDetailPageData } from "@/lib/trust-pack-generation";
import { getWorkspaceTrustPack } from "@/lib/trust-packs";
import { trustPackClaimCatalog, trustPackSectionCatalog } from "@/lib/trust-pack-catalog";
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
          "Feature flags and rollout permissions gate AI releases.",
          "Vendor terms document retention and model training restrictions."
        ].join(" ")
    )
  });
}

async function createCompletedAIProfile(params: {
  userId: string;
  workspaceSlug: string;
  aiUsageMode?: "NONE" | "BOTH";
}) {
  const aiUsageMode = params.aiUsageMode ?? "BOTH";
  const draft = await saveAIProfileDraftSession({
    userId: params.userId,
    workspaceSlug: params.workspaceSlug,
    currentStepKey: "OPEN_GAPS",
    draftPayloadJson: {
      company_legal_name: "Acme, Inc.",
      product_name: "Attestly",
      product_summary: "Security and AI trust workflow tooling",
      deployment_model: "SAAS",
      ai_usage_mode: aiUsageMode,
      ...(aiUsageMode === "NONE"
        ? {}
        : {
            ai_usage_summary: "AI assists with customer-facing trust responses.",
            ai_systems: [
              {
                provider_name: "OpenAI",
                use_case: "Customer-facing trust response drafting",
                hosting_mode: "VENDOR_HOSTED",
                customer_data_sent: true
              }
            ],
            ai_data_categories: ["PROMPTS", "DOCUMENTS"],
            ai_customer_content_in_scope: true,
            ai_training_usage: "NO",
            ai_retention_posture: "Prompts are retained briefly and then deleted.",
            ai_human_review_exists: true,
            ai_access_controls: "AI features are gated by role-based access and release controls.",
            ai_monitoring_and_logging: "AI usage is logged and monitored for misuse.",
            ai_fallback_behavior: "Users can fall back to manual workflows if AI output is weak."
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
            ai_usage_summary: "PROVIDED",
            ai_systems: [
              {
                provider_name: "PROVIDED",
                model_or_service: "UNKNOWN",
                use_case: "PROVIDED",
                hosting_mode: "PROVIDED",
                customer_data_sent: "PROVIDED"
              }
            ],
            ai_data_categories: "PROVIDED",
            ai_customer_content_in_scope: "PROVIDED",
            ai_training_usage: "PROVIDED",
            ai_retention_posture: "PROVIDED",
            ai_human_review_exists: "PROVIDED",
            ai_human_review_description: "UNKNOWN",
            ai_access_controls: "PROVIDED",
            ai_monitoring_and_logging: "PROVIDED",
            ai_evaluation_or_qa: "UNKNOWN",
            ai_fallback_behavior: "PROVIDED",
            ai_incident_escalation: "UNKNOWN"
          })
    }
  });

  return completeAIProfileDraftSession({
    userId: params.userId,
    workspaceSlug: params.workspaceSlug,
    draftSessionId: draft!.id
  });
}

describe("trust-pack generation", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("blocks generation when no completed AI Profile exists", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com"
    });

    await createEvidence({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug
    });

    await expect(
      generateCurrentTrustPackDraft({
        userId: owner.user.id,
        workspaceSlug: owner.access.workspace.slug
      })
    ).rejects.toMatchObject({
      status: 400,
      code: "TRUST_PACK_GENERATION_NOT_READY"
    });
  });

  it("blocks generation when no citation-usable evidence exists", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com"
    });

    await createCompletedAIProfile({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug
    });

    await expect(
      generateCurrentTrustPackDraft({
        userId: owner.user.id,
        workspaceSlug: owner.access.workspace.slug
      })
    ).rejects.toMatchObject({
      status: 400,
      code: "TRUST_PACK_GENERATION_NOT_READY"
    });
  });

  it("creates the first DRAFT version with catalog-aligned sections, claims, and citations", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com"
    });

    await createEvidence({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug
    });
    const aiProfile = await createCompletedAIProfile({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug
    });

    const result = await generateCurrentTrustPackDraft({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug
    });

    expect(result.status).toBe("DRAFT");
    expect(result.versionNumber).toBe(1);
    expect(result.createdFromVersionId).toBeNull();

    const trustPack = await getWorkspaceTrustPack(owner.user.id, owner.access.workspace.slug);
    expect(trustPack?.currentVersion?.id).toBe(result.versionId);
    expect(trustPack?.currentVersion?.status).toBe("DRAFT");
    expect(trustPack?.currentVersion?.aiProfile.id).toBe(aiProfile.id);

    const version = await prisma.trustPackVersion.findUnique({
      where: {
        id: result.versionId
      },
      include: {
        sections: {
          orderBy: {
            orderIndex: "asc"
          },
          include: {
            claims: {
              orderBy: {
                orderIndex: "asc"
              },
              include: {
                citations: {
                  orderBy: {
                    orderIndex: "asc"
                  }
                }
              }
            }
          }
        }
      }
    });

    const sectionKeys = version?.sections.map((section) => section.key);
    const claimKeys = version?.sections.flatMap((section) => section.claims.map((claim) => claim.key));

    expect(sectionKeys).toEqual(trustPackSectionCatalog.map((section) => section.key));
    expect(claimKeys).toEqual(trustPackClaimCatalog.map((claim) => claim.key));
    expect(version?.generationInputHash).toBeTruthy();

    for (const claim of version?.sections.flatMap((section) => section.claims) ?? []) {
      expect(["FOUND", "PARTIAL", "NOT_FOUND"]).toContain(claim.status);

      if (claim.status === "FOUND") {
        expect(claim.citations.length).toBeGreaterThan(0);
      }

      if (claim.status === "PARTIAL") {
        expect(claim.citations.length).toBeGreaterThan(0);
        expect(claim.missingDetailsText).toBeTruthy();
      }

      if (claim.status === "NOT_FOUND") {
        expect(claim.citations).toHaveLength(0);
      }
    }
  });

  it("persists exact document and wizard provenance, including repeatable wizard item paths", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com"
    });

    await createEvidence({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug
    });
    await createCompletedAIProfile({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug
    });

    const result = await generateCurrentTrustPackDraft({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug
    });

    const citations = await prisma.citation.findMany({
      where: {
        claim: {
          section: {
            trustPackVersionId: result.versionId
          }
        }
      },
      include: {
        sourceDocument: true,
        sourceChunk: true,
        sourceAIProfile: true
      }
    });

    const documentCitation = citations.find((citation) => citation.sourceType === "DOCUMENT");
    const wizardCitation = citations.find(
      (citation) =>
        citation.sourceType === "WIZARD_ATTESTATION" && citation.sourceFieldPath?.startsWith("ai_systems[")
    );

    expect(documentCitation?.sourceDocument?.workspaceId).toBe(owner.access.workspace.id);
    expect(documentCitation?.sourceChunk?.documentId).toBe(documentCitation?.sourceDocumentId);
    expect(documentCitation?.locator).toContain("chunk");

    expect(wizardCitation?.sourceAIProfile?.workspaceId).toBe(owner.access.workspace.id);
    expect(wizardCitation?.sourceFieldPath).toMatch(/^ai_systems\[[A-Za-z0-9-]+\]\.(provider_name|use_case|customer_data_sent)$/);
    expect(wizardCitation?.quotedSnippet).toBeTruthy();
  });

  it("exposes the current-version detail model without pack-list semantics", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com"
    });

    await createEvidence({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug
    });
    await createCompletedAIProfile({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug
    });

    const beforeGeneration = await getTrustPackDetailPageData(owner.user.id, owner.access.workspace.slug);
    expect(beforeGeneration.currentVersion).toBeNull();
    expect(beforeGeneration.canGenerateInitial).toBe(true);

    await generateCurrentTrustPackDraft({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug
    });

    const afterGeneration = await getTrustPackDetailPageData(owner.user.id, owner.access.workspace.slug);
    expect(afterGeneration.currentVersion?.status).toBe("DRAFT");
    expect(afterGeneration.currentVersion?.sections).toHaveLength(trustPackSectionCatalog.length);
    expect(afterGeneration.currentVersion?.summary.totalCitations).toBeGreaterThan(0);
  });

  it("keeps viewers read-only for both initial generation and stale regeneration", async () => {
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

    await createEvidence({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug
    });
    await createCompletedAIProfile({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug
    });

    await expect(
      generateCurrentTrustPackDraft({
        userId: viewer.user.id,
        workspaceSlug: owner.access.workspace.slug
      })
    ).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN"
    });

    await generateCurrentTrustPackDraft({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug
    });
    await createCompletedAIProfile({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug
    });

    await expect(
      generateCurrentTrustPackDraft({
        userId: viewer.user.id,
        workspaceSlug: owner.access.workspace.slug
      })
    ).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN"
    });
  });

  it("keeps the stale current version pinned until explicit regeneration creates a new draft version", async () => {
    const owner = await seedWorkspaceOwner({
      email: "owner@acme.com"
    });

    await createEvidence({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug
    });
    const firstProfile = await createCompletedAIProfile({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug
    });

    const firstGeneration = await generateCurrentTrustPackDraft({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug
    });

    await createEvidence({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      fileName: "fresh-evidence.txt",
      body: "Fresh trust evidence should make only the current version stale."
    });

    const staleTrustPack = await getWorkspaceTrustPack(owner.user.id, owner.access.workspace.slug);
    expect(staleTrustPack?.currentVersion?.id).toBe(firstGeneration.versionId);
    expect(staleTrustPack?.currentVersion?.status).toBe("STALE");

    const secondProfileDraft = await saveAIProfileDraftSession({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug,
      basedOnAIProfileId: firstProfile.id,
      currentStepKey: "OPEN_GAPS",
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
      draftSessionId: secondProfileDraft!.id
    });

    const stillStaleTrustPack = await getWorkspaceTrustPack(owner.user.id, owner.access.workspace.slug);
    expect(stillStaleTrustPack?.currentVersion?.id).toBe(firstGeneration.versionId);
    expect(stillStaleTrustPack?.currentVersion?.status).toBe("STALE");

    const regenerated = await generateCurrentTrustPackDraft({
      userId: owner.user.id,
      workspaceSlug: owner.access.workspace.slug
    });

    expect(regenerated.versionId).not.toBe(firstGeneration.versionId);
    expect(regenerated.createdFromVersionId).toBe(firstGeneration.versionId);

    const versions = await prisma.trustPackVersion.findMany({
      where: {
        trustPackId: stillStaleTrustPack!.id
      },
      orderBy: {
        versionNumber: "asc"
      }
    });

    expect(versions.find((version) => version.id === firstGeneration.versionId)?.status).toBe("STALE");
    expect(versions.find((version) => version.id === regenerated.versionId)?.status).toBe("DRAFT");
  });
});
