import type { MembershipRole } from "@/lib/domain";
import { can } from "@/lib/rbac";
import { getWorkspaceReadinessState } from "@/lib/workspace-readiness";

export type HomeState = {
  workspaceName: string;
  workspaceSlug: string;
  role: MembershipRole;
  evidence: {
    totalDocuments: number;
    citationReadyDocuments: number;
    processingErrors: number;
  };
  aiProfileStatus: {
    label: "Not started" | "In progress" | "Completed";
    description: string;
  };
  trustPackStatus: {
    label: "Not created" | "Ready for first version" | "Current version" | "Stale";
    description: string;
    currentVersionNumber: number | null;
    currentVersionStatus: string | null;
  };
  dominantAction: {
    kind: "link" | "generate" | "regenerate";
    label: string;
    href: string | null;
    description: string;
  };
};

export async function getHomeState(userId: string, workspaceSlug: string): Promise<HomeState> {
  const readiness = await getWorkspaceReadinessState(userId, workspaceSlug);

  let dominantAction: HomeState["dominantAction"] = {
    kind: "link",
    label: "Upload evidence",
    href: `/w/${readiness.workspaceSlug}/evidence`,
    description: "Start with trust-relevant evidence so the workspace becomes citation-ready."
  };

  if (readiness.evidence.totalDocuments > 0 && !readiness.aiProfile.latestProfile) {
    dominantAction = {
      kind: "link",
      label: readiness.aiProfile.activeDraft ? "Continue AI profile" : "Complete AI profile",
      href: `/w/${readiness.workspaceSlug}/ai-profile`,
      description:
        "Evidence is present. The next truthful setup step is a completed AI Profile attestation before trust-pack generation becomes available."
    };
  } else if (!readiness.trustPack.currentVersion && readiness.trustPack.canCreateDraftVersion) {
    dominantAction = can(readiness.role, "GENERATE_INITIAL_TRUST_PACK_VERSION")
      ? {
          kind: "generate",
          label: "Generate trust pack",
          href: null,
          description:
            "Evidence and AI Profile inputs are ready. Generate the first draft version for this workspace's single Trust Pack."
        }
      : {
          kind: "link",
          label: "Open trust packs",
          href: `/w/${readiness.workspaceSlug}/trust-packs`,
          description:
            "Inputs are ready, but your role is read-only for generation. Open the current Trust Packs surface to review readiness."
        };
  } else if (readiness.trustPack.currentVersion?.status === "STALE") {
    dominantAction = readiness.trustPack.canRegenerateStaleVersion && can(readiness.role, "REGENERATE_STALE_TRUST_PACK_VERSION")
      ? {
          kind: "regenerate",
          label: "Regenerate new version",
          href: null,
          description:
            "Newer evidence or AI Profile input has made the current version stale. Generate a fresh draft version without mutating history."
        }
      : {
          kind: "link",
          label: "Open trust pack",
          href: `/w/${readiness.workspaceSlug}/trust-packs`,
          description:
            "The current trust-pack version is stale after newer inputs landed. Open the current version and review the outdated claims and provenance."
        };
  } else if (readiness.trustPack.currentVersion) {
    dominantAction = {
      kind: "link",
      label: "Open trust pack",
      href: `/w/${readiness.workspaceSlug}/trust-packs`,
      description:
        "Open the workspace's current trust-pack version and inspect sections, claim statuses, citations, and lifecycle state."
    };
  } else if (readiness.evidence.citationReadyDocuments > 0) {
    dominantAction = {
      kind: "link",
      label: "Open evidence library",
      href: `/w/${readiness.workspaceSlug}/evidence`,
      description:
        "Your workspace has citation-ready evidence. Keep the evidence base healthy while the remaining trust-pack inputs come online."
    };
  }

  let aiProfileStatus: HomeState["aiProfileStatus"] = {
    label: "Not started",
    description: readiness.canEditAIProfile
      ? "The AI Profile is the next setup step once evidence exists. NONE remains a valid minimal attestation path."
      : "No completed AI Profile exists yet. Your role is read-only for wizard work."
  };

  if (readiness.aiProfile.status === "IN_PROGRESS") {
    aiProfileStatus = {
      label: "In progress",
      description: "An in-progress AI Profile draft exists for this workspace and can be resumed without losing explicit unknowns."
    };
  } else if (readiness.aiProfile.status === "COMPLETED") {
    aiProfileStatus = {
      label: "Completed",
      description: `AI Profile v${readiness.aiProfile.latestProfile?.versionNumber ?? "?"} is completed and now part of trust-pack readiness.`
    };
  }

  let trustPackStatus: HomeState["trustPackStatus"] = {
    label: "Not created",
    description:
      readiness.trustPack.canCreateDraftVersion && !readiness.trustPack.currentVersion
        ? "The workspace is ready for the first generated draft version."
        : "No trust-pack version exists yet for this workspace.",
    currentVersionNumber: null,
    currentVersionStatus: null
  };

  if (!readiness.trustPack.currentVersion && readiness.trustPack.canCreateDraftVersion) {
    trustPackStatus = {
      label: "Ready for first version",
      description: "The workspace has citation-ready evidence and a completed AI Profile. It is ready for first-version generation.",
      currentVersionNumber: null,
      currentVersionStatus: null
    };
  } else if (readiness.trustPack.currentVersion?.status === "STALE") {
    trustPackStatus = {
      label: "Stale",
      description: "The current version is viewable but outdated because newer evidence or AI profile inputs exist.",
      currentVersionNumber: readiness.trustPack.currentVersion.versionNumber,
      currentVersionStatus: readiness.trustPack.currentVersion.status
    };
  } else if (readiness.trustPack.currentVersion) {
    trustPackStatus = {
      label: "Current version",
      description: `Version ${readiness.trustPack.currentVersion.versionNumber} is the workspace's current trust-pack record.`,
      currentVersionNumber: readiness.trustPack.currentVersion.versionNumber,
      currentVersionStatus: readiness.trustPack.currentVersion.status
    };
  }

  return {
    workspaceName: readiness.workspaceName,
    workspaceSlug: readiness.workspaceSlug,
    role: readiness.role,
    evidence: {
      totalDocuments: readiness.evidence.totalDocuments,
      citationReadyDocuments: readiness.evidence.citationReadyDocuments,
      processingErrors: readiness.evidence.processingErrors
    },
    aiProfileStatus,
    trustPackStatus,
    dominantAction
  };
}
