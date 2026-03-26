import type { MembershipRole } from "@/lib/domain";
import {
  AIUsageMode,
  DocumentStatus,
  PackStatus,
  ClaimStatus,
  CitationSourceType,
  ClaimOrigin,
  asPackStatus,
  asClaimStatus,
  asCitationSourceType,
  asAIUsageMode,
  type AIUsageMode as AIUsageModeValue,
  type PackStatus as PackStatusValue,
  type ClaimStatus as ClaimStatusValue,
  type CitationSourceType as CitationSourceTypeValue,
  type ClaimOrigin as ClaimOriginValue
} from "@/lib/domain";
import {
  hydrateWizardFieldState,
  hydrateWizardPayload,
  resolveWizardProvenancePath,
  buildWizardProvenancePath,
  wizardRepeatableItemIdKey,
  type WizardFieldStatePayload,
  type WizardPayload,
  type WizardRepeatableItem
} from "@/lib/ai-profile-wizard-contract";
import { AppError } from "@/lib/errors";
import { sha256 } from "@/lib/fingerprint";
import { prisma } from "@/lib/prisma";
import { assertCan, can } from "@/lib/rbac";
import {
  createTrustPackVersionRecordTx,
  getTrustPackGenerationReadinessByWorkspaceId,
  getTrustPackGenerationReadinessTx,
  type PrismaTx,
  type TrustPackGenerationReadiness
} from "@/lib/trust-packs";
import { trustPackClaimCatalog, trustPackSectionCatalog, type TrustPackClaimCatalogKey } from "@/lib/trust-pack-catalog";
import { requireWorkspaceAccess } from "@/lib/workspaces";
import {
  buildTrustPackVersionReviewLifecycle,
  validateTrustPackVersionForApproval,
  type ApprovalValidationInput,
  type TrustPackVersionReviewLifecycle
} from "@/lib/trust-pack-lifecycle";

type AIProfileGenerationInput = {
  id: string;
  versionNumber: number;
  aiUsageMode: AIUsageModeValue;
  createdAt: Date;
  payload: WizardPayload;
  fieldState: WizardFieldStatePayload;
};

type EvidenceChunkInput = {
  documentId: string;
  documentName: string;
  chunkId: string;
  chunkIndex: number;
  content: string;
  evidenceFingerprint: string;
};

type EvidenceDocumentInput = {
  documentId: string;
  documentName: string;
  evidenceFingerprint: string;
};

type CitationDraft = {
  sourceType: CitationSourceTypeValue;
  sourceDocumentId: string | null;
  sourceChunkId: string | null;
  sourceAIProfileId: string | null;
  sourceFieldPath: string | null;
  quotedSnippet: string;
  locator: string;
};

type ClaimDraft = {
  key: TrustPackClaimCatalogKey;
  prompt: string;
  orderIndex: number;
  status: ClaimStatusValue;
  origin: ClaimOriginValue;
  answerText: string | null;
  missingDetailsText: string | null;
  citations: CitationDraft[];
};

type SectionDraft = {
  key: (typeof trustPackSectionCatalog)[number]["key"];
  title: string;
  orderIndex: number;
  summaryText: string;
  claims: ClaimDraft[];
};

type TrustPackVersionDetail = {
  id: string;
  versionNumber: number;
  status: PackStatusValue;
  createdAt: string;
  updatedAt: string;
  aiProfileVersionNumber: number;
  aiUsageMode: AIUsageModeValue;
  summary: {
    foundClaims: number;
    partialClaims: number;
    notFoundClaims: number;
    totalCitations: number;
  };
  lifecycle: TrustPackVersionReviewLifecycle;
  sections: Array<{
    id: string;
    key: string;
    title: string;
    orderIndex: number;
    summaryText: string | null;
    claims: Array<{
      id: string;
      key: string;
      prompt: string;
      answerText: string | null;
      status: ClaimStatusValue;
      missingDetailsText: string | null;
      citationCount: number;
      citations: Array<{
        id: string;
        sourceType: CitationSourceTypeValue;
        quotedSnippet: string | null;
        locator: string | null;
        sourceFieldPath: string | null;
        sourceDocumentName: string | null;
        sourceChunkIndex: number | null;
        sourceAIProfileVersionNumber: number | null;
      }>;
    }>;
  }>;
};

type CurrentVersionRecord = {
  id: string;
  versionNumber: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  trustPack: {
    workspaceId: string;
    currentVersionId: string | null;
  };
  aiProfile: {
    id: string;
    versionNumber: number;
    aiUsageMode: string;
    createdAt: Date;
  };
  approvalRecord: {
    id: string;
    note: string | null;
    createdAt: Date;
    approvedByUser: {
      id: string;
      name: string | null;
      email: string;
    };
  } | null;
  exportRecords: Array<{
    id: string;
    format: string;
    createdAt: Date;
  }>;
  sections: Array<{
    id: string;
    key: string;
    title: string;
    orderIndex: number;
    summaryText: string | null;
    claims: Array<{
      id: string;
      key: string;
      prompt: string;
      answerText: string | null;
      status: string;
      missingDetailsText: string | null;
      citations: Array<{
        id: string;
        sourceType: string;
        sourceDocumentId: string | null;
        sourceChunkId: string | null;
        sourceAIProfileId: string | null;
        quotedSnippet: string | null;
        locator: string | null;
        sourceFieldPath: string | null;
        sourceDocument: {
          id: string;
          name: string;
          workspaceId: string;
        } | null;
        sourceChunk: {
          id: string;
          chunkIndex: number;
          documentId: string;
        } | null;
        sourceAIProfile: {
          id: string;
          workspaceId: string;
          versionNumber: number;
        } | null;
      }>;
    }>;
  }>;
};

export type GenerateTrustPackDraftResult = {
  workspaceSlug: string;
  versionId: string;
  versionNumber: number;
  status: PackStatusValue;
  createdFromVersionId: string | null;
};

export type TrustPackDetailPageData = {
  workspaceName: string;
  workspaceSlug: string;
  role: MembershipRole;
  readiness: TrustPackGenerationReadiness;
  canGenerateInitial: boolean;
  canRegenerateStale: boolean;
  currentVersion: TrustPackVersionDetail | null;
};

function normalizeApprovalInputFromCurrentVersion(currentVersion: CurrentVersionRecord): ApprovalValidationInput {
  return {
    workspaceId: currentVersion.trustPack.workspaceId,
    isCurrentVersion: currentVersion.trustPack.currentVersionId === currentVersion.id,
    status: asPackStatus(currentVersion.status),
    sections: currentVersion.sections.map((section) => ({
      key: section.key,
      claims: section.claims.map((claim) => ({
        key: claim.key,
        answerText: claim.answerText,
        status: asClaimStatus(claim.status),
        missingDetailsText: claim.missingDetailsText,
        citations: claim.citations.map((citation) => ({
          sourceType: asCitationSourceType(citation.sourceType),
          sourceDocumentId: citation.sourceDocumentId,
          sourceChunkId: citation.sourceChunkId,
          sourceAIProfileId: citation.sourceAIProfileId,
          sourceFieldPath: citation.sourceFieldPath,
          sourceDocumentWorkspaceId: citation.sourceDocument?.workspaceId ?? null,
          sourceChunkDocumentId: citation.sourceChunk?.documentId ?? null,
          sourceAIProfileWorkspaceId: citation.sourceAIProfile?.workspaceId ?? null
        }))
      }))
    }))
  };
}

function parseStoredObject(raw: string, label: string) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AppError(`${label} contains invalid stored JSON.`, {
      code: "INVALID_STORED_JSON",
      status: 500
    });
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new AppError(`${label} must decode to an object.`, {
      code: "INVALID_STORED_JSON",
      status: 500
    });
  }

  return parsed as Record<string, unknown>;
}

function normalizeAIProfileInput(profile: {
  id: string;
  versionNumber: number;
  aiUsageMode: string;
  payloadJson: string;
  fieldStateJson: string;
  createdAt: Date;
}): AIProfileGenerationInput {
  return {
    id: profile.id,
    versionNumber: profile.versionNumber,
    aiUsageMode: asAIUsageMode(profile.aiUsageMode),
    createdAt: profile.createdAt,
    payload: hydrateWizardPayload(parseStoredObject(profile.payloadJson, "payloadJson")),
    fieldState: hydrateWizardFieldState(parseStoredObject(profile.fieldStateJson, "fieldStateJson"))
  };
}

function renderScalarValue(value: unknown) {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return "";
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function extractSnippet(content: string, keywords: string[] = []) {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }

  const lower = normalized.toLowerCase();
  const keyword = keywords.find((entry) => lower.includes(entry.toLowerCase()));
  if (!keyword) {
    return normalized.slice(0, 220);
  }

  const startIndex = Math.max(0, lower.indexOf(keyword.toLowerCase()) - 70);
  const endIndex = Math.min(normalized.length, startIndex + 220);
  return normalized.slice(startIndex, endIndex).trim();
}

function scoreChunk(content: string, keywords: string[]) {
  const lower = content.toLowerCase();
  return keywords.reduce((score, keyword) => score + (lower.includes(keyword.toLowerCase()) ? 1 : 0), 0);
}

function findDocumentMatches(chunks: EvidenceChunkInput[], keywords: string[], limit = 2) {
  return chunks
    .map((chunk) => ({
      ...chunk,
      score: scoreChunk(chunk.content, keywords)
    }))
    .filter((chunk) => chunk.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (left.documentName !== right.documentName) {
        return left.documentName.localeCompare(right.documentName);
      }

      return left.chunkIndex - right.chunkIndex;
    })
    .slice(0, limit);
}

function createDocumentCitation(chunk: EvidenceChunkInput, keywords: string[]): CitationDraft {
  return {
    sourceType: CitationSourceType.DOCUMENT,
    sourceDocumentId: chunk.documentId,
    sourceChunkId: chunk.chunkId,
    sourceAIProfileId: null,
    sourceFieldPath: null,
    quotedSnippet: extractSnippet(chunk.content, keywords),
    locator: `${chunk.documentName} · chunk ${chunk.chunkIndex + 1}`
  };
}

function createWizardCitation(aiProfile: AIProfileGenerationInput, path: string): CitationDraft | null {
  const resolution = resolveWizardProvenancePath({
    payload: aiProfile.payload,
    fieldState: aiProfile.fieldState,
    path
  });

  if (!resolution || !resolution.citableInTrustPack || resolution.fieldState !== "PROVIDED") {
    return null;
  }

  const quotedSnippet = renderScalarValue(resolution.value);
  if (!quotedSnippet) {
    return null;
  }

  return {
    sourceType: CitationSourceType.WIZARD_ATTESTATION,
    sourceDocumentId: null,
    sourceChunkId: null,
    sourceAIProfileId: aiProfile.id,
    sourceFieldPath: resolution.path,
    quotedSnippet,
    locator: `AI Profile v${aiProfile.versionNumber} · ${resolution.path}`
  };
}

function uniqueCitations(citations: Array<CitationDraft | null | undefined>) {
  const seen = new Set<string>();
  const next: CitationDraft[] = [];

  for (const citation of citations) {
    if (!citation) {
      continue;
    }

    const identity = [
      citation.sourceType,
      citation.sourceDocumentId,
      citation.sourceChunkId,
      citation.sourceAIProfileId,
      citation.sourceFieldPath
    ].join(":");

    if (seen.has(identity)) {
      continue;
    }

    seen.add(identity);
    next.push(citation);
  }

  return next;
}

function buildFoundClaim(params: {
  key: TrustPackClaimCatalogKey;
  prompt: string;
  orderIndex: number;
  answerText: string;
  citations: CitationDraft[];
}): ClaimDraft {
  const citations = uniqueCitations(params.citations);
  if (!params.answerText.trim() || citations.length < 1) {
    throw new AppError(`FOUND claim ${params.key} requires answer text and citations.`, {
      code: "INVALID_TRUST_PACK_CLAIM",
      status: 500
    });
  }

  return {
    key: params.key,
    prompt: params.prompt,
    orderIndex: params.orderIndex,
    status: ClaimStatus.FOUND,
    origin: ClaimOrigin.GENERATED,
    answerText: params.answerText.trim(),
    missingDetailsText: null,
    citations
  };
}

function buildPartialClaim(params: {
  key: TrustPackClaimCatalogKey;
  prompt: string;
  orderIndex: number;
  answerText: string;
  missingDetailsText: string;
  citations: CitationDraft[];
}): ClaimDraft {
  const citations = uniqueCitations(params.citations);
  if (!params.answerText.trim() || !params.missingDetailsText.trim() || citations.length < 1) {
    throw new AppError(`PARTIAL claim ${params.key} requires answer text, missing details, and citations.`, {
      code: "INVALID_TRUST_PACK_CLAIM",
      status: 500
    });
  }

  return {
    key: params.key,
    prompt: params.prompt,
    orderIndex: params.orderIndex,
    status: ClaimStatus.PARTIAL,
    origin: ClaimOrigin.GENERATED,
    answerText: params.answerText.trim(),
    missingDetailsText: params.missingDetailsText.trim(),
    citations
  };
}

function buildNotFoundClaim(params: {
  key: TrustPackClaimCatalogKey;
  prompt: string;
  orderIndex: number;
}): ClaimDraft {
  return {
    key: params.key,
    prompt: params.prompt,
    orderIndex: params.orderIndex,
    status: ClaimStatus.NOT_FOUND,
    origin: ClaimOrigin.GENERATED,
    answerText: null,
    missingDetailsText: null,
    citations: []
  };
}

function formatAIUsageMode(aiUsageMode: AIUsageModeValue) {
  switch (aiUsageMode) {
    case AIUsageMode.NONE:
      return "No AI is currently in use.";
    case AIUsageMode.INTERNAL_ONLY:
      return "AI is currently used for internal workflows only.";
    case AIUsageMode.CUSTOMER_FACING:
      return "AI is currently used in customer-facing workflows.";
    case AIUsageMode.BOTH:
      return "AI is currently used in both internal and customer-facing workflows.";
    default:
      return "AI usage mode is not stated.";
  }
}

function getScalarCitation(aiProfile: AIProfileGenerationInput, fieldKey: string) {
  return createWizardCitation(aiProfile, fieldKey);
}

function listProvidedRepeatableField(
  aiProfile: AIProfileGenerationInput,
  groupKey: string,
  childFieldKey: string
) {
  const items = Array.isArray(aiProfile.payload[groupKey]) ? (aiProfile.payload[groupKey] as WizardRepeatableItem[]) : [];

  return items
    .map((item) => {
      const itemId = typeof item?.[wizardRepeatableItemIdKey] === "string" ? String(item[wizardRepeatableItemIdKey]) : null;
      if (!itemId) {
        return null;
      }

      const path = buildWizardProvenancePath({
        fieldKey: groupKey,
        itemId,
        childFieldKey
      });
      const citation = createWizardCitation(aiProfile, path);

      return citation
        ? {
            itemId,
            value: citation.quotedSnippet,
            citation
          }
        : null;
    })
    .filter((entry): entry is { itemId: string; value: string; citation: CitationDraft } => Boolean(entry));
}

function assembleDocumentClaim(params: {
  claimKey: TrustPackClaimCatalogKey;
  prompt: string;
  orderIndex: number;
  chunks: EvidenceChunkInput[];
  keywords: string[];
  partialMessage: string;
}) {
  const matches = findDocumentMatches(params.chunks, params.keywords, 2);
  if (matches.length < 1) {
    return buildNotFoundClaim({
      key: params.claimKey,
      prompt: params.prompt,
      orderIndex: params.orderIndex
    });
  }

  const citations = matches.map((match) => createDocumentCitation(match, params.keywords));
  const answerText = matches.map((match) => extractSnippet(match.content, params.keywords)).join(" ");
  const totalScore = matches.reduce((sum, match) => sum + match.score, 0);

  if (totalScore >= 2 || matches.length > 1) {
    return buildFoundClaim({
      key: params.claimKey,
      prompt: params.prompt,
      orderIndex: params.orderIndex,
      answerText,
      citations
    });
  }

  return buildPartialClaim({
    key: params.claimKey,
    prompt: params.prompt,
    orderIndex: params.orderIndex,
    answerText,
    missingDetailsText: params.partialMessage,
    citations
  });
}

function assembleCatalogClaims(aiProfile: AIProfileGenerationInput, chunks: EvidenceChunkInput[]) {
  const claimDrafts: ClaimDraft[] = [];

  for (const claim of trustPackClaimCatalog) {
    switch (claim.key) {
      case "company_snapshot.company_identity": {
        const company = getScalarCitation(aiProfile, "company_legal_name");
        const product = getScalarCitation(aiProfile, "product_name");
        const domain = getScalarCitation(aiProfile, "primary_domain");

        if (!company || !product) {
          claimDrafts.push(buildNotFoundClaim(claim));
          break;
        }

        const answer = domain?.quotedSnippet
          ? `${company.quotedSnippet} offers ${product.quotedSnippet} at ${domain.quotedSnippet}.`
          : `${company.quotedSnippet} offers ${product.quotedSnippet}.`;

        claimDrafts.push(
          buildFoundClaim({
            key: claim.key,
            prompt: claim.prompt,
            orderIndex: claim.orderIndex,
            answerText: answer,
            citations: uniqueCitations([company, product, domain])
          })
        );
        break;
      }
      case "company_snapshot.product_summary": {
        const summary = getScalarCitation(aiProfile, "product_summary");
        if (!summary) {
          claimDrafts.push(buildNotFoundClaim(claim));
          break;
        }

        claimDrafts.push(
          buildFoundClaim({
            key: claim.key,
            prompt: claim.prompt,
            orderIndex: claim.orderIndex,
            answerText: summary.quotedSnippet,
            citations: [summary]
          })
        );
        break;
      }
      case "company_snapshot.deployment_model": {
        const deployment = getScalarCitation(aiProfile, "deployment_model");
        if (!deployment) {
          claimDrafts.push(buildNotFoundClaim(claim));
          break;
        }

        claimDrafts.push(
          buildFoundClaim({
            key: claim.key,
            prompt: claim.prompt,
            orderIndex: claim.orderIndex,
            answerText: `Deployment model: ${deployment.quotedSnippet}.`,
            citations: [deployment]
          })
        );
        break;
      }
      case "product_data_boundary.customer_data_scope": {
        const documentMatches = findDocumentMatches(chunks, ["customer data", "tenant", "content", "pii", "data"], 2);
        const customerContent = getScalarCitation(aiProfile, "ai_customer_content_in_scope");
        const pii = getScalarCitation(aiProfile, "ai_pii_in_scope");
        const categories = getScalarCitation(aiProfile, "ai_data_categories");
        const wizardCitations = uniqueCitations([customerContent, pii, categories]);

        if (documentMatches.length > 0 && wizardCitations.length > 0) {
          const answer = [
            documentMatches.map((match) => extractSnippet(match.content, ["customer data", "tenant", "content", "pii"])).join(" "),
            categories ? `AI-related data categories attested: ${categories.quotedSnippet}.` : "",
            customerContent ? `Customer content in scope: ${customerContent.quotedSnippet}.` : "",
            pii ? `PII in scope: ${pii.quotedSnippet}.` : ""
          ]
            .filter(Boolean)
            .join(" ");

          claimDrafts.push(
            buildFoundClaim({
              key: claim.key,
              prompt: claim.prompt,
              orderIndex: claim.orderIndex,
              answerText: answer,
              citations: [
                ...documentMatches.map((match) => createDocumentCitation(match, ["customer data", "tenant", "content", "pii"])),
                ...wizardCitations
              ]
            })
          );
          break;
        }

        if (documentMatches.length > 0 || wizardCitations.length > 0) {
          const answer = documentMatches.length > 0
            ? documentMatches.map((match) => extractSnippet(match.content, ["customer data", "tenant", "content", "pii"])).join(" ")
            : [
                categories ? `AI-related data categories attested: ${categories.quotedSnippet}.` : "",
                customerContent ? `Customer content in scope: ${customerContent.quotedSnippet}.` : "",
                pii ? `PII in scope: ${pii.quotedSnippet}.` : ""
              ]
                .filter(Boolean)
                .join(" ");

          claimDrafts.push(
            buildPartialClaim({
              key: claim.key,
              prompt: claim.prompt,
              orderIndex: claim.orderIndex,
              answerText: answer,
              missingDetailsText:
                "The current inputs touch customer-data scope, but they do not fully describe the broader product and data boundary yet.",
              citations: [
                ...documentMatches.map((match) => createDocumentCitation(match, ["customer data", "tenant", "content", "pii"])),
                ...wizardCitations
              ]
            })
          );
          break;
        }

        claimDrafts.push(buildNotFoundClaim(claim));
        break;
      }
      case "product_data_boundary.system_boundary":
        claimDrafts.push(
          assembleDocumentClaim({
            claimKey: claim.key,
            prompt: claim.prompt,
            orderIndex: claim.orderIndex,
            chunks,
            keywords: ["architecture", "system", "platform", "service", "boundary"],
            partialMessage: "Available evidence references the system, but the product boundary is not fully described."
          })
        );
        break;
      case "product_data_boundary.operator_access_boundary":
        claimDrafts.push(
          assembleDocumentClaim({
            claimKey: claim.key,
            prompt: claim.prompt,
            orderIndex: claim.orderIndex,
            chunks,
            keywords: ["support access", "production access", "admin", "operator", "customer data access"],
            partialMessage: "Available evidence references operator access, but the access boundary remains incomplete."
          })
        );
        break;
      case "security_baseline.access_control_baseline":
        claimDrafts.push(
          assembleDocumentClaim({
            claimKey: claim.key,
            prompt: claim.prompt,
            orderIndex: claim.orderIndex,
            chunks,
            keywords: ["access control", "rbac", "mfa", "sso", "least privilege", "authorization"],
            partialMessage: "Evidence references access control posture, but the baseline is not fully described."
          })
        );
        break;
      case "security_baseline.encryption_baseline":
        claimDrafts.push(
          assembleDocumentClaim({
            claimKey: claim.key,
            prompt: claim.prompt,
            orderIndex: claim.orderIndex,
            chunks,
            keywords: ["encryption", "tls", "at rest", "in transit", "kms"],
            partialMessage: "Evidence references encryption posture, but the baseline remains incomplete."
          })
        );
        break;
      case "security_baseline.logging_monitoring_baseline":
        claimDrafts.push(
          assembleDocumentClaim({
            claimKey: claim.key,
            prompt: claim.prompt,
            orderIndex: claim.orderIndex,
            chunks,
            keywords: ["logging", "monitoring", "alert", "audit", "events"],
            partialMessage: "Evidence references logging or monitoring, but the baseline remains incomplete."
          })
        );
        break;
      case "security_baseline.backup_recovery_baseline":
        claimDrafts.push(
          assembleDocumentClaim({
            claimKey: claim.key,
            prompt: claim.prompt,
            orderIndex: claim.orderIndex,
            chunks,
            keywords: ["backup", "recovery", "restore", "disaster recovery", "business continuity"],
            partialMessage: "Evidence references backup or recovery, but the operational baseline remains incomplete."
          })
        );
        break;
      case "security_baseline.secure_development_baseline":
        claimDrafts.push(
          assembleDocumentClaim({
            claimKey: claim.key,
            prompt: claim.prompt,
            orderIndex: claim.orderIndex,
            chunks,
            keywords: ["secure development", "code review", "vulnerability", "security testing", "sdlc"],
            partialMessage: "Evidence references secure development activity, but the baseline remains incomplete."
          })
        );
        break;
      case "ai_systems_inventory.ai_usage_mode": {
        const aiUsageMode = getScalarCitation(aiProfile, "ai_usage_mode");
        if (!aiUsageMode) {
          claimDrafts.push(buildNotFoundClaim(claim));
          break;
        }

        claimDrafts.push(
          buildFoundClaim({
            key: claim.key,
            prompt: claim.prompt,
            orderIndex: claim.orderIndex,
            answerText: formatAIUsageMode(aiProfile.aiUsageMode),
            citations: [aiUsageMode]
          })
        );
        break;
      }
      case "ai_systems_inventory.ai_feature_inventory": {
        const aiUsageMode = getScalarCitation(aiProfile, "ai_usage_mode");
        if (aiProfile.aiUsageMode === AIUsageMode.NONE && aiUsageMode) {
          claimDrafts.push(
            buildFoundClaim({
              key: claim.key,
              prompt: claim.prompt,
              orderIndex: claim.orderIndex,
              answerText: "No AI-enabled workflows or product features are currently attested for this workspace.",
              citations: [aiUsageMode]
            })
          );
          break;
        }

        const useCases = listProvidedRepeatableField(aiProfile, "ai_systems", "use_case");
        const summary = getScalarCitation(aiProfile, "ai_usage_summary");

        if (useCases.length > 0) {
          const answerText = `Attested AI workflows: ${useCases.map((entry) => entry.value).join("; ")}.`;
          const citations = uniqueCitations([...useCases.map((entry) => entry.citation), summary]);
          const totalSystems = Array.isArray(aiProfile.payload.ai_systems)
            ? (aiProfile.payload.ai_systems as WizardRepeatableItem[]).length
            : 0;

          if (useCases.length === totalSystems) {
            claimDrafts.push(
              buildFoundClaim({
                key: claim.key,
                prompt: claim.prompt,
                orderIndex: claim.orderIndex,
                answerText,
                citations
              })
            );
          } else {
            claimDrafts.push(
              buildPartialClaim({
                key: claim.key,
                prompt: claim.prompt,
                orderIndex: claim.orderIndex,
                answerText,
                missingDetailsText: "Some AI system entries are missing a clear use-case description.",
                citations
              })
            );
          }
          break;
        }

        if (summary) {
          claimDrafts.push(
            buildPartialClaim({
              key: claim.key,
              prompt: claim.prompt,
              orderIndex: claim.orderIndex,
              answerText: summary.quotedSnippet,
              missingDetailsText:
                "The workspace provides a high-level AI usage summary, but not a complete feature inventory.",
              citations: [summary]
            })
          );
          break;
        }

        claimDrafts.push(buildNotFoundClaim(claim));
        break;
      }
      case "ai_systems_inventory.model_vendor_inventory": {
        const aiUsageMode = getScalarCitation(aiProfile, "ai_usage_mode");
        if (aiProfile.aiUsageMode === AIUsageMode.NONE && aiUsageMode) {
          claimDrafts.push(
            buildFoundClaim({
              key: claim.key,
              prompt: claim.prompt,
              orderIndex: claim.orderIndex,
              answerText:
                "No model vendors or AI providers are currently in scope because the workspace attests that AI is not in use.",
              citations: [aiUsageMode]
            })
          );
          break;
        }

        const providers = listProvidedRepeatableField(aiProfile, "ai_systems", "provider_name");
        const models = listProvidedRepeatableField(aiProfile, "ai_systems", "model_or_service");
        const modelMap = new Map(models.map((entry) => [entry.itemId, entry]));
        const paired = providers.map((provider) => ({
          provider,
          model: modelMap.get(provider.itemId) ?? null
        }));

        if (paired.length < 1) {
          claimDrafts.push(buildNotFoundClaim(claim));
          break;
        }

        const answerText = `Attested AI providers: ${paired
          .map((entry) => (entry.model ? `${entry.provider.value} (${entry.model.value})` : entry.provider.value))
          .join("; ")}.`;

        if (paired.every((entry) => entry.model)) {
          claimDrafts.push(
            buildFoundClaim({
              key: claim.key,
              prompt: claim.prompt,
              orderIndex: claim.orderIndex,
              answerText,
              citations: uniqueCitations(paired.flatMap((entry) => [entry.provider.citation, entry.model?.citation]))
            })
          );
        } else {
          claimDrafts.push(
            buildPartialClaim({
              key: claim.key,
              prompt: claim.prompt,
              orderIndex: claim.orderIndex,
              answerText,
              missingDetailsText:
                "Some attested AI systems name a provider but do not fully identify the model or service.",
              citations: uniqueCitations(paired.flatMap((entry) => [entry.provider.citation, entry.model?.citation]))
            })
          );
        }
        break;
      }
      case "ai_data_usage.customer_data_to_ai": {
        const aiUsageMode = getScalarCitation(aiProfile, "ai_usage_mode");
        if (aiProfile.aiUsageMode === AIUsageMode.NONE && aiUsageMode) {
          claimDrafts.push(
            buildFoundClaim({
              key: claim.key,
              prompt: claim.prompt,
              orderIndex: claim.orderIndex,
              answerText:
                "No customer data is sent to AI systems in this version because the workspace attests that AI is not in use.",
              citations: [aiUsageMode]
            })
          );
          break;
        }

        const customerDataFlags = listProvidedRepeatableField(aiProfile, "ai_systems", "customer_data_sent");
        const customerContent = getScalarCitation(aiProfile, "ai_customer_content_in_scope");
        const categories = getScalarCitation(aiProfile, "ai_data_categories");
        const pii = getScalarCitation(aiProfile, "ai_pii_in_scope");
        const citations = uniqueCitations([
          ...customerDataFlags.map((entry) => entry.citation),
          customerContent,
          categories,
          pii
        ]);

        if (citations.length < 1) {
          claimDrafts.push(buildNotFoundClaim(claim));
          break;
        }

        const answerParts = [
          customerDataFlags.length > 0
            ? `Per-system customer-data handling: ${customerDataFlags.map((entry) => entry.value).join("; ")}.`
            : "",
          categories ? `Data categories attested: ${categories.quotedSnippet}.` : "",
          customerContent ? `Customer content in scope: ${customerContent.quotedSnippet}.` : "",
          pii ? `PII in scope: ${pii.quotedSnippet}.` : ""
        ].filter(Boolean);

        const totalSystems = Array.isArray(aiProfile.payload.ai_systems)
          ? (aiProfile.payload.ai_systems as WizardRepeatableItem[]).length
          : 0;

        if (customerDataFlags.length === totalSystems && customerDataFlags.length > 0) {
          claimDrafts.push(
            buildFoundClaim({
              key: claim.key,
              prompt: claim.prompt,
              orderIndex: claim.orderIndex,
              answerText: answerParts.join(" "),
              citations
            })
          );
        } else {
          claimDrafts.push(
            buildPartialClaim({
              key: claim.key,
              prompt: claim.prompt,
              orderIndex: claim.orderIndex,
              answerText: answerParts.join(" "),
              missingDetailsText:
                "The current attestation touches customer data handling, but not every AI system has a complete data-flow statement.",
              citations
            })
          );
        }
        break;
      }
      case "ai_data_usage.training_usage": {
        const aiUsageMode = getScalarCitation(aiProfile, "ai_usage_mode");
        if (aiProfile.aiUsageMode === AIUsageMode.NONE && aiUsageMode) {
          claimDrafts.push(
            buildFoundClaim({
              key: claim.key,
              prompt: claim.prompt,
              orderIndex: claim.orderIndex,
              answerText:
                "Because AI is not currently in use, customer data is not attested as being used for model training in this version.",
              citations: [aiUsageMode]
            })
          );
          break;
        }

        const trainingUsage = getScalarCitation(aiProfile, "ai_training_usage");
        const docMatches = findDocumentMatches(chunks, ["training", "model training", "retain prompts", "vendor terms"], 2);
        if (trainingUsage) {
          claimDrafts.push(
            buildFoundClaim({
              key: claim.key,
              prompt: claim.prompt,
              orderIndex: claim.orderIndex,
              answerText: `Customer-data training usage posture: ${trainingUsage.quotedSnippet}.`,
              citations: [
                trainingUsage,
                ...docMatches.map((match) => createDocumentCitation(match, ["training", "model training", "vendor terms"]))
              ]
            })
          );
        } else if (docMatches.length > 0) {
          claimDrafts.push(
            buildPartialClaim({
              key: claim.key,
              prompt: claim.prompt,
              orderIndex: claim.orderIndex,
              answerText: docMatches
                .map((match) => extractSnippet(match.content, ["training", "model training", "vendor terms"]))
                .join(" "),
              missingDetailsText:
                "Evidence references training-related handling, but the workspace does not provide a complete attested answer.",
              citations: docMatches.map((match) => createDocumentCitation(match, ["training", "model training", "vendor terms"]))
            })
          );
        } else {
          claimDrafts.push(buildNotFoundClaim(claim));
        }
        break;
      }
      case "ai_data_usage.retention_posture": {
        const aiUsageMode = getScalarCitation(aiProfile, "ai_usage_mode");
        if (aiProfile.aiUsageMode === AIUsageMode.NONE && aiUsageMode) {
          claimDrafts.push(
            buildFoundClaim({
              key: claim.key,
              prompt: claim.prompt,
              orderIndex: claim.orderIndex,
              answerText:
                "No AI-specific retention posture applies in this version because the workspace attests that AI is not in use.",
              citations: [aiUsageMode]
            })
          );
          break;
        }

        const retention = getScalarCitation(aiProfile, "ai_retention_posture");
        const docMatches = findDocumentMatches(chunks, ["retention", "deletion", "delete", "purge"], 2);

        if (retention) {
          claimDrafts.push(
            buildFoundClaim({
              key: claim.key,
              prompt: claim.prompt,
              orderIndex: claim.orderIndex,
              answerText: retention.quotedSnippet,
              citations: [
                retention,
                ...docMatches.map((match) => createDocumentCitation(match, ["retention", "deletion", "delete", "purge"]))
              ]
            })
          );
        } else if (docMatches.length > 0) {
          claimDrafts.push(
            buildPartialClaim({
              key: claim.key,
              prompt: claim.prompt,
              orderIndex: claim.orderIndex,
              answerText: docMatches
                .map((match) => extractSnippet(match.content, ["retention", "deletion", "delete", "purge"]))
                .join(" "),
              missingDetailsText:
                "Evidence references retention-related handling, but a complete AI-specific retention posture is not attested.",
              citations: docMatches.map((match) => createDocumentCitation(match, ["retention", "deletion", "delete", "purge"]))
            })
          );
        } else {
          claimDrafts.push(buildNotFoundClaim(claim));
        }
        break;
      }
      case "ai_data_usage.customer_control_posture": {
        const aiUsageMode = getScalarCitation(aiProfile, "ai_usage_mode");
        if (aiProfile.aiUsageMode === AIUsageMode.NONE && aiUsageMode) {
          claimDrafts.push(
            buildFoundClaim({
              key: claim.key,
              prompt: claim.prompt,
              orderIndex: claim.orderIndex,
              answerText:
                "No AI-specific customer control or opt-out posture applies in this version because the workspace attests that AI is not in use.",
              citations: [aiUsageMode]
            })
          );
          break;
        }

        const customerControl = getScalarCitation(aiProfile, "ai_deletion_or_opt_out_posture");
        const docMatches = findDocumentMatches(chunks, ["opt out", "customer control", "tenant", "deletion", "exclude"], 2);

        if (customerControl) {
          claimDrafts.push(
            buildFoundClaim({
              key: claim.key,
              prompt: claim.prompt,
              orderIndex: claim.orderIndex,
              answerText: customerControl.quotedSnippet,
              citations: [
                customerControl,
                ...docMatches.map((match) =>
                  createDocumentCitation(match, ["opt out", "customer control", "tenant", "deletion", "exclude"])
                )
              ]
            })
          );
        } else if (docMatches.length > 0) {
          claimDrafts.push(
            buildPartialClaim({
              key: claim.key,
              prompt: claim.prompt,
              orderIndex: claim.orderIndex,
              answerText: docMatches
                .map((match) => extractSnippet(match.content, ["opt out", "customer control", "tenant", "deletion", "exclude"]))
                .join(" "),
              missingDetailsText:
                "Evidence references customer control posture, but the AI-specific handling remains incomplete.",
              citations: docMatches.map((match) =>
                createDocumentCitation(match, ["opt out", "customer control", "tenant", "deletion", "exclude"])
              )
            })
          );
        } else {
          claimDrafts.push(buildNotFoundClaim(claim));
        }
        break;
      }
      case "ai_risk_controls.human_review_posture": {
        const aiUsageMode = getScalarCitation(aiProfile, "ai_usage_mode");
        if (aiProfile.aiUsageMode === AIUsageMode.NONE && aiUsageMode) {
          claimDrafts.push(
            buildFoundClaim({
              key: claim.key,
              prompt: claim.prompt,
              orderIndex: claim.orderIndex,
              answerText:
                "No AI-assisted workflows are currently attested, so there is no AI-specific human review workflow to describe for this version.",
              citations: [aiUsageMode]
            })
          );
          break;
        }

        const reviewExists = getScalarCitation(aiProfile, "ai_human_review_exists");
        const reviewDescription = getScalarCitation(aiProfile, "ai_human_review_description");

        if (reviewExists && reviewDescription) {
          claimDrafts.push(
            buildFoundClaim({
              key: claim.key,
              prompt: claim.prompt,
              orderIndex: claim.orderIndex,
              answerText: `Human review attested: ${reviewExists.quotedSnippet}. ${reviewDescription.quotedSnippet}`,
              citations: [reviewExists, reviewDescription]
            })
          );
        } else if (reviewExists) {
          claimDrafts.push(
            buildPartialClaim({
              key: claim.key,
              prompt: claim.prompt,
              orderIndex: claim.orderIndex,
              answerText: `Human review attested: ${reviewExists.quotedSnippet}.`,
              missingDetailsText:
                "The workspace states whether human review exists, but it does not fully describe the review points.",
              citations: [reviewExists]
            })
          );
        } else {
          claimDrafts.push(buildNotFoundClaim(claim));
        }
        break;
      }
      case "ai_risk_controls.access_and_release_controls": {
        const aiUsageMode = getScalarCitation(aiProfile, "ai_usage_mode");
        if (aiProfile.aiUsageMode === AIUsageMode.NONE && aiUsageMode) {
          claimDrafts.push(
            buildFoundClaim({
              key: claim.key,
              prompt: claim.prompt,
              orderIndex: claim.orderIndex,
              answerText: "No AI-specific access or release controls are currently attested because AI is not in use.",
              citations: [aiUsageMode]
            })
          );
          break;
        }

        const accessControls = getScalarCitation(aiProfile, "ai_access_controls");
        const docMatches = findDocumentMatches(chunks, ["access control", "feature flag", "release", "rollout", "permission"], 2);
        if (accessControls) {
          claimDrafts.push(
            buildFoundClaim({
              key: claim.key,
              prompt: claim.prompt,
              orderIndex: claim.orderIndex,
              answerText: accessControls.quotedSnippet,
              citations: [
                accessControls,
                ...docMatches.map((match) =>
                  createDocumentCitation(match, ["access control", "feature flag", "release", "rollout", "permission"])
                )
              ]
            })
          );
        } else if (docMatches.length > 0) {
          claimDrafts.push(
            buildPartialClaim({
              key: claim.key,
              prompt: claim.prompt,
              orderIndex: claim.orderIndex,
              answerText: docMatches
                .map((match) => extractSnippet(match.content, ["access control", "feature flag", "release", "rollout", "permission"]))
                .join(" "),
              missingDetailsText:
                "Evidence references access or release controls, but the AI-specific control posture remains incomplete.",
              citations: docMatches.map((match) =>
                createDocumentCitation(match, ["access control", "feature flag", "release", "rollout", "permission"])
              )
            })
          );
        } else {
          claimDrafts.push(buildNotFoundClaim(claim));
        }
        break;
      }
      case "ai_risk_controls.monitoring_and_quality_controls": {
        const aiUsageMode = getScalarCitation(aiProfile, "ai_usage_mode");
        if (aiProfile.aiUsageMode === AIUsageMode.NONE && aiUsageMode) {
          claimDrafts.push(
            buildFoundClaim({
              key: claim.key,
              prompt: claim.prompt,
              orderIndex: claim.orderIndex,
              answerText: "No AI monitoring or quality-control workflow is currently attested because AI is not in use.",
              citations: [aiUsageMode]
            })
          );
          break;
        }

        const monitoring = getScalarCitation(aiProfile, "ai_monitoring_and_logging");
        const evaluation = getScalarCitation(aiProfile, "ai_evaluation_or_qa");
        const docMatches = findDocumentMatches(chunks, ["monitor", "logging", "evaluation", "quality", "alert"], 2);
        const citations = uniqueCitations([
          monitoring,
          evaluation,
          ...docMatches.map((match) => createDocumentCitation(match, ["monitor", "logging", "evaluation", "quality", "alert"]))
        ]);

        if (monitoring && evaluation) {
          claimDrafts.push(
            buildFoundClaim({
              key: claim.key,
              prompt: claim.prompt,
              orderIndex: claim.orderIndex,
              answerText: `${monitoring.quotedSnippet} ${evaluation.quotedSnippet}`,
              citations
            })
          );
        } else if (citations.length > 0) {
          const answer = [
            monitoring?.quotedSnippet ?? "",
            evaluation?.quotedSnippet ?? "",
            ...docMatches.map((match) => extractSnippet(match.content, ["monitor", "logging", "evaluation", "quality", "alert"]))
          ]
            .filter(Boolean)
            .join(" ");
          claimDrafts.push(
            buildPartialClaim({
              key: claim.key,
              prompt: claim.prompt,
              orderIndex: claim.orderIndex,
              answerText: answer,
              missingDetailsText:
                "The workspace provides some monitoring or quality-control detail, but the overall posture remains incomplete.",
              citations
            })
          );
        } else {
          claimDrafts.push(buildNotFoundClaim(claim));
        }
        break;
      }
      case "ai_risk_controls.fallback_and_escalation": {
        const aiUsageMode = getScalarCitation(aiProfile, "ai_usage_mode");
        if (aiProfile.aiUsageMode === AIUsageMode.NONE && aiUsageMode) {
          claimDrafts.push(
            buildFoundClaim({
              key: claim.key,
              prompt: claim.prompt,
              orderIndex: claim.orderIndex,
              answerText: "No AI fallback or escalation workflow is currently attested because AI is not in use.",
              citations: [aiUsageMode]
            })
          );
          break;
        }

        const fallback = getScalarCitation(aiProfile, "ai_fallback_behavior");
        const escalation = getScalarCitation(aiProfile, "ai_incident_escalation");
        const docMatches = findDocumentMatches(chunks, ["fallback", "escalation", "incident", "unsafe output", "support"], 2);
        const citations = uniqueCitations([
          fallback,
          escalation,
          ...docMatches.map((match) => createDocumentCitation(match, ["fallback", "escalation", "incident", "support"]))
        ]);

        if (fallback && escalation) {
          claimDrafts.push(
            buildFoundClaim({
              key: claim.key,
              prompt: claim.prompt,
              orderIndex: claim.orderIndex,
              answerText: `${fallback.quotedSnippet} ${escalation.quotedSnippet}`,
              citations
            })
          );
        } else if (citations.length > 0) {
          const answer = [
            fallback?.quotedSnippet ?? "",
            escalation?.quotedSnippet ?? "",
            ...docMatches.map((match) => extractSnippet(match.content, ["fallback", "escalation", "incident", "support"]))
          ]
            .filter(Boolean)
            .join(" ");
          claimDrafts.push(
            buildPartialClaim({
              key: claim.key,
              prompt: claim.prompt,
              orderIndex: claim.orderIndex,
              answerText: answer,
              missingDetailsText:
                "The workspace provides some fallback or escalation detail, but the end-to-end posture remains incomplete.",
              citations
            })
          );
        } else {
          claimDrafts.push(buildNotFoundClaim(claim));
        }
        break;
      }
      case "evidence_appendix.source_document_index":
      case "evidence_appendix.attestation_version_index":
        break;
      default:
        throw new Error("Unhandled trust-pack claim catalog entry.");
    }
  }

  const citedDocumentMap = new Map<string, CitationDraft>();
  const nonAppendixClaims = claimDrafts.filter((claim) => !claim.key.startsWith("evidence_appendix."));
  for (const claim of nonAppendixClaims) {
    for (const citation of claim.citations) {
      if (
        citation.sourceType === CitationSourceType.DOCUMENT &&
        citation.sourceDocumentId &&
        !citedDocumentMap.has(citation.sourceDocumentId)
      ) {
        citedDocumentMap.set(citation.sourceDocumentId, citation);
      }
    }
  }

  const sourceDocumentClaim = trustPackClaimCatalog.find((entry) => entry.key === "evidence_appendix.source_document_index");
  const attestationVersionClaim = trustPackClaimCatalog.find((entry) => entry.key === "evidence_appendix.attestation_version_index");

  if (!sourceDocumentClaim || !attestationVersionClaim) {
    throw new Error("Evidence appendix catalog entries are required.");
  }

  const citedDocuments = [...citedDocumentMap.values()];
  if (citedDocuments.length > 0) {
    claimDrafts.push(
      buildFoundClaim({
        key: sourceDocumentClaim.key,
        prompt: sourceDocumentClaim.prompt,
        orderIndex: sourceDocumentClaim.orderIndex,
        answerText: `Cited source documents: ${citedDocuments.map((citation) => citation.locator.split(" · ")[0]).join("; ")}.`,
        citations: citedDocuments
      })
    );
  } else {
    const fallbackWizardCitation = getScalarCitation(aiProfile, "company_legal_name") ?? getScalarCitation(aiProfile, "ai_usage_mode");
    if (!fallbackWizardCitation) {
      throw new AppError("The evidence appendix requires at least one attested field for provenance.", {
        code: "INVALID_EVIDENCE_APPENDIX",
        status: 500
      });
    }

    claimDrafts.push(
      buildPartialClaim({
        key: sourceDocumentClaim.key,
        prompt: sourceDocumentClaim.prompt,
        orderIndex: sourceDocumentClaim.orderIndex,
        answerText: "This version currently relies on wizard attestations and does not cite evidence documents.",
        missingDetailsText: "No document-backed claims were generated for this version, so the appendix cannot list cited documents yet.",
        citations: [fallbackWizardCitation]
      })
    );
  }

  const attestationCitation = getScalarCitation(aiProfile, "ai_usage_mode") ?? getScalarCitation(aiProfile, "company_legal_name");
  if (!attestationCitation) {
    throw new AppError("The attestation appendix requires a citable immutable AI Profile field.", {
      code: "INVALID_EVIDENCE_APPENDIX",
      status: 500
    });
  }

  claimDrafts.push(
    buildFoundClaim({
      key: attestationVersionClaim.key,
      prompt: attestationVersionClaim.prompt,
      orderIndex: attestationVersionClaim.orderIndex,
      answerText: `This Trust Pack version uses AI Profile v${aiProfile.versionNumber}, completed on ${formatDate(aiProfile.createdAt)}.`,
      citations: [attestationCitation]
    })
  );

  return claimDrafts;
}

function groupClaimsIntoSections(claims: ClaimDraft[]) {
  return trustPackSectionCatalog.map((section) => {
    const sectionClaims = claims
      .filter((claim) => trustPackClaimCatalog.find((catalogClaim) => catalogClaim.key === claim.key)?.sectionKey === section.key)
      .sort((left, right) => left.orderIndex - right.orderIndex);
    const foundCount = sectionClaims.filter((claim) => claim.status === ClaimStatus.FOUND).length;
    const partialCount = sectionClaims.filter((claim) => claim.status === ClaimStatus.PARTIAL).length;
    const notFoundCount = sectionClaims.filter((claim) => claim.status === ClaimStatus.NOT_FOUND).length;

    return {
      key: section.key,
      title: section.title,
      orderIndex: section.orderIndex,
      summaryText: `${foundCount} found, ${partialCount} partial, ${notFoundCount} not found.`,
      claims: sectionClaims
    } satisfies SectionDraft;
  });
}

function validateClaimDraft(claim: ClaimDraft) {
  if (claim.status === ClaimStatus.FOUND && claim.citations.length < 1) {
    throw new AppError(`Claim ${claim.key} is FOUND but has no citations.`, {
      code: "INVALID_TRUST_PACK_CLAIM",
      status: 500
    });
  }

  if (claim.status === ClaimStatus.PARTIAL) {
    if (claim.citations.length < 1 || !claim.missingDetailsText?.trim()) {
      throw new AppError(`Claim ${claim.key} is PARTIAL but is missing citations or missing-details text.`, {
        code: "INVALID_TRUST_PACK_CLAIM",
        status: 500
      });
    }
  }

  if (claim.status === ClaimStatus.NOT_FOUND && claim.citations.length > 0) {
    throw new AppError(`Claim ${claim.key} is NOT_FOUND but still has citations.`, {
      code: "INVALID_TRUST_PACK_CLAIM",
      status: 500
    });
  }
}

function buildGenerationInputHash(params: {
  aiProfile: AIProfileGenerationInput;
  evidenceDocuments: EvidenceDocumentInput[];
}) {
  const sortedEvidence = [...params.evidenceDocuments].sort((left, right) => left.documentId.localeCompare(right.documentId));
  return sha256(
    JSON.stringify({
      catalogVersion: "claim-catalog-v1",
      aiProfileId: params.aiProfile.id,
      aiProfileVersionNumber: params.aiProfile.versionNumber,
      evidenceDocuments: sortedEvidence
    })
  );
}

async function loadGenerationInputsTx(tx: PrismaTx, workspaceId: string) {
  const [latestAIProfile, evidenceDocuments] = await Promise.all([
    tx.aIProfile.findFirst({
      where: {
        workspaceId
      },
      orderBy: {
        versionNumber: "desc"
      }
    }),
    tx.evidenceDocument.findMany({
      where: {
        workspaceId,
        status: DocumentStatus.CHUNKED,
        archivedAt: null
      },
      select: {
        id: true,
        name: true,
        evidenceFingerprint: true,
        chunks: {
          select: {
            id: true,
            chunkIndex: true,
            content: true,
            evidenceFingerprint: true
          },
          orderBy: {
            chunkIndex: "asc"
          }
        }
      },
      orderBy: [
        { name: "asc" },
        { createdAt: "asc" }
      ]
    })
  ]);

  if (!latestAIProfile) {
    throw new AppError("A completed AI Profile is required before generating a Trust Pack.", {
      code: "AI_PROFILE_REQUIRED",
      status: 400
    });
  }

  const citationReadyDocuments = evidenceDocuments.filter(
    (document) => document.evidenceFingerprint && document.chunks.length > 0
  );

  if (citationReadyDocuments.length < 1) {
    throw new AppError("At least one citation-usable evidence document is required before generating a Trust Pack.", {
      code: "TRUST_PACK_EVIDENCE_REQUIRED",
      status: 400
    });
  }

  return {
    aiProfile: normalizeAIProfileInput(latestAIProfile),
    evidenceDocuments: citationReadyDocuments.map((document) => ({
      documentId: document.id,
      documentName: document.name,
      evidenceFingerprint: document.evidenceFingerprint ?? ""
    })),
    evidenceChunks: citationReadyDocuments.flatMap((document) =>
      document.chunks.map((chunk) => ({
        documentId: document.id,
        documentName: document.name,
        chunkId: chunk.id,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        evidenceFingerprint: chunk.evidenceFingerprint
      }))
    )
  };
}

async function persistTrustPackVersionSectionsTx(
  tx: PrismaTx,
  trustPackVersionId: string,
  sections: SectionDraft[]
) {
  for (const section of sections) {
    const createdSection = await tx.trustPackSection.create({
      data: {
        trustPackVersionId,
        key: section.key,
        title: section.title,
        orderIndex: section.orderIndex,
        summaryText: section.summaryText
      }
    });

    for (const claim of section.claims) {
      validateClaimDraft(claim);

      const createdClaim = await tx.trustPackClaim.create({
        data: {
          sectionId: createdSection.id,
          key: claim.key,
          prompt: claim.prompt,
          answerText: claim.answerText,
          status: claim.status,
          origin: claim.origin,
          missingDetailsText: claim.missingDetailsText,
          orderIndex: claim.orderIndex
        }
      });

      for (const [index, citation] of claim.citations.entries()) {
        await tx.citation.create({
          data: {
            claimId: createdClaim.id,
            sourceType: citation.sourceType,
            sourceDocumentId: citation.sourceDocumentId,
            sourceChunkId: citation.sourceChunkId,
            sourceAIProfileId: citation.sourceAIProfileId,
            sourceFieldPath: citation.sourceFieldPath,
            quotedSnippet: citation.quotedSnippet,
            locator: citation.locator,
            orderIndex: index + 1
          }
        });
      }
    }
  }
}

export async function generateCurrentTrustPackDraft(params: {
  userId: string;
  workspaceSlug: string;
}): Promise<GenerateTrustPackDraftResult> {
  const access = await requireWorkspaceAccess(params.userId, params.workspaceSlug, "VIEW_CURRENT_TRUST_PACK");
  const readiness = await getTrustPackGenerationReadinessByWorkspaceId(access.workspace.id);

  let createdFromVersionId: string | null = null;
  if (readiness.canGenerateInitialDraft) {
    assertCan(access.role, "GENERATE_INITIAL_TRUST_PACK_VERSION");
  } else if (readiness.canRegenerateStaleVersion && readiness.trustPack.currentVersion) {
    assertCan(access.role, "REGENERATE_STALE_TRUST_PACK_VERSION");
    createdFromVersionId = readiness.trustPack.currentVersion.id;
  } else {
    throw new AppError("This workspace is not ready for Trust Pack generation right now.", {
      code: "TRUST_PACK_GENERATION_NOT_READY",
      status: 400
    });
  }

  return prisma.$transaction(async (tx) => {
    const freshReadiness = await getTrustPackGenerationReadinessTx(tx, access.workspace.id);
    let lineageVersionId: string | null = null;

    if (freshReadiness.canGenerateInitialDraft) {
      assertCan(access.role, "GENERATE_INITIAL_TRUST_PACK_VERSION");
    } else if (freshReadiness.canRegenerateStaleVersion && freshReadiness.trustPack.currentVersion) {
      assertCan(access.role, "REGENERATE_STALE_TRUST_PACK_VERSION");
      lineageVersionId = freshReadiness.trustPack.currentVersion.id;
    } else {
      throw new AppError("This workspace is not ready for Trust Pack generation right now.", {
        code: "TRUST_PACK_GENERATION_NOT_READY",
        status: 400
      });
    }

    const inputs = await loadGenerationInputsTx(tx, access.workspace.id);
    const generationInputHash = buildGenerationInputHash({
      aiProfile: inputs.aiProfile,
      evidenceDocuments: inputs.evidenceDocuments
    });

    const created = await createTrustPackVersionRecordTx(tx, {
      workspaceId: access.workspace.id,
      workspaceName: access.workspace.name,
      createdByUserId: access.userId,
      aiProfileId: inputs.aiProfile.id,
      status: PackStatus.DRAFT,
      createdFromVersionId: createdFromVersionId ?? lineageVersionId,
      generationInputHash
    });

    const claims = assembleCatalogClaims(inputs.aiProfile, inputs.evidenceChunks);
    const sections = groupClaimsIntoSections(claims);
    await persistTrustPackVersionSectionsTx(tx, created.version.id, sections);

    return {
      workspaceSlug: access.workspace.slug,
      versionId: created.version.id,
      versionNumber: created.version.versionNumber,
      status: created.version.status,
      createdFromVersionId: created.version.createdFromVersionId
    };
  });
}

function mapCurrentVersionDetail(currentVersion: CurrentVersionRecord, role: MembershipRole): TrustPackVersionDetail {
  const sections = currentVersion.sections.map((section) => ({
    id: section.id,
    key: section.key,
    title: section.title,
    orderIndex: section.orderIndex,
    summaryText: section.summaryText,
    claims: section.claims.map((claim) => ({
      id: claim.id,
      key: claim.key,
      prompt: claim.prompt,
      answerText: claim.answerText,
      status: asClaimStatus(claim.status),
      missingDetailsText: claim.missingDetailsText,
      citationCount: claim.citations.length,
      citations: claim.citations.map((citation) => ({
        id: citation.id,
        sourceType: asCitationSourceType(citation.sourceType),
        quotedSnippet: citation.quotedSnippet,
        locator: citation.locator,
        sourceFieldPath: citation.sourceFieldPath,
        sourceDocumentName: citation.sourceDocument?.name ?? null,
        sourceChunkIndex: citation.sourceChunk?.chunkIndex ?? null,
        sourceAIProfileVersionNumber: citation.sourceAIProfile?.versionNumber ?? null
      }))
    }))
  }));

  const allClaims = sections.flatMap((section) => section.claims);
  const foundClaims = allClaims.filter((claim) => claim.status === "FOUND").length;
  const partialClaims = allClaims.filter((claim) => claim.status === "PARTIAL").length;
  const notFoundClaims = allClaims.filter((claim) => claim.status === "NOT_FOUND").length;
  const totalCitations = allClaims.reduce((sum, claim) => sum + claim.citationCount, 0);
  const approvalReadiness = validateTrustPackVersionForApproval(normalizeApprovalInputFromCurrentVersion(currentVersion));

  return {
    id: currentVersion.id,
    versionNumber: currentVersion.versionNumber,
    status: asPackStatus(currentVersion.status),
    createdAt: currentVersion.createdAt.toISOString(),
    updatedAt: currentVersion.updatedAt.toISOString(),
    aiProfileVersionNumber: currentVersion.aiProfile.versionNumber,
    aiUsageMode: asAIUsageMode(currentVersion.aiProfile.aiUsageMode),
    summary: {
      foundClaims,
      partialClaims,
      notFoundClaims,
      totalCitations
    },
    lifecycle: buildTrustPackVersionReviewLifecycle({
      role,
      status: asPackStatus(currentVersion.status),
      approvalReadiness,
      approvalRecord: currentVersion.approvalRecord,
      exportRecords: currentVersion.exportRecords
    }),
    sections
  };
}

export async function getTrustPackDetailPageData(userId: string, workspaceSlug: string): Promise<TrustPackDetailPageData> {
  const access = await requireWorkspaceAccess(userId, workspaceSlug, "VIEW_CURRENT_TRUST_PACK");
  const readiness = await getTrustPackGenerationReadinessByWorkspaceId(access.workspace.id);

  const trustPack = await prisma.trustPack.findUnique({
    where: {
      workspaceId: access.workspace.id
    },
    include: {
      currentVersion: {
        include: {
          aiProfile: {
            select: {
              id: true,
              versionNumber: true,
              aiUsageMode: true,
              createdAt: true
            }
          },
          trustPack: {
            select: {
              workspaceId: true,
              currentVersionId: true
            }
          },
          approvalRecord: {
            include: {
              approvedByUser: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          },
          exportRecords: {
            orderBy: {
              createdAt: "desc"
            },
            select: {
              id: true,
              format: true,
              createdAt: true
            }
          },
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
                    },
                    include: {
                      sourceDocument: {
                        select: {
                          id: true,
                          name: true,
                          workspaceId: true
                        }
                      },
                      sourceChunk: {
                        select: {
                          id: true,
                          chunkIndex: true,
                          documentId: true
                        }
                      },
                      sourceAIProfile: {
                        select: {
                          id: true,
                          workspaceId: true,
                          versionNumber: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  return {
    workspaceName: access.workspace.name,
    workspaceSlug: access.workspace.slug,
    role: access.role,
    readiness,
    canGenerateInitial: can(access.role, "GENERATE_INITIAL_TRUST_PACK_VERSION") && readiness.canGenerateInitialDraft,
    canRegenerateStale: can(access.role, "REGENERATE_STALE_TRUST_PACK_VERSION") && readiness.canRegenerateStaleVersion,
    currentVersion: trustPack?.currentVersion ? mapCurrentVersionDetail(trustPack.currentVersion, access.role) : null
  };
}
