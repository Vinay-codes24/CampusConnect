"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
  KeyRound,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/client";

/* ------------------------------------------------------------------ types -- */

type SyncState =
  | "idle"
  | "opening"
  | "form"
  | "verifying"
  | "syncing"
  | "success"
  | "error";

type SyncStep =
  | "starting"
  | "waiting_for_login"
  | "fetching_attendance"
  | "importing_attendance";

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

type IMSLoginResponse =
  | { ok: true }
  | { ok: false; error: string; captchaImage?: string };

const STEP_LABELS: Record<SyncStep, string> = {
  starting: "Launching the attendance extractor…",
  waiting_for_login: "Waiting for IMS sign-in…",
  fetching_attendance: "Extracting attendance from IMS…",
  importing_attendance: "Importing attendance into CampusConnect…",
};

function mapStep(step: string): SyncStep | null {
  if (step === "starting") return "starting";
  if (step === "waiting_for_login") return "waiting_for_login";
  if (step === "fetching_attendance") return "fetching_attendance";
  if (step === "importing_attendance") return "importing_attendance";
  return null;
}

/* --------------------------------------------------------- main panel ----- */
export function IMSConnectionPanel() {
  const [state, setState] = useState<SyncState>("idle");
  const [step, setStep] = useState<SyncStep>("starting");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [depStatus, setDepStatus] = useState<{ python: boolean; selenium: boolean } | null>(null);

  /* Native login form state — held in memory only, never persisted. */
  const [imsToken, setImsToken] = useState<string | null>(null);
  const [captchaImage, setCaptchaImage] = useState<string | null>(null);
  const [uid, setUid] = useState("");
  const [pwd, setPwd] = useState("");
  const [cap, setCap] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [captchaBusy, setCaptchaBusy] = useState(false);

  /* Check dependencies on mount. */
  useEffect(() => {
    api<{ python: { ok: boolean }; selenium: { ok: boolean } }>("/api/attendance/sync")
      .then((d) => setDepStatus({ python: d.python.ok, selenium: d.selenium.ok }))
      .catch(() => setDepStatus({ python: false, selenium: false }));
  }, []);

  function resetForm() {
    setImsToken(null);
    setCaptchaImage(null);
    setUid("");
    setPwd("");
    setCap("");
    setShowPwd(false);
  }

  /* Step 1: open an IMS session and load the genuine CAPTCHA. */
  async function handleOpen() {
    setError(null);
    setState("opening");
    try {
      const res = await api<{ token: string; captchaImage: string }>("/api/attendance/ims");
      setImsToken(res.token);
      setCaptchaImage(res.captchaImage);
      setState("form");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the IMS login service.");
      setState("idle");
    }
  }

  /* Refresh CAPTCHA through the official portal endpoint (same session). */
  async function handleRefreshCaptcha() {
    if (!imsToken) return;
    setCaptchaBusy(true);
    try {
      const res = await api<{ captchaImage: string }>("/api/attendance/ims", {
        method: "POST",
        json: { action: "refresh", token: imsToken },
      });
      setCaptchaImage(res.captchaImage);
      setCap("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh the CAPTCHA.");
    } finally {
      setCaptchaBusy(false);
    }
  }

  /* Cancel: drop the in-memory session and clear every credential field. */
  function handleCancel() {
    if (imsToken) {
      api("/api/attendance/ims", { method: "POST", json: { action: "cancel", token: imsToken } }).catch(
        () => undefined,
      );
    }
    resetForm();
    setError(null);
    setState("idle");
  }

  /* Fallback: run the existing controlled-browser flow — the student signs in
   * on the official IMS page inside the Chrome window that nsut.py opens, and
   * extraction continues automatically. No IMS token is sent, so the server
   * spawns the script without a session cookie (manual login path). */
  function handleBrowserLogin() {
    if (imsToken) {
      api("/api/attendance/ims", { method: "POST", json: { action: "cancel", token: imsToken } }).catch(
        () => undefined,
      );
    }
    resetForm();
    setError(null);
    void runSync();
  }

  /* Step 2: verify credentials against the official IMS login endpoint. */
  async function handleConnect(event: FormEvent) {
    event.preventDefault();
    if (!imsToken) return;

    setError(null);
    setState("verifying");

    let verified = false;
    try {
      const res = await api<IMSLoginResponse>("/api/attendance/ims", {
        method: "POST",
        json: { action: "login", token: imsToken, uid, pwd, cap },
      });

      if (res.ok) {
        verified = true;
      } else {
        setError(res.error);
        if (res.captchaImage) setCaptchaImage(res.captchaImage);
        setCap("");
        setState("form");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify your IMS login.");
      setState("form");
    } finally {
      /* Credentials leave component memory as soon as the request settles. */
      setPwd("");
      setCap("");
    }

    if (verified) await runSync();
  }

  /* Step 3: reuse the existing Selenium extraction with the IMS session. */
  async function runSync() {
    setState("syncing");
    setStep("starting");
    setResult(null);

    let pollHandle: number | null = null;
    try {
      pollHandle = window.setInterval(async () => {
        try {
          const status = await api<{ step?: string }>("/api/attendance/sync?status=1");
          const mapped = status?.step ? mapStep(status.step) : null;
          if (mapped) setStep(mapped);
        } catch {
          // Polling failures are non-fatal; the main request still determines the result.
        }
      }, 1000);

      const res = await api<SyncResult>("/api/attendance/sync", {
        method: "POST",
        ...(imsToken ? { json: { imsToken } } : {}),
        ...(typeof AbortSignal !== "undefined" ? { signal: AbortSignal.timeout(300000) } : {}),
      });
      setResult(res);
      setState("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed. Please try again.");
      setState("error");
    } finally {
      if (pollHandle !== null) window.clearInterval(pollHandle);
      /* The IMS session token is single-use — always drop it after a sync. */
      resetForm();
    }
  }

  function handleSyncAgain() {
    resetForm();
    setError(null);
    setResult(null);
    setState("idle");
  }

  /* ------------------------------------------------- dependency warnings -- */
  const dependencyWarning =
    depStatus && !depStatus.python ? (
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
    ) : depStatus && depStatus.python && !depStatus.selenium ? (
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
    ) : null;

  const depsMissing = !!depStatus && (!depStatus.python || !depStatus.selenium);

  /* ---------------------------------------------------------------- render -- */

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
              Sign in once inside CampusConnect — no passwords or session details stored.
            </p>
          </div>
        </div>
        <span className="tag tag-accent">
          <ShieldCheck size={12} aria-hidden="true" /> Privacy-first
        </span>
      </div>

      {dependencyWarning}

      {/* error banner (shown in every state) */}
      {error ? (
        <div className="row" style={{ gap: 10, alignItems: "flex-start" }} role="alert">
          <AlertCircle size={18} aria-hidden="true" style={{ color: "#b91c1c", flex: "none", marginTop: 2 }} />
          <p className="text-sm" style={{ color: "#b91c1c", lineHeight: 1.5 }}>{error}</p>
        </div>
      ) : null}

      {/* idle — intro and entry point */}
      {state === "idle" || state === "error" ? (
        <div className="stack" style={{ gap: 12 }}>
          <p className="text-sm muted" style={{ lineHeight: 1.6 }}>
            Enter your NSUT IMS username, password and CAPTCHA right here in CampusConnect.
            Credentials are sent only to the official IMS portal over HTTPS and are never stored.
            After verification, your attendance is extracted automatically.
          </p>
          <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
            <button className="btn btn-primary" onClick={handleOpen} disabled={depsMissing}>
              <KeyRound size={16} aria-hidden="true" />
              Connect NSUT IMS
            </button>
          </div>

          {/* Fallback: when the in-app IMS panel cannot open (e.g. the portal
              is rate-limiting this network), sign in on the official page in
              the controlled Chrome window; extraction continues automatically. */}
          {error && !depsMissing ? (
            <div
              className="stack"
              style={{
                gap: 10,
                padding: "12px 14px",
                background: "var(--color-ink-100)",
                borderRadius: 12,
              }}
            >
              <p className="text-sm" style={{ lineHeight: 1.6 }}>
                <strong>Having trouble with the in-app panel?</strong> You can sign in on the
                official IMS page inside a Chrome window that CampusConnect opens and controls.
                Enter your credentials and solve the CAPTCHA there — attendance extraction
                continues automatically right after you are signed in.
              </p>
              <div>
                <button className="btn btn-ghost" onClick={handleBrowserLogin}>
                  <ExternalLink size={16} aria-hidden="true" />
                  Open IMS login in browser
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* opening — fetching the genuine CAPTCHA */}
      {state === "opening" ? (
        <div className="row" style={{ gap: 10, alignItems: "center" }}>
          <Loader2 size={20} className="animate-spin" aria-hidden="true" style={{ color: "var(--color-brand-600)" }} />
          <span className="text-sm">Preparing the secure IMS login…</span>
        </div>
      ) : null}

      {/* form — native IMS login panel */}
      {state === "form" || state === "verifying" ? (
        <form className="stack" style={{ gap: 16 }} onSubmit={handleConnect} noValidate>
          <div className="field">
            <label className="label" htmlFor="ims-uid">IMS username</label>
            <input
              id="ims-uid"
              className="input"
              autoComplete="username"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={50}
              placeholder="Your NSUT IMS user ID"
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              required
              disabled={state === "verifying"}
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="ims-pwd">Password</label>
            <div className="ims-password">
              <input
                id="ims-pwd"
                className="input"
                type={showPwd ? "text" : "password"}
                autoComplete="current-password"
                maxLength={100}
                placeholder="Your IMS password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                required
                disabled={state === "verifying"}
              />
              <button
                type="button"
                className="ims-password-toggle"
                onClick={() => setShowPwd((v) => !v)}
                aria-label={showPwd ? "Hide password" : "Show password"}
                tabIndex={0}
              >
                {showPwd ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="ims-cap">Security number (CAPTCHA)</label>
            <div className="ims-captcha">
              <div className="ims-captcha-image" aria-hidden={!captchaImage}>
                {captchaImage ? (
                  <img src={captchaImage} alt="IMS CAPTCHA" height={48} />
                ) : (
                  <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                )}
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleRefreshCaptcha}
                disabled={captchaBusy || state === "verifying"}
              >
                <RefreshCw size={14} aria-hidden="true" className={captchaBusy ? "animate-spin" : undefined} />
                Refresh
              </button>
              <input
                id="ims-cap"
                className="input ims-captcha-input"
                autoComplete="off"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                maxLength={20}
                placeholder="Type the text shown"
                value={cap}
                onChange={(e) => setCap(e.target.value)}
                required
                disabled={state === "verifying"}
              />
            </div>
            <p className="hint">Straight from the official IMS portal — solved by you, validated by IMS.</p>
          </div>

          <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
            <button className="btn btn-primary" type="submit" disabled={state === "verifying" || !captchaImage}>
              {state === "verifying" ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  Verifying…
                </>
              ) : (
                <>
                  <Lock size={16} aria-hidden="true" />
                  Connect
                </>
              )}
            </button>
            <button className="btn btn-ghost" type="button" onClick={handleCancel} disabled={state === "verifying"}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {/* syncing — existing Selenium extraction progress */}
      {state === "syncing" ? (
        <div className="stack" style={{ gap: 12 }}>
          <div className="row" style={{ gap: 10, alignItems: "center" }}>
            <Loader2 size={20} className="animate-spin" aria-hidden="true" style={{ color: "var(--color-brand-600)" }} />
            <span className="text-sm">{STEP_LABELS[step]}</span>
          </div>
          <p className="text-sm muted" style={{ lineHeight: 1.6 }}>
            A Chrome window opens briefly to read your attendance report from IMS.
            Do not close it until the sync completes.
          </p>
        </div>
      ) : null}

      {/* success */}
      {state === "success" && result ? (
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
            <button className="btn btn-ghost btn-sm" onClick={handleSyncAgain}>
              <RefreshCw size={14} aria-hidden="true" /> Sync again
            </button>
          </div>
        </div>
      ) : null}

      {/* security note */}
      <div className="row" style={{ gap: 10, alignItems: "flex-start", paddingTop: 4 }}>
        <Lock size={16} aria-hidden="true" style={{ color: "var(--color-ink-500)", marginTop: 2, flex: "none" }} />
        <p className="text-sm muted" style={{ lineHeight: 1.6 }}>
          Your username, password and CAPTCHA answer are forwarded only to the official NSUT IMS
          login over HTTPS, then discarded. CampusConnect never stores your password, CAPTCHA
          answer, cookies, or session tokens — not in the database, browser storage, logs, or
          exports. The session exists only in memory for the duration of the sync.
        </p>
      </div>
    </section>
  );
}
