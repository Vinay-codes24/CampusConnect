"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Send, Upload, X } from "lucide-react";
import { api } from "@/lib/client";
import { useApp } from "@/components/providers";
import { EVENT_CATEGORIES, type EventCategory } from "@/lib/types";
import { EventBanner, toLocalInput } from "./shared";

const SAMPLE_BANNERS = [
  { url: "/samples/hackfest.svg", label: "Hackathon" },
  { url: "/samples/workshop.svg", label: "Workshop" },
  { url: "/samples/placement.svg", label: "Placements" },
  { url: "/samples/spandan.svg", label: "Festival" },
  { url: "/samples/cricket.svg", label: "Sports" },
  { url: "/samples/lecture.svg", label: "Lecture" },
  { url: "/samples/robotics.svg", label: "Robotics" },
  { url: "/samples/alumni.svg", label: "Alumni" },
  { url: "/samples/blood.svg", label: "Club activity" },
];

type FormState = {
  title: string;
  description: string;
  category: EventCategory | "";
  start: string;
  end: string;
  venue: string;
  organizer: string;
  deadline: string;
  seats: string;
  eligibility: string;
  instructions: string;
  registrationUrl: string;
  banner: string;
};

type Errors = Partial<Record<keyof FormState, string>>;

function initialForm(): FormState {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start.getTime() + 3 * 3600_000);
  return {
    title: "",
    description: "",
    category: "",
    start: toLocalInput(start),
    end: toLocalInput(end),
    venue: "",
    organizer: "",
    deadline: "",
    seats: "",
    eligibility: "",
    instructions: "",
    registrationUrl: "",
    banner: "",
  };
}

function validate(f: FormState): Errors {
  const e: Errors = {};

  const title = f.title.trim();
  if (!title) e.title = "Event name is required.";
  else if (title.length < 4) e.title = "Event name must be at least 4 characters.";
  else if (title.length > 140) e.title = "Event name must be 140 characters or fewer.";

  const description = f.description.trim();
  if (!description) e.description = "Description is required.";
  else if (description.length < 20) e.description = "Description must be at least 20 characters.";
  else if (description.length > 4000) e.description = "Description must be 4000 characters or fewer.";

  if (!f.category || !EVENT_CATEGORIES.includes(f.category as EventCategory)) {
    e.category = "Please choose an event category.";
  }

  if (!f.start) e.start = "Start time is required.";
  else if (Number.isNaN(new Date(f.start).getTime())) e.start = "Start time must be a valid date.";

  if (!f.end) e.end = "End time is required.";
  else if (Number.isNaN(new Date(f.end).getTime())) e.end = "End time must be a valid date.";
  else if (!e.start && new Date(f.end).getTime() <= new Date(f.start).getTime()) {
    e.end = "The end time must be after the start time.";
  }

  const venue = f.venue.trim();
  if (!venue) e.venue = "Venue is required.";
  else if (venue.length < 2) e.venue = "Venue must be at least 2 characters.";
  else if (venue.length > 120) e.venue = "Venue must be 120 characters or fewer.";

  const organizer = f.organizer.trim();
  if (!organizer) e.organizer = "Organizer is required.";
  else if (organizer.length < 2) e.organizer = "Organizer must be at least 2 characters.";
  else if (organizer.length > 120) e.organizer = "Organizer must be 120 characters or fewer.";

  if (f.deadline) {
    const d = new Date(f.deadline);
    if (Number.isNaN(d.getTime())) e.deadline = "Registration deadline must be a valid date.";
    else if (!e.start && d.getTime() > new Date(f.start).getTime()) {
      e.deadline = "The deadline must be before the event starts.";
    }
  }

  if (f.seats) {
    const n = Number(f.seats);
    if (!Number.isInteger(n) || n < 1 || n > 5000) {
      e.seats = "Seats must be a whole number between 1 and 5000.";
    }
  }

  if (f.eligibility.length > 600) e.eligibility = "Eligibility must be 600 characters or fewer.";
  if (f.instructions.length > 1200) e.instructions = "Instructions must be 1200 characters or fewer.";

  const url = f.registrationUrl.trim();
  if (url.length > 300) e.registrationUrl = "The link must be 300 characters or fewer.";
  else if (url && !/^https?:\/\/\S+$/i.test(url)) e.registrationUrl = "Enter a full link starting with https://";

  return e;
}

function describedBy(id: string, hasHint: boolean, error?: string): string | undefined {
  if (error) return `${id}-err`;
  return hasHint ? `${id}-hint` : undefined;
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      {children}
      {error ? (
        <span className="hint" id={`${id}-err`} style={{ color: "#b91c1c" }}>
          {error}
        </span>
      ) : hint ? (
        <span className="hint" id={`${id}-hint`}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export function EventForm() {
  const router = useRouter();
  const { toast } = useApp();

  const [f, setF] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<FormState>) => {
    setF((prev) => ({ ...prev, ...patch }));
    // Clear the inline error for whatever the user just corrected.
    setErrors((prev) => {
      const next = { ...prev };
      (Object.keys(patch) as Array<keyof FormState>).forEach((k) => delete next[k]);
      return next;
    });
  };

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBannerError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", "image");
      const data = await api<{ url: string; name: string; size: number }>("/api/upload", {
        method: "POST",
        body: form,
      });
      set({ banner: data.url });
      toast("Banner uploaded", "success");
    } catch (err) {
      const msg = (err as Error).message;
      setBannerError(msg);
      toast(msg, "error");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    const found = validate(f);
    setErrors(found);
    const keys = Object.keys(found) as Array<keyof FormState>;
    if (keys.length > 0) {
      document.getElementById(`ev-${keys[0]}`)?.focus();
      toast("Please fix the highlighted fields.", "error");
      return;
    }

    const payload = {
      title: f.title.trim(),
      description: f.description.trim(),
      category: f.category,
      start: new Date(f.start).toISOString(),
      end: new Date(f.end).toISOString(),
      venue: f.venue.trim(),
      organizer: f.organizer.trim(),
      deadline: f.deadline ? new Date(f.deadline).toISOString() : undefined,
      seats: f.seats ? Number(f.seats) : undefined,
      eligibility: f.eligibility.trim(),
      instructions: f.instructions.trim(),
      registrationUrl: f.registrationUrl.trim(),
      banner: f.banner,
    };

    setSubmitting(true);
    try {
      const data = await api<{ event: { id: string } }>("/api/events", { method: "POST", json: payload });
      toast(`“${payload.title}” is now live on the events board`, "success");
      router.push(`/events/${data.event.id}`);
      router.refresh();
    } catch (err) {
      const msg = (err as Error).message;
      setServerError(msg);
      toast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="stack" onSubmit={onSubmit} noValidate>
      {serverError ? (
        <div
          role="alert"
          className="card card-pad"
          style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#b91c1c" }}
        >
          <strong style={{ display: "block", marginBottom: 4 }}>Could not publish the event</strong>
          <span className="text-sm">{serverError}</span>
        </div>
      ) : null}

      {/* ---------------------------------------------------------------- */}
      <section className="card card-pad stack" aria-labelledby="ef-details">
        <div>
          <h2 id="ef-details" style={{ fontSize: 17 }}>
            Event details
          </h2>
          <p className="text-sm muted">The essentials attendees will read first.</p>
        </div>

        <Field id="ev-title" label="Event name" hint="At least 4 characters, e.g. “HackFest 2026 — 36 Hour Hackathon”." error={errors.title}>
          <input
            id="ev-title"
            className="input"
            type="text"
            value={f.title}
            maxLength={140}
            placeholder="HackFest 2026 — 36 Hour National Hackathon"
            aria-invalid={errors.title ? "true" : undefined}
            aria-describedby={describedBy("ev-title", true, errors.title)}
            onChange={(e) => set({ title: e.target.value })}
          />
        </Field>

        <Field
          id="ev-description"
          label="Description"
          hint="What happens, who it is for, what to expect. At least 20 characters."
          error={errors.description}
        >
          <textarea
            id="ev-description"
            className="textarea"
            value={f.description}
            maxLength={4000}
            placeholder="Describe the event, the format and what attendees will take away…"
            aria-invalid={errors.description ? "true" : undefined}
            aria-describedby={describedBy("ev-description", true, errors.description)}
            onChange={(e) => set({ description: e.target.value })}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="ev-category" label="Category" error={errors.category}>
            <select
              id="ev-category"
              className="select"
              value={f.category}
              aria-invalid={errors.category ? "true" : undefined}
              aria-describedby={describedBy("ev-category", false, errors.category)}
              onChange={(e) => set({ category: e.target.value as EventCategory | "" })}
            >
              <option value="">Choose a category…</option>
              {EVENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

          <Field id="ev-venue" label="Venue" hint="Building, hall or ground." error={errors.venue}>
            <input
              id="ev-venue"
              className="input"
              type="text"
              value={f.venue}
              maxLength={120}
              placeholder="Lab 204, CSE Block"
              aria-invalid={errors.venue ? "true" : undefined}
              aria-describedby={describedBy("ev-venue", true, errors.venue)}
              onChange={(e) => set({ venue: e.target.value })}
            />
          </Field>
        </div>

        <Field id="ev-organizer" label="Organizer" hint="Club, department or cell running the event." error={errors.organizer}>
          <input
            id="ev-organizer"
            className="input"
            type="text"
            value={f.organizer}
            maxLength={120}
            placeholder="Open Source Club"
            aria-invalid={errors.organizer ? "true" : undefined}
            aria-describedby={describedBy("ev-organizer", true, errors.organizer)}
            onChange={(e) => set({ organizer: e.target.value })}
          />
        </Field>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="card card-pad stack" aria-labelledby="ef-when">
        <div>
          <h2 id="ef-when" style={{ fontSize: 17 }}>
            Date, time & registration
          </h2>
          <p className="text-sm muted">Times use your device timezone.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="ev-start" label="Starts" error={errors.start}>
            <input
              id="ev-start"
              className="input"
              type="datetime-local"
              value={f.start}
              aria-invalid={errors.start ? "true" : undefined}
              aria-describedby={describedBy("ev-start", false, errors.start)}
              onChange={(e) => set({ start: e.target.value })}
            />
          </Field>

          <Field id="ev-end" label="Ends" error={errors.end}>
            <input
              id="ev-end"
              className="input"
              type="datetime-local"
              value={f.end}
              aria-invalid={errors.end ? "true" : undefined}
              aria-describedby={describedBy("ev-end", false, errors.end)}
              onChange={(e) => set({ end: e.target.value })}
            />
          </Field>

          <Field
            id="ev-deadline"
            label="Registration deadline (optional)"
            hint="After this time registration closes."
            error={errors.deadline}
          >
            <input
              id="ev-deadline"
              className="input"
              type="datetime-local"
              value={f.deadline}
              aria-invalid={errors.deadline ? "true" : undefined}
              aria-describedby={describedBy("ev-deadline", true, errors.deadline)}
              onChange={(e) => set({ deadline: e.target.value })}
            />
          </Field>

          <Field
            id="ev-seats"
            label="Seats (optional)"
            hint="Leave empty for unlimited seating."
            error={errors.seats}
          >
            <input
              id="ev-seats"
              className="input"
              type="number"
              min={1}
              max={5000}
              inputMode="numeric"
              value={f.seats}
              placeholder="120"
              aria-invalid={errors.seats ? "true" : undefined}
              aria-describedby={describedBy("ev-seats", true, errors.seats)}
              onChange={(e) => set({ seats: e.target.value })}
            />
          </Field>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="card card-pad stack" aria-labelledby="ef-banner">
        <div>
          <h2 id="ef-banner" style={{ fontSize: 17 }}>
            Banner (optional)
          </h2>
          <p className="text-sm muted">Pick a bundled artwork or upload your own image (8 MB max).</p>
        </div>

        <div className="chip-row" role="group" aria-label="Choose a sample banner">
          {SAMPLE_BANNERS.map((s) => (
            <button
              key={s.url}
              type="button"
              className="chip"
              aria-pressed={f.banner === s.url}
              onClick={() => set({ banner: s.url })}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  backgroundImage: `url(${s.url})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  display: "inline-block",
                  border: "1px solid var(--color-ink-200)",
                }}
              />
              {s.label}
            </button>
          ))}
          <button
            type="button"
            className="chip"
            aria-pressed={f.banner === ""}
            onClick={() => set({ banner: "" })}
          >
            No banner
          </button>
        </div>

        <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
            style={{ display: "none" }}
            onChange={onFileChange}
            tabIndex={-1}
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            <Upload size={15} aria-hidden="true" />
            {uploading ? "Uploading…" : "Upload image"}
          </button>
          {f.banner ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => set({ banner: "" })}>
              <X size={15} aria-hidden="true" /> Remove banner
            </button>
          ) : null}
        </div>

        {bannerError ? (
          <span className="hint" role="alert" style={{ color: "#b91c1c" }}>
            {bannerError}
          </span>
        ) : null}

        {f.banner ? (
          <EventBanner
            src={f.banner}
            alt="Banner preview"
            style={{
              width: "100%",
              height: 170,
              objectFit: "cover",
              borderRadius: 12,
              border: "1px solid var(--color-ink-200)",
            }}
          />
        ) : (
          <p className="hint">No banner selected — a gradient placeholder will be used.</p>
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="card card-pad stack" aria-labelledby="ef-extra">
        <div>
          <h2 id="ef-extra" style={{ fontSize: 17 }}>
            Good to know
          </h2>
          <p className="text-sm muted">Everything attendees ask before they register.</p>
        </div>

        <Field
          id="ev-eligibility"
          label="Eligibility (optional)"
          hint="Who can attend, e.g. “3rd and 4th year students only”."
          error={errors.eligibility}
        >
          <input
            id="ev-eligibility"
            className="input"
            type="text"
            value={f.eligibility}
            maxLength={600}
            placeholder="Open to all years and branches."
            aria-invalid={errors.eligibility ? "true" : undefined}
            aria-describedby={describedBy("ev-eligibility", true, errors.eligibility)}
            onChange={(e) => set({ eligibility: e.target.value })}
          />
        </Field>

        <Field
          id="ev-instructions"
          label="Instructions (optional)"
          hint="What to carry, reporting time, dress code…"
          error={errors.instructions}
        >
          <textarea
            id="ev-instructions"
            className="textarea"
            style={{ minHeight: 90 }}
            value={f.instructions}
            maxLength={1200}
            placeholder="Carry your college ID card and laptop."
            aria-invalid={errors.instructions ? "true" : undefined}
            aria-describedby={describedBy("ev-instructions", true, errors.instructions)}
            onChange={(e) => set({ instructions: e.target.value })}
          />
        </Field>

        <Field
          id="ev-registrationUrl"
          label="External registration link (optional)"
          hint="If people register elsewhere, link to it."
          error={errors.registrationUrl}
        >
          <input
            id="ev-registrationUrl"
            className="input"
            type="url"
            inputMode="url"
            value={f.registrationUrl}
            maxLength={300}
            placeholder="https://example.edu/hackfest/register"
            aria-invalid={errors.registrationUrl ? "true" : undefined}
            aria-describedby={describedBy("ev-registrationUrl", true, errors.registrationUrl)}
            onChange={(e) => set({ registrationUrl: e.target.value })}
          />
        </Field>
      </section>

      {/* ---------------------------------------------------------------- */}
      <div className="row" style={{ justifyContent: "flex-end", flexWrap: "wrap", gap: 10 }}>
        <Link href="/events" className="btn btn-ghost">
          Cancel
        </Link>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? (
            "Publishing…"
          ) : (
            <>
              <Send size={16} aria-hidden="true" /> Publish event
            </>
          )}
        </button>
      </div>
    </form>
  );
}
