"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FolderPlus, Library, SearchX, Settings2 } from "lucide-react";
import { EmptyState, ErrorState } from "@/components/ui";
import {
  BackLink,
  PageHead,
  SearchField,
  SelectField,
  SignInPrompt,
  useAsyncResource,
} from "@/components/academics/core";
import { Breadcrumbs, FolderCard, type LibrarySubject } from "@/components/academics/library";
import { sortSemesters } from "@/lib/library";

type LibraryPayload = {
  viewer: { id: string; role: string; department: string | null; canManage: boolean };
  subjects: LibrarySubject[];
};

const ALL = "__all__";

export default function StudyMaterialsPage() {
  const { state, retry } = useAsyncResource<LibraryPayload>("/api/library");

  return (
    <div className="container stack">
      <BackLink />
      <PageHead
        icon={<Library size={22} />}
        title="Study Material Library"
        subtitle="Open a subject folder to find its chapter-wise PDFs — read online or download."
      />

      {state.status === "loading" ? <LibrarySkeleton /> : null}

      {state.status === "error" ? (
        state.auth ? <SignInPrompt /> : <ErrorState message={state.message} onRetry={retry} />
      ) : null}

      {state.status === "ready" ? <LibraryView payload={state.data} /> : null}
    </div>
  );
}

function LibraryView({ payload }: { payload: LibraryPayload }) {
  const { subjects, viewer } = payload;

  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState(ALL);
  const [semester, setSemester] = useState(ALL);

  const departments = useMemo(
    () => unique(subjects.map((s) => s.department).filter(Boolean)).sort((a, b) => a.localeCompare(b)),
    [subjects],
  );
  const semesters = useMemo(
    () => sortSemesters(unique(subjects.map((s) => s.semester).filter(Boolean))),
    [subjects],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return subjects.filter((s) => {
      if (department !== ALL && s.department !== department) return false;
      if (semester !== ALL && s.semester !== semester) return false;
      if (q && !`${s.name} ${s.code} ${s.description} ${s.department}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [subjects, query, department, semester]);

  const totalFiles = filtered.reduce((n, s) => n + s.fileCount, 0);
  const filtersActive = query.trim() !== "" || department !== ALL || semester !== ALL;

  function clearFilters() {
    setQuery("");
    setDepartment(ALL);
    setSemester(ALL);
  }

  if (subjects.length === 0) {
    return (
      <div className="stack">
        <Breadcrumbs items={[{ label: "Study Materials" }]} />
        <EmptyState
          icon={<FolderPlus size={26} />}
          title="No subject folders yet"
          body={
            viewer.canManage
              ? "Create your first subject folder from the admin dashboard, then upload chapter-wise PDFs into it."
              : "Your faculty has not published any study material yet. Check back soon."
          }
          action={
            viewer.canManage ? (
              <Link className="btn btn-primary" href="/admin?tab=library">
                <Settings2 size={16} aria-hidden="true" /> Manage library
              </Link>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="stack">
      <Breadcrumbs items={[{ label: "Study Materials" }]} />

      {viewer.canManage ? (
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <Link className="btn btn-soft btn-sm" href="/admin?tab=library">
            <Settings2 size={15} aria-hidden="true" /> Manage library
          </Link>
        </div>
      ) : null}

      <section className="card card-pad stack" aria-label="Find a subject">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SearchField
            id="library-search"
            label="Search subjects"
            value={query}
            onChange={setQuery}
            placeholder="Subject name or code…"
          />
          <SelectField
            id="library-department"
            label="Branch"
            value={department}
            onChange={setDepartment}
            options={[{ value: ALL, label: "All branches" }, ...departments.map((d) => ({ value: d, label: d }))]}
          />
          <SelectField
            id="library-semester"
            label="Semester"
            value={semester}
            onChange={setSemester}
            options={[{ value: ALL, label: "All semesters" }, ...semesters.map((s) => ({ value: s, label: s }))]}
          />
        </div>
      </section>

      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <p className="text-sm muted" role="status">
          <strong>{filtered.length}</strong> subject{filtered.length === 1 ? "" : "s"} · <strong>{totalFiles}</strong> PDF
          {totalFiles === 1 ? "" : "s"}
        </p>
        {filtersActive ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
            Clear filters
          </button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<SearchX size={26} />}
          title="No folders match those filters"
          body="Try a different branch or semester, or clear the search box."
          action={
            <button type="button" className="btn btn-ghost" onClick={clearFilters}>
              Reset filters
            </button>
          }
        />
      ) : (
        <div className="lib-grid">
          {filtered.map((subject) => (
            <FolderCard key={subject.id} subject={subject} />
          ))}
        </div>
      )}
    </div>
  );
}

function LibrarySkeleton() {
  return (
    <div className="stack">
      <div className="card card-pad">
        <div className="lib-skeleton" style={{ height: 24, maxWidth: 320 }} />
      </div>
      <div className="lib-grid" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="lib-skeleton" style={{ height: 250 }} />
        ))}
      </div>
    </div>
  );
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}
