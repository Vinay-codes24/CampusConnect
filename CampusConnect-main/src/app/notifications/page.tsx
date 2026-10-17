"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CalendarCheck,
  CalendarClock,
  CheckCheck,
  ExternalLink,
  GraduationCap,
  Info,
  MessageSquare,
  Settings,
  ShieldAlert,
  ThumbsUp,
} from "lucide-react";
import { api, timeAgo } from "@/lib/client";
import { useApp } from "@/components/providers";
import type { NotificationType } from "@/lib/types";
import { EmptyState, ErrorState, SkeletonCard } from "@/components/ui";
import { SignInPrompt } from "@/components/account/auth-card";

type Item = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  important: boolean;
  createdAt: string;
  read: boolean;
};

type Filter = "all" | "unread" | "academic" | "replies" | "events";

const TYPE_META: Record<NotificationType, { icon: LucideIcon; label: string }> = {
  reply: { icon: MessageSquare, label: "Reply" },
  post_interaction: { icon: ThumbsUp, label: "Interaction" },
  event_registration: { icon: CalendarCheck, label: "Event" },
  event_reminder: { icon: CalendarClock, label: "Event" },
  academic: { icon: GraduationCap, label: "Academic" },
  moderation: { icon: ShieldAlert, label: "Moderation" },
  system: { icon: Info, label: "System" },
};

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "academic", label: "Academic" },
  { key: "replies", label: "Replies" },
  { key: "events", label: "Events" },
];

function groupFor(iso: string): "Today" | "This week" | "Earlier" {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "Earlier";
  if (then.toDateString() === new Date().toDateString()) return "Today";
  const days = (Date.now() - then.getTime()) / 86_400_000;
  return days <= 7 ? "This week" : "Earlier";
}

function matches(item: Item, filter: Filter): boolean {
  switch (filter) {
    case "unread":
      return !item.read;
    case "academic":
      return item.type === "academic";
    case "replies":
      return item.type === "reply";
    case "events":
      return item.type === "event_registration" || item.type === "event_reminder";
    default:
      return true;
  }
}

export default function NotificationsPage() {
  const { user, refreshNotifications, toast } = useApp();
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api<{ items: Item[]; total: number }>("/api/notifications?limit=100");
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  async function markOne(item: Item) {
    if (item.read || busyId) return;
    setBusyId(item.id);
    try {
      await api("/api/notifications", { method: "POST", json: { id: item.id } });
      setItems((list) => list.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      await refreshNotifications();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusyId(null);
    }
  }

  async function markAll() {
    setMarkingAll(true);
    try {
      await api("/api/notifications", { method: "POST", json: { all: true } });
      setItems((list) => list.map((n) => ({ ...n, read: true })));
      await refreshNotifications();
      toast("All notifications marked as read", "success");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setMarkingAll(false);
    }
  }

  if (!user) {
    return (
      <SignInPrompt
        title="Sign in for your notifications"
        body="Replies, event reminders, moderation updates and official announcements land in your notification centre."
        next="/notifications"
      />
    );
  }

  const visible = items.filter((n) => matches(n, filter));
  const unread = items.filter((n) => !n.read).length;

  const groups: Array<{ label: string; items: Item[] }> = ["Today", "This week", "Earlier"]
    .map((label) => ({ label, items: visible.filter((n) => groupFor(n.createdAt) === label) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="container stack">
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24 }}>Notifications</h1>
          <p className="text-sm muted" style={{ marginTop: 4 }}>
            {unread > 0 ? `${unread} unread of ${total} notifications` : total > 0 ? `You’re caught up · ${total} notifications` : "Nothing here yet"}
          </p>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <Link className="btn btn-soft" href="/settings">
            <Settings size={15} /> Preferences
          </Link>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => void markAll()}
            disabled={markingAll || unread === 0}
            aria-busy={markingAll}
            title={unread === 0 ? "Everything is already read" : "Mark every notification as read"}
          >
            {markingAll ? (
              <>
                <span className="spinner" aria-hidden="true" /> Marking…
              </>
            ) : (
              <>
                <CheckCheck size={16} /> Mark all read
              </>
            )}
          </button>
        </div>
      </div>

      <div className="chip-row" role="group" aria-label="Filter notifications">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" className="chip" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label}
            {f.key === "unread" && unread > 0 ? <span style={{ opacity: 0.8 }}>({unread})</span> : null}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="stack">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : total === 0 ? (
        <div className="card card-pad">
          <EmptyState
            icon={<Bell size={26} />}
            title="You’re all caught up"
            body="No notifications yet. Replies, event reminders and official announcements will show up here."
            action={
              <Link className="btn btn-primary" href="/posts">
                Head to the feed
              </Link>
            }
          />
        </div>
      ) : visible.length === 0 ? (
        <div className="card card-pad">
          <EmptyState
            title={`Nothing matches “${FILTERS.find((f) => f.key === filter)?.label ?? filter}”`}
            body="Try another filter to see the rest of your notifications."
            action={
              <button type="button" className="btn btn-ghost" onClick={() => setFilter("all")}>
                Show everything
              </button>
            }
          />
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.label} className="stack" aria-label={group.label}>
            <h2 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--color-ink-500)" }}>
              {group.label} <span style={{ fontWeight: 600 }}>({group.items.length})</span>
            </h2>
            {group.items.map((item) => (
              <NotificationRow
                key={item.id}
                item={item}
                busy={busyId === item.id}
                onMarkRead={() => void markOne(item)}
              />
            ))}
          </section>
        ))
      )}
    </div>
  );
}

function NotificationRow({ item, busy, onMarkRead }: { item: Item; busy: boolean; onMarkRead: () => void }) {
  const meta = TYPE_META[item.type] ?? TYPE_META.system;
  const Icon = meta.icon;

  const titleContent = item.link ? (
    <Link
      href={item.link}
      onClick={item.read ? undefined : onMarkRead}
      style={{ fontWeight: 700, fontSize: 15, color: item.read ? "var(--color-ink-700)" : "var(--color-ink-900)" }}
    >
      {item.title}
    </Link>
  ) : (
    <strong style={{ fontSize: 15, color: item.read ? "var(--color-ink-700)" : "var(--color-ink-900)" }}>{item.title}</strong>
  );

  return (
    <article
      className="panel card-pad"
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        borderLeft: item.read ? undefined : "3px solid var(--color-brand-600)",
        opacity: item.read ? 0.82 : 1,
      }}
      aria-label={`${meta.label} notification: ${item.title}`}
    >
      <span
        aria-hidden="true"
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          display: "grid",
          placeItems: "center",
          flex: "none",
          background: item.important ? "#fef2f2" : "var(--color-brand-50)",
          color: item.important ? "#b91c1c" : "var(--color-brand-700)",
        }}
      >
        <Icon size={18} />
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          {titleContent}
          {item.important ? <span className="tag tag-danger">Important</span> : null}
          {item.read ? <span className="tag tag-muted">Read</span> : <span className="tag">New</span>}
        </div>
        <p className="text-sm muted" style={{ marginTop: 4 }}>
          {item.body}
        </p>
        <div className="row" style={{ gap: 10, marginTop: 10, flexWrap: "wrap" }}>
          <span className="tag tag-muted">{meta.label}</span>
          <span className="text-sm muted">{timeAgo(item.createdAt)}</span>
          {item.link ? (
            <Link className="btn btn-ghost btn-sm" href={item.link} onClick={item.read ? undefined : onMarkRead}>
              <ExternalLink size={13} /> Open
            </Link>
          ) : null}
          {!item.read ? (
            <button type="button" className="btn btn-soft btn-sm" onClick={onMarkRead} disabled={busy} aria-busy={busy}>
              {busy ? (
                <>
                  <span className="spinner" aria-hidden="true" /> Marking
                </>
              ) : (
                "Mark as read"
              )}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
