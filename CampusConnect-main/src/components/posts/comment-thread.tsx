"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, ArrowDown, CornerDownRight, Loader2, MessageSquare, Trash2 } from "lucide-react";
import { Avatar, EmptyState, ErrorState, SkeletonCard } from "@/components/ui";
import { api, timeAgo } from "@/lib/client";
import { useApp } from "@/components/providers";
import type { CommentView } from "@/lib/serialize";
import { ReportDialog } from "./report-dialog";

/**
 * Discussion area for a post: threaded comments (2 levels), new comments and
 * replies, comment upvotes, delete for the author/moderator, and reporting.
 */
export function CommentThread({ postId, onCountChange }: { postId: string; onCountChange?: (count: number) => void }) {
  const { user, toast } = useApp();
  const [comments, setComments] = useState<CommentView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [pending, setPending] = useState(false);
  const [reporting, setReporting] = useState<CommentView | null>(null);
  const loaded = useRef(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api<{ comments: CommentView[] }>(`/api/posts/${postId}`);
      setComments(data.comments);
      onCountChange?.(data.comments.length);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [postId, onCountChange]);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    load();
  }, [load]);

  async function submit(parentId: string | null) {
    const body = parentId ? replyText.trim() : text.trim();
    if (!body) return;
    if (!user) {
      toast("Sign in to join the discussion.", "error");
      return;
    }
    setPending(true);
    try {
      const { comment } = await api<{ comment: CommentView }>("/api/comments", {
        method: "POST",
        json: { postId, body, parentId },
      });
      setComments((prev) => [...(prev ?? []), comment]);
      onCountChange?.((comments?.length ?? 0) + 1);
      if (parentId) {
        setReplyText("");
        setReplyTo(null);
      } else {
        setText("");
      }
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setPending(false);
    }
  }

  async function vote(comment: CommentView, value: 1 | 0 | -1) {
    if (!user) {
      toast("Sign in to vote on comments.", "error");
      return;
    }
    const previous = comments ?? [];
    setComments(
      previous.map((c) => {
        if (c.id !== comment.id) return c;
        let up = c.upvotes;
        let down = c.downvotes;
        if (c.viewerVote === 1) up -= 1;
        if (c.viewerVote === -1) down -= 1;
        if (value === 1) up += 1;
        if (value === -1) down += 1;
        return { ...c, upvotes: up, downvotes: down, viewerVote: value, score: up - down };
      }),
    );
    try {
      const res = await api<{ upvotes: number; downvotes: number; viewerVote: 0 | 1 | -1; score: number }>(
        `/api/comments/${comment.id}/vote`,
        { method: "POST", json: { value } },
      );
      setComments((prev) => (prev ?? []).map((c) => (c.id === comment.id ? { ...c, ...res } : c)));
    } catch (err) {
      setComments(previous);
      toast((err as Error).message, "error");
    }
  }

  async function remove(comment: CommentView) {
    const ok = window.confirm("Delete this comment? This cannot be undone.");
    if (!ok) return;
    try {
      await api(`/api/comments/${comment.id}`, { method: "DELETE" });
      setComments((prev) => (prev ?? []).filter((c) => c.id !== comment.id && c.parentId !== comment.id));
      onCountChange?.(Math.max(0, (comments?.length ?? 1) - 1));
      toast("Comment deleted", "success");
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!comments) {
    return (
      <div className="stack" style={{ gap: 10 }}>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const topLevel = comments.filter((c) => !c.parentId);
  const childrenOf = (id: string) => comments.filter((c) => c.parentId === id);

  return (
    <div className="stack" style={{ gap: 14 }}>
      {/* new comment box */}
      <form
        className="row"
        style={{ alignItems: "flex-start", gap: 10 }}
        onSubmit={(e) => {
          e.preventDefault();
          submit(null);
        }}
      >
        <Avatar name={user?.name ?? "Guest"} src={user?.avatar} size={32} />
        <div style={{ flex: 1 }}>
          <label className="sr-only" htmlFor={`new-comment-${postId}`}>
            Write a comment
          </label>
          <textarea
            id={`new-comment-${postId}`}
            className="textarea"
            style={{ minHeight: 74 }}
            maxLength={2000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={user ? "Add to the discussion…" : "Sign in to join the discussion…"}
          />
          <div className="row" style={{ justifyContent: "flex-end", marginTop: 8 }}>
            <button className="btn btn-primary btn-sm" type="submit" disabled={pending || !text.trim()}>
              {pending ? <Loader2 size={14} className="animate-spin" /> : null}
              Comment
            </button>
          </div>
        </div>
      </form>

      {topLevel.length === 0 ? (
        <EmptyState title="No comments yet" body="Be the first to share what you think." />
      ) : null}

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
        {topLevel.map((c) => (
          <li key={c.id}>
            <CommentRow
              comment={c}
              depth={0}
              childrenOf={childrenOf}
              onVote={vote}
              onDelete={remove}
              onReport={setReporting}
              replyTo={replyTo}
              setReplyTo={setReplyTo}
              replyText={replyText}
              setReplyText={setReplyText}
              onSubmit={submit}
              pending={pending}
              currentUserId={user?.id ?? null}
            />
          </li>
        ))}
      </ul>

      <ReportDialog
        open={!!reporting}
        onClose={() => setReporting(null)}
        target="comment"
        targetId={reporting?.id ?? ""}
        targetLabel={reporting ? `the comment by ${reporting.author.name}` : ""}
      />
    </div>
  );
}

type RowProps = {
  comment: CommentView;
  depth: number;
  childrenOf: (id: string) => CommentView[];
  onVote: (c: CommentView, value: 1 | 0 | -1) => void;
  onDelete: (c: CommentView) => void;
  onReport: (c: CommentView) => void;
  replyTo: string | null;
  setReplyTo: (id: string | null) => void;
  replyText: string;
  setReplyText: (t: string) => void;
  onSubmit: (parentId: string | null) => void;
  pending: boolean;
  currentUserId: string | null;
};

function CommentRow(props: RowProps) {
  const { comment, depth, childrenOf, onVote, onDelete, onReport, replyTo, setReplyTo, replyText, setReplyText, onSubmit, pending, currentUserId } = props;
  const open = replyTo === comment.id;
  const replies = childrenOf(comment.id);

  return (
    <div style={{ marginLeft: depth > 0 ? 26 : 0 }}>
      <div
        style={{
          background: depth > 0 ? "var(--color-ink-100)" : "transparent",
          border: depth > 0 ? "1px solid var(--color-ink-200)" : "0",
          borderRadius: 12,
          padding: depth > 0 ? "10px 12px" : 0,
        }}
      >
        <div className="row" style={{ gap: 8, marginBottom: 4 }}>
          <Avatar name={comment.author.name} src={comment.author.avatar} size={26} />
          <strong style={{ fontSize: 13.5 }}>{comment.author.name}</strong>
          <span className="text-sm muted" style={{ fontSize: 12 }}>
            {comment.author.department ? `${comment.author.department.split(" ")[0]} · ` : ""}
            {timeAgo(comment.createdAt)}
          </span>
        </div>

        <p style={{ fontSize: 14.5, whiteSpace: "pre-wrap", margin: "6px 0 8px" }}>{comment.body}</p>

        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          <div className="vote">
            <button
              className="vote-btn"
              data-state="up"
              aria-label="Upvote comment"
              aria-pressed={comment.viewerVote === 1}
              onClick={() => onVote(comment, comment.viewerVote === 1 ? 0 : 1)}
            >
              <ArrowUp size={15} />
            </button>
            <span className="vote-count" data-dir={comment.score > 0 ? "up" : comment.score < 0 ? "down" : undefined}>
              {comment.score}
            </span>
            <button
              className="vote-btn"
              data-state="down"
              aria-label="Downvote comment"
              aria-pressed={comment.viewerVote === -1}
              onClick={() => onVote(comment, comment.viewerVote === -1 ? 0 : -1)}
            >
              <ArrowDown size={15} />
            </button>
          </div>

          <button className="btn btn-ghost btn-sm" onClick={() => setReplyTo(open ? null : comment.id)}>
            <CornerDownRight size={14} /> Reply
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => onReport(comment)}>
            Report
          </button>
          {comment.canDelete || comment.authorId === currentUserId ? (
            <button className="btn btn-danger btn-sm" onClick={() => onDelete(comment)} aria-label="Delete comment">
              <Trash2 size={14} /> Delete
            </button>
          ) : null}
        </div>

        {open ? (
          <form
            className="row"
            style={{ marginTop: 10, alignItems: "flex-start", gap: 8 }}
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit(comment.id);
            }}
          >
            <label className="sr-only" htmlFor={`reply-${comment.id}`}>
              Write a reply
            </label>
            <textarea
              id={`reply-${comment.id}`}
              className="textarea"
              style={{ minHeight: 62 }}
              maxLength={2000}
              autoFocus
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Reply to ${comment.author.name.split(" ")[0]}…`}
            />
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReplyTo(null)}>
                Cancel
              </button>
              <button className="btn btn-primary btn-sm" type="submit" disabled={pending || !replyText.trim()}>
                {pending ? <Loader2 size={14} className="animate-spin" /> : null}
                Reply
              </button>
            </div>
          </form>
        ) : null}
      </div>

      {replies.length > 0 ? (
        <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0", display: "flex", flexDirection: "column", gap: 10 }}>
          {replies.map((r) => (
            <li key={r.id}>
              <CommentRow {...props} comment={r} depth={depth + 1} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function CommentCountIcon() {
  return <MessageSquare size={16} />;
}
