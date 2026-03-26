"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ExportFormat, membershipRoles } from "@/lib/domain";
import { getErrorMessage } from "@/lib/errors";
import { requireCurrentUser } from "@/lib/auth";
import {
  completeAIProfileDraftSession,
  saveAIProfileDraftSession,
  type WizardFieldStateTree,
  type JsonObject
} from "@/lib/ai-profiles";
import { generateCurrentTrustPackDraft } from "@/lib/trust-pack-generation";
import {
  approveVersion,
  exportVersion,
  markReadyForReview,
  sendBackToDraft
} from "@/lib/trust-pack-lifecycle";
import {
  addWorkspaceMember,
  renameWorkspace,
  updateWorkspaceMemberRole
} from "@/lib/workspaces";
import {
  archiveEvidenceDocument,
  finalizeEvidenceBlobUpload,
  retryEvidenceDocument
} from "@/lib/evidence";

function withMessage(path: string, kind: "notice" | "error", message: string) {
  const url = new URL(path, "http://localhost");
  url.searchParams.set(kind, message);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

export async function finalizeEvidenceBlobUploadAction(params: {
  workspaceSlug: string;
  fileName: string;
  mimeType: string;
  storagePath: string;
}) {
  const user = await requireCurrentUser();

  try {
    await finalizeEvidenceBlobUpload({
      userId: user.id,
      workspaceSlug: params.workspaceSlug,
      fileName: params.fileName,
      mimeType: params.mimeType,
      storagePath: params.storagePath
    });

    revalidatePath(`/w/${params.workspaceSlug}`);
    revalidatePath(`/w/${params.workspaceSlug}/evidence`);
    revalidatePath(`/w/${params.workspaceSlug}/trust-packs`);

    return {
      ok: true
    };
  } catch (error) {
    revalidatePath(`/w/${params.workspaceSlug}`);
    revalidatePath(`/w/${params.workspaceSlug}/evidence`);
    revalidatePath(`/w/${params.workspaceSlug}/trust-packs`);

    return {
      ok: false,
      error: getErrorMessage(error, "We couldn't finish processing that evidence upload.")
    };
  }
}

export async function retryEvidenceAction(workspaceSlug: string, documentId: string) {
  const user = await requireCurrentUser();

  try {
    await retryEvidenceDocument({
      userId: user.id,
      workspaceSlug,
      documentId
    });
  } catch (error) {
    redirect(withMessage(`/w/${workspaceSlug}/evidence`, "error", getErrorMessage(error)));
  }

  revalidatePath(`/w/${workspaceSlug}`);
  revalidatePath(`/w/${workspaceSlug}/evidence`);
  redirect(withMessage(`/w/${workspaceSlug}/evidence`, "notice", "Evidence processing retried."));
}

export async function archiveEvidenceAction(workspaceSlug: string, documentId: string) {
  const user = await requireCurrentUser();

  try {
    await archiveEvidenceDocument({
      userId: user.id,
      workspaceSlug,
      documentId
    });
  } catch (error) {
    redirect(withMessage(`/w/${workspaceSlug}/evidence`, "error", getErrorMessage(error)));
  }

  revalidatePath(`/w/${workspaceSlug}`);
  revalidatePath(`/w/${workspaceSlug}/evidence`);
  revalidatePath(`/w/${workspaceSlug}/trust-packs`);
  redirect(withMessage(`/w/${workspaceSlug}/evidence`, "notice", "Evidence archived."));
}

export async function renameWorkspaceAction(workspaceSlug: string, formData: FormData) {
  const user = await requireCurrentUser();
  const name = String(formData.get("name") || "");

  try {
    await renameWorkspace(user.id, workspaceSlug, name);
  } catch (error) {
    redirect(withMessage(`/w/${workspaceSlug}/settings/team`, "error", getErrorMessage(error)));
  }

  revalidatePath(`/w/${workspaceSlug}`);
  revalidatePath(`/w/${workspaceSlug}/settings/team`);
  redirect(withMessage(`/w/${workspaceSlug}/settings/team`, "notice", "Workspace details updated."));
}

function parseMembershipRole(value: FormDataEntryValue | null) {
  const role = String(value || "").toUpperCase();
  if (membershipRoles.includes(role as (typeof membershipRoles)[number])) {
    return role as (typeof membershipRoles)[number];
  }

  throw new Error("Invalid role.");
}

export async function addMemberAction(workspaceSlug: string, formData: FormData) {
  const user = await requireCurrentUser();

  try {
    await addWorkspaceMember({
      userId: user.id,
      workspaceSlug,
      email: String(formData.get("email") || ""),
      name: String(formData.get("name") || ""),
      role: parseMembershipRole(formData.get("role"))
    });
  } catch (error) {
    redirect(withMessage(`/w/${workspaceSlug}/settings/team`, "error", getErrorMessage(error)));
  }

  revalidatePath(`/w/${workspaceSlug}/settings/team`);
  redirect(withMessage(`/w/${workspaceSlug}/settings/team`, "notice", "Team member added."));
}

export async function updateMemberRoleAction(workspaceSlug: string, membershipId: string, formData: FormData) {
  const user = await requireCurrentUser();

  try {
    await updateWorkspaceMemberRole({
      userId: user.id,
      workspaceSlug,
      membershipId,
      role: parseMembershipRole(formData.get("role"))
    });
  } catch (error) {
    redirect(withMessage(`/w/${workspaceSlug}/settings/team`, "error", getErrorMessage(error)));
  }

  revalidatePath(`/w/${workspaceSlug}/settings/team`);
  redirect(withMessage(`/w/${workspaceSlug}/settings/team`, "notice", "Member role updated."));
}

export async function saveAIProfileDraftAction(params: {
  workspaceSlug: string;
  basedOnAIProfileId?: string | null;
  currentStepKey: string;
  draftPayloadJson: JsonObject;
  fieldStateJson: WizardFieldStateTree;
  schemaVersion?: number;
}) {
  const user = await requireCurrentUser();

  try {
    const draft = await saveAIProfileDraftSession({
      userId: user.id,
      workspaceSlug: params.workspaceSlug,
      basedOnAIProfileId: params.basedOnAIProfileId ?? null,
      currentStepKey: params.currentStepKey,
      draftPayloadJson: params.draftPayloadJson,
      fieldStateJson: params.fieldStateJson,
      schemaVersion: params.schemaVersion
    });

    revalidatePath(`/w/${params.workspaceSlug}`);
    revalidatePath(`/w/${params.workspaceSlug}/evidence`);
    revalidatePath(`/w/${params.workspaceSlug}/ai-profile`);
    revalidatePath(`/w/${params.workspaceSlug}/trust-packs`);

    return {
      ok: true,
      draftSessionId: draft?.id ?? null,
      basedOnAIProfileId: draft?.basedOnAIProfileId ?? params.basedOnAIProfileId ?? null,
      currentStepKey: draft?.currentStepKey ?? params.currentStepKey,
      lastSavedAt: draft?.lastSavedAt.toISOString() ?? null
    };
  } catch (error) {
    return {
      ok: false,
      error: getErrorMessage(error, "We couldn't save this AI Profile draft yet.")
    };
  }
}

export async function completeAIProfileDraftAction(params: {
  workspaceSlug: string;
  draftSessionId: string;
}) {
  const user = await requireCurrentUser();

  try {
    const profile = await completeAIProfileDraftSession({
      userId: user.id,
      workspaceSlug: params.workspaceSlug,
      draftSessionId: params.draftSessionId
    });

    revalidatePath(`/w/${params.workspaceSlug}`);
    revalidatePath(`/w/${params.workspaceSlug}/evidence`);
    revalidatePath(`/w/${params.workspaceSlug}/ai-profile`);
    revalidatePath(`/w/${params.workspaceSlug}/trust-packs`);

    return {
      ok: true,
      aiProfileId: profile.id,
      versionNumber: profile.versionNumber,
      redirectTo: withMessage(`/w/${params.workspaceSlug}/trust-packs`, "notice", "AI Profile completed.")
    };
  } catch (error) {
    return {
      ok: false,
      error: getErrorMessage(error, "We couldn't complete this AI Profile yet.")
    };
  }
}

export async function generateTrustPackDraftAction(workspaceSlug: string) {
  const user = await requireCurrentUser();

  try {
    await generateCurrentTrustPackDraft({
      userId: user.id,
      workspaceSlug
    });
  } catch (error) {
    redirect(withMessage(`/w/${workspaceSlug}/trust-packs`, "error", getErrorMessage(error)));
  }

  revalidatePath(`/w/${workspaceSlug}`);
  revalidatePath(`/w/${workspaceSlug}/trust-packs`);
  redirect(withMessage(`/w/${workspaceSlug}/trust-packs`, "notice", "Trust Pack draft generated."));
}

export async function markTrustPackReadyForReviewAction(workspaceSlug: string, versionId: string) {
  const user = await requireCurrentUser();

  try {
    await markReadyForReview({
      userId: user.id,
      workspaceSlug,
      versionId
    });
  } catch (error) {
    redirect(withMessage(`/w/${workspaceSlug}/trust-packs`, "error", getErrorMessage(error)));
  }

  revalidatePath(`/w/${workspaceSlug}`);
  revalidatePath(`/w/${workspaceSlug}/trust-packs`);
  redirect(withMessage(`/w/${workspaceSlug}/trust-packs`, "notice", "Trust Pack version moved to ready for review."));
}

export async function sendTrustPackBackToDraftAction(workspaceSlug: string, versionId: string) {
  const user = await requireCurrentUser();

  try {
    await sendBackToDraft({
      userId: user.id,
      workspaceSlug,
      versionId
    });
  } catch (error) {
    redirect(withMessage(`/w/${workspaceSlug}/trust-packs`, "error", getErrorMessage(error)));
  }

  revalidatePath(`/w/${workspaceSlug}`);
  revalidatePath(`/w/${workspaceSlug}/trust-packs`);
  redirect(withMessage(`/w/${workspaceSlug}/trust-packs`, "notice", "Trust Pack version returned to draft."));
}

export async function approveTrustPackVersionAction(workspaceSlug: string, versionId: string) {
  const user = await requireCurrentUser();

  try {
    await approveVersion({
      userId: user.id,
      workspaceSlug,
      versionId
    });
  } catch (error) {
    redirect(withMessage(`/w/${workspaceSlug}/trust-packs`, "error", getErrorMessage(error)));
  }

  revalidatePath(`/w/${workspaceSlug}`);
  revalidatePath(`/w/${workspaceSlug}/trust-packs`);
  redirect(withMessage(`/w/${workspaceSlug}/trust-packs`, "notice", "Trust Pack version approved."));
}

export async function exportTrustPackVersionAction(workspaceSlug: string, versionId: string) {
  const user = await requireCurrentUser();
  let exportResult: Awaited<ReturnType<typeof exportVersion>>;

  try {
    exportResult = await exportVersion({
      userId: user.id,
      workspaceSlug,
      versionId,
      format: ExportFormat.MARKDOWN
    });
  } catch (error) {
    redirect(withMessage(`/w/${workspaceSlug}/trust-packs`, "error", getErrorMessage(error)));
  }

  revalidatePath(`/w/${workspaceSlug}`);
  revalidatePath(`/w/${workspaceSlug}/trust-packs`);
  redirect(`/w/${workspaceSlug}/trust-packs/exports/${exportResult.exportRecordId}`);
}
