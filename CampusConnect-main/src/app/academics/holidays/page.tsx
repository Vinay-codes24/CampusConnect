"use client";

import { CalendarHeart, PartyPopper, Sparkles } from "lucide-react";
import { type UniversityHoliday } from "@/lib/universities";
import {
  AcademicPage,
  DemoBadge,
  countdownLabel,
  daysUntil,
  useSelectedUniversity,
} from "@/components/academics/core";

export default function HolidaysPage() {
  const { ready, university } = useSelectedUniversity();

  const holidays = (university?.holidays ?? [])
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = holidays.filter((h) => daysUntil(h.date) >= 0);
  const past = holidays.filter((h) => daysUntil(h.date) < 0).reverse();
  const next = upcoming[0] ?? null;

  // Use a mock state for AcademicPage since holidays don't use useAcademics
  const state = { status: "ready" as const, data: { viewer: { id: "", department: "", year: "", role: "" }, exams: [], syllabus: [], scholarships: [], attendance: [], timetables: [], materials: [], demo: true } };
  const retry = () => {};

  return (
    <AcademicPage
      icon={<CalendarHeart size={22} />}
      title="Holidays"
      subtitle="University-specific holidays with a countdown to the next one, so you always know when campus is closed."
      state={state}
      retry={retry}
    >
      {(data) => (
        <>
          {!ready ? (
            <section className="card card-pad row" style={{ gap: 10 }} aria-busy="true">
              <span className="spinner" aria-hidden="true" />
              <span className="text-sm muted">Loading holiday calendar…</span>
            </section>
          ) : !university ? (
            <section className="acad-hero acad-hero--center">
              <div className="empty-icon" aria-hidden="true">
                <CalendarHeart size={26} />
              </div>
              <h2 style={{ fontSize: 18, marginBottom: 6 }}>Select your university first</h2>
              <p className="text-sm muted" style={{ maxWidth: 440, margin: "0 auto" }}>
                Holiday calendars are university-specific. Choose a university on the Academics page to see its holidays.
              </p>
            </section>
          ) : holidays.length === 0 ? (
            <HolidayEmptyState universityName={university.name} />
          ) : (
            <div className="stack">
              {next ? <NextHoliday holiday={next} /> : null}

              <section className="card card-pad stack" style={{ gap: 4 }} aria-label="Upcoming holidays">
                <div className="section-head" style={{ marginBottom: 6 }}>
                  <h2 style={{ fontSize: 16 }}>Upcoming holidays</h2>
                  <span className="tag tag-muted">{upcoming.length}</span>
                </div>
                {upcoming.length === 0 ? (
                  <p className="text-sm muted">No upcoming holidays on the verified calendar.</p>
                ) : (
                  <div className="holiday-list">
                    {upcoming.map((holiday) => (
                      <HolidayRow key={holiday.id} holiday={holiday} />
                    ))}
                  </div>
                )}
              </section>

              {past.length > 0 ? (
                <section className="card card-pad stack" style={{ gap: 4 }} aria-label="Past holidays">
                  <div className="section-head" style={{ marginBottom: 6 }}>
                    <h2 style={{ fontSize: 16 }}>Earlier this year</h2>
                    <span className="tag tag-muted">{past.length}</span>
                  </div>
                  <div className="holiday-list">
                    {past.map((holiday) => (
                      <HolidayRow key={holiday.id} holiday={holiday} muted />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </>
      )}
    </AcademicPage>
  );
}

function HolidayEmptyState({ universityName }: { universityName: string }) {
  return (
    <section className="acad-hero acad-hero--center" aria-label="Holidays not configured">
      <div className="empty-icon" aria-hidden="true">
        <CalendarHeart size={26} />
      </div>
      <h2 style={{ fontSize: 19, marginBottom: 6 }}>Holiday calendar not configured yet</h2>
      <p className="text-sm muted" style={{ maxWidth: 520, margin: "0 auto 18px" }}>
        {universityName}&apos;s verified holiday calendar has not been added. Once an official source is configured, the
        next holiday, a countdown and the full chronological list will appear here. We never guess holiday dates.
      </p>

      <div className="metric-grid" style={{ maxWidth: 640, margin: "0 auto", textAlign: "left" }}>
        <div className="metric">
          <span className="metric-label">Coming soon</span>
          <span className="metric-value" style={{ fontSize: 15, fontWeight: 700, marginTop: 8 }}>
            Next holiday &amp; countdown
          </span>
          <span className="metric-sub">Highlighted automatically when data is added</span>
        </div>
        <div className="metric">
          <span className="metric-label">Coming soon</span>
          <span className="metric-value" style={{ fontSize: 15, fontWeight: 700, marginTop: 8 }}>
            Chronological list
          </span>
          <span className="metric-sub">Every verified holiday for the year</span>
        </div>
      </div>
    </section>
  );
}

function NextHoliday({ holiday }: { holiday: UniversityHoliday }) {
  const countdown = countdownLabel(holiday.date);
  const date = new Date(`${holiday.date.slice(0, 10)}T00:00:00`);
  return (
    <section className="holiday-next" aria-label="Next holiday">
      <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span className="tag">
          <Sparkles size={13} aria-hidden="true" /> Next holiday
        </span>
        <span className="tag">{countdown.label}</span>
      </div>
      <h2 style={{ fontSize: 24, margin: "14px 0 4px", color: "#fff" }}>{holiday.name}</h2>
      <p style={{ margin: 0, opacity: 0.92, fontWeight: 600 }}>
        {date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        {" · "}
        {holiday.type}
      </p>
    </section>
  );
}

function HolidayRow({ holiday, muted }: { holiday: UniversityHoliday; muted?: boolean }) {
  const date = new Date(`${holiday.date.slice(0, 10)}T00:00:00`);
  const countdown = countdownLabel(holiday.date);
  return (
    <div className="holiday-row" style={{ opacity: muted ? 0.7 : 1 }}>
      <span className="event-date" aria-hidden="true" style={{ background: muted ? "var(--color-ink-100)" : undefined }}>
        <span className="d">{date.getDate()}</span>
        <span className="m">{date.toLocaleDateString(undefined, { month: "short" })}</span>
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ display: "block", fontSize: 15 }}>{holiday.name}</strong>
        <span className="text-sm muted" style={{ display: "block" }}>
          {date.toLocaleDateString(undefined, { weekday: "long" })} · {holiday.type}
        </span>
      </div>
      <span className={muted ? "tag tag-muted" : "tag tag-accent"}>
        <PartyPopper size={12} aria-hidden="true" /> {muted ? "Past" : countdown.label}
      </span>
    </div>
  );
}
