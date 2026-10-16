"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { api, timeAgo } from "@/lib/client";

/* ------------------------------------------------------------------ types -- */

type SyncState =
  | "idle"
  | "starting"
  | "waiting_for_login"
  | "extracting"
  | "importing"
  | "success"
  | "error";

type SyncResultSubject = {
  code: string;
  subject: string;
  conducted: number | null;
  attended: number | null;
  percentage: number | null;
};

type SyncResult = {
  saved: boolean;
  count: number;
  subjects: SyncResultSubject[];
  updatedAt: string;
};

/* --------------------------------------------------------- main panel ----- */
export function IMSConnectionPanel() {
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [depStatus, setDepStatus] = useState<{ python: boolean; selenium: boolean } | null>(null);

  /* Check dependencies on mount. */
  useEffect(() => {
    api<{ python: { ok: boolean }; selenium: { ok: boolean } }>("/api/attendance/sync")
      .then((d) => setDepStatus({ python: d.python.ok, selenium: d.selenium.ok }))
      .catch(() => setDepStatus({ python: false, selenium: false }));
  }, []);

  function mapProgressStep(step: string): SyncState {
    if (step === "starting") return "starting";
    if (step === "waiting_for_login") return "waiting_for_login";
    if (step === "fetching_attendance") return "extracting";
    if (step === "importing_attendance") return "importing";
    if (step === "success") return "success";
    return "waiting_for_login";
  }

  async function handleSync() {
    setSyncState("waiting_for_login");
    setError(null);
    setResult(null);

    let pollHandle: number | null = null;
    try {
      pollHandle = window.setInterval(async () => {
        try {
          const status = await api<{ step?: string }>("/api/attendance/sync?status=1");
          if (status?.step) setSyncState(mapProgressStep(status.step));
        } catch {
          // Polling failures are non-fatal; the main request still determines the result.
        }
      }, 1000);

      const res = await api<SyncResult>("/api/attendance/sync", {
        method: "POST",
        ...(typeof AbortSignal !== "undefined" ? { signal: AbortSignal.timeout(300000) } : {}),
      });
      setResult(res);
      setSyncState("success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sync failed. Please try again.";
      setError(msg);
      setSyncState("error");
    } finally {
      if (pollHandle !== null) window.clearInterval(pollHandle);
    }
  }

  function handleReset() {
    setSyncState("idle");
    setError(null);
    setResult(null);
  }

  /* ---------------------------------------------------------------- render --- */

  return (
    <section className="panel card-pad stack" aria-label="Connect NSUT IMS attendance" style={{ gap: 20 }}>
      {/* header */}
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div className="row" style={{ gap: 12 }}>
          <div
            aria-hidden="true"
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              display: "grid",
              placeItems: "center",
              color: "#fff",
              background: "linear-gradient(135deg, var(--color-brand-600), var(--color-accent-600))",
              boxShadow: "0 6px 16px -6px var(--color-brand-600)",
              flex: "none",
            }}
          >
            <KeyRound size={20} />
          </div>
          <div>
            <strong style={{ fontSize: 15.5 }}>Connect NSUT IMS</strong>
            <p className="text-sm muted" style={{ marginTop: 2 }}>
              Sync attendance automatically — no passwords or session details stored.
            </p>
          </div>
        </div>
        <span className="tag tag-accent">
          <ShieldCheck size={12} aria-hidden="true" /> Privacy-first
        </span>
      </div>

      {/* dependency check */}
      {depStatus && !depStatus.python && (
        <div className="row" style={{ gap: 10, alignItems: "flex-start", padding: "12px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12 }}>
          <AlertCircle size={18} aria-hidden="true" style={{ color: "#b91c1c", flex: "none", marginTop: 2 }} />
          <div>
            <strong style={{ fontSize: 14, color: "#b91c1c" }}>Python not found</strong>
            <p className="text-sm" style={{ marginTop: 4, color: "#7f1d1d", lineHeight: 1.5 }}>
              Install Python 3.8+ from{" "}
              <a href="https://www.python.org/downloads/" target="_blank" rel="noopener noreferrer" className="link">
                python.org
              </a>
              {" "}and ensure it is on your PATH.
            </p>
          </div>
        </div>
      )}

      {depStatus && depStatus.python && !depStatus.selenium && (
        <div className="row" style={{ gap: 10, alignItems: "flex-start", padding: "12px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12 }}>
          <AlertCircle size={18} aria-hidden="true" style={{ color: "#92400e", flex: "none", marginTop: 2 }} />
          <div>
            <strong style={{ fontSize: 14, color: "#92400e" }}>Selenium not installed</strong>
            <p className="text-sm" style={{ marginTop: 4, color: "#92400e", lineHeight: 1.5 }}>
              Run in your terminal:{" "}
              <code style={{ background: "#fef9c3", padding: "1px 6px", borderRadius: 4, fontSize: 12.5 }}>pip install selenium</code>
            </p>
          </div>
        </div>
      )}

      {/* idle / starting state */}
      {syncState === "idle" || syncState === "error" ? (
        <div className="stack" style={{ gap: 12 }}>
          {error ? (
            <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
              <AlertCircle size={18} aria-hidden="true" style={{ color: "#b91c1c", flex: "none", marginTop: 2 }} />
              <p className="text-sm" style={{ color: "#b91c1c", lineHeight: 1.5 }}>{error}</p>
            </div>
          ) : null}

          <p className="text-sm muted" style={{ lineHeight: 1.6 }}>
            Click the button below to open the official NSUT IMS portal in your browser. You will log in manually,
            enter your password, and solve the CAPTCHA. CampusConnect never stores your credentials or session cookies.
          </p>

          <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
            <button
              className="btn btn-primary"
              onClick={handleSync}
              disabled={!!depStatus && (!depStatus.python || !depStatus.selenium)}
            >
              <ExternalLink size={16} aria-hidden="true" />
              Connect NSUT IMS
            </button>
          </div>
        </div>
      ) : null}

      {/* starting state */}
      {syncState === "starting" ? (
        <div className="stack" style={{ gap: 12 }}>
          <div className="row" style={{ gap: 10, alignItems: "center" }}>
            <Loader2 size={20} className="animate-spin" aria-hidden="true" style={{ color: "var(--color-brand-600)" }} />
            <span className="text-sm">Opening IMS login page in Chrome…</span>
          </div>
          <p className="text-sm muted" style={{ lineHeight: 1.6 }}>
            A Chrome browser window will open. Enter your NSUT IMS username and password, then solve the CAPTCHA.
            Do not close the Chrome window until the sync completes.
          </p>
        </div>
      ) : null}

      {/* waiting for login — server is polling */}
      {syncState === "waiting_for_login" ? (
        <div className="row" style={{ gap: 10, alignItems: "center" }}>
          <Loader2 size={20} className="animate-spin" aria-hidden="true" style={{ color: "var(--color-brand-600)" }} />
          <span className="text-sm">Waiting for you to complete login…</span>
        </div>
      ) : null}

      {/* extracting */}
      {syncState === "extracting" ? (
        <div className="row" style={{ gap: 10, alignItems: "center" }}>
          <Loader2 size={20} className="animate-spin" aria-hidden="true" style={{ color: "var(--color-brand-600)" }} />
          <span className="text-sm">Extracting attendance from IMS…</span>
        </div>
      ) : null}

      {/* importing */}
      {syncState === "importing" ? (
        <div className="row" style={{ gap: 10, alignItems: "center" }}>
          <Loader2 size={20} className="animate-spin" aria-hidden="true" style={{ color: "var(--color-brand-600)" }} />
          <span className="text-sm">Importing attendance into CampusConnect…</span>
        </div>
      ) : null}

      {/* success */}
      {syncState === "success" && result ? (
        <div className="stack" style={{ gap: 12 }}>
          <div className="row" style={{ gap: 10, alignItems: "center" }}>
            <CheckCircle2 size={22} aria-hidden="true" style={{ color: "var(--color-accent-600)" }} />
            <strong style={{ fontSize: 15 }}>Sync complete</strong>
          </div>
          <p className="text-sm muted">
            Imported {result.count} subjects. Your attendance dashboard has been updated.
          </p>

          <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid var(--color-ink-200)", borderRadius: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--color-ink-100)" }}>
                  {["Subject", "Code", "Conducted", "Attended", "%"].map((h) => (
                    <th key={h} style={{ textAlign: h === "Subject" ? "left" : "right", padding: "8px 10px", color: "var(--color-ink-700)", fontSize: 12 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.subjects.map((s, i) => {
                  const p = (s.conducted ?? 0) > 0 ? Math.round(((s.attended ?? 0) / (s.conducted ?? 1)) * 1000) / 10 : 0;
                  return (
                    <tr key={i} style={{ borderTop: i === 0 ? "none" : "1px solid var(--color-ink-200)" }}>
                      <td style={{ padding: "7px 10px", textAlign: "left" }}>{s.subject}</td>
                      <td style={{ padding: "7px 10px", textAlign: "right", color: "var(--color-ink-500)" }}>{s.code || "—"}</td>
                      <td style={{ padding: "7px 10px", textAlign: "right" }}>{s.conducted ?? "—"}</td>
                      <td style={{ padding: "7px 10px", textAlign: "right" }}>{s.attended ?? "—"}</td>
                      <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 600 }}>{p}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={handleReset}>
              <RefreshCw size={14} aria-hidden="true" /> Sync again
            </button>
          </div>
        </div>
      ) : null}

      {/* security note */}
      <div className="row" style={{ gap: 10, alignItems: "flex-start", paddingTop: 4 }}>
        <Lock size={16} aria-hidden="true" style={{ color: "var(--color-ink-500)", marginTop: 2, flex: "none" }} />
        <p className="text-sm muted" style={{ lineHeight: 1.6 }}>
          CampusConnect runs on your computer and launches a local script. The script opens the official NSUT IMS portal
          in your browser so you enter credentials directly. CampusConnect never stores your password, CAPTCHA answer,
          cookies, or session tokens.
        </p>
      </div>
    </section>
  );
}