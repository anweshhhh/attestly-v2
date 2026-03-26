import { Prisma, type PrismaClient } from "@prisma/client";
import {
  asAIUsageMode,
  asWizardDraftStatus,
  asWizardStepKey,
  firstWizardStepKey,
  isWizardFieldState,
  type AIUsageMode as AIUsageModeValue,
  type MembershipRole as MembershipRoleValue,
  type WizardDraftStatus as WizardDraftStatusValue,
  type WizardFieldState as WizardFieldStateValue,
  type WizardStepKey as WizardStepKeyValue
} from "@/lib/domain";
import {
  createEmptyWizardFieldState,
  createEmptyWizardPayload,
  hydrateWizardFieldState,
  hydrateWizardPayload,
  resolveCompletedAIUsageMode,
  resolveWizardProvenancePath,
  validateWizardForCompletion,
  type WizardFieldStatePayload,
  type WizardPayload
} from "@/lib/ai-profile-wizard-contract";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { markCurrentTrustPackVersionStaleTx } from "@/lib/trust-packs";
import { requireWorkspaceAccess } from "@/lib/workspaces";

type PrismaTx = Prisma.TransactionClient | PrismaClient;

type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = {
  [key: string]: JsonValue;
};

export type WizardFieldStateTree = {
  [key: string]: WizardFieldStateValue | WizardFieldStateTree | WizardFieldStateTree[];
};

const DEFAULT_SCHEMA_VERSION = 1;

export type AIProfileProgressSummary = {
  activeDraft: {
    id: string;
    status: WizardDraftStatusValue;
    currentStepKey: WizardStepKeyValue;
    lastSavedAt: Date;
  } | null;
  latestProfile: {
    id: string;
    versionNumber: number;
    aiUsageMode: AIUsageModeValue;
    createdAt: Date;
  } | null;
};

export type AIProfileDraftSessionRecord = {
  id: string;
  workspaceId: string;
  basedOnAIProfileId: string | null;
  status: WizardDraftStatusValue;
  currentStepKey: WizardStepKeyValue;
  draftPayloadJson: WizardPayload;
  fieldStateJson: WizardFieldStatePayload;
  schemaVersion: number;
  startedByUserId: string;
  completedAIProfileId: string | null;
  lastSavedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type AIProfileRecord = {
  id: string;
  workspaceId: string;
  versionNumber: number;
  aiUsageMode: AIUsageModeValue;
  payloadJson: WizardPayload;
  fieldStateJson: WizardFieldStatePayload;
  schemaVersion: number;
  attestedByUserId: string;
  createdAt: Date;
};

export type AIProfileWizardProvenanceRecord = {
  aiProfileId: string;
  versionNumber: number;
  aiUsageMode: AIUsageModeValue;
  path: string;
  topLevelFieldKey: string;
  itemId: string | null;
  childFieldKey: string | null;
  value: unknown;
  fieldState: WizardFieldStateValue | null;
  citableInTrustPack: boolean;
};

export type AIProfileWizardPageData = {
  workspaceName: string;
  workspaceSlug: string;
  role: MembershipRoleValue;
  canEdit: boolean;
  activeDraft: AIProfileDraftSessionRecord | null;
  latestProfile: AIProfileRecord | null;
  initialDraft: {
    draftSessionId: string | null;
    basedOnAIProfileId: string | null;
    currentStepKey: WizardStepKeyValue;
    draftPayloadJson: WizardPayload;
    fieldStateJson: WizardFieldStatePayload;
    schemaVersion: number;
    lastSavedAt: Date | null;
  };
};

function assertSchemaVersion(schemaVersion: number) {
  if (!Number.isInteger(schemaVersion) || schemaVersion < 1) {
    throw new AppError("Schema version must be a positive integer.", {
      code: "INVALID_SCHEMA_VERSION",
      status: 400
    });
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertJsonValue(value: unknown, fieldName: string): JsonValue {
  if (value === null) {
    return value;
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new AppError(`${fieldName} must contain only finite numbers.`, {
        code: "INVALID_JSON_VALUE",
        status: 400
      });
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry, index) => assertJsonValue(entry, `${fieldName}[${index}]`));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, assertJsonValue(entry, `${fieldName}.${key}`)])
    );
  }

  throw new AppError(`${fieldName} must contain only JSON-compatible values.`, {
    code: "INVALID_JSON_VALUE",
    status: 400
  });
}

function assertJsonObject(value: unknown, fieldName: string): JsonObject {
  if (!isPlainObject(value)) {
    throw new AppError(`${fieldName} must be a JSON object.`, {
      code: "INVALID_JSON_OBJECT",
      status: 400
    });
  }

  return assertJsonValue(value, fieldName) as JsonObject;
}

function stripUndefinedJsonValue(value: unknown, fieldName: string): JsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return value;
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new AppError(`${fieldName} must contain only finite numbers.`, {
        code: "INVALID_JSON_VALUE",
        status: 400
      });
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((entry, index) => stripUndefinedJsonValue(entry, `${fieldName}[${index}]`))
      .filter((entry): entry is JsonValue => entry !== undefined);
  }

  if (isPlainObject(value)) {
    const nextEntries = Object.entries(value).flatMap(([key, entry]) => {
      const normalizedEntry = stripUndefinedJsonValue(entry, `${fieldName}.${key}`);
      if (normalizedEntry === undefined) {
        return [];
      }

      return [[key, normalizedEntry] as const];
    });

    return Object.fromEntries(nextEntries);
  }

  throw new AppError(`${fieldName} must contain only JSON-compatible values.`, {
    code: "INVALID_JSON_VALUE",
    status: 400
  });
}

function sanitizeJsonObject(value: unknown, fieldName: string): JsonObject {
  if (!isPlainObject(value)) {
    throw new AppError(`${fieldName} must be a JSON object.`, {
      code: "INVALID_JSON_OBJECT",
      status: 400
    });
  }

  const sanitized = stripUndefinedJsonValue(value, fieldName);
  if (!isPlainObject(sanitized)) {
    throw new AppError(`${fieldName} must be a JSON object.`, {
      code: "INVALID_JSON_OBJECT",
      status: 400
    });
  }

  return sanitized as JsonObject;
}

function assertWizardFieldStateTree(value: unknown, path = "fieldStateJson"): WizardFieldStateValue | WizardFieldStateTree | WizardFieldStateTree[] {
  if (Array.isArray(value)) {
    return value.map((entry, index) => assertWizardFieldStateTree(entry, `${path}[${index}]`)) as WizardFieldStateTree[];
  }

  if (typeof value === "string") {
    if (isWizardFieldState(value)) {
      return value;
    }

    throw new AppError(`Invalid wizard field-state value at ${path}.`, {
      code: "INVALID_FIELD_STATE_JSON",
      status: 400
    });
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, assertWizardFieldStateTree(entry, `${path}.${key}`)])
    );
  }

  throw new AppError(`Invalid wizard field-state value at ${path}.`, {
    code: "INVALID_FIELD_STATE_JSON",
    status: 400
  });
}

function normalizeFieldStateJson(value: unknown): WizardFieldStateTree {
  const objectValue = assertJsonObject(value, "fieldStateJson");
  return assertWizardFieldStateTree(objectValue) as WizardFieldStateTree;
}

function serializeJsonObject(value: JsonObject) {
  return JSON.stringify(value);
}

function parseStoredJsonObject(raw: string, fieldName: string): JsonObject {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AppError(`${fieldName} contains invalid stored JSON.`, {
      code: "INVALID_STORED_JSON",
      status: 500
    });
  }

  return assertJsonObject(parsed, fieldName);
}

function parseStoredFieldStateJson(raw: string): WizardFieldStateTree {
  const parsed = parseStoredJsonObject(raw, "fieldStateJson");
  return assertWizardFieldStateTree(parsed) as WizardFieldStateTree;
}

function normalizeDraftSessionRecord(
  draftSession: {
    id: string;
    workspaceId: string;
    basedOnAIProfileId: string | null;
    status: string;
    currentStepKey: string;
    draftPayloadJson: string;
    fieldStateJson: string;
    schemaVersion: number;
    startedByUserId: string;
    completedAIProfileId: string | null;
    lastSavedAt: Date;
    createdAt: Date;
    updatedAt: Date;
  } | null
): AIProfileDraftSessionRecord | null {
  if (!draftSession) {
    return null;
  }

  return {
    id: draftSession.id,
    workspaceId: draftSession.workspaceId,
    basedOnAIProfileId: draftSession.basedOnAIProfileId,
    status: asWizardDraftStatus(draftSession.status),
    currentStepKey: asWizardStepKey(draftSession.currentStepKey),
    draftPayloadJson: hydrateWizardPayload(parseStoredJsonObject(draftSession.draftPayloadJson, "draftPayloadJson")),
    fieldStateJson: hydrateWizardFieldState(parseStoredFieldStateJson(draftSession.fieldStateJson)),
    schemaVersion: draftSession.schemaVersion,
    startedByUserId: draftSession.startedByUserId,
    completedAIProfileId: draftSession.completedAIProfileId,
    lastSavedAt: draftSession.lastSavedAt,
    createdAt: draftSession.createdAt,
    updatedAt: draftSession.updatedAt
  };
}

function normalizeAIProfileRecord(profile: {
  id: string;
  workspaceId: string;
  versionNumber: number;
  aiUsageMode: string;
  payloadJson: string;
  fieldStateJson: string;
  schemaVersion: number;
  attestedByUserId: string;
  createdAt: Date;
}): AIProfileRecord {
  return {
    id: profile.id,
    workspaceId: profile.workspaceId,
    versionNumber: profile.versionNumber,
    aiUsageMode: asAIUsageMode(profile.aiUsageMode),
    payloadJson: hydrateWizardPayload(parseStoredJsonObject(profile.payloadJson, "payloadJson")),
    fieldStateJson: hydrateWizardFieldState(parseStoredFieldStateJson(profile.fieldStateJson)),
    schemaVersion: profile.schemaVersion,
    attestedByUserId: profile.attestedByUserId,
    createdAt: profile.createdAt
  };
}

async function assertBasedOnProfileBelongsToWorkspace(
  tx: PrismaTx,
  workspaceId: string,
  basedOnAIProfileId: string | null | undefined
) {
  if (!basedOnAIProfileId) {
    return null;
  }

  const profile = await tx.aIProfile.findFirst({
    where: {
      id: basedOnAIProfileId,
      workspaceId
    }
  });

  if (!profile) {
    throw new AppError("The referenced AI Profile version does not belong to this workspace.", {
      code: "AI_PROFILE_NOT_FOUND",
      status: 404
    });
  }

  return profile;
}

async function getInProgressDraftSessionTx(tx: PrismaTx, workspaceId: string) {
  return tx.aIProfileDraftSession.findFirst({
    where: {
      workspaceId,
      status: "IN_PROGRESS"
    },
    orderBy: {
      updatedAt: "desc"
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

function buildInitialWizardDraftState(params: {
  activeDraft: AIProfileDraftSessionRecord | null;
  latestProfile: AIProfileRecord | null;
}) {
  if (params.activeDraft) {
    return {
      draftSessionId: params.activeDraft.id,
      basedOnAIProfileId: params.activeDraft.basedOnAIProfileId,
      currentStepKey: params.activeDraft.currentStepKey,
      draftPayloadJson: hydrateWizardPayload(params.activeDraft.draftPayloadJson),
      fieldStateJson: hydrateWizardFieldState(params.activeDraft.fieldStateJson),
      schemaVersion: params.activeDraft.schemaVersion,
      lastSavedAt: params.activeDraft.lastSavedAt
    };
  }

  if (params.latestProfile) {
    return {
      draftSessionId: null,
      basedOnAIProfileId: params.latestProfile.id,
      currentStepKey: firstWizardStepKey,
      draftPayloadJson: hydrateWizardPayload(params.latestProfile.payloadJson),
      fieldStateJson: hydrateWizardFieldState(params.latestProfile.fieldStateJson),
      schemaVersion: params.latestProfile.schemaVersion,
      lastSavedAt: null
    };
  }

  return {
    draftSessionId: null,
    basedOnAIProfileId: null,
    currentStepKey: firstWizardStepKey,
    draftPayloadJson: createEmptyWizardPayload(),
    fieldStateJson: createEmptyWizardFieldState(),
    schemaVersion: DEFAULT_SCHEMA_VERSION,
    lastSavedAt: null
  };
}

export async function getAIProfileProgressSummary(workspaceId: string): Promise<AIProfileProgressSummary> {
  const [activeDraft, latestProfile] = await Promise.all([
    prisma.aIProfileDraftSession.findFirst({
      where: {
        workspaceId,
        status: "IN_PROGRESS"
      },
      orderBy: {
        updatedAt: "desc"
      }
    }),
    getLatestAIProfileTx(prisma, workspaceId)
  ]);

  return {
    activeDraft: activeDraft
      ? {
          id: activeDraft.id,
          status: asWizardDraftStatus(activeDraft.status),
          currentStepKey: asWizardStepKey(activeDraft.currentStepKey),
          lastSavedAt: activeDraft.lastSavedAt
        }
      : null,
    latestProfile: latestProfile
      ? {
          id: latestProfile.id,
          versionNumber: latestProfile.versionNumber,
          aiUsageMode: asAIUsageMode(latestProfile.aiUsageMode),
          createdAt: latestProfile.createdAt
        }
      : null
  };
}

export async function getLatestAIProfile(userId: string, workspaceSlug: string) {
  const access = await requireWorkspaceAccess(userId, workspaceSlug, "VIEW_AI_PROFILE");
  const latestProfile = await getLatestAIProfileTx(prisma, access.workspace.id);
  return latestProfile ? normalizeAIProfileRecord(latestProfile) : null;
}

export async function getAIProfileWizardPageData(userId: string, workspaceSlug: string): Promise<AIProfileWizardPageData> {
  const access = await requireWorkspaceAccess(userId, workspaceSlug, "VIEW_AI_PROFILE");
  const canEdit = can(access.role, "EDIT_AI_PROFILE_DRAFT");

  const [activeDraftRecord, latestProfileRecord] = await Promise.all([
    canEdit ? getInProgressDraftSessionTx(prisma, access.workspace.id) : Promise.resolve(null),
    getLatestAIProfileTx(prisma, access.workspace.id)
  ]);

  const activeDraft = canEdit ? normalizeDraftSessionRecord(activeDraftRecord) : null;
  const latestProfile = latestProfileRecord ? normalizeAIProfileRecord(latestProfileRecord) : null;

  return {
    workspaceName: access.workspace.name,
    workspaceSlug: access.workspace.slug,
    role: access.role,
    canEdit,
    activeDraft,
    latestProfile,
    initialDraft: buildInitialWizardDraftState({
      activeDraft,
      latestProfile
    })
  };
}

export async function getActiveAIProfileDraftSession(userId: string, workspaceSlug: string) {
  const access = await requireWorkspaceAccess(userId, workspaceSlug, "EDIT_AI_PROFILE_DRAFT");
  const draftSession = await getInProgressDraftSessionTx(prisma, access.workspace.id);
  return normalizeDraftSessionRecord(draftSession);
}

export async function saveAIProfileDraftSession(params: {
  userId: string;
  workspaceSlug: string;
  basedOnAIProfileId?: string | null;
  currentStepKey: string;
  draftPayloadJson: unknown;
  fieldStateJson: unknown;
  schemaVersion?: number;
}) {
  const access = await requireWorkspaceAccess(params.userId, params.workspaceSlug, "EDIT_AI_PROFILE_DRAFT");
  const currentStepKey = asWizardStepKey(params.currentStepKey);
  const schemaVersion = params.schemaVersion ?? DEFAULT_SCHEMA_VERSION;
  const rawDraftPayloadJson = assertJsonObject(params.draftPayloadJson, "draftPayloadJson");
  const rawFieldStateJson = normalizeFieldStateJson(params.fieldStateJson);
  assertSchemaVersion(schemaVersion);

  const draftPayloadJson = sanitizeJsonObject(hydrateWizardPayload(rawDraftPayloadJson), "draftPayloadJson");
  const fieldStateJson = sanitizeJsonObject(hydrateWizardFieldState(rawFieldStateJson), "fieldStateJson");

  const serializedDraftPayloadJson = serializeJsonObject(draftPayloadJson);
  const serializedFieldStateJson = serializeJsonObject(fieldStateJson);

  const savedDraftSession = await prisma.$transaction(async (tx) => {
    await assertBasedOnProfileBelongsToWorkspace(tx, access.workspace.id, params.basedOnAIProfileId);

    const existing = await getInProgressDraftSessionTx(tx, access.workspace.id);
    const now = new Date();

    if (existing) {
      return tx.aIProfileDraftSession.update({
        where: {
          id: existing.id
        },
        data: {
          basedOnAIProfileId: params.basedOnAIProfileId ?? null,
          currentStepKey,
          draftPayloadJson: serializedDraftPayloadJson,
          fieldStateJson: serializedFieldStateJson,
          schemaVersion,
          lastSavedAt: now
        }
      });
    }

    return tx.aIProfileDraftSession.create({
      data: {
        workspaceId: access.workspace.id,
        basedOnAIProfileId: params.basedOnAIProfileId ?? null,
        status: "IN_PROGRESS",
        currentStepKey,
        draftPayloadJson: serializedDraftPayloadJson,
        fieldStateJson: serializedFieldStateJson,
        schemaVersion,
        startedByUserId: access.userId,
        lastSavedAt: now
      }
    });
  });

  return normalizeDraftSessionRecord(savedDraftSession);
}

export async function abandonAIProfileDraftSession(params: {
  userId: string;
  workspaceSlug: string;
  draftSessionId: string;
}) {
  const access = await requireWorkspaceAccess(params.userId, params.workspaceSlug, "EDIT_AI_PROFILE_DRAFT");

  const draftSession = await prisma.aIProfileDraftSession.findFirst({
    where: {
      id: params.draftSessionId,
      workspaceId: access.workspace.id
    }
  });

  if (!draftSession) {
    throw new AppError("AI Profile draft session not found.", {
      code: "AI_PROFILE_DRAFT_NOT_FOUND",
      status: 404
    });
  }

  if (draftSession.status !== "IN_PROGRESS") {
    throw new AppError("Only an in-progress AI Profile draft can be abandoned.", {
      code: "AI_PROFILE_DRAFT_NOT_IN_PROGRESS",
      status: 400
    });
  }

  const abandonedDraft = await prisma.aIProfileDraftSession.update({
    where: {
      id: draftSession.id
    },
    data: {
      status: "ABANDONED",
      lastSavedAt: new Date()
    }
  });

  return normalizeDraftSessionRecord(abandonedDraft);
}

export async function completeAIProfileDraftSession(params: {
  userId: string;
  workspaceSlug: string;
  draftSessionId: string;
}) {
  const access = await requireWorkspaceAccess(params.userId, params.workspaceSlug, "COMPLETE_AI_PROFILE");

  const createdProfile = await prisma.$transaction(async (tx) => {
    const draftSession = await tx.aIProfileDraftSession.findFirst({
      where: {
        id: params.draftSessionId,
        workspaceId: access.workspace.id
      }
    });

    if (!draftSession) {
      throw new AppError("AI Profile draft session not found.", {
        code: "AI_PROFILE_DRAFT_NOT_FOUND",
        status: 404
      });
    }

    if (draftSession.status !== "IN_PROGRESS") {
      throw new AppError("Only an in-progress AI Profile draft can be completed.", {
        code: "AI_PROFILE_DRAFT_NOT_IN_PROGRESS",
        status: 400
      });
    }

    const draftPayload = hydrateWizardPayload(parseStoredJsonObject(draftSession.draftPayloadJson, "draftPayloadJson"));
    const fieldState = hydrateWizardFieldState(parseStoredFieldStateJson(draftSession.fieldStateJson));
    const completionErrors = validateWizardForCompletion(draftPayload, fieldState);
    const resolvedAIUsageMode = resolveCompletedAIUsageMode(draftPayload, fieldState);

    if (Object.keys(completionErrors).length > 0 || !resolvedAIUsageMode.aiUsageMode) {
      const firstError = completionErrors.ai_usage_mode ?? Object.values(completionErrors)[0] ?? resolvedAIUsageMode.error;
      throw new AppError(firstError ?? "Resolve the required AI Profile fields before completing.", {
        code: "AI_PROFILE_DRAFT_INCOMPLETE",
        status: 400
      });
    }

    const nextVersionNumber =
      (await tx.aIProfile.aggregate({
        where: {
          workspaceId: access.workspace.id
        },
        _max: {
          versionNumber: true
        }
      }))._max.versionNumber ?? 0;

    const newProfile = await tx.aIProfile.create({
      data: {
        workspaceId: access.workspace.id,
        versionNumber: nextVersionNumber + 1,
        aiUsageMode: resolvedAIUsageMode.aiUsageMode,
        payloadJson: serializeJsonObject(sanitizeJsonObject(draftPayload, "draftPayloadJson")),
        fieldStateJson: serializeJsonObject(sanitizeJsonObject(fieldState, "fieldStateJson")),
        schemaVersion: draftSession.schemaVersion,
        attestedByUserId: access.userId
      }
    });

    await tx.aIProfileDraftSession.update({
      where: {
        id: draftSession.id
      },
      data: {
        status: "COMPLETED",
        completedAIProfileId: newProfile.id,
        lastSavedAt: new Date()
      }
    });

    await markCurrentTrustPackVersionStaleTx(tx, access.workspace.id);

    return newProfile;
  });

  return normalizeAIProfileRecord(createdProfile);
}

export async function resolveAIProfileWizardProvenance(params: {
  userId: string;
  workspaceSlug: string;
  aiProfileId: string;
  path: string;
}): Promise<AIProfileWizardProvenanceRecord> {
  const access = await requireWorkspaceAccess(params.userId, params.workspaceSlug, "VIEW_AI_PROFILE");
  const profile = await prisma.aIProfile.findFirst({
    where: {
      id: params.aiProfileId,
      workspaceId: access.workspace.id
    }
  });

  if (!profile) {
    throw new AppError("AI Profile version not found for this workspace.", {
      code: "AI_PROFILE_NOT_FOUND",
      status: 404
    });
  }

  const payload = hydrateWizardPayload(parseStoredJsonObject(profile.payloadJson, "payloadJson"));
  const fieldState = hydrateWizardFieldState(parseStoredFieldStateJson(profile.fieldStateJson));
  const resolution = resolveWizardProvenancePath({
    payload,
    fieldState,
    path: params.path
  });

  if (!resolution) {
    throw new AppError("Wizard provenance path not found on this AI Profile version.", {
      code: "AI_PROFILE_PROVENANCE_NOT_FOUND",
      status: 404
    });
  }

  return {
    aiProfileId: profile.id,
    versionNumber: profile.versionNumber,
    aiUsageMode: asAIUsageMode(profile.aiUsageMode),
    path: resolution.path,
    topLevelFieldKey: resolution.topLevelFieldKey,
    itemId: resolution.itemId,
    childFieldKey: resolution.childFieldKey,
    value: resolution.value,
    fieldState: resolution.fieldState,
    citableInTrustPack: resolution.citableInTrustPack
  };
}
