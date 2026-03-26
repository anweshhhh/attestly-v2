import pdfParse from "pdf-parse";
import { AppError } from "@/lib/errors";

export const TEXT_EVIDENCE_MIME_TYPES = [
  "text/plain",
  "text/markdown",
  "application/json",
  "application/xml",
  "text/csv"
] as const;

const TEXT_MIME_TYPES = new Set<string>(TEXT_EVIDENCE_MIME_TYPES);

export const ALLOWED_EVIDENCE_UPLOAD_CONTENT_TYPES = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/xml",
  "application/pdf",
  "application/octet-stream"
] as const;

export async function extractTextFromBytes(params: {
  bytes: Buffer;
  mimeType: string;
  fileName: string;
}) {
  if (TEXT_MIME_TYPES.has(params.mimeType)) {
    return params.bytes.toString("utf8");
  }

  if (params.mimeType === "application/pdf" || params.fileName.toLowerCase().endsWith(".pdf")) {
    const parsed = await pdfParse(params.bytes);
    return parsed.text;
  }

  throw new AppError("This file type is not supported for Slice 1 evidence processing yet.", {
    code: "UNSUPPORTED_FILE_TYPE",
    status: 400
  });
}
