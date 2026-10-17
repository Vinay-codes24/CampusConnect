"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ClipboardList, Flag, Newspaper, RotateCcw, Users, type LucideIcon } from "lucide-react";
import { api } from "@/lib/client";
import type { Role } from "@/lib/types";

type StatState = { value: number | null; error: string | null; loading: boolean };

type Task = {
  key: string;
  label: string;
  note: string;
  icon: LucideIcon;
  roles: Role[];
  run: () => Promise<number>;
};

const ALL: Role[] = ["faculty", "organizer", "admin"];

/**
 * Every number on this page comes from a real API call the browser makes —
 * nothing is fabricated locally.
 */
const TASKS: Task[] = [
  {
    key: "reports",
    label: "Open reports",
    note: "Awaiting moderation",
    icon: Flag,
    roles: ["faculty", "admin"],
    run: async () => (await api<{ open: number }>("/api/admin/reports?status=open")).open,
  },
  {
    key: "users",
    label: "Accounts",
    note: "Registered users",
    icon: Users,
    roles: ["admin"],
    run: async () => (await api<{ users: unknown[] }>("/api/admin/users")).users.length,
  },
  {
    key: "posts",
    label: "Posts",
    note: "Published on the feed",
    icon: Newspaper,
    roles: ALL,
    run: async () => (await api<{ total: number }>("/api/posts?limit=1")).total,
  },
  {
    key: "events",
    label: "Events",
    note: "Including past events",
    icon: CalendarDays,
    roles: ALL,
    run: async () => (await api<{ total: number }>("/api/events?filter=all")).total,
  },
  {
    key: "exams",
    label: "Upcoming exams",
    note: "Scheduled from today",
    icon: ClipboardList,
    roles: ALL,
    run: async () => {
      const data = await api<{ exams: Array<{ date: string }> }>("/api/academics");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return data.exams.filter((e) => new Date(e.date).getTime() >= today.getTime()).length;
    },
  },
];

export function Overview({ role }: { role: Role }) {
  const [stats, setStats] = useState<Record<string, StatState>>({});
  const tasks = useMemo(() => TASKS.filter((task) => task.roles.includes(role)), [role]);

  const load = useCallback(async () => {
    const initial: Record<string, StatState> = {};
    tasks.forEach((task) => {
      initial[task.key] = { value: null, error: null, loading: true };
    });
    setStats(initial);

    await Promise.all(
      tasks.map(async (task) => {
        try {
          const value = await task.run();
          setStats((prev) => ({ ...prev, [task.key]: { value, error: null, loading: false } }));
        } catch (e) {
          setStats((prev) => ({ ...prev, [task.key]: { value: null, error: (e as Error).message, loading: false } }));
        }
      }),
    );
  }, [tasks]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadingCount = tasks.filter((task) => stats[task.key]?.loading).length;

  return (
    <section className="stack" aria-label="Overview">
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 19 }}>Overview</h2>
          <p className="text-sm muted" style={{ marginTop: 4 }}>
            Live counts pulled from the CampusConnect API.
          </p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void load()} disabled={loadingCount > 0}>
          <RotateCcw size={14} /> Refresh counts
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {tasks.map((task) => {
          const Icon = task.icon;
          const state = stats[task.key];
          return (
            <article key={task.key} className="card card-pad stack" style={{ gap: 8 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="text-sm muted" style={{ fontWeight: 700 }}>
                  {task.label}
                </span>
                <span
                  aria-hidden="true"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 9,
                    display: "grid",
                    placeItems: "center",
                    background: "var(--color-brand-50)",
                    color: "var(--color-brand-700)",
                  }}
                >
                  <Icon size={16} />
                </span>
              </div>

              {state?.loading ? (
                <div className="skeleton" style={{ width: "55%", height: 30 }} />
              ) : state?.error ? (
                <strong style={{ fontSize: 24, color: "#b91c1c" }} title={state.error}>
                  —
                </strong>
              ) : (
                <strong style={{ fontSize: 30, fontWeight: 800, color: "var(--color-brand-700)" }}>{state?.value ?? 0}</strong>
              )}

              <span className="text-sm muted">{state?.error ? `Couldn’t load: ${state.error}` : task.note}</span>
            </article>
          );
        })}
      </div>

      <p className="hint">Cards your role can’t access aren’t shown at all. An em dash means the request failed — use “Refresh counts” to try again.</p>
    </section>
  );
}
