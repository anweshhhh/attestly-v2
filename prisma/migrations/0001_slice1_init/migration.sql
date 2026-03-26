PRAGMA foreign_keys=OFF;

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedWorkspaceId" TEXT,
  CONSTRAINT "User_lastUsedWorkspaceId_fkey"
    FOREIGN KEY ("lastUsedWorkspaceId") REFERENCES "Workspace" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_lastUsedWorkspaceId_idx" ON "User"("lastUsedWorkspaceId");

CREATE TABLE IF NOT EXISTS "Workspace" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "Workspace_slug_key" ON "Workspace"("slug");

CREATE TABLE IF NOT EXISTS "Session" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");

CREATE TABLE IF NOT EXISTS "Membership" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Membership_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Membership_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Membership_workspaceId_userId_key" ON "Membership"("workspaceId", "userId");
CREATE INDEX IF NOT EXISTS "Membership_userId_idx" ON "Membership"("userId");

CREATE TABLE IF NOT EXISTS "EvidenceDocument" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "byteSize" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'UPLOADED',
  "uploadedByUserId" TEXT NOT NULL,
  "errorMessage" TEXT,
  "evidenceFingerprint" TEXT,
  "chunkCount" INTEGER NOT NULL DEFAULT 0,
  "archivedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EvidenceDocument_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "EvidenceDocument_workspaceId_createdAt_idx"
  ON "EvidenceDocument"("workspaceId", "createdAt");
CREATE INDEX IF NOT EXISTS "EvidenceDocument_workspaceId_status_idx"
  ON "EvidenceDocument"("workspaceId", "status");

CREATE TABLE IF NOT EXISTS "EvidenceChunk" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "documentId" TEXT NOT NULL,
  "chunkIndex" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "evidenceFingerprint" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EvidenceChunk_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "EvidenceDocument" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "EvidenceChunk_documentId_chunkIndex_key"
  ON "EvidenceChunk"("documentId", "chunkIndex");

CREATE TABLE IF NOT EXISTS "AIProfile" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "aiUsageMode" TEXT NOT NULL,
  "payloadJson" TEXT NOT NULL,
  "fieldStateJson" TEXT NOT NULL,
  "schemaVersion" INTEGER NOT NULL,
  "attestedByUserId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AIProfile_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AIProfile_attestedByUserId_fkey"
    FOREIGN KEY ("attestedByUserId") REFERENCES "User" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "AIProfile_workspaceId_versionNumber_key"
  ON "AIProfile"("workspaceId", "versionNumber");
CREATE INDEX IF NOT EXISTS "AIProfile_workspaceId_createdAt_idx"
  ON "AIProfile"("workspaceId", "createdAt");

CREATE TABLE IF NOT EXISTS "AIProfileDraftSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "basedOnAIProfileId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
  "currentStepKey" TEXT NOT NULL DEFAULT 'COMPANY_PRODUCT_BASICS',
  "draftPayloadJson" TEXT NOT NULL,
  "fieldStateJson" TEXT NOT NULL,
  "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  "startedByUserId" TEXT NOT NULL,
  "completedAIProfileId" TEXT,
  "lastSavedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AIProfileDraftSession_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AIProfileDraftSession_basedOnAIProfileId_fkey"
    FOREIGN KEY ("basedOnAIProfileId") REFERENCES "AIProfile" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AIProfileDraftSession_startedByUserId_fkey"
    FOREIGN KEY ("startedByUserId") REFERENCES "User" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AIProfileDraftSession_completedAIProfileId_fkey"
    FOREIGN KEY ("completedAIProfileId") REFERENCES "AIProfile" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AIProfileDraftSession_workspaceId_status_idx"
  ON "AIProfileDraftSession"("workspaceId", "status");
CREATE INDEX IF NOT EXISTS "AIProfileDraftSession_workspaceId_createdAt_idx"
  ON "AIProfileDraftSession"("workspaceId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "AIProfileDraftSession_workspaceId_in_progress_key"
  ON "AIProfileDraftSession"("workspaceId")
  WHERE "status" = 'IN_PROGRESS';

CREATE TABLE IF NOT EXISTS "TrustPack" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "currentVersionId" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrustPack_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TrustPack_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TrustPack_currentVersionId_fkey"
    FOREIGN KEY ("currentVersionId") REFERENCES "TrustPackVersion" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "TrustPack_workspaceId_key" ON "TrustPack"("workspaceId");
CREATE UNIQUE INDEX IF NOT EXISTS "TrustPack_currentVersionId_key" ON "TrustPack"("currentVersionId");

CREATE TABLE IF NOT EXISTS "TrustPackVersion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "trustPackId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "aiProfileId" TEXT NOT NULL,
  "createdFromVersionId" TEXT,
  "generationInputHash" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrustPackVersion_trustPackId_fkey"
    FOREIGN KEY ("trustPackId") REFERENCES "TrustPack" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TrustPackVersion_aiProfileId_fkey"
    FOREIGN KEY ("aiProfileId") REFERENCES "AIProfile" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TrustPackVersion_createdFromVersionId_fkey"
    FOREIGN KEY ("createdFromVersionId") REFERENCES "TrustPackVersion" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "TrustPackVersion_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "TrustPackVersion_trustPackId_versionNumber_key"
  ON "TrustPackVersion"("trustPackId", "versionNumber");
CREATE INDEX IF NOT EXISTS "TrustPackVersion_trustPackId_status_idx"
  ON "TrustPackVersion"("trustPackId", "status");

PRAGMA foreign_keys=ON;
