"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, MailCheck, ShieldCheck } from "lucide-react";
import { api } from "@/lib/client";
import { AuthCard } from "@/components/account/auth-card";
import { FormError, PasswordField, PendingButton, TextField } from "@/components/account/fields";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

type RequestResponse = { ok: boolean; demo?: boolean; message: string; token: string | null };

/**
 * Two-step password reset in a single page:
 *   1. request a code  → POST /api/auth/reset { email }   (demo mode returns the code here)
 *   2. confirm the code → POST /api/auth/reset { email, token, password }
 */
export default function ResetPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; token?: string; password?: string }>({});
  const [serverError, setServerError] = useState("");
  const [pending, setPending] = useState(false);
  const [issued, setIssued] = useState<RequestResponse | null>(null);

  const rules = [
    { label: "8 characters or more", ok: password.length >= 8 },
    { label: "At least one letter", ok: /[a-zA-Z]/.test(password) },
    { label: "At least one number", ok: /[0-9]/.test(password) },
  ];

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    const found: typeof errors = {};
    if (!EMAIL_RE.test(email.trim())) found.email = "Enter a valid email address.";
    setErrors(found);
    if (found.email) return;

    setPending(true);
    setServerError("");
    try {
      const res = await api<RequestResponse>("/api/auth/reset", { method: "POST", json: { email: email.trim() } });
      setIssued(res);
      setToken(res.token ?? "");
      setStep(2);
    } catch (err) {
      const message = (err as Error).message;
      setServerError(message);
    } finally {
      setPending(false);
    }
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    const found: typeof errors = {};
    if (token.trim().length < 8) found.token = "Paste the reset code from step 1.";
    if (!rules.every((r) => r.ok)) found.password = "Your password must meet all three rules.";
    setErrors(found);
    if (found.token || found.password) return;

    setPending(true);
    setServerError("");
    try {
      await api("/api/auth/reset", { method: "POST", json: { email: email.trim(), token: token.trim(), password } });
      setStep(3);
    } catch (err) {
      setServerError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  function restart() {
    setStep(1);
    setToken("");
    setPassword("");
    setIssued(null);
    setErrors({});
    setServerError("");
  }

  if (step === 3) {
    return (
      <AuthCard
        title="Password updated"
        subtitle="Your new password is active. For safety, every other session was signed out."
        footer={
          <>
            Remembered your old password?{" "}
            <Link className="link" href="/login">
              Back to sign in
            </Link>
          </>
        }
      >
        <div className="stack" style={{ gap: 14, alignItems: "center", textAlign: "center" }}>
          <span className="empty-icon" aria-hidden="true">
            <ShieldCheck size={26} />
          </span>
          <Link className="btn btn-primary btn-lg" href="/login">
            Go to sign in
          </Link>
        </div>
      </AuthCard>
    );
  }

  if (step === 2) {
    return (
      <AuthCard
        title="Enter your reset code"
        subtitle={`We sent a code for ${email}. Paste it below together with your new password.`}
        footer={
          <button type="button" className="link" onClick={restart} style={{ background: "none", border: 0, cursor: "pointer", font: "inherit" }}>
            <ArrowLeft size={13} aria-hidden="true" style={{ verticalAlign: -2 }} /> Use a different email
          </button>
        }
      >
        <div className="stack" style={{ gap: 8, padding: "14px 16px", borderRadius: 14, background: "#fffbeb", border: "1px solid #fde68a" }}>
          <span className="row text-sm" style={{ gap: 7, color: "#92400e", fontWeight: 700 }}>
            <KeyRound size={15} aria-hidden="true" /> Demo mode: codes are shown here instead of being emailed
          </span>
          <span className="demo-badge">demo mode</span>
          <code
            style={{
              display: "block",
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "0.18em",
              color: "var(--color-ink-900)",
              background: "#fff",
              border: "1px dashed #fcd34d",
              borderRadius: 10,
              padding: "10px 12px",
              textAlign: "center",
              wordBreak: "break-all",
            }}
          >
            {issued?.token ?? "no code for that email"}
          </code>
          {issued?.token ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setToken(issued.token ?? "")} disabled={pending}>
              Copy code into the field
            </button>
          ) : (
            <p className="text-sm" style={{ color: "#92400e", margin: 0 }}>
              No account matches that email, but we never reveal that here. If an account exists, its code would appear above.
            </p>
          )}
          <p className="hint" style={{ margin: 0 }}>
            {issued?.message}
          </p>
        </div>

        <form className="stack" onSubmit={confirm} noValidate>
          <FormError message={serverError} />

          <TextField
            id="reset-token"
            label="Reset code"
            value={token}
            onChange={setToken}
            error={errors.token}
            placeholder="16-character code"
            autoComplete="one-time-code"
            required
            disabled={pending}
          />
          <PasswordField
            id="reset-password"
            label="New password"
            value={password}
            onChange={setPassword}
            error={errors.password}
            autoComplete="new-password"
            required
            disabled={pending}
          />
          <ul className="stack" style={{ gap: 4, listStyle: "none", padding: 0, margin: 0 }} aria-live="polite">
            {rules.map((rule) => (
              <li
                key={rule.label}
                className="row text-sm"
                style={{ gap: 7, color: rule.ok ? "var(--color-accent-700)" : "var(--color-ink-500)" }}
              >
                {rule.ok ? "✓" : "○"} {rule.label}
              </li>
            ))}
          </ul>

          <PendingButton pending={pending} pendingLabel="Updating password…" className="btn btn-primary btn-lg">
            Set new password
          </PendingButton>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter the college email on your account and we’ll send you a one-time reset code."
      footer={
        <>
          Remembered it?{" "}
          <Link className="link" href="/login">
            Back to sign in
          </Link>
        </>
      }
    >
      <form className="stack" onSubmit={requestCode} noValidate>
        <FormError message={serverError} />
        <TextField
          id="reset-email"
          label="College email"
          type="email"
          value={email}
          onChange={setEmail}
          error={errors.email}
          placeholder="you@campus.edu"
          autoComplete="email"
          required
          disabled={pending}
        />
        <div className="row" style={{ gap: 8, alignItems: "flex-start", color: "var(--color-ink-500)" }}>
          <MailCheck size={16} aria-hidden="true" style={{ flex: "none", marginTop: 2 }} />
          <span className="hint">
            This build has no mail service: after you request a code, the page shows it directly with a “demo mode” note.
          </span>
        </div>
        <PendingButton pending={pending} pendingLabel="Sending code…" className="btn btn-primary btn-lg">
          Send reset code
        </PendingButton>
      </form>
    </AuthCard>
  );
}
