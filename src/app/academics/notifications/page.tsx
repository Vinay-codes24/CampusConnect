"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, CircleAlert, Inbox, Megaphone } from "lucide-react";
import { api, formatDate, timeAgo } from "@/lib/client";
import { useApp } from "@/components/providers";
import { EmptyState, ErrorState, Spinner } from "@/components/ui";
import {
  BackLink,
  Chip,
  DemoBadge,
  LoadingCards,
  PageHead,
  SignInPrompt,
  useAsyncResource,
} from "@/components/academics/core";

type NotifItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  important: boolean;
  createdAt: string;
  read: boolean;
};

type NotifResponse = { items: NotifItem[]; unread: number; total: number };

type Category = "Exams" | "Assignments" | "Circulars" | "Holidays" | "Other";

const FILTERS = ["All", "Unread", "Exams", "Assignments", "Circulars", "Holidays"] as const;
type Filter = (typeof FILTERS)[number];

function categoryOf(item: NotifItem): Category {
  const text = `${item.title} ${item.body}`.toLowerCase();
  if (/\b(holiday|vacation|day off|remain closed|festive break)\b/.test(text)) return "Holidays";
  if (/\b(examinations?|exams?|hall ticket|internal assessment|backlog)\b/.test(text)) return "Exams";
  if (/\bassignments?\b/.test(text)) return "Assignments";
  if (item.type === "academic" || item.type === "system") return "Circulars";
  return "Other";
}

const CATEGORY_TAG: Record<Category, string> = {
  Exams: "tag",
  Assignments: "tag tag-accent",
  Circulars: "tag tag-muted",
  Holidays: "tag tag-warn",
  Other: "tag tag-muted",
};

export default function AcademicsNotificationsPage() {
  const { toast, refreshNotifications } = useApp();
  const { state, retry } = useAsyncResource<NotifResponse>("/api/notifications?limit=50");

  const [readOverrides, setReadOverrides] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<Filter>("All");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [allPending, setAllPending] = useState(false);

  const items = useMemo(
    () => (state.status === "ready" ? state.data.items.map((i) => ({ ...i, read: i.read || Boolean(readOverrides[i.id]) })) : []),
    [state, readOverrides],
  );

  const unreadCount = items.filter((i) => !i.read).length;

  const counts = useMemo(() => {
    const base: Record<Filter, number> = {
      All: items.length,
      Unread: unreadCount,
      Exams: 0,
      Assignments: 0,
      Circulars: 0,
      Holidays: 0,
    };
    items.forEach((i) => {
      const cat = categoryOf(i);
      if (cat in base) base[cat as Exclude<Category, "Other">] += 1;
    });
    return base;
  }, [items, unreadCount]);

  const visible = items.filter((i) => {
    if (filter === "All") return true;
    if (filter === "Unread") return !i.read;
    return categoryOf(i) === filter;
  });

  const markOne = useCallback(
    async (id: string) => {
      setPendingId(id);
      try {
        await api("/api/notifications", { method: "POST", json: { id } });
        setReadOverrides((prev) => ({ ...prev, [id]: true }));
        await refreshNotifications();
        toast("Notification marked as read", "success");
      } catch (err) {
        toast(err instanceof Error ? err.message : "Could not mark as read", "error");
      } finally {
        setPendingId(null);
      }
    },
    [refreshNotifications, toast],
  );

  const markAll = useCallback(async () => {
    setAllPending(true);
    try {
      await api("/api/notifications", { method: "POST", json: { all: true } });
      setReadOverrides((prev) => {
        const next = { ...prev };
        items.forEach((i) => {
          next[i.id] = true;
        });
        return next;
      });
      await refreshNotifications();
      toast("All notifications marked as read", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not mark everything as read", "error");
    } finally {
      setAllPending(false);
    }
  }, [items, refreshNotifications, toast]);

  return (
    <div className="container stack">
      <BackLink />
      <PageHead
        icon={<Bell size={22} />}
        title="Academic notices"
        subtitle="Exam circulars, assignment alerts, holidays and other notices published to students."
        actions={
          <>
            <DemoBadge />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={markAll}
              disabled={allPending || state.status !== "ready" || unreadCount === 0}
              title={unreadCount === 0 ? "Everything is already read" : "Mark every notice as read"}
            >
              {allPending ? <span className="spinner" aria-hidden="true" /> : <CheckCheck size={15} aria-hidden="true" />}
              Mark all read
            </button>
          </>
        }
      />

      {state.status === "loading" ? <LoadingCards label="Loading notices…" /> : null}

      {state.status === "error" ? (
        state.auth ? (
          <SignInPrompt />
        ) : (
          <ErrorState message={state.message} onRetry={retry} />
        )
      ) : null}

      {state.status === "ready" ? (
        <div className="stack">
          <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div className="chip-row" role="group" aria-label="Filter notices">
              {FILTERS.map((f) => (
                <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
                  {f}
                  <span
                    style={{
                      opacity: 0.85,
                      fontWeight: 700,
                    }}
                  >
                    {counts[f]}
                  </span>
                </Chip>
              ))}
            </div>
            <p className="text-sm muted" role="status">
              {unreadCount > 0 ? `${unreadCount} unread of ${items.length}` : `All ${items.length} read`}
            </p>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={<Inbox size={26} />}
              title={filter === "Unread" ? "You're all caught up" : `No ${filter.toLowerCase()} notices`}
              body={
                filter === "Unread"
                  ? "Every notice has been read. New circulars from the college office will land here."
                  : "Nothing in this category yet — try another filter."
              }
              action={
                filter !== "All" ? (
                  <button type="button" className="btn btn-ghost" onClick={() => setFilter("All")}>
                    Show all notices
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className="stack">
              {visible.map((item) => {
                const category = categoryOf(item);
                return (
                  <article
                    key={item.id}
                    className="card card-pad"
                    style={{
                      borderLeft: item.important ? "3px solid #ef4444" : undefined,
                      background: item.important ? "#fffbeb" : undefined,
                      opacity: item.read ? 0.85 : 1,
                    }}
                  >
                    <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                        <span className={CATEGORY_TAG[category]}>{category}</span>
                        {item.important ? (
                          <span className="tag tag-danger row" style={{ gap: 4 }}>
                            <CircleAlert size={12} aria-hidden="true" /> Important
                          </span>
                        ) : null}
                        {!item.read ? <span className="tag">Unread</span> : null}
                      </div>
                      <span className="text-sm muted" title={formatDate(item.createdAt)}>
                        {formatDate(item.createdAt)} · {timeAgo(item.createdAt)}
                      </span>
                    </div>

                    <h3 style={{ fontSize: 15.5, marginTop: 8 }}>{item.title}</h3>
                    <p className="text-sm" style={{ marginTop: 4, color: "var(--color-ink-700)" }}>
                      {item.body}
                    </p>

                    <div className="row" style={{ marginTop: 12, gap: 8, flexWrap: "wrap" }}>
                      {item.link ? (
                        <Link href={item.link} className="btn btn-ghost btn-sm">
                          Open notice
                        </Link>
                      ) : null}
                      {!item.read ? (
                        <button
                          type="button"
                          className="btn btn-soft btn-sm"
                          onClick={() => markOne(item.id)}
                          disabled={pendingId === item.id}
                        >
                          {pendingId === item.id ? <Spinner label="Marking…" /> : "Mark as read"}
                        </button>
                      ) : (
                        <span className="text-sm muted">Read</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <p className="hint row" style={{ gap: 6 }}>
            <Megaphone size={14} aria-hidden="true" />
            Notices are published by the college office and faculty. Reading state syncs with the bell menu in the
            header.
          </p>
        </div>
      ) : null}
    </div>
  );
}
