import { getCurrentUser } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { getTrustPackExportDownload } from "@/lib/trust-pack-lifecycle";

type TrustPackExportRouteProps = {
  params: {
    workspaceSlug: string;
    exportRecordId: string;
  };
};

export async function GET(_request: Request, props: TrustPackExportRouteProps) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Authentication required.", {
      status: 401
    });
  }

  try {
    const download = await getTrustPackExportDownload({
      userId: user.id,
      workspaceSlug: props.params.workspaceSlug,
      exportRecordId: props.params.exportRecordId
    });

    return new Response(download.content, {
      status: 200,
      headers: {
        "Content-Type": `${download.mimeType}; charset=utf-8`,
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Disposition": `attachment; filename="${download.fileName}"`
      }
    });
  } catch (error) {
    if (error instanceof AppError) {
      return new Response(error.message, {
        status: error.status
      });
    }

    return new Response("Unable to build Trust Pack export.", {
      status: 500
    });
  }
}
