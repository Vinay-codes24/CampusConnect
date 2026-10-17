"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Search, ShieldAlert, UserCheck, UserX, Users } from "lucide-react";
import { api, formatDate } from "@/lib/client";
import { useApp } from "@/components/providers";
import { ROLES, type Role } from "@/lib/types";
import { EmptyState, ErrorState, SkeletonCard } from "@/components/ui";

type AdminUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: Role;
  department: string | null;
  year: string | null;
  verified: boolean;
  createdAt: string;
  posts: number;
  events: number;
};

const ROLE_LABEL: Record<Role, string> = {
  student: "Student",
  faculty: "Faculty",
  organizer: "Organizer",
  admin: "Admin",
};

export function UsersTab({ viewerId }: { viewerId: string }) {
  const { toast } = useApp();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api<{ users: AdminUser[] }>("/api/admin/users");
      setUsers(res.users);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      `${u.name} ${u.username} ${u.email} ${u.department ?? ""} ${u.year ?? ""} ${u.role}`.toLowerCase().includes(q),
    );
  }, [users, query]);

  async function update(userId: string, patch: { role?: Role; verified?: boolean }, success: string) {
    if (busyId) return;
    setBusyId(userId);
    try {
      await api("/api/admin/users", { method: "POST", json: { userId, ...patch } });
      setUsers((list) =>
        list.map((u) =>
          u.id === userId ? { ...u, ...(patch.role ? { role: patch.role } : {}), ...(patch.verified !== undefined ? { verified: patch.verified } : {}) } : u,
        ),
      );
      setRowErrors((r) => {
        const copy = { ...r };
        delete copy[userId];
        return copy;
      });
      toast(success, "success");
    } catch (e) {
      const message = (e as Error).message;
      setRowErrors((r) => ({ ...r, [userId]: message }));
      toast(message, "error");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="stack">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <section className="stack" aria-label="Users and roles">
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 19 }}>Users &amp; roles</h2>
          <p className="text-sm muted" style={{ marginTop: 4 }}>
            {users.length} accounts · changes apply immediately and the account is notified.
          </p>
        </div>
        <div className="search-box" style={{ maxWidth: 280, width: "100%" }}>
          <Search size={16} className="search-icon" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, username, email…"
            aria-label="Search accounts"
            style={{ paddingLeft: 38 }}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card card-pad">
          <EmptyState
            icon={<Users size={26} />}
            title={`No accounts match “${query}”`}
            body="Try a name, username or department instead."
            action={
              <button type="button" className="btn btn-ghost" onClick={() => setQuery("")}>
                Clear search
              </button>
            }
          />
        </div>
      ) : (
        <div className="panel" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 760 }}>
            <caption className="sr-only">CampusConnect accounts with role and verification controls</caption>
            <thead>
              <tr style={{ background: "var(--color-ink-100)", textAlign: "left" }}>
                <th scope="col" style={{ padding: "11px 14px", fontSize: 12.5, color: "var(--color-ink-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Account
                </th>
                <th scope="col" style={{ padding: "11px 14px", fontSize: 12.5, color: "var(--color-ink-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Activity
                </th>
                <th scope="col" style={{ padding: "11px 14px", fontSize: 12.5, color: "var(--color-ink-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Joined
                </th>
                <th scope="col" style={{ padding: "11px 14px", fontSize: 12.5, color: "var(--color-ink-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Role
                </th>
                <th scope="col" style={{ padding: "11px 14px", fontSize: 12.5, color: "var(--color-ink-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Verified
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const isSelf = u.id === viewerId;
                const busy = busyId === u.id;
                const rowError = rowErrors[u.id];
                return (
                  <tr key={u.id} style={{ borderTop: "1px solid var(--color-ink-200)", opacity: busy ? 0.7 : 1 }}>
                    <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
                        <Link className="link" href={`/profile/${u.id}`}>
                          {u.name}
                        </Link>
                        {u.verified ? <BadgeCheck size={14} aria-label="Verified" style={{ color: "var(--color-accent-600)" }} /> : null}
                        {isSelf ? <span className="tag">you</span> : null}
                      </span>
                      <span className="text-sm muted" style={{ display: "block" }}>
                        @{u.username} · {u.email}
                      </span>
                      <span className="text-sm muted" style={{ display: "block" }}>
                        {u.department ?? "No department"} {u.year ? `· ${u.year}` : ""}
                      </span>
                      {rowError ? (
                        <span className="text-sm" role="alert" style={{ display: "block", color: "#b91c1c", fontWeight: 600, marginTop: 4 }}>
                          <ShieldAlert size={13} aria-hidden="true" style={{ verticalAlign: -2 }} /> {rowError}
                        </span>
                      ) : null}
                    </td>
                    <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                      <span className="text-sm muted" style={{ display: "block" }}>
                        {u.posts} posts
                      </span>
                      <span className="text-sm muted" style={{ display: "block" }}>
                        {u.events} event registrations
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", verticalAlign: "top", whiteSpace: "nowrap" }}>
                      <span className="text-sm muted">{formatDate(u.createdAt)}</span>
                    </td>
                    <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                      <label className="sr-only" htmlFor={`role-${u.id}`}>
                        Role for {u.name}
                      </label>
                      <select
                        id={`role-${u.id}`}
                        className="select"
                        style={{ minWidth: 132 }}
                        value={u.role}
                        disabled={busy}
                        onChange={(e) => void update(u.id, { role: e.target.value as Role }, `${u.name} is now ${ROLE_LABEL[e.target.value as Role].toLowerCase()}`)}
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABEL[role]}
                          </option>
                        ))}
                      </select>
                      <span className="hint" style={{ display: "block", marginTop: 4 }}>
                        {isSelf ? "Server rejects changes to your own account." : "Applies immediately"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                      <button
                        type="button"
                        className={u.verified ? "btn btn-soft btn-sm" : "btn btn-ghost btn-sm"}
                        disabled={busy}
                        aria-busy={busy}
                        onClick={() =>
                          void update(u.id, { verified: !u.verified }, u.verified ? `${u.name} is no longer verified` : `${u.name} verified`)
                        }
                      >
                        {u.verified ? (
                          <>
                            <UserCheck size={14} /> Verified
                          </>
                        ) : (
                          <>
                            <UserX size={14} /> Not verified
                          </>
                        )}
                      </button>
                      <span className="hint" style={{ display: "block", marginTop: 4 }}>
                        {u.verified ? "Click to revoke" : "Click to verify"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
