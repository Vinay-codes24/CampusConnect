"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FilePlus2,
  Paperclip,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { api, formatBytes, formatDate } from "@/lib/client";
import { useApp } from "@/components/providers";
import {
  DEPARTMENTS,
  SEMESTERS,
  type AttendanceRecord,
  type Exam,
  type Material,
  type MaterialType,
  type SyllabusSubject,
} from "@/lib/types";
import { EmptyState, ErrorState, SkeletonCard } from "@/components/ui";
import { FormError, PendingButton, SelectField, TextAreaField, TextField } from "@/components/account/fields";

type SubTab = "syllabus" | "material" | "exam" | "attendance";

type AcademicsResponse = {
  syllabus: SyllabusSubject[];
  materials: Material[];
  exams: Exam[];
  attendance: AttendanceRecord[];
  demo?: boolean;
};

type CreateResult = { ok: boolean; summary: string; link: string };

type SubmitKind = SubTab;
type SubmitFn = (kind: SubmitKind, data: Record<string, unknown>) => Promise<void>;

const MATERIAL_TYPES: MaterialType[] = ["Notes", "Previous Year Paper", "Lab Manual", "Assignment", "Reference"];
const EXAM_TYPES: Exam["type"][] = ["Semester", "Internal", "Lab", "Backlog"];

const SUBTABS: Array<{ key: SubTab; label: string }> = [
  { key: "syllabus", label: "Syllabus" },
  { key: "material", label: "Study material" },
  { key: "exam", label: "Exam" },
  { key: "attendance", label: "Attendance" },
];

const DEPT_OPTIONS = DEPARTMENTS.map((d) => ({ value: d, label: d }));
const SEMESTER_OPTIONS = SEMESTERS.map((s) => ({ value: s, label: s }));

/** Fallback student directory used when /api/admin/users is not permitted. */
const DEMO_STUDENTS: Array<{ id: string; label: string }> = [
  { id: "u-aarav", label: "Aarav Sharma (@aarav)" },
  { id: "u-priya", label: "Priya Nair (@priya)" },
  { id: "u-kabir", label: "Kabir Singh (@kabir)" },
  { id: "u-ananya", label: "Ananya Rao (@ananya)" },
  { id: "u-dev", label: "Dev Patel (@dev)" },
  { id: "u-sneha", label: "Sneha Kulkarni (@sneha)" },
  { id: "u-arjun", label: "Arjun Menon (@arjun)" },
];

export function RecordsTab() {
  const { toast } = useApp();
  const [sub, setSub] = useState<SubTab>("syllabus");
  const [data, setData] = useState<AcademicsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CreateResult | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api<AcademicsResponse>("/api/academics");
      setData(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit: SubmitFn = async (kind, payload) => {
    const res = await api<CreateResult>("/api/admin/records", { method: "POST", json: { kind, data: payload } });
    setResult(res);
    toast(res.summary, "success");
    await load();
  };

  async function removeRecord(kind: SubmitKind, id: string, label: string) {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await api("/api/admin/records", { method: "DELETE", json: { kind, id } });
      toast(`${label} deleted`, "success");
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading && !data) {
    return (
      <div className="stack">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error && !data) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  return (
    <section className="stack" aria-label="Academic records">
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 19 }}>Academic records</h2>
          <p className="text-sm muted" style={{ marginTop: 4 }}>
            Publish syllabus, study material, exams and attendance. Everything below is saved as{" "}
            <span className="demo-badge">Demo data</span>
          </p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void load()}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="chip-row" role="tablist" aria-label="Record types">
        {SUBTABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            className="chip"
            data-active={sub === tab.key}
            aria-selected={sub === tab.key}
            onClick={() => setSub(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {result ? (
        <div
          className="row"
          style={{ gap: 12, padding: "14px 16px", borderRadius: 14, background: "var(--color-accent-50)", border: "1px solid var(--color-accent-100)", flexWrap: "wrap" }}
        >
          <CheckCircle2 size={20} aria-hidden="true" style={{ color: "var(--color-accent-700)", flex: "none" }} />
          <span style={{ flex: 1, minWidth: 200 }}>
            <strong style={{ display: "block", fontSize: 14.5, color: "var(--color-accent-700)" }}>{result.summary}</strong>
            <span className="text-sm muted">Saved to the shared academics dashboard.</span>
          </span>
          <Link className="btn btn-soft btn-sm" href={result.link}>
            Open in Academics <ArrowRight size={14} />
          </Link>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setResult(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: 16, alignItems: "start" }}>
        {sub === "syllabus" ? (
          <>
            <SyllabusForm submit={submit} />
            <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0, gap: 10 }}>
              {(data?.syllabus ?? []).length === 0 ? (
                <li className="card card-pad">
                  <EmptyState icon={<FilePlus2 size={26} />} title="No syllabus yet" body="Subjects you publish will be listed here with delete controls." />
                </li>
              ) : (
                (data?.syllabus ?? []).map((item) => (
                  <li key={item.id} className="card card-pad row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <strong style={{ display: "block", fontSize: 14.5 }}>
                        {item.subject} <span className="tag tag-muted">{item.code}</span>
                      </strong>
                      <span className="text-sm muted">
                        {item.department} · {item.semester} · {item.credits} credits · {item.units.length} units
                      </span>
                    </span>
                    <DeleteButton
                      busy={deletingId === item.id}
                      disabled={!!deletingId}
                      label={`syllabus for ${item.subject}`}
                      onClick={() => void removeRecord("syllabus", item.id, `Syllabus for ${item.subject}`)}
                    />
                  </li>
                ))
              )}
            </ul>
          </>
        ) : null}

        {sub === "material" ? (
          <>
            <MaterialForm submit={submit} />
            <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0, gap: 10 }}>
              {(data?.materials ?? []).length === 0 ? (
                <li className="card card-pad">
                  <EmptyState icon={<Paperclip size={26} />} title="No study material" body="Uploaded notes, papers and manuals will be listed here." />
                </li>
              ) : (
                (data?.materials ?? []).map((item) => (
                  <li key={item.id} className="card card-pad row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <strong style={{ display: "block", fontSize: 14.5 }}>
                        {item.title} <span className="tag tag-muted">{item.type}</span>
                      </strong>
                      <span className="text-sm muted">
                        {item.subject} · {item.department} · {formatBytes(item.size)} · {item.downloads} downloads
                      </span>
                    </span>
                    <DeleteButton
                      busy={deletingId === item.id}
                      disabled={!!deletingId}
                      label={`material ${item.title}`}
                      onClick={() => void removeRecord("material", item.id, `Material “${item.title}”`)}
                    />
                  </li>
                ))
              )}
            </ul>
          </>
        ) : null}

        {sub === "exam" ? (
          <>
            <ExamForm submit={submit} />
            <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0, gap: 10 }}>
              {(data?.exams ?? []).length === 0 ? (
                <li className="card card-pad">
                  <EmptyState icon={<ClipboardList size={26} />} title="No exams scheduled" body="Papers you add will be listed here in date order." />
                </li>
              ) : (
                (data?.exams ?? []).map((item) => (
                  <li key={item.id} className="card card-pad row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <strong style={{ display: "block", fontSize: 14.5 }}>
                        {item.subject} — {item.name} {item.important ? <span className="tag tag-warn">Important</span> : null}
                      </strong>
                      <span className="text-sm muted">
                        {formatDate(item.date)} · {item.startTime}–{item.endTime} · {item.venue} · {item.type}
                      </span>
                    </span>
                    <DeleteButton
                      busy={deletingId === item.id}
                      disabled={!!deletingId}
                      label={`exam ${item.subject}`}
                      onClick={() => void removeRecord("exam", item.id, `Exam for ${item.subject}`)}
                    />
                  </li>
                ))
              )}
            </ul>
          </>
        ) : null}

        {sub === "attendance" ? (
          <>
            <AttendanceForm submit={submit} />
            <div className="card card-pad stack">
              <div>
                <h3 style={{ fontSize: 15 }}>Your attendance records</h3>
                <p className="text-sm muted" style={{ marginTop: 4 }}>
                  Records are private to each student; only the ones tied to your own account can be listed and deleted here.
                </p>
              </div>
              {(data?.attendance ?? []).length === 0 ? (
                <EmptyState title="Nothing to manage yet" body="Attendance you record for yourself will appear in this list." />
              ) : (
                <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0, gap: 10 }}>
                  {(data?.attendance ?? []).map((item) => (
                    <li key={item.id} className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <strong style={{ display: "block", fontSize: 14.5 }}>{item.subject}</strong>
                        <span className="text-sm muted">
                          {item.attended}/{item.conducted} classes · min {item.minRequired}%
                        </span>
                      </span>
                      <DeleteButton
                        busy={deletingId === item.id}
                        disabled={!!deletingId}
                        label={`attendance record ${item.subject}`}
                        onClick={() => void removeRecord("attendance", item.id, `Attendance record for ${item.subject}`)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

function DeleteButton({
  label,
  busy,
  disabled,
  onClick,
}: {
  label: string;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="btn btn-danger btn-sm"
      onClick={onClick}
      disabled={disabled}
      aria-busy={busy}
      aria-label={`Delete ${label}`}
      style={{ flex: "none" }}
    >
      {busy ? <span className="spinner" aria-hidden="true" /> : <Trash2 size={14} />} Delete
    </button>
  );
}

/* ------------------------------- syllabus ------------------------------- */

function SyllabusForm({ submit }: { submit: SubmitFn }) {
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [semester, setSemester] = useState(SEMESTERS[0]);
  const [subject, setSubject] = useState("");
  const [code, setCode] = useState("");
  const [credits, setCredits] = useState("4");
  const [units, setUnits] = useState<Array<{ title: string; topics: string }>>([{ title: "", topics: "" }]);
  const [errors, setErrors] = useState<{ subject?: string; code?: string; credits?: string; units?: string }>({});
  const [serverError, setServerError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found: typeof errors = {};
    if (subject.trim().length < 2) found.subject = "Enter the subject name.";
    if (code.trim().length < 2) found.code = "Enter the subject code.";
    const creditsNum = Number(credits);
    if (!Number.isFinite(creditsNum) || creditsNum < 0 || creditsNum > 10) found.credits = "Credits must be between 0 and 10.";
    const parsedUnits = units
      .filter((u) => u.title.trim())
      .map((u) => ({ title: u.title.trim(), topics: u.topics.split("\n").map((t) => t.trim()).filter(Boolean) }));
    if (parsedUnits.length === 0) found.units = "Add at least one unit with a title.";
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    setPending(true);
    setServerError("");
    try {
      await submit("syllabus", { department, semester, subject: subject.trim(), code: code.trim(), credits: creditsNum, units: parsedUnits });
      setSubject("");
      setCode("");
      setUnits([{ title: "", topics: "" }]);
    } catch (e) {
      const message = (e as Error).message;
      setServerError(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="card card-pad stack" onSubmit={onSubmit} noValidate aria-label="Publish syllabus">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3 style={{ fontSize: 15 }}>Publish syllabus</h3>
        <span className="demo-badge">Demo data</span>
      </div>
      <FormError message={serverError} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <SelectField id="sy-department" label="Department" value={department} onChange={setDepartment} options={DEPT_OPTIONS} disabled={pending} />
        <SelectField id="sy-semester" label="Semester" value={semester} onChange={setSemester} options={SEMESTER_OPTIONS} disabled={pending} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <TextField id="sy-subject" label="Subject" value={subject} onChange={setSubject} error={errors.subject} placeholder="Database Systems" required disabled={pending} maxLength={90} />
        <TextField id="sy-code" label="Subject code" value={code} onChange={setCode} error={errors.code} placeholder="CS-501" required disabled={pending} maxLength={16} />
        <TextField id="sy-credits" label="Credits" value={credits} onChange={setCredits} error={errors.credits} inputMode="numeric" disabled={pending} maxLength={2} />
      </div>

      <div className="stack" style={{ gap: 10 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="label" id="sy-units-label">
            Syllabus units
          </span>
          <button
            type="button"
            className="btn btn-soft btn-sm"
            onClick={() => setUnits((u) => [...u, { title: "", topics: "" }])}
            disabled={pending || units.length >= 12}
          >
            <Plus size={14} /> Add unit
          </button>
        </div>

        {errors.units ? (
          <span className="text-sm" role="alert" style={{ color: "#b91c1c", fontWeight: 600 }}>
            {errors.units}
          </span>
        ) : null}

        {units.map((unit, index) => (
          <div
            key={index}
            className="stack"
            style={{ gap: 8, padding: 12, borderRadius: 12, border: "1px solid var(--color-ink-200)", background: "var(--color-ink-100)" }}
          >
            <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
              <label className="label" htmlFor={`sy-unit-${index}`}>
                Unit {index + 1} title
              </label>
              {units.length > 1 ? (
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Remove unit ${index + 1}`}
                  disabled={pending}
                  onClick={() => setUnits((u) => u.filter((_, i) => i !== index))}
                >
                  <X size={15} />
                </button>
              ) : null}
            </div>
            <input
              id={`sy-unit-${index}`}
              className="input"
              value={unit.title}
              maxLength={120}
              disabled={pending}
              placeholder="Unit 1 — Relational model"
              onChange={(e) => setUnits((u) => u.map((x, i) => (i === index ? { ...x, title: e.target.value } : x)))}
            />
            <label className="sr-only" htmlFor={`sy-topics-${index}`}>
              Topics for unit {index + 1}
            </label>
            <textarea
              id={`sy-topics-${index}`}
              className="textarea"
              rows={3}
              maxLength={1600}
              disabled={pending}
              placeholder={"One topic per line\nerm algebra\nnormalisation"}
              value={unit.topics}
              onChange={(e) => setUnits((u) => u.map((x, i) => (i === index ? { ...x, topics: e.target.value } : x)))}
            />
            <span className="hint">One topic per line.</span>
          </div>
        ))}
      </div>

      <div className="row" style={{ justifyContent: "flex-end" }}>
        <PendingButton pending={pending} pendingLabel="Publishing…" className="btn btn-primary">
          <FilePlus2 size={16} /> Publish syllabus
        </PendingButton>
      </div>
    </form>
  );
}

/* ---------------------------- study material ---------------------------- */

function MaterialForm({ submit }: { submit: SubmitFn }) {
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [semester, setSemester] = useState(SEMESTERS[0]);
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<MaterialType>("Notes");
  const [file, setFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState<{ url: string; size: number; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [errors, setErrors] = useState<{ subject?: string; title?: string; file?: string }>({});
  const [serverError, setServerError] = useState("");
  const [pending, setPending] = useState(false);

  async function upload(target: File) {
    setUploading(true);
    setUploadError("");
    setUploaded(null);
    try {
      const form = new FormData();
      form.append("file", target);
      form.append("kind", "document");
      const res = await api<{ url: string; size: number; name: string }>("/api/upload", { method: "POST", body: form });
      setUploaded(res);
    } catch (e) {
      const message = (e as Error).message;
      setUploadError(message);
    } finally {
      setUploading(false);
    }
  }

  function pick(next: File | undefined) {
    setErrors((e) => ({ ...e, file: undefined }));
    if (!next) return;
    if (next.size > 10 * 1024 * 1024) {
      setErrors((e) => ({ ...e, file: "Documents must be 10 MB or smaller." }));
      setFile(null);
      return;
    }
    setFile(next);
    void upload(next);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found: typeof errors = {};
    if (subject.trim().length < 2) found.subject = "Enter the subject name.";
    if (title.trim().length < 3) found.title = "Give the material a title.";
    if (!uploaded) found.file = "Choose a PDF or text file first.";
    setErrors(found);
    const uploadRef = uploaded;
    if (Object.values(found).some(Boolean) || !uploadRef) return;

    setPending(true);
    setServerError("");
    try {
      await submit("material", {
        department,
        semester,
        subject: subject.trim(),
        title: title.trim(),
        type,
        url: uploadRef.url,
        size: uploadRef.size,
      });
      setTitle("");
      setFile(null);
      setUploaded(null);
    } catch (e) {
      const message = (e as Error).message;
      setServerError(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="card card-pad stack" onSubmit={onSubmit} noValidate aria-label="Upload study material">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3 style={{ fontSize: 15 }}>Upload study material</h3>
        <span className="demo-badge">Demo data</span>
      </div>
      <FormError message={serverError} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <SelectField id="mat-department" label="Department" value={department} onChange={setDepartment} options={DEPT_OPTIONS} disabled={pending} />
        <SelectField id="mat-semester" label="Semester" value={semester} onChange={setSemester} options={SEMESTER_OPTIONS} disabled={pending} />
        <SelectField
          id="mat-type"
          label="Material type"
          value={type}
          onChange={(v) => setType(v as MaterialType)}
          options={MATERIAL_TYPES.map((t) => ({ value: t, label: t }))}
          disabled={pending}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <TextField id="mat-subject" label="Subject" value={subject} onChange={setSubject} error={errors.subject} placeholder="Operating Systems" required disabled={pending} maxLength={90} />
        <TextField id="mat-title" label="Title" value={title} onChange={setTitle} error={errors.title} placeholder="Unit 3 — Process scheduling notes" required disabled={pending} maxLength={140} />
      </div>

      <div className="field">
        <span className="label" id="mat-file-label">
          File <span aria-hidden="true" style={{ color: "#b91c1c" }}>*</span>
        </span>
        <div
          className="row"
          style={{ gap: 10, padding: 12, borderRadius: 12, border: "1px dashed var(--color-ink-200)", background: "var(--color-ink-100)", flexWrap: "wrap" }}
          aria-describedby="mat-file-hint"
        >
          <label className="btn btn-ghost btn-sm" htmlFor="mat-file" style={{ cursor: "pointer" }}>
            <Upload size={14} /> {file ? "Replace file" : "Choose file"}
          </label>
          <input
            id="mat-file"
            type="file"
            accept=".pdf,.txt,application/pdf,text/plain"
            className="sr-only"
            disabled={pending}
            onChange={(e) => pick(e.target.files?.[0])}
          />
          <span className="text-sm muted" style={{ flex: 1, minWidth: 140 }}>
            {file ? file.name : "PDF or plain text, up to 10 MB"}
          </span>
          {uploading ? (
            <span className="row text-sm muted" style={{ gap: 7 }}>
              <span className="spinner" aria-hidden="true" /> Uploading…
            </span>
          ) : uploaded ? (
            <span className="tag tag-accent">
              <CheckCircle2 size={13} /> {formatBytes(uploaded.size)} uploaded
            </span>
          ) : null}
        </div>
        <span className="hint" id="mat-file-hint">
          The file is uploaded first, then its URL and size are stored with the record.
        </span>
        {errors.file ? (
          <span className="text-sm" role="alert" style={{ color: "#b91c1c", fontWeight: 600 }}>
            {errors.file}
          </span>
        ) : null}
        {uploadError ? (
          <span className="text-sm" role="alert" style={{ color: "#b91c1c", fontWeight: 600 }}>
            {uploadError}{" "}
            <button
              type="button"
              className="link"
              style={{ background: "none", border: 0, font: "inherit", cursor: "pointer" }}
              onClick={() => file && void upload(file)}
            >
              Try again
            </button>
          </span>
        ) : null}
      </div>

      <div className="row" style={{ justifyContent: "flex-end" }}>
        <PendingButton pending={pending} pendingLabel="Publishing…" disabled={uploading} className="btn btn-primary">
          <Paperclip size={16} /> Publish material
        </PendingButton>
      </div>
    </form>
  );
}

/* --------------------------------- exam --------------------------------- */

function ExamForm({ submit }: { submit: SubmitFn }) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [code, setCode] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:30");
  const [endTime, setEndTime] = useState("12:30");
  const [venue, setVenue] = useState("");
  const [type, setType] = useState<Exam["type"]>("Semester");
  const [instructions, setInstructions] = useState("");
  const [important, setImportant] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; subject?: string; code?: string; date?: string; venue?: string }>({});
  const [serverError, setServerError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found: typeof errors = {};
    if (name.trim().length < 3) found.name = "Enter the exam name.";
    if (subject.trim().length < 2) found.subject = "Enter the subject.";
    if (code.trim().length < 2) found.code = "Enter the subject code.";
    if (!date) found.date = "Pick the exam date.";
    if (venue.trim().length < 2) found.venue = "Enter the venue.";
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    setPending(true);
    setServerError("");
    try {
      await submit("exam", {
        name: name.trim(),
        subject: subject.trim(),
        code: code.trim(),
        date,
        startTime,
        endTime,
        venue: venue.trim(),
        type,
        instructions: instructions.trim(),
        important,
      });
      setName("");
      setSubject("");
      setCode("");
      setDate("");
      setVenue("");
      setInstructions("");
      setImportant(false);
    } catch (e) {
      const message = (e as Error).message;
      setServerError(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="card card-pad stack" onSubmit={onSubmit} noValidate aria-label="Schedule exam">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3 style={{ fontSize: 15 }}>Schedule an exam</h3>
        <span className="demo-badge">Demo data</span>
      </div>
      <FormError message={serverError} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <TextField id="ex-name" label="Exam name" value={name} onChange={setName} error={errors.name} placeholder="End Semester Examination" required disabled={pending} maxLength={120} />
        <TextField id="ex-subject" label="Subject" value={subject} onChange={setSubject} error={errors.subject} placeholder="Computer Networks" required disabled={pending} maxLength={90} />
        <TextField id="ex-code" label="Subject code" value={code} onChange={setCode} error={errors.code} placeholder="CS-604" required disabled={pending} maxLength={16} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <TextField id="ex-date" label="Date" type="date" value={date} onChange={setDate} error={errors.date} required disabled={pending} />
        <TextField id="ex-start" label="Start time" type="time" value={startTime} onChange={setStartTime} required disabled={pending} />
        <TextField id="ex-end" label="End time" type="time" value={endTime} onChange={setEndTime} required disabled={pending} />
        <SelectField id="ex-type" label="Type" value={type} onChange={(v) => setType(v as Exam["type"])} options={EXAM_TYPES.map((t) => ({ value: t, label: t }))} disabled={pending} />
      </div>
      <TextField id="ex-venue" label="Venue" value={venue} onChange={setVenue} error={errors.venue} placeholder="Block A · Hall 3" required disabled={pending} maxLength={120} />
      <TextAreaField id="ex-instructions" label="Instructions" value={instructions} onChange={setInstructions} hint="Optional — arrival time, materials allowed, seating rules." rows={3} maxLength={800} disabled={pending} />

      <label className="row" htmlFor="ex-important" style={{ gap: 9, cursor: "pointer" }}>
        <input
          id="ex-important"
          type="checkbox"
          checked={important}
          disabled={pending}
          onChange={(e) => setImportant(e.target.checked)}
          style={{ width: 17, height: 17, accentColor: "var(--color-brand-600)" }}
        />
        <span className="text-sm">Mark as important (bypasses the academic notifications preference)</span>
      </label>

      <div className="row" style={{ justifyContent: "flex-end" }}>
        <PendingButton pending={pending} pendingLabel="Saving…" className="btn btn-primary">
          <ClipboardList size={16} /> Schedule exam
        </PendingButton>
      </div>
    </form>
  );
}

/* ------------------------------ attendance ------------------------------ */

type StudentOption = { id: string; label: string };

function AttendanceForm({ submit }: { submit: SubmitFn }) {
  const [students, setStudents] = useState<StudentOption[] | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [subject, setSubject] = useState("");
  const [conducted, setConducted] = useState("40");
  const [attended, setAttended] = useState("32");
  const [errors, setErrors] = useState<{ student?: string; subject?: string; conducted?: string; attended?: string }>({});
  const [serverError, setServerError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<{ users: Array<{ id: string; name: string; username: string; role: string }> }>("/api/admin/users")
      .then((res) => {
        if (cancelled) return;
        const options = res.users
          .filter((u) => u.role === "student")
          .map((u) => ({ id: u.id, label: `${u.name} (@${u.username})` }));
        setStudents(options);
        setUsingFallback(false);
        setStudentId((current) => current || options[0]?.id || "");
      })
      .catch(() => {
        if (cancelled) return;
        setStudents(DEMO_STUDENTS);
        setUsingFallback(true);
        setStudentId((current) => current || DEMO_STUDENTS[0].id);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const conductedNum = Number(conducted);
    const attendedNum = Number(attended);
    const found: typeof errors = {};
    if (!studentId) found.student = "Choose a student.";
    if (subject.trim().length < 2) found.subject = "Enter the subject.";
    if (!Number.isFinite(conductedNum) || conductedNum < 0) found.conducted = "Enter the classes conducted.";
    if (!Number.isFinite(attendedNum) || attendedNum < 0) found.attended = "Enter the classes attended.";
    if (!found.conducted && !found.attended && attendedNum > conductedNum) {
      found.attended = "Attended cannot exceed conducted.";
    }
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    setPending(true);
    setServerError("");
    try {
      await submit("attendance", { studentId, subject: subject.trim(), conducted: conductedNum, attended: attendedNum });
      setSubject("");
    } catch (e) {
      const message = (e as Error).message;
      setServerError(message);
    } finally {
      setPending(false);
    }
  }

  const studentOptions = students ?? [];

  return (
    <form className="card card-pad stack" onSubmit={onSubmit} noValidate aria-label="Record attendance">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3 style={{ fontSize: 15 }}>Record attendance</h3>
        {usingFallback ? <span className="demo-badge">Demo student list</span> : <span className="demo-badge">Demo data</span>}
      </div>
      <FormError message={serverError} />

      {!students ? (
        <div className="skeleton" style={{ height: 42 }} />
      ) : (
        <SelectField
          id="at-student"
          label="Student"
          value={studentId}
          onChange={setStudentId}
          error={errors.student}
          options={studentOptions.map((s) => ({ value: s.id, label: s.label }))}
          hint={usingFallback ? "The admin directory needs an administrator account, so the seeded demo students are listed instead." : "Every account with the student role."}
          disabled={pending}
          required
        />
      )}

      <TextField id="at-subject" label="Subject" value={subject} onChange={setSubject} error={errors.subject} placeholder="Computer Networks" required disabled={pending} maxLength={90} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        <TextField id="at-conducted" label="Classes conducted" value={conducted} onChange={setConducted} error={errors.conducted} inputMode="numeric" disabled={pending} required />
        <TextField id="at-attended" label="Classes attended" value={attended} onChange={setAttended} error={errors.attended} inputMode="numeric" disabled={pending} required />
      </div>

      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <span className="text-sm muted">
          {Number(conducted) > 0 ? `${Math.round((Number(attended) / Number(conducted)) * 100)}% attendance` : "—"}
        </span>
        <PendingButton pending={pending} pendingLabel="Saving…" className="btn btn-primary">
          <CheckCircle2 size={16} /> Save record
        </PendingButton>
      </div>
      <p className="hint">Students below 75% are notified automatically.</p>
    </form>
  );
}
