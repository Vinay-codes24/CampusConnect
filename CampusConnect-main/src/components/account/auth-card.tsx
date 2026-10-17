"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { LogIn } from "lucide-react";

/** Centred card shell used by /login, /signup and /reset. */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="container" style={{ maxWidth: 470 }}>
      <div className="card card-pad stack" style={{ gap: 18 }}>
        <div>
          <h1 style={{ fontSize: 24 }}>{title}</h1>
          {subtitle ? (
            <p className="text-sm muted" style={{ marginTop: 6 }}>
              {subtitle}
            </p>
          ) : null}
        </div>
        {children}
        {footer ? (
          <>
            <div className="divider" />
            <div className="text-sm muted" style={{ textAlign: "center" }}>
              {footer}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

/** Consistent "you need to sign in" state for protected pages. */
export function SignInPrompt({
  title = "Sign in to continue",
  body,
  next,
}: {
  title?: string;
  body: string;
  next: string;
}) {
  return (
    <div className="container" style={{ maxWidth: 560 }}>
      <div className="card card-pad" style={{ textAlign: "center", padding: "38px 24px" }}>
        <div className="empty-icon" aria-hidden="true">
          <LogIn size={26} />
        </div>
        <h2 style={{ fontSize: 19, marginBottom: 8 }}>{title}</h2>
        <p className="text-sm muted" style={{ maxWidth: 420, margin: "0 auto 18px" }}>
          {body}
        </p>
        <div className="row" style={{ justifyContent: "center", flexWrap: "wrap", gap: 10 }}>
          <Link className="btn btn-primary" href={`/login?next=${encodeURIComponent(next)}`}>
            <LogIn size={16} /> Sign in
          </Link>
          <Link className="btn btn-ghost" href="/signup">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
