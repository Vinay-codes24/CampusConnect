"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, CalendarX, Plus, Search as SearchIcon, Ticket, X } from "lucide-react";
import { api } from "@/lib/client";
import { useApp } from "@/components/providers";
import { EmptyState, ErrorState, SkeletonCard } from "@/components/ui";
import type { EventView } from "@/lib/events";
import { EventCard } from "@/components/events/event-card";

const FILTERS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "today", label: "Happening Today" },
  { value: "week", label: "This Week" },
  { value: "technical", label: "Technical" },
  { value: "cultural", label: "Cultural" },
  { value: "sports", label: "Sports" },
  { value: "academic", label: "Academic" },
  { value: "career", label: "Career" },
  { value: "all", label: "All" },
  { value: "mine", label: "My Events" },
] as const;

type FilterValue = (typeof FILTERS)[number]["value"];

const FILTER_VALUES: string[] = FILTERS.map((f) => f.value);

/** Reads the active filter, honouring `/events?tab=my` from the header menu. */
function readFilter(params: URLSearchParams): FilterValue {
  const raw = params.get("filter");
  if (raw && FILTER_VALUES.includes(raw)) return raw as FilterValue;
  if (params.get("tab") === "my") return "mine";
  return "upcoming";
}

/** Builds the canonical query string: `filter` is the source of truth, `tab` is normalised away. */
function buildSearch(current: URLSearchParams, patch: { filter?: FilterValue; q?: string }): string {
  const next = new URLSearchParams(current.toString());
  const filter = patch.filter ?? readFilter(current);
  const q = patch.q !== undefined ? patch.q : (next.get("q") ?? "");

  if (filter === "upcoming") next.delete("filter");
  else next.set("filter", filter);
  next.delete("tab");

  if (q) next.set("q", q);
  else next.delete("q");

  const s = next.toString();
  return s ? `?${s}` : "";
}

function EventsBrowser() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useApp();

  const filter = readFilter(searchParams);
  const q = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(q);
  const pushedQ = useRef(q);
  // Always write the URL from the *latest* params so a pending search never
  // reverts a filter change that happened while the debounce timer was running.
  const paramsRef = useRef(searchParams);
  paramsRef.current = searchParams;
  const [lastBrowse, setLastBrowse] = useState<FilterValue>("upcoming");

  const [events, setEvents] = useState<EventView[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [featured, setFeatured] = useState<EventView[]>([]);

  const tab = filter === "mine" ? "mine" : "browse";
  const canCreate = !!user && user.role !== "student";

  /* Keep the input in sync with the URL (back/forward) without clobbering typing. */
  useEffect(() => {
    if (q !== pushedQ.current) {
      pushedQ.current = q;
      setQuery(q);
    }
  }, [q]);

  /* Debounced search → URL. */
  useEffect(() => {
    if (query.trim() === q) return;
    const id = window.setTimeout(() => {
      pushedQ.current = query.trim();
      router.replace(`/events${buildSearch(paramsRef.current, { q: query.trim() })}`, { scroll: false });
    }, 300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, q]);

  const applyFilter = useCallback(
    (value: FilterValue) => {
      if (value !== "mine") setLastBrowse(value);
      router.replace(`/events${buildSearch(searchParams, { filter: value })}`, { scroll: false });
    },
    [router, searchParams],
  );

  const clearFilters = useCallback(() => {
    setQuery("");
    pushedQ.current = "";
    router.replace("/events", { scroll: false });
  }, [router]);

  /* Fetch the list. */
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("filter", filter);
    if (q) params.set("q", q);

    api<{ events: EventView[]; total: number }>(`/api/events?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (controller.signal.aborted) return;
        setEvents(data.events);
        setTotal(data.total);
      })
      .catch((err: Error) => {
        if (controller.signal.aborted || err.name === "AbortError") return;
        setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [filter, q, attempt]);

  const updateEvent = useCallback((next: EventView) => {
    setEvents((list) => list.map((e) => (e.id === next.id ? next : e)));
    setFeatured((list) => list.map((e) => (e.id === next.id ? next : e)));
  }, []);

  /* Fetch featured events (first 2 upcoming, open events). */
  useEffect(() => {
    api<{ events: EventView[] }>("/api/events?filter=upcoming&limit=2")
      .then((data) => setFeatured(data.events.filter((e) => e.status === "open" || e.status === "registered").slice(0, 2)))
      .catch(() => undefined);
  }, []);

  const showFeatured = tab === "browse" && filter === "upcoming" && !q && featured.length > 0 && !loading && !error;

  return (
    <div className="container stack" style={{ gap: 20 }}>
      {/* ── Header panel ── */}
      <div className="panel card-pad">
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div className="row" style={{ gap: 14, flexWrap: "wrap" }}>
            <div
              aria-hidden="true"
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                display: "grid",
                placeItems: "center",
                color: "#fff",
                background: "linear-gradient(135deg, var(--color-brand-600), var(--color-accent-600))",
                boxShadow: "0 6px 16px -6px var(--color-brand-600)",
                flex: "none",
              }}
            >
              <CalendarDays size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: 26, lineHeight: 1.2 }}>Events</h1>
              <p className="text-sm muted" style={{ marginTop: 2 }}>
                Discover what&rsquo;s happening around your campus.
              </p>
            </div>
          </div>
          <div className="row" style={{ gap: 12, alignItems: "center" }}>
            <span className="text-sm muted" aria-live="polite">
              {loading ? "Loading events…" : `${total} ${total === 1 ? "event" : "events"}`}
            </span>
            {canCreate ? (
              <Link href="/events/new" className="btn btn-primary btn-sm">
                <Plus size={16} aria-hidden="true" /> Create event
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Search & filters panel ── */}
      <div className="panel card-pad" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Browse / My events toggle */}
        <div
          className="row"
          role="group"
          aria-label="Switch between browsing all events and your registrations"
          style={{
            background: "var(--color-ink-100)",
            border: "1px solid var(--color-ink-200)",
            borderRadius: 999,
            padding: 4,
            width: "fit-content",
            gap: 4,
          }}
        >
          <button
            type="button"
            className="chip"
            aria-pressed={tab === "browse"}
            style={{ borderColor: "transparent" }}
            onClick={() => tab !== "browse" && applyFilter(lastBrowse)}
          >
            Browse events
          </button>
          <button
            type="button"
            className="chip"
            aria-pressed={tab === "mine"}
            style={{ borderColor: "transparent" }}
            onClick={() => tab !== "mine" && applyFilter("mine")}
          >
            My Events
          </button>
        </div>

        {/* Search */}
        <form
          className="search-box"
          role="search"
          onSubmit={(e) => e.preventDefault()}
          aria-label="Search events"
          style={{ maxWidth: "100%" }}
        >
          <SearchIcon size={17} className="search-icon" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events by title, venue or organizer…"
            aria-label="Search events"
          />
          {query ? (
            <button
              type="button"
              className="icon-btn"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              style={{ position: "absolute", right: 3, top: 3, width: 34, height: 34 }}
            >
              <X size={16} />
            </button>
          ) : null}
        </form>

        {/* Filter chips */}
        <div className="chip-row" role="group" aria-label="Filter events">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className="chip"
              aria-pressed={filter === f.value}
              onClick={() => applyFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Featured events ── */}
      {showFeatured ? (
        <div className="panel card-pad" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 18 }}>Featured Events</h2>
            <p className="text-sm muted" style={{ marginTop: 2 }}>
              Don&rsquo;t miss these upcoming highlights.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {featured.map((event) => (
              <EventCard key={event.id} event={event} onChange={updateEvent} />
            ))}
          </div>
        </div>
      ) : null}

      {/* ── All events grid ── */}
      <div className="panel card-pad" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <h2 style={{ fontSize: 18 }}>
            {filter === "mine" ? "My Events" : "All Campus Events"}
          </h2>
          {filter !== "upcoming" || q ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
              <X size={14} aria-hidden="true" /> Clear filters
            </button>
          ) : null}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={() => setAttempt((n) => n + 1)} />
        ) : events.length === 0 ? (
          <EmptyState
            icon={<CalendarX size={26} />}
            title={
              filter === "mine"
                ? user
                  ? "No registrations yet"
                  : "Sign in to see your events"
                : "No events match your filters"
            }
            body={
              filter === "mine"
                ? user
                  ? "You have not registered for anything yet. Browse the board and grab a seat."
                  : "Register for an event and it will show up here."
                : "Try a different search term or clear the filters to see everything on the board."
            }
            action={
              filter === "mine" ? (
                <button type="button" className="btn btn-primary" onClick={() => applyFilter(lastBrowse)}>
                  <Ticket size={16} aria-hidden="true" /> Browse events
                </button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={clearFilters}>
                  Clear filters
                </button>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" style={{ alignItems: "stretch" }}>
            {events.map((event) => (
              <EventCard key={event.id} event={event} onChange={updateEvent} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense
      fallback={
        <div className="container stack" aria-hidden="true">
          <div className="skeleton" style={{ height: 34, width: 240 }} />
          <div className="skeleton" style={{ height: 44, maxWidth: 460 }} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      }
    >
      <EventsBrowser />
    </Suspense>
  );
}
