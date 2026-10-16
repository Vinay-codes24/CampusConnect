import { NextRequest } from "next/server";
import { handler, json, readBody, ApiError, badRequest } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDB, mutate, now, uid } from "@/lib/db";

/**
 * POST /api/attendance/import
 *
 * Receives attendance data extracted by the CampusConnect bookmarklet
 * (or any compatible JSON source) and saves it as student-imported
 * attendance records.
 *
 * Security:
 *   - Requires a valid CampusConnect session (requireUser).
 *   - studentId is derived from the authenticated user, never the body.
 *   - Never overwrites faculty/admin-managed records.
 *   - Prevents duplicate imports via a client-supplied importKey.
 *   - Validates every field before saving.
 *
 * Expected body:
 *   {
 *     importKey: string,           // dedupe key (e.g. "2025-01-bookmarklet")
 *     subjects: Array<{
 *       subject: string,           // required, 1-200 chars
 *       code?: string,             // optional
 *       conducted: number,         // required, >= 0
 *       attended: number,          // required, >= 0, <= conducted
 *       remarks?: string,          // optional, max 500 chars
 *     }>
 *   }
 */

interface ImportedSubject {
  subject: string;
  code?: string;
  conducted: number;
  attended: number;
  remarks?: string;
}

interface ImportBody {
  importKey?: string;
  subjects?: ImportedSubject[];
}

const MAX_SUBJECTS = 50;
const MAX_REMARKS_LEN = 500;

export const POST = handler(async (req: NextRequest) => {
  const me = await requireUser();
  const body = await readBody<ImportBody>(req);

  // Validate importKey.
  const importKey = typeof body.importKey === "string" ? body.importKey.trim() : "";
  if (!importKey) badRequest("importKey is required.");
  if (importKey.length > 100) badRequest("importKey must be 100 characters or fewer.");

  // Validate subjects array.
  if (!Array.isArray(body.subjects)) badRequest("subjects must be an array.");
  if (body.subjects.length === 0) badRequest("subjects cannot be empty.");
  if (body.subjects.length > MAX_SUBJECTS) badRequest(`Cannot import more than ${MAX_SUBJECTS} subjects at once.`);

  // Validate each subject entry.
  const seen = new Set<string>();
  for (const s of body.subjects) {
    if (!s || typeof s !== "object") badRequest("Each subject must be an object.");
    if (typeof s.subject !== "string" || s.subject.trim().length === 0) {
      badRequest("Each subject needs a non-empty 'subject' field.");
    }
    if (s.subject.length > 200) badRequest("Subject name exceeds 200 characters.");
    if (typeof s.conducted !== "number" || !Number.isFinite(s.conducted) || s.conducted < 0) {
      badRequest(`'conducted' must be a non-negative number for subject "${s.subject}".`);
    }
    if (typeof s.attended !== "number" || !Number.isFinite(s.attended) || s.attended < 0) {
      badRequest(`'attended' must be a non-negative number for subject "${s.subject}".`);
    }
    if (s.attended > s.conducted) {
      badRequest(`'attended' cannot exceed 'conducted' for subject "${s.subject}".`);
    }
    if (s.code != null && typeof s.code !== "string") badRequest("'code' must be a string.");
    if (s.code && s.code.length > 50) badRequest("'code' must be 50 characters or fewer.");
    if (s.remarks != null && typeof s.remarks !== "string") badRequest("'remarks' must be a string.");
    if (s.remarks && s.remarks.length > MAX_REMARKS_LEN) badRequest(`'remarks' exceeds ${MAX_REMARKS_LEN} characters.`);

    // Prevent duplicate subjects within the same import.
    const key = s.subject.trim().toLowerCase();
    if (seen.has(key)) badRequest(`Duplicate subject "${s.subject}" in import.`);
    seen.add(key);
  }

  const db = getDB();

  // Deduplicate: skip if this exact importKey was already used by this user.
  const existingWithKey = db.attendance.find(
    (a) => a.studentId === me.id && (a as AttendanceRecordWithImportKey).importKey === importKey,
  );
  if (existingWithKey) {
    return json({
      skipped: true,
      message: "This attendance data was already imported.",
      count: body.subjects.length,
    });
  }

  // Save records. We mark student-imported records with importKey so we can
  // distinguish them from faculty/admin-managed records and avoid overwrites.
  const ts = now();
  const newRecords = body.subjects.map((s) => ({
    id: uid(),
    studentId: me.id,
    subject: s.subject.trim(),
    code: s.code?.trim() ?? "",
    conducted: s.conducted,
    attended: s.attended,
    minRequired: 75,
    updatedAt: ts,
    importKey,
    importedAt: ts,
    source: "bookmarklet",
  }));

  mutate((db) => {
    db.attendance.push(...newRecords);
  });

  return json({
    saved: true,
    count: newRecords.length,
    importKey,
    updatedAt: ts,
  });
});

/** Extended type for student-imported records (stored alongside AttendanceRecord). */
type AttendanceRecordWithImportKey = {
  studentId: string;
  importKey?: string;
};
