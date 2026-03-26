import { AppError } from "@/lib/errors";
import { type MembershipRole } from "@/lib/domain";

export const WorkspaceAction = {
  VIEW_HOME: "VIEW_HOME",
  VIEW_EVIDENCE: "VIEW_EVIDENCE",
  VIEW_TEAM: "VIEW_TEAM",
  VIEW_TRUST_PACKS: "VIEW_TRUST_PACKS",
  VIEW_AI_PROFILE: "VIEW_AI_PROFILE",
  START_AI_PROFILE_DRAFT: "START_AI_PROFILE_DRAFT",
  EDIT_AI_PROFILE_DRAFT: "EDIT_AI_PROFILE_DRAFT",
  COMPLETE_AI_PROFILE: "COMPLETE_AI_PROFILE",
  VIEW_CURRENT_TRUST_PACK: "VIEW_CURRENT_TRUST_PACK",
  VIEW_TRUST_PACK_VERSION_PROVENANCE: "VIEW_TRUST_PACK_VERSION_PROVENANCE",
  GENERATE_INITIAL_TRUST_PACK_VERSION: "GENERATE_INITIAL_TRUST_PACK_VERSION",
  REGENERATE_STALE_TRUST_PACK_VERSION: "REGENERATE_STALE_TRUST_PACK_VERSION",
  MARK_TRUST_PACK_READY_FOR_REVIEW: "MARK_TRUST_PACK_READY_FOR_REVIEW",
  SEND_TRUST_PACK_BACK_TO_DRAFT: "SEND_TRUST_PACK_BACK_TO_DRAFT",
  CREATE_TRUST_PACK_VERSION: "CREATE_TRUST_PACK_VERSION",
  APPROVE_TRUST_PACK_VERSION: "APPROVE_TRUST_PACK_VERSION",
  EXPORT_TRUST_PACK_VERSION: "EXPORT_TRUST_PACK_VERSION",
  UPLOAD_EVIDENCE: "UPLOAD_EVIDENCE",
  RETRY_EVIDENCE: "RETRY_EVIDENCE",
  ARCHIVE_EVIDENCE: "ARCHIVE_EVIDENCE",
  UPDATE_WORKSPACE: "UPDATE_WORKSPACE",
  INVITE_MEMBERS: "INVITE_MEMBERS",
  UPDATE_MEMBER_ROLE: "UPDATE_MEMBER_ROLE"
} as const;

export type WorkspaceAction = (typeof WorkspaceAction)[keyof typeof WorkspaceAction];

const ROLE_WEIGHT: Record<MembershipRole, number> = {
  VIEWER: 1,
  REVIEWER: 2,
  ADMIN: 3,
  OWNER: 4
};

const ACTION_MIN_ROLE: Record<WorkspaceAction, MembershipRole> = {
  [WorkspaceAction.VIEW_HOME]: "VIEWER",
  [WorkspaceAction.VIEW_EVIDENCE]: "VIEWER",
  [WorkspaceAction.VIEW_TEAM]: "VIEWER",
  [WorkspaceAction.VIEW_TRUST_PACKS]: "VIEWER",
  [WorkspaceAction.VIEW_AI_PROFILE]: "VIEWER",
  [WorkspaceAction.START_AI_PROFILE_DRAFT]: "REVIEWER",
  [WorkspaceAction.EDIT_AI_PROFILE_DRAFT]: "REVIEWER",
  [WorkspaceAction.COMPLETE_AI_PROFILE]: "REVIEWER",
  [WorkspaceAction.VIEW_CURRENT_TRUST_PACK]: "VIEWER",
  [WorkspaceAction.VIEW_TRUST_PACK_VERSION_PROVENANCE]: "VIEWER",
  [WorkspaceAction.GENERATE_INITIAL_TRUST_PACK_VERSION]: "REVIEWER",
  [WorkspaceAction.REGENERATE_STALE_TRUST_PACK_VERSION]: "REVIEWER",
  [WorkspaceAction.MARK_TRUST_PACK_READY_FOR_REVIEW]: "REVIEWER",
  [WorkspaceAction.SEND_TRUST_PACK_BACK_TO_DRAFT]: "REVIEWER",
  [WorkspaceAction.CREATE_TRUST_PACK_VERSION]: "REVIEWER",
  [WorkspaceAction.APPROVE_TRUST_PACK_VERSION]: "ADMIN",
  [WorkspaceAction.EXPORT_TRUST_PACK_VERSION]: "REVIEWER",
  [WorkspaceAction.UPLOAD_EVIDENCE]: "REVIEWER",
  [WorkspaceAction.RETRY_EVIDENCE]: "REVIEWER",
  [WorkspaceAction.ARCHIVE_EVIDENCE]: "ADMIN",
  [WorkspaceAction.UPDATE_WORKSPACE]: "ADMIN",
  [WorkspaceAction.INVITE_MEMBERS]: "ADMIN",
  [WorkspaceAction.UPDATE_MEMBER_ROLE]: "ADMIN"
};

export function can(role: MembershipRole, action: WorkspaceAction) {
  return ROLE_WEIGHT[role] >= ROLE_WEIGHT[ACTION_MIN_ROLE[action]];
}

export function assertCan(role: MembershipRole, action: WorkspaceAction) {
  if (!can(role, action)) {
    throw new AppError(`Requires ${ACTION_MIN_ROLE[action]} access.`, {
      code: "FORBIDDEN",
      status: 403
    });
  }
}

export function canAssignRole(actorRole: MembershipRole, targetRole: MembershipRole) {
  if (actorRole === "OWNER") {
    return targetRole !== "OWNER";
  }

  if (actorRole === "ADMIN") {
    return targetRole === "REVIEWER" || targetRole === "VIEWER";
  }

  return false;
}
