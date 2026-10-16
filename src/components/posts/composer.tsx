"use client";

import { useRef, useState } from "react";
import { Eye, Image as ImageIcon, Link2, Loader2, PenLine, X } from "lucide-react";
import { Modal, Avatar } from "@/components/ui";
import { api, formatBytes } from "@/lib/client";
import { useApp } from "@/components/providers";
import { POST_CATEGORIES, type Media, type PostCategory } from "@/lib/types";
import type { PostView } from "@/lib/serialize";

type Draft = {
  title: string;
  body: string;
  category: PostCategory;
  media: Media[];
};

const EMPTY: Draft = { title: "", body: "", category: "Discussion", media: [] };

const QUICK_TYPES: { category: PostCategory; label: string }[] = [
  { category: "Discussion", label: "Text" },
  { category: "Memes", label: "Meme" },
  { category: "Question", label: "Question" },
  { category: "Announcement", label: "Announcement" },
  { category: "Study Resources", label: "Study tip" },
  { category: "Campus Life", label: "Campus life" },
];

/**
 * Create-post composer: text, image, video, meme, question, announcement or
 * study tip, with a live preview before publishing. When `communityId` is set
 * (the rail on /posts has a community selected) the post is published there.
 */
export function Composer({
  open,
  onClose,
  onCreated,
  communityId,
  communityName,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (post: PostView) => void;
  communityId?: string | null;
  communityName?: string | null;
}) {
  const { user, toast } = useApp();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [preview, setPreview] = useState(false);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function update(patch: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...patch }));
    setError(null);
  }

  async function pickFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const room = 3 - draft.media.length;
    const files = Array.from(list).slice(0, room);
    if (files.length === 0) {
      setError("You can attach up to 3 files per post.");
      return;
    }

    setUploading(true);
    setError(null);
    const uploaded: Media[] = [];
    try {
      for (const file of files) {
        const kind = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : null;
        if (!kind) {
          setError(`“${file.name}” is not an image or video.`);
          continue;
        }
        const form = new FormData();
        form.append("file", file);
        form.append("kind", kind);
        const res = await api<{ url: string; name: string; size: number; kind: string }>("/api/upload", { method: "POST", body: form });
        uploaded.push({ kind: res.kind as Media["kind"], url: res.url, name: res.name, size: res.size });
      }
      if (uploaded.length) update({ media: [...draft.media, ...uploaded] });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function publish() {
    if (!user) {
      toast("Sign in to publish a post.", "error");
      onClose();
      return;
    }
    if (draft.title.trim().length < 3) {
      setError("Please add a title of at least 3 characters.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const { post } = await api<{ post: PostView }>("/api/posts", {
        method: "POST",
        json: {
          title: draft.title,
          body: draft.body,
          category: draft.category,
          media: draft.media,
          communityId: communityId ?? null,
        },
      });
      toast("Your post is live 🎉", "success");
      setDraft(EMPTY);
      setPreview(false);
      onCreated(post);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={preview ? "Preview your post" : "Create a post"}
      labelledBy="composer-title"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button className="btn btn-ghost" onClick={() => setPreview((p) => !p)} disabled={pending || uploading}>
            <Eye size={15} /> {preview ? "Back to edit" : "Preview"}
          </button>
          <button className="btn btn-primary" onClick={publish} disabled={pending || uploading}>
            {pending ? <Loader2 size={15} className="animate-spin" /> : <PenLine size={15} />}
            Publish
          </button>
        </>
      }
    >
      {!user ? (
        <p className="hint">You are browsing as a guest — sign in to publish. Your draft will still be here after you log in.</p>
      ) : null}

      {communityId ? (
        <p className="hint" style={{ marginBottom: 14 }}>
          Posting to <strong>{communityName}</strong> — clear the selection in the Communities panel to
          post to the whole campus feed instead.
        </p>
      ) : null}

      <div className="row" style={{ marginBottom: 14, flexWrap: "wrap" }}>
        <span className="label" style={{ marginRight: 4 }}>
          Post type
        </span>
        {QUICK_TYPES.map((t) => (
          <button
            key={t.category}
            type="button"
            className="chip"
            aria-pressed={draft.category === t.category}
            onClick={() => update({ category: t.category })}
          >
            {t.label}
          </button>
        ))}
      </div>

      {preview ? (
        <Preview draft={draft} user={user} />
      ) : (
        <div className="stack">
          <div className="field">
            <label className="label" htmlFor="post-title">
              Title
            </label>
            <input
              id="post-title"
              className="input"
              aria-invalid={!!error && draft.title.trim().length < 3}
              maxLength={180}
              value={draft.title}
              onChange={(e) => update({ title: e.target.value })}
              placeholder="An interesting title gets more upvotes"
            />
            <span className="hint">{draft.title.length}/180</span>
          </div>

          <div className="field">
            <label className="label" htmlFor="post-body">
              What's on your mind?
            </label>
            <textarea
              id="post-body"
              className="textarea"
              maxLength={8000}
              value={draft.body}
              onChange={(e) => update({ body: e.target.value })}
              placeholder="Share an idea, ask a doubt, drop a meme or announce something for your batch…"
            />
            <span className="hint">{draft.body.length}/8000</span>
          </div>

          <div className="field">
            <span className="label">Image or video (optional)</span>
            <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading || draft.media.length >= 3}>
                {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} />}
                {uploading ? "Uploading…" : "Add media"}
              </button>
              <span className="hint">Images up to 8 MB, videos up to 40 MB · {3 - draft.media.length} slot(s) left</span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              multiple
              hidden
              onChange={(e) => pickFiles(e.target.files)}
            />
            {draft.media.length > 0 ? (
              <ul className="stack" style={{ gap: 8, marginTop: 8, listStyle: "none", padding: 0 }}>
                {draft.media.map((m, i) => (
                  <li key={`${m.url}-${i}`} className="row" style={{ justifyContent: "space-between", border: "1px solid var(--color-ink-200)", borderRadius: 10, padding: "8px 10px" }}>
                    <span className="row" style={{ minWidth: 0 }}>
                      {m.kind === "image" ? <ImageIcon size={15} /> : <Link2 size={15} />}
                      <span className="text-sm" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>
                        {m.name}
                      </span>
                      <span className="text-sm muted">{formatBytes(m.size)}</span>
                    </span>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Remove ${m.name}`}
                      onClick={() => update({ media: draft.media.filter((_, idx) => idx !== i) })}
                    >
                      <X size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {error ? (
            <p role="alert" className="text-sm" style={{ color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 12px" }}>
              {error}
            </p>
          ) : null}
        </div>
      )}
    </Modal>
  );
}

function Preview({ draft, user }: { draft: Draft; user: { name: string; department: string | null; year: string | null } | null }) {
  return (
    <div className="panel card-pad">
      <div className="row" style={{ marginBottom: 12 }}>
        <Avatar name={user?.name ?? "Guest"} size={36} />
        <div>
          <strong style={{ fontSize: 14 }}>{user?.name ?? "Guest"}</strong>
          <div className="text-sm muted">
            {[user?.department, user?.year].filter(Boolean).join(" · ") || "Not set"} · just now
          </div>
        </div>
        <span className="tag" style={{ marginLeft: "auto" }}>
          {draft.category}
        </span>
      </div>

      <h3 style={{ fontSize: 19, marginBottom: 8 }}>{draft.title || "Untitled post"}</h3>
      {draft.body ? (
        <p style={{ whiteSpace: "pre-wrap", fontSize: 14.5, marginBottom: draft.media.length ? 12 : 0 }}>
          {draft.body}
        </p>
      ) : (
        <p className="muted text-sm">No text yet — add some before you publish.</p>
      )}

      {draft.media.map((m, i) => (
        <div key={i} style={{ marginTop: 10 }}>
          {m.kind === "image" ? (
            <img src={m.url} alt={m.name} style={{ width: "100%", borderRadius: 12, border: "1px solid var(--color-ink-200)" }} />
          ) : (
            <video src={m.url} controls style={{ width: "100%", borderRadius: 12, background: "#000" }} />
          )}
        </div>
      ))}

      <div className="row" style={{ marginTop: 14, gap: 8, color: "var(--color-ink-500)", fontSize: 13 }}>
        <span>▲ 1</span>
        <span>▼ 0</span>
        <span>💬 0</span>
        <span>↗ Share</span>
      </div>
    </div>
  );
}
