import { randomUUID } from "node:crypto";
import { MAX_EVIDENCE_FILE_BYTES } from "@/lib/env";
import { DocumentStatus } from "@/lib/domain";
import { buildEvidenceBlobPath, isWorkspaceEvidenceBlobPath } from "@/lib/evidence-paths";
import { AppError } from "@/lib/errors";
import { chunkText } from "@/lib/chunker";
import { extractTextFromBytes } from "@/lib/extract-text";
import { sha256 } from "@/lib/fingerprint";
import { prisma } from "@/lib/prisma";
import {
  headStoredEvidenceObject,
  putStoredEvidenceObject,
  readStoredEvidenceBytes
} from "@/lib/storage";
import { markCurrentTrustPackVersionStale } from "@/lib/trust-packs";
import { requireWorkspaceAccess } from "@/lib/workspaces";

export type EvidenceReadinessSummary = {
  totalDocuments: number;
  citationReadyDocuments: number;
  processingErrors: number;
  archivedDocuments: number;
};

function normalizeEvidenceMimeType(mimeType: string | null | undefined) {
  const normalized = mimeType?.trim();
  return normalized || "application/octet-stream";
}

function assertEvidenceByteSize(byteLength: number) {
  if (byteLength === 0) {
    throw new AppError("Choose a file to upload.", {
      code: "EMPTY_FILE",
      status: 400
    });
  }

  if (byteLength > MAX_EVIDENCE_FILE_BYTES) {
    throw new AppError("Files must be 10 MB or smaller in phase 1.", {
      code: "FILE_TOO_LARGE",
      status: 400
    });
  }
}

export async function getEvidenceReadinessSummary(workspaceId: string): Promise<EvidenceReadinessSummary> {
  const docs = await prisma.evidenceDocument.findMany({
    where: { workspaceId },
    select: {
      status: true,
      archivedAt: true
    }
  });

  return docs.reduce<EvidenceReadinessSummary>(
    (summary, doc) => {
      summary.totalDocuments += 1;
      if (doc.status === DocumentStatus.CHUNKED) {
        summary.citationReadyDocuments += 1;
      }
      if (doc.status === DocumentStatus.ERROR) {
        summary.processingErrors += 1;
      }
      if (doc.archivedAt) {
        summary.archivedDocuments += 1;
      }
      return summary;
    },
    {
      totalDocuments: 0,
      citationReadyDocuments: 0,
      processingErrors: 0,
      archivedDocuments: 0
    }
  );
}

export async function listEvidenceDocuments(userId: string, workspaceSlug: string) {
  const access = await requireWorkspaceAccess(userId, workspaceSlug, "VIEW_EVIDENCE");

  const documents = await prisma.evidenceDocument.findMany({
    where: {
      workspaceId: access.workspace.id
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  const readiness = await getEvidenceReadinessSummary(access.workspace.id);

  return {
    access,
    documents,
    readiness
  };
}

async function processDocument(params: {
  documentId: string;
  fileName: string;
  mimeType: string;
  bytes: Buffer;
}) {
  const extractedText = await extractTextFromBytes({
    bytes: params.bytes,
    mimeType: params.mimeType,
    fileName: params.fileName
  });
  const chunks = chunkText(extractedText);

  if (chunks.length === 0) {
    throw new AppError("We couldn't extract usable text from this document.", {
      code: "EMPTY_EXTRACTION",
      status: 400
    });
  }

  const evidenceFingerprint = sha256(params.bytes);

  await prisma.evidenceChunk.deleteMany({
    where: {
      documentId: params.documentId
    }
  });

  await prisma.evidenceChunk.createMany({
    data: chunks.map((content, chunkIndex) => ({
      documentId: params.documentId,
      chunkIndex,
      content,
      evidenceFingerprint
    }))
  });

  await prisma.evidenceDocument.update({
    where: {
      id: params.documentId
    },
    data: {
      status: DocumentStatus.CHUNKED,
      chunkCount: chunks.length,
      errorMessage: null,
      evidenceFingerprint
    }
  });
}

async function createAndProcessEvidenceDocument(params: {
  workspaceId: string;
  userId: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  storagePath: string;
  bytes: Buffer;
}) {
  assertEvidenceByteSize(params.byteSize);

  const document = await prisma.evidenceDocument.create({
    data: {
      workspaceId: params.workspaceId,
      name: params.fileName,
      originalName: params.fileName,
      mimeType: normalizeEvidenceMimeType(params.mimeType),
      storagePath: params.storagePath,
      byteSize: params.byteSize,
      status: DocumentStatus.UPLOADED,
      uploadedByUserId: params.userId
    }
  });

  try {
    await processDocument({
      documentId: document.id,
      fileName: params.fileName,
      mimeType: normalizeEvidenceMimeType(params.mimeType),
      bytes: params.bytes
    });
    await markCurrentTrustPackVersionStale(params.workspaceId);
  } catch (error) {
    await prisma.evidenceDocument.update({
      where: { id: document.id },
      data: {
        status: DocumentStatus.ERROR,
        errorMessage: error instanceof Error ? error.message : "Processing failed."
      }
    });

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("We couldn't process that document.", {
      code: "PROCESSING_FAILED",
      status: 500
    });
  }

  return prisma.evidenceDocument.findUniqueOrThrow({
    where: {
      id: document.id
    }
  });
}

export async function uploadEvidenceDocument(params: {
  userId: string;
  workspaceSlug: string;
  fileName: string;
  mimeType: string;
  bytes: Buffer;
}) {
  const access = await requireWorkspaceAccess(params.userId, params.workspaceSlug, "UPLOAD_EVIDENCE");
  const mimeType = normalizeEvidenceMimeType(params.mimeType);

  assertEvidenceByteSize(params.bytes.byteLength);

  const storedObject = await putStoredEvidenceObject({
    pathname: buildEvidenceBlobPath({
      workspaceId: access.workspace.id,
      uploadId: randomUUID(),
      fileName: params.fileName
    }),
    bytes: params.bytes,
    contentType: mimeType
  });

  return createAndProcessEvidenceDocument({
    workspaceId: access.workspace.id,
    userId: access.userId,
    fileName: params.fileName,
    mimeType,
    byteSize: params.bytes.byteLength,
    storagePath: storedObject.pathname,
    bytes: params.bytes
  });
}

export async function finalizeEvidenceBlobUpload(params: {
  userId: string;
  workspaceSlug: string;
  fileName: string;
  mimeType: string;
  storagePath: string;
}) {
  const access = await requireWorkspaceAccess(params.userId, params.workspaceSlug, "UPLOAD_EVIDENCE");

  if (!isWorkspaceEvidenceBlobPath(params.storagePath, access.workspace.id)) {
    throw new AppError("Uploaded evidence path is outside this workspace.", {
      code: "INVALID_STORAGE_PATH",
      status: 400
    });
  }

  const storedObject = await headStoredEvidenceObject(params.storagePath);
  assertEvidenceByteSize(storedObject.size);
  const bytes = await readStoredEvidenceBytes(params.storagePath);

  return createAndProcessEvidenceDocument({
    workspaceId: access.workspace.id,
    userId: access.userId,
    fileName: params.fileName,
    mimeType: params.mimeType || storedObject.contentType,
    byteSize: storedObject.size,
    storagePath: params.storagePath,
    bytes
  });
}

export async function retryEvidenceDocument(params: {
  userId: string;
  workspaceSlug: string;
  documentId: string;
}) {
  const access = await requireWorkspaceAccess(params.userId, params.workspaceSlug, "RETRY_EVIDENCE");

  const document = await prisma.evidenceDocument.findFirst({
    where: {
      id: params.documentId,
      workspaceId: access.workspace.id
    }
  });

  if (!document) {
    throw new AppError("Evidence document not found.", {
      code: "DOCUMENT_NOT_FOUND",
      status: 404
    });
  }

  if (!document.storagePath) {
    throw new AppError("This document is missing stored file data.", {
      code: "MISSING_STORAGE_PATH",
      status: 400
    });
  }

  const bytes = await readStoredEvidenceBytes(document.storagePath);

  await prisma.evidenceDocument.update({
    where: { id: document.id },
    data: {
      status: DocumentStatus.UPLOADED,
      errorMessage: null,
      chunkCount: 0,
      evidenceFingerprint: null
    }
  });

  try {
    await processDocument({
      documentId: document.id,
      fileName: document.originalName,
      mimeType: document.mimeType,
      bytes
    });
    await markCurrentTrustPackVersionStale(access.workspace.id);
  } catch (error) {
    await prisma.evidenceDocument.update({
      where: { id: document.id },
      data: {
        status: DocumentStatus.ERROR,
        errorMessage: error instanceof Error ? error.message : "Retry failed."
      }
    });
    throw error;
  }
}

export async function archiveEvidenceDocument(params: {
  userId: string;
  workspaceSlug: string;
  documentId: string;
}) {
  const access = await requireWorkspaceAccess(params.userId, params.workspaceSlug, "ARCHIVE_EVIDENCE");

  const document = await prisma.evidenceDocument.findFirst({
    where: {
      id: params.documentId,
      workspaceId: access.workspace.id
    }
  });

  if (!document) {
    throw new AppError("Evidence document not found.", {
      code: "DOCUMENT_NOT_FOUND",
      status: 404
    });
  }

  await prisma.evidenceChunk.deleteMany({
    where: {
      documentId: document.id
    }
  });

  await prisma.evidenceDocument.update({
    where: { id: document.id },
    data: {
      status: DocumentStatus.ARCHIVED,
      archivedAt: new Date(),
      chunkCount: 0
    }
  });

  await markCurrentTrustPackVersionStale(access.workspace.id);
}
