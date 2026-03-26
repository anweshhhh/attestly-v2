"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { put } from "@vercel/blob/client";
import { finalizeEvidenceBlobUploadAction } from "@/app/actions";
import { buildEvidenceBlobPath } from "@/lib/evidence-paths";

type EvidenceUploadCardProps = {
  workspaceId: string;
  workspaceSlug: string;
  maxBytes: number;
};

export function EvidenceUploadCard(props: EvidenceUploadCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleSubmit(formData: FormData) {
    const file = formData.get("file");
    if (!(file instanceof File)) {
      setError("Choose a file to upload.");
      return;
    }

    if (file.size > props.maxBytes) {
      setError("Files must be 10 MB or smaller in phase 1.");
      return;
    }

    setError(null);
    setNotice(null);
    setProgressPercent(0);

    const pathname = buildEvidenceBlobPath({
      workspaceId: props.workspaceId,
      uploadId: crypto.randomUUID(),
      fileName: file.name
    });

    try {
      const tokenResponse = await fetch("/api/evidence/upload-token", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          workspaceSlug: props.workspaceSlug,
          workspaceId: props.workspaceId,
          pathname,
          byteSize: file.size
        })
      });

      const tokenBody = (await tokenResponse.json()) as { clientToken?: string; error?: string };
      if (!tokenResponse.ok || !tokenBody.clientToken) {
        throw new Error(tokenBody.error || "We couldn't start that evidence upload.");
      }

      await put(pathname, file, {
        access: "private",
        token: tokenBody.clientToken,
        contentType: file.type || "application/octet-stream",
        multipart: file.size > 5 * 1024 * 1024,
        onUploadProgress: (event) => {
          setProgressPercent(Math.round(event.percentage));
        }
      });

      const finalizeResult = await finalizeEvidenceBlobUploadAction({
        workspaceSlug: props.workspaceSlug,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        storagePath: pathname
      });

      if (!finalizeResult.ok) {
        throw new Error(finalizeResult.error || "We couldn't finish processing that evidence upload.");
      }

      setNotice("Evidence uploaded and processed.");
      setProgressPercent(100);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      router.refresh();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Evidence upload failed.");
      setProgressPercent(null);
      router.refresh();
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => {
          void handleSubmit(formData);
        });
      }}
      className="card card-muted stack"
    >
      <label className="stack">
        <span>Upload trust-relevant evidence</span>
        <input ref={fileInputRef} name="file" type="file" required disabled={isPending} />
      </label>
      <p className="muted" style={{ margin: 0 }}>
        Files upload directly to Attestly&apos;s evidence store, then process into citation-usable chunks for the
        current workspace.
      </p>
      {progressPercent !== null ? (
        <div className="stack" style={{ gap: 6 }}>
          <div className="progress-bar" aria-hidden="true">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="muted">{progressPercent < 100 ? `Uploading ${progressPercent}%` : "Processing upload"}</span>
        </div>
      ) : null}
      {error ? <p className="error-text">{error}</p> : null}
      {notice ? <p className="notice-text">{notice}</p> : null}
      <div>
        <button className="button" type="submit" disabled={isPending}>
          {isPending ? "Uploading evidence..." : "Upload evidence"}
        </button>
      </div>
    </form>
  );
}
