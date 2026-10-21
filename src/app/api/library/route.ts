import { NextRequest } from "next/server";
import { handler, json } from "@/lib/api";
import { getDB } from "@/lib/db";
import { canManageContent, requireUser } from "@/lib/auth";

/**
 * GET /api/library — the study-material library index.
 *
 * Any signed-in student can read the list; only staff (faculty/admin) receive
 * `canManage: true`, which the UI uses to reveal the management controls.
 * Returns every subject folder with its PDF count and total size.
 */
export const GET = handler(async (_req: NextRequest) => {
  const me = await requireUser();
  const db = getDB();

  const subjects = db.studySubjects
    .map((subject) => {
      const files = db.studyFiles.filter((f) => f.subjectId === subject.id);
      return {
        ...subject,
        fileCount: files.length,
        totalSize: files.reduce((n, f) => n + (f.size || 0), 0),
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.name.localeCompare(b.name));

  return json({
    viewer: {
      id: me.id,
      role: me.role,
      department: me.department ?? null,
      canManage: canManageContent(me),
    },
    subjects,
  });
});
