"use client";

import { useState } from "react";
import {
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User2,
} from "lucide-react";
import { EmptyState } from "@/components/ui";
import { DAYS, type DayName, type Slot } from "@/lib/types";
import {
  AcademicPage,
  BackLink,
  Chip,
  DemoBadge,
  LoadingCards,
  PageHead,
  formatClock,
  minutesOf,
  pickTimetable,
  timeAgo,
  todayName,
  useAcademics,
  type AcademicsPayload,
} from "@/components/academics/core";

type ViewMode = "daily" | "weekly";

export default function TimetablePage() {
  const { state, retry } = useAcademics();

  return (
    <AcademicPage
      icon={<CalendarClock size={22} />}
      title="Timetable"
      subtitle="Your weekly class schedule with labs, breaks and the next class of the day highlighted."
      state={state}
      retry={retry}
      loadingLabel="Loading timetable…"
    >
      {(data) => <TimetableView data={data} />}
    </AcademicPage>
  );
}

function TimetableView({ data }: { data: AcademicsPayload }) {
  const today = todayName();
  const timetable = pickTimetable(data.timetables, data.viewer);

  const [view, setView] = useState<ViewMode>("weekly");
  const [day, setDay] = useState<DayName>(today ?? DAYS[0]);
  const [weekOffset, setWeekOffset] = useState(0);

  if (!timetable || timetable.slots.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays size={26} />}
        title="No timetable published yet"
        body={`The department has not published a timetable for ${data.viewer.department}, ${data.viewer.year}. It will appear here as soon as it is uploaded.`}
      />
    );
  }

  const slots = timetable.slots;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const monday = mondayOfWeek(weekOffset);
  const weekDates = DAYS.map((_, i) => addDays(monday, i));
  const isCurrentWeek = weekOffset === 0;

  const todaySlots = today
    ? slots
        .filter((s) => s.day === today && s.kind !== "break")
        .sort((a, b) => minutesOf(a.start) - minutesOf(b.start))
    : [];
  const running = todaySlots.find((s) => minutesOf(s.start) <= nowMinutes && nowMinutes < minutesOf(s.end));
  const next = running ?? todaySlots.find((s) => minutesOf(s.start) > nowMinutes) ?? null;

  const daySlots = slots
    .filter((s) => s.day === day)
    .sort((a, b) => minutesOf(a.start) - minutesOf(b.start));

  const ranges = Array.from(new Set(slots.map((s) => `${s.start}|${s.end}`)))
    .map((key) => {
      const [start = "", end = ""] = key.split("|");
      return { key, start, end };
    })
    .sort((a, b) => minutesOf(a.start) - minutesOf(b.start) || minutesOf(a.end) - minutesOf(b.end));

  const isNext = (slot: Slot) => next !== null && slot.id === next.id;
  const selectedIndex = DAYS.indexOf(day);
  const selectedDate = weekDates[selectedIndex];

  function goToday() {
    setWeekOffset(0);
    setDay(today ?? DAYS[0]);
  }

  return (
    <div className="stack">
      <section className="acad-hero row" style={{ gap: 12, flexWrap: "wrap", alignItems: "center" }} aria-label="Next class">
        <span className="brand-mark" style={{ width: 40, height: 40 }} aria-hidden="true">
          <Clock size={19} />
        </span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <p className="text-sm muted">Next up</p>
          {!isCurrentWeek ? (
            <p style={{ fontSize: 15, fontWeight: 600 }}>
              Viewing {weekRangeLabel(monday)} — your weekly timetable repeats every week.
            </p>
          ) : today === null ? (
            <p style={{ fontSize: 15, fontWeight: 600 }}>Sunday — no classes are scheduled. See you Monday.</p>
          ) : next ? (
            <p style={{ fontSize: 15, fontWeight: 600 }}>
              {next.subject} · {formatClock(next.start)}–{formatClock(next.end)} · {next.room}
              <span className={running ? "tag tag-accent" : "tag"} style={{ marginLeft: 8 }}>
                {running ? "Happening now" : "Up next"}
              </span>
            </p>
          ) : (
            <p style={{ fontSize: 15, fontWeight: 600 }}>No more classes today — you&apos;re done for the day.</p>
          )}
        </div>
        <span className="tag tag-muted">Updated {timeAgo(timetable.updatedAt)}</span>
      </section>

      <section className="card card-pad stack" style={{ gap: 14 }} aria-label="Week navigation">
        <div className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div className="row" style={{ gap: 8 }}>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setWeekOffset((w) => w - 1)}
              aria-label="Previous week"
            >
              <ChevronLeft size={19} />
            </button>
            <div style={{ minWidth: 150, textAlign: "center" }}>
              <strong style={{ fontSize: 15 }}>{weekRangeLabel(monday)}</strong>
              <span className="text-sm muted" style={{ display: "block" }}>
                {isCurrentWeek ? "This week" : weekOffset === 1 ? "Next week" : weekOffset === -1 ? "Last week" : "Week view"}
              </span>
            </div>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setWeekOffset((w) => w + 1)}
              aria-label="Next week"
            >
              <ChevronRight size={19} />
            </button>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={goToday}>
            Today
          </button>
        </div>

        <div className="day-strip" role="group" aria-label="Select day">
          {DAYS.map((d, i) => {
            const date = weekDates[i];
            const isToday = isCurrentWeek && d === today;
            return (
              <button
                key={d}
                type="button"
                className="day-pill"
                data-today={isToday ? "true" : undefined}
                data-active={day === d ? "true" : undefined}
                aria-pressed={day === d}
                aria-label={`${d}, ${date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}`}
                onClick={() => setDay(d)}
              >
                <span className="dow">{d.slice(0, 3)}</span>
                <span className="dom">{date.getDate()}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <p className="text-sm muted" role="status">
          {timetable.department} · {timetable.year} · {view === "weekly" ? "full week" : day}
        </p>
        <div className="chip-row" role="group" aria-label="Timetable view">
          <Chip active={view === "daily"} onClick={() => setView("daily")}>
            <CalendarDays size={15} aria-hidden="true" /> Daily
          </Chip>
          <Chip active={view === "weekly"} onClick={() => setView("weekly")}>
            <CalendarClock size={15} aria-hidden="true" /> Weekly
          </Chip>
        </div>
      </div>

      {view === "daily" ? (
        <section className="stack" aria-label={`Classes on ${day}`}>
          <div className="section-head">
            <h2>
              {day}
              {selectedDate ? (
                <span className="text-sm muted" style={{ fontWeight: 500, marginLeft: 8 }}>
                  {selectedDate.toLocaleDateString(undefined, { day: "numeric", month: "long" })}
                </span>
              ) : null}
            </h2>
            <span className="tag tag-muted">{daySlots.filter((s) => s.kind !== "break").length} classes</span>
          </div>

          {daySlots.length === 0 ? (
            <EmptyState
              icon={<CalendarDays size={26} />}
              title={`No classes on ${day}`}
              body="Enjoy the light day, or switch to another day above."
            />
          ) : (
            daySlots.map((slot) => <SlotCard key={slot.id} slot={slot} highlight={isNext(slot)} running={running?.id === slot.id} />)
          )}
        </section>
      ) : (
        <div className="panel" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 860, borderCollapse: "collapse" }}>
            <caption className="sr-only">
              Weekly timetable for {timetable.department}, {timetable.year}: Monday to Saturday across time slots
            </caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="text-sm"
                  style={{ textAlign: "left", padding: "11px 12px", background: "var(--color-ink-100)", color: "var(--color-ink-700)", width: 116 }}
                >
                  Time
                </th>
                {DAYS.map((d) => (
                  <th
                    key={d}
                    scope="col"
                    className="text-sm"
                    style={{
                      textAlign: "left",
                      padding: "11px 12px",
                      background: d === today ? "var(--color-brand-50)" : "var(--color-ink-100)",
                      color: d === today ? "var(--color-brand-700)" : "var(--color-ink-700)",
                    }}
                  >
                    {d}
                    {d === today ? (
                      <span className="tag tag-accent" style={{ marginLeft: 6 }}>
                        Today
                      </span>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranges.map((range, rowIndex) => (
                <tr key={range.key} style={{ borderTop: rowIndex === 0 ? "none" : "1px solid var(--color-ink-200)" }}>
                  <th
                    scope="row"
                    className="text-sm"
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      fontWeight: 600,
                      color: "var(--color-ink-700)",
                      background: "var(--color-ink-100)",
                      verticalAlign: "top",
                    }}
                  >
                    {formatClock(range.start)}
                    <span style={{ display: "block", fontWeight: 400, color: "var(--color-ink-500)" }}>
                      {formatClock(range.end)}
                    </span>
                  </th>
                  {DAYS.map((d) => {
                    const slot = slots.find((s) => s.day === d && s.start === range.start && s.end === range.end);
                    return <GridCell key={d} slot={slot} highlight={slot ? isNext(slot) : false} today={d === today} />;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <span className="tag tag-accent">Lab</span>
        <span className="tag tag-muted">Break</span>
        <span className="tag">Lecture</span>
        <span className="hint">Outlined cell = your next class today</span>
      </div>

      <p className="hint">
        Source: department timetable uploaded from the admin dashboard (sample/demo data). Class cancellations and
        changes are announced through Notices — they are never edited into this grid.
      </p>
    </div>
  );
}

function SlotCard({ slot, highlight, running }: { slot: Slot; highlight: boolean; running: boolean }) {
  const isBreak = slot.kind === "break";
  const isLab = slot.kind === "lab";

  return (
    <article className="slot-card" data-kind={slot.kind} style={highlight ? { borderColor: "var(--color-brand-400)" } : undefined}>
      <div className="slot-time">
        {formatClock(slot.start)}
        <span className="end">{formatClock(slot.end)}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <strong style={{ fontSize: 15.5 }}>{slot.subject}</strong>
          <span className={isBreak ? "tag tag-muted" : isLab ? "tag tag-accent" : "tag"}>
            {isBreak ? "Break" : isLab ? "Lab" : "Lecture"}
            {highlight ? ` · ${running ? "now" : "next"}` : ""}
          </span>
        </div>
        <p className="text-sm muted" style={{ marginTop: 4 }}>
          {isBreak ? (
            <>
              <MapPin size={13} aria-hidden="true" style={{ verticalAlign: "-2px" }} /> {slot.room}
            </>
          ) : (
            <>
              <User2 size={13} aria-hidden="true" style={{ verticalAlign: "-2px" }} /> {slot.faculty} ·{" "}
              <MapPin size={13} aria-hidden="true" style={{ verticalAlign: "-2px" }} /> {slot.room}
            </>
          )}
        </p>
      </div>
    </article>
  );
}

function GridCell({ slot, highlight, today }: { slot: Slot | undefined; highlight: boolean; today: boolean }) {
  const base: React.CSSProperties = {
    padding: "10px 12px",
    verticalAlign: "top",
    minWidth: 132,
    background: today ? "color-mix(in srgb, var(--color-brand-50) 55%, #fff)" : undefined,
    boxShadow: highlight ? "inset 0 0 0 2px var(--color-brand-500)" : undefined,
  };

  if (!slot) {
    return (
      <td style={{ ...base, color: "var(--color-ink-400)" }} aria-label="Free period">
        —
      </td>
    );
  }

  if (slot.kind === "break") {
    return (
      <td style={{ ...base, background: "var(--color-ink-100)", color: "var(--color-ink-500)" }}>
        <span className="text-sm" style={{ fontWeight: 600 }}>
          {slot.subject}
        </span>
        <span style={{ display: "block", fontSize: 12 }}>{slot.room}</span>
      </td>
    );
  }

  const isLab = slot.kind === "lab";
  return (
    <td style={{ ...base, background: isLab ? "var(--color-accent-50)" : undefined }}>
      <span className="text-sm" style={{ fontWeight: 700, display: "block" }}>
        {slot.subject}
      </span>
      <span style={{ display: "block", fontSize: 12, color: "var(--color-ink-500)" }}>
        {slot.faculty} · {slot.room}
      </span>
      <span className={isLab ? "tag tag-accent" : "tag"} style={{ marginTop: 6 }}>
        {isLab ? "Lab" : highlight ? "Next" : "Class"}
      </span>
    </td>
  );
}

/* ------------------------------------------------------------- date helpers */

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Monday of the week `offsetWeeks` away from the current week. */
function mondayOfWeek(offsetWeeks: number, base = new Date()): Date {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const weekday = d.getDay(); // 0 = Sunday … 6 = Saturday
  const diff = weekday === 0 ? -6 : 1 - weekday;
  return addDays(d, diff + offsetWeeks * 7);
}

function weekRangeLabel(monday: Date): string {
  const saturday = addDays(monday, 5);
  const short = (d: Date) => d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return `${short(monday)} – ${short(saturday)}, ${saturday.getFullYear()}`;
}
