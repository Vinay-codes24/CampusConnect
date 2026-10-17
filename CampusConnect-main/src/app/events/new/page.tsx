"use client";

import Link from "next/link";
import { ArrowLeft, CalendarPlus, LogIn, ShieldAlert } from "lucide-react";
import { useApp } from "@/components/providers";
import { EmptyState } from "@/components/ui";
import { EventForm } from "@/components/events/event-form";

export default function NewEventPage() {
  const { user } = useApp();

  /* Signed out → friendly sign-in prompt (never a broken form). */
  if (!user) {
    return (
      <div className="container">
        <EmptyState
          icon={<LogIn size={26} />}
          title="Sign in to publish an event"
          body="Events are published from an account so attendees know who to contact. Faculty, club organizers and admins can create them."
          action={
            <div className="row" style={{ justifyContent: "center", flexWrap: "wrap", gap: 10 }}>
              <Link href="/login" className="btn btn-primary">
                Sign in
              </Link>
              <Link href="/events" className="btn btn-ghost">
                Browse events
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  /* Students get a clear 403 explanation with a way back. */
  if (user.role === "student") {
    return (
      <div className="container">
        <EmptyState
          icon={<ShieldAlert size={26} />}
          title="You don’t have permission to publish events"
          body="Only faculty, club organizers and admins can publish events. Ask your club organizer or a faculty member to post it — or browse what is already on the board."
          action={
            <div className="row" style={{ justifyContent: "center", flexWrap: "wrap", gap: 10 }}>
              <Link href="/events" className="btn btn-primary">
                <ArrowLeft size={16} aria-hidden="true" /> Back to events
              </Link>
              <Link href="/events?tab=my" className="btn btn-ghost">
                My events
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="container stack">
      <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
        <Link href="/events" className="btn btn-ghost btn-sm">
          <ArrowLeft size={15} aria-hidden="true" /> All events
        </Link>
        <span className="tag tag-muted">Signed in as {user.role}</span>
      </div>

      <div className="row" style={{ flexWrap: "wrap", gap: 12, justifyContent: "space-between" }}>
        <div>
          <h1 className="row" style={{ fontSize: 26, gap: 10 }}>
            <span
              aria-hidden="true"
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
                background: "var(--color-brand-50)",
                color: "var(--color-brand-600)",
              }}
            >
              <CalendarPlus size={19} />
            </span>
            Create an event
          </h1>
          <p className="text-sm muted">
            It appears on the events board immediately and fans out a reminder notification.
          </p>
        </div>
      </div>

      <EventForm />
    </div>
  );
}
