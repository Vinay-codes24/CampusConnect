"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  Flag,
  Link2,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Share2,
  Trash2,
} from "lucide-react";
import { Avatar } from "@/components/ui";
import { api, formatBytes, timeAgo } from "@/lib/client";
import { useApp } from "@/components/providers";
import type { PostView } from "@/lib/serialize";
import { CommentThread } from "./comment-thread";
import { ReportDialog } from "./report-dialog";
import { shareLink } from "./share";

const CLAMP = 620;

export function PostCard({
  post,
  onChange,
  onRemoved,
  showCommentsByDefault = false,
}: {
  post: PostView;
  onChange?: (next: PostView) => void;
  onRemoved?: (id: string) => void;
  showCommentsByDefault?: boolean;
}) {
  const { user, toast } = useApp();
  const router = useRouter();
  const [showComments, setShowComments] = useState(showCommentsByDefault);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount);

  const longBody = post.body.length > CLAMP;
  const visibleBody = !longBody || expanded ? post.body : `${post.body.slice(0, CLAMP).trimEnd()}…`;

  async function vote(value: 1 | -1) {
    if (!user) {
      toast("Sign in to vote on posts.", "error");
      router.push("/login?next=/posts");
      return;
    }
    if (busy) return;
    const target = post.viewerVote === value ? 0 : value;
    const previous = { upvotes: post.upvotes, downvotes: post.downvotes, viewerVote: post.viewerVote };

    // Optimistic update — reverted if the server rejects it.
    let up = previous.upvotes;
    let down = previous.downvotes;
    if (previous.viewerVote === 1) up -= 1;
    if (previous.viewerVote === -1) down -= 1;
    if (target === 1) up += 1;
    if (target === -1) down += 1;
    onChange?.({ ...post, upvotes: up, downvotes: down, viewerVote: target, score: up - down });

    setBusy(true);
    try {
      const res = await api<{ upvotes: number; downvotes: number; viewerVote: 0 | 1 | -1; score: number }>(
        `/api/posts/${post.id}/vote`,
        { method: "POST", json: { value: target } },
      );
      onChange?.({ ...post, ...res });
    } catch (err) {
      onChange?.({ ...post, ...previous, score: previous.upvotes - previous.downvotes });
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    try {
      await api(`/api/posts/${post.id}`, { method: "DELETE" });
      toast("Post deleted", "success");
      onRemoved?.(post.id);
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  async function share() {
    await shareLink(`/posts/${post.id}`, post.title, toast);
  }

  return (
    <article className="panel card-pad" aria-label={`Post by ${post.author.name}`}>
      {/* header */}
      <div className="row" style={{ gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <Link href={`/profile/${post.author.id}`} className="row" style={{ gap: 10, minWidth: 0 }}>
          <Avatar name={post.author.name} src={post.author.avatar} size={38} />
          <span style={{ minWidth: 0 }}>
            <span className="row" style={{ gap: 5 }}>
              <strong style={{ fontSize: 14 }}>{post.author.name}</strong>
              {post.author.verified ? <BadgeCheck size={15} color="var(--color-accent-600)" aria-label="Verified account" /> : null}
            </span>
            <span className="text-sm muted" style={{ display: "block" }}>
              {[post.author.department, post.author.year].filter(Boolean).join(" · ")} · {timeAgo(post.createdAt)}
            </span>
          </span>
        </Link>

        {post.community ? (
          <Link
            href={`/posts?community=${post.community.id}`}
            className="tag tag-accent"
            style={{ marginLeft: "auto" }}
            title={`View posts in ${post.community.name}`}
          >
            r/{post.community.slug}
          </Link>
        ) : null}

        <span className="tag" style={post.community ? undefined : { marginLeft: "auto" }}>
          {post.category}
        </span>

        <div style={{ position: "relative" }}>
          <button
            className="icon-btn"
            aria-label="Post options"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <MoreHorizontal size={18} />
          </button>
          {menuOpen ? (
            <div className="panel" style={{ position: "absolute", right: 0, top: 42, width: 210, padding: 6, zIndex: 40 }}>
              <button
                className="row"
                style={{ width: "100%", padding: "9px 10px", border: 0, background: "transparent", borderRadius: 8, cursor: "pointer", fontSize: 14, gap: 8 }}
                onClick={() => {
                  setMenuOpen(false);
                  share();
                }}
              >
                <Link2 size={15} /> Copy link
              </button>
              <button
                className="row"
                style={{ width: "100%", padding: "9px 10px", border: 0, background: "transparent", borderRadius: 8, cursor: "pointer", fontSize: 14, gap: 8 }}
                onClick={() => {
                  setMenuOpen(false);
                  setReporting(true);
                }}
              >
                <Flag size={15} /> Report post
              </button>
              {post.canDelete ? (
                <button
                  className="row"
                  style={{ width: "100%", padding: "9px 10px", border: 0, background: "transparent", borderRadius: 8, cursor: "pointer", fontSize: 14, gap: 8, color: "#b91c1c" }}
                  onClick={() => {
                    setMenuOpen(false);
                    remove();
                  }}
                >
                  <Trash2 size={15} /> Delete post
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* body */}
      <Link href={`/posts/${post.id}`} style={{ display: "block" }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>{post.title}</h2>
      </Link>

      {post.body ? (
        <p style={{ whiteSpace: "pre-wrap", fontSize: 14.5, color: "var(--color-ink-700)", marginBottom: 12 }}>{visibleBody}</p>
      ) : null}
      {longBody ? (
        <button className="link" style={{ background: "none", border: 0, padding: 0, marginBottom: 12, cursor: "pointer", fontSize: 13.5 }} onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Show less" : "Read more"}
        </button>
      ) : null}

      {post.media.length > 0 ? (
        <div className="stack" style={{ gap: 10, marginBottom: 12 }}>
          {post.media.map((m, i) =>
            m.kind === "image" ? (
              <img
                key={i}
                src={m.url}
                alt={m.name}
                loading="lazy"
                style={{ width: "100%", maxHeight: 520, objectFit: "cover", borderRadius: 12, border: "1px solid var(--color-ink-200)" }}
              />
            ) : m.kind === "video" ? (
              <video key={i} src={m.url} controls preload="metadata" style={{ width: "100%", borderRadius: 12, background: "#000" }} />
            ) : (
              <a key={i} className="btn btn-ghost btn-sm" href={`${m.url}?download=1`} download>
                {m.name} · {formatBytes(m.size)}
              </a>
            ),
          )}
        </div>
      ) : null}

      {/* actions */}
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <div className="vote">
          <button
            className="vote-btn"
            data-state="up"
            aria-label="Upvote post"
            aria-pressed={post.viewerVote === 1}
            disabled={busy}
            onClick={() => vote(1)}
          >
            <ArrowUp size={17} />
          </button>
          <span className="vote-count" data-dir={post.score > 0 ? "up" : post.score < 0 ? "down" : undefined} aria-live="polite">
            {post.score}
          </span>
          <button
            className="vote-btn"
            data-state="down"
            aria-label="Downvote post"
            aria-pressed={post.viewerVote === -1}
            disabled={busy}
            onClick={() => vote(-1)}
          >
            <ArrowDown size={17} />
          </button>
        </div>

        <button className="btn btn-ghost btn-sm" onClick={() => setShowComments((v) => !v)} aria-expanded={showComments}>
          <MessageSquare size={15} /> {commentCount} {commentCount === 1 ? "comment" : "comments"}
        </button>

        <button className="btn btn-ghost btn-sm" onClick={share}>
          <Share2 size={15} /> Share
        </button>

        <button className="btn btn-ghost btn-sm" onClick={() => setReporting(true)}>
          <Flag size={15} /> Report
        </button>

        {busy ? <Loader2 size={15} className="animate-spin muted" aria-label="Saving vote" /> : null}
      </div>

      {showComments ? (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--color-ink-200)" }}>
          <CommentThread postId={post.id} onCountChange={setCommentCount} />
        </div>
      ) : null}

      <ReportDialog open={reporting} onClose={() => setReporting(false)} target="post" targetId={post.id} targetLabel={`“${post.title}”`} />
    </article>
  );
}
