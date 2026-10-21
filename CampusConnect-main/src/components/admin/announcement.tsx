"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Megaphone, Star } from "lucide-react";
import { api } from "@/lib/client";
import { useApp } from "@/components/providers";
import { FormError, PendingButton, TextAreaField, TextField } from "@/components/account/fields";

type CreateResult = { ok: boolean; summary: string; link: string };

/** Publish a campus-wide announcement: POST /api/admin/records {kind:'announcement'}. */
export function AnnouncementTab() {
  const { toast } = useApp();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [important, setImportant] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; message?: string }>({});
  const [serverError, setServerError] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<CreateResult | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const found: typeof errors = {};
    if (title.trim().length < 4) found.title = "Give the announcement a title of at least 4 characters.";
    if (message.trim().length < 10) found.message = "The message needs at least 10 characters.";
    setErrors(found);
    if (found.title || found.message) return;

    setPending(true);
    setServerError("");
    try {
      const res = await api<CreateResult>("/api/admin/records", {
        method: "POST",
        json: { kind: "announcement", data: { title: title.trim(), body: message.trim(), important } },
      });
      setResult(res);
      toast(res.summary, "success");
      setTitle("");
      setMessage("");
      setImportant(false);
    } catch (e) {
      const message = (e as Error).message;
      setServerError(message);
      toast(message, "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="stack" aria-label="Publish announcement">
      <div>
        <h2 style={{ fontSize: 19 }}>Publish announcement</h2>
        <p className="text-sm muted" style={{ marginTop: 4 }}>
          Sends a notification to every student, faculty member and organizer on CampusConnect.
        </p>
      </div>

      {result ? (
        <div
          className="row"
          style={{ gap: 12, padding: "14px 16px", borderRadius: 14, background: "var(--color-accent-50)", border: "1px solid var(--color-accent-100)", flexWrap: "wrap" }}
        >
          <CheckCircle2 size={20} aria-hidden="true" style={{ color: "var(--color-accent-700)", flex: "none" }} />
          <span style={{ flex: 1, minWidth: 200 }}>
            <strong style={{ display: "block", fontSize: 14.5, color: "var(--color-accent-700)" }}>{result.summary}</strong>
            <span className="text-sm muted">Everyone’s notification centre has been updated.</span>
          </span>
          <Link className="btn btn-soft btn-sm" href={result.link}>
            View announcements <ArrowRight size={14} />
          </Link>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setResult(null)}>
            Write another
          </button>
        </div>
      ) : null}

      <form className="card card-pad stack" onSubmit={submit} noValidate>
        <FormError message={serverError} />

        <TextField
          id="announcement-title"
          label="Title"
          value={title}
          onChange={setTitle}
          error={errors.title}
          placeholder="Mid-semester exam timetable released"
          required
          maxLength={140}
          disabled={pending}
        />
        <TextAreaField
          id="announcement-body"
          label="Message"
          value={message}
          onChange={setMessage}
          error={errors.message}
          hint="Plain, factual and short — students see this in their notification centre."
          placeholder="The mid-semester timetable is now live on the Academics page. Check your venue details before each paper."
          rows={5}
          maxLength={2000}
          required
          disabled={pending}
        />

        <label
          className="row"
          htmlFor="announcement-important"
          style={{
            gap: 10,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid var(--color-ink-200)",
            background: important ? "#fffbeb" : "var(--color-ink-100)",
            cursor: "pointer",
          }}
        >
          <input
            id="announcement-important"
            type="checkbox"
            checked={important}
            disabled={pending}
            onChange={(e) => setImportant(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: "var(--color-brand-600)" }}
          />
          <span style={{ flex: 1 }}>
            <strong style={{ display: "block", fontSize: 14 }}>
              <Star size={13} aria-hidden="true" style={{ verticalAlign: -2 }} /> Mark as important
            </strong>
            <span className="text-sm muted">Important announcements ignore the “academic updates” preference.</span>
          </span>
        </label>

        <div className="row" style={{ justifyContent: "flex-end" }}>
          <PendingButton pending={pending} pendingLabel="Publishing…" className="btn btn-primary">
            <Megaphone size={16} /> Publish announcement
          </PendingButton>
        </div>
      </form>
    </section>
  );
}
