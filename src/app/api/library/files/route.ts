import { NextRequest } from "next/server";
import { handler, json, readBody, ApiError } from "@/lib/api";
import { mutate, now, uid } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { isStoredFileUrl } from "@/lib/library";
import { removeUploadIfUnused } from "@/lib/upload-store";
import type { StudyFile } from "@/lib/types";
import { int, str } from "@/lib/validation";

/**
 * Add / edit / delete the PDFs inside a study-material folder.
 *
 * Role policy: staff only (faculty or admin). Every file must point at a real
 * /api/files upload, so a fabricated URL can never be stored.
 */

const STAFF = ["faculty", "admin"] as const;

/** POST /api/library/files — attach an uploaded PDF to a folder. */
export const POST = handler(async (req: NextRequest) => {
  const me = await requireRole(...STAFF);
  const body = (await readBody(req)) as Record<string, unknown>;

  const subjectId = str(body.subjectId, { field: "Folder" });
  const chapterNo = str(body.chapterNo, { field: "Chapter number", max: 12 });
  const chapterName = str(body.chapterName, { field: "Chapter name", min: 2, max: 140 });
  const name = str(body.name, { field: "File name", max: 160 });
  const url = str(body.url, { field: "File" });
  const size = int(body.size, { min: 0, max: 200 * 1024 * 1024, fallback: 0 });

  if (!isStoredFileUrl(url)) throw new ApiError(400, "Upload the PDF again — that file reference is not valid.");

  const file: StudyFile = {
    id: uid(),
    subjectId,
    chapterNo,
    chapterName,
    name,
    url,
    size,
    uploadedAt: now(),
    uploadedBy: me.id,
  };

  mutate((db) => {
    const subject = db.studySubjects.find((s) => s.id === subjectId);
    if (!subject) throw new ApiError(404, "That subject folder does not exist.");
    db.studyFiles.push(file);
    subject.updatedAt = now();
  });

  return json({ file }, 201);
});

/** PATCH /api/library/files — edit metadata and/or replace the backing PDF. */
export const PATCH = handler(async (req: NextRequest) => {
  await requireRole(...STAFF);
  const body = (await readBody(req)) as Record<string, unknown>;
  const id = str(body.id, { field: "File" });
  const chapterNo = str(body.chapterNo, { field: "Chapter number", max: 12 });
  const chapterName = str(body.chapterName, { field: "Chapter name", min: 2, max: 140 });
  const name = str(body.name, { field: "File name", max: 160 });

  // Optional: swap in a freshly uploaded PDF (the "replace" action).
  let replacement: { url: string; size: number } | null = null;
  if (body.url !== undefined) {
    const url = str(body.url, { field: "File" });
    if (!isStoredFileUrl(url)) throw new ApiError(400, "Upload the replacement PDF again — that file reference is not valid.");
    const size = int(body.size, { min: 0, max: 200 * 1024 * 1024, fallback: 0 });
    replacement = { url, size };
  }

  const result = mutate((db) => {
    const record = db.studyFiles.find((f) => f.id === id);
    if (!record) throw new ApiError(404, "That file does not exist.");
    const previousUrl = record.url;
    record.chapterNo = chapterNo;
    record.chapterName = chapterName;
    record.name = name;
    if (replacement) {
      record.url = replacement.url;
      record.size = replacement.size;
    }
    const subject = db.studySubjects.find((s) => s.id === record.subjectId);
    if (subject) subject.updatedAt = now();
    return { file: record, previousUrl };
  });

  // Drop the old upload once it is no longer referenced anywhere.
  if (replacement && result.previousUrl !== replacement.url) {
    mutate((db) => removeUploadIfUnused(db, result.previousUrl));
  }

  return json({ file: result.file });
});

/** DELETE /api/library/files — remove a PDF and its backing upload if unused. */
export const DELETE = handler(async (req: NextRequest) => {
  await requireRole(...STAFF);
  const body = (await readBody(req)) as Record<string, unknown>;
  const id = str(body.id, { field: "File" });

  const result = mutate((db) => {
    const index = db.studyFiles.findIndex((f) => f.id === id);
    if (index === -1) throw new ApiError(404, "That file does not exist.");
    const [record] = db.studyFiles.splice(index, 1);
    const subject = db.studySubjects.find((s) => s.id === record.subjectId);
    if (subject) subject.updatedAt = now();
    return { subjectId: record.subjectId, url: record.url };
  });

  // Delete the physical upload only after the record is gone, so the check is accurate.
  const purged = mutate((db) => removeUploadIfUnused(db, result.url));

  return json({ ok: true, purged });
});
