"use client";

import type { ReactNode } from "react";
import { CircleCheck, Gauge, Lock, TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { IMSConnectionPanel } from "@/components/attendance/ims-connection";
import type { AttendanceRecord } from "@/lib/types";
import {
  AcademicPage,
  DemoBadge,
  LoadingCards,
  STATUS_COLOUR,
  STATUS_TAG,
  aggregateAttendance,
  attendancePct,
  attendanceStatus,
  classesToRecover,
  initials,
  timeAgo,
  useAcademics,
  useSelectedUniversity,
  type AcademicsPayload,
  type AttendanceStatus,
} from "@/components/academics/core";

export default function AttendancePage() {
  const { state, retry } = useAcademics();
  const { ready, university } = useSelectedUniversity();
  const hasIntegration = university?.attendanceIntegration === "nsut-ims";

  return (
    <AcademicPage
      icon={<Gauge size={22} />}
      title="Attendance"
      subtitle="Subject-wise attendance against the 75% requirement, with a heads-up on anything at risk."
      state={state}
      retry={retry}
      loadingLabel="Loading attendance records…"
    >
      {(data) => (
        <>
          {!ready ? (
            <section className="card card-pad row" style={{ gap: 10 }} aria-busy="true">
              <span className="spinner" aria-hidden="true" />
              <span className="text-sm muted">Preparing attendance tools…</span>
            </section>
          ) : hasIntegration ? (
            <IMSConnectionPanel />
          ) : (
            <section className="acad-hero acad-hero--center" aria-label="Attendance integration unavailable">
              <div className="empty-icon" aria-hidden="true">
                <Gauge size={26} />
              </div>
              <h2 style={{ fontSize: 18, marginBottom: 6 }}>
                Attendance sync is not configured for {university?.shortName ?? "this university"} yet
              </h2>
              <p className="text-sm muted" style={{ maxWidth: 500, margin: "0 auto" }}>
                Automated IMS attendance sync has only been implemented and verified for NSUT. Faculty-published records
                still appear below whenever your department uploads them.
              </p>
            </section>
          )}
          <AttendanceView data={data} />
        </>
      )}
    </AcademicPage>
  );
}

function AttendanceView({ data }: { data: AcademicsPayload }) {
  const rows = data.attendance;

  if (rows.length === 0) {
    return (
      <div className="stack">
        <RecordSourceNote />
        <section className="acad-hero acad-hero--center">
          <EmptyState
            icon={<Gauge size={26} />}
            title="No attendance records yet"
            body="Your class mentor has not published attendance for this semester. Records appear here as soon as the department uploads them — nothing is fabricated."
          />
        </section>
      </div>
    );
  }

  const agg = aggregateAttendance(rows);
  const aggStatus = attendanceStatusOf(agg.pct);
  const lastSynced = rows.map((r) => r.updatedAt).sort().at(-1) ?? rows[0].updatedAt;
  const attention = rows.filter((r) => attendanceStatus(r) !== "Safe");

  return (
    <div className="stack">
      <RecordSourceNote />

      <section className="acad-hero" aria-label="Aggregate attendance">
        <div className="row" style={{ gap: 26, flexWrap: "wrap", alignItems: "center" }}>
          <AttendanceRing pct={agg.pct} status={aggStatus} />
          <div style={{ flex: 1, minWidth: 240 }}>
            <span className="metric-label">Overall attendance this semester</span>
            <h2 style={{ fontSize: 21, margin: "6px 0 4px" }}>
              {aggStatus === "Safe"
                ? "You are above the minimum requirement"
                : aggStatus === "At risk"
                  ? "You are close to the minimum requirement"
                  : "You are below the minimum requirement"}
            </h2>
            <p className="text-sm muted" style={{ maxWidth: 460 }}>
              {agg.attended} of {agg.conducted} classes attended · {agg.missed} missed. Minimum required is 75% overall
              and per subject to sit the end semester examination.
            </p>
          </div>
        </div>

        <div className="metric-grid" style={{ marginTop: 20 }}>
          <Metric label="Classes attended" value={agg.attended} sub={`of ${agg.conducted} conducted`} />
          <Metric label="Classes missed" value={agg.missed} sub="Keep this low" />
          <Metric label="Subjects tracked" value={rows.length} sub={`${agg.safe} above minimum`} />
          <Metric
            label="Below minimum"
            value={agg.atRisk + agg.shortage}
            sub={`${agg.shortage} in shortage`}
          />
        </div>

        <p className="hint" style={{ marginTop: 14 }}>
          Last synced {timeAgo(lastSynced)} · records are published by the department and are read-only for students.
        </p>
      </section>

      {attention.length > 0 ? (
        <section
          className="card card-pad"
          style={{ borderColor: "#fde68a", background: "#fffbeb" }}
          aria-label="Subjects needing attention"
        >
          <div className="row" style={{ gap: 8, marginBottom: 10 }}>
            <TriangleAlert size={18} aria-hidden="true" style={{ color: "#92400e", flex: "none" }} />
            <strong style={{ fontSize: 15 }}>
              {attention.length} {attention.length === 1 ? "subject needs" : "subjects need"} attention
            </strong>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            {attention.map((row) => (
              <span key={row.id} className={STATUS_TAG[attendanceStatus(row)]}>
                {row.subject} · {attendancePct(row)}%
              </span>
            ))}
          </div>
        </section>
      ) : (
        <section className="card card-pad row" style={{ gap: 10, alignItems: "flex-start" }} aria-label="All clear">
          <CircleCheck size={20} aria-hidden="true" style={{ color: "var(--color-accent-600)", flex: "none", marginTop: 1 }} />
          <p className="text-sm">
            Every subject is above the minimum requirement. Keep the streak going — misses add up fast towards the end of
            the semester.
          </p>
        </section>
      )}

      <section className="stack" aria-label="Attendance by subject">
        <div className="section-head">
          <h2>Subject-wise attendance</h2>
          <span className="tag tag-muted">
            {agg.safe} safe · {agg.atRisk} at risk · {agg.shortage} shortage
          </span>
        </div>
        <div className="subject-grid">
          {rows.map((row) => (
            <SubjectAttendanceCard key={row.id} row={row} />
          ))}
        </div>
      </section>
    </div>
  );
}

function AttendanceRing({ pct, status }: { pct: number; status: AttendanceStatus }) {
  const size = 132;
  const stroke = 11;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = circumference * (1 - clamped / 100);
  const colour = STATUS_COLOUR[status];

  return (
    <div className="ring-wrap" role="img" aria-label={`Overall attendance ${pct} percent`}>
      <svg width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-ink-100)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colour}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="ring-center">
        <div>
          <span className="pct" style={{ color: colour }}>
            {pct}%
          </span>
          <span className="cap">Attendance</span>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="metric">
      <span className="metric-label">{label}</span>
      <span className="metric-value">{value}</span>
      {sub ? <span className="metric-sub">{sub}</span> : null}
    </div>
  );
}

function SubjectAttendanceCard({ row }: { row: AttendanceRecord }) {
  const pct = attendancePct(row);
  const status = attendanceStatus(row);
  const missed = row.conducted - row.attended;
  const recover = classesToRecover(row);

  return (
    <article className="subject-card">
      <div className="subject-card-top">
        <div className="row" style={{ gap: 10, minWidth: 0 }}>
          <span className="subject-avatar" aria-hidden="true">
            {initials(row.subject)}
          </span>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: 15.5, lineHeight: 1.3 }}>{row.subject}</h3>
            <p className="text-sm muted" style={{ marginTop: 2 }}>
              {row.code}
            </p>
          </div>
        </div>
        <span className={STATUS_TAG[status]}>{status}</span>
      </div>

      <div>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
          <span className="text-sm muted">
            {row.attended} of {row.conducted} classes
          </span>
          <strong style={{ fontSize: 14.5, color: STATUS_COLOUR[status] }}>{pct}%</strong>
        </div>
        <div className="progress" role="img" aria-label={`${row.subject} attendance ${pct} percent`}>
          <span style={{ width: `${Math.min(100, pct)}%`, background: STATUS_COLOUR[status] }} />
        </div>
      </div>

      <div className="subject-meta">
        <span className="tag tag-muted">Min {row.minRequired}%</span>
        <span className="tag tag-muted">{missed} missed</span>
      </div>

      <p className="text-sm" style={{ color: status === "Safe" ? "var(--color-ink-500)" : "var(--color-ink-700)" }}>
        {status === "Safe"
          ? `On track — stay above ${row.minRequired}%.`
          : recover
            ? `Attend the next ${recover} ${recover === 1 ? "class" : "classes"} to clear ${row.minRequired}%.`
            : `Attending alone cannot reach ${row.minRequired}% — speak to your class mentor about re-registration.`}
      </p>
    </article>
  );
}

function RecordSourceNote() {
  return (
    <section
      className="card card-pad row"
      style={{ gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}
      aria-label="Record source"
    >
      <Lock size={18} aria-hidden="true" style={{ color: "var(--color-ink-500)", marginTop: 2, flex: "none" }} />
      <div style={{ flex: 1, minWidth: 220 }}>
        <strong style={{ fontSize: 14.5 }}>View-only record</strong>
        <p className="text-sm muted" style={{ marginTop: 2 }}>
          Attendance is recorded by faculty and published by the department. Students cannot edit these numbers — if
          something looks wrong, raise it with your class mentor.
        </p>
      </div>
      <DemoBadge />
    </section>
  );
}

/** Colour/status for a plain aggregate percentage (independent of any subject row). */
function attendanceStatusOf(pct: number): AttendanceStatus {
  if (pct >= 75) return "Safe";
  if (pct >= 70) return "At risk";
  return "Shortage";
}
