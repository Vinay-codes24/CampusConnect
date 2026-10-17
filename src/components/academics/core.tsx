"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, LogIn } from "lucide-react";
import { api } from "@/lib/client";
import { useApp } from "@/components/providers";
import {
  coerceUniversityId,
  findUniversity,
  readStoredUniversity,
  type University,
  type UniversityId,
} from "@/lib/universities";
import { ErrorState, SkeletonCard } from "@/components/ui";
import {
  DAYS,
  type AttendanceRecord,
  type DayName,
  type Exam,
  type Material,
  type Scholarship,
  type SyllabusSubject,
  type Timetable,
} from "@/lib/types";

/* ------------------------------------------------------------------ data -- */

export type AcademicsPayload = {
  viewer: { id: string; department: string; year: string; role: string };
  syllabus: SyllabusSubject[];
  scholarships: Scholarship[];
  attendance: AttendanceRecord[];
  timetables: Timetable[];
  materials: Material[];
  exams: Exam[];
  demo: boolean;
};

export type AsyncState<T> =
  | { status: "loading" }
  | { status: "error"; message: string; auth: boolean }
  | { status: "ready"; data: T };

/** The API returns 401 with a "sign in" message; treat it as a prompt, not a crash. */
export function isAuthMessage(message: string): boolean {
  return /sign in|\b401\b/i.test(message);
}

/**
 * GET wrapper with loading / error / signed-out states and a retry counter.
 * Every academics page is built on this so no screen can silently swallow a failure.
 */
export function useAsyncResource<T>(path: string, enabled = true) {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setState({ status: "loading" });
    api<T>(path)
      .then((data) => {
        if (alive) setState({ status: "ready", data });
      })
      .catch((err: unknown) => {
        if (!alive) return;
        const message = err instanceof Error ? err.message : "Something went wrong.";
        setState({ status: "error", message, auth: isAuthMessage(message) });
      });
    return () => {
      alive = false;
    };
  }, [path, enabled, attempt]);

  return { state, retry };
}

/** `GET /api/academics` — syllabus, scholarships, attendance, timetable, materials, exams. */
export function useAcademics(enabled = true) {
  return useAsyncResource<AcademicsPayload>("/api/academics", enabled);
}

/**
 * Resolves the viewer's selected university without breaking SSR hydration.
 *
 * `localStorage` is a client-only API, so reading it during the first render
 * makes the server HTML and the first client render disagree. This hook keeps
 * the value `null` until after mount (matching the server), then swaps in the
 * stored / profile preference on the next paint. The signed-in profile always
 * wins over the local preference, and both are validated against the allowlist.
 */
export function useSelectedUniversity(): { ready: boolean; university: University | null } {
  const { user } = useApp();
  const [stored, setStored] = useState<UniversityId | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setStored(readStoredUniversity());
    setReady(true);
  }, []);

  const id = coerceUniversityId(user?.university) ?? stored;
  return { ready, university: findUniversity(id) };
}

/* ------------------------------------------------------------------ UI ---- */

export function PageHead({
  icon,
  title,
  subtitle,
  actions,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="row" style={{ alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
      <div className="row" style={{ alignItems: "flex-start", gap: 12 }}>
        <span className="brand-mark" style={{ width: 44, height: 44 }} aria-hidden="true">
          {icon}
        </span>
        <div>
          <h1 style={{ fontSize: 23 }}>{title}</h1>
          {subtitle ? (
            <p className="text-sm muted" style={{ marginTop: 4 }}>
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          {actions}
        </div>
      ) : null}
    </header>
  );
}

export function BackLink() {
  return (
    <Link href="/academics" className="link text-sm row" style={{ width: "fit-content", gap: 6 }}>
      <ArrowLeft size={15} aria-hidden="true" /> All academics tools
    </Link>
  );
}

export function DemoBadge() {
  return <span className="demo-badge">Demo data</span>;
}

export function SignInPrompt() {
  return (
    <div className="panel card-pad" style={{ textAlign: "center", padding: "42px 20px" }}>
      <div className="empty-icon">
        <LogIn size={26} />
      </div>
      <h2 style={{ fontSize: 18, marginBottom: 6 }}>Sign in to open your academics dashboard</h2>
      <p className="text-sm muted" style={{ maxWidth: 440, margin: "0 auto 16px" }}>
        Academic records are personal. Sign in with your college account to see your syllabus, attendance, timetable,
        scholarships and exam schedule.
      </p>
      <div className="row" style={{ justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
        <Link href="/login" className="btn btn-primary">
          <LogIn size={16} aria-hidden="true" /> Sign in
        </Link>
        <Link href="/signup" className="btn btn-ghost">
          Create account
        </Link>
      </div>
      <p className="hint" style={{ marginTop: 14 }}>
        Demo student · student@campus.edu / student123
      </p>
    </div>
  );
}

export function LoadingCards({ label = "Loading…", count = 3 }: { label?: string; count?: number }) {
  return (
    <div className="stack" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/** Renders loading / signed-out / error / ready branches for a resource. */
export function AsyncSection<T>({
  state,
  retry,
  loading,
  children,
}: {
  state: AsyncState<T>;
  retry: () => void;
  loading?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  if (state.status === "loading") return <>{loading ?? <LoadingCards />}</>;
  if (state.status === "error") {
    return state.auth ? <SignInPrompt /> : <ErrorState message={state.message} onRetry={retry} />;
  }
  return <>{children(state.data)}</>;
}

export function Chip({
  active,
  onClick,
  children,
  label,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  label?: string;
}) {
  return (
    <button type="button" className="chip" aria-pressed={active} onClick={onClick} aria-label={label}>
      {children}
    </button>
  );
}

export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}) {
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <select id={id} className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export function SearchField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="search"
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

/** A labelled filter row that stacks on mobile. */
export function Toolbar({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <section className="card card-pad stack" aria-label="Filters">
      {children}
      {hint ? <p className="hint">{hint}</p> : null}
    </section>
  );
}

/**
 * Common wrapper for all academic section pages.
 * Handles BackLink, PageHead, AsyncSection, and loading/error states.
 */
export function AcademicPage({
  icon,
  title,
  subtitle,
  state,
  retry,
  children,
  loadingLabel,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: ReactNode;
  state: AsyncState<AcademicsPayload>;
  retry: () => void;
  children: (data: AcademicsPayload) => ReactNode;
  loadingLabel?: string;
}) {
  const defaultLabel = `Loading ${title.toLowerCase()}…`;
  return (
    <div className="container stack">
      <BackLink />
      <PageHead icon={icon} title={title} subtitle={subtitle} actions={<DemoBadge />} />
      <AsyncSection state={state} retry={retry} loading={<LoadingCards label={loadingLabel ?? defaultLabel} />}>
        {children}
      </AsyncSection>
    </div>
  );
}

/* -------------------------------------------------------------- helpers --- */

export function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

export { formatDay, formatClock, parseDay, daysUntil, countdownLabel, timeAgo, initials } from "@/lib/client";

/** Weekday name for today, or null on Sunday (no classes scheduled). */
export function todayName(now = new Date()): DayName | null {
  const index = now.getDay();
  return index >= 1 && index <= 6 ? DAYS[index - 1] : null;
}

export function minutesOf(hhmm: string): number {
  const parts = hhmm.split(":");
  const h = Number.parseInt(parts[0] ?? "0", 10);
  const m = Number.parseInt(parts[1] ?? "0", 10);
  return (Number.isNaN(h) ? 0 : h) * 60 + (Number.isNaN(m) ? 0 : m);
}

/** End of the current academic semester window (Jan–May / Jun–Dec terms). */
export function semesterEndDate(now = new Date()): Date {
  const year = now.getFullYear();
  return now.getMonth() <= 4 ? new Date(year, 4, 31) : new Date(year, 11, 31);
}

/* --------------------------------------------------------- attendance ----- */

export type AttendanceStatus = "Safe" | "At risk" | "Shortage";

export const STATUS_COLOUR: Record<AttendanceStatus, string> = {
  Safe: "var(--color-accent-500)",
  "At risk": "#f59e0b",
  Shortage: "#ef4444",
};

export const STATUS_TAG: Record<AttendanceStatus, string> = {
  Safe: "tag tag-accent",
  "At risk": "tag tag-warn",
  Shortage: "tag tag-danger",
};

export function attendancePct(row: AttendanceRecord): number {
  if (!row.conducted) return 0;
  return Math.round((row.attended / row.conducted) * 1000) / 10;
}

export function attendanceStatus(row: AttendanceRecord): AttendanceStatus {
  const pct = attendancePct(row);
  if (pct >= row.minRequired) return "Safe";
  if (pct >= row.minRequired - 5) return "At risk";
  return "Shortage";
}

export function aggregateAttendance(rows: AttendanceRecord[]) {
  const conducted = rows.reduce((n, r) => n + r.conducted, 0);
  const attended = rows.reduce((n, r) => n + r.attended, 0);
  const counts = { Safe: 0, "At risk": 0, Shortage: 0 } as Record<AttendanceStatus, number>;
  rows.forEach((r) => {
    counts[attendanceStatus(r)] += 1;
  });
  return {
    conducted,
    attended,
    missed: conducted - attended,
    pct: conducted ? Math.round((attended / conducted) * 1000) / 10 : 0,
    safe: counts.Safe,
    atRisk: counts["At risk"],
    shortage: counts.Shortage,
  };
}

/** How many consecutive classes a student must attend to clear the minimum again. */
export function classesToRecover(row: AttendanceRecord): number | null {
  if (!row.conducted || row.minRequired <= 0 || row.minRequired >= 100) return null;
  const min = row.minRequired / 100;
  if (row.attended / row.conducted >= min) return null;
  for (let k = 1; k <= 500; k += 1) {
    if ((row.attended + k) / (row.conducted + k) >= min) return k;
  }
  return null;
}

/* ------------------------------------------------------------ timetable --- */

export function pickTimetable(
  timetables: Timetable[],
  viewer: { department: string; year: string },
): Timetable | null {
  return (
    timetables.find((t) => t.department === viewer.department && t.year === viewer.year) ??
    timetables[0] ??
    null
  );
}

/* ----------------------------------------------------- uploader names ----- */

/**
 * Resolves user ids (e.g. "u-meera") to display names through GET /api/users/[id].
 * Failures fall back to the raw id — never blocks the list.
 */
export function useUserNames(ids: string[]): Record<string, string> {
  const key = unique(ids).sort().join(",");
  const [names, setNames] = useState<Record<string, string>>({});
  const cache = useRef<Record<string, string>>({});

  useEffect(() => {
    const wanted = key
      .split(",")
      .filter(Boolean)
      .filter((id) => !(id in cache.current));
    if (wanted.length === 0) return;
    let alive = true;
    wanted.forEach((id) => {
      api<{ user: { name: string } | null }>(`/api/users/${encodeURIComponent(id)}`)
        .then((data) => {
          const name = data.user?.name;
          if (!alive || !name) return;
          cache.current[id] = name;
          setNames((prev) => ({ ...prev, [id]: name }));
        })
        .catch(() => undefined);
    });
    return () => {
      alive = false;
    };
  }, [key]);

  return names;
}
