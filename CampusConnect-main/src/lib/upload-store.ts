import fs from "node:fs";
import path from "node:path";
import type { Database } from "./types";
import { isStoredFileUrl } from "./library";

/**
 * Server-only helper: after a study file (or folder) is removed, delete the
 * backing upload from data/uploads when no other collection references it.
 * Keeps the upload directory from filling with orphans without ever deleting a
 * file that is still in use elsewhere (posts, materials, syllabus, avatars).
 */

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

export function removeUploadIfUnused(db: Database, url: string): boolean {
  if (!isStoredFileUrl(url)) return false;

  const referenced =
    db.studyFiles.some((f) => f.url === url) ||
    db.materials.some((m) => m.url === url) ||
    db.syllabus.some((s) => (s.files ?? []).some((f) => f.url === url)) ||
    db.posts.some((p) => p.media.some((m) => m.url === url)) ||
    db.users.some((u) => u.avatar === url);

  if (referenced) return false;

  const full = path.join(UPLOAD_DIR, path.basename(url));
  try {
    if (fs.existsSync(full)) {
      fs.unlinkSync(full);
      return true;
    }
  } catch {
    /* best effort — an orphan file is harmless */
  }
  return false;
}
