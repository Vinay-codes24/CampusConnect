"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Flag, Trash2, XCircle } from "lucide-react";
import { api, formatDate, timeAgo } from "@/lib/client";
import { useApp } from "@/components/providers";
import type { Report } from "@/lib/types";
import type { LiteUser } from "@/lib/serialize";
import { Avatar, EmptyState, ErrorState, SkeletonCard } from "@/components/ui";

type AdminReport = Report & {
  excerpt: string;
  contentAuthor: LiteUser | null;
  reporter: LiteUser;
  contentRemoved: boolean;
};

type StatusFilter = "open" | "resolved" | "dismissed" | "all";

const FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: "open", label: "Open" },
  { key: "resolved", label: "Resolved" },
  { key: "dismissed", label: "Dismissed" },
  { key: "all", label: "All" },
];

const STATUS_TAG: Record<Report["status"], { label: string; className: string }> = {
  open: { label: "Open", className: "tag tag-warn" },
  resolved: { label: "Resolved", className: "tag tag-accent" },
  dismissed: { label: "Dismissed", className: "tag tag-muted" },
};

const REASON_CLASS: Record<string, string> = {
  Spam: "tag tag-muted",
  "Harassment or bullying": "tag tag-danger",
  "Inappropriate content": "tag tag-danger",
  "Fake information": "tag tag-warn",
  Other: "tag",
};

export function ReportsTab() {
  const { toast } = useApp();
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setStatusFilter] = useState<StatusFilter>("open");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api<{ reports: AdminReport[]; open: number }>("/api/admin/reports?status=all");
      setReports(res.reports);
      setOpenCount(res.open);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(report: AdminReport, action: "resolve" | "dismiss" | "remove") {
    if (busyId) return;
    setBusyId(report.id);
    try {
      await api("/api/admin/reports", {
        method: "POST",
        json: { reportId: report.id, action, note: (notes[report.id] ?? "").trim() },
      });
      setNotes((n) => {
        const copy = { ...n };
        delete copy[report.id];
        return copy;
      });
      toast(
        action === "remove"
          ? "Content removed and the report resolved"
          : action === "dismiss"
            ? "Report dismissed"
            : "Report marked as resolved",
        "success",
      );
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusyId(null);
    }
  }

  const visible = reports.filter((r) => filter === "all" || r.status === filter);

  if (loading && reports.length === 0) {
    return (
      <div className="stack">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error && reports.length === 0) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  return (
    <section className="stack" aria-label="Reports and moderation">
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 19 }}>Reports &amp; moderation</h2>
          <p className="text-sm muted" style={{ marginTop: 4 }}>
            {openCount > 0 ? `${openCount} open report${openCount === 1 ? "" : "s"} waiting for a decision.` : "No open reports — nice work."}
          </p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void load()}>
          Refresh queue
        </button>
      </div>

      <div className="chip-row" role="group" aria-label="Filter reports by status">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" className="chip" aria-pressed={filter === f.key} onClick={() => setStatusFilter(f.key)}>
            {f.label}
            <span style={{ opacity: 0.75 }}>
              ({f.key === "all" ? reports.length : reports.filter((r) => r.status === f.key).length})
            </span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="card card-pad">
          <EmptyState
            icon={<Flag size={26} />}
            title={`No ${filter === "all" ? "" : filter} reports`}
            body="Reports filed by students on posts and comments will appear here for review."
            action={
              <Link className="btn btn-ghost" href="/posts">
                Back to the feed
              </Link>
            }
          />
        </div>
      ) : (
        visible.map((report) => {
          const busy = busyId === report.id;
          const statusTag = STATUS_TAG[report.status];
          return (
            <article key={report.id} className="card card-pad stack" style={{ gap: 12 }}>
              <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <span className={REASON_CLASS[report.reason] ?? "tag"}>{report.reason}</span>
                  <span className={statusTag.className}>{statusTag.label}</span>
                  <span className="tag tag-muted">{report.target === "post" ? "Post" : "Comment"}</span>
                  {report.contentRemoved ? <span className="tag tag-danger">Content removed</span> : null}
                </div>
                <span className="text-sm muted" title={formatDate(report.createdAt)}>
                  Reported {timeAgo(report.createdAt)}
                </span>
              </div>

              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: "var(--color-ink-100)",
                  border: "1px solid var(--color-ink-200)",
                }}
              >
                <p style={{ fontSize: 14, color: "var(--color-ink-700)", margin: 0 }}>
                  <strong>Excerpt: </strong>
                  {report.excerpt}
                </p>
              </div>

              <div className="row" style={{ gap: 16, flexWrap: "wrap" }}>
                <span className="row" style={{ gap: 8 }}>
                  <Avatar name={report.reporter.name} src={report.reporter.avatar} size={26} />
                  <span className="text-sm muted">
                    Reported by <strong style={{ color: "var(--color-ink-900)" }}>{report.reporter.name}</strong> (@{report.reporter.username})
                  </span>
                </span>
                <span className="text-sm muted">
                  Content by{" "}
                  {report.contentAuthor ? (
                    <Link className="link" href={`/profile/${report.contentAuthor.id}`}>
                      {report.contentAuthor.name} (@{report.contentAuthor.username})
                    </Link>
                  ) : (
                    "a deleted account"
                  )}
                </span>
              </div>

              {report.details ? <p className="text-sm muted">Reporter note: “{report.details}”</p> : null}

              {report.status === "open" ? (
                <>
                  <div className="field">
                    <label className="label" htmlFor={`note-${report.id}`}>
                      Moderation note (optional)
                    </label>
                    <textarea
                      id={`note-${report.id}`}
                      className="textarea"
                      rows={2}
                      maxLength={300}
                      value={notes[report.id] ?? ""}
                      disabled={busy}
                      placeholder="Explain the decision — the author sees this if their content is removed."
                      onChange={(e) => setNotes((n) => ({ ...n, [report.id]: e.target.value }))}
                    />
                  </div>

                  <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                    <button type="button" className="btn btn-accent btn-sm" onClick={() => void act(report, "resolve")} disabled={busy} aria-busy={busy}>
                      {busy ? <span className="spinner" aria-hidden="true" /> : <CheckCircle2 size={14} />} Resolve
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => void act(report, "dismiss")} disabled={busy}>
                      <XCircle size={14} /> Dismiss
                    </button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => void act(report, "remove")} disabled={busy}>
                      <Trash2 size={14} /> Remove content
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm muted" style={{ margin: 0 }}>
                  <strong>Resolution: </strong>
                  {report.resolution ?? "No note recorded."}
                </p>
              )}
            </article>
          );
        })
      )}
    </section>
  );
}
