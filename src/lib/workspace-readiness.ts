import type { MembershipRole } from "@/lib/domain";
import { can } from "@/lib/rbac";
import { getAIProfileProgressSummary } from "@/lib/ai-profiles";
import { getEvidenceReadinessSummary } from "@/lib/evidence";
import {
  getTrustPackGenerationReadinessByWorkspaceId,
  type TrustPackGenerationReadinessState
} from "@/lib/trust-packs";
import { requireWorkspaceAccess } from "@/lib/workspaces";

export type WorkspaceReadinessState = {
  workspaceName: string;
  workspaceSlug: string;
  role: MembershipRole;
  canEditAIProfile: boolean;
  canCreateTrustPackVersion: boolean;
  evidence: {
    totalDocuments: number;
    citationReadyDocuments: number;
    processingErrors: number;
    archivedDocuments: number;
  };
  aiProfile: {
    status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
    activeDraft: {
      id: string;
      currentStepKey: string;
      lastSavedAt: Date;
    } | null;
    latestProfile: {
      id: string;
      versionNumber: number;
      aiUsageMode: string;
      createdAt: Date;
    } | null;
  };
  trustPack: {
    hasLogicalPack: boolean;
    readinessState: TrustPackGenerationReadinessState;
    currentVersion: {
      id: string;
      versionNumber: number;
      status: string;
      createdAt: Date;
      updatedAt: Date;
      aiProfileVersionNumber: number;
      aiUsageMode: string;
    } | null;
    canCreateDraftVersion: boolean;
    canRegenerateStaleVersion: boolean;
  };
};

export async function getWorkspaceReadinessState(userId: string, workspaceSlug: string): Promise<WorkspaceReadinessState> {
  const access = await requireWorkspaceAccess(userId, workspaceSlug, "VIEW_HOME");

  const [evidence, aiProfileProgress, trustPackReadiness] = await Promise.all([
    getEvidenceReadinessSummary(access.workspace.id),
    getAIProfileProgressSummary(access.workspace.id),
    getTrustPackGenerationReadinessByWorkspaceId(access.workspace.id)
  ]);

  let aiProfileStatus: WorkspaceReadinessState["aiProfile"]["status"] = "NOT_STARTED";
  if (aiProfileProgress.latestProfile) {
    aiProfileStatus = "COMPLETED";
  }
  if (aiProfileProgress.activeDraft) {
    aiProfileStatus = "IN_PROGRESS";
  }

  return {
    workspaceName: access.workspace.name,
    workspaceSlug: access.workspace.slug,
    role: access.role,
    canEditAIProfile: can(access.role, "EDIT_AI_PROFILE_DRAFT"),
    canCreateTrustPackVersion: can(access.role, "CREATE_TRUST_PACK_VERSION"),
    evidence,
    aiProfile: {
      status: aiProfileStatus,
      activeDraft: aiProfileProgress.activeDraft,
      latestProfile: aiProfileProgress.latestProfile
    },
    trustPack: {
      hasLogicalPack: trustPackReadiness.trustPack.hasLogicalPack,
      readinessState: trustPackReadiness.state,
      currentVersion: trustPackReadiness.trustPack.currentVersion
        ? {
            id: trustPackReadiness.trustPack.currentVersion.id,
            versionNumber: trustPackReadiness.trustPack.currentVersion.versionNumber,
            status: trustPackReadiness.trustPack.currentVersion.status,
            createdAt: trustPackReadiness.trustPack.currentVersion.createdAt,
            updatedAt: trustPackReadiness.trustPack.currentVersion.updatedAt,
            aiProfileVersionNumber: trustPackReadiness.trustPack.currentVersion.aiProfileVersionNumber,
            aiUsageMode: trustPackReadiness.trustPack.currentVersion.aiUsageMode
          }
        : null,
      canCreateDraftVersion: trustPackReadiness.canGenerateInitialDraft,
      canRegenerateStaleVersion: trustPackReadiness.canRegenerateStaleVersion
    }
  };
}
