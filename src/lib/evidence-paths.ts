export function sanitizeEvidenceFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-{2,}/g, "-");
}

export function buildWorkspaceEvidencePathPrefix(workspaceId: string) {
  return `workspaces/${workspaceId}/evidence/`;
}

export function buildEvidenceBlobPath(params: {
  workspaceId: string;
  uploadId: string;
  fileName: string;
}) {
  return `${buildWorkspaceEvidencePathPrefix(params.workspaceId)}${params.uploadId}-${sanitizeEvidenceFilename(
    params.fileName
  )}`;
}

export function isWorkspaceEvidenceBlobPath(pathname: string, workspaceId: string) {
  return pathname.startsWith(buildWorkspaceEvidencePathPrefix(workspaceId));
}
