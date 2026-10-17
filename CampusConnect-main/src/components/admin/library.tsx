"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ExternalLink,
  FileText,
  FolderOpen,
  FolderPlus,
  Import,
  Pencil,
  Plus,
  RefreshCw,
  Replace,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { api, formatBytes } from "@/lib/client";
import { useApp } from "@/components/providers";
import { DEPARTMENTS, SEMESTERS, type StudyFile, type StudySubject, type SyllabusSubject } from "@/lib/types";
import { EmptyState, ErrorState, SkeletonCard } from "@/components/ui";
import { FormError, PendingButton, SelectField, TextAreaField, TextField } from "@/components/account/fields";

type LibrarySubject = StudySubject & { fileCount: number; totalSize: number };
type LibraryResponse = {
  viewer: { id: string; role: string; department: string | null; canManage: boolean };
  subjects: LibrarySubject[];
};
type FolderResponse = { subject: StudySubject; files: StudyFile[]; viewer: { canManage: boolean } };

type SubjectValues = { name: string; code: string; department: string; semester: string; description: string };

const DEPT_OPTIONS = [{ value: "", label: "No branch" }, ...DEPARTMENTS.map((d) => ({ value: d, label: d }))];
const SEM_OPTIONS = [{ value: "", label: "No semester" }, ...SEMESTERS.map((s) => ({ value: s, label: s }))];

const MAX_PDF = 10 * 1024 * 1024;

/**
 * Admin-only study-material manager.
 *
 * Every action is enforced server-side (staff role) — this component only
 * decides what to render. Create/edit/delete folders and add/edit/replace/
 * remove the chapter-wise PDFs inside them.
 */
export function LibraryTab() {
  const { toast } = useApp();
  const [data, setData] = useState<LibraryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api<LibraryResponse>("/api/library");
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

  async function createSubject(values: SubjectValues) {
    await api("/api/library/subjects", { method: "POST", json: values });
    toast(`Folder "${values.name}" created`, "success");
    setCreating(false);
    await load();
  }

  async function updateSubject(id: string, values: SubjectValues) {
    await api("/api/library/subjects", { method: "PATCH", json: { id, ...values } });
    toast(`Folder "${values.name}" updated`, "success");
    setEditingId(null);
    await load();
  }

  async function deleteSubject(subject: LibrarySubject) {
    if (deletingId) return;
    if (!window.confirm(`Delete "${subject.name}" and all ${subject.fileCount} PDF(s) inside it? This cannot be undone.`)) {
      return;
    }
    setDeletingId(subject.id);
    try {
      await api("/api/library/subjects", { method: "DELETE", json: { id: subject.id } });
      toast(`Folder "${subject.name}" deleted`, "success");
      if (openId === subject.id) setOpenId(null);
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

  if (error && !data) return <ErrorState message={error} onRetry={() => void load()} />;

  const subjects = data?.subjects ?? [];

  return (
    <section className="stack" aria-label="Study material library">
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 19 }}>Study material library</h2>
          <p className="text-sm muted" style={{ marginTop: 4 }}>
            Create subject folders and upload their chapter-wise PDFs. Students can only view and read what you publish.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void load()}>
            <RefreshCw size={14} aria-hidden="true" /> Refresh
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              setCreating((v) => !v);
              setEditingId(null);
            }}
          >
            <FolderPlus size={15} aria-hidden="true" /> New folder
          </button>
        </div>
      </div>

      {creating ? (
        <SubjectForm
          submitLabel="Create folder"
          onSubmit={createSubject}
          onCancel={() => setCreating(false)}
        />
      ) : null}

      <ImportPanel onDone={load} />

      {subjects.length === 0 ? (
        <EmptyState
          icon={<FolderOpen size={26} />}
          title="No folders yet"
          body="Create a subject folder, then upload its chapter-wise PDFs. You can also import subject names from the NSUT scheme of courses."
        />
      ) : (
        <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0, gap: 12 }}>
          {subjects.map((subject) => {
            const isOpen = openId === subject.id;
            const isEditing = editingId === subject.id;
            return (
              <li key={subject.id} className="card card-pad stack" style={{ gap: 12 }}>
                <div className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <strong style={{ fontSize: 15 }}>
                      {subject.name}
                      {subject.code ? <span className="tag tag-muted" style={{ marginLeft: 8 }}>{subject.code}</span> : null}
                    </strong>
                    <p className="text-sm muted" style={{ marginTop: 3 }}>
                      {subject.department || "No branch"} · {subject.semester || "No semester"} ·{" "}
                      {subject.fileCount} PDF{subject.fileCount === 1 ? "" : "s"}
                      {subject.totalSize ? ` · ${formatBytes(subject.totalSize)}` : ""}
                    </p>
                  </div>

                  <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                    <Link className="btn btn-ghost btn-sm" href={`/academics/study-materials/${subject.id}`}>
                      <ExternalLink size={14} aria-hidden="true" /> Preview
                    </Link>
                    <button
                      type="button"
                      className="btn btn-soft btn-sm"
                      aria-expanded={isOpen}
                      onClick={() => {
                        setOpenId(isOpen ? null : subject.id);
                        setEditingId(null);
                      }}
                    >
                      <FolderOpen size={14} aria-hidden="true" /> {isOpen ? "Close" : "Manage PDFs"}
                      <ChevronDown
                        size={14}
                        aria-hidden="true"
                        style={{ transition: "transform .15s ease", transform: isOpen ? "rotate(180deg)" : "none" }}
                      />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setEditingId(isEditing ? null : subject.id);
                        setOpenId(null);
                      }}
                    >
                      <Pencil size={14} aria-hidden="true" /> Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ color: "#b91c1c" }}
                      disabled={deletingId === subject.id}
                      onClick={() => void deleteSubject(subject)}
                    >
                      <Trash2 size={14} aria-hidden="true" /> Delete
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <SubjectForm
                    initial={subject}
                    submitLabel="Save changes"
                    onSubmit={(values) => updateSubject(subject.id, values)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : null}

                {isOpen ? <FileManager subject={subject} onChanged={load} /> : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ----------------------------- subject form ----------------------------- */

function SubjectForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: StudySubject;
  submitLabel: string;
  onSubmit: (values: SubjectValues) => Promise<void>;
  onCancel: () => void;
}) {
  const prefix = initial?.id ?? "new";
  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [department, setDepartment] = useState(initial?.department ?? "");
  const [semester, setSemester] = useState(initial?.semester ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [nameError, setNameError] = useState("");
  const [serverError, setServerError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setNameError("");
    setServerError("");
    if (name.trim().length < 2) {
      setNameError("Enter a subject name (at least 2 characters).");
      return;
    }
    setPending(true);
    try {
      await onSubmit({
        name: name.trim(),
        code: code.trim(),
        department,
        semester,
        description: description.trim(),
      });
    } catch (err) {
      setServerError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="stack"
      onSubmit={submit}
      style={{ gap: 12, padding: 16, borderRadius: 14, border: "1px solid var(--color-ink-200)", background: "var(--color-ink-100)" }}
    >
      <FormError message={serverError} />
      <TextField
        id={`lib-name-${prefix}`}
        label="Subject name"
        value={name}
        onChange={setName}
        error={nameError}
        placeholder="Fluid Mechanics"
        required
        maxLength={90}
        disabled={pending}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TextField
          id={`lib-code-${prefix}`}
          label="Code"
          value={code}
          onChange={setCode}
          placeholder="ME-201"
          maxLength={24}
          disabled={pending}
        />
        <SelectField
          id={`lib-dept-${prefix}`}
          label="Branch"
          value={department}
          onChange={setDepartment}
          options={DEPT_OPTIONS}
          disabled={pending}
        />
        <SelectField
          id={`lib-sem-${prefix}`}
          label="Semester"
          value={semester}
          onChange={setSemester}
          options={SEM_OPTIONS}
          disabled={pending}
        />
      </div>
      <TextAreaField
        id={`lib-desc-${prefix}`}
        label="Description"
        value={description}
        onChange={setDescription}
        placeholder="Short note shown on the folder card (optional)."
        maxLength={400}
        rows={2}
        disabled={pending}
      />
      <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={pending}>
          Cancel
        </button>
        <PendingButton pending={pending} pendingLabel="Saving…" className="btn btn-primary btn-sm">
          <Save size={15} aria-hidden="true" /> {submitLabel}
        </PendingButton>
      </div>
    </form>
  );
}

/* ------------------------- import from scheme --------------------------- */

function ImportPanel({ onDone }: { onDone: () => Promise<void> | void }) {
  const { toast } = useApp();
  const [open, setOpen] = useState(false);
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [semester, setSemester] = useState(SEMESTERS[0]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setPending(true);
    setError("");
    try {
      const academics = await api<{ syllabus: SyllabusSubject[] }>("/api/academics");
      const items = academics.syllabus
        .filter((s) => s.university === "nsut" && s.department === department && s.semester === semester)
        .map((s) => ({ name: s.subject, code: s.code, department, semester }));
      if (items.length === 0) {
        setError("No subjects were found for that branch and semester.");
        return;
      }
      const res = await api<{ count: number }>("/api/library/subjects", { method: "POST", json: { items } });
      toast(`Imported ${res.count} subject folder${res.count === 1 ? "" : "s"}`, "success");
      await onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="card card-pad stack" style={{ gap: 10 }}>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        style={{ alignSelf: "flex-start" }}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Import size={14} aria-hidden="true" /> {open ? "Hide import" : "Import subject names from the NSUT scheme"}
      </button>

      {open ? (
        <div className="stack" style={{ gap: 10 }}>
          <p className="text-sm muted">
            Creates one empty folder per subject — no PDFs are imported. Upload the PDFs afterwards.
          </p>
          <FormError message={error} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SelectField
              id="import-dept"
              label="Branch"
              value={department}
              onChange={setDepartment}
              options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
              disabled={pending}
            />
            <SelectField
              id="import-sem"
              label="Semester"
              value={semester}
              onChange={setSemester}
              options={SEMESTERS.map((s) => ({ value: s, label: s }))}
              disabled={pending}
            />
          </div>
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-soft btn-sm" disabled={pending} onClick={() => void run()}>
              {pending ? (
                <>
                  <span className="spinner" aria-hidden="true" /> Importing…
                </>
              ) : (
                <>
                  <Plus size={15} aria-hidden="true" /> Import subjects
                </>
              )}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------ file manager ---------------------------- */

type StagedFile = { tempId: string; file: File; chapterNo: string; chapterName: string; name: string };

function FileManager({ subject, onChanged }: { subject: LibrarySubject; onChanged: () => Promise<void> | void }) {
  const { toast } = useApp();
  const [files, setFiles] = useState<StudyFile[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await api<FolderResponse>(`/api/library/${encodeURIComponent(subject.id)}`);
      setFiles(res.files);
    } catch (e) {
      setError((e as Error).message);
      setFiles([]);
    }
  }, [subject.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const nextChapter = useMemo(() => {
    const nums = (files ?? [])
      .map((f) => Number.parseInt(f.chapterNo, 10))
      .filter((n) => Number.isFinite(n));
    return (nums.length ? Math.max(...nums) : 0) + 1;
  }, [files]);

  function pick(list: FileList | null) {
    if (!list || list.length === 0) return;
    setError("");
    const added: StagedFile[] = [];
    Array.from(list).forEach((file, i) => {
      if (file.type && file.type !== "application/pdf") {
        setError(`${file.name} is not a PDF.`);
        return;
      }
      if (file.size > MAX_PDF) {
        setError(`${file.name} is larger than 10 MB.`);
        return;
      }
      const base = file.name.replace(/\.[^.]+$/, "");
      added.push({
        tempId: `${Date.now()}-${i}-${file.name}`,
        file,
        chapterNo: String(nextChapter + added.length),
        chapterName: base.slice(0, 140),
        name: file.name.slice(0, 160),
      });
    });
    setStaged((s) => [...s, ...added]);
  }

  function updateStaged(tempId: string, patch: Partial<StagedFile>) {
    setStaged((s) => s.map((item) => (item.tempId === tempId ? { ...item, ...patch } : item)));
  }

  async function saveStaged() {
    if (staged.length === 0) return;
    const invalid = staged.find((s) => !s.chapterNo.trim() || s.chapterName.trim().length < 2);
    if (invalid) {
      setError("Every PDF needs a chapter number and a chapter name (2+ characters).");
      return;
    }
    setBusy(true);
    setError("");
    try {
      for (const item of staged) {
        const form = new FormData();
        form.append("file", item.file);
        form.append("kind", "document");
        const up = await api<{ url: string; size: number }>("/api/upload", { method: "POST", body: form });
        await api("/api/library/files", {
          method: "POST",
          json: {
            subjectId: subject.id,
            chapterNo: item.chapterNo.trim(),
            chapterName: item.chapterName.trim(),
            name: (item.name.trim() || item.chapterName.trim()).slice(0, 160),
            url: up.url,
            size: up.size,
          },
        });
      }
      toast(`${staged.length} PDF${staged.length === 1 ? "" : "s"} added`, "success");
      setStaged([]);
      await load();
      await onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveFileEdit(file: StudyFile, values: { chapterNo: string; chapterName: string; name: string }) {
    setBusy(true);
    setError("");
    try {
      await api("/api/library/files", { method: "PATCH", json: { id: file.id, ...values } });
      toast("PDF updated", "success");
      setEditingId(null);
      await load();
      await onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function replaceFile(file: StudyFile, replacement: File) {
    if (replacement.type && replacement.type !== "application/pdf") {
      setError(`${replacement.name} is not a PDF.`);
      return;
    }
    if (replacement.size > MAX_PDF) {
      setError(`${replacement.name} is larger than 10 MB.`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", replacement);
      form.append("kind", "document");
      const up = await api<{ url: string; size: number }>("/api/upload", { method: "POST", body: form });
      await api("/api/library/files", {
        method: "PATCH",
        json: {
          id: file.id,
          chapterNo: file.chapterNo,
          chapterName: file.chapterName,
          name: replacement.name.slice(0, 160),
          url: up.url,
          size: up.size,
        },
      });
      toast("PDF replaced", "success");
      await load();
      await onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function removeFile(file: StudyFile) {
    if (!window.confirm(`Remove "${file.chapterName || file.name}"?`)) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/library/files", { method: "DELETE", json: { id: file.id } });
      toast("PDF removed", "success");
      await load();
      await onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ gap: 12 }}>
      <FormError message={error} />

      <div className="stack" style={{ gap: 8 }}>
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span className="label">Upload chapter-wise PDFs</span>
          <label className="btn btn-soft btn-sm" style={{ cursor: "pointer" }}>
            <Upload size={14} aria-hidden="true" /> Choose PDFs
            <input
              type="file"
              accept="application/pdf,.pdf"
              multiple
              hidden
              disabled={busy}
              onChange={(e) => {
                pick(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <p className="hint">Select several files at once, then set each chapter number and name before saving.</p>
      </div>

      {staged.length > 0 ? (
        <div className="stack" style={{ gap: 8 }}>
          {staged.map((item) => (
            <div
              key={item.tempId}
              className="stack"
              style={{ gap: 8, padding: 12, borderRadius: 12, border: "1px dashed var(--color-brand-300)", background: "var(--color-brand-50)" }}
            >
              <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                <span className="row text-sm" style={{ gap: 6, minWidth: 0 }}>
                  <FileText size={14} aria-hidden="true" />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.file.name}</span>
                  <span className="muted">{formatBytes(item.file.size)}</span>
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Discard ${item.file.name}`}
                  onClick={() => setStaged((s) => s.filter((x) => x.tempId !== item.tempId))}
                >
                  <X size={15} />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <label className="field">
                  <span className="label">Chapter no.</span>
                  <input
                    className="input"
                    value={item.chapterNo}
                    maxLength={12}
                    onChange={(e) => updateStaged(item.tempId, { chapterNo: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span className="label">Chapter name</span>
                  <input
                    className="input"
                    value={item.chapterName}
                    maxLength={140}
                    onChange={(e) => updateStaged(item.tempId, { chapterName: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span className="label">File name</span>
                  <input
                    className="input"
                    value={item.name}
                    maxLength={160}
                    onChange={(e) => updateStaged(item.tempId, { name: e.target.value })}
                  />
                </label>
              </div>
            </div>
          ))}
          <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setStaged([])}>
              Discard all
            </button>
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void saveStaged()}>
              {busy ? (
                <>
                  <span className="spinner" aria-hidden="true" /> Saving…
                </>
              ) : (
                <>
                  <Save size={15} aria-hidden="true" /> Save {staged.length} PDF{staged.length === 1 ? "" : "s"}
                </>
              )}
            </button>
          </div>
        </div>
      ) : null}

      {files === null ? (
        <SkeletonCard />
      ) : files.length === 0 ? (
        <p className="text-sm muted">No PDFs in this folder yet. Upload the first chapter above.</p>
      ) : (
        <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0, gap: 8 }}>
          {files.map((file) =>
            editingId === file.id ? (
              <li key={file.id} className="card card-pad" style={{ background: "var(--color-ink-100)" }}>
                <FileEditRow
                  file={file}
                  busy={busy}
                  onSave={(values) => void saveFileEdit(file, values)}
                  onCancel={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li
                key={file.id}
                className="row"
                style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap", padding: "10px 12px", borderRadius: 12, border: "1px solid var(--color-ink-200)" }}
              >
                <span className="row" style={{ gap: 10, minWidth: 0, flex: 1 }}>
                  <span className="lib-chapter" aria-hidden="true">
                    {file.chapterNo || "·"}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <strong style={{ display: "block", fontSize: 14 }}>{file.chapterName || file.name}</strong>
                    <span className="text-sm muted">
                      {file.name} · {formatBytes(file.size)}
                    </span>
                  </span>
                </span>

                <span className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                  <Link className="btn btn-ghost btn-sm" href={`/academics/study-materials/${subject.id}/view?file=${file.id}`}>
                    <ExternalLink size={13} aria-hidden="true" /> View
                  </Link>
                  <label className="btn btn-ghost btn-sm" style={{ cursor: "pointer" }}>
                    <Replace size={13} aria-hidden="true" /> Replace
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      hidden
                      disabled={busy}
                      onChange={(e) => {
                        const next = e.target.files?.[0];
                        if (next) void replaceFile(file, next);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setEditingId(file.id)}>
                    <Pencil size={13} aria-hidden="true" /> Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ color: "#b91c1c" }}
                    disabled={busy}
                    onClick={() => void removeFile(file)}
                  >
                    <Trash2 size={13} aria-hidden="true" /> Remove
                  </button>
                </span>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

function FileEditRow({
  file,
  busy,
  onSave,
  onCancel,
}: {
  file: StudyFile;
  busy: boolean;
  onSave: (values: { chapterNo: string; chapterName: string; name: string }) => void;
  onCancel: () => void;
}) {
  const [chapterNo, setChapterNo] = useState(file.chapterNo);
  const [chapterName, setChapterName] = useState(file.chapterName);
  const [name, setName] = useState(file.name);

  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="field">
          <span className="label">Chapter no.</span>
          <input className="input" value={chapterNo} maxLength={12} onChange={(e) => setChapterNo(e.target.value)} disabled={busy} />
        </label>
        <label className="field">
          <span className="label">Chapter name</span>
          <input className="input" value={chapterName} maxLength={140} onChange={(e) => setChapterName(e.target.value)} disabled={busy} />
        </label>
        <label className="field">
          <span className="label">File name</span>
          <input className="input" value={name} maxLength={160} onChange={(e) => setName(e.target.value)} disabled={busy} />
        </label>
      </div>
      <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={busy}
          onClick={() => onSave({ chapterNo: chapterNo.trim(), chapterName: chapterName.trim(), name: name.trim() })}
        >
          <Save size={14} aria-hidden="true" /> Save
        </button>
      </div>
    </div>
  );
}
