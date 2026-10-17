"use client";

import { useRef, useState } from "react";
import { Camera, Check, Upload } from "lucide-react";
import { api, formatBytes } from "@/lib/client";
import { useApp } from "@/components/providers";
import type { ApiUser } from "@/lib/client";

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"];

/**
 * Avatar picker for the owner's profile: choose a file → local preview →
 * POST /api/upload (kind=image) → PATCH /api/auth/me {avatar}.
 */
export function AvatarUpload({ current, onSaved }: { current: string | null; onSaved: (url: string) => void }) {
  const { toast, refreshUser } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function pick(next: File | undefined) {
    if (!next) return;
    if (!ACCEPTED.includes(next.type)) {
      setError("Please choose a PNG, JPEG, GIF, WebP or SVG image.");
      setFile(null);
      setPreview(null);
      return;
    }
    if (next.size > MAX_BYTES) {
      setError(`Images must be ${formatBytes(MAX_BYTES)} or smaller.`);
      setFile(null);
      setPreview(null);
      return;
    }
    setError("");
    setFile(next);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(next);
    });
  }

  function cancel() {
    setFile(null);
    setError("");
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
  }

  async function save() {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", "image");
      const uploaded = await api<{ url: string }>("/api/upload", { method: "POST", body: form });
      await api<{ user: ApiUser }>("/api/auth/me", { method: "PATCH", json: { avatar: uploaded.url } });
      onSaved(uploaded.url);
      await refreshUser();
      toast("Profile photo updated", "success");
      cancel();
    } catch (e) {
      const message = (e as Error).message;
      setError(message);
      toast(message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ gap: 8, alignItems: "center", width: 92 }}>
      <input
        ref={inputRef}
        id="avatar-file"
        type="file"
        accept={ACCEPTED.join(",")}
        className="sr-only"
        onChange={(e) => pick(e.target.files?.[0])}
        aria-label="Choose a new profile photo"
      />

      {preview ? (
        <span className="avatar" style={{ width: 92, height: 92, fontSize: 34 }} aria-hidden="true">
          <img src={preview} alt="" />
        </span>
      ) : null}

      {preview ? (
        <div className="stack" style={{ gap: 6, width: "100%" }}>
          <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={busy} aria-busy={busy} style={{ width: "100%" }}>
            {busy ? (
              <>
                <span className="spinner" aria-hidden="true" /> Uploading
              </>
            ) : (
              <>
                <Check size={14} /> Save photo
              </>
            )}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={cancel} disabled={busy} style={{ width: "100%" }}>
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          title={current ? "Replace your profile photo" : "Upload a profile photo"}
          style={{ width: "100%", paddingInline: 8 }}
        >
          <Camera size={14} /> Photo
        </button>
      )}

      {error ? (
        <span className="hint" role="alert" style={{ color: "#b91c1c", textAlign: "center" }}>
          {error}
        </span>
      ) : null}

      {!preview && !error ? (
        <span className="hint" style={{ textAlign: "center", display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
          <Upload size={11} aria-hidden="true" /> PNG/JPEG ≤ 8 MB
        </span>
      ) : null}
    </div>
  );
}
