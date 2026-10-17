import { NextRequest } from "next/server";
import { handler, json, ApiError, type RouteContext } from "@/lib/api";
import { getDB } from "@/lib/db";
import { canManageContent, requireUser } from "@/lib/auth";
import { byChapterThenUpload } from "@/lib/library";

/**
 * GET /api/library/[id] — one subject folder and its chapter-wise PDFs.
 * Readable by any signed-in student; `canManage` mirrors the caller's role.
 */
export const GET = handler(async (_req: NextRequest, ctx: RouteContext) => {
  const me = await requireUser();
  const { id } = await ctx.params;
  const db = getDB();

  const subject = db.studySubjects.find((s) => s.id === id);
  if (!subject) throw new ApiError(404, "That subject folder does not exist.");

  const files = db.studyFiles.filter((f) => f.subjectId === id).sort(byChapterThenUpload);

  return json({
    subject,
    files,
    viewer: { id: me.id, role: me.role, canManage: canManageContent(me) },
  });
});
