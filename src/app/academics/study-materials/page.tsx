"use client";

import { useMemo, useState } from "react";
import { Download, DownloadCloud, FileText, Library, SearchX } from "lucide-react";
import { formatBytes, formatDate } from "@/lib/client";
import { EmptyState } from "@/components/ui";
import { DEPARTMENTS, SEMESTERS, type MaterialType } from "@/lib/types";
import {
  AcademicPage,
  Chip,
  DemoBadge,
  LoadingCards,
  SearchField,
  SelectField,
  Toolbar,
  unique,
  useAcademics,
  useUserNames,
  type AcademicsPayload,
} from "@/components/academics/core";

const MATERIAL_TYPES: MaterialType[] = ["Notes", "Previous Year Paper", "Lab Manual", "Assignment", "Reference"];

const ALL = "__all__";

const TYPE_TAG: Record<MaterialType, string> = {
  Notes: "tag",
  "Previous Year Paper": "tag tag-accent",
  "Lab Manual": "tag tag-warn",
  Assignment: "tag tag-danger",
  Reference: "tag tag-muted",
};

export default function StudyMaterialsPage() {
  const { state, retry } = useAcademics();

  return (
    <AcademicPage
      icon={<Library size={22} />}
      title="Study Materials"
      subtitle="Notes, previous year papers, lab manuals, assignments and reference books — grouped by subject."
      state={state}
      retry={retry}
      loadingLabel="Loading study materials…"
    >
      {(data) => <MaterialsView data={data} />}
    </AcademicPage>
  );
}

function MaterialsView({ data }: { data: AcademicsPayload }) {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState(data.viewer.department);
  const [semester, setSemester] = useState(ALL);
  const [subject, setSubject] = useState(ALL);
  const [type, setType] = useState<MaterialType | "All">("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.materials.filter((m) => {
      if (department !== ALL && m.department !== department) return false;
      if (semester !== ALL && m.semester !== semester) return false;
      if (subject !== ALL && m.subject !== subject) return false;
      if (type !== "All" && m.type !== type) return false;
      if (q && !`${m.title} ${m.subject} ${m.type} ${m.department}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data.materials, query, department, semester, subject, type]);

  const subjectOptions = useMemo(
    () => [ALL, ...unique(data.materials.filter((m) => department === ALL || m.department === department).map((m) => m.subject))],
    [data.materials, department],
  );

  const uploaderIds = filtered.map((m) => m.uploadedBy);
  const uploaderNames = useUserNames(uploaderIds);

  const groups = useMemo(() => {
    const map = new Map<string, AcademicsPayload["materials"]>();
    filtered.forEach((m) => {
      const list = map.get(m.subject) ?? [];
      list.push(m);
      map.set(m.subject, list);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const filtersActive =
    query.trim() !== "" || department !== ALL || semester !== ALL || subject !== ALL || type !== "All";

  function clearFilters() {
    setQuery("");
    setDepartment(data.viewer.department);
    setSemester(ALL);
    setSubject(ALL);
    setType("All");
  }

  function changeDepartment(next: string) {
    setDepartment(next);
    setSubject(ALL);
  }

  function changeSemester(next: string) {
    setSemester(next);
    setSubject(ALL);
  }

  return (
    <div className="stack">
      <Toolbar hint="Materials are uploaded by faculty from the admin dashboard. Downloads are generated demo documents.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SearchField id="material-search" label="Search" value={query} onChange={setQuery} placeholder="Search title or subject…" />
          <SelectField
            id="material-department"
            label="Department"
            value={department}
            onChange={changeDepartment}
            options={[{ value: ALL, label: "All departments" }, ...DEPARTMENTS.map((d) => ({ value: d, label: d }))]}
          />
          <SelectField
            id="material-semester"
            label="Semester"
            value={semester}
            onChange={changeSemester}
            options={[{ value: ALL, label: "All semesters" }, ...SEMESTERS.map((s) => ({ value: s, label: s }))]}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField
            id="material-subject"
            label="Subject"
            value={subject}
            onChange={setSubject}
            options={subjectOptions.map((s) => ({ value: s, label: s === ALL ? "All subjects" : s }))}
          />
          <div className="field">
            <span className="label" id="material-type-label">
              Type
            </span>
            <div className="chip-row" role="group" aria-labelledby="material-type-label">
              <Chip active={type === "All"} onClick={() => setType("All")}>
                All types
              </Chip>
              {MATERIAL_TYPES.map((t) => (
                <Chip key={t} active={type === t} onClick={() => setType(t)}>
                  {t}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </Toolbar>

      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <p className="text-sm muted" role="status">
          <strong>{filtered.length}</strong> file{filtered.length === 1 ? "" : "s"} ·{" "}
          {formatBytes(filtered.reduce((n, m) => n + m.size, 0))} total
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
          title="No materials match those filters"
          body="Try another subject or semester, clear the search box, or switch back to all departments."
          action={
            <button type="button" className="btn btn-ghost" onClick={clearFilters}>
              Reset filters
            </button>
          }
        />
      ) : (
        groups.map(([subjectName, list]) => (
          <section key={subjectName} className="stack" aria-label={`Materials for ${subjectName}`}>
            <div className="row" style={{ gap: 8 }}>
              <FileText size={17} aria-hidden="true" style={{ color: "var(--color-brand-600)" }} />
              <h2 style={{ fontSize: 17 }}>{subjectName}</h2>
              <span className="tag tag-muted">{list.length}</span>
            </div>
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
              {list.map((m) => (
                <article key={m.id} className="card card-pad stack" style={{ gap: 8 }}>
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <h3 style={{ fontSize: 15.5, flex: 1, minWidth: 0 }}>{m.title}</h3>
                    <span className={TYPE_TAG[m.type]}>{m.type}</span>
                  </div>

                  <p className="text-sm muted">
                    {m.subject} · {m.department} · {m.semester}
                  </p>

                  <dl
                    className="text-sm"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr",
                      columnGap: 12,
                      rowGap: 4,
                      margin: 0,
                    }}
                  >
                    <dt className="muted">Size</dt>
                    <dd style={{ margin: 0 }}>{formatBytes(m.size)}</dd>
                    <dt className="muted">Uploaded</dt>
                    <dd style={{ margin: 0 }}>
                      {formatDate(m.createdAt)} by {uploaderNames[m.uploadedBy] ?? m.uploadedBy}
                    </dd>
                    <dt className="muted">Downloads</dt>
                    <dd style={{ margin: 0 }}>{m.downloads}</dd>
                  </dl>

                  <div className="row" style={{ justifyContent: "flex-end" }}>
                    <a
                      className="btn btn-primary btn-sm"
                      href={`/api/download?type=material&id=${encodeURIComponent(m.id)}&format=pdf`}
                    >
                      <Download size={15} aria-hidden="true" /> Download
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))
      )}

      <p className="hint row" style={{ gap: 6 }}>
        <DownloadCloud size={14} aria-hidden="true" />
        Download counts update when faculty re-publish a file. All entries are sample/demo content.
      </p>
    </div>
  );
}
