import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { assertCan, can, WorkspaceAction } from "@/lib/rbac";

describe("future-ready RBAC boundaries", () => {
  it("allows reviewers to work on AI Profile drafts and future trust-pack lifecycle actions", () => {
    expect(can("REVIEWER", WorkspaceAction.START_AI_PROFILE_DRAFT)).toBe(true);
    expect(can("REVIEWER", WorkspaceAction.EDIT_AI_PROFILE_DRAFT)).toBe(true);
    expect(can("REVIEWER", WorkspaceAction.COMPLETE_AI_PROFILE)).toBe(true);
    expect(can("REVIEWER", WorkspaceAction.GENERATE_INITIAL_TRUST_PACK_VERSION)).toBe(true);
    expect(can("REVIEWER", WorkspaceAction.REGENERATE_STALE_TRUST_PACK_VERSION)).toBe(true);
    expect(can("REVIEWER", WorkspaceAction.MARK_TRUST_PACK_READY_FOR_REVIEW)).toBe(true);
    expect(can("REVIEWER", WorkspaceAction.SEND_TRUST_PACK_BACK_TO_DRAFT)).toBe(true);
    expect(can("REVIEWER", WorkspaceAction.CREATE_TRUST_PACK_VERSION)).toBe(true);
    expect(can("REVIEWER", WorkspaceAction.EXPORT_TRUST_PACK_VERSION)).toBe(true);
  });

  it("keeps approval owner/admin-only and viewers read-only for lifecycle mutations", () => {
    expect(can("ADMIN", WorkspaceAction.APPROVE_TRUST_PACK_VERSION)).toBe(true);
    expect(can("OWNER", WorkspaceAction.APPROVE_TRUST_PACK_VERSION)).toBe(true);
    expect(can("REVIEWER", WorkspaceAction.APPROVE_TRUST_PACK_VERSION)).toBe(false);
    expect(can("VIEWER", WorkspaceAction.START_AI_PROFILE_DRAFT)).toBe(false);
    expect(can("VIEWER", WorkspaceAction.VIEW_CURRENT_TRUST_PACK)).toBe(true);
    expect(can("VIEWER", WorkspaceAction.VIEW_TRUST_PACK_VERSION_PROVENANCE)).toBe(true);
    expect(can("VIEWER", WorkspaceAction.VIEW_AI_PROFILE)).toBe(true);
    expect(can("VIEWER", WorkspaceAction.GENERATE_INITIAL_TRUST_PACK_VERSION)).toBe(false);
    expect(can("VIEWER", WorkspaceAction.EXPORT_TRUST_PACK_VERSION)).toBe(false);
  });

  it("throws a forbidden error when a role does not satisfy the future action boundary", () => {
    expect(() => assertCan("VIEWER", WorkspaceAction.REGENERATE_STALE_TRUST_PACK_VERSION)).toThrowError(AppError);
  });
});
