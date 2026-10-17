"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CalendarX,
  ExternalLink,
  Link2,
  MapPin,
  Megaphone,
  Pencil,
  Share2,
  Trash2,
  Users,
} from "lucide-react";
import { api, formatDate } from "@/lib/client";
import { useApp } from "@/components/providers";
import { Avatar, EmptyState, ErrorState, Modal, Spinner } from "@/components/ui";
import type { EventView } from "@/lib/events";
import {
  EventBanner,
  RegisterControl,
  SeatsBar,
  STATUS_META,
  eventWhen,
  toLocalInput,
} from "@/components/events/shared";

/* -------------------------------------------------------------------------- */

export default function EventDetailPage() {
  const params = useParams<Record<string, string | string[]>>() ?? {};
  const id = typeof params.id === "string" ? params.id : "";

  if (!id) {
    return (
      <div className="container">
        <ErrorState message="This event link is incomplete." />
      </div>
    );
  }
  return <EventDetail id={id} />;
}

/* -------------------------------------------------------------------------- */

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="row" style={{ alignItems: "flex-start", gap: 10 }}>
      <span aria-hidden="true" style={{ color: "var(--color-brand-600)", marginTop: 2, flex: "none" }}>
        {icon}
      </span>
      <div style={{ minWidth: 0 }}>
        <div className="hint">{label}</div>
        <div style={{ fontSize: 14.5, fontWeight: 600 }}>{value}</div>
      </div>
    </div>
  );
}

type EditDraft = {
  title: string;
  description: string;
  venue: string;
  start: string;
  end: string;
  published: boolean;
};

function EventDetail({ id }: { id: string }) {
  const router = useRouter();
  const { user, toast } = useApp();

  const [event, setEvent] = useState<EventView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof EditDraft, string>>>({});
  const [saving, setSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    api<{ event: EventView }>(`/api/events/${id}`)
      .then((data) => setEvent(data.event))
      .catch((err: Error) => {
        if (/does not exist/i.test(err.message)) setNotFound(true);
        else setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const canEdit = !!user && !!event && (user.id === event.createdBy || user.role === "admin");

  /* ------------------------------ share -------------------------------- */

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("Event link copied to clipboard", "success");
    } catch {
      toast("Could not copy the link — your browser blocked clipboard access.", "error");
    }
  }

  async function handleShare() {
    if (!event) return;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: event.title,
          text: `${event.title} · ${eventWhen(event)} · ${event.venue}`,
          url: window.location.href,
        });
        toast("Event shared", "success");
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        // otherwise fall back to copying the link
      }
    }
    await copyLink();
  }

  /* ------------------------------- edit --------------------------------- */

  function openEdit() {
    if (!event) return;
    setEditErrors({});
    setDraft({
      title: event.title,
      description: event.description,
      venue: event.venue,
      start: toLocalInput(event.start),
      end: toLocalInput(event.end),
      published: event.published,
    });
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!draft || !event) return;
    const errs: Partial<Record<keyof EditDraft, string>> = {};
    if (draft.title.trim().length < 4) errs.title = "Event name must be at least 4 characters.";
    if (draft.description.trim().length < 20) errs.description = "Description must be at least 20 characters.";
    if (!draft.venue.trim()) errs.venue = "Venue is required.";
    if (new Date(draft.end).getTime() <= new Date(draft.start).getTime()) {
      errs.end = "The end time must be after the start time.";
    }
    setEditErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const data = await api<{ event: EventView }>(`/api/events/${id}`, {
        method: "PATCH",
        json: {
          title: draft.title.trim(),
          description: draft.description.trim(),
          venue: draft.venue.trim(),
          start: new Date(draft.start).toISOString(),
          end: new Date(draft.end).toISOString(),
          published: draft.published,
        },
      });
      setEvent(data.event);
      setEditOpen(false);
      toast("Event updated", "success");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await api(`/api/events/${id}`, { method: "DELETE" });
      toast("Event deleted", "success");
      router.push("/events");
      router.refresh();
    } catch (err) {
      toast((err as Error).message, "error");
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  /* ------------------------------ render -------------------------------- */

  if (loading) {
    return (
      <div className="container stack" aria-hidden="true">
        <div className="skeleton" style={{ height: 22, width: 150 }} />
        <div className="skeleton" style={{ height: 240, borderRadius: 18 }} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="panel card-pad stack" style={{ gridColumn: "span 2" }}>
            <div className="skeleton" style={{ height: 20, width: "40%" }} />
            <div className="skeleton" style={{ height: 14, width: "100%" }} />
            <div className="skeleton" style={{ height: 14, width: "92%" }} />
            <div className="skeleton" style={{ height: 14, width: "70%" }} />
          </div>
          <div className="panel card-pad stack">
            <div className="skeleton" style={{ height: 18, width: "60%" }} />
            <div className="skeleton" style={{ height: 38, width: "100%" }} />
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="container">
        <EmptyState
          icon={<CalendarX size={26} />}
          title="Event not found"
          body="This event may have been removed by its organizer, or the link is wrong."
          action={
            <Link href="/events" className="btn btn-primary">
              <ArrowLeft size={16} aria-hidden="true" /> Browse events
            </Link>
          }
        />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="container">
        <ErrorState message={error ?? "We could not load this event."} onRetry={load} />
      </div>
    );
  }

  const status = STATUS_META[event.status];

  return (
    <div className="container stack">
      <Link href="/events" className="link row" style={{ width: "fit-content", fontSize: 14 }}>
        <ArrowLeft size={16} aria-hidden="true" /> All events
      </Link>

      {/* ------------------------------ hero ------------------------------- */}
      <div className="panel" style={{ position: "relative", overflow: "hidden" }}>
        <EventBanner
          src={event.banner}
          alt=""
          style={{ width: "100%", height: "clamp(200px, 30vw, 340px)", objectFit: "cover", display: "block" }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(17,24,39,0.92) 0%, rgba(17,24,39,0.55) 45%, rgba(17,24,39,0.12) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "18px 20px",
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
            <span
              className="tag"
              style={{ background: "rgba(255,255,255,0.16)", color: "#fff", borderColor: "rgba(255,255,255,0.35)" }}
            >
              {event.category}
            </span>
            <span className="tag" style={{ background: "rgba(255,255,255,0.16)", color: "#fff", borderColor: "rgba(255,255,255,0.35)" }}>
              {event.group}
            </span>
            {!event.published ? (
              <span className="tag tag-warn">Unpublished draft</span>
            ) : null}
          </div>
          <h1 style={{ fontSize: "clamp(22px, 4vw, 32px)", color: "#fff" }}>{event.title}</h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.9)", margin: 0 }}>
            {eventWhen(event)} · {event.venue}
          </p>
        </div>
      </div>

      {/* --------------------------- action bar ---------------------------- */}
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <span className={status.tagClass}>{status.label}</span>
        <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleShare}>
            <Share2 size={15} aria-hidden="true" /> Share
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={copyLink}>
            <Link2 size={15} aria-hidden="true" /> Copy link
          </button>
          {canEdit ? (
            <button type="button" className="btn btn-soft btn-sm" onClick={openEdit}>
              <Pencil size={15} aria-hidden="true" /> Edit
            </button>
          ) : null}
          {canEdit ? (
            <button type="button" className="btn btn-danger btn-sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 size={15} aria-hidden="true" /> Delete
            </button>
          ) : null}
        </div>
      </div>

      {/* ------------------------------ content ---------------------------- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3" style={{ alignItems: "start" }}>
        <div className="stack lg:col-span-2">
          <section className="card card-pad stack" aria-labelledby="ev-about">
            <h2 id="ev-about" style={{ fontSize: 17 }}>
              About this event
            </h2>
            <p style={{ whiteSpace: "pre-line", margin: 0, fontSize: 15, lineHeight: 1.7 }}>{event.description}</p>
          </section>

          {event.eligibility ? (
            <section className="card card-pad stack" aria-labelledby="ev-eligibility">
              <h2 id="ev-eligibility" style={{ fontSize: 17 }}>
                Eligibility
              </h2>
              <p style={{ whiteSpace: "pre-line", margin: 0, fontSize: 14.5 }}>{event.eligibility}</p>
            </section>
          ) : null}

          {event.instructions ? (
            <section className="card card-pad stack" aria-labelledby="ev-instructions">
              <h2 id="ev-instructions" style={{ fontSize: 17 }}>
                Instructions
              </h2>
              <p style={{ whiteSpace: "pre-line", margin: 0, fontSize: 14.5 }}>{event.instructions}</p>
            </section>
          ) : null}

          {event.related.length > 0 ? (
            <section className="card card-pad stack" aria-labelledby="ev-related">
              <h2 id="ev-related" className="row" style={{ fontSize: 17, gap: 8 }}>
                <Megaphone size={17} aria-hidden="true" style={{ color: "var(--color-accent-600)" }} />
                Related announcements
              </h2>
              <ul className="stack" style={{ gap: 8, listStyle: "none", margin: 0, padding: 0 }}>
                {event.related.map((line) => (
                  <li
                    key={line}
                    className="row"
                    style={{
                      alignItems: "flex-start",
                      gap: 10,
                      background: "var(--color-ink-100)",
                      borderRadius: 12,
                      padding: "10px 12px",
                    }}
                  >
                    <span aria-hidden="true" style={{ color: "var(--color-accent-600)", marginTop: 2, flex: "none" }}>
                      <Megaphone size={15} />
                    </span>
                    <span className="text-sm">{line}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        {/* ------------------------------ aside ----------------------------- */}
        <aside className="stack">
          <section className="card card-pad stack" aria-labelledby="ev-registration">
            <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
              <h2 id="ev-registration" style={{ fontSize: 16 }}>
                Registration
              </h2>
              <span className={status.tagClass}>{status.label}</span>
            </div>

            <SeatsBar event={event} />

            <RegisterControl event={event} onChange={setEvent} size="md" />

            <div className="divider" />

            <div className="stack" style={{ gap: 8 }}>
              <div className="row text-sm" style={{ gap: 8, alignItems: "flex-start" }}>
                <Calendar size={15} aria-hidden="true" style={{ flex: "none", marginTop: 2, color: "var(--color-ink-500)" }} />
                <span>
                  {event.deadline ? (
                    <>
                      Deadline <strong>{formatDate(event.deadline)}</strong>
                    </>
                  ) : (
                    "No fixed deadline — register any time before the event starts"
                  )}
                </span>
              </div>
              <div className="row text-sm" style={{ gap: 8, alignItems: "flex-start" }}>
                <Users size={15} aria-hidden="true" style={{ flex: "none", marginTop: 2, color: "var(--color-ink-500)" }} />
                <span>
                  <strong>{event.attendeeCount}</strong> {event.attendeeCount === 1 ? "attendee" : "attendees"} so far
                </span>
              </div>
            </div>

            {event.registrationUrl ? (
              <a
                className="btn btn-soft btn-sm"
                href={event.registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ width: "100%" }}
              >
                <ExternalLink size={15} aria-hidden="true" /> Open external registration
              </a>
            ) : null}
          </section>

          <section className="card card-pad stack" aria-labelledby="ev-details">
            <h2 id="ev-details" style={{ fontSize: 16 }}>
              Event details
            </h2>
            <div className="stack" style={{ gap: 14 }}>
              <DetailRow icon={<Calendar size={17} />} label="Date & time" value={eventWhen(event)} />
              <DetailRow icon={<MapPin size={17} />} label="Venue" value={event.venue} />
              <DetailRow icon={<Users size={17} />} label="Organizer" value={event.organizer} />
            </div>

            <div className="divider" />

            <div className="row" style={{ gap: 10 }}>
              <Avatar name={event.organizer} size={38} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {event.organizer}
                </div>
                <div className="text-sm muted">
                  {event.group} · posted {formatDate(event.createdAt)}
                </div>
              </div>
            </div>

            {!event.published ? (
              <span className="tag tag-warn" style={{ alignSelf: "flex-start" }}>
                Hidden from the public board
              </span>
            ) : null}
          </section>
        </aside>
      </div>

      {/* ------------------------------- edit ------------------------------- */}
      <Modal
        open={editOpen}
        onClose={() => !saving && setEditOpen(false)}
        title="Edit event"
        size="lg"
        labelledBy="edit-event-title"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={saveEdit} disabled={saving || !draft}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </>
        }
      >
        {draft ? (
          <div className="stack">
            <div className="field">
              <label className="label" htmlFor="edit-title">
                Event name
              </label>
              <input
                id="edit-title"
                className="input"
                value={draft.title}
                maxLength={140}
                aria-invalid={editErrors.title ? "true" : undefined}
                aria-describedby={editErrors.title ? "edit-title-err" : undefined}
                onChange={(e) => {
                  setDraft({ ...draft, title: e.target.value });
                  setEditErrors((p) => ({ ...p, title: undefined }));
                }}
              />
              {editErrors.title ? (
                <span className="hint" id="edit-title-err" style={{ color: "#b91c1c" }}>
                  {editErrors.title}
                </span>
              ) : null}
            </div>

            <div className="field">
              <label className="label" htmlFor="edit-description">
                Description
              </label>
              <textarea
                id="edit-description"
                className="textarea"
                value={draft.description}
                maxLength={4000}
                aria-invalid={editErrors.description ? "true" : undefined}
                aria-describedby={editErrors.description ? "edit-description-err" : undefined}
                onChange={(e) => {
                  setDraft({ ...draft, description: e.target.value });
                  setEditErrors((p) => ({ ...p, description: undefined }));
                }}
              />
              {editErrors.description ? (
                <span className="hint" id="edit-description-err" style={{ color: "#b91c1c" }}>
                  {editErrors.description}
                </span>
              ) : null}
            </div>

            <div className="field">
              <label className="label" htmlFor="edit-venue">
                Venue
              </label>
              <input
                id="edit-venue"
                className="input"
                value={draft.venue}
                maxLength={120}
                aria-invalid={editErrors.venue ? "true" : undefined}
                aria-describedby={editErrors.venue ? "edit-venue-err" : undefined}
                onChange={(e) => {
                  setDraft({ ...draft, venue: e.target.value });
                  setEditErrors((p) => ({ ...p, venue: undefined }));
                }}
              />
              {editErrors.venue ? (
                <span className="hint" id="edit-venue-err" style={{ color: "#b91c1c" }}>
                  {editErrors.venue}
                </span>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="field">
                <label className="label" htmlFor="edit-start">
                  Starts
                </label>
                <input
                  id="edit-start"
                  className="input"
                  type="datetime-local"
                  value={draft.start}
                  onChange={(e) => {
                    setDraft({ ...draft, start: e.target.value });
                    setEditErrors((p) => ({ ...p, end: undefined }));
                  }}
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="edit-end">
                  Ends
                </label>
                <input
                  id="edit-end"
                  className="input"
                  type="datetime-local"
                  value={draft.end}
                  aria-invalid={editErrors.end ? "true" : undefined}
                  aria-describedby={editErrors.end ? "edit-end-err" : undefined}
                  onChange={(e) => {
                    setDraft({ ...draft, end: e.target.value });
                    setEditErrors((p) => ({ ...p, end: undefined }));
                  }}
                />
                {editErrors.end ? (
                  <span className="hint" id="edit-end-err" style={{ color: "#b91c1c" }}>
                    {editErrors.end}
                  </span>
                ) : null}
              </div>
            </div>

            <label className="row" style={{ gap: 8, fontSize: 14, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={draft.published}
                onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: "var(--color-brand-600)" }}
              />
              Published on the public events board
            </label>
          </div>
        ) : (
          <Spinner label="Loading…" />
        )}
      </Modal>

      {/* ------------------------------ delete ------------------------------ */}
      <Modal
        open={deleteOpen}
        onClose={() => !deleting && setDeleteOpen(false)}
        title="Delete this event?"
        size="sm"
        labelledBy="delete-event-title"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </button>
            <button type="button" className="btn btn-danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete event"}
            </button>
          </>
        }
      >
        <div className="stack">
          <p style={{ margin: 0 }}>
            <strong>{event.title}</strong> will be removed from the board together with its{" "}
            {event.attendeeCount} {event.attendeeCount === 1 ? "registration" : "registrations"}. This cannot be undone.
          </p>
          <p className="text-sm muted" style={{ margin: 0 }}>
            Cancel to keep the event exactly as it is.
          </p>
        </div>
      </Modal>

    </div>
  );
}
