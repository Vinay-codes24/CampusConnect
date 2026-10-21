"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowUpRight, Download, FileWarning, Loader2 } from "lucide-react";
import { formatBytes, timeAgo } from "@/lib/client";
import { EmptyState, ErrorState, SkeletonCard } from "@/components/ui";
import { SignInPrompt, useAsyncResource } from "@/components/academics/core";
import { Breadcrumbs } from "@/components/academics/library";
import type { StudyFile, StudySubject } from "@/lib/types";

type FolderPayload = {
  subject: StudySubject;
  files: StudyFile[];
  viewer: { id: string; role: string; canManage: boolean };
};

export default function ViewerPage() {
  return (
    <Suspense fallback={<div className="container stack"><SkeletonCard /></div>}>
      <Viewer />
    </Suspense>
  );
}

function Viewer() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const id = typeof params.id === "string" ? params.id : "";
  const fileId = search.get("file") ?? "";
  const { state, retry } = useAsyncResource<FolderPayload>(`/api/library/${encodeURIComponent(id)}`, Boolean(id));

  return (
    <div className="container stack">
      {state.status === "loading" ? <SkeletonCard /> : null}
      {state.status === "error" ? (
        state.auth ? <SignInPrompt /> : <ErrorState message={state.message} onRetry={retry} />
      ) : null}
      {state.status === "ready" ? <ViewerBody payload={state.data} fileId={fileId} onRetry={retry} /> : null}
    </div>
  );
}

function ViewerBody({
  payload,
  fileId,
  onRetry,
}: {
  payload: FolderPayload;
  fileId: string;
  onRetry: () => void;
}) {
  const { subject, files } = payload;
  const file = files.find((f) => f.id === fileId) ?? null;
  const [loaded, setLoaded] = useState(false);

  if (!file) {
    return (
      <div className="stack">
        <Breadcrumbs
          items={[
            { label: "Study Materials", href: "/academics/study-materials" },
            { label: subject.name, href: `/academics/study-materials/${subject.id}` },
            { label: "PDF" },
          ]}
        />
        <EmptyState
          icon={<FileWarning size={26} />}
          title="That PDF could not be found"
          body="It may have been renamed or removed. Go back to the subject folder and pick another document."
          action={
            <Link className="btn btn-primary" href={`/academics/study-materials/${subject.id}`}>
              Back to {subject.name}
            </Link>
          }
        />
      </div>
    );
  }

  const label = file.chapterNo ? `Chapter ${file.chapterNo}` : "Document";

  return (
    <div className="stack">
      <Breadcrumbs
        items={[
          { label: "Study Materials", href: "/academics/study-materials" },
          { label: subject.name, href: `/academics/study-materials/${subject.id}` },
          { label: label },
        ]}
      />

      <div className="lib-viewer">
        <header className="lib-viewer-bar">
          <Link className="btn btn-ghost btn-sm" href={`/academics/study-materials/${subject.id}`}>
            ← Back to folder
          </Link>

          <div className="lib-viewer-title">
            <strong>{file.chapterName || file.name}</strong>
            <span className="text-sm muted">
              {subject.name} · {formatBytes(file.size)} · uploaded {timeAgo(file.uploadedAt)}
            </span>
          </div>

          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <a className="btn btn-soft btn-sm" href={file.url} target="_blank" rel="noreferrer">
              <ArrowUpRight size={15} aria-hidden="true" /> Open in new tab
            </a>
            <a className="btn btn-ghost btn-sm" href={`${file.url}?download=1`} download>
              <Download size={15} aria-hidden="true" /> Download
            </a>
          </div>
        </header>

        <div className="lib-viewer-stage">
          {!loaded ? (
            <div className="lib-viewer-loading" role="status" aria-live="polite">
              <Loader2 size={22} className="lib-spin" aria-hidden="true" />
              <span>Loading PDF…</span>
            </div>
          ) : null}
          <iframe
            key={file.id}
            className="lib-viewer-frame"
            src={file.url}
            title={`${subject.name} — ${file.chapterName || file.name}`}
            onLoad={() => setLoaded(true)}
          />
        </div>

        <p className="hint" style={{ padding: "0 4px 8px" }}>
          Read, scroll and zoom using the viewer controls above. If the document does not appear,{" "}
          <a className="link" href={file.url} target="_blank" rel="noreferrer">
            open it in a new tab
          </a>
          .
        </p>
      </div>

      <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={onRetry}>
        Reload
      </button>
    </div>
  );
}
