"use client";

import Link from "next/link";
import { GraduationCap, LayoutGrid, Loader2, Newspaper } from "lucide-react";
import { COLLEGE_COMMUNITIES, type CollegeCommunity } from "@/lib/colleges";
import type { UniversityId } from "@/lib/universities";

/** Builds a /posts link that keeps the active feed query (filters, search…). */
export function collegeHref(id: UniversityId | null, search: string): string {
  const base = id ? `/posts/college/${id}` : "/posts";
  return search ? `${base}?${search}` : base;
}

/**
 * Reddit-style college community switcher shown above the feed. The active
 * college is tinted with its own colour; pill links carry the current filter
 * query across communities.
 */
export function CollegeBar({ active, search }: { active: UniversityId | null; search: string }) {
  return (
    <nav className="college-bar" aria-label="College communities">
      <Link
        href={collegeHref(null, search)}
        className="college-pill"
        data-active={active === null}
        aria-current={active === null ? "page" : undefined}
      >
        <span className="college-emblem" aria-hidden="true">
          <LayoutGrid size={16} />
        </span>
        All Colleges
      </Link>
      {COLLEGE_COMMUNITIES.map((c) => (
        <Link
          key={c.id}
          href={collegeHref(c.id, search)}
          className="college-pill"
          data-active={active === c.id}
          aria-current={active === c.id ? "page" : undefined}
          style={
            {
              "--pc": c.color,
              "--pc-soft": c.soft,
              "--pc-border": c.border,
            } as React.CSSProperties
          }
        >
          <span className="college-emblem" aria-hidden="true">
            <GraduationCap size={16} />
          </span>
          {c.shortName}
        </Link>
      ))}
    </nav>
  );
}

/**
 * Community banner for the feed: college name, abbreviation, description and
 * live post count (hidden until the count request succeeds). `college = null`
 * renders the All Colleges variant.
 */
export function CollegeHeader({
  college,
  postCount,
  joined,
  joining,
  onToggleJoin,
  onLeaveConfirm,
}: {
  college: CollegeCommunity | null;
  postCount: number | null;
  joined?: boolean;
  joining?: boolean;
  onToggleJoin?: () => void;
  onLeaveConfirm?: () => boolean;
}) {
  const background = college
    ? college.gradient
    : "linear-gradient(135deg, var(--color-brand-700, #1d4ed8), var(--color-brand-500, #3b82f6))";

  const isCollege = !!college;

  return (
    <header
      className="college-header"
      style={
        {
          background,
          "--pc": college?.color ?? "var(--color-brand-700)",
          "--pc-soft": college?.soft ?? "var(--color-brand-50)",
          "--pc-border": college?.border ?? "var(--color-brand-200)",
        } as React.CSSProperties
      }
    >
      <span className="college-header-emblem" aria-hidden="true">
        {college ? <GraduationCap size={26} /> : <Newspaper size={26} />}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="row" style={{ gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
          <h1 className="college-header-title">
            {college ? college.name : "All Colleges"}
          </h1>
          <span className="college-chip">{college ? college.shortName : "Every community"}</span>
        </div>
        <p className="college-header-desc">
          {college
            ? college.description
            : "Posts from the DTU, IGDTUW, NSUT and IIIT-Delhi communities in one place, plus general campus posts that aren't filed to a college."}
        </p>
        <div className="college-header-meta">
          {postCount != null ? (
            <span className="college-chip">
              {postCount.toLocaleString()} {postCount === 1 ? "post" : "posts"}
            </span>
          ) : null}
          {college ? (
            <span className="college-chip">College community</span>
          ) : (
            <span className="college-chip">4 colleges</span>
          )}
        </div>
        {college ? (
          <p
            className="college-header-desc"
            style={{ margin: "8px 0 0", fontSize: 12, color: "rgba(255,255,255,0.78)" }}
          >
            Membership is saved to your account — joining is not proof of enrolment.
          </p>
        ) : null}
      </div>
      {isCollege && onToggleJoin ? (
        <div className="college-join-slot">
          <button
            className={`college-join-btn ${joined ? "is-joined" : ""}`}
            style={
              {
                "--pc": college.color,
              } as React.CSSProperties
            }
            onClick={() => {
              if (joined) {
                if (onLeaveConfirm ? !onLeaveConfirm() : !window.confirm(`Leave the ${college.shortName} community? Your posts, comments, votes and other content remain.`)) {
                  return;
                }
              }
              onToggleJoin();
            }}
            disabled={joining}
            aria-label={joined ? `Leave ${college.shortName}` : `Join ${college.shortName}`}
            aria-pressed={joined}
          >
            {joining ? <Loader2 size={14} className="animate-spin" /> : joined ? "Joined ✓" : "Join"}
          </button>
          <span className="college-join-hint">
            {joined ? "Membership saved" : "Join the community"}
          </span>
        </div>
      ) : null}
    </header>
  );
}
