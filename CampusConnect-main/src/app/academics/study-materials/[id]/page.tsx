"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Download, Eye, FileText, FolderOpen, SearchX, Settings2 } from "lucide-react";
import { formatBytes, timeAgo } from "@/lib/client";
import { EmptyState, ErrorState } from "@/components/ui";
import {
  BackLink,
  PageHead,
  SearchField,
  SignInPrompt,
  useAsyncResource,
} from "@/components/academics/core";
import { Breadcrumbs, shortSemester, subjectIcon } from "@/components/academics/library";
import { sortStudyFiles, type LibraryFileSort } from "@/lib/library";
import type { StudyFile, StudySubject } from "@/lib/types";

type FolderPayload = {
  subject: StudySubject;
  files: StudyFile[];
  viewer: { id: string; role: string; canManage: boolean };
};

export default function SubjectFolderPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const { state, retry } = useAsyncResource<FolderPayload>(`/api/library/${encodeURIComponent(id)}`, Boolean(id));

  return (
    <div className="container stack">
      <BackLink />
      {state.status === "loading" ? <FolderSkeleton /> : null}
      {state.status === "error" ? (
        state.auth ? <SignInPrompt /> : <ErrorState message={state.message} onRetry={retry} />
      ) : null}
      {state.status === "ready" ? <FolderView payload={state.data} /> : null}
    </div>
  );
}

function FolderView({ payload }: { payload: FolderPayload }) {
  const { subject, files, viewer } = payload;
  const Icon = subjectIcon(subject.name);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<LibraryFileSort>("chapter");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? files.filter((f) => `${f.chapterNo} ${f.chapterName} ${f.name}`.toLowerCase().includes(q))
      : files;
    return sortStudyFiles(matched, sort);
  }, [files, query, sort]);

  const totalSize = files.reduce((n, f) => n + (f.size || 0), 0);

  return (
    <div className="stack">
      <Breadcrumbs items={[{ label: "Study Materials", href: "/academics/study-materials" }, { label: subject.name }]} />

      <PageHead
        icon={<Icon size={22} />}
        title={subject.name}
        subtitle={
          <span className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            {subject.code ? <span className="tag tag-muted">{subject.code}</span> : null}
            {subject.department ? <span className="tag tag-muted">{subject.department}</span> : null}
            {subject.semester ? <span className="tag tag-muted">{shortSemester(subject.semester)}</span> : null}
          </span>
        }
        actions={
          viewer.canManage ? (
            <Link className="btn btn-soft btn-sm" href="/admin?tab=library">
              <Settings2 size={15} aria-hidden="true" /> Manage PDFs
            </Link>
          ) : undefined
        }
      />

      {subject.description ? <p className="text-sm muted">{subject.description}</p> : null}

      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <p className="text-sm muted" role="status">
          <strong>{files.length}</strong> PDF{files.length === 1 ? "" : "s"}
          {totalSize ? ` · ${formatBytes(totalSize)} total` : ""} · updated {timeAgo(subject.updatedAt)}
        </p>
      </div>

      {files.length > 0 ? (
        <section className="card card-pad" aria-label="Search and sort">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SearchField
              id="folder-search"
              label="Search PDFs"
              value={query}
              onChange={setQuery}
              placeholder="Chapter name or file name…"
            />
            <div className="field">
              <label className="label" htmlFor="folder-sort">
                Sort by
              </label>
              <select
                id="folder-sort"
                className="select"
                value={sort}
                onChange={(e) => setSort(e.target.value as LibraryFileSort)}
              >
                <option value="chapter">Chapter number</option>
                <option value="recent">Upload date (newest)</option>
              </select>
            </div>
          </div>
        </section>
      ) : null}

      {files.length === 0 ? (
        <EmptyState
          icon={<FolderOpen size={26} />}
          title="No PDFs uploaded yet"
          body={
            viewer.canManage
              ? "Upload chapter-wise PDFs for this subject from the admin dashboard."
              : "Your faculty has not uploaded any PDFs for this subject yet. Check back soon."
          }
          action={
            viewer.canManage ? (
              <Link className="btn btn-primary" href="/admin?tab=library">
                <Settings2 size={16} aria-hidden="true" /> Upload PDFs
              </Link>
            ) : undefined
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<SearchX size={26} />}
          title="No PDFs match your search"
          body="Try a different chapter name or file name."
          action={
            <button type="button" className="btn btn-ghost" onClick={() => setQuery("")}>
              Clear search
            </button>
          }
        />
      ) : (
        <ul className="lib-file-list">
          {visible.map((file) => (
            <FileRow key={file.id} file={file} subjectId={subject.id} canManage={viewer.canManage} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FileRow({ file, subjectId, canManage }: { file: StudyFile; subjectId: string; canManage: boolean }) {
  return (
    <li className="lib-file">
      <span className="lib-chapter" aria-hidden="true">
        {file.chapterNo || "·"}
      </span>

      <div className="lib-file-main">
        <h3 className="lib-file-title">
          {file.chapterNo ? `Chapter ${file.chapterNo}` : "Document"}
          {file.chapterName ? ` — ${file.chapterName}` : ""}
        </h3>
        <p className="lib-file-meta">
          <span className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            <FileText size={13} aria-hidden="true" />
            <span className="lib-file-name">{file.name}</span>
          </span>
          <span className="lib-file-dot" aria-hidden="true">•</span>
          <span>{formatBytes(file.size)}</span>
          <span className="lib-file-dot" aria-hidden="true">•</span>
          <span>{timeAgo(file.uploadedAt)}</span>
        </p>
      </div>

      <div className="lib-file-actions">
        <Link
          className="btn btn-primary btn-sm"
          href={`/academics/study-materials/${subjectId}/view?file=${encodeURIComponent(file.id)}`}
        >
          <Eye size={15} aria-hidden="true" /> View PDF
        </Link>
        {canManage ? (
          <a className="btn btn-ghost btn-sm" href={`${file.url}?download=1`} download>
            <Download size={15} aria-hidden="true" /> Download
          </a>
        ) : null}
      </div>
    </li>
  );
}

function FolderSkeleton() {
  return (
    <div className="stack" aria-hidden="true">
      <div className="lib-skeleton" style={{ height: 30, maxWidth: 300 }} />
      <div className="lib-skeleton" style={{ height: 18, maxWidth: 480 }} />
      <div className="stack" style={{ marginTop: 8 }}>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="lib-skeleton" style={{ height: 78 }} />
        ))}
      </div>
    </div>
  );
}
