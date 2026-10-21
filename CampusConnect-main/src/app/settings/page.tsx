"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AtSign, KeyRound, LogOut, MessageSquare, Newspaper, CalendarClock, GraduationCap, ShieldCheck, User } from "lucide-react";
import { api } from "@/lib/client";
import { useApp } from "@/components/providers";
import type { NotificationPrefs } from "@/lib/types";
import { ErrorState, SkeletonCard } from "@/components/ui";
import { SignInPrompt } from "@/components/account/auth-card";

type PrefKey = keyof NotificationPrefs;

const PREF_ROWS: Array<{ key: PrefKey; label: string; description: string; icon: typeof MessageSquare }> = [
  { key: "replies", label: "Replies", description: "Someone replies to your post or comment.", icon: MessageSquare },
  { key: "postInteractions", label: "Post interactions", description: "Upvotes and other activity on what you share.", icon: Newspaper },
  { key: "eventReminders", label: "Event reminders", description: "New campus events and reminders before they start.", icon: CalendarClock },
  { key: "academic", label: "Academic updates", description: "Official syllabus, exam, attendance and announcement news.", icon: GraduationCap },
];

export default function SettingsPage() {
  const { user, setUser, toast } = useApp();
  const router = useRouter();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingKey, setSavingKey] = useState<PrefKey | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api<{ prefs: NotificationPrefs }>("/api/notifications?limit=1");
      setPrefs(res.prefs);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  async function toggle(key: PrefKey) {
    if (!prefs || savingKey) return;
    const previous = prefs[key];
    const next = !previous;
    setPrefs({ ...prefs, [key]: next });
    setSavingKey(key);
    try {
      const res = await api<{ prefs: NotificationPrefs }>("/api/notifications", {
        method: "POST",
        json: { prefs: { [key]: next } },
      });
      setPrefs(res.prefs);
      toast(next ? `${labelFor(key)} notifications on` : `${labelFor(key)} notifications off`, "success");
    } catch (e) {
      const message = (e as Error).message;
      setPrefs({ ...prefs, [key]: previous });
      toast(`Couldn’t save that preference — reverted. ${message}`, "error");
    } finally {
      setSavingKey(null);
    }
  }

  async function signOut() {
    setSigningOut(true);
    try {
      await api("/api/auth/logout", { method: "POST" });
      setUser(null);
      toast("Signed out. See you soon!", "success");
      router.push("/posts");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSigningOut(false);
    }
  }

  if (!user) {
    return (
      <SignInPrompt
        title="Sign in to manage settings"
        body="Choose exactly which notifications reach you and manage your account from the settings page."
        next="/settings"
      />
    );
  }

  return (
    <div className="container stack" style={{ maxWidth: 780 }}>
      <div>
        <h1 style={{ fontSize: 24 }}>Settings</h1>
        <p className="text-sm muted" style={{ marginTop: 4 }}>
          Notification preferences and account controls for {user.name} (@{user.username}).
        </p>
      </div>

      <section className="card card-pad stack" aria-labelledby="notif-prefs-heading">
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div>
            <h2 id="notif-prefs-heading" style={{ fontSize: 17 }}>
              Notification preferences
            </h2>
            <p className="text-sm muted" style={{ marginTop: 4 }}>
              Changes save immediately. If the server rejects one, we put the switch back.
            </p>
          </div>
          <Link className="btn btn-ghost btn-sm" href="/notifications">
            Open notification centre
          </Link>
        </div>

        {loading ? (
          <div className="stack">
            <SkeletonCard />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : prefs ? (
          <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0, gap: 10 }}>
            {PREF_ROWS.map((row) => {
              const Icon = row.icon;
              const checked = prefs[row.key];
              const busy = savingKey === row.key;
              return (
                <li
                  key={row.key}
                  className="row"
                  style={{
                    justifyContent: "space-between",
                    gap: 14,
                    padding: "12px 14px",
                    border: "1px solid var(--color-ink-200)",
                    borderRadius: 14,
                    background: "var(--color-ink-100)",
                    opacity: busy ? 0.7 : 1,
                  }}
                >
                  <span className="row" style={{ gap: 11, alignItems: "flex-start", minWidth: 0 }}>
                    <span
                      aria-hidden="true"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 9,
                        display: "grid",
                        placeItems: "center",
                        background: "#fff",
                        border: "1px solid var(--color-ink-200)",
                        color: "var(--color-brand-700)",
                        flex: "none",
                      }}
                    >
                      <Icon size={16} />
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontWeight: 700, fontSize: 14.5 }}>{row.label}</span>
                      <span className="text-sm muted" style={{ display: "block" }}>
                        {row.description}
                      </span>
                      {busy ? <span className="hint">Saving…</span> : null}
                    </span>
                  </span>

                  <Switch
                    checked={checked}
                    disabled={!!savingKey}
                    label={`${row.label} notifications`}
                    onChange={() => void toggle(row.key)}
                  />
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      <section className="card card-pad stack" aria-labelledby="account-heading">
        <div>
          <h2 id="account-heading" style={{ fontSize: 17 }}>
            Account
          </h2>
          <p className="text-sm muted" style={{ marginTop: 4 }}>
            {user.email ? (
              <span className="row" style={{ gap: 6 }}>
                <AtSign size={13} aria-hidden="true" /> {user.email}
              </span>
            ) : (
              "Signed in to CampusConnect."
            )}
          </p>
        </div>

        <div className="stack" style={{ gap: 8 }}>
          <Link className="panel card-pad card-hover row" href="/profile" style={{ gap: 10 }}>
            <User size={17} aria-hidden="true" style={{ color: "var(--color-brand-700)" }} />
            <span style={{ flex: 1 }}>
              <strong style={{ display: "block", fontSize: 14.5 }}>My profile</strong>
              <span className="text-sm muted">Photo, bio, interests and your posts.</span>
            </span>
          </Link>

          <Link className="panel card-pad card-hover row" href="/reset" style={{ gap: 10 }}>
            <KeyRound size={17} aria-hidden="true" style={{ color: "var(--color-brand-700)" }} />
            <span style={{ flex: 1 }}>
              <strong style={{ display: "block", fontSize: 14.5 }}>Change password</strong>
              <span className="text-sm muted">Request a reset code and set a new password.</span>
            </span>
          </Link>

          <div className="panel card-pad row" style={{ gap: 10 }}>
            <ShieldCheck size={17} aria-hidden="true" style={{ color: "var(--color-accent-700)" }} />
            <span style={{ flex: 1 }}>
              <strong style={{ display: "block", fontSize: 14.5 }}>Role: {user.role}</strong>
              <span className="text-sm muted">Roles are managed by an administrator.</span>
            </span>
          </div>

          <button
            type="button"
            className="btn btn-danger"
            onClick={() => void signOut()}
            disabled={signingOut}
            aria-busy={signingOut}
            style={{ alignSelf: "flex-start" }}
          >
            {signingOut ? (
              <>
                <span className="spinner" aria-hidden="true" /> Signing out…
              </>
            ) : (
              <>
                <LogOut size={16} /> Sign out
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}

function labelFor(key: PrefKey): string {
  return PREF_ROWS.find((row) => row.key === key)?.label ?? "Notification";
}

/** Pill switch built from design tokens (globals.css has no switch class). */
function Switch({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      style={{
        width: 46,
        height: 26,
        flex: "none",
        padding: 0,
        borderRadius: 999,
        border: `1px solid ${checked ? "var(--color-brand-600)" : "var(--color-ink-200)"}`,
        background: checked ? "var(--color-brand-600)" : "#fff",
        cursor: disabled ? "not-allowed" : "pointer",
        position: "relative",
        transition: "background 0.15s ease, border-color 0.15s ease",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 22 : 2,
          width: 20,
          height: 20,
          borderRadius: 999,
          background: checked ? "#fff" : "var(--color-ink-400)",
          transition: "left 0.15s ease",
          boxShadow: "0 1px 2px rgba(16, 24, 40, 0.25)",
        }}
      />
    </button>
  );
}
