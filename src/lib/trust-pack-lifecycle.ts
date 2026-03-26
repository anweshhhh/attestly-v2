import { Prisma } from "@prisma/client";
import {
  asCitationSourceType,
  asClaimStatus,
  asExportFormat,
  asPackStatus,
  ExportFormat,
  PackStatus,
  type CitationSourceType as CitationSourceTypeValue,
  type ClaimStatus as ClaimStatusValue,
  type ExportFormat as ExportFormatValue,
  type MembershipRole,
  type PackStatus as PackStatusValue
} from "@/lib/domain";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { can, WorkspaceAction } from "@/lib/rbac";
import { trustPackClaimCatalog, trustPackSectionCatalog } from "@/lib/trust-pack-catalog";
import { type PrismaTx } from "@/lib/trust-packs";
import { requireWorkspaceAccess } from "@/lib/workspaces";

const trustPackVersionLifecycleArgs = Prisma.validator<Prisma.TrustPackVersionDefaultArgs>()({
  include: {
    trustPack: {
      select: {
        id: true,
        title: true,
        workspaceId: true,
        currentVersionId: true
      }
    },
    aiProfile: {
      select: {
        id: true,
        versionNumber: true,
        aiUsageMode: true,
        createdAt: true
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
      include: {
        exportedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
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
});

type TrustPackVersionLifecycleRecord = Prisma.TrustPackVersionGetPayload<typeof trustPackVersionLifecycleArgs>;

export type TrustPackApprovalBlockingCode =
  | "VERSION_NOT_CURRENT"
  | "STATUS_NOT_READY_FOR_REVIEW"
  | "STALE_VERSION"
  | "SECTION_MISSING"
  | "CLAIM_MISSING"
  | "CLAIM_ANSWER_REQUIRED"
  | "FOUND_CITATION_REQUIRED"
  | "PARTIAL_CITATION_REQUIRED"
  | "PARTIAL_MISSING_DETAIL_REQUIRED"
  | "NOT_FOUND_MUST_NOT_HAVE_CITATIONS"
  | "DOCUMENT_CITATION_INVALID"
  | "WIZARD_CITATION_INVALID";

export type TrustPackApprovalIssue = {
  code: TrustPackApprovalBlockingCode;
  message: string;
  sectionKey?: string;
  claimKey?: string;
};

export type TrustPackApprovalReadiness = {
  eligible: boolean;
  blockingReasons: TrustPackApprovalIssue[];
  warningReasons: TrustPackApprovalIssue[];
};

export type ApprovalValidationInput = {
  workspaceId: string;
  isCurrentVersion: boolean;
  status: PackStatusValue;
  sections: Array<{
    key: string;
    claims: Array<{
      key: string;
      answerText: string | null;
      status: ClaimStatusValue;
      missingDetailsText: string | null;
      citations: Array<{
        sourceType: CitationSourceTypeValue;
        sourceDocumentId: string | null;
        sourceChunkId: string | null;
        sourceAIProfileId: string | null;
        sourceFieldPath: string | null;
        sourceDocumentWorkspaceId: string | null;
        sourceChunkDocumentId: string | null;
        sourceAIProfileWorkspaceId: string | null;
      }>;
    }>;
  }>;
};

export type TrustPackVersionActionState = {
  canMarkReadyForReview: boolean;
  canSendBackToDraft: boolean;
  canApprove: boolean;
  canExport: boolean;
  exportLabel: "Export" | "Export again" | null;
};

export type TrustPackVersionReviewLifecycle = {
  approvalReadiness: TrustPackApprovalReadiness;
  actions: TrustPackVersionActionState;
  approvalRecord: {
    approvedAt: string;
    approvedBy: string;
    note: string | null;
  } | null;
  exportSummary: {
    exportCount: number;
    latestExportedAt: string | null;
    latestFormat: ExportFormatValue | null;
  };
};

export type TrustPackLifecycleCommandResult = {
  versionId: string;
  status: PackStatusValue;
};

export type TrustPackApprovalResult = TrustPackLifecycleCommandResult & {
  approvalRecordId: string;
};

export type TrustPackExportResult = TrustPackLifecycleCommandResult & {
  exportRecordId: string;
  format: ExportFormatValue;
};

export type TrustPackExportDownload = {
  fileName: string;
  mimeType: string;
  content: string;
};

function createApprovalIssue(
  code: TrustPackApprovalBlockingCode,
  message: string,
  extra: Pick<TrustPackApprovalIssue, "sectionKey" | "claimKey"> = {}
): TrustPackApprovalIssue {
  return {
    code,
    message,
    ...extra
  };
}

function hasNonEmptyText(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeApprovalValidationInput(record: TrustPackVersionLifecycleRecord): ApprovalValidationInput {
  return {
    workspaceId: record.trustPack.workspaceId,
    isCurrentVersion: record.trustPack.currentVersionId === record.id,
    status: asPackStatus(record.status),
    sections: record.sections.map((section) => ({
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

export function validateTrustPackVersionForApproval(input: ApprovalValidationInput): TrustPackApprovalReadiness {
  const blockingReasons: TrustPackApprovalIssue[] = [];

  if (!input.isCurrentVersion) {
    blockingReasons.push(
      createApprovalIssue("VERSION_NOT_CURRENT", "Only the workspace's current Trust Pack version can be approved in phase 1.")
    );
  }

  if (input.status === PackStatus.STALE) {
    blockingReasons.push(
      createApprovalIssue("STALE_VERSION", "Stale versions cannot be approved. Regenerate a new draft from current inputs first.")
    );
  } else if (input.status !== PackStatus.READY_FOR_REVIEW) {
    blockingReasons.push(
      createApprovalIssue("STATUS_NOT_READY_FOR_REVIEW", "Move this version to READY_FOR_REVIEW before approval.")
    );
  }

  const sectionsByKey = new Map(input.sections.map((section) => [section.key, section]));

  for (const sectionCatalogEntry of trustPackSectionCatalog) {
    const section = sectionsByKey.get(sectionCatalogEntry.key);
    if (!section) {
      blockingReasons.push(
        createApprovalIssue(
          "SECTION_MISSING",
          `The required ${sectionCatalogEntry.title} section is missing from this version.`,
          { sectionKey: sectionCatalogEntry.key }
        )
      );
      continue;
    }

    const claimsByKey = new Map(section.claims.map((claim) => [claim.key, claim]));

    for (const claimCatalogEntry of trustPackClaimCatalog.filter((claim) => claim.sectionKey === sectionCatalogEntry.key)) {
      const claim = claimsByKey.get(claimCatalogEntry.key);
      if (!claim) {
        blockingReasons.push(
          createApprovalIssue(
            "CLAIM_MISSING",
            `The required claim ${claimCatalogEntry.key} is missing from this version.`,
            {
              sectionKey: sectionCatalogEntry.key,
              claimKey: claimCatalogEntry.key
            }
          )
        );
        continue;
      }

      if ((claim.status === "FOUND" || claim.status === "PARTIAL") && !hasNonEmptyText(claim.answerText)) {
        blockingReasons.push(
          createApprovalIssue(
            "CLAIM_ANSWER_REQUIRED",
            `Claim ${claimCatalogEntry.key} needs grounded answer text before approval.`,
            {
              sectionKey: sectionCatalogEntry.key,
              claimKey: claimCatalogEntry.key
            }
          )
        );
      }

      if (claim.status === "FOUND" && claim.citations.length < 1) {
        blockingReasons.push(
          createApprovalIssue(
            "FOUND_CITATION_REQUIRED",
            `Claim ${claimCatalogEntry.key} is marked FOUND but has no citations.`,
            {
              sectionKey: sectionCatalogEntry.key,
              claimKey: claimCatalogEntry.key
            }
          )
        );
      }

      if (claim.status === "PARTIAL") {
        if (claim.citations.length < 1) {
          blockingReasons.push(
            createApprovalIssue(
              "PARTIAL_CITATION_REQUIRED",
              `Claim ${claimCatalogEntry.key} is marked PARTIAL but has no citations.`,
              {
                sectionKey: sectionCatalogEntry.key,
                claimKey: claimCatalogEntry.key
              }
            )
          );
        }

        if (!hasNonEmptyText(claim.missingDetailsText)) {
          blockingReasons.push(
            createApprovalIssue(
              "PARTIAL_MISSING_DETAIL_REQUIRED",
              `Claim ${claimCatalogEntry.key} is marked PARTIAL but has no missing-detail note.`,
              {
                sectionKey: sectionCatalogEntry.key,
                claimKey: claimCatalogEntry.key
              }
            )
          );
        }
      }

      if (claim.status === "NOT_FOUND" && claim.citations.length > 0) {
        blockingReasons.push(
          createApprovalIssue(
            "NOT_FOUND_MUST_NOT_HAVE_CITATIONS",
            `Claim ${claimCatalogEntry.key} is marked NOT_FOUND and must not retain citations.`,
            {
              sectionKey: sectionCatalogEntry.key,
              claimKey: claimCatalogEntry.key
            }
          )
        );
      }

      for (const citation of claim.citations) {
        if (citation.sourceType === "DOCUMENT") {
          const citationValid =
            Boolean(citation.sourceDocumentId) &&
            Boolean(citation.sourceChunkId) &&
            citation.sourceDocumentWorkspaceId === input.workspaceId &&
            citation.sourceChunkDocumentId === citation.sourceDocumentId;

          if (!citationValid) {
            blockingReasons.push(
              createApprovalIssue(
                "DOCUMENT_CITATION_INVALID",
                `Claim ${claimCatalogEntry.key} has an invalid document citation.`,
                {
                  sectionKey: sectionCatalogEntry.key,
                  claimKey: claimCatalogEntry.key
                }
              )
            );
          }
        }

        if (citation.sourceType === "WIZARD_ATTESTATION") {
          const citationValid =
            Boolean(citation.sourceAIProfileId) &&
            Boolean(citation.sourceFieldPath) &&
            citation.sourceAIProfileWorkspaceId === input.workspaceId;

          if (!citationValid) {
            blockingReasons.push(
              createApprovalIssue(
                "WIZARD_CITATION_INVALID",
                `Claim ${claimCatalogEntry.key} has an invalid wizard attestation citation.`,
                {
                  sectionKey: sectionCatalogEntry.key,
                  claimKey: claimCatalogEntry.key
                }
              )
            );
          }
        }
      }
    }
  }

  return {
    eligible: blockingReasons.length === 0,
    blockingReasons,
    warningReasons: []
  };
}

function getExportMimeType(format: ExportFormatValue) {
  switch (format) {
    case ExportFormat.MARKDOWN:
      return "text/markdown; charset=utf-8";
    case ExportFormat.DOCX:
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ExportFormat.PDF:
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getActorDisplayName(actor: { name: string | null; email: string }) {
  return actor.name?.trim() || actor.email;
}

function renderCitationLabel(citation: TrustPackVersionLifecycleRecord["sections"][number]["claims"][number]["citations"][number]) {
  const sourceType = asCitationSourceType(citation.sourceType);

  if (sourceType === "DOCUMENT") {
    return citation.locator ?? citation.sourceDocument?.name ?? "Document source";
  }

  const aiProfileLabel = citation.sourceAIProfile ? `AI Profile v${citation.sourceAIProfile.versionNumber}` : "AI Profile";
  return citation.sourceFieldPath ? `${aiProfileLabel} · ${citation.sourceFieldPath}` : aiProfileLabel;
}

function renderBuyerFacingClaimBody(claim: TrustPackVersionLifecycleRecord["sections"][number]["claims"][number]) {
  const status = asClaimStatus(claim.status);
  const lines: string[] = [];

  if (hasNonEmptyText(claim.answerText)) {
    lines.push(claim.answerText!.trim());
  }

  if (status === "PARTIAL" && hasNonEmptyText(claim.missingDetailsText)) {
    lines.push(`Known limitation: ${claim.missingDetailsText!.trim()}`);
  }

  if (status === "NOT_FOUND" && lines.length === 0) {
    lines.push("Current limitation: grounded support for this point was not found in the evidence and AI Profile version used for this Trust Pack.");
  }

  return lines.join("\n\n");
}

function formatTrustPackVersionMarkdownExport(
  record: TrustPackVersionLifecycleRecord,
  exportRecordId: string,
  exportedAt: Date
) {
  const lines: string[] = [
    `# ${record.trustPack.title}`,
    "",
    `Version: v${record.versionNumber}`,
    `AI Profile version: v${record.aiProfile.versionNumber}`,
    `Approved: ${record.approvalRecord ? formatDate(record.approvalRecord.createdAt) : "Not recorded"}`,
    `Exported: ${formatDate(exportedAt)}`,
    `Export record: ${exportRecordId}`,
    "",
    "This export is a buyer-facing packet generated from the approved version of this Trust Pack. It omits internal workflow controls and raw internal claim-status labels while preserving citations and the evidence appendix.",
    ""
  ];

  for (const section of record.sections) {
    lines.push(`## ${section.title}`);
    lines.push("");

    if (hasNonEmptyText(section.summaryText)) {
      lines.push(section.summaryText!.trim());
      lines.push("");
    }

    for (const claim of section.claims) {
      lines.push(`### ${claim.prompt}`);
      lines.push("");
      lines.push(renderBuyerFacingClaimBody(claim));
      lines.push("");

      if (claim.citations.length > 0) {
        lines.push("Sources:");
        for (const citation of claim.citations) {
          lines.push(`- ${renderCitationLabel(citation)}`);
          if (hasNonEmptyText(citation.quotedSnippet)) {
            lines.push(`  > ${citation.quotedSnippet!.trim()}`);
          }
        }
        lines.push("");
      }
    }
  }

  return `${lines.join("\n").trim()}\n`;
}

async function getTrustPackVersionLifecycleRecordTx(
  tx: PrismaTx,
  workspaceId: string,
  versionId: string
): Promise<TrustPackVersionLifecycleRecord> {
  const version = await tx.trustPackVersion.findFirst({
    where: {
      id: versionId,
      trustPack: {
        workspaceId
      }
    },
    ...trustPackVersionLifecycleArgs
  });

  if (!version) {
    throw new AppError("Trust Pack version not found.", {
      code: "TRUST_PACK_VERSION_NOT_FOUND",
      status: 404
    });
  }

  return version;
}

function assertCurrentVersion(record: TrustPackVersionLifecycleRecord) {
  if (record.trustPack.currentVersionId !== record.id) {
    throw new AppError("Only the workspace's current Trust Pack version can be changed from this surface.", {
      code: "TRUST_PACK_VERSION_NOT_CURRENT",
      status: 409
    });
  }
}

export function resolveTrustPackVersionActionState(params: {
  role: MembershipRole;
  status: PackStatusValue;
  approvalReadiness: TrustPackApprovalReadiness | null;
}): TrustPackVersionActionState {
  const canMarkReady =
    params.status === PackStatus.DRAFT && can(params.role, WorkspaceAction.MARK_TRUST_PACK_READY_FOR_REVIEW);
  const canSendBack =
    params.status === PackStatus.READY_FOR_REVIEW && can(params.role, WorkspaceAction.SEND_TRUST_PACK_BACK_TO_DRAFT);
  const canApproveVersion =
    params.status === PackStatus.READY_FOR_REVIEW &&
    can(params.role, WorkspaceAction.APPROVE_TRUST_PACK_VERSION) &&
    Boolean(params.approvalReadiness?.eligible);
  const exportLabel =
    params.status === PackStatus.APPROVED ? "Export" : params.status === PackStatus.EXPORTED ? "Export again" : null;
  const canExportVersion =
    Boolean(exportLabel) && can(params.role, WorkspaceAction.EXPORT_TRUST_PACK_VERSION);

  return {
    canMarkReadyForReview: canMarkReady,
    canSendBackToDraft: canSendBack,
    canApprove: canApproveVersion,
    canExport: canExportVersion,
    exportLabel
  };
}

export function buildTrustPackVersionReviewLifecycle(params: {
  role: MembershipRole;
  status: PackStatusValue;
  approvalReadiness: TrustPackApprovalReadiness;
  approvalRecord:
    | {
        createdAt: Date;
        note: string | null;
        approvedByUser: {
          name: string | null;
          email: string;
        };
      }
    | null;
  exportRecords: Array<{
    createdAt: Date;
    format: string;
  }>;
}): TrustPackVersionReviewLifecycle {
  return {
    approvalReadiness: params.approvalReadiness,
    actions: resolveTrustPackVersionActionState({
      role: params.role,
      status: params.status,
      approvalReadiness: params.approvalReadiness
    }),
    approvalRecord: params.approvalRecord
      ? {
          approvedAt: params.approvalRecord.createdAt.toISOString(),
          approvedBy: getActorDisplayName(params.approvalRecord.approvedByUser),
          note: params.approvalRecord.note
        }
      : null,
    exportSummary: {
      exportCount: params.exportRecords.length,
      latestExportedAt: params.exportRecords[0]?.createdAt.toISOString() ?? null,
      latestFormat: params.exportRecords[0] ? asExportFormat(params.exportRecords[0].format) : null
    }
  };
}

export async function getTrustPackApprovalReadinessByWorkspaceId(workspaceId: string, versionId: string) {
  const version = await getTrustPackVersionLifecycleRecordTx(prisma, workspaceId, versionId);
  return validateTrustPackVersionForApproval(normalizeApprovalValidationInput(version));
}

export async function markReadyForReview(params: {
  userId: string;
  workspaceSlug: string;
  versionId: string;
}): Promise<TrustPackLifecycleCommandResult> {
  const access = await requireWorkspaceAccess(
    params.userId,
    params.workspaceSlug,
    WorkspaceAction.MARK_TRUST_PACK_READY_FOR_REVIEW
  );

  return prisma.$transaction(async (tx) => {
    const version = await getTrustPackVersionLifecycleRecordTx(tx, access.workspace.id, params.versionId);
    assertCurrentVersion(version);

    if (asPackStatus(version.status) !== PackStatus.DRAFT) {
      throw new AppError("Only draft versions can be marked ready for review.", {
        code: "TRUST_PACK_INVALID_TRANSITION",
        status: 409
      });
    }

    const updated = await tx.trustPackVersion.update({
      where: {
        id: version.id
      },
      data: {
        status: PackStatus.READY_FOR_REVIEW
      }
    });

    return {
      versionId: updated.id,
      status: asPackStatus(updated.status)
    };
  });
}

export async function sendBackToDraft(params: {
  userId: string;
  workspaceSlug: string;
  versionId: string;
}): Promise<TrustPackLifecycleCommandResult> {
  const access = await requireWorkspaceAccess(
    params.userId,
    params.workspaceSlug,
    WorkspaceAction.SEND_TRUST_PACK_BACK_TO_DRAFT
  );

  return prisma.$transaction(async (tx) => {
    const version = await getTrustPackVersionLifecycleRecordTx(tx, access.workspace.id, params.versionId);
    assertCurrentVersion(version);

    if (asPackStatus(version.status) !== PackStatus.READY_FOR_REVIEW) {
      throw new AppError("Only READY_FOR_REVIEW versions can be sent back to draft.", {
        code: "TRUST_PACK_INVALID_TRANSITION",
        status: 409
      });
    }

    const updated = await tx.trustPackVersion.update({
      where: {
        id: version.id
      },
      data: {
        status: PackStatus.DRAFT
      }
    });

    return {
      versionId: updated.id,
      status: asPackStatus(updated.status)
    };
  });
}

export async function approveVersion(params: {
  userId: string;
  workspaceSlug: string;
  versionId: string;
  note?: string | null;
}): Promise<TrustPackApprovalResult> {
  const access = await requireWorkspaceAccess(
    params.userId,
    params.workspaceSlug,
    WorkspaceAction.APPROVE_TRUST_PACK_VERSION
  );

  return prisma.$transaction(async (tx) => {
    const version = await getTrustPackVersionLifecycleRecordTx(tx, access.workspace.id, params.versionId);
    assertCurrentVersion(version);

    if (version.approvalRecord) {
      throw new AppError("This version is already approved.", {
        code: "TRUST_PACK_ALREADY_APPROVED",
        status: 409
      });
    }

    const readiness = validateTrustPackVersionForApproval(normalizeApprovalValidationInput(version));
    if (!readiness.eligible) {
      throw new AppError(readiness.blockingReasons[0]?.message ?? "This version is not ready for approval yet.", {
        code: "TRUST_PACK_APPROVAL_BLOCKED",
        status: 400
      });
    }

    const updated = await tx.trustPackVersion.update({
      where: {
        id: version.id
      },
      data: {
        status: PackStatus.APPROVED,
        approvalRecord: {
          create: {
            approvedByUserId: access.userId,
            note: hasNonEmptyText(params.note) ? params.note!.trim() : null
          }
        }
      },
      include: {
        approvalRecord: true
      }
    });

    return {
      versionId: updated.id,
      status: asPackStatus(updated.status),
      approvalRecordId: updated.approvalRecord!.id
    };
  });
}

export async function exportVersion(params: {
  userId: string;
  workspaceSlug: string;
  versionId: string;
  format?: ExportFormatValue;
}): Promise<TrustPackExportResult> {
  const access = await requireWorkspaceAccess(
    params.userId,
    params.workspaceSlug,
    WorkspaceAction.EXPORT_TRUST_PACK_VERSION
  );
  const format = params.format ?? ExportFormat.MARKDOWN;

  return prisma.$transaction(async (tx) => {
    const version = await getTrustPackVersionLifecycleRecordTx(tx, access.workspace.id, params.versionId);
    assertCurrentVersion(version);

    const status = asPackStatus(version.status);
    if (status !== PackStatus.APPROVED && status !== PackStatus.EXPORTED) {
      throw new AppError("Only approved or already exported versions can be exported.", {
        code: "TRUST_PACK_EXPORT_BLOCKED",
        status: 409
      });
    }

    if (!version.approvalRecord) {
      throw new AppError("This version has not been approved yet for export.", {
        code: "TRUST_PACK_EXPORT_REQUIRES_APPROVAL",
        status: 409
      });
    }

    const exportRecord = await tx.exportRecord.create({
      data: {
        trustPackVersionId: version.id,
        format,
        exportedByUserId: access.userId
      }
    });

    if (status === PackStatus.APPROVED) {
      await tx.trustPackVersion.update({
        where: {
          id: version.id
        },
        data: {
          status: PackStatus.EXPORTED
        }
      });
    }

    return {
      versionId: version.id,
      status: PackStatus.EXPORTED,
      exportRecordId: exportRecord.id,
      format
    };
  });
}

export async function getTrustPackExportDownload(params: {
  userId: string;
  workspaceSlug: string;
  exportRecordId: string;
}): Promise<TrustPackExportDownload> {
  const access = await requireWorkspaceAccess(
    params.userId,
    params.workspaceSlug,
    WorkspaceAction.EXPORT_TRUST_PACK_VERSION
  );

  const exportRecord = await prisma.exportRecord.findFirst({
    where: {
      id: params.exportRecordId,
      trustPackVersion: {
        trustPack: {
          workspaceId: access.workspace.id
        }
      }
    },
    include: {
      trustPackVersion: {
        include: trustPackVersionLifecycleArgs.include
      }
    }
  });

  if (!exportRecord) {
    throw new AppError("Export record not found.", {
      code: "EXPORT_RECORD_NOT_FOUND",
      status: 404
    });
  }

  const format = asExportFormat(exportRecord.format);
  if (format !== ExportFormat.MARKDOWN) {
    throw new AppError("Only Markdown export is implemented in phase 1.", {
      code: "EXPORT_FORMAT_UNSUPPORTED",
      status: 501
    });
  }

  const content = formatTrustPackVersionMarkdownExport(
    exportRecord.trustPackVersion,
    exportRecord.id,
    exportRecord.createdAt
  );
  const safeSlug = access.workspace.slug.replace(/[^a-z0-9-]/gi, "-").toLowerCase();

  return {
    fileName: `${safeSlug}-trust-pack-v${exportRecord.trustPackVersion.versionNumber}.md`,
    mimeType: getExportMimeType(format),
    content
  };
}
