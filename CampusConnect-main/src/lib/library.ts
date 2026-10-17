import type { StudyFile } from "./types";

/**
 * Shared helpers for the study-material library. Kept out of the route files
 * because Next.js route modules may only export HTTP handlers + config.
 */

/** Only files stored through /api/upload may be attached to a folder. */
const STORED_FILE_URL = /^\/api\/files\/[a-f0-9]{32}\.[a-z0-9]{2,5}$/;

export function isStoredFileUrl(url: string): boolean {
  return STORED_FILE_URL.test(url);
}

/** Leading number of a chapter label, or MAX_SAFE_INTEGER for text labels. */
export function chapterNumber(value: string): number {
  const match = /^\s*(\d+)/.exec(value ?? "");
  return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

/** Chapter order: numeric chapters first (1, 2, 3…), then text labels by name. */
export function byChapterThenUpload(a: StudyFile, b: StudyFile): number {
  const na = chapterNumber(a.chapterNo);
  const nb = chapterNumber(b.chapterNo);
  if (na !== nb) return na - nb;
  const ta = a.chapterName.localeCompare(b.chapterName);
  if (ta !== 0) return ta;
  return a.uploadedAt.localeCompare(b.uploadedAt);
}

/** Newest upload first. */
export function byUploadDesc(a: StudyFile, b: StudyFile): number {
  return b.uploadedAt.localeCompare(a.uploadedAt);
}

/** Semester ordering key: "Semester 3" → 3; non-numeric labels sort last. */
export function semesterNumber(value: string): number {
  const match = /(\d+)/.exec(value ?? "");
  return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

/** Ascending semester order: Semester 1, Semester 2, Semester 3, … */
export function sortSemesters(values: string[]): string[] {
  return values.slice().sort((a, b) => semesterNumber(a) - semesterNumber(b) || a.localeCompare(b));
}

export type LibraryFileSort = "chapter" | "recent";

export function sortStudyFiles(files: StudyFile[], order: LibraryFileSort): StudyFile[] {
  const copy = files.slice();
  copy.sort(order === "recent" ? byUploadDesc : byChapterThenUpload);
  return copy;
}
