"use client";

import { useMemo, useState } from "react";
import { CalendarClock, ExternalLink, FileCheck2, GraduationCap, SearchX, ShieldCheck, TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/ui";
import {
  AcademicPage,
  Chip,
  SearchField,
  Toolbar,
  daysUntil,
  formatDay,
  parseDay,
  semesterEndDate,
  timeAgo,
  useAcademics,
  type AcademicsPayload,
} from "@/components/academics/core";

type DeadlineFilter = "any" | "15" | "30" | "semester";
type SourceFilter = "All" | "Official" | "Community";

const DEADLINE_OPTIONS: { value: DeadlineFilter; label: string }[] = [
  { value: "any", label: "Any deadline" },
  { value: "15", label: "Next 15 days" },
  { value: "30", label: "Next 30 days" },
  { value: "semester", label: "This semester" },
];

const SOURCE_OPTIONS: SourceFilter[] = ["All", "Official", "Community"];

export default function ScholarshipsPage() {
  const { state, retry } = useAcademics();

  return (
    <AcademicPage
      icon={<GraduationCap size={22} />}
      title="Scholarships"
      subtitle="Funds, fellowships and grants — filtered by eligibility, deadline and how trustworthy the listing is."
      state={state}
      retry={retry}
      loadingLabel="Loading scholarships…"
    >
      {(data) => <ScholarshipsView data={data} />}
    </AcademicPage>
  );
}

function ScholarshipsView({ data }: { data: AcademicsPayload }) {
  const [query, setQuery] = useState("");
  const [deadline, setDeadline] = useState<DeadlineFilter>("any");
  const [source, setSource] = useState<SourceFilter>("All");

  const semesterEnd = useMemo(() => semesterEndDate(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.scholarships.filter((s) => {
      if (q) {
        const haystack = `${s.name} ${s.provider} ${s.eligibility} ${s.description}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      const days = daysUntil(s.deadline);
      if (deadline === "15" && !(days >= 0 && days <= 15)) return false;
      if (deadline === "30" && !(days >= 0 && days <= 30)) return false;
      if (deadline === "semester" && !(days >= 0 && parseDay(s.deadline).getTime() <= semesterEnd.getTime())) {
        return false;
      }
      if (source !== "All" && s.source !== source) return false;
      return true;
    });
  }, [data.scholarships, query, deadline, source, semesterEnd]);

  const filtersActive = query.trim() !== "" || deadline !== "any" || source !== "All";

  function clearFilters() {
    setQuery("");
    setDeadline("any");
    setSource("All");
  }

  const closingSoonCount = filtered.filter((s) => {
    const d = daysUntil(s.deadline);
    return d >= 0 && d <= 14;
  }).length;

  return (
    <div className="stack">
      <Toolbar hint="Deadlines and amounts are sample records. Always confirm on the official portal before uploading documents.">
        <SearchField
          id="scholarship-search"
          label="Search by name, provider or eligibility"
          value={query}
          onChange={setQuery}
          placeholder="e.g. income below ₹4.5 LPA, merit, travel…"
        />

        <div className="field">
          <span className="label" id="scholarship-deadline-label">
            Deadline
          </span>
          <div className="chip-row" role="group" aria-labelledby="scholarship-deadline-label">
            {DEADLINE_OPTIONS.map((opt) => (
              <Chip key={opt.value} active={deadline === opt.value} onClick={() => setDeadline(opt.value)}>
                {opt.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="label" id="scholarship-source-label">
            Listing source
          </span>
          <div className="chip-row" role="group" aria-labelledby="scholarship-source-label">
            {SOURCE_OPTIONS.map((opt) => (
              <Chip key={opt} active={source === opt} onClick={() => setSource(opt)}>
                {opt === "Official" ? "Official (verified)" : opt === "Community" ? "Community (unverified)" : "All sources"}
              </Chip>
            ))}
          </div>
        </div>
      </Toolbar>

      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <p className="text-sm muted" role="status">
          <strong>{filtered.length}</strong> of {data.scholarships.length} scholarship
          {data.scholarships.length === 1 ? "" : "s"}
          {closingSoonCount > 0 ? ` · ${closingSoonCount} closing within 14 days` : ""}
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
          title="No scholarships match those filters"
          body="Try a wider deadline window, clear the source filter or search for a broader term."
          action={
            <button type="button" className="btn btn-ghost" onClick={clearFilters}>
              Clear all filters
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          {filtered.map((s) => (
            <ScholarshipCard key={s.id} scholarship={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function ScholarshipCard({ scholarship: s }: { scholarship: AcademicsPayload["scholarships"][number] }) {
  const days = daysUntil(s.deadline);
  const official = s.source === "Official";

  const status = days < 0
    ? { label: "Closed", cls: "tag tag-danger", note: "The deadline has passed." }
    : days === 0
      ? { label: "Closes today", cls: "tag tag-danger", note: "Last day to apply." }
      : days <= 14
        ? { label: `Closing in ${days} day${days === 1 ? "" : "s"}`, cls: "tag tag-warn", note: "Apply soon — the window is nearly shut." }
        : { label: "Open", cls: "tag tag-accent", note: `${days} days left.` };

  return (
    <article className="card card-pad stack" style={{ gap: 10 }}>
      <div className="row" style={{ alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ fontSize: 16 }}>{s.name}</h3>
          <p className="text-sm muted">{s.provider}</p>
        </div>
        <span className={official ? "tag tag-accent" : "tag tag-warn"} title={official ? "Verified by the college office" : "Submitted by students, not verified"}>
          {official ? (
            <ShieldCheck size={13} aria-hidden="true" />
          ) : (
            <TriangleAlert size={13} aria-hidden="true" />
          )}
          {s.source}
        </span>
      </div>

      <p style={{ fontSize: 15, fontWeight: 700, color: "var(--color-brand-700)" }}>{s.amount}</p>

      <div className="stack" style={{ gap: 6 }}>
        <span className="label">Eligibility</span>
        <p className="text-sm">{s.eligibility}</p>
      </div>

      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <CalendarClock size={16} className="muted" aria-hidden="true" />
        <span className="text-sm">
          Applications close <strong>{formatDay(s.deadline)}</strong>
        </span>
        <span className={status.cls}>{status.label}</span>
      </div>
      <p className="hint">{status.note}</p>

      <div className="stack" style={{ gap: 6 }}>
        <span className="label row" style={{ gap: 6 }}>
          <FileCheck2 size={14} aria-hidden="true" /> Documents required
        </span>
        <ul className="row" style={{ gap: 6, flexWrap: "wrap", listStyle: "none", margin: 0, padding: 0 }}>
          {s.documents.length === 0 ? (
            <li className="text-sm muted">No documents listed.</li>
          ) : (
            s.documents.map((doc) => (
              <li key={doc}>
                <span className="tag tag-muted">{doc}</span>
              </li>
            ))
          )}
        </ul>
      </div>

      {s.description ? <p className="text-sm muted">{s.description}</p> : null}

      {!official ? (
        <p className="hint" style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "8px 10px", color: "#92400e" }}>
          Community listing — shared by a student and <strong>not verified</strong> by the college office. Confirm the
          details with the student welfare committee before sharing any documents.
        </p>
      ) : (
        <p className="hint">Official listing — published and verified by the college office.</p>
      )}

      <div className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <span className="text-sm muted">Updated {timeAgo(s.updatedAt)}</span>
        {s.applyUrl ? (
          <a className="btn btn-primary btn-sm" href={s.applyUrl} target="_blank" rel="noreferrer">
            Apply on the portal <ExternalLink size={14} aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        ) : (
          <span className="hint">Application link not published yet.</span>
        )}
      </div>
    </article>
  );
}
