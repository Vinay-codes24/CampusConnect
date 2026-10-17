"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";
import { api, type ApiUser } from "@/lib/client";
import { useApp } from "@/components/providers";
import { DEPARTMENTS, YEARS } from "@/lib/types";
import { AuthCard } from "@/components/account/auth-card";
import { FormError, PasswordField, PendingButton, SelectField, TextField } from "@/components/account/fields";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

function SignupInner() {
  const { user, setUser, toast } = useApp();
  const router = useRouter();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [year, setYear] = useState(YEARS[0]);
  const [errors, setErrors] = useState<{ name?: string; username?: string; email?: string; password?: string }>({});
  const [serverError, setServerError] = useState("");
  const [pending, setPending] = useState(false);
  const alreadySignedIn = useRef(user !== null);

  useEffect(() => {
    if (alreadySignedIn.current) router.replace("/posts");
  }, [router]);

  const rules = [
    { label: "8 characters or more", ok: password.length >= 8 },
    { label: "At least one letter", ok: /[a-zA-Z]/.test(password) },
    { label: "At least one number", ok: /[0-9]/.test(password) },
  ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const found: typeof errors = {};
    if (name.trim().length < 2) found.name = "Please enter your full name.";
    if (username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "").length < 3) {
      found.username = "Use at least 3 letters, numbers or underscores.";
    }
    if (!EMAIL_RE.test(email.trim())) found.email = "Enter a valid college email address.";
    if (!rules.every((r) => r.ok)) found.password = "Your password must meet all three rules.";
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    setPending(true);
    setServerError("");
    try {
      const res = await api<{ user: ApiUser }>("/api/auth/signup", {
        method: "POST",
        json: { email: email.trim(), password, name: name.trim(), username: username.trim(), department, year },
      });
      setUser(res.user);
      toast(`Welcome to CampusConnect, ${res.user.name.split(" ")[0]}!`, "success");
      router.push("/posts");
      router.refresh();
    } catch (err) {
      const message = (err as Error).message;
      if (/college email already exists/i.test(message)) setErrors((x) => ({ ...x, email: message }));
      else if (/username is taken/i.test(message)) setErrors((x) => ({ ...x, username: message }));
      else setServerError(message);
      toast(message, "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Join CampusConnect with your college email — it takes about a minute."
      footer={
        <>
          Already have an account?{" "}
          <Link className="link" href="/login">
            Sign in
          </Link>
        </>
      }
    >
      <form className="stack" onSubmit={submit} noValidate>
        <FormError message={serverError} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
          <TextField
            id="signup-name"
            label="Full name"
            value={name}
            onChange={setName}
            error={errors.name}
            placeholder="Aarav Sharma"
            autoComplete="name"
            required
            maxLength={60}
            disabled={pending}
          />
          <TextField
            id="signup-username"
            label="Username"
            value={username}
            onChange={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            error={errors.username}
            hint="Letters, numbers, underscores"
            placeholder="aarav"
            autoComplete="username"
            required
            maxLength={24}
            disabled={pending}
          />
        </div>

        <TextField
          id="signup-email"
          label="College email"
          type="email"
          value={email}
          onChange={setEmail}
          error={errors.email}
          hint="Used to verify you belong to campus (e.g. name@campus.edu)."
          placeholder="you@campus.edu"
          autoComplete="email"
          required
          disabled={pending}
        />

        <PasswordField
          id="signup-password"
          label="Password"
          value={password}
          onChange={setPassword}
          error={errors.password}
          autoComplete="new-password"
          required
          disabled={pending}
        />
        <ul className="stack" style={{ gap: 4, listStyle: "none", padding: 0, margin: 0 }} aria-live="polite">
          {rules.map((rule) => (
            <li key={rule.label} className="row text-sm" style={{ gap: 7, color: rule.ok ? "var(--color-accent-700)" : "var(--color-ink-500)" }}>
              {rule.ok ? <CheckCircle2 size={14} aria-hidden="true" /> : <Circle size={14} aria-hidden="true" />}
              {rule.label}
            </li>
          ))}
        </ul>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
          <SelectField
            id="signup-department"
            label="Department"
            value={department}
            onChange={setDepartment}
            disabled={pending}
            options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
          />
          <SelectField
            id="signup-year"
            label="Year of study"
            value={year}
            onChange={setYear}
            disabled={pending}
            options={YEARS.map((y) => ({ value: y, label: y }))}
          />
        </div>

        <PendingButton pending={pending} pendingLabel="Creating account…" className="btn btn-primary btn-lg">
          Create account
        </PendingButton>
      </form>
    </AuthCard>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupInner />
    </Suspense>
  );
}
