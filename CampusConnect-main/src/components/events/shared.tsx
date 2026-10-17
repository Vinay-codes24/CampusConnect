"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, Ticket } from "lucide-react";
import { api, formatDate, formatTime } from "@/lib/client";
import { useApp } from "@/components/providers";
import type { EventView } from "@/lib/events";

/* -------------------------------------------------------------------------- */
/* Formatting helpers                                                          */
/* -------------------------------------------------------------------------- */

/** Human readable "when" line: same-day events show one date + a time range. */
export function eventWhen(event: { start: string; end: string }): string {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) return `${formatDate(event.start)} · ${formatTime(event.start)} – ${formatTime(event.end)}`;
  return `${formatDate(event.start)} ${formatTime(event.start)} → ${formatDate(event.end)} ${formatTime(event.end)}`;
}

/** ISO → value usable in `<input type="datetime-local">` (local time). */
export function toLocalInput(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* -------------------------------------------------------------------------- */
/* Registration status                                                         */
/* -------------------------------------------------------------------------- */

export const STATUS_META: Record<EventView["status"], { label: string; tagClass: string }> = {
  open: { label: "Open", tagClass: "tag tag-accent" },
  registered: { label: "Registered", tagClass: "tag tag-accent" },
  full: { label: "Seats full", tagClass: "tag tag-warn" },
  closed: { label: "Registration closed", tagClass: "tag tag-danger" },
  past: { label: "Event ended", tagClass: "tag tag-muted" },
};

export const DISABLED_LABEL: Record<Exclude<EventView["status"], "open" | "registered">, string> = {
  full: "Seats full",
  closed: "Registration closed",
  past: "Event has ended",
};

/** Short explanation shown underneath the register control. */
export function statusHint(event: EventView): string | null {
  switch (event.status) {
    case "open":
      return null;
    case "registered":
      return "Your seat is confirmed — withdraw below if your plans change.";
    case "full":
      return event.seats != null
        ? `All ${event.seats} seats are taken.`
        : "All seats for this event are taken.";
    case "closed":
      return event.deadline
        ? `Registration closed on ${formatDate(event.deadline)}.`
        : "Registration for this event is closed.";
    case "past":
      return `This event started on ${formatDate(event.start)}.`;
    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Banner                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Event banner image with a gradient fallback when the event has no banner or
 * the image fails to load.
 */
export function EventBanner({
  src,
  alt,
  className,
  style,
}: {
  src: string | null;
  alt: string;
  className?: string;
  style?: CSSProperties;
}) {
  const [broken, setBroken] = useState<string | null>(null);
  const failed = !src || broken === src;

  if (failed) {
    return (
      <div
        className={className}
        aria-hidden="true"
        style={{
          display: "grid",
          placeItems: "center",
          background: "linear-gradient(135deg, var(--color-brand-600), var(--color-accent-600))",
          color: "rgba(255,255,255,0.85)",
          ...style,
        }}
      >
        <CalendarDays size={34} />
      </div>
    );
  }

  return (
    <img
      className={className}
      src={src as string}
      alt={alt}
      loading="lazy"
      style={style}
      onError={() => setBroken(src as string)}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Seats                                                                       */
/* -------------------------------------------------------------------------- */

export function SeatsBar({ event }: { event: EventView }) {
  if (event.seats == null) {
    return (
      <span className="hint">
        {event.attendeeCount} {event.attendeeCount === 1 ? "person" : "people"} registered · no seat limit
      </span>
    );
  }

  const taken = Math.max(0, event.seats - (event.seatsLeft ?? 0));
  const pct = Math.round((taken / event.seats) * 100);

  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
        <span className="hint">
          <strong style={{ color: event.seatsLeft === 0 ? "#92400e" : "var(--color-ink-700)" }}>
            {event.seatsLeft}
          </strong>{" "}
          of {event.seats} seats left
        </span>
        <span className="hint">{event.attendeeCount} going</span>
      </div>
      <div
        className="progress"
        role="img"
        aria-label={`${taken} of ${event.seats} seats taken`}
      >
        <span
          style={{
            width: `${pct}%`,
            background: event.seatsLeft === 0 ? "#f59e0b" : "var(--color-brand-600)",
          }}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Register / withdraw control                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Register or withdraw for an event. Signed-out visitors are sent to /login.
 * The parent is handed the fresh `EventView` returned by the server so the
 * card/detail page updates in place — never optimistically.
 */
export function RegisterControl({
  event,
  onChange,
  size = "sm",
  showHint = true,
}: {
  event: EventView;
  onChange: (event: EventView) => void;
  size?: "sm" | "md";
  showHint?: boolean;
}) {
  const { user, toast } = useApp();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!user) {
      toast("Sign in to register for this event.", "default");
      router.push("/login");
      return;
    }
    const registering = !event.registered;
    setBusy(true);
    try {
      const data = await api<{ event: EventView }>(`/api/events/${event.id}/register`, {
        method: registering ? "POST" : "DELETE",
      });
      onChange(data.event);
      toast(
        registering
          ? `You are registered for ${event.title}`
          : `Registration withdrawn — ${event.title}`,
        "success",
      );
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  const baseBtn = size === "md" ? "btn" : "btn btn-sm";
  const hint = showHint ? statusHint(event) : null;

  let control: React.ReactNode;
  if (event.status === "open") {
    control = (
      <button type="button" className={`${baseBtn} btn-primary`} onClick={toggle} disabled={busy}>
        {busy ? "Working…" : (
          <>
            <Ticket size={15} aria-hidden="true" /> Register
          </>
        )}
      </button>
    );
  } else if (event.status === "registered") {
    control = (
      <>
        <span className="tag tag-accent">
          <Check size={12} aria-hidden="true" /> Registered ✓
        </span>
        <button type="button" className={`${baseBtn} btn-ghost`} onClick={toggle} disabled={busy}>
          {busy ? "Withdrawing…" : "Withdraw"}
        </button>
      </>
    );
  } else {
    control = (
      <button type="button" className={`${baseBtn} btn-ghost`} disabled>
        {DISABLED_LABEL[event.status]}
      </button>
    );
  }

  return (
    <div className="stack" style={{ gap: 5 }}>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        {control}
      </div>
      {hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}
