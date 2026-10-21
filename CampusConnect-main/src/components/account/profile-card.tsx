"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Calendar,
  CalendarDays,
  ChevronRight,
  GraduationCap,
  Mail,
  MessageSquare,
  Plus,
  ThumbsUp,
  X,
} from "lucide-react";
import { useState } from "react";
import { formatDate, timeAgo } from "@/lib/client";
import type { PublicUser, Role } from "@/lib/types";
import type { PostView } from "@/lib/serialize";
import type { EventView } from "@/lib/events";
import { Avatar } from "@/components/ui";

const ROLE_LABEL: Record<Role, string> = {
  student: "Student",
  faculty: "Faculty",
  organizer: "Club organizer",
  admin: "Administrator",
};

export type ProfileStats = {
  posts: number;
  comments: number;
  events: number;
  upvotes?: number;
};

export type InterestEditor = {
  onAdd: (interest: string) => void;
  onRemove: (interest: string) => void;
  pending: boolean;
};

/**
 * Shared profile header: avatar, identity, badges, meta, interests and stats.
 * `headerActions` / `avatarExtra` let the owner plug in edit + sign-out controls
 * while other people's profiles stay read-only.
 */
export function ProfileCard({
  profile,
  stats,
  headerActions,
  avatarExtra,
  interestEditor,
}: {
  profile: PublicUser;
  stats: ProfileStats;
  headerActions?: ReactNode;
  avatarExtra?: ReactNode;
  interestEditor?: InterestEditor;
}) {
  const [draft, setDraft] = useState("");

  const atCap = profile.interests.length >= 8;

  function addInterest() {
    const value = draft.trim();
    if (!value || interestEditor?.pending || atCap) return;
    interestEditor?.onAdd(value);
    setDraft("");
  }

  return (
    <section className="card card-pad stack" aria-label={`${profile.name} profile`}>
      <div className="row" style={{ alignItems: "flex-start", gap: 18, flexWrap: "wrap" }}>
        <div className="stack" style={{ gap: 10, alignItems: "center" }}>
          <Avatar name={profile.name} src={profile.avatar} size={92} />
          {avatarExtra}
        </div>

        <div style={{ flex: 1, minWidth: 240 }}>
          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 23 }}>{profile.name}</h1>
            {profile.verified ? (
              <span className="tag tag-accent">
                <BadgeCheck size={13} /> Verified
              </span>
            ) : null}
            <span className="tag">{ROLE_LABEL[profile.role]}</span>
          </div>
          <p className="text-sm muted" style={{ marginTop: 4 }}>
            @{profile.username}
          </p>

          <div className="stack" style={{ gap: 6, marginTop: 12 }}>
            {profile.department ? (
              <span className="row text-sm muted" style={{ gap: 8 }}>
                <GraduationCap size={15} aria-hidden="true" /> {profile.department}
                {profile.year ? <span className="tag tag-muted">{profile.year}</span> : null}
              </span>
            ) : profile.year ? (
              <span className="row text-sm muted" style={{ gap: 8 }}>
                <GraduationCap size={15} aria-hidden="true" /> {profile.year}
              </span>
            ) : null}
            <span className="row text-sm muted" style={{ gap: 8 }}>
              <Calendar size={15} aria-hidden="true" /> Joined {formatDate(profile.createdAt)}
            </span>
            {profile.email ? (
              <span className="row text-sm muted" style={{ gap: 8 }}>
                <Mail size={15} aria-hidden="true" /> {profile.email}
                <span className="tag tag-muted">only visible to you</span>
              </span>
            ) : null}
          </div>

          {headerActions ? (
            <div className="row" style={{ gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              {headerActions}
            </div>
          ) : null}
        </div>
      </div>

      {profile.bio ? <p className="markdownish" style={{ fontSize: 14.5, color: "var(--color-ink-700)" }}>{profile.bio}</p> : null}

      <div className="stack" style={{ gap: 8 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-ink-500)" }}>
            Interests
          </h2>
          {interestEditor ? (
            <span className="hint" style={atCap ? { color: "#92400e", fontWeight: 600 } : undefined}>
              {interestEditor.pending ? "Saving…" : atCap ? "Maximum 8 interests" : `${profile.interests.length}/8`}
            </span>
          ) : null}
        </div>

        {profile.interests.length > 0 ? (
          <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
            {profile.interests.map((interest) =>
              interestEditor ? (
                <span key={interest} className="tag tag-muted" style={{ paddingRight: 4 }}>
                  {interest}
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Remove interest ${interest}`}
                    disabled={interestEditor.pending}
                    onClick={() => interestEditor.onRemove(interest)}
                    style={{ width: 22, height: 22, color: "inherit" }}
                  >
                    <X size={13} />
                  </button>
                </span>
              ) : (
                <span key={interest} className="tag tag-muted">
                  {interest}
                </span>
              ),
            )}
          </div>
        ) : (
          <p className="text-sm muted">No interests added yet.</p>
        )}

        {interestEditor ? (
          <div className="row" style={{ gap: 8, marginTop: 2 }}>
            <label className="sr-only" htmlFor="interest-input">
              Add an interest
            </label>
            <input
              id="interest-input"
              className="input"
              style={{ maxWidth: 260 }}
              value={draft}
              maxLength={30}
              placeholder="Add an interest…"
              disabled={interestEditor.pending}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addInterest();
                }
              }}
            />
            <button
              type="button"
              className="btn btn-soft btn-sm"
              onClick={addInterest}
              disabled={!draft.trim() || interestEditor.pending || atCap}
              title={atCap ? "You can list up to 8 interests" : undefined}
            >
              <Plus size={15} /> Add
            </button>
          </div>
        ) : null}
      </div>

      <div className="divider" />

      <dl
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 12,
          margin: 0,
        }}
      >
        <Stat label="Posts" value={stats.posts} />
        <Stat label="Comments" value={stats.comments} />
        <Stat label="Events joined" value={stats.events} />
        {stats.upvotes != null ? <Stat label="Upvotes given" value={stats.upvotes} /> : null}
      </dl>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card card-pad" style={{ padding: 12, textAlign: "center", boxShadow: "none", background: "var(--color-ink-100)" }}>
      <dt className="text-sm muted" style={{ fontSize: 12 }}>
        {label}
      </dt>
      <dd style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--color-brand-700)" }}>{value}</dd>
    </div>
  );
}

/** Simple tab strip shared by the two profile views. */
export function TabBar({
  tabs,
  active,
  onChange,
  label,
}: {
  tabs: Array<{ key: string; label: string; count?: number }>;
  active: string;
  onChange: (key: string) => void;
  label: string;
}) {
  return (
    <div className="chip-row" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          className="chip"
          data-active={active === tab.key}
          aria-selected={active === tab.key}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
          {tab.count != null ? <span style={{ opacity: 0.75 }}>({tab.count})</span> : null}
        </button>
      ))}
    </div>
  );
}

/** A single post row on a profile (links to the post detail page). */
export function ProfilePostRow({ post }: { post: PostView }) {
  const excerpt = post.body.length > 170 ? `${post.body.slice(0, 170)}…` : post.body;
  return (
    <Link href={`/posts/${post.id}`} className="panel card-pad card-hover" style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <strong style={{ fontSize: 15 }}>{post.title}</strong>
          <span className="tag tag-muted">{post.category}</span>
        </div>
        {excerpt ? (
          <p className="text-sm muted" style={{ marginTop: 5 }}>
            {excerpt}
          </p>
        ) : null}
        <div className="row text-sm muted" style={{ gap: 14, marginTop: 8, flexWrap: "wrap" }}>
          <span className="row" style={{ gap: 5 }}>
            <ThumbsUp size={13} aria-hidden="true" /> {post.score}
          </span>
          <span className="row" style={{ gap: 5 }}>
            <MessageSquare size={13} aria-hidden="true" /> {post.commentCount} comments
          </span>
          <span>{timeAgo(post.createdAt)}</span>
        </div>
      </div>
      <ChevronRight size={18} aria-hidden="true" style={{ color: "var(--color-ink-400)", flex: "none" }} />
    </Link>
  );
}

/** A single registered-event row on a profile. */
export function ProfileEventRow({ event }: { event: EventView }) {
  return (
    <Link href={`/events/${event.id}`} className="panel card-pad card-hover" style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <strong style={{ fontSize: 15 }}>{event.title}</strong>
          <span className="tag tag-muted">{event.category}</span>
          <StatusTag status={event.status} />
        </div>
        <div className="row text-sm muted" style={{ gap: 14, marginTop: 8, flexWrap: "wrap" }}>
          <span className="row" style={{ gap: 5 }}>
            <CalendarDays size={13} aria-hidden="true" /> {formatDate(event.start)}
          </span>
          <span>{event.venue}</span>
        </div>
      </div>
      <ChevronRight size={18} aria-hidden="true" style={{ color: "var(--color-ink-400)", flex: "none" }} />
    </Link>
  );
}

function StatusTag({ status }: { status: EventView["status"] }) {
  if (status === "registered") return <span className="tag tag-accent">Registered</span>;
  if (status === "full") return <span className="tag tag-warn">Full</span>;
  if (status === "closed") return <span className="tag tag-warn">Closed</span>;
  if (status === "past") return <span className="tag tag-muted">Past</span>;
  return <span className="tag">Open</span>;
}
