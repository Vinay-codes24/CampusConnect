"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, CalendarPlus, MapPin, RefreshCw, Users } from "lucide-react";
import { api, formatDate, timeAgo } from "@/lib/client";
import type { EventView } from "@/lib/events";
import { EmptyState, ErrorState, SkeletonCard } from "@/components/ui";

const STATUS_TAG: Record<EventView["status"], { label: string; className: string }> = {
  open: { label: "Open", className: "tag" },
  registered: { label: "Registered", className: "tag tag-accent" },
  full: { label: "Full", className: "tag tag-warn" },
  closed: { label: "Closed", className: "tag tag-warn" },
  past: { label: "Past", className: "tag tag-muted" },
};

export function EventsTab() {
  const [events, setEvents] = useState<EventView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api<{ events: EventView[] }>("/api/events?filter=all");
      setEvents(res.events);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
    <section className="stack" aria-label="Events">
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 19 }}>Events</h2>
          <p className="text-sm muted" style={{ marginTop: 4 }}>
            {events.length} event{events.length === 1 ? "" : "s"} on the board, past included.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void load()}>
            <RefreshCw size={14} /> Refresh
          </button>
          <Link className="btn btn-primary btn-sm" href="/events/new">
            <CalendarPlus size={15} /> Create event
          </Link>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="card card-pad">
          <EmptyState
            icon={<CalendarDays size={26} />}
            title="No events yet"
            body="Nothing has been published to the campus events board. Create the first one."
            action={
              <Link className="btn btn-primary" href="/events/new">
                <CalendarPlus size={16} /> Create event
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0, gap: 10 }}>
          {events.map((event) => {
            const status = STATUS_TAG[event.status];
            return (
              <li key={event.id}>
                <Link href={`/events/${event.id}`} className="panel card-pad card-hover" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 11,
                      display: "grid",
                      placeItems: "center",
                      background: "var(--color-brand-50)",
                      color: "var(--color-brand-700)",
                      flex: "none",
                    }}
                  >
                    <CalendarDays size={19} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                      <strong style={{ fontSize: 15 }}>{event.title}</strong>
                      <span className="tag tag-muted">{event.category}</span>
                      <span className={status.className}>{status.label}</span>
                    </span>
                    <span className="row text-sm muted" style={{ gap: 14, marginTop: 6, flexWrap: "wrap" }}>
                      <span>{formatDate(event.start)}</span>
                      <span className="row" style={{ gap: 5 }}>
                        <MapPin size={13} aria-hidden="true" /> {event.venue}
                      </span>
                      <span className="row" style={{ gap: 5 }}>
                        <Users size={13} aria-hidden="true" /> {event.attendeeCount} registered
                      </span>
                      <span>Created {timeAgo(event.createdAt)}</span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
