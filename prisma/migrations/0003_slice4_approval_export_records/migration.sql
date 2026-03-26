PRAGMA foreign_keys=OFF;

CREATE TABLE IF NOT EXISTS "ApprovalRecord" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "trustPackVersionId" TEXT NOT NULL,
  "approvedByUserId" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApprovalRecord_trustPackVersionId_fkey"
    FOREIGN KEY ("trustPackVersionId") REFERENCES "TrustPackVersion" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ApprovalRecord_approvedByUserId_fkey"
    FOREIGN KEY ("approvedByUserId") REFERENCES "User" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ApprovalRecord_trustPackVersionId_key"
  ON "ApprovalRecord"("trustPackVersionId");
CREATE INDEX IF NOT EXISTS "ApprovalRecord_approvedByUserId_idx"
  ON "ApprovalRecord"("approvedByUserId");

CREATE TABLE IF NOT EXISTS "ExportRecord" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "trustPackVersionId" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "exportedByUserId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExportRecord_trustPackVersionId_fkey"
    FOREIGN KEY ("trustPackVersionId") REFERENCES "TrustPackVersion" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ExportRecord_exportedByUserId_fkey"
    FOREIGN KEY ("exportedByUserId") REFERENCES "User" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ExportRecord_trustPackVersionId_createdAt_idx"
  ON "ExportRecord"("trustPackVersionId", "createdAt");
CREATE INDEX IF NOT EXISTS "ExportRecord_exportedByUserId_idx"
  ON "ExportRecord"("exportedByUserId");

PRAGMA foreign_keys=ON;
