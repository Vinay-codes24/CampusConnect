"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  GraduationCap,
  MapPin,
} from "lucide-react";
import { EmptyState } from "@/components/ui";
import type { Exam } from "@/lib/types";
import {
  AcademicPage,
  DemoBadge,
  LoadingCards,
  countdownLabel,
  daysUntil,
  formatClock,
  formatDay,
  parseDay,
  useAcademics,
  type AcademicsPayload,
} from "@/components/academics/core";

type Tone = "brand" | "accent" | "warn" | "danger";

export default function AcademicCalendarPage() {
  const { state, retry } = useAcademics();

  return (
    <AcademicPage
      icon={<GraduationCap size={22} />}
      title="Academic Calendar"
      subtitle="Verified academic dates for the semester, plotted on a clean month view with an upcoming-events panel."
      state={state}
      retry={retry}
      loadingLabel="Loading academic calendar…"
    >
      {(data) => <CalendarView data={data} />}
    </AcademicPage>
  );
}

function CalendarView({ data }: { data: AcademicsPayload }) {
  const exams = data.exams;
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const byDay = useMemo(() => {
    const map = new Map<string, Exam[]>();
    exams.forEach((exam) => {
      const key = exam.date.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(exam);
      map.set(key, list);
    });
    return map;
  }, [exams]);

  if (exams.length === 0) {
    return (
      <section className="acad-hero acad-hero--center">
        <EmptyState
          icon={<CalendarDays size={26} />}
          title="Academic calendar not configured yet"
          body="No verified academic dates have been published for your university. Semester start/end dates, exam dates and deadlines will appear here once the department uploads them — nothing is invented."
        />
      </section>
    );
  }

  const upcoming = exams.filter((e) => daysUntil(e.date) >= 0);
  const nextExam = upcoming[0] ?? null;
  const nextCountdown = nextExam ? countdownLabel(nextExam.date) : null;

  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const monthPrefix = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const leadingBlanks = (new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay() + 6) % 7;
  const monthCount = exams.filter((e) => e.date.startsWith(monthPrefix)).length;
  const selectedExams = selectedDay ? (byDay.get(selectedDay) ?? []) : [];

  function shiftMonth(delta: number) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
    setSelectedDay(null);
  }

  function goToday() {
    const now = new Date();
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDay(null);
  }

  function jumpTo(iso: string) {
    const d = parseDay(iso);
    setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
    setSelectedDay(iso.slice(0, 10));
  }

  return (
    <div className="stack">
      {nextExam && nextCountdown ? (
        <section className="acad-hero row" style={{ gap: 12, flexWrap: "wrap", alignItems: "center" }} aria-label="Next academic event">
          <span className="brand-mark" style={{ width: 40, height: 40 }} aria-hidden="true">
            <GraduationCap size={19} />
          </span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p className="text-sm muted">Next academic event</p>
            <p style={{ fontSize: 15.5, fontWeight: 700 }}>
              {nextExam.subject} · {formatDay(nextExam.date)} · {formatClock(nextExam.startTime)}
            </p>
          </div>
          <span className={nextCountdown.days <= 3 ? "tag tag-danger" : "tag tag-warn"}>{nextCountdown.label}</span>
        </section>
      ) : null}

      <div className="cal-layout">
        <section className="card card-pad stack" style={{ gap: 16 }} aria-label={`Calendar for ${monthLabel}`}>
          <div className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="icon-btn" onClick={() => shiftMonth(-1)} aria-label="Previous month">
                <ChevronLeft size={19} />
              </button>
              <h2 style={{ fontSize: 17, minWidth: 150, textAlign: "center" }}>{monthLabel}</h2>
              <button type="button" className="icon-btn" onClick={() => shiftMonth(1)} aria-label="Next month">
                <ChevronRight size={19} />
              </button>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={goToday}>
              Today
            </button>
          </div>

          <div className="cal-grid" role="grid" aria-label={`${monthLabel} calendar`}>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="cal-dow" aria-hidden="true">
                {d}
              </div>
            ))}

            {Array.from({ length: leadingBlanks }, (_, i) => (
              <div key={`blank-${i}`} data-outside="true" aria-hidden="true" />
            ))}

            {Array.from({ length: daysInMonth }, (_, i) => {
              const dayNumber = i + 1;
              const iso = `${monthPrefix}-${String(dayNumber).padStart(2, "0")}`;
              const dayExams = byDay.get(iso) ?? [];
              const isToday = daysUntil(iso) === 0;
              const isSelected = selectedDay === iso;
              const hasEvents = dayExams.length > 0;

              const label = (
                <>
                  <span className="cal-date">{dayNumber}</span>
                  {dayExams.slice(0, 2).map((exam) => (
                    <span key={exam.id} className={`cal-event cal-event--${examTone(exam.type)}`}>
                      {exam.code || exam.subject}
                    </span>
                  ))}
                  {dayExams.length > 2 ? (
                    <span className="text-sm muted" style={{ fontSize: 10.5, fontWeight: 700 }}>
                      +{dayExams.length - 2} more
                    </span>
                  ) : null}
                </>
              );

              if (!hasEvents) {
                return (
                  <div
                    key={iso}
                    className="cal-cell"
                    data-today={isToday ? "true" : undefined}
                    style={{ opacity: isToday ? 1 : 0.72 }}
                  >
                    <span className="cal-date" style={{ color: "var(--color-ink-400)", fontWeight: isToday ? 700 : 500 }}>
                      {dayNumber}
                    </span>
                  </div>
                );
              }

              return (
                <button
                  key={iso}
                  type="button"
                  className="cal-cell"
                  data-today={isToday ? "true" : undefined}
                  data-selected={isSelected ? "true" : undefined}
                  data-clickable="true"
                  aria-pressed={isSelected}
                  aria-label={`${formatDay(iso)} — ${dayExams.length} academic event${dayExams.length === 1 ? "" : "s"}`}
                  onClick={() => setSelectedDay(iso)}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {selectedDay ? (
            <div className="stack" style={{ gap: 10 }}>
              <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                <h3 style={{ fontSize: 16 }}>{formatDay(selectedDay)}</h3>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedDay(null)}>
                  Clear day
                </button>
              </div>
              {selectedExams.map((exam) => (
                <EventRow key={exam.id} exam={exam} />
              ))}
            </div>
          ) : (
            <p className="text-sm muted" style={{ textAlign: "center" }}>
              {monthCount === 0
                ? `No verified academic events in ${monthLabel}. Use the arrows to browse another month.`
                : `${monthCount} academic event${monthCount === 1 ? "" : "s"} this month — select a highlighted date for details.`}
            </p>
          )}
        </section>

        <aside className="card card-pad stack" style={{ gap: 10, alignSelf: "start" }} aria-label="Upcoming academic events">
          <div className="section-head">
            <h2 style={{ fontSize: 16 }}>Upcoming</h2>
            <span className="tag tag-muted">{upcoming.length}</span>
          </div>

          {upcoming.length === 0 ? (
            <p className="text-sm muted">No upcoming academic events on the verified calendar.</p>
          ) : (
            <div className="stack" style={{ gap: 4 }}>
              {upcoming.map((exam) => {
                const iso = exam.date.slice(0, 10);
                const selected = selectedDay === iso;
                const d = parseDay(iso);
                return (
                  <button
                    key={exam.id}
                    type="button"
                    className="event-row"
                    data-clickable="true"
                    data-selected={selected ? "true" : undefined}
                    onClick={() => jumpTo(iso)}
                  >
                    <span className="event-date" aria-hidden="true">
                      <span className="d">{d.getDate()}</span>
                      <span className="m">{d.toLocaleDateString(undefined, { month: "short" })}</span>
                    </span>
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <strong style={{ display: "block", fontSize: 14 }}>{exam.subject}</strong>
                      <span className="text-sm muted" style={{ display: "block" }}>
                        {formatClock(exam.startTime)} · {exam.type}
                      </span>
                    </span>
                    <span className={`cal-event cal-event--${examTone(exam.type)}`} aria-hidden="true">
                      {exam.code}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </aside>
      </div>

      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <span className="tag tag-muted">Exam types</span>
        <span className="cal-event cal-event--brand">Semester</span>
        <span className="cal-event cal-event--warn">Internal</span>
        <span className="cal-event cal-event--accent">Lab</span>
        <span className="cal-event cal-event--danger">Backlog</span>
      </div>

      <p className="hint">
        Only verified academic dates are shown. Semester start/end dates, registration deadlines and holidays are not
        configured yet, so they are intentionally left blank rather than invented.
      </p>
    </div>
  );
}

function EventRow({ exam }: { exam: Exam }) {
  const countdown = countdownLabel(exam.date);
  const tag = countdown.past
    ? "tag tag-muted"
    : countdown.days <= 3
      ? "tag tag-danger"
      : countdown.days <= 7
        ? "tag tag-warn"
        : "tag tag-accent";

  return (
    <article className="card card-pad stack" style={{ gap: 8, padding: 14 }}>
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          <span className={`cal-event cal-event--${examTone(exam.type)}`}>{exam.type}</span>
          {exam.important ? <span className="tag tag-danger">Important</span> : null}
        </div>
        <span className={tag}>{countdown.past ? "Completed" : countdown.label}</span>
      </div>
      <div>
        <h3 style={{ fontSize: 15.5 }}>{exam.subject}</h3>
        <p className="text-sm muted">{exam.code}</p>
      </div>
      <p className="text-sm muted">
        <Clock size={13} aria-hidden="true" style={{ verticalAlign: "-2px" }} /> {formatClock(exam.startTime)} –{" "}
        {formatClock(exam.endTime)} ·{" "}
        <MapPin size={13} aria-hidden="true" style={{ verticalAlign: "-2px" }} /> {exam.venue}
      </p>
    </article>
  );
}

function examTone(type: Exam["type"]): Tone {
  if (type === "Semester") return "brand";
  if (type === "Lab") return "accent";
  if (type === "Internal") return "warn";
  return "danger";
}
