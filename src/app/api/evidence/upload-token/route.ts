import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { MAX_EVIDENCE_FILE_BYTES } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth";
import { isWorkspaceEvidenceBlobPath } from "@/lib/evidence-paths";
import { AppError } from "@/lib/errors";
import { ALLOWED_EVIDENCE_UPLOAD_CONTENT_TYPES } from "@/lib/extract-text";
import { requireWorkspaceAccess } from "@/lib/workspaces";

type UploadTokenRequest = {
  workspaceSlug?: string;
  workspaceId?: string;
  pathname?: string;
  byteSize?: number;
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = (await request.json()) as UploadTokenRequest;
  const workspaceSlug = body.workspaceSlug?.trim();
  const workspaceId = body.workspaceId?.trim();
  const pathname = body.pathname?.trim();
  const byteSize = typeof body.byteSize === "number" ? body.byteSize : Number.NaN;

  if (!workspaceSlug || !workspaceId || !pathname || !Number.isFinite(byteSize)) {
    return Response.json({ error: "Upload token request is missing required fields." }, { status: 400 });
  }

  if (byteSize < 1 || byteSize > MAX_EVIDENCE_FILE_BYTES) {
    return Response.json({ error: "Files must be 10 MB or smaller in phase 1." }, { status: 400 });
  }

  try {
    const access = await requireWorkspaceAccess(user.id, workspaceSlug, "UPLOAD_EVIDENCE");

    if (access.workspace.id !== workspaceId) {
      return Response.json({ error: "Workspace identity mismatch." }, { status: 400 });
    }

    if (!isWorkspaceEvidenceBlobPath(pathname, access.workspace.id)) {
      return Response.json({ error: "Evidence uploads must stay inside the active workspace." }, { status: 400 });
    }

    const clientToken = await generateClientTokenFromReadWriteToken({
      pathname,
      // The Blob runtime payload accepts access even though the published TS type omits it.
      access: "private",
      maximumSizeInBytes: MAX_EVIDENCE_FILE_BYTES,
      allowedContentTypes: [...ALLOWED_EVIDENCE_UPLOAD_CONTENT_TYPES],
      validUntil: Date.now() + 5 * 60 * 1000,
      addRandomSuffix: false,
      allowOverwrite: false
    } as Parameters<typeof generateClientTokenFromReadWriteToken>[0] & { access: "private" });

    return Response.json({ clientToken });
  } catch (error) {
    if (error instanceof AppError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    return Response.json({ error: "We couldn't prepare that upload." }, { status: 500 });
  }
}
