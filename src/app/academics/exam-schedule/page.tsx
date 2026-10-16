"use client";

import { useMemo, useState } from "react";
import { CalendarClock, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, MapPin, Rows3 } from "lucide-react";
import { EmptyState } from "@/components/ui";
import type { Exam } from "@/lib/types";
import {
  AcademicPage,
  Chip,
  countdownLabel,
  daysUntil,
  formatClock,
  formatDay,
  useAcademics,
  type AcademicsPayload,
} from "@/components/academics/core";

type ViewMode = "list" | "calendar";

export default function ExamSchedulePage() {
  const { state, retry } = useAcademics();

  return (
    <AcademicPage
      icon={<ClipboardList size={22} />}
      title="Exam Schedule"
      subtitle="Every upcoming exam with date, venue, timing and hall instructions — as a list or a month calendar."
      state={state}
      retry={retry}
      loadingLabel="Loading exam schedule…"
    >
      {(data) => <ExamsView data={data} />}
    </AcademicPage>
  );
}

function ExamsView({ data }: { data: AcademicsPayload }) {
  const exams = data.exams;
  const [view, setView] = useState<ViewMode>("list");
  const [openId, setOpenId] = useState<string | null>(null);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const nextExam = exams.find((e) => daysUntil(e.date) >= 0) ?? null;
  const nextCountdown = nextExam ? countdownLabel(nextExam.date) : null;

  const byDay = useMemo(() => {
    const map = new Map<string, Exam[]>();
    exams.forEach((e) => {
      const key = e.date.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    });
    return map;
  }, [exams]);

  if (exams.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays size={26} />}
        title="No exams scheduled"
        body="The exam cell has not published a timetable yet. It will show up here — with countdowns — as soon as it is released."
      />
    );
  }

  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const leadingBlanks = (new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay() + 6) % 7;
  const monthPrefix = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
  const monthExamCount = exams.filter((e) => e.date.startsWith(monthPrefix)).length;
  const selectedExams = selectedDay ? (byDay.get(selectedDay) ?? []) : [];

  function shiftMonth(delta: number) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
    setSelectedDay(null);
  }

  return (
    <div className="stack">
      {nextExam && nextCountdown ? (
        <section className="card card-pad row" style={{ gap: 12, flexWrap: "wrap" }} aria-label="Next exam">
          <span className="brand-mark" style={{ width: 38, height: 38 }} aria-hidden="true">
            <CalendarClock size={18} />
          </span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p className="text-sm muted">Next exam</p>
            <p style={{ fontSize: 15.5, fontWeight: 700 }}>
              {nextExam.subject} · {formatDay(nextExam.date)} · {formatClock(nextExam.startTime)}
            </p>
          </div>
          <span className={nextCountdown.days <= 3 ? "tag tag-danger" : "tag tag-warn"}>
            {nextCountdown.days < 0 ? "Completed" : `${nextCountdown.label}`}
          </span>
        </section>
      ) : null}

      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div className="chip-row" role="group" aria-label="Exam schedule view">
          <Chip active={view === "list"} onClick={() => setView("list")}>
            <Rows3 size={15} aria-hidden="true" /> List
          </Chip>
          <Chip active={view === "calendar"} onClick={() => setView("calendar")}>
            <CalendarDays size={15} aria-hidden="true" /> Calendar
          </Chip>
        </div>
        <p className="text-sm muted" role="status">
          {exams.length} exam{exams.length === 1 ? "" : "s"} · {exams.filter((e) => daysUntil(e.date) >= 0).length} upcoming
        </p>
      </div>

      {view === "list" ? (
        <div className="stack">
          {exams.map((exam) => (
            <ExamCard
              key={exam.id}
              exam={exam}
              expanded={openId === exam.id}
              onToggle={() => setOpenId((id) => (id === exam.id ? null : exam.id))}
            />
          ))}
        </div>
      ) : (
        <section className="card card-pad stack" aria-label={`Calendar for ${monthLabel}`}>
          <div className="row" style={{ justifyContent: "space-between", gap: 10 }}>
            <button type="button" className="icon-btn" onClick={() => shiftMonth(-1)} aria-label="Previous month">
              <ChevronLeft size={19} />
            </button>
            <h2 style={{ fontSize: 17 }}>{monthLabel}</h2>
            <button type="button" className="icon-btn" onClick={() => shiftMonth(1)} aria-label="Next month">
              <ChevronRight size={19} />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6 }}>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="text-sm muted" style={{ textAlign: "center", fontWeight: 700 }}>
                {d}
              </div>
            ))}

            {Array.from({ length: leadingBlanks }, (_, i) => (
              <div key={`blank-${i}`} aria-hidden="true" />
            ))}

            {Array.from({ length: daysInMonth }, (_, i) => {
              const dayNumber = i + 1;
              const iso = `${monthPrefix}-${String(dayNumber).padStart(2, "0")}`;
              const dayExams = byDay.get(iso) ?? [];
              const isToday = daysUntil(iso) === 0;
              const isSelected = selectedDay === iso;
              const hasExam = dayExams.length > 0;

              const style: React.CSSProperties = {
                minHeight: 54,
                borderRadius: 10,
                border: isSelected
                  ? "1px solid var(--color-brand-600)"
                  : isToday
                    ? "1px solid var(--color-brand-300)"
                    : "1px solid var(--color-ink-200)",
                background: isSelected ? "var(--color-brand-600)" : isToday ? "var(--color-brand-50)" : "#fff",
                color: isSelected ? "#fff" : "var(--color-ink-900)",
                fontWeight: hasExam ? 700 : 500,
                cursor: hasExam ? "pointer" : "default",
                padding: "6px 4px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                font: "inherit",
              };

              if (!hasExam) {
                return (
                  <div key={iso} style={{ ...style, background: "transparent", borderColor: "transparent", color: "var(--color-ink-400)", fontWeight: 400 }}>
                    {dayNumber}
                  </div>
                );
              }

              return (
                <button
                  key={iso}
                  type="button"
                  style={style}
                  onClick={() => setSelectedDay(iso)}
                  aria-pressed={isSelected}
                  aria-label={`${formatDay(iso)} — ${dayExams.length} exam${dayExams.length === 1 ? "" : "s"}`}
                >
                  {dayNumber}
                  <span
                    aria-hidden="true"
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.02em",
                      color: isSelected ? "#fff" : "var(--color-brand-700)",
                    }}
                  >
                    {dayExams.length} exam{dayExams.length === 1 ? "" : "s"}
                  </span>
                </button>
              );
            })}
          </div>

          {monthExamCount === 0 ? (
            <p className="text-sm muted" style={{ textAlign: "center", padding: "10px 0" }}>
              No exams in {monthLabel}. Use the arrows to browse another month.
            </p>
          ) : selectedDay ? (
            <div className="stack">
              <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                <h3 style={{ fontSize: 16 }}>{formatDay(selectedDay)}</h3>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedDay(null)}>
                  Clear day
                </button>
              </div>
              {selectedExams.map((exam) => (
                <ExamCard key={exam.id} exam={exam} />
              ))}
            </div>
          ) : (
            <p className="text-sm muted" style={{ textAlign: "center", padding: "10px 0" }}>
              {monthExamCount} exam{monthExamCount === 1 ? "" : "s"} this month — select a highlighted date to see the
              details.
            </p>
          )}
        </section>
      )}

      <p className="hint">
        Source: exam cell timetable published from the admin dashboard (sample/demo data). Report clashes to the exam
        cell — this schedule is read-only for students.
      </p>
    </div>
  );
}

function ExamCard({ exam, expanded, onToggle }: { exam: Exam; expanded?: boolean; onToggle?: () => void }) {
  const countdown = countdownLabel(exam.date);
  const upcoming = !countdown.past;

  const countdownTag = countdown.past
    ? "tag tag-muted"
    : countdown.days <= 1
      ? "tag tag-danger"
      : countdown.days <= 7
        ? "tag tag-warn"
        : "tag tag-accent";

  const instructionsId = `exam-instructions-${exam.id}`;

  return (
    <article
      className="card card-pad stack"
      style={{
        gap: 8,
        borderLeft: exam.important ? "3px solid #ef4444" : undefined,
        background: exam.important ? "#fffbeb" : undefined,
        opacity: upcoming ? 1 : 0.8,
      }}
    >
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          <span className={countdownTag}>{countdown.label}</span>
          <span className="tag tag-muted">{exam.type}</span>
          {exam.important ? <span className="tag tag-danger">Important</span> : null}
        </div>
        <span className="text-sm muted">{exam.name}</span>
      </div>

      <div>
        <h3 style={{ fontSize: 16 }}>{exam.subject}</h3>
        <p className="text-sm muted">
          {exam.code} · {upcoming ? "upcoming" : "completed"}
        </p>
      </div>

      <dl
        className="text-sm"
        style={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 12, rowGap: 4, margin: 0 }}
      >
        <dt className="muted">Date</dt>
        <dd style={{ margin: 0 }}>{formatDay(exam.date)}</dd>
        <dt className="muted">Time</dt>
        <dd style={{ margin: 0 }}>
          {formatClock(exam.startTime)} – {formatClock(exam.endTime)}
        </dd>
        <dt className="muted">Venue</dt>
        <dd style={{ margin: 0 }}>
          <MapPin size={13} aria-hidden="true" style={{ verticalAlign: "-2px" }} /> {exam.venue}
        </dd>
      </dl>

      {onToggle ? (
        <button
          type="button"
          className="row text-sm"
          aria-expanded={Boolean(expanded)}
          aria-controls={instructionsId}
          onClick={onToggle}
          style={{
            background: "transparent",
            border: 0,
            padding: 0,
            cursor: "pointer",
            fontWeight: 700,
            color: "var(--color-brand-700)",
            width: "fit-content",
            gap: 6,
          }}
        >
          Instructions
          <ChevronDown
            size={15}
            aria-hidden="true"
            style={{ transition: "transform 0.15s ease", transform: expanded ? "rotate(180deg)" : "none" }}
          />
        </button>
      ) : null}

      {exam.instructions && (!onToggle || expanded) ? (
        <p
          id={instructionsId}
          className="text-sm"
          style={{
            background: "var(--color-ink-100)",
            borderRadius: 10,
            padding: "9px 11px",
            margin: 0,
            color: "var(--color-ink-700)",
          }}
        >
          {exam.instructions}
        </p>
      ) : null}
    </article>
  );
}
