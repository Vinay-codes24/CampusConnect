"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, Download, FileText, Search, User2 } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { DEPARTMENTS, SEMESTERS, type SyllabusSubject } from "@/lib/types";
import {
  AcademicPage,
  SelectField,
  Toolbar,
  unique,
  useAcademics,
  useUserNames,
  initials,
  timeAgo,
  type AcademicsPayload,
} from "@/components/academics/core";

export default function SubjectsPage() {
  const { state, retry } = useAcademics();

  return (
    <AcademicPage
      icon={<BookOpen size={22} />}
      title="Subjects"
      subtitle="Every subject for your department and semester, with credits, units and downloadable syllabi."
      state={state}
      retry={retry}
      loadingLabel="Loading subjects…"
    >
      {(data) => <SubjectsView data={data} />}
    </AcademicPage>
  );
}

function SubjectsView({ data }: { data: AcademicsPayload }) {
  const semestersFor = (department: string) =>
    unique(data.syllabus.filter((s) => s.department === department).map((s) => s.semester));

  const [department, setDepartment] = useState(data.viewer.department);
  const [semester, setSemester] = useState(() => semestersFor(data.viewer.department)[0] ?? SEMESTERS[4]);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const subjects = data.syllabus.filter((s) => s.department === department && s.semester === semester);
  const uploaderNames = useUserNames(subjects.map((s) => s.uploadedBy));

  const q = query.trim().toLowerCase();
  const visible = q
    ? subjects.filter((s) => s.subject.toLowerCase().includes(q) || s.code.toLowerCase().includes(q))
    : subjects;

  const semesterOptions = SEMESTERS.map((s) => ({
    value: s,
    label: s + (semestersFor(department).includes(s) ? "" : "  (no subjects)"),
  }));

  function changeDepartment(next: string) {
    setDepartment(next);
    const available = semestersFor(next);
    if (!available.includes(semester)) setSemester(available[0] ?? SEMESTERS[4]);
    setOpenId(null);
    setQuery("");
  }

  const totalCredits = subjects.reduce((n, s) => n + s.credits, 0);
  const totalUnits = subjects.reduce((n, s) => n + s.units.length, 0);

  return (
    <div className="stack">
      <Toolbar hint="Subject records are published by faculty from the admin dashboard — students can read and download them, not edit them.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SelectField
            id="subjects-department"
            label="Department"
            value={department}
            onChange={changeDepartment}
            options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
          />
          <SelectField
            id="subjects-semester"
            label="Semester"
            value={semester}
            onChange={(v) => {
              setSemester(v);
              setOpenId(null);
            }}
            options={semesterOptions}
          />
          <div className="field">
            <label className="label" htmlFor="subjects-search">
              Search
            </label>
            <div style={{ position: "relative" }}>
              <Search
                size={16}
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--color-ink-400)",
                  pointerEvents: "none",
                }}
              />
              <input
                id="subjects-search"
                type="search"
                className="input"
                style={{ paddingLeft: 36 }}
                placeholder="Subject or code"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </Toolbar>

      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <p className="text-sm muted" role="status">
          <strong>{visible.length}</strong> subject{visible.length === 1 ? "" : "s"} · <strong>{totalCredits}</strong>{" "}
          credits · <strong>{totalUnits}</strong> units · {department}, {semester}
        </p>
        <span className="tag tag-muted">Updated {latestUpdate(subjects)}</span>
      </div>

      {subjects.length === 0 ? (
        <section className="acad-hero acad-hero--center">
          <EmptyState
            icon={<BookOpen size={26} />}
            title={`No subjects published for ${semester}`}
            body={`No verified subject list has been uploaded for ${department}, ${semester} yet. Try another semester or department.`}
            action={
              <button type="button" className="btn btn-ghost" onClick={() => changeDepartment(data.viewer.department)}>
                Reset to my department
              </button>
            }
          />
        </section>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Search size={26} />}
          title="No matching subjects"
          body={`No subject in ${semester} matches “${query}”. Try a different search.`}
        />
      ) : (
        <section className="subject-grid" aria-label={`Subjects in ${semester}`}>
          {visible.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              faculty={uploaderNames[subject.uploadedBy]}
              open={openId === subject.id}
              onToggle={() => setOpenId((id) => (id === subject.id ? null : subject.id))}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function SubjectCard({
  subject,
  faculty,
  open,
  onToggle,
}: {
  subject: SyllabusSubject;
  faculty?: string;
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = `subject-units-${subject.id}`;

  return (
    <article className="subject-card">
      <div className="subject-card-top">
        <div className="row" style={{ gap: 10, minWidth: 0 }}>
          <span className="subject-avatar" aria-hidden="true">
            {initials(subject.code)}
          </span>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: 15.5, lineHeight: 1.3 }}>{subject.subject}</h3>
            <p className="text-sm muted" style={{ marginTop: 2 }}>
              {subject.code}
            </p>
          </div>
        </div>
        <span className="tag tag-muted">{subject.semester.replace("Semester ", "Sem ")}</span>
      </div>

      <div className="subject-meta">
        <span className="tag tag-muted">{subject.credits} credits</span>
        <span className="tag tag-muted">
          {subject.units.length} unit{subject.units.length === 1 ? "" : "s"}
        </span>
        {faculty ? (
          <span className="tag tag-muted">
            <User2 size={12} aria-hidden="true" /> {faculty}
          </span>
        ) : null}
      </div>

      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <a
          className="btn btn-soft btn-sm"
          href={`/api/download?type=syllabus&id=${encodeURIComponent(subject.id)}&format=pdf`}
        >
          <Download size={15} aria-hidden="true" /> PDF
        </a>
        <a
          className="btn btn-ghost btn-sm"
          href={`/api/download?type=syllabus&id=${encodeURIComponent(subject.id)}&format=txt`}
          title="Download the syllabus as plain text"
        >
          <FileText size={15} aria-hidden="true" /> Text
        </a>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
        >
          {open ? "Hide units" : "View units"}
          <ChevronDown
            size={15}
            aria-hidden="true"
            style={{ transition: "transform 0.15s ease", transform: open ? "rotate(180deg)" : "none" }}
          />
        </button>
      </div>

      {open ? (
        <div id={panelId} className="stack" style={{ gap: 10 }}>
          {subject.units.length === 0 ? (
            <p className="text-sm muted">No units have been published for this subject yet.</p>
          ) : (
            subject.units.map((unit) => (
              <div
                key={unit.title}
                className="card card-pad"
                style={{ background: "var(--color-ink-100)", boxShadow: "none", padding: 14 }}
              >
                <strong style={{ fontSize: 14 }}>{unit.title}</strong>
                <ul className="text-sm muted" style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                  {unit.topics.map((topic) => (
                    <li key={topic}>{topic}</li>
                  ))}
                </ul>
              </div>
            ))
          )}
          <p className="hint">
            Source: subject record uploaded by the department · last updated {timeAgo(subject.updatedAt)} · sample/demo
            content.
          </p>
        </div>
      ) : null}
    </article>
  );
}

function latestUpdate(subjects: AcademicsPayload["syllabus"]): string {
  if (subjects.length === 0) return "—";
  const latest = subjects.map((s) => s.updatedAt).sort().at(-1);
  return latest ? timeAgo(latest) : "—";
}
