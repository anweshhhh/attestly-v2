-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedWorkspaceId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceDocument" (
    "id" TEXT NOT NULL,
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
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidenceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceChunk" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "evidenceFingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIProfileDraftSession" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "basedOnAIProfileId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "currentStepKey" TEXT NOT NULL DEFAULT 'COMPANY_PRODUCT_BASICS',
    "draftPayloadJson" TEXT NOT NULL,
    "fieldStateJson" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "startedByUserId" TEXT NOT NULL,
    "completedAIProfileId" TEXT,
    "lastSavedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIProfileDraftSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIProfile" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "aiUsageMode" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "fieldStateJson" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL,
    "attestedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustPack" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "currentVersionId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrustPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustPackVersion" (
    "id" TEXT NOT NULL,
    "trustPackId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "aiProfileId" TEXT NOT NULL,
    "createdFromVersionId" TEXT,
    "generationInputHash" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrustPackVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRecord" (
    "id" TEXT NOT NULL,
    "trustPackVersionId" TEXT NOT NULL,
    "approvedByUserId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustPackSection" (
    "id" TEXT NOT NULL,
    "trustPackVersionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "summaryText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrustPackSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustPackClaim" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "answerText" TEXT,
    "status" TEXT NOT NULL,
    "origin" TEXT NOT NULL DEFAULT 'GENERATED',
    "missingDetailsText" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrustPackClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Citation" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceDocumentId" TEXT,
    "sourceChunkId" TEXT,
    "sourceAIProfileId" TEXT,
    "sourceFieldPath" TEXT,
    "quotedSnippet" TEXT,
    "locator" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Citation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportRecord" (
    "id" TEXT NOT NULL,
    "trustPackVersionId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "exportedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExportRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_workspaceId_userId_key" ON "Membership"("workspaceId", "userId");

-- CreateIndex
CREATE INDEX "EvidenceDocument_workspaceId_createdAt_idx" ON "EvidenceDocument"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "EvidenceDocument_workspaceId_status_idx" ON "EvidenceDocument"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EvidenceChunk_documentId_chunkIndex_key" ON "EvidenceChunk"("documentId", "chunkIndex");

-- CreateIndex
CREATE INDEX "AIProfileDraftSession_workspaceId_status_idx" ON "AIProfileDraftSession"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "AIProfileDraftSession_workspaceId_createdAt_idx" ON "AIProfileDraftSession"("workspaceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AIProfileDraftSession_workspaceId_in_progress_key" ON "AIProfileDraftSession"("workspaceId") WHERE "status" = 'IN_PROGRESS';

-- CreateIndex
CREATE INDEX "AIProfile_workspaceId_createdAt_idx" ON "AIProfile"("workspaceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AIProfile_workspaceId_versionNumber_key" ON "AIProfile"("workspaceId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TrustPack_workspaceId_key" ON "TrustPack"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "TrustPack_currentVersionId_key" ON "TrustPack"("currentVersionId");

-- CreateIndex
CREATE INDEX "TrustPackVersion_trustPackId_status_idx" ON "TrustPackVersion"("trustPackId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TrustPackVersion_trustPackId_versionNumber_key" ON "TrustPackVersion"("trustPackId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalRecord_trustPackVersionId_key" ON "ApprovalRecord"("trustPackVersionId");

-- CreateIndex
CREATE INDEX "ApprovalRecord_approvedByUserId_idx" ON "ApprovalRecord"("approvedByUserId");

-- CreateIndex
CREATE INDEX "TrustPackSection_trustPackVersionId_orderIndex_idx" ON "TrustPackSection"("trustPackVersionId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "TrustPackSection_trustPackVersionId_key_key" ON "TrustPackSection"("trustPackVersionId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "TrustPackSection_trustPackVersionId_orderIndex_key" ON "TrustPackSection"("trustPackVersionId", "orderIndex");

-- CreateIndex
CREATE INDEX "TrustPackClaim_sectionId_status_idx" ON "TrustPackClaim"("sectionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TrustPackClaim_sectionId_key_key" ON "TrustPackClaim"("sectionId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "TrustPackClaim_sectionId_orderIndex_key" ON "TrustPackClaim"("sectionId", "orderIndex");

-- CreateIndex
CREATE INDEX "Citation_claimId_orderIndex_idx" ON "Citation"("claimId", "orderIndex");

-- CreateIndex
CREATE INDEX "Citation_sourceDocumentId_idx" ON "Citation"("sourceDocumentId");

-- CreateIndex
CREATE INDEX "Citation_sourceChunkId_idx" ON "Citation"("sourceChunkId");

-- CreateIndex
CREATE INDEX "Citation_sourceAIProfileId_idx" ON "Citation"("sourceAIProfileId");

-- CreateIndex
CREATE INDEX "ExportRecord_trustPackVersionId_createdAt_idx" ON "ExportRecord"("trustPackVersionId", "createdAt");

-- CreateIndex
CREATE INDEX "ExportRecord_exportedByUserId_idx" ON "ExportRecord"("exportedByUserId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_lastUsedWorkspaceId_fkey" FOREIGN KEY ("lastUsedWorkspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceDocument" ADD CONSTRAINT "EvidenceDocument_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceChunk" ADD CONSTRAINT "EvidenceChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "EvidenceDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIProfileDraftSession" ADD CONSTRAINT "AIProfileDraftSession_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIProfileDraftSession" ADD CONSTRAINT "AIProfileDraftSession_basedOnAIProfileId_fkey" FOREIGN KEY ("basedOnAIProfileId") REFERENCES "AIProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIProfileDraftSession" ADD CONSTRAINT "AIProfileDraftSession_startedByUserId_fkey" FOREIGN KEY ("startedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIProfileDraftSession" ADD CONSTRAINT "AIProfileDraftSession_completedAIProfileId_fkey" FOREIGN KEY ("completedAIProfileId") REFERENCES "AIProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIProfile" ADD CONSTRAINT "AIProfile_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIProfile" ADD CONSTRAINT "AIProfile_attestedByUserId_fkey" FOREIGN KEY ("attestedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustPack" ADD CONSTRAINT "TrustPack_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustPack" ADD CONSTRAINT "TrustPack_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "TrustPackVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustPack" ADD CONSTRAINT "TrustPack_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustPackVersion" ADD CONSTRAINT "TrustPackVersion_trustPackId_fkey" FOREIGN KEY ("trustPackId") REFERENCES "TrustPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustPackVersion" ADD CONSTRAINT "TrustPackVersion_aiProfileId_fkey" FOREIGN KEY ("aiProfileId") REFERENCES "AIProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustPackVersion" ADD CONSTRAINT "TrustPackVersion_createdFromVersionId_fkey" FOREIGN KEY ("createdFromVersionId") REFERENCES "TrustPackVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustPackVersion" ADD CONSTRAINT "TrustPackVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRecord" ADD CONSTRAINT "ApprovalRecord_trustPackVersionId_fkey" FOREIGN KEY ("trustPackVersionId") REFERENCES "TrustPackVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRecord" ADD CONSTRAINT "ApprovalRecord_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustPackSection" ADD CONSTRAINT "TrustPackSection_trustPackVersionId_fkey" FOREIGN KEY ("trustPackVersionId") REFERENCES "TrustPackVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustPackClaim" ADD CONSTRAINT "TrustPackClaim_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "TrustPackSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "TrustPackClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "EvidenceDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_sourceChunkId_fkey" FOREIGN KEY ("sourceChunkId") REFERENCES "EvidenceChunk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_sourceAIProfileId_fkey" FOREIGN KEY ("sourceAIProfileId") REFERENCES "AIProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportRecord" ADD CONSTRAINT "ExportRecord_trustPackVersionId_fkey" FOREIGN KEY ("trustPackVersionId") REFERENCES "TrustPackVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportRecord" ADD CONSTRAINT "ExportRecord_exportedByUserId_fkey" FOREIGN KEY ("exportedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
