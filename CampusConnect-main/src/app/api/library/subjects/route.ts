import { NextRequest } from "next/server";
import { handler, json, readBody, ApiError } from "@/lib/api";
import { mutate, now, uid } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { DEPARTMENTS, SEMESTERS, type StudySubject } from "@/lib/types";
import { optional, str } from "@/lib/validation";
import { removeUploadIfUnused } from "@/lib/upload-store";

/**
 * Create / edit / delete study-material folders.
 *
 * Role policy: staff only (faculty or admin). Students are rejected here with a
 * 403 even if they craft the request by hand — the UI never decides permissions.
 */

const STAFF = ["faculty", "admin"] as const;

function cleanDepartment(value: unknown): string {
  const raw = optional(value, 80);
  return raw && (DEPARTMENTS as string[]).includes(raw) ? raw : "";
}

function cleanSemester(value: unknown): string {
  const raw = optional(value, 40);
  return raw && (SEMESTERS as string[]).includes(raw) ? raw : "";
}

function readFields(input: Record<string, unknown>) {
  return {
    name: str(input.name, { field: "Subject name", min: 2, max: 90 }),
    code: optional(input.code, 24),
    department: cleanDepartment(input.department),
    semester: cleanSemester(input.semester),
    description: optional(input.description, 400),
  };
}

/** POST /api/library/subjects — create one folder, or many via `{ items: [...] }`. */
export const POST = handler(async (req: NextRequest) => {
  const me = await requireRole(...STAFF);
  const body = (await readBody(req)) as Record<string, unknown>;

  if (Array.isArray(body.items)) {
    if (body.items.length === 0) throw new ApiError(400, "No subjects were provided to import.");
    if (body.items.length > 300) throw new ApiError(400, "Import at most 300 subjects at a time.");

    const created: StudySubject[] = [];
    mutate((db) => {
      for (const raw of body.items as unknown[]) {
        if (!raw || typeof raw !== "object") continue;
        const fields = readFields(raw as Record<string, unknown>);
        const duplicate = db.studySubjects.some(
          (s) =>
            s.name.toLowerCase() === fields.name.toLowerCase() &&
            s.department === fields.department &&
            s.semester === fields.semester,
        );
        if (duplicate) continue;
        const subject: StudySubject = {
          id: uid(),
          ...fields,
          createdAt: now(),
          updatedAt: now(),
          createdBy: me.id,
        };
        db.studySubjects.push(subject);
        created.push(subject);
      }
    });
    return json({ subjects: created, count: created.length }, 201);
  }

  const fields = readFields(body);
  const subject: StudySubject = { id: uid(), ...fields, createdAt: now(), updatedAt: now(), createdBy: me.id };
  mutate((db) => {
    db.studySubjects.push(subject);
  });
  return json({ subject }, 201);
});

/** PATCH /api/library/subjects — rename / re-branch an existing folder. */
export const PATCH = handler(async (req: NextRequest) => {
  await requireRole(...STAFF);
  const body = (await readBody(req)) as Record<string, unknown>;
  const id = str(body.id, { field: "Folder" });
  const fields = readFields(body);

  const subject = mutate((db) => {
    const record = db.studySubjects.find((s) => s.id === id);
    if (!record) throw new ApiError(404, "That subject folder does not exist.");
    record.name = fields.name;
    record.code = fields.code;
    record.department = fields.department;
    record.semester = fields.semester;
    record.description = fields.description;
    record.updatedAt = now();
    return record;
  });

  return json({ subject });
});

/** DELETE /api/library/subjects — remove a folder and every PDF inside it. */
export const DELETE = handler(async (req: NextRequest) => {
  await requireRole(...STAFF);
  const body = (await readBody(req)) as Record<string, unknown>;
  const id = str(body.id, { field: "Folder" });

  const removed = mutate((db) => {
    const index = db.studySubjects.findIndex((s) => s.id === id);
    if (index === -1) throw new ApiError(404, "That subject folder does not exist.");
    db.studySubjects.splice(index, 1);
    const doomed = db.studyFiles.filter((f) => f.subjectId === id);
    db.studyFiles = db.studyFiles.filter((f) => f.subjectId !== id);
    return doomed.map((f) => f.url);
  });

  // Purge the backing uploads that are now unreferenced.
  mutate((db) => {
    for (const url of removed) removeUploadIfUnused(db, url);
  });

  return json({ ok: true, removedFiles: removed.length });
});
