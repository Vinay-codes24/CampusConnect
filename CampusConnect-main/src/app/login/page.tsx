"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, KeyRound, Shield, User, Users } from "lucide-react";
import { api } from "@/lib/client";
import { useApp } from "@/components/providers";
import { AuthCard } from "@/components/account/auth-card";
import { FormError, PasswordField, PendingButton, TextField } from "@/components/account/fields";

const DEMO_ACCOUNTS = [
  { role: "Student", name: "Aarav Sharma", email: "student@campus.edu", password: "student123", icon: User },
  { role: "Faculty", name: "Dr. Meera Iyer", email: "faculty@campus.edu", password: "faculty123", icon: GraduationCap },
  { role: "Organizer", name: "Rohan Verma", email: "organizer@campus.edu", password: "organizer123", icon: Users },
  { role: "Admin", name: "Campus Administrator", email: "admin@campus.edu", password: "admin123", icon: Shield },
] as const;

/** Only same-site paths may be used as a redirect target. */
function safeNext(raw: string | null): string {
  if (!raw) return "/posts";
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/posts";
}

function LoginInner() {
  const { user, refreshUser, toast } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState("");
  const [pending, setPending] = useState(false);
  const alreadySignedIn = useRef(user !== null);

  useEffect(() => {
    if (alreadySignedIn.current) router.replace("/posts");
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const found: { email?: string; password?: string } = {};
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email.trim())) found.email = "Enter a valid college email address.";
    if (!password) found.password = "Enter your password.";
    setErrors(found);
    if (found.email || found.password) return;

    setPending(true);
    setServerError("");
    try {
      await api("/api/auth/login", { method: "POST", json: { email: email.trim(), password } });
      await refreshUser();
      toast("Welcome back!", "success");
      router.push(next);
      router.refresh();
    } catch (err) {
      const message = (err as Error).message;
      setServerError(message);
      toast(message, "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="Sign in"
      subtitle={`Pick up where you left off on CampusConnect.${next !== "/posts" ? ` You’ll return to ${next} after signing in.` : ""}`}
      footer={
        <>
          New to CampusConnect?{" "}
          <Link className="link" href="/signup">
            Create an account
          </Link>
        </>
      }
    >
      <form className="stack" onSubmit={submit} noValidate>
        <FormError message={serverError} />

        <TextField
          id="login-email"
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
        <PasswordField
          id="login-password"
          label="Password"
          value={password}
          onChange={setPassword}
          error={errors.password}
          autoComplete="current-password"
          required
          disabled={pending}
        />

        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <Link className="link text-sm" href="/reset">
            Forgot your password?
          </Link>
          <PendingButton pending={pending} pendingLabel="Signing in…" className="btn btn-primary btn-lg">
            Sign in
          </PendingButton>
        </div>
      </form>

      <div className="stack" style={{ gap: 10 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-ink-500)" }}>
            Use a demo account
          </h2>
          <span className="demo-badge">Demo data</span>
        </div>

        <div className="stack" style={{ gap: 8 }}>
          {DEMO_ACCOUNTS.map((account) => {
            const Icon = account.icon;
            return (
              <button
                key={account.email}
                type="button"
                className="panel card-pad card-hover"
                style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, textAlign: "left", cursor: "pointer" }}
                onClick={() => {
                  setEmail(account.email);
                  setPassword(account.password);
                  setErrors({});
                  setServerError("");
                  toast(`Filled in the ${account.role.toLowerCase()} demo account — press Sign in`, "default");
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    display: "grid",
                    placeItems: "center",
                    background: "var(--color-brand-50)",
                    color: "var(--color-brand-700)",
                    flex: "none",
                  }}
                >
                  <Icon size={17} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontWeight: 700, fontSize: 14 }}>
                    {account.role} · {account.name}
                  </span>
                  <span className="text-sm muted" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {account.email} · {account.password}
                  </span>
                </span>
                <span className="tag tag-muted" style={{ flex: "none" }}>
                  Use
                </span>
              </button>
            );
          })}
        </div>

        <p className="hint row" style={{ gap: 6 }}>
          <KeyRound size={13} aria-hidden="true" />
          Passwords: student123 · faculty123 · organizer123 · admin123
        </p>
      </div>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
