import { Prisma, type PrismaClient } from "@prisma/client";
import { asPackStatus, asAIUsageMode, DocumentStatus, PackStatus, type PackStatus as PackStatusValue } from "@/lib/domain";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceAccess } from "@/lib/workspaces";

export type PrismaTx = Prisma.TransactionClient | PrismaClient;

async function countCitationReadyEvidenceTx(tx: PrismaTx, workspaceId: string) {
  return tx.evidenceDocument.count({
    where: {
      workspaceId,
      status: DocumentStatus.CHUNKED,
      archivedAt: null
    }
  });
}

async function countActiveEvidenceTx(tx: PrismaTx, workspaceId: string) {
  return tx.evidenceDocument.count({
    where: {
      workspaceId,
      archivedAt: null
    }
  });
}

async function getLatestAIProfileTx(tx: PrismaTx, workspaceId: string) {
  return tx.aIProfile.findFirst({
    where: {
      workspaceId
    },
    orderBy: {
      versionNumber: "desc"
    }
  });
}

export async function ensureTrustPackContainerTx(
  tx: PrismaTx,
  params: { workspaceId: string; workspaceName: string; createdByUserId: string }
) {
  return tx.trustPack.upsert({
    where: {
      workspaceId: params.workspaceId
    },
    update: {},
    create: {
      workspaceId: params.workspaceId,
      title: `${params.workspaceName} Trust Pack`,
      createdByUserId: params.createdByUserId
    },
    include: {
      currentVersion: true
    }
  });
}

export async function getWorkspaceTrustPackByWorkspaceIdTx(tx: PrismaTx, workspaceId: string) {
  return tx.trustPack.findUnique({
    where: {
      workspaceId
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
          }
        }
      }
    }
  });
}

function normalizeTrustPackRecord(
  trustPack: Awaited<ReturnType<typeof getWorkspaceTrustPackByWorkspaceIdTx>>
) {
  if (!trustPack) {
    return null;
  }

  return {
    ...trustPack,
    currentVersion: trustPack.currentVersion
      ? {
          ...trustPack.currentVersion,
          status: asPackStatus(trustPack.currentVersion.status),
          aiProfile: {
            ...trustPack.currentVersion.aiProfile,
            aiUsageMode: asAIUsageMode(trustPack.currentVersion.aiProfile.aiUsageMode)
          }
        }
      : null
  };
}

export type TrustPackReadinessSummary = {
  hasCompletedAIProfile: boolean;
  latestAIProfile: {
    id: string;
    versionNumber: number;
    aiUsageMode: ReturnType<typeof asAIUsageMode>;
    createdAt: Date;
  } | null;
  citationReadyEvidenceCount: number;
  canCreateDraftVersion: boolean;
};

export const TrustPackGenerationReadinessState = {
  NEEDS_EVIDENCE: "NEEDS_EVIDENCE",
  NEEDS_CITATION_READY_EVIDENCE: "NEEDS_CITATION_READY_EVIDENCE",
  NEEDS_AI_PROFILE: "NEEDS_AI_PROFILE",
  READY_FOR_INITIAL_GENERATION: "READY_FOR_INITIAL_GENERATION",
  CURRENT_VERSION_DRAFT: "CURRENT_VERSION_DRAFT",
  CURRENT_VERSION_READY_FOR_REVIEW: "CURRENT_VERSION_READY_FOR_REVIEW",
  CURRENT_VERSION_APPROVED: "CURRENT_VERSION_APPROVED",
  CURRENT_VERSION_EXPORTED: "CURRENT_VERSION_EXPORTED",
  CURRENT_VERSION_STALE: "CURRENT_VERSION_STALE"
} as const;

export type TrustPackGenerationReadinessState =
  (typeof TrustPackGenerationReadinessState)[keyof typeof TrustPackGenerationReadinessState];

export type TrustPackGenerationReadiness = {
  state: TrustPackGenerationReadinessState;
  evidence: {
    totalActiveDocuments: number;
    citationReadyDocuments: number;
  };
  aiProfile: {
    hasCompletedAIProfile: boolean;
    latestProfile: TrustPackReadinessSummary["latestAIProfile"];
  };
  trustPack: {
    hasLogicalPack: boolean;
    currentVersion: {
      id: string;
      versionNumber: number;
      status: PackStatusValue;
      createdAt: Date;
      updatedAt: Date;
      aiProfileId: string;
      aiProfileVersionNumber: number;
      aiUsageMode: ReturnType<typeof asAIUsageMode>;
    } | null;
  };
  canGenerateInitialDraft: boolean;
  canRegenerateStaleVersion: boolean;
};

function mapTrustPackGenerationReadinessState(params: {
  totalActiveDocuments: number;
  citationReadyEvidenceCount: number;
  hasCompletedAIProfile: boolean;
  currentVersionStatus: PackStatusValue | null;
}): TrustPackGenerationReadinessState {
  if (params.citationReadyEvidenceCount < 1) {
    return params.totalActiveDocuments < 1
      ? TrustPackGenerationReadinessState.NEEDS_EVIDENCE
      : TrustPackGenerationReadinessState.NEEDS_CITATION_READY_EVIDENCE;
  }

  if (!params.hasCompletedAIProfile) {
    return TrustPackGenerationReadinessState.NEEDS_AI_PROFILE;
  }

  if (!params.currentVersionStatus) {
    return TrustPackGenerationReadinessState.READY_FOR_INITIAL_GENERATION;
  }

  switch (params.currentVersionStatus) {
    case PackStatus.DRAFT:
      return TrustPackGenerationReadinessState.CURRENT_VERSION_DRAFT;
    case PackStatus.READY_FOR_REVIEW:
      return TrustPackGenerationReadinessState.CURRENT_VERSION_READY_FOR_REVIEW;
    case PackStatus.APPROVED:
      return TrustPackGenerationReadinessState.CURRENT_VERSION_APPROVED;
    case PackStatus.EXPORTED:
      return TrustPackGenerationReadinessState.CURRENT_VERSION_EXPORTED;
    case PackStatus.STALE:
      return TrustPackGenerationReadinessState.CURRENT_VERSION_STALE;
    default:
      return TrustPackGenerationReadinessState.NEEDS_EVIDENCE;
  }
}

export async function getTrustPackGenerationReadinessTx(
  tx: PrismaTx,
  workspaceId: string
): Promise<TrustPackGenerationReadiness> {
  const [latestAIProfile, citationReadyEvidenceCount, totalActiveDocuments, trustPack] = await Promise.all([
    getLatestAIProfileTx(tx, workspaceId),
    countCitationReadyEvidenceTx(tx, workspaceId),
    countActiveEvidenceTx(tx, workspaceId),
    getWorkspaceTrustPackByWorkspaceIdTx(tx, workspaceId)
  ]);

  const normalizedTrustPack = normalizeTrustPackRecord(trustPack);
  const latestProfile = latestAIProfile
    ? {
        id: latestAIProfile.id,
        versionNumber: latestAIProfile.versionNumber,
        aiUsageMode: asAIUsageMode(latestAIProfile.aiUsageMode),
        createdAt: latestAIProfile.createdAt
      }
    : null;

  const state = mapTrustPackGenerationReadinessState({
    totalActiveDocuments,
    citationReadyEvidenceCount,
    hasCompletedAIProfile: Boolean(latestProfile),
    currentVersionStatus: normalizedTrustPack?.currentVersion?.status ?? null
  });

  return {
    state,
    evidence: {
      totalActiveDocuments,
      citationReadyDocuments: citationReadyEvidenceCount
    },
    aiProfile: {
      hasCompletedAIProfile: Boolean(latestProfile),
      latestProfile
    },
    trustPack: {
      hasLogicalPack: Boolean(normalizedTrustPack),
      currentVersion: normalizedTrustPack?.currentVersion
        ? {
            id: normalizedTrustPack.currentVersion.id,
            versionNumber: normalizedTrustPack.currentVersion.versionNumber,
            status: normalizedTrustPack.currentVersion.status,
            createdAt: normalizedTrustPack.currentVersion.createdAt,
            updatedAt: normalizedTrustPack.currentVersion.updatedAt,
            aiProfileId: normalizedTrustPack.currentVersion.aiProfile.id,
            aiProfileVersionNumber: normalizedTrustPack.currentVersion.aiProfile.versionNumber,
            aiUsageMode: normalizedTrustPack.currentVersion.aiProfile.aiUsageMode
          }
        : null
    },
    canGenerateInitialDraft: state === TrustPackGenerationReadinessState.READY_FOR_INITIAL_GENERATION,
    canRegenerateStaleVersion: state === TrustPackGenerationReadinessState.CURRENT_VERSION_STALE
  };
}

export async function getTrustPackGenerationReadiness(userId: string, workspaceSlug: string) {
  const access = await requireWorkspaceAccess(userId, workspaceSlug, "VIEW_CURRENT_TRUST_PACK");
  return getTrustPackGenerationReadinessTx(prisma, access.workspace.id);
}

export async function getTrustPackGenerationReadinessByWorkspaceId(workspaceId: string) {
  return getTrustPackGenerationReadinessTx(prisma, workspaceId);
}

export async function getTrustPackReadinessSummary(workspaceId: string): Promise<TrustPackReadinessSummary> {
  const readiness = await getTrustPackGenerationReadinessTx(prisma, workspaceId);

  return {
    hasCompletedAIProfile: readiness.aiProfile.hasCompletedAIProfile,
    latestAIProfile: readiness.aiProfile.latestProfile,
    citationReadyEvidenceCount: readiness.evidence.citationReadyDocuments,
    canCreateDraftVersion: readiness.canGenerateInitialDraft
  };
}

export async function getWorkspaceTrustPack(userId: string, workspaceSlug: string) {
  const access = await requireWorkspaceAccess(userId, workspaceSlug, "VIEW_CURRENT_TRUST_PACK");
  const trustPack = await getWorkspaceTrustPackByWorkspaceIdTx(prisma, access.workspace.id);
  return normalizeTrustPackRecord(trustPack);
}

export async function ensureWorkspaceTrustPack(userId: string, workspaceSlug: string) {
  const access = await requireWorkspaceAccess(userId, workspaceSlug, "CREATE_TRUST_PACK_VERSION");

  const trustPack = await prisma.$transaction((tx) =>
    ensureTrustPackContainerTx(tx, {
      workspaceId: access.workspace.id,
      workspaceName: access.workspace.name,
      createdByUserId: access.userId
    })
  );

  return {
    ...trustPack,
    currentVersion: trustPack.currentVersion
      ? {
          ...trustPack.currentVersion,
          status: asPackStatus(trustPack.currentVersion.status)
        }
      : null
  };
}

export async function getWorkspaceTrustPackByWorkspaceId(workspaceId: string) {
  const trustPack = await getWorkspaceTrustPackByWorkspaceIdTx(prisma, workspaceId);
  return normalizeTrustPackRecord(trustPack);
}

export async function markCurrentTrustPackVersionStaleTx(tx: PrismaTx, workspaceId: string) {
  const trustPack = await getWorkspaceTrustPackByWorkspaceIdTx(tx, workspaceId);
  if (!trustPack?.currentVersion || trustPack.currentVersion.status === PackStatus.STALE) {
    return normalizeTrustPackRecord(trustPack);
  }

  await tx.trustPackVersion.update({
    where: {
      id: trustPack.currentVersion.id
    },
    data: {
      status: PackStatus.STALE
    }
  });

  return normalizeTrustPackRecord(await getWorkspaceTrustPackByWorkspaceIdTx(tx, workspaceId));
}

export async function markCurrentTrustPackVersionStale(workspaceId: string) {
  return prisma.$transaction((tx) => markCurrentTrustPackVersionStaleTx(tx, workspaceId));
}

export async function createTrustPackVersionRecord(params: {
  userId: string;
  workspaceSlug: string;
  aiProfileId: string;
  status?: string;
  createdFromVersionId?: string | null;
  generationInputHash?: string | null;
}) {
  const access = await requireWorkspaceAccess(params.userId, params.workspaceSlug, "CREATE_TRUST_PACK_VERSION");
  return prisma.$transaction((tx) =>
    createTrustPackVersionRecordTx(tx, {
      workspaceId: access.workspace.id,
      workspaceName: access.workspace.name,
      createdByUserId: access.userId,
      aiProfileId: params.aiProfileId,
      status: params.status,
      createdFromVersionId: params.createdFromVersionId ?? null,
      generationInputHash: params.generationInputHash ?? null
    })
  );
}

export async function createTrustPackVersionRecordTx(
  tx: PrismaTx,
  params: {
    workspaceId: string;
    workspaceName: string;
    createdByUserId: string;
    aiProfileId: string;
    status?: string;
    createdFromVersionId?: string | null;
    generationInputHash?: string | null;
  }
) {
  const status = params.status ? asPackStatus(params.status) : PackStatus.DRAFT;
  const readiness = await getTrustPackGenerationReadinessTx(tx, params.workspaceId);

  if (readiness.evidence.citationReadyDocuments < 1) {
    throw new AppError("At least one citation-usable evidence document is required before creating a Trust Pack version.", {
      code: "TRUST_PACK_EVIDENCE_REQUIRED",
      status: 400
    });
  }

  if (!readiness.aiProfile.hasCompletedAIProfile) {
    throw new AppError("A completed AI Profile is required before creating a Trust Pack version.", {
      code: "AI_PROFILE_REQUIRED",
      status: 400
    });
  }

  const aiProfile = await tx.aIProfile.findFirst({
    where: {
      id: params.aiProfileId,
      workspaceId: params.workspaceId
    }
  });

  if (!aiProfile) {
    throw new AppError("AI Profile not found for this workspace.", {
      code: "AI_PROFILE_NOT_FOUND",
      status: 404
    });
  }

  const trustPack = await ensureTrustPackContainerTx(tx, {
    workspaceId: params.workspaceId,
    workspaceName: params.workspaceName,
    createdByUserId: params.createdByUserId
  });

  let createdFromVersionId: string | null = null;
  if (params.createdFromVersionId) {
    const existingVersion = await tx.trustPackVersion.findFirst({
      where: {
        id: params.createdFromVersionId,
        trustPackId: trustPack.id
      }
    });

    if (!existingVersion) {
      throw new AppError("The referenced prior Trust Pack version was not found in this workspace.", {
        code: "TRUST_PACK_VERSION_NOT_FOUND",
        status: 404
      });
    }

    createdFromVersionId = existingVersion.id;
  }

  const nextVersionNumber =
    (await tx.trustPackVersion.aggregate({
      where: {
        trustPackId: trustPack.id
      },
      _max: {
        versionNumber: true
      }
    }))._max.versionNumber ?? 0;

  const createdVersion = await tx.trustPackVersion.create({
    data: {
      trustPackId: trustPack.id,
      versionNumber: nextVersionNumber + 1,
      status,
      aiProfileId: aiProfile.id,
      createdFromVersionId,
      generationInputHash: params.generationInputHash ?? null,
      createdByUserId: params.createdByUserId
    }
  });

  const updatedTrustPack = await tx.trustPack.update({
    where: {
      id: trustPack.id
    },
    data: {
      currentVersionId: createdVersion.id
    }
  });

  return {
    trustPack: updatedTrustPack,
    version: {
      ...createdVersion,
      status: asPackStatus(createdVersion.status)
    } as typeof createdVersion & { status: PackStatusValue }
  };
}
