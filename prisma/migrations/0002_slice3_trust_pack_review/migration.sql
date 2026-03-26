PRAGMA foreign_keys=OFF;

CREATE TABLE IF NOT EXISTS "TrustPackSection" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "trustPackVersionId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "orderIndex" INTEGER NOT NULL,
  "summaryText" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrustPackSection_trustPackVersionId_fkey"
    FOREIGN KEY ("trustPackVersionId") REFERENCES "TrustPackVersion" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "TrustPackSection_trustPackVersionId_key_key"
  ON "TrustPackSection"("trustPackVersionId", "key");
CREATE UNIQUE INDEX IF NOT EXISTS "TrustPackSection_trustPackVersionId_orderIndex_key"
  ON "TrustPackSection"("trustPackVersionId", "orderIndex");
CREATE INDEX IF NOT EXISTS "TrustPackSection_trustPackVersionId_orderIndex_idx"
  ON "TrustPackSection"("trustPackVersionId", "orderIndex");

CREATE TABLE IF NOT EXISTS "TrustPackClaim" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sectionId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "answerText" TEXT,
  "status" TEXT NOT NULL,
  "origin" TEXT NOT NULL DEFAULT 'GENERATED',
  "missingDetailsText" TEXT,
  "orderIndex" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrustPackClaim_sectionId_fkey"
    FOREIGN KEY ("sectionId") REFERENCES "TrustPackSection" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "TrustPackClaim_sectionId_key_key"
  ON "TrustPackClaim"("sectionId", "key");
CREATE UNIQUE INDEX IF NOT EXISTS "TrustPackClaim_sectionId_orderIndex_key"
  ON "TrustPackClaim"("sectionId", "orderIndex");
CREATE INDEX IF NOT EXISTS "TrustPackClaim_sectionId_status_idx"
  ON "TrustPackClaim"("sectionId", "status");

CREATE TABLE IF NOT EXISTS "Citation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "claimId" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceDocumentId" TEXT,
  "sourceChunkId" TEXT,
  "sourceAIProfileId" TEXT,
  "sourceFieldPath" TEXT,
  "quotedSnippet" TEXT,
  "locator" TEXT,
  "orderIndex" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Citation_claimId_fkey"
    FOREIGN KEY ("claimId") REFERENCES "TrustPackClaim" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Citation_sourceDocumentId_fkey"
    FOREIGN KEY ("sourceDocumentId") REFERENCES "EvidenceDocument" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Citation_sourceChunkId_fkey"
    FOREIGN KEY ("sourceChunkId") REFERENCES "EvidenceChunk" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Citation_sourceAIProfileId_fkey"
    FOREIGN KEY ("sourceAIProfileId") REFERENCES "AIProfile" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Citation_claimId_orderIndex_idx"
  ON "Citation"("claimId", "orderIndex");
CREATE INDEX IF NOT EXISTS "Citation_sourceDocumentId_idx"
  ON "Citation"("sourceDocumentId");
CREATE INDEX IF NOT EXISTS "Citation_sourceChunkId_idx"
  ON "Citation"("sourceChunkId");
CREATE INDEX IF NOT EXISTS "Citation_sourceAIProfileId_idx"
  ON "Citation"("sourceAIProfileId");

PRAGMA foreign_keys=ON;
